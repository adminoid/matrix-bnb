// Based on:
// https://stackoverflow.com/questions/72078251/ethereum-insufficient-funds-for-intrinsic-transaction-cost

const { ethers } = require('hardhat')

exports.getGasInfo = async (Token) => {
  // const gasPrice = await Token.signer.getGasPrice();
  const gasPrice = 339_477_658;
  console.log(`Current gas price: ${gasPrice}`);
  const estimatedGas = await Token.signer.estimateGas(
    Token.getDeployTransaction([
    '0x5ff808633f2c5a3349adf89be7f71a2f2fede06f',
    '0x644436697d5d2e4d1e96bfa567f645e0df74a246',
    '0xa923e2c9cb21aec25ce204f4eeee62b6c8e77843',
    '0x3ae7780e7b7f7dfe86bc6ca8a308be9cbf9d1ff6',
    '0x98ea12a51536a771e1DaFe965F88a653F7B33b4F',
    ]),
  );
  console.log(`Estimated gas: ${estimatedGas}`);
  // const deploymentPrice = gasPrice.mul(estimatedGas);
  const deploymentPrice = 3_000_000_000;
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