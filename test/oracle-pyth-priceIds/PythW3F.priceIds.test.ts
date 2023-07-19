import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { IPyth } from "../../typechain";
import { Contract, utils } from "ethers";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
} from "@gelatonetwork/web3-functions-sdk";
import { pythAbi } from "../../web3-functions/pyth-oracle-w3f/pythAbi";
import { PythConfig } from "../../web3-functions/pyth-oracle-w3f-priceIds/pythUtils";
import { Price } from "@pythnetwork/pyth-evm-js";
const { ethers, deployments, w3f } = hre;

describe.only("W3F-Pyth-PriceIds tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let pythContract: IPyth;
  let oracleW3fPriceIds: Web3FunctionHardhat;
  let gelatoMsgSenderSigner: Signer;

  beforeEach(async function () {
    if (hre.network.name !== "hardhat") {
      console.error("Test Suite is meant to be run on hardhat only");
      process.exit(1);
    }

    await deployments.fixture();

    [admin] = await ethers.getSigners();

    adminAddress = await admin.getAddress();
    await setBalance(adminAddress, ethers.utils.parseEther("1000"));
    const { gelatoMsgSender: gelatoMsgSender, pyth: pythNetworkAddress } =
      await hre.getNamedAccounts();

    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSender);
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));

    pythContract = new Contract(pythNetworkAddress, pythAbi, admin) as IPyth;

    oracleW3fPriceIds = w3f.get("pyth-oracle-w3f-priceIds");
  });

  it("W3F returns canExec:true in first Execution", async () => {
    const storage = {};

    const w3fResultCall1 = await oracleW3fPriceIds.run({ storage });
    const result = w3fResultCall1.result as Web3FunctionResultV2;

    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);
    }
  });

  it("W3F executes successfully on Pyth contract", async () => {
    const storage = {};
    const w3fResultCall1 = await oracleW3fPriceIds.run({ storage });

    const result1 = w3fResultCall1.result as Web3FunctionResultV2;

    expect(result1.canExec).to.be.eq(true);

    if (result1.canExec == true) {
      expect(result1.callData.length).to.be.eq(1);

      await expect(
        gelatoMsgSenderSigner.sendTransaction({
          to: result1.callData[0].to,
          data: result1.callData[0].data,
          value: result1.callData[0].value,
        })
      ).to.be.not.reverted;
    }
  });

  it("W3F returns canExec: false if time threshold or deviation is not reached", async () => {
    const storage = {};
    const w3fResultCall1 = await oracleW3fPriceIds.run({ storage });
    const result1 = w3fResultCall1.result as Web3FunctionResultV2;
    const storage1 = w3fResultCall1.storage.storage;

    expect(result1.canExec).to.be.eq(true);

    if (result1.canExec == true) {
      expect(result1.callData.length).to.be.eq(1);

      await expect(
        gelatoMsgSenderSigner.sendTransaction({
          to: result1.callData[0].to,
          data: result1.callData[0].data,
          value: result1.callData[0].value,
        })
      ).to.be.not.reverted;
    }

    const w3fResultCall2 = await oracleW3fPriceIds.run({
      storage: storage1,
    });

    const result2 = w3fResultCall2.result as Web3FunctionResultV2;
    expect(result2.canExec).to.be.eq(false);
  });

  it("W3F W3F returns canExec: true if deviation threshold is reached", async () => {
    const storage = {};
    const w3fResultCall1 = await oracleW3fPriceIds.run({ storage });
    const result1 = w3fResultCall1.result as Web3FunctionResultV2;
    const storage1 = w3fResultCall1.storage.storage;

    expect(result1.canExec).to.be.eq(true);

    if (result1.canExec == true) {
      expect(result1.callData.length).to.be.eq(1);

      await expect(
        gelatoMsgSenderSigner.sendTransaction({
          to: result1.callData[0].to,
          data: result1.callData[0].data,
          value: result1.callData[0].value,
        })
      ).to.be.not.reverted;
    }
    const pythConfig: PythConfig = JSON.parse(storage1.pythConfig!).pythConfig;

    // manually set prices to 1 and set as storage to trigger price deviation threshold
    const fakeStorage: { [key: string]: string } = {};
    fakeStorage.pythConfig = storage1.pythConfig!;
    pythConfig.priceIds.forEach((priceId) => {
      const storedPrice = Price.fromJson(JSON.parse(storage1[priceId]!));
      storedPrice.price = "1";
      fakeStorage[priceId] = JSON.stringify(storedPrice.toJson());
    });

    const w3fResultCall2 = await oracleW3fPriceIds.run({
      storage: fakeStorage,
    });
    const storage2 = w3fResultCall2.storage.storage;
    const result2 = w3fResultCall2.result as Web3FunctionResultV2;
    expect(result2.canExec).to.be.eq(true);
    pythConfig.priceIds.forEach((priceId) => {
      const storedPrice = Price.fromJson(JSON.parse(storage2[priceId]!));
      expect(storedPrice.price).to.be.not.eq("1");
    });
    // not checking result for sendTransaction since updatePriceFeedsIfNecessary
    // will revert if no priceFeeds need to be updated based on on-chain data.
  });

  it("W3F returns canExec: true if time deviation threshold is reached", async () => {
    const storage = {};
    const w3fResultCall1 = await oracleW3fPriceIds.run({ storage });
    const result1 = w3fResultCall1.result as Web3FunctionResultV2;
    const storage1 = w3fResultCall1.storage.storage;

    expect(result1.canExec).to.be.eq(true);

    if (result1.canExec == true) {
      expect(result1.callData.length).to.be.eq(1);

      await expect(
        gelatoMsgSenderSigner.sendTransaction({
          to: result1.callData[0].to,
          data: result1.callData[0].data,
          value: result1.callData[0].value,
        })
      ).to.be.not.reverted;
    }
    const pythConfig: PythConfig = JSON.parse(storage1.pythConfig!).pythConfig;

    // manually set timestamps to 0 to trigger staleness threshold
    const fakeStorage: { [key: string]: string } = {};
    fakeStorage.pythConfig = storage1.pythConfig!;
    pythConfig.priceIds.forEach((priceId) => {
      const storedPrice = Price.fromJson(JSON.parse(storage1[priceId]!));
      storedPrice.publishTime = 0;
      fakeStorage[priceId] = JSON.stringify(storedPrice.toJson());
    });

    const w3fResultCall2 = await oracleW3fPriceIds.run({
      storage: fakeStorage,
    });
    const storage2 = w3fResultCall2.storage.storage;
    const result2 = w3fResultCall2.result as Web3FunctionResultV2;
    expect(result2.canExec).to.be.eq(true);
    pythConfig.priceIds.forEach((priceId) => {
      const storedPrice = Price.fromJson(JSON.parse(storage2[priceId]!));
      expect(storedPrice.publishTime).to.be.not.eq(0);
    });
    // not checking result for sendTransaction since updatePriceFeedsIfNecessary
    // will revert if no priceFeeds need to be updated based on on-chain data.
  });
});
