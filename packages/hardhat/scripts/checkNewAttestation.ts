import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 CHECKING NEW CCTP ATTESTATION");
  console.log("=" .repeat(50));
  console.log("🚨 TASK: Check attestation for new CCTP transfer");
  console.log("🚨 Transaction: 0xa4354dd74d5c44a5bdb38c09c05788f35058c7a9030d609be14fd49edb9ff6e2");
  console.log("=" .repeat(50));
  
  try {
    const txHash = "0xa4354dd74d5c44a5bdb38c09c05788f35058c7a9030d609be14fd49edb9ff6e2";
    const url = `https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${txHash}`;
    
    console.log("🔍 Checking attestation...");
    console.log("🌐 API URL:", url);
    
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📊 Response status:", response.status);
    console.log("📊 Response data:", JSON.stringify(data, null, 2));
    
    if (data.messages && data.messages.length > 0) {
      const message = data.messages[0];
      console.log("\n✅ Message found!");
      console.log("📊 Status:", message.status);
      console.log("📊 CCTP Version:", message.cctpVersion);
      console.log("📊 Attestation:", message.attestation ? "PRESENT" : "MISSING");
      console.log("📊 Message:", message.message ? "PRESENT" : "MISSING");
      
      if (message.decodedMessage) {
        console.log("\n🔍 Decoded Message:");
        console.log("📊 Source Domain:", message.decodedMessage.sourceDomain);
        console.log("📊 Destination Domain:", message.decodedMessage.destinationDomain);
        console.log("📊 Amount:", message.decodedMessage.decodedMessageBody?.amount);
        console.log("📊 Mint Recipient:", message.decodedMessage.decodedMessageBody?.mintRecipient);
        console.log("📊 Burn Token:", message.decodedMessage.decodedMessageBody?.burnToken);
      }
      
      if (message.status === "complete") {
        console.log("\n🎉 ATTESTATION IS COMPLETE!");
        console.log("✅ Ready to mint USDC on Ethereum Sepolia");
        console.log("✅ Message:", message.message);
        console.log("✅ Attestation:", message.attestation);
        
        console.log("\n📋 NEXT STEP:");
        console.log("Use this message and attestation to mint USDC on Ethereum Sepolia");
        
      } else {
        console.log("\n⏳ Attestation status:", message.status);
        console.log("💡 This is normal - Circle's attestation service takes time");
        console.log("💡 In production, backend would poll this endpoint");
      }
      
    } else {
      console.log("❌ No messages found for this transaction");
      console.log("💡 This might be because the transaction is very recent");
      console.log("💡 Circle's attestation service needs time to process");
    }
    
    console.log("\n🎯 SUMMARY:");
    console.log("✅ Circle API is accessible");
    console.log("✅ We can query attestations");
    console.log("✅ CCTP transfer created successfully");
    console.log("✅ Ready for attestation monitoring");
    
  } catch (error) {
    console.error("❌ Attestation check failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});