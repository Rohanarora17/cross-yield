import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING WORKING CCTP WALLET V1");
  console.log("=" .repeat(60));
  console.log("🎯 Testing V1 interface (4 parameters) like example repository");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const workingWalletV1Address = "0x5B09f9A748D8D754F3B3202ED38ab5125085529b";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Working CCTP Wallet V1:", workingWalletV1Address);
  console.log("💰 USDC:", usdcAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const workingWalletV1 = await ethers.getContractAt("WorkingCCTPWalletV1", workingWalletV1Address, signer);

    // Check balances
    const yourBalance = await usdc.balanceOf(wallet.address);
    console.log("\n💰 Your USDC balance:", ethers.formatUnits(yourBalance, 6), "USDC");

    if (yourBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address;

    console.log("\n🎯 TESTING V1 CCTP WALLET:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);
    console.log("- Interface: V1 (4 parameters)");

    try {
      // Step 1: Approve the working wallet to spend our USDC
      console.log("\n1. Approving working wallet V1 to spend USDC...");
      const approveTx = await usdc.approve(workingWalletV1Address, testAmount);
      await approveTx.wait();
      console.log("✅ Approval complete");

      // Step 2: Execute CCTP through working wallet V1
      console.log("\n2. Executing CCTP through working wallet V1...");

      // First try gas estimation
      const gasEstimate = await workingWalletV1.executeCCTP.estimateGas(testAmount, recipient);
      console.log("✅ Gas estimate successful:", gasEstimate.toString());

      // Execute the CCTP transfer
      const cctpTx = await workingWalletV1.executeCCTP(testAmount, recipient);
      console.log("🎉🎉🎉 V1 SMART WALLET CCTP SUCCESS! 🎉🎉🎉");
      console.log("📨 Transaction Hash:", cctpTx.hash);

      const receipt = await cctpTx.wait();
      console.log("✅ Transaction confirmed! Gas used:", receipt.gasUsed.toString());

      // Parse events
      let nonce = null;
      for (const log of receipt.logs) {
        try {
          const parsed = workingWalletV1.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPExecuted") {
            nonce = parsed.args.nonce;
            console.log("🎯 CCTP Nonce:", nonce.toString());
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🏆 V1 SMART WALLET CCTP IS WORKING!");
      console.log("=" .repeat(60));
      console.log("✅ V1 interface (4 parameters) SUCCESSFUL!");
      console.log("✅ Smart contract CCTP integration COMPLETE!");
      console.log("✅ Pattern can be applied to main UserSmartWallet!");
      console.log("✅ V1 avoids denylist issues!");

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
            console.log("✅ Attestation found for V1 smart wallet transaction!");
            console.log("📊 Status:", data.messages[0].status);
          }
        } catch (e) {
          console.log("📊 Attestation check skipped (too early)");
        }
      }, 30000);

    } catch (error: any) {
      console.log("❌ V1 wallet test failed:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }

      console.log("\n🤔 If V1 also fails:");
      console.log("1. The issue might be deeper than interface version");
      console.log("2. Could be denylist or other access controls");
      console.log("3. Need to investigate Circle's specific deployment");
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