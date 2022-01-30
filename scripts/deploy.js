const { ethers } = require('hardhat')

async function main() {
  // We get the contract to deploy
  const Token = await ethers.getContractFactory("Matrix")
  const token = await Token.deploy("Matrix deployed")

  console.log("Greeter deployed to: ", token.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
