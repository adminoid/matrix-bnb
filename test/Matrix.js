const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol/MockBUSD.json')

// BUSD: https://testnet.bscscan.com/token/0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee
// USDT: https://testnet.bscscan.com/token/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd
// BUSD and USDT all have 18 decimals

const prepare = async () => {
  const [
    deployerUSDT,
    deployerBUSD,
    deployerMatrix,
    userWallet,
    boxWallet,
  ] = await ethers.getSigners()

  const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)
  const tokenBUSD = await deployContract(deployerBUSD, MockBUSD)
  const tokenMatrix = await deployContract(deployerMatrix, Matrix, [
    boxWallet.address,
    tokenUSDT.address,
    tokenBUSD.address,
  ])

  return {
    deployerUSDT,
    deployerBUSD,
    userWallet,
    boxWallet,
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
      boxWallet,
      tokenUSDT,
      tokenMatrix,
    } = await prepare()

    // update user balance in USDT
    await tokenUSDT.connect(deployerUSDT).transfer(userWallet.address, 11)
    let balance = await tokenUSDT.balanceOf(userWallet.address)
    expect(balance).to.equal(11) // ok

    // deposit USDT
    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositUSDT(9)
    let usdtBalance = await tokenUSDT.balanceOf(userWallet.address)
    expect(usdtBalance).to.equal(2)
    let mxTokenBalance = await tokenUSDT.balanceOf(boxWallet.address)
    expect(mxTokenBalance).to.equal(9)
    let mxUserBalance = await tokenMatrix.balanceOf(userWallet.address)
    expect(mxUserBalance).to.equal(9)

    // const owner = userWallet
    // withdraw USDT

    console.log(tokenMatrix.address)
    console.log(boxWallet.address)
    console.log(userWallet.address)

    // await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 6)
    await tokenMatrix.connect(userWallet.address).withdrawUSDT(6)

    // let usdtBalance1 = await tokenUSDT.balanceOf(userWallet.address)
    // expect(usdtBalance1).to.equal(10)
    // let mxTokenBalance1 = await tokenUSDT.balanceOf(deployerMatrix.address)
    // expect(mxTokenBalance1).to.equal(1)
    // let mxUserBalance1 = await tokenMatrix.balanceOf(userWallet.address)
    // expect(mxUserBalance1).to.equal(1)

  }).timeout(20000)

  // it('Deposit and withdraw BUSD', async () => {
  //   const {
  //     deployerBUSD,
  //     userWallet,
  //     tokenBUSD,
  //     tokenMatrix,
  //   } = await prepare()
  //
  //   await tokenBUSD.connect(deployerBUSD).transfer(userWallet.address, 11)
  //   let balance = await tokenBUSD.balanceOf(userWallet.address)
  //   expect(balance).to.equal(11) // ok
  //
  //   await tokenBUSD.connect(userWallet).approve(tokenMatrix.address, 9)
  //   await tokenMatrix.connect(userWallet).depositBUSD(9)
  //
  //   let busdBalance = await tokenBUSD.balanceOf(userWallet.address)
  //   expect(busdBalance).to.equal(2)
  //
  //   let mxTokenBalance = await tokenBUSD.balanceOf(tokenMatrix.address)
  //   expect(mxTokenBalance).to.equal(9)
  //
  //   let mxUserBalance = await tokenMatrix.balanceOf(userWallet.address)
  //   expect(mxUserBalance).to.equal(9)
  // }).timeout(20000)
})