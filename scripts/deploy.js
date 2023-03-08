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

  // const token = await Token.deploy()
  const token = await Token.deploy([
    '0xCec5CF0132711c3085dc2f4d6eA3959Af178F8E8',
    '0x985D1eeb73aF5dc0191789d7055Dd919066BeaEc',
    '0xD17AFF79e2C4214f7e27e3CF3827f2E4Dc297D17',
    '0x4580dB10cE8F1b6e5e424D2C5C04fCD5F74A325A',
    '0x03F08bc6054C21Deb4828D196086Dc4b3fb64A22',
    '0x66057282C4eD1102410DD90A670206DCDa9001F2',
  ])

  console.log(`${contractName} deployed to: `, token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })

// Core deployed to: 0x0A22f5aa18c63669C027Be4a906d8BB29Eb265cD
// latest contract:
// https://testnet.bscscan.com/token/0x0A22f5aa18c63669C027Be4a906d8BB29Eb265cD

