import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

// Correct API URLs from Circle's official repositories
const IRIS_API_SANDBOX = "https://iris-api-sandbox.circle.com"; // For testnet
const IRIS_API_PRODUCTION = "https://iris-api.circle.com"; // For mainnet

// Domain mappings from Circle's official repos
const DESTINATION_DOMAINS = {
  11155111: 0,  // Ethereum Sepolia
  84532: 6,     // Base Sepolia
  43113: 1,     // Avalanche Fuji
  421614: 3,    // Arbitrum Sepolia
  11155420: 2,  // Optimism Sepolia
  59141: 11,    // Linea Sepolia
  103: 5,       // Solana Devnet
};

async function main() {
  console.log("🔍 TESTING CORRECT ATTESTATION API ENDPOINTS");
  console.log("=" .repeat(70));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("🌐 Current Chain: Base Sepolia (84532)");
  console.log("🎯 Destination Chain: Ethereum Sepolia (11155111)");
  
  try {
    // Our successful CCTP transaction
    const burnTxHash = "0x1f47f8c94eac1777141c65fbd5b640d646bd4d4648d5483fc853c054921e0ba9";
    const messageHash = "0x5e3c6c76abc6957b02a855b677fd726a95ae9433795075a2bd8d63039e43a1af";
    
    console.log("\n📋 CCTP TRANSFER DETAILS:");
    console.log("- Burn Transaction:", burnTxHash);
    console.log("- Message Hash:", messageHash);
    console.log("- Amount: 0.1 USDC");
    console.log("- Source Domain: 6 (Base Sepolia)");
    console.log("- Destination Domain: 0 (Ethereum Sepolia)");
    
    // Test different API endpoints
    console.log("\n🔍 TESTING ATTESTATION API ENDPOINTS:");
    
    // Method 1: Using transaction hash (from Circle's repos)
    console.log("\n1️⃣ Method 1: Using Transaction Hash");
    const sourceDomain = DESTINATION_DOMAINS[84532]; // Base Sepolia
    const url1 = `${IRIS_API_SANDBOX}/v1/messages/${sourceDomain}/${burnTxHash}`;
    console.log("📡 URL:", url1);
    
    try {
      const response1 = await fetch(url1);
      const data1 = await response1.json();
      console.log("📊 Response Status:", response1.status);
      console.log("📊 Response Data:", JSON.stringify(data1, null, 2));
      
      if (data1.messages && data1.messages.length > 0) {
        console.log("✅ Found message using transaction hash!");
        const message = data1.messages[0];
        console.log("- Message:", message.message);
        console.log("- Attestation:", message.attestation);
        console.log("- Status:", message.attestation === "PENDING" ? "PENDING" : "COMPLETE");
      }
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
    
    // Method 2: Using message hash (from Circle's repos)
    console.log("\n2️⃣ Method 2: Using Message Hash");
    const url2 = `${IRIS_API_SANDBOX}/v1/attestations/${messageHash}`;
    console.log("📡 URL:", url2);
    
    try {
      const response2 = await fetch(url2);
      const data2 = await response2.json();
      console.log("📊 Response Status:", response2.status);
      console.log("📊 Response Data:", JSON.stringify(data2, null, 2));
      
      if (data2.status === "complete") {
        console.log("✅ Attestation is complete!");
        console.log("- Attestation:", data2.attestation);
      } else if (data2.status === "pending") {
        console.log("⏳ Attestation is pending...");
      }
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
    
    // Method 3: V2 API (from Circle's repos)
    console.log("\n3️⃣ Method 3: V2 API");
    const url3 = `${IRIS_API_SANDBOX}/v2/messages/${sourceDomain}?transactionHash=${burnTxHash}`;
    console.log("📡 URL:", url3);
    
    try {
      const response3 = await fetch(url3);
      const data3 = await response3.json();
      console.log("📊 Response Status:", response3.status);
      console.log("📊 Response Data:", JSON.stringify(data3, null, 2));
      
      if (data3.messages && data3.messages.length > 0) {
        console.log("✅ Found message using V2 API!");
        const message = data3.messages[0];
        console.log("- Message:", message.message);
        console.log("- Attestation:", message.attestation);
      }
    } catch (error) {
      console.log("❌ Error:", error.message);
    }
    
    // Show the complete implementation from Circle's repos
    console.log("\n🏗️ COMPLETE IMPLEMENTATION FROM CIRCLE'S REPOS:");
    console.log("Based on the GitHub repositories you provided:");
    console.log("");
    console.log("```typescript");
    console.log("// From circle-cctp-crosschain-transfer/src/hooks/use-cross-chain-transfer.ts");
    console.log("const retrieveAttestation = async (transactionHash: string, sourceChainId: number) => {");
    console.log("  setCurrentStep('waiting-attestation');");
    console.log("  addLog('Retrieving attestation...');");
    console.log("  ");
    console.log("  const url = `${IRIS_API_URL}/v2/messages/${DESTINATION_DOMAINS[sourceChainId]}?transactionHash=${transactionHash}`;");
    console.log("  ");
    console.log("  while (true) {");
    console.log("    const response = await axios.get(url);");
    console.log("    ");
    console.log("    if (response.data?.messages?.[0]?.attestation !== 'PENDING') {");
    console.log("      addLog('Attestation retrieved!');");
    console.log("      return response.data.messages[0];");
    console.log("    }");
    console.log("    ");
    console.log("    addLog('Waiting for attestation...');");
    console.log("    await new Promise((resolve) => setTimeout(resolve, 5000));");
    console.log("  }");
    console.log("};");
    console.log("```");
    
    console.log("\n📋 CORRECT API ENDPOINTS:");
    console.log("✅ Testnet (Sandbox): https://iris-api-sandbox.circle.com");
    console.log("✅ Mainnet (Production): https://iris-api.circle.com");
    console.log("✅ V1 API: /v1/messages/{domain}/{txHash}");
    console.log("✅ V2 API: /v2/messages/{domain}?transactionHash={txHash}");
    console.log("✅ Attestation API: /v1/attestations/{messageHash}");
    
    console.log("\n🎯 NEXT STEPS:");
    console.log("1. Monitor attestation using the correct sandbox API");
    console.log("2. When attestation is complete, use it to mint USDC");
    console.log("3. Implement the complete flow in your smart wallet");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});