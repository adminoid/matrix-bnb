const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MockUSDT = require('../artifacts/contracts/mocks/mockUSDT.sol/MockUSDT.json')
// const MockBUSD = require('../artifacts/contracts/mocks/mockBUSD.sol/MockBUSD.json')

describe('Deposit/withdraw BUSD and USDT with Matrix.sol', _ => {
  it('Deposit USDT', async () => {
    const [deployerUSDT, deployerMatrix, commonWallet, walletUser] = await ethers.getSigners()

    const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)
    const tokenMatrix = await deployContract(deployerMatrix, Matrix, [
      tokenUSDT.address,
      commonWallet.address,
    ])

    await tokenUSDT.connect(deployerUSDT).transfer(walletUser.address, 11)
    let balance = await tokenUSDT.balanceOf(walletUser.address)
    expect(balance).to.equal(11) // ok

    await tokenUSDT.connect(walletUser).approve(tokenMatrix.address, 9);
    await tokenMatrix.connect(walletUser).depositUSDT(9)

    let usdtBalance = await tokenUSDT.balanceOf(walletUser.address)
    expect(usdtBalance).to.equal(2)

    let mxBalance = await tokenUSDT.balanceOf(commonWallet.address)
    expect(mxBalance).to.equal(9)
  }).timeout(20000)
})
