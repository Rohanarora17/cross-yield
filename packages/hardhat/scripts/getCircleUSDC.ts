import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🎯 GETTING OFFICIAL CIRCLE TESTNET USDC");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Your Wallet:", wallet.address);

  // Circle's official addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";

  console.log("\n📋 Getting Circle Testnet USDC Instructions:");
  console.log("1. Go to Circle's testnet faucet: https://faucet.circle.com/");
  console.log("2. Select 'Base Sepolia' network");
  console.log("3. Enter your address:", wallet.address);
  console.log("4. Request testnet USDC");
  console.log("5. Wait for confirmation");

  console.log("\n⏳ Waiting for you to get USDC from the faucet...");
  console.log("Press Ctrl+C when done, then run this script again to test");

  // Check current balance
  try {
    const usdc = await ethers.getContractAt(
      ["function balanceOf(address) view returns (uint256)"],
      usdcAddress,
      signer
    );

    const currentBalance = await usdc.balanceOf(wallet.address);
    console.log("\n💰 Current Balance:", ethers.formatUnits(currentBalance, 6), "USDC");

    if (currentBalance > 0) {
      console.log("\n🧪 Testing with your current USDC...");

      // Test Circle's TokenMessenger with current USDC
      const tokenMessenger = await ethers.getContractAt(
        ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"],
        tokenMessengerAddress,
        signer
      );

      const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
      const recipient = wallet.address;
      const mintRecipient = ethers.zeroPadValue(recipient, 32);

      if (currentBalance >= testAmount) {
        console.log("Testing CCTP with 0.1 USDC...");

        try {
          // Step 1: Approve
          console.log("1. Approving USDC...");
          const approveTx = await usdc.approve(tokenMessengerAddress, testAmount);
          await approveTx.wait();
          console.log("✅ Approved");

          // Step 2: Try CCTP
          console.log("2. Testing CCTP to Ethereum Sepolia...");
          const cctpTx = await tokenMessenger.depositForBurn(
            testAmount,
            0, // Ethereum Sepolia domain
            mintRecipient,
            usdcAddress
          );

          console.log("🎉 SUCCESS! CCTP Transaction:", cctpTx.hash);
          const receipt = await cctpTx.wait();
          console.log("🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

          // Parse logs for nonce
          for (const log of receipt.logs) {
            console.log("Event topic:", log.topics[0]);
          }

          console.log("\n🎯 CCTP IS WORKING! The issue was resolved!");

        } catch (error: any) {
          console.log("❌ CCTP still failing:", error.message);

          if (error.data) {
            console.log("Error data:", error.data);
          }

          console.log("\n🤔 Possible remaining issues:");
          console.log("1. Need to get USDC from Circle's official faucet");
          console.log("2. CCTP route might be disabled on Base Sepolia");
          console.log("3. Your address might need registration with Circle");
          console.log("4. Try smaller/larger amounts");
          console.log("5. Try different destination chains (Arbitrum Sepolia)");
        }
      } else {
        console.log("⚠️ Not enough USDC to test (need at least 0.1 USDC)");
      }
    }

    console.log("\n🔍 Alternative Solutions:");
    console.log("1. Try Ethereum Sepolia (primary testnet)");
    console.log("2. Try Arbitrum Sepolia");
    console.log("3. Use mainnet with tiny amounts ($0.01)");
    console.log("4. Mock the CCTP flow for demo purposes");

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n📞 Circle Support:");
  console.log("If CCTP still fails after getting official testnet USDC:");
  console.log("1. Check Circle's status page for testnet issues");
  console.log("2. Contact Circle developer support");
  console.log("3. Join Circle's Discord for testnet support");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });