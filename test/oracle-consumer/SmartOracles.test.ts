import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";
import { EvmPriceServiceConnection } from "@pythnetwork/pyth-evm-js";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { SmartOracle } from "../../typechain";
import { utils } from "ethers";
const { ethers, deployments } = hre;

describe("SmartOracle contract tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let smartOracle: SmartOracle;
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
    smartOracle = (await ethers.getContractAt(
      "SmartOracle",
      (
        await deployments.get("SmartOracle")
      ).address
    )) as SmartOracle;

    await admin.sendTransaction({
      to: smartOracle.address,
      value: 5000,
      gasLimit: 10000000,
    });
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

    
    const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

 

    


    const priceBefore = await smartOracle.currentPrice();

    await smartOracle
      .connect(gelatoMsgSenderSigner)
      .updatePrice(priceUpdateData);
    expect(await smartOracle.currentPrice()).to.not.eq(priceBefore);
  });
});
