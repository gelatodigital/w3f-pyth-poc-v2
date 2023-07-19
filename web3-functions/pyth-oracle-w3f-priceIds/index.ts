/* eslint-disable @typescript-eslint/naming-convention */
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract } from "ethers";

import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { IPyth } from "../../typechain";
import PythAbi from "@pythnetwork/pyth-sdk-solidity/abis/IPyth.json";
import {
  PythConfig,
  fetchPythConfigIfNecessary,
  getCurrentPrices,
  getLastPrices,
} from "./pythUtils";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  console.log("starting web3 function");
  const { storage, secrets, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  // Refresh/retrieve config from storage

  const gistId = (await secrets.get("GIST_ID")) as string;
  console.log(`fetching gistId: ${gistId}`);

  let pythConfig: PythConfig | undefined;

  try {
    pythConfig = await fetchPythConfigIfNecessary(storage, gistId);
    console.log(`pythConfig: ${JSON.stringify(pythConfig)}`);
  } catch (err) {
    const error = err as Error;
    return {
      canExec: false,
      message: `Error fetching gist: ${error.message}`,
    };
  }

  const {
    pythNetworkAddress,
    priceServiceEndpoint,
    validTimePeriodSeconds,
    deviationThresholdBps,
    priceIds,
  } = pythConfig;

  const pythContract = new Contract(
    pythNetworkAddress,
    PythAbi,
    provider
  ) as IPyth;

  // Get Pyth price data
  const connection = new EvmPriceServiceConnection(priceServiceEndpoint);

  console.log(`fetching current prices for priceIds: ${priceIds}`);
  const currentPrices = await getCurrentPrices(priceIds, connection);
  if (currentPrices === undefined) {
    return {
      canExec: false,
      message: `Error fetching latest priceFeeds for priceIds: ${priceIds}`,
    };
  }

  if (currentPrices.size != priceIds.length) {
    console.log(
      `currentPrices.priceIds: ${JSON.stringify(currentPrices.keys())}`
    );
    return { canExec: false, message: "Not all prices available" };
  }

  console.log(
    `currentPrices: ${JSON.stringify([...currentPrices.entries()], null, 2)}`
  );

  const lastPrices = await getLastPrices(priceIds, storage);

  console.log(
    `lastPrices: ${JSON.stringify([...lastPrices.entries()], null, 2)}`
  );

  const priceFeedNeedsUpdate = (priceId: string): boolean => {
    const lastPrice = lastPrices.get(priceId)!;
    const currentPrice = currentPrices.get(priceId)!;
    let priceDiff = BigInt(lastPrice.price) - BigInt(currentPrice.price);
    priceDiff = priceDiff < 0 ? -priceDiff : priceDiff;
    priceDiff *= BigInt(10000); // bps
    priceDiff /= BigInt(lastPrice.price);
    const priceExceedsDiff = priceDiff >= deviationThresholdBps;
    const priceIsStale =
      currentPrice.publishTime - lastPrice.publishTime > validTimePeriodSeconds;
    return priceExceedsDiff || priceIsStale;
  };

  const priceIdsToUpdate = [...currentPrices.keys()].filter((priceId) => {
    return (
      lastPrices.get(priceId) === undefined || priceFeedNeedsUpdate(priceId)
    );
  });

  if (priceIdsToUpdate.length > 0) {
    await Promise.all(
      priceIdsToUpdate.map(async (priceId) => {
        const storageValue = JSON.stringify(
          currentPrices.get(priceId)?.toJson()
        );
        await storage.set(priceId, storageValue);
      })
    );

    const publishTimes = priceIdsToUpdate.map(
      (priceId) => currentPrices.get(priceId)!.publishTime
    );
    const updatePriceData = await connection.getPriceFeedsUpdateData(
      priceIdsToUpdate
    );
    const fee = (await pythContract.getUpdateFee(updatePriceData)).toString();
    const callData = await pythContract.interface.encodeFunctionData(
      "updatePriceFeedsIfNecessary",
      [updatePriceData, priceIdsToUpdate, publishTimes]
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
