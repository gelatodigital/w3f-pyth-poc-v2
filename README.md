import { Signer } from "@ethersproject/abstract-signer";
import { AddressZero } from "@ethersproject/constants";
import { Overrides } from "@ethersproject/contracts";

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

  beforeEach("tests", async function () {
    if (hre.network.name !== "hardhat") {
      console.error("Test Suite is meant to be run on hardhat only");
      process.exit(1);
    }

    await deployments.fixture();

    [admin] = await ethers.getSigners();

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
    const updatePriceData = Array(5)
      .fill(0)
      .map(() => ethers.utils.hexlify(ethers.utils.randomBytes(16)));

    await expect(smartOracle.updatePrice(updatePriceData)).to.be.revertedWith(
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
  it("SmartOracle.updatePrice: Update price and verify current price", async () => {
    const updatePriceData = Array(1)
      .fill(0)
      .map(() => ethers.utils.hexlify(ethers.utils.randomBytes(16)));

    const fee = await pyth.getUpdateFee(updatePriceData);

    await smartOracle
      .connect(gelatoMsgSenderSigner)
      .updatePrice(updatePriceData, { value: fee });

    const priceID = ethers.utils.hexlify(
      ethers.utils.toUtf8Bytes(
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6"
      )
    );

    const updatedPrice = await pyth.getPrice(priceID);

    expect(await smartOracle.currentPrice.price).to.equal(updatedPrice.price);
    expect(await smartOracle.currentPrice.lastUpdateTimestamp).to.equal(
      updatedPrice.publishTime
    );
  });




it("SmartOracle.withdraw: Withdraws contract balance", async () => {
  // Send some Ether to the contract
  const amountToSend = utils.parseEther("1");
  await gelatoMsgSenderSigner.sendTransaction({
    to: smartOracle.address,
    value: amountToSend,
  });

  const initialBalance = await ethers.provider.getBalance(adminAddress);

  try {
    await smartOracle.withdraw();
  } catch (error) {
    // Handle insufficient balance error
    const balance = await ethers.provider.getBalance(adminAddress);
    if (balance.lt(amountToSend)) {
      console.log("Insufficient balance");
      return;
    }
    throw error;
  }

  const finalBalance = await ethers.provider.getBalance(adminAddress);

const lowerBound = utils.parseEther("0.99999");
const upperBound = utils.parseEther("1.00001");
expect(finalBalance.sub(initialBalance)).to.be.within(lowerBound, upperBound);

});

});
