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

// Matrix deployed to: 0x2Ae22C2E2f5d90AD43e2001e1742B49F75eB0239
// latest contract: https://testnet.bscscan.com/token/0x2Ae22C2E2f5d90AD43e2001e1742B49F75eB0239
