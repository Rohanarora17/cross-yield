import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 DEBUGGING SMART WALLET STEP BY STEP");
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
  console.log("🌐 Current Chain ID:", (await provider.getNetwork()).chainId);
  
  try {
    // Check all the conditions step by step
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const smartWalletContract = new ethers.Contract(smartWalletAddress, [
      "function isActive() external view returns (bool)",
      "function owner() external view returns (address)",
      "function USDC() external view returns (address)",
      "function tokenMessengerAddresses(uint256) external view returns (address)",
      "function cctpDomains(uint256) external view returns (uint32)"
    ], signer);
    
    const testAmount = ethers.parseUnits("0.1", 6);
    const destinationChainId = 11155111; // Sepolia
    const recipient = wallet.address;
    
    console.log("\n🔍 STEP-BY-STEP VALIDATION:");
    
    // Step 1: Check amount
    console.log("1. Amount check:", testAmount.toString(), "> 0?", testAmount > 0);
    
    // Step 2: Check recipient
    console.log("2. Recipient check:", recipient, "!= address(0)?", recipient !== ethers.ZeroAddress);
    
    // Step 3: Check USDC balance
    const balance = await usdcContract.balanceOf(smartWalletAddress);
    console.log("3. USDC balance check:", ethers.formatUnits(balance, 6), "USDC >= ", ethers.formatUnits(testAmount, 6), "USDC?", balance >= testAmount);
    
    // Step 4: Check if wallet is active
    const isActive = await smartWalletContract.isActive();
    console.log("4. Wallet active check:", isActive);
    
    // Step 5: Check tokenMessenger for current chain
    const currentChainId = (await provider.getNetwork()).chainId;
    const tokenMessenger = await smartWalletContract.tokenMessengerAddresses(currentChainId);
    console.log("5. TokenMessenger for chain", currentChainId, ":", tokenMessenger);
    console.log("   Expected:", tokenMessengerAddress);
    console.log("   Match?", tokenMessenger.toLowerCase() === tokenMessengerAddress.toLowerCase());
    
    // Step 6: Check destination domain
    const destinationDomain = await smartWalletContract.cctpDomains(destinationChainId);
    console.log("6. Destination domain for chain", destinationChainId, ":", destinationDomain);
    
    // Step 7: Check domain validation logic
    const domainCheck = destinationDomain == 0 && destinationChainId != 11155111 && destinationChainId != 1;
    console.log("7. Domain validation:", "destinationDomain == 0?", destinationDomain == 0);
    console.log("   destinationChainId != 11155111?", destinationChainId != 11155111);
    console.log("   destinationChainId != 1?", destinationChainId != 1);
    console.log("   Combined check (should be false):", domainCheck);
    
    // Step 8: Check USDC contract
    const usdcFromContract = await smartWalletContract.USDC();
    console.log("8. USDC contract in smart wallet:", usdcFromContract);
    console.log("   Expected:", usdcAddress);
    console.log("   Match?", usdcFromContract.toLowerCase() === usdcAddress.toLowerCase());
    
    // Step 9: Check current allowance
    const allowance = await usdcContract.allowance(smartWalletAddress, tokenMessengerAddress);
    console.log("9. Current allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    console.log("\n🎯 SUMMARY:");
    console.log("All checks should pass for executeCCTP to work.");
    console.log("If any check fails, that's where the revert is happening.");
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});