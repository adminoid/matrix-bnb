#!/Users/petja/.nvm/versions/node/v19.1.0/bin/node

// running script:
// npx hardhat run --network testnet scripts/deploy.js
// hh          run --network testnet scripts/deploy.js

const { ethers } = require('hardhat')
const { getGasInfo } = require("./gas-deploy.js");

async function main() {
  const contractName = "Core"
  // We get the contract to deploy
  const Token = await ethers.getContractFactory(contractName)

  await getGasInfo(Token);
  // return;

  /**
   * testnet
   * 0xC8Ed245e8014bcB2416B69440c34c492acd24Ff3 - id0
   * 0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a - id1
   * 0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69 - id2
   * 0xD9a7Ec49E4EC186C093e630240c87b970a413A00 - id3
   * 0xCEe63383AeF505A1D3e1B240F02252D3559f39eC - id4
   * mainnet
   * 0x5ff808633f2c5a3349adf89be7f71a2f2fede06f - id0
   * 0x644436697d5d2e4d1e96bfa567f645e0df74a246 - id1
   * 0xa923e2c9cb21aec25ce204f4eeee62b6c8e77843 - id2
   * 0x3ae7780e7b7f7dfe86bc6ca8a308be9cbf9d1ff6 - id3
   * 0x98ea12a51536a771e1DaFe965F88a653F7B33b4F - id4
   * @type {Contract}
   */
  // const token = await Token.deploy()
  const token = await Token.deploy([
    '0x5ff808633f2c5a3349adf89be7f71a2f2fede06f',
    '0x644436697d5d2e4d1e96bfa567f645e0df74a246',
    '0xa923e2c9cb21aec25ce204f4eeee62b6c8e77843',
    '0x3ae7780e7b7f7dfe86bc6ca8a308be9cbf9d1ff6',
    '0x98ea12a51536a771e1DaFe965F88a653F7B33b4F',
  ])

  console.log(`${contractName} deployed to: `, token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// TESTNET:
// Core deployed to: 0xe762866DBda340049b3cAF3bFBf67bc7f0F396a9
// latest contract:
// https://testnet.bscscan.com/address/0xe762866DBda340049b3cAF3bFBf67bc7f0F396a9

// MAINNET:
// Current gas price: 339477658
// Estimated gas: 31597840
// Deployer balance:  0.01
// Deployment price:  0.000000003
// Core deployed to:  0x85D95Bb439A39Cb6ECc56Bbb63E859f99a644957
// deployer: 0xD994c36CBe17264988De77a04AF7ab621324b01A

// hh run --network testnet scripts/deploy.js (logs)

// Current gas price: 339477658
// Estimated gas: 31597828
// Deployer balance:  2.698958097825264483
// Deployment price:  0.000000003
// Core deployed to:  0xe762866DBda340049b3cAF3bFBf67bc7f0F396a9
