const { expect } = require("chai")
const { ethers, waffle, web3 } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')
const MatrixFirst = require('../artifacts/contracts/MatrixFirst.sol/MatrixFirst.json')
const {BigNumber} = require("ethers");

const prepare = async () => {
  const [
    matrixWallet,
    userWallet,
    userWalletEmpty,
  ] = await ethers.getSigners()

  const tokenMatrix = await deployContract(matrixWallet, Matrix)
  const wei = web3.utils.toWei('1', 'ether')
  // update user balance in BNB
  // top up bnb to user wallet
  await waffle.provider.send("hardhat_setBalance", [
    userWallet.address,
    web3.utils.toHex(wei),
  ])
  // getting contract instance through main contract
  const FirstLevelContractAddress = await tokenMatrix.getLevelContract(1)
  const FirstLevelContractTemplate = await ethers.getContractFactory('MatrixFirst')
  const FirstLevelContract = await FirstLevelContractTemplate.attach(
    FirstLevelContractAddress
  )

  return {
    matrixWallet,
    tokenMatrix,
    userWallet,
    userWalletEmpty,
    FirstLevelContract,
  }
}

describe('testing register method (by just transferring bnb', () => {
  let p
  before(async () => {
    p = await prepare()
  })

  describe('receiving require checking for exception', () => {
    it('require error for over max transfer', async () => {
      await expect(p.userWallet.sendTransaction({
        to: p.tokenMatrix.address,
        value: ethers.utils.parseEther('0.1'),
      })).to.be.revertedWith('max level is 8 (0.08 bnb)')
    })

    it('require error for not multiply of level multiplier', async () => {
      await expect(p.userWallet.sendTransaction({
        to: p.tokenMatrix.address,
        value: ethers.utils.parseEther('0.011'),
      })).to.be.revertedWith('You must transfer multiple of 0.01 bnb')
    })
  })

  describe('register user and check it\'s properties', () => {
    it('check registered', async () => {
      await p.userWallet.sendTransaction({
        to: p.tokenMatrix.address,
        value: ethers.utils.parseEther('0.01'),
      })

      const balanceObject = await p.FirstLevelContract.connect(p.userWallet).getBalance(p.userWallet.address)

      expect(balanceObject.balance).equal(237)

    })
  })
})
