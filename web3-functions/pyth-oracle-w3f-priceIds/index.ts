/* eslint-disable @typescript-eslint/naming-convention */
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract, utils, BigNumber } from "ethers";

import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { IPyth } from "../../typechain";
import { pythAbi } from "./pythAbi";
import { Octokit } from "octokit";
import YAML from "yaml";

interface IPRICE {
  price: number;
  timestamp: number;
}

interface PythConfigStorage {
  timestamp: number;
  pythConfig: PythConfig;
}
interface PythConfig {
  pythNetworkAddress: string;
  priceServiceEndpoint: string;
  configRefreshRateInSeconds: number;
  validTimePeriodSeconds: number;
  deviationThreshold: number;
  priceIds: string[];
}

const shouldFetchPythConfig = (
  pythConfigStorage: PythConfigStorage
): boolean => {
  const notFoundInStorage = pythConfigStorage.pythConfig === undefined;
  return (
    notFoundInStorage ||
    Date.now() / 1000 - pythConfigStorage.timestamp >
      pythConfigStorage.pythConfig.configRefreshRateInSeconds
  );
};

const addLeading0x = (id: string): string => {
  if (id.startsWith("0x")) {
    return id;
  }
  return "0x" + id;
};

Web3Function.onRun(async (context: Web3FunctionContext) => {
  console.log("starting web3 function");
  const { storage, secrets, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  // Refresh/retrieve config from storage

  const gistId = (await secrets.get("GIST_ID")) as string;
  console.log(`fetching gistId: ${gistId}`);

  const octokit = new Octokit();
  let pythConfig: PythConfig | undefined;

  let pythConfigStorage = JSON.parse(
    (await storage.get("pythConfig")) ?? "{}"
  ) as PythConfigStorage;

  if (shouldFetchPythConfig(pythConfigStorage)) {
    console.log("fetching pythConfig from gist");
    try {
      const gistDetails = await octokit.rest.gists.get({ gist_id: gistId });
      const files = gistDetails.data.files;
      if (!files) throw new Error(`No files in gist`);
      for (const file of Object.values(files)) {
        if (file?.filename === "config.yaml" && file.content) {
          pythConfig = YAML.parse(file.content);
          break;
        }
      }

      if (!pythConfig) throw new Error(`No config.yaml loaded for PythConfig`);
      pythConfigStorage = {
        timestamp: Date.now() / 1000,
        pythConfig: pythConfig,
      };
      const pythConfigStorageValue = JSON.stringify(pythConfigStorage);
      console.log(`storing pythConfigStorageValue: ${pythConfigStorageValue}`);
      await storage.set("pythConfig", pythConfigStorageValue);
    } catch (err) {
      const error = err as Error;
      return {
        canExec: false,
        message: `Error fetching gist: ${error.message}`,
      };
    }
  } else {
    console.log("using pythConfig from storage");
    pythConfig = pythConfigStorage.pythConfig;
  }

  console.log(`pythConfig: ${JSON.stringify(pythConfig, null, 2)}`);

  const {
    pythNetworkAddress,
    priceServiceEndpoint,
    validTimePeriodSeconds,
    deviationThreshold,
    priceIds,
  } = pythConfig;

  const pythnetwork = new Contract(
    pythNetworkAddress,
    pythAbi,
    provider
  ) as IPyth;

  // Get Pyth price data
  const connection = new EvmPriceServiceConnection(priceServiceEndpoint); // See Price Service endpoints section below for other endpoints

  console.log(`checking priceIds: ${priceIds}`);
  const check = (await connection.getLatestPriceFeeds(priceIds)) as any[];
  console.log(`check: ${JSON.stringify(check, null, 2)}`);

  const currentPrices: Map<string, IPRICE> = new Map();
  check
    .filter((c) => {
      return c.price && c.price.price;
    })
    .forEach((c) => {
      console.log(`c: ${JSON.stringify(c, null, 2)}`);
      const price = {
        price: +c.price.price,
        timestamp: +c.price.publishTime,
      };
      currentPrices.set(addLeading0x(c.id), price);
    });

  console.log(
    `currentPrices: ${JSON.stringify([...currentPrices.entries()], null, 2)}`
  );

  if (currentPrices.size != priceIds.length) {
    console.log(
      `currentPrices.priceIds: ${JSON.stringify(currentPrices.keys())}`
    );
    return { canExec: false, message: "Not all prices available" };
  }

  const lastPrices = (
    await Promise.all(
      [...currentPrices.keys()].map(async (priceId) => {
        const price = JSON.parse(
          (await storage.get(priceId)) ?? "{}"
        ) as IPRICE;
        return { priceId, price };
      })
    )
  )
    .filter((p) => p.price.price != undefined)
    .reduce((acc, priceInfo) => {
      acc.set(priceInfo.priceId, priceInfo.price);
      return acc;
    }, new Map<string, IPRICE>());

  console.log(
    `lastPrices: ${JSON.stringify([...lastPrices.entries()], null, 2)}`
  );

  const priceIdsToInitialize = [...currentPrices.keys()].filter((priceId) => {
    return lastPrices.get(priceId) == undefined;
  });

  const priceIdsToUpdate = [...currentPrices.keys()]
    .filter((priceId) => lastPrices.get(priceId) != undefined)
    .filter((priceId) => {
      const lastPrice = lastPrices.get(priceId)!;
      const currentPrice = currentPrices.get(priceId)!;
      const priceDiff =
        Math.abs(lastPrice.price - currentPrice.price) / lastPrice.price;
      const priceExceedsDiff = priceDiff >= deviationThreshold;
      const priceIsStale =
        currentPrice.timestamp - lastPrice.timestamp > validTimePeriodSeconds;
      return priceExceedsDiff || priceIsStale;
    });

  if (priceIdsToUpdate.length + priceIdsToInitialize.length > 0) {
    if (priceIdsToInitialize.length > 0) {
      console.log(`priceIdsToInitialize: ${priceIdsToInitialize}`);
      await Promise.all(
        priceIdsToInitialize.map(async (priceId) => {
          const storageValue = JSON.stringify(currentPrices.get(priceId));
          console.log(`initializing ${priceId} storageValue: ${storageValue}`);
          await storage.set(priceId, storageValue);
        })
      );
    }

    if (priceIdsToUpdate.length > 0) {
      await Promise.all(
        priceIdsToUpdate.map(async (priceId) => {
          const storageValue = JSON.stringify(currentPrices.get(priceId));
          await storage.set(priceId, storageValue);
        })
      );
    }

    const allPriceIds = priceIdsToInitialize.concat(priceIdsToUpdate);
    const publishTimes = allPriceIds.map(
      (priceId) => currentPrices.get(priceId)!.timestamp
    );
    const updatePriceData = await connection.getPriceFeedsUpdateData(
      allPriceIds
    );
    const fee = (await pythnetwork.getUpdateFee(updatePriceData)).toString();
    const callData = await pythnetwork.interface.encodeFunctionData(
      "updatePriceFeedsIfNecessary",
      [updatePriceData, allPriceIds, publishTimes]
    );
    return {
      canExec: true,
      callData: [
        {
          to: pythNetworkAddress,
          data: callData,
          value: fee,
        },
      ],
    };
  } else {
    return {
      canExec: false,
      message: `No conditions met for price initialization or update for priceIds: ${priceIds}`,
    };
  }
});
