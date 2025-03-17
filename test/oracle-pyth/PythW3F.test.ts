import hre from "hardhat";
import { Signer } from "@ethersproject/abstract-signer";

import { setBalance } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { IPyth, SmartOracle } from "../../typechain";
import { BytesLike, Contract, utils } from "ethers";
import { Web3FunctionHardhat } from "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import {
  Web3FunctionUserArgs,
  Web3FunctionResultV2,
} from "@gelatonetwork/web3-functions-sdk";
import { pythAbi } from "../../web3-functions/pyth-oracle-w3f/pythAbi";
const { ethers, deployments, w3f } = hre;

describe("W3F-Pyth tests", function () {
  let admin: Signer; // proxyAdmin
  let adminAddress: string;
  let pythNetwork: IPyth;
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
    const { gelatoMsgSender: gelatoMsgSender, pyth: pythNetworkAddress } =
      await hre.getNamedAccounts();

    gelatoMsgSenderSigner = await ethers.getSigner(gelatoMsgSender);
    await setBalance(gelatoMsgSender, utils.parseEther("10000000000000"));

    pythNetwork = new Contract(pythNetworkAddress, pythAbi, admin) as IPyth;

    userArgs = {
      pythNetworkAddress: pythNetworkAddress, // set your oracle address
      priceIds: [
        "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6",
      ], // set your price ids
    };

    oracleW3f = w3f.get("pyth-oracle-w3f");
  });

  it("W3F returns canExec:true in first Execution", async () => {
    const storage = {};

    const w3fResultCall1 = await oracleW3f.run({ userArgs, storage });
    const result = w3fResultCall1.result as Web3FunctionResultV2;

    expect(result.canExec).to.be.eq(true);

    if (result.canExec == true) {
      expect(result.callData.length).to.be.eq(1);
    }
  });
  it("W3F executes successfully on Pyth contract", async () => {
    const storage = {};
    const w3fResultCall1 = await oracleW3f.run({ userArgs, storage });
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
});
