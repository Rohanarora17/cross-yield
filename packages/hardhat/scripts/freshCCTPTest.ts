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
  console.log("🆕 FRESH CCTP TEST - COMPLETE END TO END");
  console.log("=" .repeat(70));
  console.log("🚨 TASK: Create new CCTP transfer and complete it fully");
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
    // Base Sepolia addresses
    const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
    const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
    
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
    ], signer);
    
    // Check USDC balance
    const balance = await usdcContract.balanceOf(wallet.address);
    console.log("💰 Your USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    
    if (balance < ethers.parseUnits("0.2", 6)) {
      console.log("❌ Insufficient USDC balance for test");
      console.log("💡 Need at least 0.2 USDC for the test");
      return;
    }
    
    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address; // Send to self for testing
    
    console.log("\n🎯 FRESH CCTP TRANSFER DETAILS:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);
    console.log("- Destination Domain: 0 (Ethereum Sepolia)");
    console.log("- Max Fee: 1000");
    console.log("- Finality Threshold: 2000");
    
    // STEP 1: Reset allowance and approve
    console.log("\n🔄 STEP 1: Setting up approval");
    const resetTx = await usdcContract.approve(tokenMessengerAddress, 0);
    await resetTx.wait();
    console.log("✅ Allowance reset to 0");
    
    const approveTx = await usdcContract.approve(tokenMessengerAddress, testAmount);
    await approveTx.wait();
    console.log("✅ Approval complete");
    
    // STEP 2: Execute fresh CCTP burn
    console.log("\n🔥 STEP 2: Executing fresh CCTP burn");
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    
    const burnTx = await tokenMessengerContract.depositForBurn(
      testAmount,
      0, // Sepolia domain
      mintRecipient,
      usdcAddress,
      "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
      1000, // maxFee
      2000  // finalityThreshold
    );
    
    console.log("✅ Fresh CCTP burn transaction sent!");
    console.log("📋 Transaction hash:", burnTx.hash);
    
    const burnReceipt = await burnTx.wait();
    console.log("✅ Transaction confirmed!");
    console.log("📋 Gas used:", burnReceipt.gasUsed.toString());
    console.log("📋 Block number:", burnReceipt.blockNumber);
    
    // STEP 3: Monitor attestation for this fresh transaction
    console.log("\n⏰ STEP 3: Monitoring attestation for fresh transaction");
    const sourceDomain = DESTINATION_DOMAINS[84532]; // Base Sepolia
    
    const attestationData = await waitForAttestation(burnTx.hash, sourceDomain);
    
    if (!attestationData.message || attestationData.message === "0x") {
      console.log("❌ ERROR: Message is empty or not ready");
      return;
    }
    
    console.log("✅ Attestation is ready!");
    console.log("📋 Message:", attestationData.message);
    console.log("📋 Attestation:", attestationData.attestation);
    
    // STEP 4: Complete the transfer on Ethereum Sepolia
    console.log("\n🌐 STEP 4: Completing transfer on Ethereum Sepolia");
    
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
    
    // Ethereum Sepolia MessageTransmitter address
    const sepoliaMessageTransmitter = "0x7865fAfC2e209E493507C62C6d21f4C4C5C7d1e5";
    
    const messageTransmitterContract = new ethers.Contract(sepoliaMessageTransmitter, [
      "function receiveMessage(bytes memory message, bytes memory attestation) external returns (bool success)"
    ], sepoliaSigner);
    
    console.log("📋 Calling MessageTransmitter.receiveMessage()...");
    
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
      
      // STEP 5: Verify the final result
      console.log("\n🔍 STEP 5: Verifying Final Result");
      
      const balanceAfter = await sepoliaUSDCContract.balanceOf(wallet.address);
      const receivedAmount = balanceAfter - balanceBefore;
      
      console.log("💰 USDC Balance on Sepolia AFTER:", ethers.formatUnits(balanceAfter, 6), "USDC");
      console.log("💰 Received Amount:", ethers.formatUnits(receivedAmount, 6), "USDC");
      
      const expectedAmount = ethers.parseUnits("0.1", 6);
      
      if (receivedAmount >= expectedAmount) {
        console.log("\n🎉🎉🎉 TASK COMPLETED SUCCESSFULLY! 🎉🎉🎉");
        console.log("✅ Fresh CCTP transfer completed end-to-end");
        console.log("✅ USDC burned on Base Sepolia");
        console.log("✅ USDC minted on Ethereum Sepolia");
        console.log("✅ Expected result achieved!");
        console.log(`✅ Received ${ethers.formatUnits(receivedAmount, 6)} USDC on Sepolia`);
        
        console.log("\n📊 FINAL SUMMARY:");
        console.log("- Fresh Burn Tx:", burnTx.hash);
        console.log("- Mint Tx:", mintTx.hash);
        console.log("- Source: Base Sepolia");
        console.log("- Destination: Ethereum Sepolia");
        console.log("- Amount: 0.1 USDC");
        console.log("- Status: COMPLETED ✅");
        console.log("- Result: SUCCESS ✅");
        
      } else {
        console.log("\n❌ UNEXPECTED RESULT");
        console.log("Expected:", ethers.formatUnits(expectedAmount, 6), "USDC");
        console.log("Received:", ethers.formatUnits(receivedAmount, 6), "USDC");
      }
      
    } catch (error) {
      console.log("❌ Mint transaction failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Fresh CCTP test failed:", error);
  }
}

async function waitForAttestation(transactionHash: string, sourceDomain: number): Promise<any> {
  const url = `${IRIS_API_SANDBOX}/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;
  
  console.log("📡 Monitoring URL:", url);
  
  let attempts = 0;
  const maxAttempts = 120; // 10 minutes total (5 seconds * 120)
  
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
  
  throw new Error("Attestation not ready after 10 minutes");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});