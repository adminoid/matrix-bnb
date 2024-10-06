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

// Core deployed to: 0xef9E7081dB0F2Bca4f5742E936ba60E3E840eEEa
// latest contract:
// https://testnet.bscscan.com/address/0xE5A4b5B6Ca6EEd303800093e72d54468b1486300

// hh run --network testnet scripts/deploy.js (logs)
// Current gas price: 10816000000
// Estimated gas: 30970595
// Deployer balance:  0.615674727665589347
// Deployment price:  0.33497795552
// Core deployed to:  0xef9E7081dB0F2Bca4f5742E936ba60E3E840eEEa