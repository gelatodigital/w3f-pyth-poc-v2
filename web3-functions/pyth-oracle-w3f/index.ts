/* eslint-disable @typescript-eslint/naming-convention */
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { Contract, utils } from "ethers";

import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
import { IPyth } from "../../typechain";
import { pythAbi } from "./pythAbi";

interface IPRICE {
  price: number;
  timestamp: number;
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, secrets, multiChainProvider } = context;

  const provider = multiChainProvider.default();

  // User Storage
  const lastPrice = JSON.parse(
    (await storage.get("lastPrice")) ?? "{}"
  ) as IPRICE;

  const pythNetworkAddress = (userArgs.pythNetworkAddress as string) ?? "";

  const pythnetwork = new Contract(
    pythNetworkAddress,
    pythAbi,
    provider
  ) as IPyth;

  const priceIds = (userArgs.priceIds ?? "") as string[];
  // Get Pyth price data
  const connection = new EvmPriceServiceConnection(
    "https://hermes-beta.pyth.network"
  ); // See Price Service endpoints section below for other endpoints

  const check = (await connection.getLatestPriceFeeds(priceIds)) as any[];
  if (
    check.length == 0 ||
    check[0].price == undefined ||
    check[0].price.price == undefined
  ) {
    return { canExec: false, message: "No price available" };
  }

  const currentPrice: IPRICE = {
    price: +check[0].price.price,
    timestamp: +check[0].price.publishTime,
  };

  // web3 funciton storage initialization
  if (lastPrice.price == undefined) {
    await storage.set("lastPrice", JSON.stringify(currentPrice));

    const updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);

   
    console.log("Web3 Function price initialization");
    
    const fee = (await pythnetwork.getUpdateFee(updatePriceData)).toString();
    const callData = await pythnetwork.interface.encodeFunctionData("updatePriceFeeds" ,[updatePriceData])
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
  }

  const dayInSec = 24 * 60 * 60;
  const diff = Math.abs(lastPrice.price - currentPrice.price) / lastPrice.price;

  // Price Update if 24h are elapsed or price diff >2%
  if (diff >= 0.02 || currentPrice.timestamp - lastPrice.timestamp > dayInSec) {

    const updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);
    const callData = await pythnetwork.interface.encodeFunctionData("updatePriceFeeds" ,[updatePriceData])
    const fee = (await pythnetwork.getUpdateFee(updatePriceData)).toString();
    console.log(
      `Updating Price:${currentPrice.price} `
    );

    await storage.set("lastPrice", JSON.stringify(currentPrice));
    return {
      canExec: true,
      callData: [
        {
          to: pythNetworkAddress,
          data: callData,
          value: fee
        },
      ],
    };
  } else {
    return {
      canExec: false,
      message: `No conditions met for price Update, price diff = ${(
        100 * diff
      ).toFixed(2)}%`,
    };
  }
});
