// Based on:
// https://stackoverflow.com/questions/72078251/ethereum-insufficient-funds-for-intrinsic-transaction-cost

const { ethers } = require('hardhat')

exports.getGasInfo = async (Token) => {
  // const gasPrice = await Token.signer.getGasPrice();
  const gasPrice = 339_477_658;
  console.log(`Current gas price: ${gasPrice}`);
  const estimatedGas = await Token.signer.estimateGas(
    Token.getDeployTransaction([
      '0xC8Ed245e8014bcB2416B69440c34c492acd24Ff3',
      '0x1b20c0CFf884c91F6429f25ceD5a72aE63A9B65a',
      '0x597205b3EC3B95Cc77BEfd22cf190bD6DD8e8A69',
      '0xD9a7Ec49E4EC186C093e630240c87b970a413A00',
      '0xCEe63383AeF505A1D3e1B240F02252D3559f39eC',
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