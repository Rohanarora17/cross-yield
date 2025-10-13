import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 CHECKING BACKEND COORDINATOR");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const fixedSmartWalletAddress = "0x55ff232e75D8125b8856CC158775DdaA34b6F19d";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 FIXED Smart Wallet:", fixedSmartWalletAddress);

  try {
    const smartWallet = await ethers.getContractAt("UserSmartWallet", fixedSmartWalletAddress, signer);

    console.log("\n🔍 ACCESS CONTROL CHECK:");

    const owner = await smartWallet.owner();
    console.log("Owner:", owner);

    const backendCoordinator = await smartWallet.backendCoordinator();
    console.log("Backend Coordinator:", backendCoordinator);

    const factory = await smartWallet.factory();
    console.log("Factory:", factory);

    console.log("\n📊 PERMISSION CHECK:");
    console.log("Your address:", wallet.address);
    console.log("Are you owner?", owner.toLowerCase() === wallet.address.toLowerCase());
    console.log("Are you backend coordinator?", backendCoordinator.toLowerCase() === wallet.address.toLowerCase());

    if (owner.toLowerCase() === wallet.address.toLowerCase() || backendCoordinator.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("✅ You have permission to call executeCCTP");
    } else {
      console.log("❌ You do NOT have permission to call executeCCTP");
      console.log("   You need to be either owner or backend coordinator");
    }

    // Let's also check the USDC contract and balance
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);

    console.log("\n💰 USDC CHECKS:");
    const balance = await usdc.balanceOf(fixedSmartWalletAddress);
    console.log("Smart wallet USDC balance:", ethers.formatUnits(balance, 6), "USDC");

    // Check if USDC contract exists and is callable
    try {
      const totalSupply = await usdc.totalSupply();
      console.log("✅ USDC contract is accessible, total supply:", ethers.formatUnits(totalSupply, 6));
    } catch (e) {
      console.log("❌ Cannot access USDC contract");
    }

  } catch (error: any) {
    console.error("❌ Check failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });