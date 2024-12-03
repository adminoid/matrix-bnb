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
   * 0xC8Ed245e8014bcB2416B69440c34c492acd24Ff3 - id0
   * 0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a - id1
   * 0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69 - id2
   * 0xD9a7Ec49E4EC186C093e630240c87b970a413A00 - id3
   * 0xCEe63383AeF505A1D3e1B240F02252D3559f39eC - id4
   * @type {Contract}
   */
  // const token = await Token.deploy()
  const token = await Token.deploy([
    '0xC8Ed245e8014bcB2416B69440c34c492acd24Ff3',
    '0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a',
    '0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69',
    '0xD9a7Ec49E4EC186C093e630240c87b970a413A00',
    '0xCEe63383AeF505A1D3e1B240F02252D3559f39eC',
  ])

  console.log(`${contractName} deployed to: `, token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// Core deployed to: 0xd9aAa3230c7b1CC116876C2cCa325ECAEb4CcDaE
// latest contract:
// https://testnet.bscscan.com/address/0xd9aAa3230c7b1CC116876C2cCa325ECAEb4CcDaE

// hh run --network testnet scripts/deploy.js (logs)

// Current gas price: 339477658
// Estimated gas: 31027716
// Deployer balance:  2.681346381241264483
// Deployment price:  0.000000003
// Core deployed to:  0xd9aAa3230c7b1CC116876C2cCa325ECAEb4CcDaE