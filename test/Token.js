const { expect } = require("chai");
const ethers = require('hardhat').ethers;

describe("Token contract", function (done) {
  // this.timeout(60000)

  it("Deployment should assign the total supply of tokens to the owner", async function () {
    const [owner] = await ethers.getSigners();

    const Token = await ethers.getContractFactory("Token");

    const hardhatToken = await Token.deploy('Unit test');

    console.log(await hardhatToken.deployMessage())

    const ownerBalance = await hardhatToken.balanceOf(owner.address);
    expect(await hardhatToken.totalSupply()).to.equal(ownerBalance);
  }).timeout(60000);
});
