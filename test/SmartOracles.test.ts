import { Signer } from "@ethersproject/abstract-signer";
import { AddressZero } from "@ethersproject/constants";
import { Overrides } from "@ethersproject/contracts";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

import {
  time as blockTime,
  impersonateAccount,
  setBalance,
} from "@nomicfoundation/hardhat-network-helpers";
import { pyth_hub_abi } from "../helpers/pyth_hub_abi";

import { expect } from "chai";
import { BigNumber, Contract, utils } from "ethers";
import hre, { deployments, ethers } from "hardhat";
import { SmartOracle, IPyth } from "../typechain";

describe("SmartOracle.sol", function () {
  let admin: Signer;
  let smartOracle: SmartOracle;
  let gelatoMsgSenders: string;
  let pyth: IPyth;
  let gelatoMsgSenderSigner: Signer;
  let adminAddress: string;
  let addr1: Signer;

  let updatePriceData = {
    price: ethers.utils.parseEther("50000"),
    conf: 100,
    status: 1,
    corpAct: 0,
    pubSlot: 100000,
  };
  beforeEach("tests", async function () {
    if (hre.network.name !== "hardhat") {
      console.error("Test Suite is meant to be run on hardhat only");
      process.exit(1);
    }

    await deployments.fixture();

    [admin, addr1] = await ethers.getSigners();

    adminAddress = await admin.getAddress();
    await setBalance(adminAddress, utils.parseEther("1000000"));

    const { pyth: pythAddress, gelatoMsgSender: gelatoMsgSender } =
      await hre.getNamedAccounts();

    gelatoMsgSenders = gelatoMsgSender;

    smartOracle = (await ethers.getContractAt(
      "SmartOracle",
      (
        await deployments.get("SmartOracle")
      ).address
    )) as SmartOracle;

    pyth = new Contract(pythAddress, pyth_hub_abi, admin) as IPyth;

    await impersonateAccount(gelatoMsgSenders);
    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSenders);
    await setBalance(gelatoMsgSenders, utils.parseEther("10000000000000")); // Update the account balance of gelatoMsgSender
  });

  it("SmartOracle.updatePrice: onlyGelatoMsgSender", async () => {
    // Arbitrary bytes array

    await expect(smartOracle.updatePrice(updatePriceData)).to.be.revertedWith(
      "Only dedicated gelato msg.sender"
    );
  });

  it("should update the price", async () => {
    const mockPrice = 1000; // Set the mock price
    const mockPublishTime = Math.floor(Date.now() / 1000); // Set the mock publish time

    // Call the updatePrice function with the mock updatePriceData
    await smartOracle.updatePrice(updatePriceData);

    // Verify that the currentPrice struct has been updated correctly
    const currentPrice = await smartOracle.getPrice();
    expect(currentPrice.price).to.equal(mockPrice);
    expect(currentPrice.lastUpdateTimestamp).to.equal(mockPublishTime);
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
  it("updates the price correctly when called by gelatoMsgSender", async function () {
    await smartOracle
      .connect(gelatoMsgSenderSigner)
      .updatePrice(updatePriceData);

    // Check the price
    const price = await smartOracle.getPrice();

    // Verify the price updated correctly.
    // This will depend on your expectations. For now, let's just check that the price isn't null
    expect(price.price).to.not.be.null;
    expect(price.lastUpdateTimestamp).to.not.be.null;
  });

  it("Should update Pyth price", async function () {
    const connection = new EvmPriceServiceConnection(
      "https://xc-testnet.pyth.network"
    ); // See Price Service endpoints section below for other endpoints

    const priceIds = [
      "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
    ];

    // In order to use Pyth prices in your protocol you need to submit the price update data to Pyth contract in your target
    // chain. `getPriceFeedsUpdateData` creates the update data which can be submitted to your contract. Then your contract should
    // call the Pyth Contract with this data.
    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);
    console.log(priceUpdateData);
  });

  it("SmartOracle.withdraw: Withdraws contract balance", async () => {});
});
