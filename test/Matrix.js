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

  // update user balance in USDT
  await tokenUSDT.connect(deployerUSDT).transfer(userWallet.address, 11)
  // update user balance in BUSD
  await tokenBUSD.connect(deployerBUSD).transfer(userWallet.address, 11)

  return {
    userWallet,
    tokenUSDT,
    tokenBUSD,
    tokenMatrix,
  }
}

async function getBalance(token, account) {
  return await token.balanceOf(account.address)
}

describe('Deposit/withdraw BUSD and USDT with Matrix.sol', _ => {
  it('Deposit and withdraw USDT', async () => {
    const {
      userWallet,
      tokenUSDT,
      tokenMatrix,
    } = await prepare()

    // deposit USDT
    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositUSDT(9)

    expect(await getBalance(tokenUSDT, userWallet)).to.equal(2)
    expect(await getBalance(tokenUSDT, tokenMatrix)).to.equal(9)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(9)
    expect(await tokenMatrix.connect(userWallet).getUSDTDeposit()).to.equal(9)

    // withdraw USDT
    await tokenMatrix.connect(userWallet).withdrawUSDT(6)

    expect(await getBalance(tokenUSDT, userWallet)).to.equal(8)
    expect(await getBalance(tokenUSDT, tokenMatrix)).to.equal(3)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(3)

    expect(await tokenMatrix.connect(userWallet).getUSDTDeposit()).to.equal(3)

  }).timeout(20000)

  it('Deposit and withdraw BUSD', async () => {
    const {
      userWallet,
      tokenBUSD,
      tokenMatrix,
    } = await prepare()

    // deposit BUSD
    await tokenBUSD.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositBUSD(9)

    expect(await getBalance(tokenBUSD, userWallet)).to.equal(2)
    expect(await getBalance(tokenBUSD, tokenMatrix)).to.equal(9)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(9)

    // withdraw BUSD
    await tokenMatrix.connect(userWallet).withdrawBUSD(6)

    expect(await getBalance(tokenBUSD, userWallet)).to.equal(8)
    expect(await getBalance(tokenBUSD, tokenMatrix)).to.equal(3)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(3)
  }).timeout(20000)
})
