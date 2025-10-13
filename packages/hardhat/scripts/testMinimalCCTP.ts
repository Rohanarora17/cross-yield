import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING MINIMAL CCTP CONTRACT");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

    const minimalCCTPAddress = "0x75F439eaae156404227b0a113DD66FD433341B9e";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🧪 Minimal CCTP Test:", minimalCCTPAddress);
  console.log("💰 USDC:", usdcAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const testContract = await ethers.getContractAt("MinimalCCTPTest", minimalCCTPAddress, signer);

    // Check balances
    const yourBalance = await usdc.balanceOf(wallet.address);
    console.log("\n💰 Your USDC balance:", ethers.formatUnits(yourBalance, 6), "USDC");

    if (yourBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address;

    console.log("\n🧪 TESTING MINIMAL CCTP V2 (based on Circle's official V2 examples):");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);

    try {
      // Step 1: Approve the test contract to spend our USDC
      console.log("\n1. Approving test contract to spend USDC...");
      const approveTx = await usdc.approve(minimalCCTPAddress, testAmount);
      await approveTx.wait();
      console.log("✅ Approval complete");

      // Step 2: Test CCTP call (this follows Circle's exact pattern)
      console.log("\n2. Testing CCTP with minimal contract...");

      // First try gas estimation
      const gasEstimate = await testContract.testCCTP.estimateGas(testAmount, recipient);
      console.log("✅ Gas estimate successful:", gasEstimate.toString());

      // Execute the CCTP test
      const cctpTx = await testContract.testCCTP(testAmount, recipient);
      console.log("🎉 CCTP TEST SUCCESS! Tx:", cctpTx.hash);

      const receipt = await cctpTx.wait();
      console.log("✅ Confirmed! Gas used:", receipt.gasUsed.toString());

      // Parse events
      let nonce = null;
      for (const log of receipt.logs) {
        try {
          const parsed = testContract.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPTest") {
            nonce = parsed.args.nonce;
            console.log("🎯 CCTP Nonce:", nonce.toString());
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🏆 MINIMAL CCTP WORKING!");
      console.log("=" .repeat(60));
      console.log("✅ Circle's official pattern WORKS!");
      console.log("✅ Standard approve() + depositForBurn SUCCESS");
      console.log("✅ The approval mechanism is NOT the issue");
      console.log("✅ Issue must be in our complex smart wallet logic");

      if (nonce) {
        console.log("\n🔍 Track transfer:");
        console.log(`   - Base Sepolia: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
        console.log(`   - CCTP Nonce: ${nonce.toString()}`);
      }

    } catch (error: any) {
      console.log("❌ Minimal CCTP test failed:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }

      console.log("\n🤔 If even minimal contract fails:");
      console.log("1. Circle's testnet infrastructure issue");
      console.log("2. USDC contract version incompatibility");
      console.log("3. Network or RPC issue");
      console.log("4. But pattern is correct based on Circle's docs");
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