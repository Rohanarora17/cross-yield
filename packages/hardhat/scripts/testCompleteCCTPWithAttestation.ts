import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔄 TESTING COMPLETE CCTP FLOW WITH ATTESTATION");
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
  const messageTransmitterAddress = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("🌐 Current Chain: Base Sepolia (84532)");
  console.log("🎯 Destination Chain: Ethereum Sepolia (11155111)");
  
  try {
    // Step 1: Execute CCTP Burn (we already did this)
    console.log("\n🔥 STEP 1: CCTP Burn (Already Completed)");
    const burnTxHash = "0x1f47f8c94eac1777141c65fbd5b640d646bd4d4648d5483fc853c054921e0ba9";
    console.log("✅ Burn Transaction:", burnTxHash);
    
    // Step 2: Get the message from the burn transaction
    console.log("\n📡 STEP 2: Extracting CCTP Message");
    const burnReceipt = await provider.getTransactionReceipt(burnTxHash);
    
    let cctpMessage = null;
    let messageHash = null;
    
    // Find the MessageSent event
    for (const log of burnReceipt.logs) {
      if (log.address.toLowerCase() === messageTransmitterAddress.toLowerCase()) {
        try {
          const messageTransmitterInterface = new ethers.Interface([
            "event MessageSent(bytes message)"
          ]);
          const parsed = messageTransmitterInterface.parseLog(log);
          cctpMessage = parsed.args.message;
          messageHash = ethers.keccak256(cctpMessage);
          break;
        } catch (e) {
          // Not our event
        }
      }
    }
    
    if (!cctpMessage) {
      console.log("❌ Could not find CCTP message in burn transaction");
      return;
    }
    
    console.log("✅ CCTP Message extracted");
    console.log("📋 Message Hash:", messageHash);
    console.log("📋 Message Length:", cctpMessage.length, "characters");
    
    // Step 3: Check attestation status
    console.log("\n🔍 STEP 3: Checking Attestation Status");
    
    // Circle's attestation API endpoint
    const attestationUrl = `https://iris-api.circle.com/attestations/${messageHash}`;
    
    try {
      const response = await fetch(attestationUrl);
      const attestationData = await response.json();
      
      console.log("📡 Attestation API Response:");
      console.log("- Status:", response.status);
      console.log("- Data:", JSON.stringify(attestationData, null, 2));
      
      if (response.status === 200 && attestationData.status === "complete") {
        console.log("✅ Attestation is ready!");
        console.log("📋 Attestation:", attestationData.attestation);
        
        // Step 4: Complete the transfer on Ethereum Sepolia
        console.log("\n🎯 STEP 4: Completing Transfer on Ethereum Sepolia");
        console.log("⚠️ Note: This requires switching to Ethereum Sepolia network");
        console.log("📋 To complete the transfer:");
        console.log("1. Switch to Ethereum Sepolia network");
        console.log("2. Use MessageTransmitter.receiveMessage()");
        console.log("3. Pass the message and attestation");
        console.log("4. USDC will be minted to the recipient");
        
        // Show the complete flow
        console.log("\n🔄 COMPLETE CCTP FLOW:");
        console.log("✅ Phase 1: Burn on Base Sepolia (COMPLETED)");
        console.log("✅ Phase 2: Message created and sent (COMPLETED)");
        console.log("✅ Phase 3: Attestation received (COMPLETED)");
        console.log("⏳ Phase 4: Mint on Ethereum Sepolia (READY TO EXECUTE)");
        
      } else if (response.status === 200 && attestationData.status === "pending") {
        console.log("⏳ Attestation is pending...");
        console.log("💡 Circle's attestation service is processing the message");
        console.log("🔄 Check again in a few minutes");
        
      } else {
        console.log("❌ Attestation not found or error occurred");
        console.log("💡 This might be because:");
        console.log("- The message is still being processed");
        console.log("- The attestation service is temporarily unavailable");
        console.log("- The message hash is incorrect");
      }
      
    } catch (error) {
      console.log("❌ Error checking attestation:", error.message);
      console.log("💡 This might be due to network issues or API rate limits");
    }
    
    // Step 5: Show how to complete the transfer
    console.log("\n📋 STEP 5: How to Complete the Transfer");
    console.log("To complete the CCTP transfer on Ethereum Sepolia:");
    console.log("");
    console.log("1. Switch to Ethereum Sepolia network");
    console.log("2. Use the MessageTransmitter contract:");
    console.log("   Address: 0x7865fAfC2e209E493507C62C6d21f4C4C5C7d1e5");
    console.log("3. Call receiveMessage() with:");
    console.log("   - message:", cctpMessage);
    console.log("   - attestation: [from Circle's API]");
    console.log("4. USDC will be minted to:", wallet.address);
    
    // Step 6: Monitor the transfer
    console.log("\n⏰ STEP 6: Monitoring the Transfer");
    console.log("You can monitor the attestation status by calling:");
    console.log(`curl ${attestationUrl}`);
    console.log("");
    console.log("When status becomes 'complete', you can complete the transfer.");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});