/* eslint-disable @typescript-eslint/naming-convention */
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";
import { utils } from "ethers";

import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

interface IPRICE {
  price: number;
  timestamp: number;
}

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, storage, secrets, multiChainProvider } = context;

  // User Storage
  const lastPrice = JSON.parse(
    (await storage.get("lastPrice")) ?? "{}"
  ) as IPRICE;

  const smartOracle = (userArgs.SmartOracle as string) ?? "";
  const priceIds = (userArgs.priceIds ?? "") as string[];
  // Get Pyth price data
  const connection = new EvmPriceServiceConnection(
    "https://hermes.pyth.network",
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
    const iface = new utils.Interface([
      "function updatePrice(bytes[] memory updatePriceData) external",
    ]);

    const updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);

    console.log("Web3 Function price initialization");

    const callData = iface.encodeFunctionData("updatePrice", [updatePriceData]);
    return {
      canExec: true,
      callData: [
        {
          to: smartOracle,
          data: callData,
        },
      ],
    };
  }

  const dayInSec = 24 * 60 * 60;
  const diff = Math.abs(lastPrice.price - currentPrice.price) / lastPrice.price;

  // Price Update if 24h are elapsed or price diff >2%
  if (diff >= 0.02 || currentPrice.timestamp - lastPrice.timestamp > dayInSec) {
    const iface = new utils.Interface([
      "function updatePrice(bytes[] memory updatePriceData) external",
    ]);

    const updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);

    const callData = iface.encodeFunctionData("updatePrice", [updatePriceData]);
    console.log(
      `Updating Price:${currentPrice.price}, timestamp: ${currentPrice.timestamp} `
    );

    await storage.set("lastPrice", JSON.stringify(currentPrice));
    return {
      canExec: true,
      callData: [
        {
          to: smartOracle,
          data: callData,
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
