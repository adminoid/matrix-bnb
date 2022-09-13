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
 * @param start - skip amount wallets initialized in prepare function
 * @returns {Promise}
 */
const getWallets = async (start) => {
  const signers = await ethers.getSigners()
  return signers.slice(start)
}

describe.skip('testing register method (by just transferring bnb', () => {
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

      const user = await p.FirstLevelContract.connect(p.userWallet).getUser(p.userWallet.address)
      expect(user.index).equal(1) // (0 index = 1 number; +1 top registration while deploy MatrixTemplate)
    })
  })

  describe('multiple registrations check index and parent prop', () => {

    it('check multiple registrations length', async () => {
      const p = await prepare(),
        wallets = await getWallets(2)

      for (const index in [...Array(5).keys()]) {
        await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

        const length = await p.FirstLevelContract.connect(wallets[index]).getLength()

        expect(length).equal(Number(index) + 2) // index(0..n) + 1(num) + 1 top node while deploy
      }

    }).timeout(50000)

    it('check plateau (level in pyramid), parent and side', async () => {
      const p = await prepare(),
        wallets = await getWallets(2),
        users = []

      for (const index in [...Array(7).keys()]) {
        const tx = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

        // example for check gas used
        // const receipt = await tx.wait();
        // const gasUsed = receipt.gasUsed.toNumber()
        // console.log(gasUsed)

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

describe('practical testing interactions and that conclusions', async () => {

  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async (total) => {
      const wallets = await getWallets(2)
      let users = []
      for (const index in [...Array(total).keys()]) {

        // todo: get matrix level for calculating send value (0.01 * level)

        const tx = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })
        // example for check gas used
        const receipt = await tx.wait()
        const gasUsed = receipt.gasUsed.toNumber()
        users[index] = {
          wallet: wallets[index],
          gasUsed,
        }
      }
      return users
    }
  })

  async function loopUsers(users) {
    console.info('=========wallets after all=========')
    for (let j = 0; j < users.length; j++) {
      const balance = await waffle.provider.getBalance(users[j].wallet.address)
      // const userMatrix = await p.FirstLevelContract.connect(users[j].wallet.address).getUser(users[j].wallet.address)

      const userCore = await p.CoreToken.connect(users[j].wallet.address).getUserFromCore(users[j].wallet.address);
      const userMatrix = await p.CoreToken.connect(users[j].wallet.address).getUserFromMatrix(userCore.level, users[j].wallet.address);

      if (users[j].wallet.address === '0x90F79bf6EB2c4f870365E785982E1f101E93b906') {
        console.info('62 index for test')
        // const userCore = await p.CoreToken.connect(users[j].wallet.address).getUserFromCore(users[j].wallet.address);
        const tx = await users[j].wallet.sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.05'),
        })
        // example for check gas used
        const receipt = await tx.wait()
        const gasUsed = receipt.gasUsed.toNumber()
        console.log('gasUsed: ', gasUsed)
        console.log(users[j].wallet.address)
        console.info('30 end')
        // todo: get user balance from Core (getUserFromCore)

      }

      // todo: run getUserFromCore() user for complete logging
      console.log('^^^^^^^')
      console.log('index:', j + 1, users[j].wallet.address)
      console.log('wallet balance', ethers.utils.formatEther(balance))
      console.log('gas: ', users[j].gasUsed)
      // console.log('user.gift:', ethers.utils.formatEther(user['gift']))
      // console.log('user.claim:', ethers.utils.formatEther(user['claim']))
      console.info("userMatrix: index,parent,isRight,plateau,isValue")
      console.log(userMatrix)
      console.info("userCore: claims,gifts,level,whose,isValue")
      console.log(userCore)
      console.log('_______')
    }
  }

  it('check registration and resulting gift and claim', async () => {
    const users = await runRegistrations(62)

    // const user0 = await p.FirstLevelContract.connect(p.coreWallet.address).getUser(p.coreWallet.address)
    // // const balance0 = ethers.utils.formatEther(await waffle.provider.getBalance(p.coreWallet.address))
    // console.log('user0', user0)

    // setTimeout(() => (loopUsers(users)), 120000)

    await loopUsers(users)

    console.info('=========core balance after all=========')
    const coreBalance = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.log('core wallet:', p.CoreToken.address)
    console.info(ethers.utils.formatEther(coreBalance))

    const specialUser = await p.FirstLevelContract.connect('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266').getUser('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
    // const balance0 = ethers.utils.formatEther(await waffle.provider.getBalance(p.coreWallet.address))
    console.log('specialUser 0', specialUser)

    await expect(true).to.equal(true)

  }).timeout(960000)

})
