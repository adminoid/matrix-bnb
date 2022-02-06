const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const MXJson = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol/MockBUSD.json')

describe('Matrix.sol', _ => {
  it('Deposit/withdraw BUSD and USDT with Matrix.sol', async () => {
    const [walletUSDT, walletBUSD, walletCosts, walletMatrix] = await ethers.getSigners()

    const tokenUSDT = await deployContract(walletUSDT, MockUSDT)
    const tokenBUSD = await deployContract(walletBUSD, MockBUSD)
    const tokenMatrix = await deployContract(walletMatrix, MXJson, [
      tokenUSDT.address,
      tokenBUSD.address,
      walletCosts.address,
    ])

    let amount = ethers.utils.parseEther(String(11))

    await tokenUSDT.connect(walletUSDT).transfer(walletMatrix.address, amount)
    let balance = await tokenUSDT.balanceOf(walletMatrix.address)
    expect(balance).to.equal(amount)

    let amount2 = ethers.utils.parseEther(String(9))
    await tokenMatrix.connect(walletMatrix).depositUSDT(amount2)
    // let matrixBalance = await tokenMatrix.balanceOf(walletMatrix.address)
    // expect(matrixBalance).to.equal(amount)

    // let matrixBalance = await tokenMatrix.balanceOf(walletMatrix.address)
    // console.log(matrixBalance)
  }).timeout(20000)
})
