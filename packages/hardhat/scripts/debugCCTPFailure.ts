import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔧 DEBUGGING CCTP FAILURE");
  console.log("=" .repeat(60));
  console.log("🎯 Getting detailed error information");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const workingWalletV1Address = "0x5B09f9A748D8D754F3B3202ED38ab5125085529b";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Working Wallet V1:", workingWalletV1Address);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const workingWalletV1 = await ethers.getContractAt("WorkingCCTPWalletV1", workingWalletV1Address, signer);

    const testAmount = ethers.parseUnits("0.1", 6);
    const recipient = wallet.address;

    console.log("\n📊 PRE-FLIGHT CHECKS:");

    // Check balances
    const yourBalance = await usdc.balanceOf(wallet.address);
    console.log("💰 Your USDC balance:", ethers.formatUnits(yourBalance, 6), "USDC");

    const contractBalance = await usdc.balanceOf(workingWalletV1Address);
    console.log("💰 Contract USDC balance:", ethers.formatUnits(contractBalance, 6), "USDC");

    // Check allowances
    const yourAllowance = await usdc.allowance(wallet.address, workingWalletV1Address);
    console.log("💳 Your allowance to contract:", ethers.formatUnits(yourAllowance, 6), "USDC");

    const contractAllowance = await usdc.allowance(workingWalletV1Address, tokenMessengerAddress);
    console.log("💳 Contract allowance to TokenMessenger:", ethers.formatUnits(contractAllowance, 6), "USDC");

    if (yourAllowance < testAmount) {
      console.log("\n📋 APPROVING CONTRACT...");
      const approveTx = await usdc.approve(workingWalletV1Address, testAmount);
      await approveTx.wait();
      console.log("✅ Approval complete");
    }

    console.log("\n🔧 DETAILED ERROR ANALYSIS:");

    try {
      // Try to call with detailed error
      const result = await workingWalletV1.executeCCTP.staticCall(testAmount, recipient);
      console.log("✅ Static call succeeded! Nonce would be:", result.toString());
      console.log("🤔 This means the call should work... trying actual execution");

      const tx = await workingWalletV1.executeCCTP(testAmount, recipient);
      console.log("🎉 EXECUTION SUCCEEDED!", tx.hash);

    } catch (error: any) {
      console.log("❌ Execution failed with error:", error.message);

      if (error.data) {
        console.log("📊 Error data:", error.data);
      }

      // Try to decode the error
      if (error.reason) {
        console.log("📊 Decoded reason:", error.reason);
      }

      // Try manual step-by-step execution
      console.log("\n🔧 TRYING MANUAL STEPS:");

      try {
        console.log("1. Testing transferFrom...");
        const transferTx = await usdc.transferFrom(wallet.address, workingWalletV1Address, testAmount);
        await transferTx.wait();
        console.log("✅ transferFrom succeeded");

        console.log("2. Testing approve...");
        const workingWalletV1WithSigner = workingWalletV1.connect(signer);
        // This won't work directly as we can't sign for the contract, but let's see the error

      } catch (stepError: any) {
        console.log("❌ Manual step failed:", stepError.message);
      }

      // Try to call TokenMessenger directly from wallet
      console.log("\n🔧 TESTING DIRECT TOKENMESSENGER CALL:");
      try {
        const tokenMessengerInterface = [
          "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"
        ];
        const tokenMessenger = new ethers.Contract(tokenMessengerAddress, tokenMessengerInterface, signer);

        // First approve
        const directApproveTx = await usdc.approve(tokenMessengerAddress, testAmount);
        await directApproveTx.wait();
        console.log("✅ Direct approve to TokenMessenger succeeded");

        // Try direct call
        const mintRecipient = ethers.zeroPadValue(ethers.toBeHex(recipient), 32);
        const directTx = await tokenMessenger.depositForBurn(testAmount, 0, mintRecipient, usdcAddress);
        console.log("🎉 DIRECT CALL SUCCEEDED!", directTx.hash);
        console.log("✅ This proves the TokenMessenger works");

      } catch (directError: any) {
        console.log("❌ Direct call failed:", directError.message);
      }
    }

  } catch (error: any) {
    console.error("❌ Debug setup failed:", error.message);
  }

  console.log("\n📊 DEBUGGING SUMMARY:");
  console.log("- If static call works but execution fails: gas/timing issue");
  console.log("- If direct call works: smart contract issue");
  console.log("- If nothing works: network/infrastructure issue");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });