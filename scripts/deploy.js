#!/Users/petja/.nvm/versions/node/v19.1.0/bin/node

const { ethers } = require('hardhat')

async function main() {
  const contractName = "Core"
  // We get the contract to deploy
  const Token = await ethers.getContractFactory(contractName)
  // const token = await Token.deploy(
  //   '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
  //   '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
  // )
  const token = await Token.deploy()

  console.log(`${contractName} deployed to: `, token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// running script:
// npx hardhat run --network testnet scripts/deploy.js

// Core deployed to:  0xB9d1d4Fb5d0B0F36f8B1626afAe978FF8d115b72
// latest contract:
// https://testnet.bscscan.com/token/0xB9d1d4Fb5d0B0F36f8B1626afAe978FF8d115b72

