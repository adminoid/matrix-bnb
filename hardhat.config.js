require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
// const { task } = require("hardhat/config");
// const { ethers } = require('hardhat')
const { mnemonic } = require('./secret/secret.json'); // 0xE2496514F6a3B1aCC3BB903EC2458810F2B48076
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
  defaultNetwork: "localhost",
  // defaultNetwork: "testnet",
  // defaultNetwork: "mainnet",
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
        // count: 1350,
        // count: 41,
        count: 50,
        // count: 77,
        // count: 45,
        // count: 160,
        // count: 20,
        // count: 290,
        // count: 1100,
        // count: 600,
        // count: 60,
        // count: 6,
        // accountsBalance: '3000000000000000000000', // 3000 bnb
        accountsBalance: '30000000000000000000000', // 30_000 bnb
        // accountsBalance: '300000000000000000000011112222222221212',
      },
      // blockGasLimit: 126000000429720, // whatever you want here
      // blockGasLimit: 600_000_000, // whatever you want here
      // If there have got out of gas, increase gasLimit value
      // gasLimit: 55_000_000,
      // gasPrice: 2_000_000,
      // gas: 300_000_000
      gas: "auto",
      blockGasLimit: 999000000,
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
      gasPrice: 'auto',
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
    timeout: 20000
  }
}
