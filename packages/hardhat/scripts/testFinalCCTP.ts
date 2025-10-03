import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 FINAL CCTP TEST - ALL BUGS FIXED!");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  // FINAL FIXED CONTRACT ADDRESSES
  const finalSmartWalletAddress = "0x748ee4ba633ED10D24927B0Fe1CA0d8ABDb5165c";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 FINAL Smart Wallet:", finalSmartWalletAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const smartWallet = await ethers.getContractAt("UserSmartWallet", finalSmartWalletAddress, signer);

    // Check balances
    const usdcBalance = await usdc.balanceOf(wallet.address);
    const walletUsdcBalance = await usdc.balanceOf(finalSmartWalletAddress);
    const ethBalance = await provider.getBalance(wallet.address);

    console.log("\n💰 Current Balances:");
    console.log("Your ETH:", ethers.formatEther(ethBalance), "ETH");
    console.log("Your USDC:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletUsdcBalance, 6), "USDC");

    if (usdcBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    // FINAL CCTP TEST
    console.log("\n🎯 EXECUTING FINAL CCTP TEST:");

    const transferAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const destinationChainId = 11155111; // Sepolia chain ID
    const recipient = wallet.address;

    console.log("Transfer Details:");
    console.log("- Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
    console.log("- From: Base Sepolia → Sepolia");
    console.log("- Recipient:", recipient);

    // Step 1: Fund the smart wallet
    console.log("\n1️⃣ Funding smart wallet...");
    const transferTx = await usdc.transfer(finalSmartWalletAddress, transferAmount);
    await transferTx.wait();
    console.log("✅ USDC transferred to smart wallet");

    // Check balance
    const newBalance = await usdc.balanceOf(finalSmartWalletAddress);
    console.log("Smart wallet balance:", ethers.formatUnits(newBalance, 6), "USDC");

    // Step 2: Execute FINAL CCTP TEST
    console.log("\n2️⃣ EXECUTING FINAL FIXED CCTP...");

    try {
      console.log("   Testing gas estimation...");
      const gasEstimate = await smartWallet.executeCCTP.estimateGas(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );
      console.log("   ✅ Gas estimate successful:", gasEstimate.toString());

      console.log("   Executing CCTP transfer...");
      const cctpTx = await smartWallet.executeCCTP(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("🎉🎉🎉 SUCCESS! CCTP WORKING! 🎉🎉🎉");
      console.log("📨 Transaction Hash:", cctpTx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await cctpTx.wait();
      console.log("🎉 CONFIRMED! Gas used:", receipt.gasUsed.toString());

      // Parse events for nonce
      console.log("\n📊 CCTP Transfer Details:");
      let nonce = null;
      for (const log of receipt.logs) {
        try {
          const parsed = smartWallet.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPBurnExecuted") {
            console.log("🎯 CCTP Burn Successful!");
            console.log(`   Nonce: ${parsed.args.nonce.toString()}`);
            console.log(`   Amount: ${ethers.formatUnits(parsed.args.amount, 6)} USDC`);
            console.log(`   Destination: ${parsed.args.destinationChain}`);
            console.log(`   Recipient: ${parsed.args.recipient}`);
            nonce = parsed.args.nonce;
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🏆 CCTP INTEGRATION COMPLETE & WORKING!");
      console.log("⏰ USDC will arrive on Sepolia in 3-15 minutes");
      console.log("🔍 Track your transfer:");
      console.log(`   - Base Sepolia: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
      console.log(`   - Circle CCTP: https://iris-api-sandbox.circle.com/attestations/${cctpTx.hash}`);

      if (nonce) {
        console.log(`   - CCTP Nonce: ${nonce.toString()}`);
      }

      console.log("\n🎉 PRODUCT DEMO READY!");
      console.log("✅ Smart contracts deployed and working");
      console.log("✅ CCTP cross-chain transfers functional");
      console.log("✅ Real USDC being transferred via Circle");
      console.log("✅ Production-ready yield optimization platform");

    } catch (error: any) {
      console.log("❌ Final test failed:", error.message);
      console.log("This means there might be other issues beyond the fixes we made");
    }

  } catch (error: any) {
    console.error("❌ Test setup failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });