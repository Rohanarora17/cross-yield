import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 CHECKING MINTING STATUS");
  console.log("=" .repeat(60));
  console.log("🚨 TASK: Check if USDC has been minted on Ethereum Sepolia");
  console.log("🚨 Transaction: 0xa4354dd74d5c44a5bdb38c09c05788f35058c7a9030d609be14fd49edb9ff6e2");
  console.log("=" .repeat(60));
  
  try {
    const txHash = "0xa4354dd74d5c44a5bdb38c09c05788f35058c7a9030d609be14fd49edb9ff6e2";
    const walletAddress = "0xce54cf5a0de3843011cf20389c1b6a4aac442d6a";
    
    // Step 1: Check Circle Attestation Status
    console.log("🔍 STEP 1: Checking Circle Attestation Status...");
    try {
      const url = `https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${txHash}`;
      console.log("🌐 API URL:", url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      console.log("📊 Response status:", response.status);
      
      if (data.messages && data.messages.length > 0) {
        const message = data.messages[0];
        console.log("✅ Circle message found!");
        console.log("📊 Status:", message.status);
        console.log("📊 CCTP Version:", message.cctpVersion);
        
        if (message.status === "complete") {
          console.log("🎉 CIRCLE ATTESTATION COMPLETE!");
          console.log("✅ Ready to mint USDC on Ethereum Sepolia");
          console.log("📋 Message:", message.message);
          console.log("📋 Attestation:", message.attestation);
          
          // Step 2: Check USDC Balance on Ethereum Sepolia
          console.log("\n🔍 STEP 2: Checking USDC Balance on Ethereum Sepolia...");
          await checkSepoliaBalance(walletAddress, message);
          
        } else {
          console.log("⏳ Circle attestation status:", message.status);
          console.log("💡 Attestation not ready yet - this is normal");
          console.log("💡 Circle's attestation service takes time to process");
          
          // Still check balance in case it was minted already
          console.log("\n🔍 STEP 2: Checking USDC Balance on Ethereum Sepolia (just in case)...");
          await checkSepoliaBalance(walletAddress, null);
        }
        
      } else {
        console.log("⏳ Circle attestation not ready yet");
        console.log("💡 This is normal for recent transactions");
        
        // Still check balance in case it was minted already
        console.log("\n🔍 STEP 2: Checking USDC Balance on Ethereum Sepolia (just in case)...");
        await checkSepoliaBalance(walletAddress, null);
      }
      
    } catch (error) {
      console.log("❌ Error checking Circle attestation:", error.message);
      
      // Still check balance in case it was minted already
      console.log("\n🔍 STEP 2: Checking USDC Balance on Ethereum Sepolia (just in case)...");
      await checkSepoliaBalance(walletAddress, null);
    }
    
  } catch (error) {
    console.error("❌ Minting status check failed:", error);
  }
}

async function checkSepoliaBalance(walletAddress: string, message: any) {
  try {
    // Create Sepolia provider
    const sepoliaProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
    
    // Ethereum Sepolia USDC address
    const sepoliaUSDCAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    const sepoliaUSDCContract = new ethers.Contract(sepoliaUSDCAddress, [
      "function balanceOf(address) external view returns (uint256)"
    ], sepoliaProvider);
    
    console.log("🌐 Connected to Ethereum Sepolia");
    console.log("📋 Checking balance for:", walletAddress);
    console.log("📋 USDC Contract:", sepoliaUSDCAddress);
    
    const balance = await sepoliaUSDCContract.balanceOf(walletAddress);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    
    console.log("💰 USDC Balance on Ethereum Sepolia:", balanceFormatted, "USDC");
    
    if (balance > 0) {
      console.log("🎉 USDC FOUND ON ETHEREUM SEPOLIA!");
      console.log("✅ CCTP transfer completed successfully");
      console.log("✅ USDC minted on destination chain");
      
      // Check if this matches our expected amount
      const expectedAmount = ethers.parseUnits("0.1", 6);
      if (balance >= expectedAmount) {
        console.log("✅ Amount matches expected (0.1 USDC)");
      } else {
        console.log("⚠️ Amount is less than expected (0.1 USDC)");
      }
      
    } else {
      console.log("⏳ No USDC found on Ethereum Sepolia yet");
      console.log("💡 This means the minting hasn't happened yet");
      console.log("💡 Need to wait for Circle attestation to be complete");
      
      if (message && message.status === "complete") {
        console.log("\n🔍 ATTESTATION IS READY - CAN COMPLETE MINTING NOW!");
        console.log("📋 Message:", message.message);
        console.log("📋 Attestation:", message.attestation);
        console.log("💡 Use these to call MessageTransmitter.receiveMessage()");
      }
    }
    
  } catch (error) {
    console.log("❌ Error checking Sepolia balance:", error.message);
    console.log("💡 This might be due to RPC connectivity issues");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});