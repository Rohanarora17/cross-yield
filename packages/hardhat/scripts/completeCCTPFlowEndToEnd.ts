import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

// Correct API URLs from Circle's official repositories
const IRIS_API_SANDBOX = "https://iris-api-sandbox.circle.com";

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
  console.log("🎯 COMPLETE CCTP FLOW - END TO END TEST");
  console.log("=" .repeat(70));
  console.log("🚨 TASK: Complete CCTP transfer and verify USDC received on Sepolia");
  console.log("🚨 NO SHORTCUTS - We will test everything until we get the expected result");
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
    const sourceDomain = DESTINATION_DOMAINS[84532]; // Base Sepolia
    const destinationDomain = DESTINATION_DOMAINS[11155111]; // Ethereum Sepolia
    
    console.log("\n📋 CCTP TRANSFER DETAILS:");
    console.log("- Burn Transaction:", burnTxHash);
    console.log("- Source Domain:", sourceDomain, "(Base Sepolia)");
    console.log("- Destination Domain:", destinationDomain, "(Ethereum Sepolia)");
    console.log("- Amount: 0.1 USDC");
    console.log("- Recipient:", wallet.address);
    
    // STEP 1: Wait for attestation to be ready
    console.log("\n⏰ STEP 1: Waiting for Circle Attestation");
    console.log("🔄 Monitoring attestation status until COMPLETE...");
    
    const attestationData = await waitForAttestation(burnTxHash, sourceDomain);
    
    if (!attestationData.message || attestationData.message === "0x") {
      console.log("❌ ERROR: Message is empty or not ready");
      console.log("💡 This might indicate an issue with Circle's attestation service");
      return;
    }
    
    console.log("✅ Attestation is ready!");
    console.log("📋 Message:", attestationData.message);
    console.log("📋 Attestation:", attestationData.attestation);
    console.log("📋 Event Nonce:", attestationData.eventNonce);
    
    // STEP 2: Switch to Ethereum Sepolia and deploy smart wallet
    console.log("\n🌐 STEP 2: Switching to Ethereum Sepolia");
    console.log("📡 Network: Ethereum Sepolia (11155111)");
    
    // Create Sepolia provider
    const sepoliaProvider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
    const sepoliaSigner = wallet.connect(sepoliaProvider);
    
    console.log("✅ Connected to Ethereum Sepolia");
    
    // Check Sepolia USDC balance before
    const sepoliaUSDCAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"; // Ethereum Sepolia USDC
    const sepoliaUSDCContract = new ethers.Contract(sepoliaUSDCAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function decimals() external view returns (uint8)"
    ], sepoliaSigner);
    
    const balanceBefore = await sepoliaUSDCContract.balanceOf(wallet.address);
    console.log("💰 USDC Balance on Sepolia BEFORE:", ethers.formatUnits(balanceBefore, 6), "USDC");
    
    // STEP 3: Complete the CCTP transfer on Sepolia
    console.log("\n🎯 STEP 3: Completing CCTP Transfer on Ethereum Sepolia");
    
    // Ethereum Sepolia MessageTransmitter address
    const sepoliaMessageTransmitter = "0x7865fAfC2e209E493507C62C6d21f4C4C5C7d1e5";
    
    const messageTransmitterContract = new ethers.Contract(sepoliaMessageTransmitter, [
      "function receiveMessage(bytes memory message, bytes memory attestation) external returns (bool success)"
    ], sepoliaSigner);
    
    console.log("📋 Calling MessageTransmitter.receiveMessage()...");
    console.log("- Message:", attestationData.message);
    console.log("- Attestation:", attestationData.attestation);
    
    try {
      const mintTx = await messageTransmitterContract.receiveMessage(
        attestationData.message,
        attestationData.attestation
      );
      
      console.log("✅ Mint transaction sent!");
      console.log("📋 Transaction hash:", mintTx.hash);
      
      const mintReceipt = await mintTx.wait();
      console.log("✅ Mint transaction confirmed!");
      console.log("📋 Gas used:", mintReceipt.gasUsed.toString());
      console.log("📋 Block number:", mintReceipt.blockNumber);
      
      // STEP 4: Verify the result
      console.log("\n🔍 STEP 4: Verifying Final Result");
      
      const balanceAfter = await sepoliaUSDCContract.balanceOf(wallet.address);
      const receivedAmount = balanceAfter - balanceBefore;
      
      console.log("💰 USDC Balance on Sepolia AFTER:", ethers.formatUnits(balanceAfter, 6), "USDC");
      console.log("💰 Received Amount:", ethers.formatUnits(receivedAmount, 6), "USDC");
      
      const expectedAmount = ethers.parseUnits("0.1", 6);
      
      if (receivedAmount >= expectedAmount) {
        console.log("\n🎉🎉🎉 TASK COMPLETED SUCCESSFULLY! 🎉🎉🎉");
        console.log("✅ CCTP transfer completed end-to-end");
        console.log("✅ USDC burned on Base Sepolia");
        console.log("✅ USDC minted on Ethereum Sepolia");
        console.log("✅ Expected result achieved!");
        console.log(`✅ Received ${ethers.formatUnits(receivedAmount, 6)} USDC on Sepolia`);
        
        console.log("\n📊 FINAL SUMMARY:");
        console.log("- Source: Base Sepolia");
        console.log("- Destination: Ethereum Sepolia");
        console.log("- Amount: 0.1 USDC");
        console.log("- Status: COMPLETED ✅");
        console.log("- Result: SUCCESS ✅");
        
      } else {
        console.log("\n❌ UNEXPECTED RESULT");
        console.log("Expected:", ethers.formatUnits(expectedAmount, 6), "USDC");
        console.log("Received:", ethers.formatUnits(receivedAmount, 6), "USDC");
        console.log("💡 This might indicate an issue with the CCTP transfer");
      }
      
    } catch (error) {
      console.log("❌ Mint transaction failed:", error.message);
      console.log("💡 This might be due to:");
      console.log("- Invalid message or attestation");
      console.log("- Insufficient gas");
      console.log("- Network issues");
      console.log("- Circle's MessageTransmitter contract issues");
    }
    
  } catch (error) {
    console.error("❌ End-to-end test failed:", error);
  }
}

async function waitForAttestation(transactionHash: string, sourceDomain: number): Promise<any> {
  const url = `${IRIS_API_SANDBOX}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
  
  console.log("📡 Monitoring URL:", url);
  
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes total (5 seconds * 60)
  
  while (attempts < maxAttempts) {
    attempts++;
    console.log(`🔄 Attempt ${attempts}/${maxAttempts}:`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("📊 Response Status:", response.status);
      
      if (data.messages && data.messages.length > 0) {
        const message = data.messages[0];
        console.log("📋 Status:", message.status);
        console.log("📋 Attestation:", message.attestation);
        console.log("📋 Message Length:", message.message?.length || 0);
        
        if (message.attestation !== "PENDING" && message.message && message.message !== "0x") {
          console.log("🎉 Attestation is ready!");
          return {
            message: message.message,
            attestation: message.attestation,
            eventNonce: message.eventNonce,
            status: message.status
          };
        } else {
          console.log("⏳ Still pending...");
        }
      } else {
        console.log("❌ No messages found");
      }
      
      if (attempts < maxAttempts) {
        console.log("⏳ Waiting 5 seconds before next check...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (error) {
      console.log("❌ Error checking attestation:", error.message);
      if (attempts < maxAttempts) {
        console.log("⏳ Waiting 5 seconds before retry...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
  
  throw new Error("Attestation not ready after 5 minutes");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});