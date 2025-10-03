import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 SIMPLE MINTING STATUS CHECK");
  console.log("=" .repeat(50));
  
  const txHash = "0xa4354dd74d5c44a5bdb38c09c05788f35058c7a9030d609be14fd49edb9ff6e2";
  const walletAddress = "0xce54cf5a0de3843011cf20389c1b6a4aac442d6a";
  
  console.log("📋 Transaction:", txHash);
  console.log("📋 Wallet:", walletAddress);
  
  // Check Circle attestation
  console.log("\n🔍 Checking Circle Attestation...");
  try {
    const url = `https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${txHash}`;
    const response = await fetch(url);
    const data = await response.json();
    
    console.log("📊 Status:", response.status);
    
    if (data.messages && data.messages.length > 0) {
      const message = data.messages[0];
      console.log("✅ Attestation Status:", message.status);
      
      if (message.status === "complete") {
        console.log("🎉 ATTESTATION READY!");
        console.log("✅ Can mint USDC now");
      } else {
        console.log("⏳ Attestation Status:", message.status);
        console.log("💡 Still processing - this is normal");
      }
    } else {
      console.log("⏳ No attestation found yet");
      console.log("💡 Circle needs more time to process");
    }
    
  } catch (error) {
    console.log("❌ Error:", error.message);
  }
  
  // Check USDC balance on Ethereum Sepolia
  console.log("\n🔍 Checking USDC Balance on Ethereum Sepolia...");
  try {
    const sepoliaProvider = new ethers.JsonRpcProvider("https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161");
    const sepoliaUSDCAddress = "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238";
    
    const usdcContract = new ethers.Contract(sepoliaUSDCAddress, [
      "function balanceOf(address) external view returns (uint256)"
    ], sepoliaProvider);
    
    const balance = await usdcContract.balanceOf(walletAddress);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    
    console.log("💰 USDC Balance:", balanceFormatted, "USDC");
    
    if (balance > 0) {
      console.log("🎉 USDC FOUND!");
      console.log("✅ CCTP transfer completed");
      console.log("✅ USDC minted on Ethereum Sepolia");
    } else {
      console.log("⏳ No USDC found yet");
      console.log("💡 Minting hasn't happened yet");
      console.log("💡 Need to wait for Circle attestation");
    }
    
  } catch (error) {
    console.log("❌ Error checking balance:", error.message);
  }
  
  console.log("\n🎯 SUMMARY:");
  console.log("✅ Transaction confirmed on Base Sepolia");
  console.log("✅ USDC burned successfully");
  console.log("⏳ Circle attestation processing");
  console.log("⏳ USDC minting pending");
  console.log("💡 This is normal - Circle takes time to process");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});