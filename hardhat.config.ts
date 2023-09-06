import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomiclabs/hardhat-ethers";

/** @type import('hardhat/config').HardhatUserConfig */
const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.13",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      //If you want to do some forking, uncomment this
      //  forking: {
      //    url: "MAINNET_RPC_URL"
      //  } ,
      chainId: 31337,
      allowUnlimitedContractSize: true,
    },
  },
  gasReporter: {
    enabled: true,
  },
};

export default config;
