import { HardhatUserConfig } from "hardhat/config";

// PLUGINS
import "@gelatonetwork/web3-functions-sdk/hardhat-plugin";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "hardhat-deploy";
import "@nomiclabs/hardhat-etherscan";

// Process Env Variables
import * as dotenv from "dotenv";
dotenv.config({ path: __dirname + "/.env" });

const PK = process.env.PK;
const ALCHEMY_ID = process.env.ALCHEMY_ID;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const BLAST_API_KEY = process.env.BLAST_API_KEY;

// HardhatUserConfig bug
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const config: HardhatUserConfig = {
  // web3 functions
  w3f: {
    rootDir: "./web3-functions",
    debug: false,
    networks: ["polygon"], //(multiChainProvider) injects provider for these networks
  },
  // hardhat-deploy
  namedAccounts: {
    deployer: {
      default: 0,
    },
    gelatoMsgSender: {
      hardhat: "0xbB97656cd5fECe3a643335d03C8919D5E7DcD225",
      base: "0xcc53666e25BF52C7c5Bc1e8F6E1F6bf58E871659",
      polygon: "0xcc53666e25BF52C7c5Bc1e8F6E1F6bf58E871659",
      blastSepolia:"0xbB97656cd5fECe3a643335d03C8919D5E7DcD225"
    },
    pyth: {
      hardhat: "0xA2aa501b19aff244D90cc15a4Cf739D2725B5729",
      base: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
      polygon: "0xff1a0f4744e8582DF1aE09D5611b887B6a12925C",
      blastSepolia:"0xA2aa501b19aff244D90cc15a4Cf739D2725B5729"
    },
  },
  defaultNetwork: "hardhat",

  networks: {
    hardhat: {
      forking: {
        url: `https://base-mainnet.g.alchemy.com/v2/${BLAST_API_KEY}`,

       // blockNumber: 35241432,
      },
    },

    ethereum: {
      accounts: PK ? [PK] : [],
      chainId: 1,
      url: `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_ID}`,
    },
    polygon: {
      accounts: PK ? [PK] : [],
      chainId: 137,
      url: "https://polygon-rpc.com",
    },
    base: {
      accounts: PK ? [PK] : [],
      chainId: 8453,
      url: `https://base-mainnet.g.alchemy.com/v2/${BLAST_API_KEY}`,
    },
    blastSepolia :{
      accounts: PK ? [PK] : [],
      chainId: 168587773,
      url: `https://sepolia.blast.io`,
    }
  },

  solidity: {
    compilers: [
      {
        version: "0.8.18",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },

  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },

  // hardhat-deploy
  etherscan: {
    apiKey: {
      blastSepolia: "blast_sepolia", // apiKey is not required, just set a placeholder
    },
    customChains: [
      {
        network: "blastSepolia",
        chainId: 168587773,
        urls: {
          apiURL: "https://api.routescan.io/v2/network/testnet/evm/168587773/etherscan",
          browserURL: "https://testnet.blastscan.io"
        }
      }
    ]
  },
  // verify: {
  //   etherscan: {
  //     apiKey: ETHERSCAN_API_KEY ? ETHERSCAN_API_KEY : "",
  //   },
  // },
};

export default config;
