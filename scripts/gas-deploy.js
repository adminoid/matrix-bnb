// Based on:
// https://stackoverflow.com/questions/72078251/ethereum-insufficient-funds-for-intrinsic-transaction-cost

const { ethers } = require('hardhat')

exports.getGasInfo = async (Token) => {
  const gasPrice = await Token.signer.getGasPrice();
  console.log(`Current gas price: ${gasPrice}`);
  const estimatedGas = await Token.signer.estimateGas(
    Token.getDeployTransaction([
      '0x3019145a5c3B3e1871e4Ac12A5f21b6A1b0968AD',
      '0x985D1eeb73aF5dc0191789d7055Dd919066BeaEc',
      '0xD17AFF79e2C4214f7e27e3CF3827f2E4Dc297D17',
      '0x4580dB10cE8F1b6e5e424D2C5C04fCD5F74A325A',
      '0x03F08bc6054C21Deb4828D196086Dc4b3fb64A22',
      '0x66057282C4eD1102410DD90A670206DCDa9001F2',
    ]),
  );
  console.log(`Estimated gas: ${estimatedGas}`);
  const deploymentPrice = gasPrice.mul(estimatedGas);
  const deployerBalance = await Token.signer.getBalance();
  console.log(`Deployer balance:  ${ethers.utils.formatEther(deployerBalance)}`);
  console.log(`Deployment price:  ${ethers.utils.formatEther(deploymentPrice)}`);
  if (deployerBalance.lt(deploymentPrice)) {
    throw new Error(
      `Insufficient funds. Top up your account balance by ${ethers.utils.formatEther(
        deploymentPrice.sub(deployerBalance),
      )}`,
    );
  }
}