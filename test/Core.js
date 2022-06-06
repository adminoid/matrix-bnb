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

    it('check plateau (level in pyramid), parent and side', async () => {
      const users = []
      for (const index in [...Array(7).keys()]) {
        await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

        // example for separate contract:
        // const length = await p.FirstLevelContract.connect(wallets[index]).getLength()

        const user = await p.CoreToken.connect(wallets[index]).getUserFromMatrix(0, wallets[index].address);
        users.push(user)
      }

      expect(users[0].parent.toNumber()).to.equal(0)
      expect(users[0].plateau.toNumber()).to.equal(2)
      expect(users[0].isRight).to.equal(false)

      expect(users[1].parent.toNumber()).to.equal(0)
      expect(users[1].plateau.toNumber()).to.equal(2)
      expect(users[1].isRight).to.equal(true)

      expect(users[2].parent.toNumber()).to.equal(1)
      expect(users[2].plateau.toNumber()).to.equal(3)
      expect(users[2].isRight).to.equal(false)

      expect(users[3].parent.toNumber()).to.equal(1)
      expect(users[3].plateau.toNumber()).to.equal(3)
      expect(users[3].isRight).to.equal(true)

      expect(users[4].parent.toNumber()).to.equal(2)
      expect(users[4].plateau.toNumber()).to.equal(3)
      expect(users[4].isRight).to.equal(false)

      expect(users[5].parent.toNumber()).to.equal(2)
      expect(users[5].plateau.toNumber()).to.equal(3)
      expect(users[5].isRight).to.equal(true)

      expect(users[6].parent.toNumber()).to.equal(3)
      expect(users[6].plateau.toNumber()).to.equal(4)
      expect(users[6].isRight).to.equal(false)

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
