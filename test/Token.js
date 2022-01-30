const { expect, use } = require("chai")
const { ethers, waffle } = require('hardhat')
const { deployContract, solidity, provider } = waffle
const MockUSDT = require('../artifacts/contracts/mocks/mockBUSD.sol/MockUSDT.json')

describe("Token contract", _ => {
  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const Token = await ethers.getContractFactory("Token")
    const hardhatToken = await Token.deploy('Unit test')

    expect(await hardhatToken.deployMessage()).to.equal("Unit test")

    const [owner] = await ethers.getSigners()
    const ownerBalance = await hardhatToken.balanceOf(owner.address)

    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance)
  })
})

describe("Token contract with waffle", async _ => {

  it('should debug', async function () {
    // use(solidity)
    const accounts = await ethers.getSigners();
    const wallet = accounts[0]
    const walletTo = accounts[1]
    const tokenUSDT = await deployContract(wallet, MockUSDT)

    // Assigns initial balance
    expect(await tokenUSDT.balanceOf(wallet.address) / 1000000)
      .to.equal(5e+21)

    // Transfer adds amount to destination account
    await tokenUSDT.transfer(walletTo.address, 7)
    expect(await tokenUSDT.balanceOf(walletTo.address)).to.equal(7)

    // Transfer emits event
    await expect(tokenUSDT.transfer(walletTo.address, 7))
      .to.emit(tokenUSDT, 'Transfer')
      .withArgs(wallet.address, walletTo.address, 7)

  })
})
