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
    const tokenUSDT = await deployContract(walletUSDT, MockUSDT)
    const tokenMatrix = await deployContract(walletMatrix, MXToken)

    let amount = ethers.utils.parseEther(String(150))

    await tokenUSDT.connect(walletUSDT).transfer(walletMatrix.address, amount)
    let newBalance = await tokenUSDT.balanceOf(walletMatrix.address)
    expect(newBalance).to.equal(amount)

    let matrixBalance = await tokenMatrix.balanceOf(walletMatrix.address)
    console.log(matrixBalance)
  })
})
