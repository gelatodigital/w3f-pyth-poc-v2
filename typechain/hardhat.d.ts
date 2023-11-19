/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { ethers } from "ethers";
import {
  FactoryOptions,
  HardhatEthersHelpers as HardhatEthersHelpersBase,
} from "@nomiclabs/hardhat-ethers/types";

import * as Contracts from ".";

declare module "hardhat/types/runtime" {
  interface HardhatEthersHelpers extends HardhatEthersHelpersBase {
    getContractFactory(
      name: "VRFCoordinatorV2Interface",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.VRFCoordinatorV2Interface__factory>;
    getContractFactory(
      name: "VRFConsumerBaseV2",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.VRFConsumerBaseV2__factory>;
    getContractFactory(
      name: "Ownable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Ownable__factory>;
    getContractFactory(
      name: "Pausable",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.Pausable__factory>;
    getContractFactory(
      name: "IPyth",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPyth__factory>;
    getContractFactory(
      name: "IPythEvents",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPythEvents__factory>;
    getContractFactory(
      name: "IPyth",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPyth__factory>;
    getContractFactory(
      name: "IPythEvents",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.IPythEvents__factory>;
    getContractFactory(
      name: "SmartOracle",
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<Contracts.SmartOracle__factory>;

    getContractAt(
      name: "VRFCoordinatorV2Interface",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.VRFCoordinatorV2Interface>;
    getContractAt(
      name: "VRFConsumerBaseV2",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.VRFConsumerBaseV2>;
    getContractAt(
      name: "Ownable",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.Ownable>;
    getContractAt(
      name: "Pausable",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.Pausable>;
    getContractAt(
      name: "IPyth",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPyth>;
    getContractAt(
      name: "IPythEvents",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPythEvents>;
    getContractAt(
      name: "IPyth",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPyth>;
    getContractAt(
      name: "IPythEvents",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.IPythEvents>;
    getContractAt(
      name: "SmartOracle",
      address: string,
      signer?: ethers.Signer
    ): Promise<Contracts.SmartOracle>;

    // default types
    getContractFactory(
      name: string,
      signerOrOptions?: ethers.Signer | FactoryOptions
    ): Promise<ethers.ContractFactory>;
    getContractFactory(
      abi: any[],
      bytecode: ethers.utils.BytesLike,
      signer?: ethers.Signer
    ): Promise<ethers.ContractFactory>;
    getContractAt(
      nameOrAbi: string | any[],
      address: string,
      signer?: ethers.Signer
    ): Promise<ethers.Contract>;
  }
}
