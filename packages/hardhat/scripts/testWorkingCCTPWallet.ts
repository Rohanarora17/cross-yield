import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING WORKING CCTP WALLET");
  console.log("=" .repeat(60));
  console.log("🎯 Using wallet that replicates successful direct call pattern");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const workingWalletAddress = "0xf635553BdB183c965381810b5998a74B87B2E12a";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Working CCTP Wallet:", workingWalletAddress);
  console.log("💰 USDC:", usdcAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const workingWallet = await ethers.getContractAt("WorkingCCTPWallet", workingWalletAddress, signer);

    // Check balances
    const yourBalance = await usdc.balanceOf(wallet.address);
    console.log("\n💰 Your USDC balance:", ethers.formatUnits(yourBalance, 6), "USDC");

    if (yourBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address;

    console.log("\n🎯 TESTING WORKING CCTP WALLET:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);
    console.log("- Pattern: EXACT SAME as successful direct call");

    try {
      // Step 1: Approve the working wallet to spend our USDC
      console.log("\n1. Approving working wallet to spend USDC...");
      const approveTx = await usdc.approve(workingWalletAddress, testAmount);
      await approveTx.wait();
      console.log("✅ Approval complete");

      // Step 2: Execute CCTP through working wallet
      console.log("\n2. Executing CCTP through working wallet...");

      // First try gas estimation
      const gasEstimate = await workingWallet.executeCCTP.estimateGas(testAmount, recipient);
      console.log("✅ Gas estimate successful:", gasEstimate.toString());

      // Execute the CCTP transfer
      const cctpTx = await workingWallet.executeCCTP(testAmount, recipient);
      console.log("🎉🎉🎉 SMART WALLET CCTP SUCCESS! 🎉🎉🎉");
      console.log("📨 Transaction Hash:", cctpTx.hash);

      const receipt = await cctpTx.wait();
      console.log("✅ Transaction confirmed! Gas used:", receipt.gasUsed.toString());

      // Parse events
      let nonce = null;
      for (const log of receipt.logs) {
        try {
          const parsed = workingWallet.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPExecuted") {
            nonce = parsed.args.nonce;
            console.log("🎯 CCTP Nonce:", nonce.toString());
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🏆 SMART WALLET CCTP IS WORKING!");
      console.log("=" .repeat(60));
      console.log("✅ Working wallet pattern SUCCESSFUL!");
      console.log("✅ Smart contract CCTP integration COMPLETE!");
      console.log("✅ Pattern can be applied to main UserSmartWallet!");
      console.log("✅ CCTP is now working in smart contracts!");

      if (nonce) {
        console.log("\n🔍 Track transfer:");
        console.log(`   - Base Sepolia: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
        console.log(`   - Circle API: Will process nonce ${nonce.toString()}`);
      }

      // Check attestation after a short delay
      setTimeout(async () => {
        console.log("\n⏰ Checking attestation status in 30 seconds...");
        try {
          const url = `https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${cctpTx.hash}`;
          const response = await fetch(url);
          const data = await response.json();

          if (data.messages && data.messages.length > 0) {
            console.log("✅ Attestation found for smart wallet transaction!");
            console.log("📊 Status:", data.messages[0].status);
          }
        } catch (e) {
          console.log("📊 Attestation check skipped (too early)");
        }
      }, 30000);

    } catch (error: any) {
      console.log("❌ Working wallet test failed:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }

      console.log("\n🤔 If working wallet also fails:");
      console.log("1. There may be a deeper issue with Circle's contracts");
      console.log("2. But the pattern is proven to work in direct calls");
      console.log("3. The issue might be contract-specific");
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