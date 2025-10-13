import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 DEEP DEBUG NEW FIXED CCTP SMART WALLET");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  // NEW FIXED SMART WALLET WITH safeIncreaseAllowance (no access control)
  const fixedSmartWalletAddress = "0xe0ec92f9Cd31e8D45179471c8DFdF47bf2cC23b2";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 FIXED Smart Wallet:", fixedSmartWalletAddress);
  console.log("💰 USDC:", usdcAddress);
  console.log("📨 TokenMessenger:", tokenMessengerAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const smartWallet = await ethers.getContractAt("UserSmartWallet", fixedSmartWalletAddress, signer);

    // Check balances
    const walletBalance = await usdc.balanceOf(fixedSmartWalletAddress);
    console.log("\nFixed Smart Wallet USDC:", ethers.formatUnits(walletBalance, 6), "USDC");

    if (walletBalance === 0n) {
      console.log("❌ Smart wallet has no USDC");
      return;
    }

    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const destinationChainId = 11155111; // Sepolia
    const recipient = wallet.address;

    console.log("\n🔍 DEBUGGING CCTP EXECUTION:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Destination Chain ID:", destinationChainId);
    console.log("- Recipient:", recipient);

    // Check current allowance
    const currentAllowance = await usdc.allowance(fixedSmartWalletAddress, tokenMessengerAddress);
    console.log("- Current Allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

    // Check if amount is sufficient
    if (walletBalance < testAmount) {
      console.log("❌ Insufficient balance");
      return;
    }

    console.log("\n🧪 STEP-BY-STEP DEBUG:");

    try {
      // Step 1: Try static call to see exact error
      console.log("1. Testing static call to executeCCTP...");

      const result = await smartWallet.executeCCTP.staticCall(
        testAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("✅ Static call successful! Would return nonce:", result.toString());

      // If static call works, try actual execution
      console.log("\n2. Static call worked! Trying actual execution...");

      const cctpTx = await smartWallet.executeCCTP(
        testAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("🎉🎉🎉 SUCCESS! CCTP WORKING! 🎉🎉🎉");
      console.log("📨 Transaction Hash:", cctpTx.hash);

      const receipt = await cctpTx.wait();
      console.log("🎉 CONFIRMED! Gas used:", receipt.gasUsed.toString());

      console.log("\n🏆 CCTP INTEGRATION COMPLETE AND WORKING!");
      console.log("✅ safeIncreaseAllowance fix SUCCESS!");
      console.log("✅ Circle CCTP working through smart contracts!");

    } catch (error: any) {
      console.log("❌ executeCCTP failed:");
      console.log("Message:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }

      console.log("\n🔍 DETAILED ERROR ANALYSIS:");

      // Check ownership and access control
      try {
        const owner = await smartWallet.owner();
        console.log("Smart wallet owner:", owner);
        console.log("Your address:", wallet.address);
        console.log("Are you owner?", owner.toLowerCase() === wallet.address.toLowerCase());
      } catch (e) {
        console.log("Could not check ownership");
      }

      // Check if wallet is active
      try {
        const isActive = await smartWallet.isActive();
        console.log("Smart wallet active?", isActive);
      } catch (e) {
        console.log("Could not check active status");
      }

      // Check CCTP domain mapping
      try {
        const domain = await smartWallet.cctpDomains(destinationChainId);
        console.log("CCTP domain for Sepolia:", domain);
      } catch (e) {
        console.log("Could not check CCTP domain");
      }

      // Check token messenger address
      try {
        const tokenMessengerAddr = await smartWallet.tokenMessengerAddresses(84532); // Base Sepolia
        console.log("TokenMessenger address:", tokenMessengerAddr);
      } catch (e) {
        console.log("Could not check TokenMessenger address");
      }

      console.log("\n🤔 POSSIBLE CAUSES:");
      console.log("1. Access control issue (not owner/backend)");
      console.log("2. Smart wallet not active");
      console.log("3. CCTP domain mapping issue");
      console.log("4. TokenMessenger address not configured");
      console.log("5. SafeERC20 import issue in the contract");
      console.log("6. Circle's testnet having issues");
    }

  } catch (error: any) {
    console.error("❌ Setup failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });