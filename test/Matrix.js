const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
// const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol/MockBUSD.json')

describe('Deposit/withdraw BUSD and USDT with Matrix.sol', _ => {
  it('Deposit USDT', async () => {
    const [deployerUSDT, deployerMatrix, commonWallet, userWallet] = await ethers.getSigners()

    const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)
    const tokenMatrix = await deployContract(deployerMatrix, Matrix, [
      tokenUSDT.address,
      commonWallet.address,
    ])

    await tokenUSDT.connect(deployerUSDT).transfer(userWallet.address, 11)
    let balance = await tokenUSDT.balanceOf(userWallet.address)
    expect(balance).to.equal(11) // ok

    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9);
    await tokenMatrix.connect(userWallet).depositUSDT(9)

    let usdtBalance = await tokenUSDT.balanceOf(userWallet.address)
    expect(usdtBalance).to.equal(2)

    let mxTokenBalance = await tokenUSDT.balanceOf(commonWallet.address)
    expect(mxTokenBalance).to.equal(9)

    let mxUserBalance = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance).to.equal(9)

  }).timeout(20000)
})
