const { expect } = require("chai")
const { ethers, waffle, web3 } = require('hardhat')
const { deployContract } = waffle

// contracts abi
const Core = require('../artifacts/contracts/Core.sol/Core.json')
// const MatrixTemplate = require('../artifacts/contracts/MatrixTemplate.sol/MatrixTemplate.json')

const prepare = async () => {
  const [
    coreWallet,
    userWallet,
  ] = await ethers.getSigners()

  const CoreToken = await deployContract(coreWallet, Core)

  // const wei = web3.utils.toWei('1', 'ether')
  // update user balance in BNB (now balances top up from hardhat.config.js)
  // top up bnb to user wallet
  // await waffle.provider.send("hardhat_setBalance", [
  //   userWallet.address,
  //   web3.utils.toHex(wei),
  // ])

  // getting contract instance through main contract
  const FirstLevelContractAddress = await CoreToken.getLevelContract(1)
  const FirstLevelContractTemplate = await ethers.getContractFactory('MatrixTemplate')
  const FirstLevelContract = await FirstLevelContractTemplate.attach(
    FirstLevelContractAddress
  )

  return {
    coreWallet,
    CoreToken,
    userWallet,
    FirstLevelContract,
  }
}

/**
 * @param begin - skip amount wallets initialized in prepare function
 * @returns {Promise}
 */
const getWallets = async (begin) => {
  const signers = await ethers.getSigners()
  return signers.slice(begin)
}

describe('testing register method (by just transferring bnb', () => {
  describe('receiving require checking for exception', () => {

    let p
    before(async () => {
      p = await prepare()
    })

    it('require error for over max transfer', async () => {
      await expect(p.userWallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.1'),
      })).to.be.revertedWith('max level is 8 (0.08 bnb)')
    })

    it('require error for not multiply of level multiplier', async () => {
      await expect(p.userWallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.011'),
      })).to.be.revertedWith('You must transfer multiple of 0.01 bnb')
    })

    it('check registered', async () => {
      await p.userWallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.01'),
      })

      const balanceObject = await p.FirstLevelContract.connect(p.userWallet).getBalance(p.userWallet.address)
      expect(balanceObject.balance).equal(0)

      const length = await p.FirstLevelContract.connect(p.userWallet).getLength()
      expect(length).equal(1)
    })
  })

  describe('multiple registrations check index and parent prop', () => {
    let p, wallets
    before(async () => {
      p = await prepare()
      wallets = await getWallets(2)
    })

    it('check multiple registrations length', async () => {
      for (const index in [...Array(5).keys()]) {
        await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

        const length = await p.FirstLevelContract.connect(wallets[index]).getLength()

        expect(length).equal(Number(index) + 1)
      }

    }).timeout(5000)
  })
})
