async function main() {
  // We get the contract to deploy
  const Token = await ethers.getContractFactory("Token");
  const token = await Token.deploy("Hello, Hardhat!");

  console.log("Greeter deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
