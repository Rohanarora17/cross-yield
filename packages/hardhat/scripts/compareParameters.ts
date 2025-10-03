import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 COMPARING PARAMETERS");
  console.log("=" .repeat(60));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  
  try {
    const testAmount = ethers.parseUnits("0.1", 6);
    const recipient = wallet.address;
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    
    console.log("\n📋 PARAMETER COMPARISON:");
    console.log("Direct Call Parameters:");
    console.log("- amount:", testAmount.toString());
    console.log("- destinationDomain: 0");
    console.log("- mintRecipient:", mintRecipient);
    console.log("- burnToken:", usdcAddress);
    console.log("- hookData: 0x0000000000000000000000000000000000000000000000000000000000000000");
    console.log("- maxFee: 1000");
    console.log("- finalityThreshold: 2000");
    
    console.log("\nSmart Wallet Parameters (should be identical):");
    console.log("- amount:", testAmount.toString());
    console.log("- destinationDomain: 0 (from cctpDomains[11155111])");
    console.log("- mintRecipient:", mintRecipient);
    console.log("- burnToken:", usdcAddress);
    console.log("- hookData: 0x0000000000000000000000000000000000000000000000000000000000000000");
    console.log("- maxFee: 1000");
    console.log("- finalityThreshold: 2000");
    
    // Test the exact same call that worked before
    console.log("\n🧪 Testing the exact same call that worked...");
    
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
    ], signer);
    
    try {
      const cctpTx = await tokenMessengerContract.depositForBurn(
        testAmount,
        0, // Sepolia domain
        mintRecipient,
        usdcAddress,
        "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
        1000, // maxFee
        2000  // finalityThreshold
      );
      
      console.log("✅ Direct call still works!");
      console.log("📋 Transaction hash:", cctpTx.hash);
      
    } catch (error) {
      console.log("❌ Direct call failed:", error.message);
    }
    
    // Now let's try to understand what's different
    console.log("\n🔍 ANALYZING THE DIFFERENCE:");
    console.log("The direct call works, but the smart wallet call fails.");
    console.log("This suggests the issue is in the smart wallet's internal logic.");
    console.log("Possible causes:");
    console.log("1. USDC.approve() call failing in smart wallet");
    console.log("2. Some validation check we missed");
    console.log("3. Gas estimation issue");
    console.log("4. Contract state issue");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});