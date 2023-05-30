// pyth-price-change/index.ts
import {
  Web3Function
} from "@gelatonetwork/web3-functions-sdk";
import { utils } from "ethers";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";
Web3Function.onRun(async (context) => {
  const { userArgs, multiChainProvider, secrets, storage } = context;
  const lastPrice = JSON.parse(
    await storage.get("lastPrice") ?? "{}"
  );
  const connection = new EvmPriceServiceConnection(
    "https://xc-testnet.pyth.network"
  );
  const priceIds = userArgs.priceIds ?? "";
  const check = await connection.getLatestPriceFeeds(priceIds);
  if (check.length == 0 || check[0].price == void 0 || check[0].price.price == void 0) {
    return { canExec: false, message: "No price available" };
  }
  const currentPrice = {
    price: +check[0].price.price,
    timestamp: +check[0].price.publishTime
  };
  if (lastPrice.price == void 0) {
    await storage.set("lastPrice", JSON.stringify(currentPrice));
    const iface = new utils.Interface([
      "function updatePrice(bytes[] memory updatePriceData) external"
    ]);
    let updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);
    console.log("Web3 Function price initialization");
    let callData = iface.encodeFunctionData("updatePrice", [updatePriceData]);
    return { canExec: true, callData };
  }
  const dayInSec = 24 * 60 * 60;
  const diff = Math.abs(lastPrice.price - currentPrice.price) / lastPrice.price;
  if (diff >= 0.02 || currentPrice.timestamp - lastPrice.timestamp > dayInSec) {
    const iface = new utils.Interface([
      "function updatePrice(bytes[] memory updatePriceData) external"
    ]);
    let updatePriceData = await connection.getPriceFeedsUpdateData(priceIds);
    let callData = iface.encodeFunctionData("updatePrice", [updatePriceData]);
    console.log(
      `Updating Price:${currentPrice.price}, timestamp: ${currentPrice.timestamp} `
    );
    await storage.set("lastPrice", JSON.stringify(currentPrice));
    return { canExec: true, callData };
  } else {
    return {
      canExec: false,
      message: `No conditions met for price Update, price diff = ${(100 * diff).toFixed(2)}%`
    };
  }
});
