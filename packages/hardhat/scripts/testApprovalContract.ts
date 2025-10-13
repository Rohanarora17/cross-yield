import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 TESTING APPROVAL FROM CONTRACT");
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
  console.log("💰 USDC:", usdcAddress);
  console.log("📡 TokenMessenger:", tokenMessengerAddress);
  
  try {
    // Deploy ApprovalTest contract
    console.log("\n🏗️ Deploying ApprovalTest contract...");
    const ApprovalTest = await ethers.getContractFactory("ApprovalTest");
    const approvalTest = await ApprovalTest.deploy(usdcAddress);
    await approvalTest.waitForDeployment();
    const approvalTestAddress = await approvalTest.getAddress();
    console.log("✅ ApprovalTest deployed:", approvalTestAddress);
    
    // Transfer some USDC to the test contract
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function transfer(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const testAmount = ethers.parseUnits("0.1", 6);
    
    console.log("\n📤 Transferring USDC to test contract...");
    const transferTx = await usdcContract.transfer(approvalTestAddress, testAmount);
    await transferTx.wait();
    console.log("✅ Transfer complete");
    
    // Check balance
    const balance = await approvalTest.testBalance();
    console.log("💰 Test contract USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    
    // Test approval from contract
    console.log("\n🧪 Testing approval from contract...");
    try {
      const approvalTx = await approvalTest.testApproval(tokenMessengerAddress, testAmount);
      await approvalTx.wait();
      console.log("✅ Contract approval successful");
      
      // Check allowance
      const allowance = await usdcContract.allowance(approvalTestAddress, tokenMessengerAddress);
      console.log("📋 Allowance:", ethers.formatUnits(allowance, 6), "USDC");
      
    } catch (error) {
      console.log("❌ Contract approval failed:", error.message);
    }
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});