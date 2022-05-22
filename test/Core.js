const { expect } = require("chai")
const { ethers, waffle, web3 } = require('hardhat')
const { deployContract } = waffle

// contracts
const Core = require('../artifacts/contracts/Core.sol/Core.json')
// const MatrixTemplate = require('../artifacts/contracts/MatrixTemplate.sol/MatrixTemplate.json')

const prepare = async () => {
  const signers = await ethers.getSigners()
  const [
    coreWallet,
    userWallet,
  ] = signers

  const wallets = signers.slice(2)

  const tokenCore = await deployContract(coreWallet, Core)

  // const wei = web3.utils.toWei('1', 'ether')
  // update user balance in BNB (now balances top up from hardhat.config.js)
  // top up bnb to user wallet
  // await waffle.provider.send("hardhat_setBalance", [
  //   userWallet.address,
  //   web3.utils.toHex(wei),
  // ])

  // getting contract instance through main contract
  const FirstLevelContractAddress = await tokenCore.getLevelContract(1)
  const FirstLevelContractTemplate = await ethers.getContractFactory('MatrixTemplate')
  const FirstLevelContract = await FirstLevelContractTemplate.attach(
    FirstLevelContractAddress
  )

  return {
    coreWallet,
    tokenCore,
    userWallet,
    FirstLevelContract,
    wallets,
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
        to: p.tokenCore.address,
        value: ethers.utils.parseEther('0.1'),
      })).to.be.revertedWith('max level is 8 (0.08 bnb)')
    })

    it('require error for not multiply of level multiplier', async () => {
      await expect(p.userWallet.sendTransaction({
        to: p.tokenCore.address,
        value: ethers.utils.parseEther('0.011'),
      })).to.be.revertedWith('You must transfer multiple of 0.01 bnb')
    })
  })

  describe('register user and check it\'s properties', () => {
    it('check registered', async () => {
      await p.userWallet.sendTransaction({
        to: p.tokenCore.address,
        value: ethers.utils.parseEther('0.01'),
      })

      const balanceObject = await p.FirstLevelContract.connect(p.userWallet).getBalance(p.userWallet.address)
      expect(balanceObject.balance).equal(0)

      const length = await p.FirstLevelContract.connect(p.userWallet).getLength()
      expect(length).equal(1)


    }).timeout(5000)
  })

  describe('multiple registrations check index and parent prop', () => {
    it('check multiple registrations length', async () => {

      for (const index in [...Array(5).keys()]) {
        await p.wallets[index].sendTransaction({
          to: p.tokenCore.address,
          value: ethers.utils.parseEther('0.01'),
        })

        const length = await p.FirstLevelContract.connect(p.wallets[index]).getLength()

        console.log(length, index)

        expect(length).equal(Number(index) + 1)
      }

    }).timeout(5000)
  })
})
