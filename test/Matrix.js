const { expect } = require("chai")
const { ethers, waffle, network } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')

const prepare = async () => {
  const [
    deployerMatrix,
    userWallet,
    userWalletEmpty,
  ] = await ethers.getSigners()

  const tokenMatrix = await deployContract(deployerMatrix, Matrix)

  console.log('deployerMatrix: ', deployerMatrix.address)
  console.log('userWallet: ', userWallet.address)

  // update user balance in BNB
  // top up bnb to user wallet
  await waffle.provider.send("hardhat_setBalance", [
    userWallet.address,
    "0x1000000000000",
  ])

  return {
    deployerMatrix,
    tokenMatrix,
    userWallet,
    userWalletEmpty,
  }
}

// async function getBalance(token, account) {
//   return await token.balanceOf(account.address)
// }

describe('Register user by simple bnb transfer', () => {
  it('should user register', async () => {
    const {
      tokenMatrix,
      userWallet,
      userWalletEmpty,
    } = await prepare()

    const balance = await waffle.provider.getBalance(userWallet.address);

    console.log(balance)
    console.log(ethers.utils.formatEther(balance)) // divide to 10**18

    expect(true).equal(true)

  })//.timeout(50000)
})
