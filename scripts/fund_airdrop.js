const { ethers } = require("hardhat");

async function main() {
  const alexAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const airdropAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";

  const AlexCoin = await ethers.getContractAt("AlexCoin", alexAddress);
  
  // Kirim 500,000 ALEX ke kontrak Airdrop
  const amount = ethers.parseUnits("500000", 18);
  
  console.log("Mengirim token ke kontrak Airdrop...");
  const tx = await AlexCoin.transfer(airdropAddress, amount);
  await tx.wait();

  console.log("Berhasil! Kontrak Airdrop sekarang punya saldo ALEX.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});