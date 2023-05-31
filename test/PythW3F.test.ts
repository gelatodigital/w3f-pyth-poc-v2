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
    await setBalance(gelatoMsgSender, utils.parseEther("1000000000"));

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
  it("Update oracle price on first execution", async () => {
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );

    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
    // console.log(priceUpdateData);
    // console.log("pyth", pyth);
    await smartOracle
      .connect(gelatoMsgSenderSigner)
      .updatePrice(priceUpdateData);
  });
  it("checks if price updates with a price diff >2% or after 24h", async () => {
    // Connect to the pyth network
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    );

    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    // Fetch the latest price feed for the price id
    const check = await connection.getLatestPriceFeeds(priceIds);
  });

  it("No price update when variation less than 2% and time less than 24 hours", async () => {});

  it("Handles invalid price data", async () => {
    // Prepare invalid price data
    const invalidData = ethers.utils.randomBytes(32);

    // Call the function under test with invalid price data and catch the error
    try {
      await smartOracle
        .connect(gelatoMsgSenderSigner)
        .updatePrice([invalidData]);
      throw new Error("Expected updatePrice to throw error but it did not");
    } catch (err) {
      // Expect the function to revert
      expect(err).to.be.an.instanceof(Error);
      // Check the error message, should indicate invalid price data
      expect((err as Error).message).to.include("invalid price data");
    }
  });
});
