const { expect } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract } = waffle

// contract abi
const Core = require('../artifacts/contracts/Core.sol/Core.json')

const customWallets = 9; // 1 system, 3 my, plus 5 maintainers

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
  const firstFive = allAddresses.slice(4, customWallets).map(v => v.address)

  console.log("coreWallet:", coreWallet.address)
  console.log("myWallet1:", myWallet1.address)
  console.log("myWallet2:", myWallet2.address)
  console.log("myWallet3:", myWallet3.address)
  console.log("firstFive:", firstFive.length, firstFive)

  console.log(ethers.utils.formatEther(await coreWallet.getBalance()))

  // const gasPrice = await ERC20TokenFactory.signer.getGasPrice();
  // const estimatedGas = await ERC20TokenFactory.signer.estimateGas(deployTx);
  // console.log(gasPrice, estimatedGas)

  // fill addresses
  const CoreToken = await deployContract(
    coreWallet,
    Core,
    [firstFive],
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
    firstFive,
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
    runRegistrations = async (total, isSpecial = false, amount = '0.1') => {
      console.info("runRegistrations start")
      const wallets = await getWallets()
      let users = []
      // todo: set nextWallet to id0 or id6
      let nextWallet = '0xBcd4042DE499D14e55001CcbB24a551F3b954096'
      for (const index in [...Array(total).keys()]) {

        console.info(`w ${index} -> `, wallets[index].address)

        if (wallets[index]) {
          let tx
          if (!isSpecial) {
            console.info("not isSpecial here")

            if (index == 39 || index == 49 || index == 93) {
            // if (true) {

              // console.info("!!!!!!!!!!!!!!!!!!")
              // console.log(wallets[index]) // 0x7Ebb637fd68c523613bE51aad27C35C4DB199B9c

              console.log("referrals...........")
              console.log(index)
              console.log(wallets[index].address)

              tx = await p.CoreToken
                  .connect(wallets[index])
                  // .register("0xbcd4042de499d14e55001ccbb24a551f3b954096", {
                  .register("0x71bE63f3384f5fb98995898A86B02Fb2426c5788", {
                  // .register(nextWallet, {
                    value: ethers.utils.parseEther(amount),
                    // gas: 3000000,
                  })
            }
            else {
              tx = await wallets[index].sendTransaction({
                to: p.CoreToken.address,
                value: ethers.utils.parseEther(amount),
                // gas: 300000,
              })
            }
          } else {
            console.info("otherwise")
            tx = await p.CoreToken
              .connect(wallets[index])
              .register(p.firstFive[1], { // todo <-- maybe whose index is 0 ?
                value: ethers.utils.parseEther(amount),
                // gas: 300000,
              })
              // .register(p.firstFive[4], {
              //   value: ethers.utils.parseEther('0.1'),
              // })
          }
          // debug_2

          nextWallet = wallets[index].address

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
      // console.log('^^^^^^^')
      // console.log('index:', j + 1, users[j].wallet.address)
      // console.log('wallet balance', ethers.utils.formatEther(balance))
      // console.log('gas: ', users[j].gasUsed)
      // console.info("userMatrix: index,parent,isRight,plateau,isValue")
      // console.log(userMatrix)
      // console.info("userCore: claims,gifts,level,whose,isValue")
      // console.log(userCore)
      // console.log('_______')
    }
  }

  it('check registration and resulting gifts and claims', async () => {
    // const users = await runRegistrations(44) // (19) regs -> 24 real
    // const users = await runRegistrations(74)
    const users = await runRegistrations(130)
    // const users = await runRegistrations(150)
    // const users = await runRegistrations(512)
    // 63 real -5 = 58
    // 62

    // index == 39 || index == 49 || index == 93
    console.group("refs")
    console.log("39:", users[39])
    console.log("49:", users[49])
    console.log("93:", users[93])
    console.groupEnd()

    // await loopUsers(users)

    // console.info('=========core balance after all=========')
    // const coreBalance = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    // console.log('core wallet:', p.CoreToken.address)
    // console.info("BaLaNcE:")
    // console.info(ethers.utils.formatEther(coreBalance))

    // const specialUser = await p.FirstLevelContract
    //   .connect('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
    //   .getUser('0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266')
    // console.log('specialUser 0', specialUser)

    // await expect(true).to.equal(true)

    // todo: add one more wallet and top up it balance
    // console.info("p.myWallet1.address:")
    // console.log(p.myWallet1.address)

    // const { firstSix } = await prepare()
    // console.log(firstSix)

  }).timeout(9999999999999)

  it('check whose top up, debugging', async () => {
    const coreBalance0 = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.info("coreBalance0", coreBalance0)
    // const users = await runRegistrations(270)
    await runRegistrations(23, true) // have got error in the past, but now is ok
    // await runRegistrations(530) // no error
    // await runRegistrations(130, true) // no error
    // await runRegistrations(330) // no error
    // await runRegistrations(330, true) // no error
    // await runRegistrations(550, true)
    // await runRegistrations(10, false, '0.1')
    // await runRegistrations(10, true)
    // await runRegistrations(10)
    // const users = await runRegistrations(50)
    // const users = await runRegistrations(9) // 6 (0-5) + 9 (6-14)
    // console.info("coreBalance:", p.CoreToken.getBalance());
    // await topUp(users)
    const coreBalance1 = await p.CoreToken.provider.getBalance(p.CoreToken.address)
    console.info("coreBalance1", coreBalance1)

  }).timeout(999999)

  it('quick check events', async () => {
    // await runRegistrations(30, true)
    // await runRegistrations(30)
    await runRegistrations(21, true)
    // uint public AddressesGlobalTotal;
    // let AddressesGlobalTotal = await p.CoreToken.AddressesGlobalTotal()
    // console.log("AddressesGlobalTotal:", AddressesGlobalTotal.toNumber())

    let balance = await p.CoreToken.getBalance()
    console.log("formatted balance:", ethers.utils.formatEther(balance))

    const MTContractAddress0 = await p.CoreToken.getLevelContract(0)
    console.log('MTContractAddress0', MTContractAddress0)

    const MTContractAddress1 = await p.CoreToken.getLevelContract(1)
    console.log('MTContractAddress1', MTContractAddress1)

    const MTContract = await ethers.getContractFactory("MatrixTemplate")
    const MTContractInstance = await MTContract.attach(
        MTContractAddress0
    );

    console.log(MTContractInstance.interface.events)

  }).timeout(1999999)

  it('just deploy async', async () => {
    // console.log(p)
    console.log("started")
    // p = await prepare()
  }).timeout(999999)

})



describe('specific test suit for testing 31 user going to 3 level', async () => {
  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async (total) => {

      // console.log(p.CoreToken.address)

      let wallets = await getWallets()
      let users = []

      // loop 1
      for (let index in [...Array(total).keys()]) {

        index = Number(index)

        console.log('idx_!', index)
        console.log(wallets[index].address)

        // todo -- id5 до id30
        let gasUsed
        if (index >= 5 && index <= 30 && wallets[index]) {
          if (index === 5) {

            console.log('whose1', wallets[index - 1].address) // 0x1CBd3b2770909D4e10f157cABC84C7264073C9Ec

            // todo -- id5 под id4

            const tx1 = await p.CoreToken
                .connect(wallets[index]) // todo <-- id5
                .register('0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', { // todo <-- set wallet id4
                  value: ethers.utils.parseEther('0.01'),
                })
            const receipt1 = await tx1.wait()
            gasUsed = receipt1.gasUsed.toNumber()

            const tx2 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.02'),
            })
            const receipt2 = await tx2.wait()
            gasUsed += receipt2.gasUsed.toNumber()
          }
          else if (index === 6) {

            console.log('whose2', wallets[index - 1].address)

            // todo -- id6 под id5

            const tx1 = await p.CoreToken
                .connect(wallets[index]) // todo <-- id6
                .register(wallets[index - 1].address, { // todo <-- set wallet id5
                  value: ethers.utils.parseEther('0.01'),
                })
            const receipt1 = await tx1.wait()
            gasUsed = receipt1.gasUsed.toNumber()

            const tx2 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.02'),
            })
            const receipt2 = await tx2.wait()
            gasUsed += receipt2.gasUsed.toNumber()
          }
          else {

            console.log('whose3', wallets[index - 1].address)

            // todo -- id5 до id30 // сразу можно по 0,03 отправить
            const tx1 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.0312'),
            })
            const receipt1 = await tx1.wait()
            gasUsed = receipt1.gasUsed.toNumber()
          }

          users[index] = {
            wallet: wallets[index],
            gasUsed,
          }

          console.info(1,`w ${index} -> `, wallets[index].address)

        }
        else if (index === 31) {

          console.info('index == 31 !+^')
          // console.log(wallets[index])

          // const tx1 = await p.CoreToken
          //     .connect(wallets[index]) // todo <-- id6
          //     .register(wallets[index - 1].address, { // todo <-- set wallet id5
          //       value: ethers.utils.parseEther('0.01'),
          //     })
          // const receipt1 = await tx1.wait()
          // gasUsed = receipt1.gasUsed.toNumber()

          console.log('whose4', wallets[index - 1].address)

          // todo -- от id31 отправить 0,07

          const tx2 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.0700007'),
          })
          const receipt2 = await tx2.wait()
          gasUsed = receipt2.gasUsed.toNumber()

          console.info(2,`w ${index} -> `, wallets[index].address)

          // if (index === 30) console.warn(30, index)

          users[index] = {
            wallet: wallets[index],
            gasUsed,
          }
        }
      }
      // end of loop 1
      // ошибок нет??

      // послал на контракт от id5 до id30 еще по 0.02 tbnb через сайт;

      // 3) послал на контракт от id31 номер кошелька 0x3C91f186d667b4Ec812E09392680b3e83cBAB4b7 (по счету это 32й) через сайт на контракт 0.02 tbnb (0,01 ушел на регистрацию + 0,01 упал на claim), послал на контракт еще 0,01 tbnb (этот 0,01 упал на claim), произошло списание с claim 0,02 tbnb и произошел автопереход id31 с матрицы 1 на матрицу 2 – этот автопереход произошел правильно, потом отправил на контракт 0,04 tbnb и id31 перешел на матрицу3;

      // console.log('wallets[31].address 111', wallets[31].address)
      // const tx4 = await wallets[31].sendTransaction({
      //   to: p.CoreToken.address,
      //   value: ethers.utils.parseEther('0.020002'),
      // })
      // await tx4.wait()
      //
      // const tx5 = await wallets[31].sendTransaction({
      //   to: p.CoreToken.address,
      //   value: ethers.utils.parseEther('0.010003'),
      // })
      // await tx5.wait()
      //
      // const tx6 = await wallets[31].sendTransaction({
      //   to: p.CoreToken.address,
      //   value: ethers.utils.parseEther('0.040004'),
      // })
      // await tx6.wait()

      // 4) послал на контракт c id6 по id30 еще по 0.04 tbnb в итоге все эти id, кроме id5 перешли на матрицу 3, в момент, когда id30 отправляет 0,04 tbnb id5 должен получить от своего реферала id6 на claim 0,04 tbnb, в это же время должен был произойти автопереход и id5 должен был перейти на матрицу 3, но тут произошла ошибка и id5 перешел на матрицу4 вместо матрицы3

      // loop 2
      for (let index in [...Array(total).keys()]) {
        index = Number(index)
        if (index >= 6 && index <= 30) {
          if (index !== 30) {
            const tx7 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.04'),
            })
            await tx7.wait()
          }

          // id5 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097
          // claims: 0.02 BNB
          // gifts: 0.01 BNB
          // level: 1
          // whose: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
          // -------------------------------------------------
          // total in matrix level[0] (starts with 1): 32
          // index (starts with 0): 5
          // parent: 2
          // isRight: false
          // plateau: 3

          // ==================After==========================

          // claims: 0.02 BNB
          // gifts: 0.01 BNB
          // level: 3
          // whose: 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
          // -------------------------------------------------
          // total in matrix level[3] (starts with 1): 6
          // index (starts with 0): 5
          // parent: 2
          // isRight: false
          // plateau: 3

          // TODO: here is error !!!
          else { // id == 30

            console.info('777 index == 30')
            console.log('когда id30 отправляет 0,04 tbnb id5 должен получить от своего реферала id6 на claim 0,04 tbnb, в это же время должен был произойти автопереход и id5 должен был перейти на матрицу 3, но тут произошла ошибка и id5 перешел на матрицу4 вместо матрицы3')

            const tx7 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.0413'),
            })
            await tx7.wait()

          }

          console.info(7,`w ${index} -> `, wallets[index].address)

        }
      }
      // end of loop 2

      return users
    }
  })

  it('check 31 user registrations with 31st user going to third matrix', async () => {

    let wallets = await getWallets()

    // TODO: get info before tx
    const userCoreBefore = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[5].address);
    console.log('Before:', userCoreBefore)

    await runRegistrations(37) // 31 regs -> 36 real

    // TODO: get info after tx
    const userCoreAfter = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[5].address);
    console.log('After:', userCoreAfter)
  }).timeout(999999)

  // 0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097 - id5, level 0 and level 1, total 32 (31 last)
  // 0xcd3B766CCDd6AE721141F452C550Ca635964ce71 - id6 ref of id5
  // 0x9eF6c02FB2ECc446146E05F1fF687a788a8BF76d - id31
  // 0x7D86687F980A56b832e9378952B738b614A99dc6 - id30

  /**
   * 1) надо послать на контракт от id5 до id30 по 0.03 tbnb (0.01+0.02)
   * 2) надо послать id31 (по счету это 32й) на контракт 0.07 tbnb (0.01+0.02+0.04)
   * 3) надо послать на контракт c id6 по id30 еще по 0.04
   * Главное чтоб id6 был рефералом id5, т.е. регистрируешь id6 под id5
   */

  /**
   * 1)  Я зарегистрировал по 0,01 tbnb через сайт id5 номер кошелька 0x2F9e33197Df28AAe0fB29Bec7EcFE08e8f03Bee3 под рефовода id4, id6 номер кошелька 0x9897D2737a4c19b55D429794ad48E062bC7f9b1d под рефовода id5, и еще несколько id зарегистрировал также;
   *
   + * // id5 под id4 // id6 под id5
   *
   * 2)  послал на контракт от id5 до id30 еще по 0.02 tbnb через сайт;
   *
   * // сразу можно по 0,03 отправить по 0,02 (+0,01 регистрация)
   *
   * 3)  послал на контракт от id31 номер кошелька 0x3C91f186d667b4Ec812E09392680b3e83cBAB4b7 (по счету это 32й) через сайт на контракт 0.02 tbnb (0,01 ушел на регистрацию + 0,01 упал на claim), послал на контракт еще 0,01 tbnb (этот 0,01 упал на claim), произошло списание с claim 0,02 tbnb и произошел автопереход id31 с матрицы 1 на матрицу 2 – этот автопереход произошел правильно, потом отправил на контракт 0,04 tbnb и id31 перешел на матрицу3;
   *
   * // от id31 отправить 0,07
   *
   * // с id6 по id30 по 0,04 (when id30 send, id5 must got 0,04 to claim
   * // 0,04 должно списаться на level 2 (3 по счету)
   *
   * 4)  послал на контракт c id6 по id30 еще по 0.04 tbnb в итоге все эти id, кроме id5 перешли на матрицу 3, в момент, когда id30 отправляет 0,04 tbnb id5 должен получить от своего реферала id6 на claim 0,04 tbnb, в это же время должен был произойти автопереход и id5 должен был перейти на матрицу 3, но тут произошла ошибка и id5 перешел на матрицу4 вместо матрицы3
   */

  it('just deploy async', async () => {
    // console.log(p)
    console.log("started")
    // p = await prepare()
  }).timeout(999999)
})

describe('up to 5 after whose', async () => {
  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async (total) => {

      // console.log(p.CoreToken.address)

      let wallets = await getWallets()
      let users = []

      // loop 1
      for (let i = 5; i <= 6; i++) {

        const index = Number(i)

        console.info('5..6 by 0.01 refs: ', index)
        console.info('wallet: ', wallets[index].address)

        // todo -- !!! id5 регистрируешь под id4 за 0.01,
        if (index === 5) {
          const tx1 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id5
              .register('0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', { // todo <-- set wallet id4
                value: ethers.utils.parseEther('0.01'),
              })
          await tx1.wait()
        }
        // todo -- !!! id6 регистрируешь под id5 за 0.01
        else if (index === 6) {
          const tx2 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id6
              .register(wallets[index - 1].address, { // todo <-- set wallet id5
                value: ethers.utils.parseEther('0.01'),
              })
          await tx2.wait()
        }
      }

      // todo -- !!! Потом id5 и id6 отправляешь ещё по 0.02
      for (let i = 5; i <= 6; i++) {

        const index = Number(i)

        console.info('5..6 by 0.02: ', index)
        console.info('wallet: ', wallets[index].address)

        if (index >= 5 && index <= 6 && wallets[index]) {
          const tx3 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.02'),
          })
          await tx3.wait()
        }
      }

      console.info('before 7..30 by 0.03')

      // todo -- !!! Потом c id7 по id30 отправляешь на контракт по 0.03 bnb
      for (let i = 7; i <= 30; i++) {

        const index = Number(i)

        console.info('7..30 by 0.03: ', index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.03'),
        })
        await tx4.wait()

      }

      // todo -- !!! После этого id5 от id6 должно прийти 0.01 gift и рефоводные 0.02 на Claim
      console.log('the end.')

      /**
       * Надо отправлять с id5 до id30 еще по 0.04 bnb,
       * Потом 0.08 bnb,
       * Потом 0.16 bnb
       */

      /**
       * Соответственно, когда отправишь c id5 по id30 по
       * 0.04 bnb посмотришь у id5 должно быть на Claim 0.06,
       */

      for (let i = 5; i <= 30; i++) {

        const index = Number(i)

        console.info('5..30 by 0.04: ', index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.04'),
        })
        await tx4.wait()

      }

      /**
       * Надо отправлять с id5 до id30 еще по 0.04 bnb,
       * Потом 0.08 bnb, <--
       * Потом 0.16 bnb
       */

      for (let i = 5; i <= 30; i++) {

        const index = Number(i)

        console.info('5..30 by 0.08: ', index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.08'),
        })
        await tx4.wait()
      }

      // Когда отправишь 0.08 у id5 должно быть 0.14,


      /**
       * Надо отправлять с id5 до id30 еще по 0.04 bnb,
       * Потом 0.08 bnb,
       * Потом 0.16 bnb <--
       */

      for (let i = 5; i <= 30; i++) {

        const index = Number(i)

        console.info('5..30 by 0.16: ', index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.16'),
        })
        await tx4.wait()
      }

      // Когда отправишь 0.16 у id5 должно быть 0.30

      // Нужно отправить с id5 до id30 по 10500 bnb
      for (let i = 5; i <= 30; i++) {

        const index = Number(i)

        console.info('5..30 by 10500: ', index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('10500'),
        })
        await tx4.wait()
      }

      return users
    }
  })

  it('testing up to 5', async () => {

    // let wallets = await getWallets()

    // TODO: get info before tx
    // const userCoreBefore = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[5].address);
    // console.log('Before:', userCoreBefore)

    await runRegistrations(37) // 31 regs -> 36 real

    // TODO: get info after tx
    // const userCoreAfter = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[5].address);
    // console.log('After:', userCoreAfter)
  }).timeout(999999)

  /**
   * ТЕСТ:
   * id1 регистрируешь под id0,
   * id2 регистрируешь под id1,
   * id3 регистрируешь под id2,
   * id4 регистрируешь под id3
   *
   * id5 регистрируешь под id4 за 0.01,
   *
   * id6 регистрируешь под id5 за 0.01
   *
   * Потом id5 и id6 отправляешь ещё по 0.02
   *
   * Потом c id7 по id30 отправляешь на контракт по 0.03 bnb
   *
   * После этого id5 от id6 должно прийти 0.01 gift и рефоводные 0.02 на Claim
   */

  /**
   * Надо отправлять с id5 до id30 еще по 0.04 bnb,
   * Потом 0.08 bnb,
   * Потом 0.16 bnb
   */

})


describe('5..62 by 0.03', async () => {
  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async () => {
      let wallets = await getWallets()
      let users = []

      const TO = 126

      for (let i = 5; i <= TO; i++) {

        const index = Number(i)

        console.info(`5..${TO} by 0.03: `, index)
        console.info('wallet: ', wallets[index].address)

        const tx4 = await wallets[index].sendTransaction({
          to: p.CoreToken.address,
          value: ethers.utils.parseEther('0.03'),
        })

        await tx4.wait()
      }

      return users
    }
  })

  it('5..X by 0.03', async () => {

    let wallets = await getWallets()

    // TODO: get info before tx
    console.info(wallets[6].address)
    const userCoreBefore = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[6].address);
    console.log('Before:', userCoreBefore)

    // todo -- id6 must be a 0 balance, find out where come 0.03 to id6
    //  getCoreUser(): claims: 0.03 BNB
    await runRegistrations()

    // TODO: get info after tx
    console.info(wallets[6].address)
    const userCoreAfter = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[6].address);
    console.log('After:', userCoreAfter)
  }).timeout(999999)

  /**
   * ТЕСТ 2:
   * Отправить на контракт с id5 по id62 по 0.03 tbnb без рефералов
   * Скрин id6 отправь, должно быть на Claim 0.03
   *
   * а потом надо будет с id63 до id280 закинуть по 0.03bnb
   * и у id6 должно упасть на Claim 0.11
   * Потом произойти автопереход id6 на матрицу3. Итого 0.11-0,04=0.07 claim
   *
   * id1 должен получить на Claim:
   * С матриц:
   * id46 - 0,02,
   * id94 - 0.01+0,02
   * id190 - 0.01+0.02
   * С реферала:
   * id14 - 0.02+0.03
   *
   * С матриц:
   * id22 - 0,02,
   * id46 - 0.01+0,02
   * id94 - 0.01+0.02
   * С реферала:
   * id14 - 0.02+0.03
   */

})

describe('5..62 by 0.03', async () => {
  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async () => {
      let wallets = await getWallets()
      let users = []

      for (let i = 5; i <= 31; i++) {

        const index = Number(i)

        console.info(`5..30 by 0.07: `, index)
        console.info('wallet: ', wallets[index].address)

        // todo -- !!! id5 регистрируешь под id4 за 0.01,
        if (index === 5) {
          const tx1 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id5
              .register('0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', { // todo <-- set wallet id4
                value: ethers.utils.parseEther('0.01'),
              })
          await tx1.wait()
        }

        // todo -- !!! id6 регистрируешь под id5 за 0.01
        else if (index === 6) {
          const tx2 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id6
              .register(wallets[index - 1].address, { // todo <-- set wallet id5
                value: ethers.utils.parseEther('0.01'),
              })
          await tx2.wait()

          // todo -- !!! Потом c id6 отправляешь ещё 0.06 (с id5 ничего отправлять не нужно)
          const tx3 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.06'),
          })
          await tx3.wait()
        }

        // todo -- !!! Потом c id7 по id31 отправляешь на контракт по 0.07 bnb
        else if (index >= 7 && index <= 31) {
          const tx4 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.07'),
          })
          await tx4.wait()
        }
      }

      return users
    }
  })

  it('7..31 custom (last test)', async () => {

    let wallets = await getWallets()

    // TODO: get info before tx
    console.info(wallets[6].address)
    const userCoreBefore = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[6].address);
    console.log('Before:', userCoreBefore)

    // todo -- id6 must be a 0 balance, find out where come 0.03 to id6
    //  getCoreUser(): claims: 0.03 BNB
    await runRegistrations()

    // TODO: get info after tx
    console.info(wallets[6].address)
    const userCoreAfter = await p.CoreToken.connect(wallets[31].address).getUserFromCore(wallets[6].address);
    console.log('After:', userCoreAfter)
  }).timeout(999999)

  /**
   * + id5 регистрируешь под id4 за 0.01,
   * + id6 регистрируешь под id5 за 0.01
   * + Потом c id6 отправляешь ещё 0.06 (с id5 ничего отправлять не нужно)
   * ~ Потом c id7 по id31 отправляешь на контракт по 0.07 bnb
   * -------------------------------------------------------
   * После этого id5 должен перейти на матрицу 3, иметь 0.01 gift и 0 на Claim
   */

})


describe('id7-id30 by 0.07', async () => {
  let p, runRegistrations
  before(async () => {
    p = await prepare()
    runRegistrations = async () => {
      let wallets = await getWallets()
      let users = []

      for (let i = 5; i <= 30; i++) {

        const index = Number(i)

        console.info(`5..31 by 0.07: `, index)
        console.info('wallet: ', wallets[index].address)

        // todo -- id5 регистрируешь под id4 за 0.01,
        if (index === 5) {
          const tx1 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id5
              .register('0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f', { // todo <-- set wallet id4
                value: ethers.utils.parseEther('0.01'),
              })
          await tx1.wait()

          // todo -- Потом с id5 отправляешь ещё 0.02,
          const tx3 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.02'),
          })
          await tx3.wait()
        }
        else if (index === 6) {
          // todo -- id6 регистрируешь под id5 за 0.01,
          const tx2 = await p.CoreToken
              .connect(wallets[index]) // todo <-- id6
              .register(wallets[index - 1].address, { // todo <-- set wallet id5
                value: ethers.utils.parseEther('0.01'),
              })
          await tx2.wait()

          // todo -- Потом с id6 отправляешь ещё 0.06
          const tx3 = await wallets[index].sendTransaction({
            to: p.CoreToken.address,
            value: ethers.utils.parseEther('0.06'),
          })
          await tx3.wait()
        }

        // todo -- Потом с id7 по id30 отправляешь на контракт по 0.07 bnb
        // else if (index >= 7 && index <= 29) {
        else if (index >= 7 && index <= 30) {
          let tx4
          if (index === 30) {
            tx4 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.0712'),
            })
          } else {
            tx4 = await wallets[index].sendTransaction({
              to: p.CoreToken.address,
              value: ethers.utils.parseEther('0.07'),
            })
          }
          await tx4.wait()
        }
      }

      return users
    }
  })

  it('id7-id30 by 0.07', async () => {

    // 5320 -> 5750 wrapper bef/aft
    let wallets = await getWallets()

    // TODO: get info before tx
    console.info('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65')
    const user0Before = await p.CoreToken.connect('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65').getUserFromCore('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65');
    console.log('Before:', user0Before)

    // todo -- id6 must be a 0 balance, find out where come 0.03 to id6
    //  getCoreUser(): claims: 0.03 BNB
    await runRegistrations()

    // TODO: get info after tx
    // console.info(wallets[4].address)
    const user0After = await p.CoreToken.connect('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65').getUserFromCore('0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65');
    console.log('After:', user0After)
  }).timeout(999999)

  /**
   * ТЕСТ4:
   * + регистрируешь id0-id4 друг под друга,
   * + id5 регистрируешь под id4 за 0.01,
   * + Потом с id5 отправляешь ещё 0.02,
   * + id6 регистрируешь под id5 за 0.01,
   * + Потом с id6 отправляешь ещё 0.06
   * + Потом с id7 по id30 отправляешь на контракт по 0.07 bnb
   *
   * Надо будет провести тебе тест 4 и посмотреть откуда приходят id0 лишние bnb от рефоводов:
   * Должно только прийти по 0.06 от id6 и id10.
   * Итого 0.12 bnb должно быть, а сейчас на сайте показывает, что у id0 от рефералов пришло 0,25
   *
   * Когда от id29 отправляешь ещё всё правильно показывает, а когда от id30 отправил, откуда-то id0 прилетело лишние от рефералов 0,04 bnb
   *
   * Если подробно, то начисления на Claim id0 должны быть такие:
   * С матриц :
   * id14 - 0.06
   * id30 - 0.07
   * С рефералов:
   * id6 - 0.06
   * id10 - 0.06
   */

})
