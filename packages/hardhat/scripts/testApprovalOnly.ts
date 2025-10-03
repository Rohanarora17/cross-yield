import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING APPROVAL ONLY");
  console.log("=" .repeat(60));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  const smartWalletAddress = "0x4669a59D48A17D2Fe57057Accc249C9f21E0993F";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Smart Wallet:", smartWalletAddress);
  
  try {
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const testAmount = ethers.parseUnits("0.1", 6);
    
    // Check current state
    const balance = await usdcContract.balanceOf(smartWalletAddress);
    const allowance = await usdcContract.allowance(smartWalletAddress, tokenMessengerAddress);
    
    console.log("🏦 Smart Wallet USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    console.log("📋 Current allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    // Test approval from smart wallet's perspective
    console.log("\n🧪 Testing approval from smart wallet...");
    
    // Create a contract instance that will call approve as if it's the smart wallet
    const smartWalletUsdcContract = new ethers.Contract(usdcAddress, [
      "function approve(address, uint256) external returns (bool)"
    ], signer);
    
    // We need to impersonate the smart wallet to test the approval
    console.log("📝 Note: We can't directly test smart wallet approval without impersonation");
    console.log("   But we can test if the approval would work by calling it directly");
    
    // Test direct approval (this worked before)
    console.log("\n🧪 Testing direct approval (should work)...");
    try {
      const directApprovalTx = await usdcContract.approve(tokenMessengerAddress, testAmount);
      await directApprovalTx.wait();
      console.log("✅ Direct approval successful");
      
      const newAllowance = await usdcContract.allowance(wallet.address, tokenMessengerAddress);
      console.log("📋 New allowance:", ethers.formatUnits(newAllowance, 6), "USDC");
      
    } catch (error) {
      console.log("❌ Direct approval failed:", error.message);
    }
    
    // Now test the CCTP call with the allowance
    console.log("\n🧪 Testing CCTP call with allowance...");
    
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
    ], signer);
    
    const recipient = wallet.address;
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    
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
      
      console.log("✅ CCTP call successful!");
      console.log("📋 Transaction hash:", cctpTx.hash);
      
      const receipt = await cctpTx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("📋 Gas used:", receipt.gasUsed.toString());
      
    } catch (error) {
      console.log("❌ CCTP call failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});