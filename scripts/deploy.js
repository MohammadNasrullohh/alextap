const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with account:");
  console.log("Deployer address:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const AlexCoin = await ethers.getContractFactory("AlexCoin");
  const alexCoin = await AlexCoin.deploy();
  await alexCoin.waitForDeployment();

  const alexCoinAddress = await alexCoin.getAddress();
  console.log("✅ AlexCoin deployed at:", alexCoinAddress);

  const Airdrop = await ethers.getContractFactory("Airdrop");
  const airdrop = await Airdrop.deploy(alexCoinAddress);
  await airdrop.waitForDeployment();

  const airdropAddress = await airdrop.getAddress();
  console.log("✅ Airdrop deployed at :", airdropAddress);

  console.log("\n🎉 DEPLOYMENT SUCCESS 🎉");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
