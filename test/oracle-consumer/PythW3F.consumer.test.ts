import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { SmartOracle } from "../../typechain";
import { utils } from "ethers";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
} from "@gelatonetwork/web3-functions-sdk";
const { ethers, deployments, w3f } = hre;

describe("W3F-Consumer tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let smartOracle: SmartOracle;
  let oracleW3f: Web3FunctionHardhat;
  let userArgs: Web3FunctionUserArgs;
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
    const { gelatoMsgSender: gelatoMsgSender } = await hre.getNamedAccounts();

    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSender);
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));

    const smartOracleAddress = (await deployments.get("SmartOracle")).address;

    smartOracle = (await ethers.getContractAt(
      "SmartOracle",
      smartOracleAddress
    )) as SmartOracle;

    const p = await  admin.populateTransaction({
      to: smartOracle.address,
      value: 5000,
      gasLimit: 10000000,
    }) 

    await admin.sendTransaction({
      to: smartOracle.address,
      value: 5000,
      gasLimit: 10000000,
    });

    userArgs = {
      SmartOracle: smartOracleAddress, // set your oracle address
      priceIds: [
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
      ], // set your price ids
    };

    oracleW3f = w3f.get("pyth-oracle-consumer-contract");
  });

  it("W3F returns canExec:true in first Execution", async () => {
   let storageBefore = {};
    const  {result, storage, } = await oracleW3f.run({ userArgs, storage:storageBefore });


    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);
    }
  });
  it("W3F updates price in first execution", async () => {
    const currentPrice = await smartOracle.currentPrice();

    const storage = {};
    const w3fResultCall1 = await oracleW3f.run({ userArgs, storage });
    const result1 = w3fResultCall1.result as Web3FunctionResultV2;

    expect(result1.canExec).to.be.eq(true);

    if (result1.canExec == true) {
      expect(result1.callData.length).to.be.eq(1);

      await gelatoMsgSenderSigner.sendTransaction({
        to: result1.callData[0].to,
        data: result1.callData[0].data,
      });

      const newPrice = await smartOracle.currentPrice();

      expect(currentPrice.price).not.to.eq(newPrice.price);
    }
  });
  it("W3f not executes if price diff <2% && time elapsed less than one day", async () => {
    let storage = {};
    let { result } = await oracleW3f.run({ userArgs, storage });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);

      await gelatoMsgSenderSigner.sendTransaction({
        to: result.callData[0].to,
        data: result.callData[0].data,
      });

      const newPriceObject = await smartOracle.currentPrice();
      const newPrice = +newPriceObject.price.toString();
      const newTimestamp = +newPriceObject.lastUpdateTimestamp.toString();
      storage = {
        lastPrice: `{"price":${newPrice},"timestamp":${newTimestamp}}`,
      };

      const w3fResultCall2 = await oracleW3f.run({ userArgs, storage });
      const result2 = w3fResultCall2.result as Web3FunctionResultV2;

      expect(result2.canExec).to.be.eq(false);
    }
  });
  it("W3f  executes if price diff >2%", async () => {
    let storage = {};
    let { result } = await oracleW3f.run({ userArgs, storage });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);

      await gelatoMsgSenderSigner.sendTransaction({
        to: result.callData[0].to,
        data: result.callData[0].data,
      });

      const newPriceObject = await smartOracle.currentPrice();
      const newPrice = +newPriceObject.price.toString() * 1.1;
      const newTimestamp = +newPriceObject.lastUpdateTimestamp.toString();
      storage = {
        lastPrice: `{"price":${newPrice},"timestamp":${newTimestamp}}`,
      };

      const w3fResultCall2 = await oracleW3f.run({ userArgs, storage });
      const result2 = w3fResultCall2.result as Web3FunctionResultV2;

      expect(result2.canExec).to.be.eq(true);
    }
  });
  it("W3f  executes if timestamp > 24h", async () => {
    let storage = {};
    let { result } = await oracleW3f.run({ userArgs, storage });
    result = result as Web3FunctionResultV2;

    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);

      await gelatoMsgSenderSigner.sendTransaction({
        to: result.callData[0].to,
        data: result.callData[0].data,
      });

      const newPriceObject = await smartOracle.currentPrice();
      const newPrice = +newPriceObject.price.toString();
      const newTimestamp =
        +newPriceObject.lastUpdateTimestamp.toString() - (24 * 60 * 60 + 1);
      storage = {
        lastPrice: `{"price":${newPrice},"timestamp":${newTimestamp}}`,
      };

      const w3fResultCall2 = await oracleW3f.run({ userArgs, storage });
      const result2 = w3fResultCall2.result as Web3FunctionResultV2;

      expect(result2.canExec).to.be.eq(true);
    }
  });
});
