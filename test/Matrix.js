const { expect } = require("chai")
const { ethers, waffle, web3 } = require('hardhat')
const { deployContract } = waffle

// contracts
const Matrix = require('../artifacts/contracts/Matrix.sol/Matrix.json')

const prepare = async () => {
  const [
    matrixWallet,
    userWallet,
    userWalletEmpty,
  ] = await ethers.getSigners()

  const tokenMatrix = await deployContract(matrixWallet, Matrix)

  console.log('userWallet: ', userWallet.address)
  console.log('matrixWallet: ', matrixWallet.address)

  const wei = web3.utils.toWei('0.03', 'ether')
  // console.log(wei)

  // update user balance in BNB
  // top up bnb to user wallet
  await waffle.provider.send("hardhat_setBalance", [
    userWallet.address,
    web3.utils.toHex(wei),
  ])

  return {
    matrixWallet,
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
      matrixWallet,
      tokenMatrix,
      userWallet,
      userWalletEmpty,
    } = await prepare()

    // const balance = await waffle.provider.getBalance(userWallet.address);
    // console.log(balance)
    // console.log(ethers.utils.formatEther(balance)) // divide to 10**18

    console.warn(tokenMatrix.address)

    const transactionHash = await userWallet.sendTransaction({
      to: tokenMatrix.address,
      value: ethers.utils.parseEther("0.02"),
    });

    console.info(transactionHash)

    expect(true).equal(true)

  })//.timeout(50000)
})
