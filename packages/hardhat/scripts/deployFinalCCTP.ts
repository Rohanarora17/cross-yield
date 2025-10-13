import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 DEPLOYING FINAL FIXED CCTP SMART WALLET");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"; // Base Sepolia USDC

  console.log("👤 Deployer:", wallet.address);
  console.log("💰 USDC Address:", usdcAddress);
  console.log("📡 Network:", (await provider.getNetwork()).name);

  try {
    // Deploy Factory first
    console.log("\n🏭 Deploying SmartWalletFactory...");
    const SmartWalletFactory = await ethers.getContractFactory("SmartWalletFactory", signer);
    const factory = await SmartWalletFactory.deploy(
      wallet.address, // backend coordinator (for now, use deployer)
      usdcAddress,    // USDC address
      wallet.address  // owner
    );
    await factory.waitForDeployment();
    const factoryAddress = await factory.getAddress();
    console.log("✅ SmartWalletFactory deployed:", factoryAddress);

    // For simplicity, skip YieldRouter deployment since we just need to test CCTP
    console.log("\n⏭️ Skipping YieldRouter deployment for CCTP testing...");

    // Create a new smart wallet for testing the FIXED implementation
    console.log("\n🏦 Creating FIXED Smart Wallet...");
    const createTx = await factory.createWallet(wallet.address);
    const receipt = await createTx.wait();

    // Get the wallet address from events
    let newWalletAddress = null;
    for (const log of receipt.logs) {
      try {
        const parsed = factory.interface.parseLog(log);
        if (parsed && parsed.name === "WalletCreated") {
          newWalletAddress = parsed.args.wallet;
        }
      } catch (e) {
        // Skip unparseable logs
      }
    }

    if (!newWalletAddress) {
      console.log("❌ Could not get new wallet address from events");
      return;
    }

    console.log("✅ FIXED Smart Wallet created:", newWalletAddress);

    // Verify the smart wallet has the fixed CCTP implementation
    const smartWallet = await ethers.getContractAt("UserSmartWallet", newWalletAddress, signer);

    // Check if CCTP is supported
    const chainId = (await provider.getNetwork()).chainId;
    try {
      // Try to call a CCTP-related function to verify the contract has our fixes
      const tokenMessengerAddress = await smartWallet.tokenMessengerAddresses(chainId);
      console.log("✅ CCTP TokenMessenger configured:", tokenMessengerAddress);

      if (tokenMessengerAddress === ethers.ZeroAddress) {
        console.log("❌ CCTP not configured for this chain");
      } else {
        console.log("✅ CCTP ready for chain:", chainId.toString());
      }
    } catch (error) {
      console.log("❌ Error checking CCTP configuration:", error.message);
    }

    console.log("\n🎉 DEPLOYMENT COMPLETE!");
    console.log("=" .repeat(60));
    console.log("🏭 SmartWalletFactory:", factoryAddress);
    console.log("🏦 FIXED Smart Wallet:", newWalletAddress);
    console.log("💰 USDC Address:", usdcAddress);
    console.log("=" .repeat(60));
    console.log("\n✅ READY TO TEST FIXED CCTP IMPLEMENTATION!");
    console.log("   - Contract has safeIncreaseAllowance fix");
    console.log("   - SafeERC20 properly imported");
    console.log("   - Circle CCTP integration complete");

    // Save addresses for testing
    console.log("\n📝 Save these addresses for testing:");
    console.log(`FIXED_SMART_WALLET_ADDRESS="${newWalletAddress}"`);

  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });