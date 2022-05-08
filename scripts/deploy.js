const { ethers } = require('hardhat')

async function main() {
  const contractName = "Matrix"
  // We get the contract to deploy
  const Token = await ethers.getContractFactory(contractName)
  const token = await Token.deploy(
    '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
    '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'
  )

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

// Matrix deployed to: 0x403437EC55dA5d2aE6f7dE4e0E97BFb8f5CD548B
// latest contract: https://testnet.bscscan.com/token/0x2636fdea1d061bc13c2fa51cef2366bf291aa6a5
