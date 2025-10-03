import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 Checking Smart Wallet Ownership & Access Control");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    console.log("🚫️ No deployer account found");
    return;
  }

  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Your Wallet:", wallet.address);

  // Smart wallet and factory addresses
  const smartWalletAddress = "0x32ecB7f010Bd3287432B55A443785037682a6C1C";
  const factoryAddress = "0xB95028c291348a9DE81B451083Da562174944910";
  const yieldRouterAddress = "0x0AddD99eAf7597C64cf719a1B11958196E305731";

  try {
    // Check smart wallet ownership
    const smartWallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress, signer);

    console.log("\n🏦 Smart Wallet Analysis:");
    console.log("Smart Wallet Address:", smartWalletAddress);

    const owner = await smartWallet.owner();
    const backendCoordinator = await smartWallet.backendCoordinator();
    const factory = await smartWallet.factory();
    const isActive = await smartWallet.isActive();

    console.log("Owner:", owner);
    console.log("Backend Coordinator:", backendCoordinator);
    console.log("Factory:", factory);
    console.log("Is Active:", isActive);

    console.log("\n🔐 Access Control Check:");
    console.log("Your wallet is owner?", owner.toLowerCase() === wallet.address.toLowerCase());
    console.log("Your wallet is backend?", backendCoordinator.toLowerCase() === wallet.address.toLowerCase());

    // Check YieldRouter roles
    console.log("\n📊 YieldRouter Role Analysis:");
    const yieldRouter = await ethers.getContractAt("YieldRouter", yieldRouterAddress, signer);

    try {
      const adminRole = await yieldRouter.DEFAULT_ADMIN_ROLE();
      const hasAdminRole = await yieldRouter.hasRole(adminRole, wallet.address);
      console.log("Has Admin Role:", hasAdminRole);

      // Try to get backend role
      try {
        const backendRole = await yieldRouter.BACKEND_ROLE();
        const hasBackendRole = await yieldRouter.hasRole(backendRole, wallet.address);
        console.log("Has Backend Role:", hasBackendRole);
      } catch (e) {
        console.log("Backend role check failed:", e.message);
      }
    } catch (e) {
      console.log("Role check failed:", e.message);
    }

    // Check who created this smart wallet
    console.log("\n🏭 Factory Analysis:");
    const factoryContract = await ethers.getContractAt("SmartWalletFactory", factoryAddress, signer);

    // Check if your address has a wallet
    const yourWalletFromFactory = await factoryContract.getWallet(wallet.address);
    console.log("Your wallet from factory:", yourWalletFromFactory);
    console.log("Matches current smart wallet?", yourWalletFromFactory.toLowerCase() === smartWalletAddress.toLowerCase());

    // If they don't match, check who owns the current smart wallet
    if (yourWalletFromFactory.toLowerCase() !== smartWalletAddress.toLowerCase()) {
      console.log("\n⚠️  MISMATCH DETECTED!");
      console.log("The smart wallet we're testing is NOT associated with your address in the factory");

      // Let's see who this smart wallet belongs to
      // We'd need to check events or try different addresses
      console.log("Current smart wallet owner:", owner);
      console.log("This suggests the smart wallet belongs to:", owner);
    }

    console.log("\n💡 SOLUTION ANALYSIS:");

    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("✅ You ARE the owner - CCTP should work!");
      console.log("The issue might be elsewhere (contract bug, gas, etc.)");
    } else if (backendCoordinator.toLowerCase() === wallet.address.toLowerCase()) {
      console.log("✅ You ARE the backend coordinator - CCTP should work!");
    } else {
      console.log("❌ You are NEITHER owner NOR backend coordinator");
      console.log("\nOptions to fix:");
      console.log("1. Create a smart wallet for YOUR address:");
      console.log("   await factory.createWallet(yourAddress)");
      console.log("2. Grant backend role to your address:");
      console.log("   await yieldRouter.grantBackendRole(yourAddress)");
      console.log("3. Call from the actual owner:", owner);
    }

  } catch (error: any) {
    console.error("❌ Analysis failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });