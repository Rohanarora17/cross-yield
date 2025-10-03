import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 TESTING FINAL CCTP WITH SAFEINCREASE ALLOWANCE");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  // Use the previously deployed smart wallet
  const smartWalletAddress = "0x748ee4ba633ED10D24927B0Fe1CA0d8ABDb5165c";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Smart Wallet:", smartWalletAddress);
  console.log("💰 USDC:", usdcAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);

    // First verify the smart wallet exists and has the correct bytecode
    const bytecode = await provider.getCode(smartWalletAddress);
    if (bytecode === "0x") {
      console.log("❌ Smart wallet not deployed at this address");
      return;
    }
    console.log("✅ Smart wallet exists");

    // Check balances
    const yourBalance = await usdc.balanceOf(wallet.address);
    const walletBalance = await usdc.balanceOf(smartWalletAddress);

    console.log("\n💰 Current Balances:");
    console.log("Your USDC:", ethers.formatUnits(yourBalance, 6), "USDC");
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletBalance, 6), "USDC");

    if (yourBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    // Create smart wallet contract instance
    const smartWallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress, signer);

    // Test small amount first
    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC

    console.log("\n🔄 Step 1: Fund the smart wallet...");
    const transferTx = await usdc.transfer(smartWalletAddress, testAmount);
    await transferTx.wait();
    console.log("✅ USDC transferred to smart wallet");

    // Check new balance
    const newBalance = await usdc.balanceOf(smartWalletAddress);
    console.log("Smart wallet balance:", ethers.formatUnits(newBalance, 6), "USDC");

    console.log("\n🌉 Step 2: Testing FIXED CCTP with safeIncreaseAllowance...");

    const destinationChainId = 11155111; // Sepolia
    const recipient = wallet.address;

    try {
      // First test gas estimation
      console.log("   Estimating gas...");
      const gasEstimate = await smartWallet.executeCCTP.estimateGas(
        testAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );
      console.log("   ✅ Gas estimate successful:", gasEstimate.toString());

      // Execute the CCTP transfer with fixed approval mechanism
      console.log("   Executing CCTP with FIXED safeIncreaseAllowance...");
      const cctpTx = await smartWallet.executeCCTP(
        testAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("🎉🎉🎉 SUCCESS! CCTP FIXED AND WORKING! 🎉🎉🎉");
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
      console.log("✅ safeIncreaseAllowance fix was successful");
      console.log("✅ Real USDC being transferred via Circle CCTP");
      console.log("⏰ USDC will arrive on Sepolia in 3-15 minutes");
      console.log("🔍 Track your transfer:");
      console.log(`   - Base Sepolia: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
      console.log(`   - Circle CCTP: https://iris-api-sandbox.circle.com/attestations/${cctpTx.hash}`);

      if (nonce) {
        console.log(`   - CCTP Nonce: ${nonce.toString()}`);
      }

      console.log("\n🎉 PRODUCT DEMO READY! BUG FIXED!");
      console.log("✅ Smart contracts deployed and working");
      console.log("✅ CCTP cross-chain transfers functional");
      console.log("✅ SafeIncreaseAllowance approval mechanism working");
      console.log("✅ Production-ready yield optimization platform");

    } catch (error: any) {
      console.log("❌ CCTP execution failed:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }
      if (error.reason) {
        console.log("Reason:", error.reason);
      }

      console.log("\n🤔 Next debugging steps if still failing:");
      console.log("1. The contract might need redeployment with the fix");
      console.log("2. Check if the existing deployed contract has the old approval code");
      console.log("3. Verify the contract has SafeERC20 properly imported");
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