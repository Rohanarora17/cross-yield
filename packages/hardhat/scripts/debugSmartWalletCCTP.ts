import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 DEBUGGING SMART WALLET CCTP");
  console.log("=" .repeat(60));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  // Use the latest deployed smart wallet
  const smartWalletAddress = "0x4669a59D48A17D2Fe57057Accc249C9f21E0993F"; // Latest one
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Smart Wallet:", smartWalletAddress);
  console.log("💰 USDC:", usdcAddress);
  console.log("📡 TokenMessenger:", tokenMessengerAddress);
  
  try {
    // Check USDC balances
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const userBalance = await usdcContract.balanceOf(wallet.address);
    const smartWalletBalance = await usdcContract.balanceOf(smartWalletAddress);
    
    console.log("💰 Your USDC balance:", ethers.formatUnits(userBalance, 6), "USDC");
    console.log("🏦 Smart Wallet USDC balance:", ethers.formatUnits(smartWalletBalance, 6), "USDC");
    
    // Check allowance
    const allowance = await usdcContract.allowance(smartWalletAddress, tokenMessengerAddress);
    console.log("📋 Smart Wallet -> TokenMessenger allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    // Check if smart wallet is active
    const smartWalletContract = new ethers.Contract(smartWalletAddress, [
      "function isActive() external view returns (bool)",
      "function owner() external view returns (address)",
      "function backendCoordinator() external view returns (address)",
      "function executeCCTP(uint256 amount, uint256 destinationChainId, address recipient, string memory destinationChain) external returns (uint64 nonce)"
    ], signer);
    
    const isActive = await smartWalletContract.isActive();
    const owner = await smartWalletContract.owner();
    const backendCoordinator = await smartWalletContract.backendCoordinator();
    
    console.log("🏦 Smart Wallet Active:", isActive);
    console.log("👤 Owner:", owner);
    console.log("🤖 Backend Coordinator:", backendCoordinator);
    
    // Check if we can call executeCCTP
    console.log("\n🔍 Testing executeCCTP call...");
    
    const testAmount = ethers.parseUnits("0.1", 6);
    const recipient = wallet.address;
    
    // First, transfer some USDC to smart wallet if needed
    if (smartWalletBalance < testAmount) {
      console.log("📤 Transferring USDC to smart wallet...");
      const transferTx = await usdcContract.transfer(smartWalletAddress, testAmount);
      await transferTx.wait();
      console.log("✅ Transfer complete");
    }
    
    // Now try to call executeCCTP
    try {
      const executeCCTPTx = await smartWalletContract.executeCCTP(
        testAmount,
        11155111, // Sepolia chain ID
        recipient,
        "Sepolia"
      );
      
      console.log("✅ executeCCTP transaction sent!");
      console.log("📋 Transaction hash:", executeCCTPTx.hash);
      
      const receipt = await executeCCTPTx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("📋 Gas used:", receipt.gasUsed.toString());
      
    } catch (error) {
      console.log("❌ executeCCTP failed:", error.message);
      
      // Try to decode the error
      if (error.data) {
        console.log("📋 Error data:", error.data);
      }
      
      // Check if it's a revert with reason
      if (error.reason) {
        console.log("📋 Revert reason:", error.reason);
      }
    }
    
  } catch (error) {
    console.error("❌ Debug failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});