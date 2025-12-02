require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
// const { task } = require("hardhat/config");
// const { ethers } = require('hardhat')
// const { mnemonic } = require('./secret/secret.json'); // 0xE2496514F6a3B1aCC3BB903EC2458810F2B48076
const { mnemonic } = require('./secret/secret-main.json'); // 0xE2496514F6a3B1aCC3BB903EC2458810F2B48076
// const { mnemonic } = require('./secret/secret-igor.json'); // 0x3019145a5c3B3e1871e4Ac12A5f21b6A1b0968AD
// const { mnemonic } = require('./secret/workchain.json');
// const mnemonic = '';

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// console.log(mnemonic);

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "mainnet",
        chainId: 56,
        urls: {
          apiURL: "https://api.bscscan.com/api",
          browserURL: "https://bscscan.com"
        }
      },
      {
        network: "testnet",
        chainId: 97,
        urls: {
          apiURL: "https://api-testnet.bscscan.com/api",
          browserURL: "https://testnet.bscscan.com"
        }
      }
    ]
  },
  solidity: {
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  // todo -- change if network changed
  // defaultNetwork: "localhost",
  // defaultNetwork: "testnet",
  defaultNetwork: "mainnet",
  allowUnlimitedContractSize: true,
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      // gas: 600_000_000,
      gas: "auto"
      // blockGasLimit: 999000000,
    },
    hardhat: {
      allowUnlimitedContractSize: true,
      accounts: {
        mnemonic: "test test test test test test test test test test test junk",
        count: 50,
        accountsBalance: '30000000000000000000000', // 30_000 bnb
      },
      gas: "auto",
      blockGasLimit: 999000000,
      // gasPrice: 2_000_000,
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s2.binance.org:8545/",
      chainId: 97,
      // gasPrice: 200_000_000,
      // gasPrice: 'auto',
      gas: "auto",
      accounts: { mnemonic }
    },
    mainnet: {
      url: "https://bsc-dataseed.binance.org/",
      chainId: 56,
      gas: 'auto',
      accounts: { mnemonic }
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  mocha: {
    timeout: 999999
  }
}
