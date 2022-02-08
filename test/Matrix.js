const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol/MockBUSD.json')

// USDT: https://testnet.bscscan.com/token/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
// BUSD: https://testnet.bscscan.com/token/0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
// USDT and BUSD all have 18 decimals

const prepare = async () => {
  const [
    deployerUSDT,
    deployerBUSD,
    deployerMatrix,
    userWallet,
  ] = await ethers.getSigners()

  const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)
  const tokenBUSD = await deployContract(deployerBUSD, MockBUSD)
  const tokenMatrix = await deployContract(deployerMatrix, Matrix, [
    tokenUSDT.address,
    tokenBUSD.address,
  ])

  return {
    deployerUSDT,
    deployerBUSD,
    userWallet,
    tokenUSDT,
    tokenBUSD,
    tokenMatrix,
  }
}

describe('Deposit/withdraw BUSD and USDT with Matrix.sol', _ => {
  it('Deposit and withdraw USDT', async () => {
    const {
      deployerUSDT,
      userWallet,
      tokenUSDT,
      tokenMatrix,
    } = await prepare()

    // update user balance in USDT
    await tokenUSDT.connect(deployerUSDT).transfer(userWallet.address, 11)

    const balance = await tokenUSDT.balanceOf(userWallet.address)
    expect(balance).to.equal(11) // ok

    // deposit USDT
    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositUSDT(9)

    const usdtBalance = await tokenUSDT.balanceOf(userWallet.address)
    expect(usdtBalance).to.equal(2)
    const mxTokenBalance = await tokenUSDT.balanceOf(tokenMatrix.address)
    expect(mxTokenBalance).to.equal(9)
    const mxUserBalance = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance).to.equal(9)

    // withdraw USDT
    await tokenMatrix.connect(userWallet).withdrawUSDT(6)

    const usdtBalance1 = await tokenUSDT.balanceOf(userWallet.address)
    expect(usdtBalance1).to.equal(8)
    const mxTokenBalance1 = await tokenUSDT.balanceOf(tokenMatrix.address)
    expect(mxTokenBalance1).to.equal(3)
    const mxUserBalance1 = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance1).to.equal(3)
  }).timeout(20000)

  it('Deposit and withdraw BUSD', async () => {
    const {
      deployerBUSD,
      userWallet,
      tokenBUSD,
      tokenMatrix,
    } = await prepare()

    // update user balance in USDT
    await tokenBUSD.connect(deployerBUSD).transfer(userWallet.address, 11)

    const balance = await tokenBUSD.balanceOf(userWallet.address)
    expect(balance).to.equal(11) // ok

    // deposit USDT
    await tokenBUSD.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositBUSD(9)

    const busdBalance = await tokenBUSD.balanceOf(userWallet.address)
    expect(busdBalance).to.equal(2)
    const mxTokenBalance = await tokenBUSD.balanceOf(tokenMatrix.address)
    expect(mxTokenBalance).to.equal(9)
    const mxUserBalance = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance).to.equal(9)

    // withdraw USDT
    await tokenMatrix.connect(userWallet).withdrawBUSD(6)

    const busdBalance1 = await tokenBUSD.balanceOf(userWallet.address)
    expect(busdBalance1).to.equal(8)
    const mxTokenBalance1 = await tokenBUSD.balanceOf(tokenMatrix.address)
    expect(mxTokenBalance1).to.equal(3)
    const mxUserBalance1 = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance1).to.equal(3)
  }).timeout(20000)
})
