import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 TESTING COMPLETE CCTP FLOW");
  console.log("=" .repeat(60));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  // Base Sepolia addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("💰 USDC:", usdcAddress);
  console.log("📡 TokenMessenger:", tokenMessengerAddress);
  console.log("🌐 Source Chain: Base Sepolia (84532)");
  console.log("🎯 Destination Chain: Ethereum Sepolia (11155111)");
  
  try {
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)",
      "event DepositForBurn(uint64 indexed nonce, address indexed burnToken, uint256 amount, address indexed depositor, bytes32 mintRecipient, uint32 destinationDomain, bytes32 destinationTokenMessenger, bytes32 destinationCaller)"
    ], signer);
    
    // Check initial balance
    const initialBalance = await usdcContract.balanceOf(wallet.address);
    console.log("\n💰 Initial USDC Balance:", ethers.formatUnits(initialBalance, 6), "USDC");
    
    if (initialBalance < ethers.parseUnits("0.2", 6)) {
      console.log("❌ Insufficient USDC balance for complete test");
      console.log("💡 Need at least 0.2 USDC for the test");
      return;
    }
    
    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address; // Send to self for testing
    
    console.log("\n🎯 CCTP TRANSFER DETAILS:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);
    console.log("- Destination Domain: 0 (Ethereum Sepolia)");
    console.log("- Max Fee: 1000");
    console.log("- Finality Threshold: 2000");
    
    // Step 1: Reset allowance to ensure clean state
    console.log("\n🔄 STEP 1: Resetting Allowance");
    const resetTx = await usdcContract.approve(tokenMessengerAddress, 0);
    await resetTx.wait();
    console.log("✅ Allowance reset to 0");
    
    // Step 2: Approve TokenMessenger
    console.log("\n✅ STEP 2: Approving TokenMessenger");
    const approveTx = await usdcContract.approve(tokenMessengerAddress, testAmount);
    await approveTx.wait();
    console.log("✅ Approval complete");
    
    // Verify allowance
    const allowance = await usdcContract.allowance(wallet.address, tokenMessengerAddress);
    console.log("📋 Allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    // Step 3: Execute CCTP Burn
    console.log("\n🔥 STEP 3: Executing CCTP Burn");
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    
    console.log("📋 Burn Parameters:");
    console.log("- amount:", testAmount.toString());
    console.log("- destinationDomain: 0");
    console.log("- mintRecipient:", mintRecipient);
    console.log("- burnToken:", usdcAddress);
    console.log("- hookData: 0x0000...");
    console.log("- maxFee: 1000");
    console.log("- finalityThreshold: 2000");
    
    const burnTx = await tokenMessengerContract.depositForBurn(
      testAmount,
      0, // Sepolia domain
      mintRecipient,
      usdcAddress,
      "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
      1000, // maxFee
      2000  // finalityThreshold
    );
    
    console.log("✅ CCTP burn transaction sent!");
    console.log("📋 Transaction hash:", burnTx.hash);
    
    // Wait for confirmation
    const receipt = await burnTx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("📋 Gas used:", receipt.gasUsed.toString());
    console.log("📋 Block number:", receipt.blockNumber);
    
    // Step 4: Check for DepositForBurn event
    console.log("\n📡 STEP 4: Analyzing CCTP Event");
    let depositForBurnEvent = null;
    
    for (const log of receipt.logs) {
      try {
        const parsed = tokenMessengerContract.interface.parseLog(log);
        if (parsed.name === "DepositForBurn") {
          depositForBurnEvent = parsed;
          break;
        }
      } catch {
        // Not our event, continue
      }
    }
    
    if (depositForBurnEvent) {
      console.log("🎉 DepositForBurn Event Found!");
      console.log("- Nonce:", depositForBurnEvent.args.nonce.toString());
      console.log("- Amount:", ethers.formatUnits(depositForBurnEvent.args.amount, 6), "USDC");
      console.log("- Depositor:", depositForBurnEvent.args.depositor);
      console.log("- Mint Recipient:", depositForBurnEvent.args.mintRecipient);
      console.log("- Destination Domain:", depositForBurnEvent.args.destinationDomain.toString());
      console.log("- Destination TokenMessenger:", depositForBurnEvent.args.destinationTokenMessenger);
      
      // Step 5: Check final balance
      console.log("\n💰 STEP 5: Checking Final Balance");
      const finalBalance = await usdcContract.balanceOf(wallet.address);
      const burnedAmount = initialBalance - finalBalance;
      
      console.log("📊 Balance Summary:");
      console.log("- Initial Balance:", ethers.formatUnits(initialBalance, 6), "USDC");
      console.log("- Final Balance:", ethers.formatUnits(finalBalance, 6), "USDC");
      console.log("- Burned Amount:", ethers.formatUnits(burnedAmount, 6), "USDC");
      console.log("- Expected Burn:", ethers.formatUnits(testAmount, 6), "USDC");
      
      if (burnedAmount === testAmount) {
        console.log("✅ Burn amount matches expected amount!");
      } else {
        console.log("⚠️ Burn amount differs from expected");
      }
      
      // Step 6: Next Steps for Complete Flow
      console.log("\n🔄 STEP 6: Next Steps for Complete CCTP Flow");
      console.log("✅ Source Chain (Base Sepolia): COMPLETE");
      console.log("📋 Message Hash:", depositForBurnEvent.args.nonce.toString());
      console.log("⏳ Waiting for Attestation...");
      console.log("🎯 Next: Complete transfer on Ethereum Sepolia");
      
      console.log("\n📝 To complete the full CCTP flow:");
      console.log("1. Wait for Circle's attestation service to sign the message");
      console.log("2. Use the attestation to mint USDC on Ethereum Sepolia");
      console.log("3. The recipient will receive the USDC on Sepolia");
      
      console.log("\n🎉 CCTP BURN PHASE: SUCCESS!");
      console.log("Your USDC has been burned on Base Sepolia and will be minted on Ethereum Sepolia");
      
    } else {
      console.log("⚠️ No DepositForBurn event found");
      console.log("This might indicate an issue with the transaction");
    }
    
  } catch (error) {
    console.error("❌ CCTP Flow Failed:", error.message);
    
    if (error.message.includes("allowance")) {
      console.log("💡 Tip: Reset allowance to 0 first, then approve the exact amount");
    }
    
    if (error.message.includes("balance")) {
      console.log("💡 Tip: Ensure you have enough USDC balance");
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});