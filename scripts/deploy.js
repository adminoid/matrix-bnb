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

// Core deployed to: 0xd022A72a9778CBed6Bce895EA9a0AB5a8641a8A9
// latest contract:
// https://testnet.bscscan.com/address/0xd022A72a9778CBed6Bce895EA9a0AB5a8641a8A9

// hh run --network testnet scripts/deploy.js (logs)
// Current gas price: 8328799328
// Estimated gas: 30970595
// Deployer balance:  0.8999797
// Deployment price:  0.25794787082376016
// Core deployed to:  0xd022A72a9778CBed6Bce895EA9a0AB5a8641a8A9