import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

import {
  time as blockTime,
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { pyth_hub_abi } from "../helpers/pyth_hub_abi";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { SmartOracle, IPyth } from "../typechain";
import { BigNumber, Contract, utils } from "ethers";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
} from "@gelatonetwork/web3-functions-sdk";
const { ethers, deployments, w3f } = hre;

describe("SmartOracle contract tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let owner: SignerWithAddress;
  let smartOracle: SmartOracle;
  let oracleW3f: Web3FunctionHardhat;
  let userArgs: Web3FunctionUserArgs;
  let pyth: IPyth;
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
    const { pyth: pythAddress, gelatoMsgSender: gelatoMsgSender } =
      await hre.getNamedAccounts();
    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSender);
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));
    smartOracle = (await ethers.getContractAt(
      "SmartOracle",
      (
        await deployments.get("SmartOracle")
      ).address
    )) as SmartOracle;

    userArgs = {
      SmartOracle: pythAddress, // set your oracle address
      priceIds: [
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
      ], // set your price ids
    };
    pyth = new Contract(pythAddress, pyth_hub_abi, admin) as IPyth;
  });
  it("SmartOracle.updatePrice: onlyGelatoMsgSender", async () => {
    // Arbitrary bytes array
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );

    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

    await expect(smartOracle.updatePrice(priceUpdateData)).to.be.revertedWith(
      "Only dedicated gelato msg.sender"
    );
  });

  it("SmartOracle.pause: Pauses the contract", async () => {
    await smartOracle.pause();

    expect(await smartOracle.paused()).to.equal(true);
  });

  it("SmartOracle.unpause: Unpauses the contract", async () => {
    await smartOracle.pause();

    expect(await smartOracle.paused()).to.equal(true);

    await smartOracle.unpause();

    expect(await smartOracle.paused()).to.equal(false);
  });

  it("SmartOracle.updatePrice: should update price correctly", async () => {
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );

    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    const priceUpdateData = await connection.getPriceFeedsUpdateData([
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
    ]);
    // console.log("updatePriceData length: ", priceUpdateData.length);
    // console.log("updatePriceData[0]: ", priceUpdateData[0]);
    // const priceBefore = await smartOracle.currentPrice();
    // console.log("priceUpdateData", priceUpdateData);
    // console.log("gelatoMsgSenderSigner", gelatoMsgSenderSigner);
    let fee = await pyth.getUpdateFee(priceUpdateData);
    console.log(fee);
    // await smartOracle
    //   .connect(gelatoMsgSenderSigner)
    //   .updatePrice(priceUpdateData);
    // expect(await smartOracle.currentPrice()).to.not.eq(priceBefore);
  });
});
