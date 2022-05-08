const { expect } = require("chai")
const { ethers, waffle, network } = require('hardhat')
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
    userWalletEmpty,
  ] = await ethers.getSigners()

  const tokenUSDT = await deployContract(deployerUSDT, MockUSDT)
  const tokenBUSD = await deployContract(deployerBUSD, MockBUSD)
  const tokenMatrix = await deployContract(deployerMatrix, Matrix, [
    tokenUSDT.address,
    tokenBUSD.address,
  ])

  // top up bnb to wallets
  await network.provider.send("hardhat_setBalance", [
    userWallet.address,
    "0x1000000000000",
  ])

  // todo: try mint, like there: https://ethereum.stackexchange.com/questions/100004/prefunding-wallets-in-hardhat
  // update user balance in USDT
  await tokenUSDT.connect(deployerUSDT).transfer(userWallet.address, 11)
  // update user balance in BUSD
  await tokenBUSD.connect(deployerBUSD).transfer(userWallet.address, 11)

  return {
    userWallet,
    tokenUSDT,
    tokenBUSD,
    tokenMatrix,
    userWalletEmpty,
  }
}

async function getBalance(token, account) {
  return await token.balanceOf(account.address)
}

describe('Register users and funds distribution', () => {
  it('should user register', async () => {
    const {
      userWallet,
      tokenUSDT,
      tokenMatrix,
      userWalletEmpty,
    } = await prepare()
  });

  const balance = await waffle.provider.getBalance(userWallet.address);
  console.log(balance)
  console.log(ethers.utils.formatEther(balance)) // divide to 10**18

  ethers.utils.formatEther(balance)

}).timeout(10000)

describe('Deposit/withdraw BUSD and USDT with Matrix.sol', _ => {
  it('Deposit and withdraw USDT', async () => {
    const {
      userWallet,
      tokenUSDT,
      tokenMatrix,
      userWalletEmpty,
    } = await prepare()

    // deposit from empty balance
    await tokenUSDT.connect(userWalletEmpty).approve(tokenMatrix.address, 9)
    await expect(tokenMatrix.connect(userWalletEmpty)
      .depositUSDT(9)).to.be.reverted;

    // deposit USDT
    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9)
    await expect(tokenMatrix.connect(userWallet).depositUSDT(9))
      .to.emit(tokenMatrix, "Deposited")
      .withArgs(userWallet.address, 9, 'USDT')

    expect(await getBalance(tokenUSDT, userWallet)).to.equal(2)
    expect(await getBalance(tokenUSDT, tokenMatrix)).to.equal(9)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(9)
    expect(await tokenMatrix.connect(userWallet).getUSDTDeposit()).to.equal(9)

    // withdraw USDT
    await expect(tokenMatrix.connect(userWallet).withdrawUSDT(6))
      .to.emit(tokenMatrix, "Withdrawn")
      .withArgs(userWallet.address, 6, 'USDT')

    expect(await getBalance(tokenUSDT, userWallet)).to.equal(8)
    expect(await getBalance(tokenUSDT, tokenMatrix)).to.equal(3)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(3)

    expect(await tokenMatrix.connect(userWallet).getUSDTDeposit()).to.equal(3)

  }).timeout(25000)

  it('Deposit and withdraw BUSD', async () => {
    const {
      userWallet,
      tokenBUSD,
      tokenMatrix,
      userWalletEmpty,
    } = await prepare()

    // deposit from empty balance
    await tokenBUSD.connect(userWalletEmpty).approve(tokenMatrix.address, 9)
    await expect(tokenMatrix.connect(userWalletEmpty).depositUSDT(9))
      .to.be.reverted;

    // deposit BUSD
    await tokenBUSD.connect(userWallet).approve(tokenMatrix.address, 9)

    await expect(tokenMatrix.connect(userWallet).depositBUSD(9))
      .to.emit(tokenMatrix, "Deposited")
      .withArgs(userWallet.address, 9, 'BUSD')

    expect(await getBalance(tokenBUSD, userWallet)).to.equal(2)
    expect(await getBalance(tokenBUSD, tokenMatrix)).to.equal(9)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(9)

    // withdraw BUSD
    await expect(tokenMatrix.connect(userWallet).withdrawBUSD(6))
      .to.emit(tokenMatrix, "Withdrawn")
      .withArgs(userWallet.address, 6, 'BUSD')

    expect(await getBalance(tokenBUSD, userWallet)).to.equal(8)
    expect(await getBalance(tokenBUSD, tokenMatrix)).to.equal(3)
    expect(await getBalance(tokenMatrix, userWallet)).to.equal(3)
  }).timeout(25000)

  it('Deposit USDT then withdraw BUSD and vice versa', async () => {
    const {
      userWallet,
      tokenUSDT,
      tokenMatrix,
    } = await prepare()

    // deposit USDT
    await tokenUSDT.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositUSDT(9)

    expect(await tokenMatrix.connect(userWallet).getUSDTDeposit()).to.equal(9)

    // withdraw more than deposited BUSD
    await expect(tokenMatrix.connect(userWallet).withdrawBUSD(2))
      .to.be.revertedWith('BUSD deposited less than you want to withdraw');
  }).timeout(25000)

  it('Deposit BUSD then withdraw USDT and vice versa', async () => {
    const {
      userWallet,
      tokenBUSD,
      tokenMatrix,
    } = await prepare()

    // deposit USDT
    await tokenBUSD.connect(userWallet).approve(tokenMatrix.address, 9)
    await tokenMatrix.connect(userWallet).depositBUSD(9)

    expect(await tokenMatrix.connect(userWallet).getBUSDDeposit()).to.equal(9)

    // withdraw more than deposited BUSD
    await expect(tokenMatrix.connect(userWallet).withdrawUSDT(2))
      .to.be.revertedWith('USDT deposited less than you want to withdraw');
  }).timeout(25000)
})
