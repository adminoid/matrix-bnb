require("@nomiclabs/hardhat-waffle");
require('@nomiclabs/hardhat-ethers');
require("@nomiclabs/hardhat-web3");
require("hardhat-gas-reporter");
// const { task } = require("hardhat/config");
// const { ethers } = require('hardhat')
// const { mnemonic } = require('./secret/secret.json');
// const { mnemonic } = require('./secret/secret-igor.json');
// const { mnemonic } = require('./secret/workchain.json');
const mnemonic = '';

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
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  defaultNetwork: "localhost",
  // defaultNetwork: "testnet",
  // defaultNetwork: "mainnet",
  allowUnlimitedContractSize: true,
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
      // gas: 600_000_000,
    },
    hardhat: {
      accounts: {
        // count: 200,
        // count: 135,
        // count: 20,
        // count: 290,
        count: 550,
        // count: 600,
        // count: 60,
        // count: 6,
        accountsBalance: '3000000000000000000000'
        // 1330000000000000000
        // 1330000000000000000
        // 3000000000000000000
      }
      ,blockGasLimit: 126000000429720 // whatever you want here
      // If there have got out of gas, increase gasLimit value
      // ,gasLimit: 777_000_000
      // ,gasPrice: 2_000_000_000
      // ,gas: 300_000_000
    },
    testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      // gasPrice: 20000000000,
      gasPrice: 'auto',
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
};
