const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const QJson = require('../artifacts/contracts/Question.sol/Question.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')

describe('Question.sol', _ => {
  it('Deposit USDT with Question.sol', async () => {
    const [deployerUSDT, deployerMatrix, commonWallet, walletUser] = await ethers.getSigners()

    const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)

    const tokenMatrix = await deployContract(deployerMatrix, QJson, [
      tokenUSDT.address,
      commonWallet.address,
    ])

    await tokenUSDT.connect(deployerUSDT).transfer(walletUser.address, 11)
    let balance = await tokenUSDT.balanceOf(walletUser.address)
    expect(balance).to.equal(11) // ok

    await tokenUSDT.connect(walletUser).approve(tokenMatrix.address, 9);
    await tokenMatrix.connect(walletUser).depositUSDT(9)

    let usdtBalance = await tokenUSDT.balanceOf(walletUser.address)
    let mxBalance = await tokenUSDT.balanceOf(commonWallet.address)
    console.log(usdtBalance, mxBalance)
    console.log(walletUser.address)
    console.log(commonWallet.address)

    // let matrixBalance = await tokenMatrix.balanceOf(walletUser.address)
    // console.log(matrixBalance, usdtBalance)

    // // expect(matrixBalance).to.equal(amount2)
  }).timeout(20000)
})
