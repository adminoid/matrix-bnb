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
        value: ethers.utils.parseEther('0.21'),
      })).to.be.revertedWith('min level is 0.01, max level is 20 (0.2 bnb)')
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
      expect(length).equal(2) // (0 index = 1 number; +1 top registration while deploy MatrixTemplate)
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

        expect(length).equal(Number(index) + 2) // index(0..n) + 1(num) + 1 top node while deploy
      }

    })

    it('check plateau (level in pyramid)', async () => {
      for (const index in [...Array(67).keys()]) {
        await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

        const length = await p.FirstLevelContract.connect(wallets[index]).getLength()

        console.log(length)

        await expect(true).equal(true)
      }

    }).timeout(160000)
  })

  describe('protection of extraordinary registration', () => {
    let p
    before(async () => {
      p = await prepare()
    })

    it('check of attempt register in higher level without previous levels', async () => {
      await p.userWallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.01'),
      })

      expect(await p.userWallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.02'),
      }))

      try {
        expect(await p.userWallet.sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.04'),
        }))
          .to.be.revertedWith("You don't registered in previous level")

      } catch (e) {
        // console.error(e.message)

        expect(await p.userWallet.sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.03'),
        }))
      }

      expect(true).equal(true)
    }).timeout(30000)
  })
})
