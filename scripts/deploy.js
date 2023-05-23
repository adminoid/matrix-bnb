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
   * 0x52Df967dcA772D99c8798B3d5415EE694B2EeCBF - id0
   * 0xc1B031361a230c76D10317F57AE6312d84Ec25fa - id1
   * 0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a - id2
   * 0x4C5e3352278eCE5df2581090A4dE535156104b31 - id3
   * 0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69 - id4
   * @type {Contract}
   */
  // const token = await Token.deploy()
  const token = await Token.deploy([
    '0x52Df967dcA772D99c8798B3d5415EE694B2EeCBF',
    '0xc1B031361a230c76D10317F57AE6312d84Ec25fa',
    '0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a',
    '0x4C5e3352278eCE5df2581090A4dE535156104b31',
    '0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69',
    '0x85C70Ac7f7B74730BDF32406E646250ac18D3C8e',
  ])

  console.log(`${contractName} deployed to: `, token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// Core deployed to: 0x9cfE614c5f8b2B851afceaDDE43609AFd55f989a
// latest contract:
// https://testnet.bscscan.com/address/0x9cfE614c5f8b2B851afceaDDE43609AFd55f989a

// Current gas price: 3000000000
// Estimated gas: 29638741
// Deployer balance:  0.224506049
// Deployment price:  0.088916223
// Core deployed to:  0x259F513E624E9EB168e6979E2E0117475Af50Ca6