const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contract abi
const Core = require('../artifacts/contracts/Core.sol/Core.json')

const customWallets = 10; // 1 system, 3 my, plus 6 maintainers

// const Signers = await ethers.getSigners()
// Signers.forEach(signer => {
//   let orig = signer.sendTransaction;
//   signer.sendTransaction = function(transaction) {
//     transaction.gasLimit = BigNumber.from(gasLimit.toString());
//     return orig.apply(signer, [transaction]);
//   }
// });

const prepare = async () => {
  // so many that equal customWallets (see above)
  const allAddresses = await ethers.getSigners();
  // console.log("all:", allAddresses.length, allAddresses.map(v => v.address))
  const [
    coreWallet,
    myWallet1,
    myWallet2,
    myWallet3,
  ] = allAddresses
  const firstSix = allAddresses.slice(4, 10).map(v => v.address)

  console.log("coreWallet:", coreWallet.address)
  console.log("myWallet1:", myWallet1.address)
  console.log("myWallet2:", myWallet2.address)
  console.log("myWallet3:", myWallet3.address)
  console.log("firstSix:", firstSix.length, firstSix)

  console.log(ethers.utils.formatEther(await coreWallet.getBalance()))

  // const gasPrice = await ERC20TokenFactory.signer.getGasPrice();
  // const estimatedGas = await ERC20TokenFactory.signer.estimateGas(deployTx);
  // console.log(gasPrice, estimatedGas)

  // fill addresses
  const CoreToken = await deployContract(
    coreWallet,
    Core,
    [firstSix],
    // {value: 5_000_000_000_000_000}
    {
      gasLimit: 55_000_000,
    }
  )

  // 30_000_000
  // Transaction gasPrice (992079520) is too low for the next block, which has a baseFeePerGas of 1015131892
  // Transaction gasPrice (1015131892) is too low for the next block, which has a baseFeePerGas of 1015131892

  // getting contract instance through main contract
  const FirstLevelContractAddress = await CoreToken.getLevelContract(1)
  const FirstLevelContractTemplate = await ethers.getContractFactory('MatrixTemplate')
  const FirstLevelContract = await FirstLevelContractTemplate.attach(
    FirstLevelContractAddress
  )

  return {
    coreWallet,
    CoreToken,
    myWallet1,
    myWallet2,
    myWallet3,
    FirstLevelContract,
    firstSix,
  }
}

/**
 * @returns {Promise}
 * @param padding
 */
const getWallets = async (padding = customWallets) => {
  console.info('customWallets---')
  console.log(customWallets, padding)
  const signers = await ethers.getSigners()
  return signers.slice(padding)
}

describe.skip('testing register method (by just transferring bnb', () => {
  describe('receiving require checking for exception', () => {

    let p
    before(async () => {
      p = await prepare()
    })

    it('require error for over max transfer', async () => {
      await expect(p.myWallet1.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.21'),
      })).to.be.revertedWith('min level is 0.01, max level is 20 (0.2 bnb)')
    })

    it('require error for not multiply of level multiplier', async () => {
      await expect(p.myWallet1.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.011'),
      })).to.be.revertedWith('You must transfer multiple of 0.01 bnb')
    })

    it('check registered', async () => {
      await p.myWallet1.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.01'),
      })

      const user = await p.FirstLevelContract.connect(p.myWallet1).getUser(p.myWallet1.address)
      expect(user.index).equal(1) // (0 index = 1 number; +1 top registration while deploy MatrixTemplate)
    })
  })

  describe('multiple registrations check index and parent prop', () => {

    it('check multiple registrations length', async () => {
      const p = await prepare(),
        wallets = await getWallets()

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
        wallets = await getWallets(),
        users = []

      for (const index in [...Array(7).keys()]) {
        await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.01'),
        })

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
      await p.myWallet1.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.01'),
      })

      expect(await p.myWallet1.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther('0.02'),
      }))

      try {
        expect(await p.myWallet1.sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.04'),
        }))
          .to.be.revertedWith("You don't registered in previous level")

      } catch (e) {
        expect(await p.myWallet1.sendTransaction({
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
    runRegistrations = async (total, isSpecial = false, amount = '0.01') => {
      const wallets = await getWallets()
      let users = []
      for (const index in [...Array(total).keys()]) {

        if (wallets[index]) {
          let tx
          if (!isSpecial) {
            tx = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther(amount),
              // gas: 300000,
            })
          } else {
            tx = await p.CoreToken
              .connect(wallets[index])
              .register(p.firstSix[1], { // todo <-- maybe whose index is 0 ?
                value: ethers.utils.parseEther(amount),
                // gas: 300000,
              })
              // .register(p.firstSix[5], {
              //   value: ethers.utils.parseEther('0.1'),
              // })
          }
          // debug_2

          // example for check gas used
          const receipt = await tx.wait()
          const gasUsed = receipt.gasUsed.toNumber()
          users[index] = {
            wallet: wallets[index],
            gasUsed,
          }
        }
      }
      return users
    }
  })


  async function topUp(users, amount = '0.06') {
    for (let i = 0; i < users.length; i++) {

      console.log("--------!--------")
      console.info("index is ", i)
      console.log("users[i].wallet.address", users[i].wallet.address)

      const tx = await users[i].wallet.sendTransaction({
        to: p.CoreToken.address,
        value: ethers.utils.parseEther(amount),
      })

      await tx.wait()
    }
  }

  async function loopUsers(users) {
    console.info('=========wallets after all=========')
    for (let j = 0; j < users.length; j++) {
      const balance = await waffle.provider.getBalance(users[j].wallet.address)

      const userCore = await p.CoreToken.connect(users[j].wallet.address).getUserFromCore(users[j].wallet.address);
      const userMatrix = await p.CoreToken.connect(users[j].wallet.address).getUserFromMatrix(userCore.level, users[j].wallet.address);

      // todo: run getUserFromCore() user for complete logging
      console.log('^^^^^^^')
      console.log('index:', j + 1, users[j].wallet.address)
      console.log('wallet balance', ethers.utils.formatEther(balance))
      console.log('gas: ', users[j].gasUsed)
      console.info("userMatrix: index,parent,isRight,plateau,isValue")
      console.log(userMatrix)
      console.info("userCore: claims,gifts,level,whose,isValue")
      console.log(userCore)
      console.log('_______')
    }
  }

  it('check registration and resulting gifts and claims', async () => {
    const users = await runRegistrations(126)

    await loopUsers(users)

    console.info('=========core balance after all=========')
    const coreBalance = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.log('core wallet:', p.CoreToken.address)
    console.info(ethers.utils.formatEther(coreBalance))

    const specialUser = await p.FirstLevelContract
      .connect('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
      .getUser('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
    console.log('specialUser 0', specialUser)

    await expect(true).to.equal(true)

    // todo: add one more wallet and top up it balance
    console.info("p.myWallet1.address:")
    console.log(p.myWallet1.address)
  }).timeout(999999)

  it('check whose top up, debugging', async () => {
    const coreBalance0 = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.info("coreBalance0", coreBalance0)
    // const users = await runRegistrations(270)
    // await runRegistrations(550, true)
    await runRegistrations(10, false, '0.1')
    // await runRegistrations(10, true)
    // await runRegistrations(10)
    // const users = await runRegistrations(50)
    // const users = await runRegistrations(9) // 6 (0-5) + 9 (6-14)
    // console.info("coreBalance:", p.CoreToken.getBalance());
    // await topUp(users)
    const coreBalance1 = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.info("coreBalance1", coreBalance1)

  }).timeout(999999)

  it('just deploy async', async () => {
    // console.log(p)
    console.log("started")
    // p = await prepare()
  }).timeout(999999)

})
