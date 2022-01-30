const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const MXToken = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
// const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol')

describe("Deposit/withdraw BUSD and USDT with Matrix", async _ => {
  it('deposit USDT', async function () {
    const [walletUSDT, walletMatrix] = await ethers.getSigners()
    const tokenUSDT = await deployContract(walletUSDT, MockUSDT);
    const tokenMatrix = await deployContract(walletMatrix, MXToken);
    tokenUSDT.transfer(walletMatrix.address, 70)
    const test = await tokenMatrix.balanceOf(walletMatrix.address)
    console.log(test)
  })
})
