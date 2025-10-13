import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING SMART WALLET APPROVAL");
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
  const smartWalletAddress = "0x4669a59D48A17D2Fe57057Accc249C9f21E0993F";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Smart Wallet:", smartWalletAddress);
  
  try {
    // Check current state
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const smartWalletBalance = await usdcContract.balanceOf(smartWalletAddress);
    const allowance = await usdcContract.allowance(smartWalletAddress, tokenMessengerAddress);
    
    console.log("🏦 Smart Wallet USDC balance:", ethers.formatUnits(smartWalletBalance, 6), "USDC");
    console.log("📋 Current allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    if (smartWalletBalance < ethers.parseUnits("0.1", 6)) {
      console.log("📤 Transferring USDC to smart wallet...");
      const transferTx = await usdcContract.transfer(smartWalletAddress, ethers.parseUnits("0.1", 6));
      await transferTx.wait();
      console.log("✅ Transfer complete");
    }
    
    // Now test the smart wallet's approval mechanism
    console.log("\n🧪 Testing smart wallet approval...");
    
    const smartWalletContract = new ethers.Contract(smartWalletAddress, [
      "function executeCCTP(uint256 amount, uint256 destinationChainId, address recipient, string memory destinationChain) external returns (uint64 nonce)"
    ], signer);
    
    const testAmount = ethers.parseUnits("0.1", 6);
    const recipient = wallet.address;
    
    try {
      // Call executeCCTP with gas limit to see where it fails
      const gasEstimate = await smartWalletContract.executeCCTP.estimateGas(
        testAmount,
        11155111, // Sepolia chain ID
        recipient,
        "Sepolia"
      );
      
      console.log("✅ Gas estimate successful:", gasEstimate.toString());
      
      // Now try the actual transaction
      const tx = await smartWalletContract.executeCCTP(
        testAmount,
        11155111, // Sepolia chain ID
        recipient,
        "Sepolia",
        { gasLimit: gasEstimate }
      );
      
      console.log("✅ executeCCTP transaction sent!");
      console.log("📋 Transaction hash:", tx.hash);
      
      const receipt = await tx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("📋 Gas used:", receipt.gasUsed.toString());
      
    } catch (error) {
      console.log("❌ executeCCTP failed:", error.message);
      
      // Check if it's a gas estimation error
      if (error.message.includes("gas")) {
        console.log("🔍 This is a gas estimation error - the transaction would fail");
      }
      
      // Try to get more details about the revert
      if (error.data) {
        console.log("📋 Error data:", error.data);
      }
      
      // Try to call the function statically to see the exact error
      try {
        await smartWalletContract.executeCCTP.staticCall(
          testAmount,
          11155111,
          recipient,
          "Sepolia"
        );
      } catch (staticError) {
        console.log("📋 Static call error:", staticError.message);
      }
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});