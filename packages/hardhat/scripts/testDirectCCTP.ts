import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔥 TESTING DIRECT CCTP - No Smart Wallet");
  console.log("=" .repeat(60));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("PRIVATE_KEY not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  // Base Sepolia addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  console.log("👤 Your Wallet:", wallet.address);
  console.log("💰 USDC:", usdcAddress);
  console.log("📡 TokenMessenger:", tokenMessengerAddress);
  
  try {
    // Check USDC balance
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address, uint256) external returns (bool)",
      "function allowance(address, address) external view returns (uint256)"
    ], signer);
    
    const balance = await usdcContract.balanceOf(wallet.address);
    console.log("💰 Your USDC balance:", ethers.formatUnits(balance, 6), "USDC");
    
    if (balance < ethers.parseUnits("0.1", 6)) {
      console.log("❌ Insufficient USDC balance for test");
      return;
    }
    
    const testAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const recipient = wallet.address; // Send to self for testing
    
    console.log("\n🔥 TESTING DIRECT CCTP:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);
    console.log("- Destination Domain: 0 (Sepolia)");
    
    // Step 1: Approve TokenMessenger
    console.log("\n1. Approving TokenMessenger to spend USDC...");
    const approveTx = await usdcContract.approve(tokenMessengerAddress, testAmount);
    await approveTx.wait();
    console.log("✅ Approval complete");
    
    // Step 2: Check allowance
    const allowance = await usdcContract.allowance(wallet.address, tokenMessengerAddress);
    console.log("📋 Allowance:", ethers.formatUnits(allowance, 6), "USDC");
    
    // Step 3: Call depositForBurn directly
    console.log("\n2. Calling depositForBurn directly...");
    
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
    ], signer);
    
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    
    console.log("📋 Parameters:");
    console.log("- amount:", testAmount.toString());
    console.log("- destinationDomain: 0");
    console.log("- mintRecipient:", mintRecipient);
    console.log("- burnToken:", usdcAddress);
    console.log("- hookData: 0x0000...");
    console.log("- maxFee: 1000");
    console.log("- finalityThreshold: 2000");
    
    try {
      const burnTx = await tokenMessengerContract.depositForBurn(
        testAmount,
        0, // Sepolia domain
        mintRecipient,
        usdcAddress,
        "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
        1000, // maxFee
        2000  // finalityThreshold
      );
      
      console.log("✅ CCTP burn transaction sent!");
      console.log("📋 Transaction hash:", burnTx.hash);
      
      const receipt = await burnTx.wait();
      console.log("✅ Transaction confirmed!");
      console.log("📋 Gas used:", receipt.gasUsed.toString());
      
      // Check for DepositForBurn event
      const depositForBurnEvent = receipt.logs.find(log => {
        try {
          const parsed = tokenMessengerContract.interface.parseLog(log);
          return parsed.name === "DepositForBurn";
        } catch {
          return false;
        }
      });
      
      if (depositForBurnEvent) {
        const parsed = tokenMessengerContract.interface.parseLog(depositForBurnEvent);
        console.log("🎉 DepositForBurn event found!");
        console.log("- Nonce:", parsed.args.nonce.toString());
        console.log("- Amount:", ethers.formatUnits(parsed.args.amount, 6), "USDC");
        console.log("- Mint Recipient:", parsed.args.mintRecipient);
        console.log("- Destination Domain:", parsed.args.destinationDomain.toString());
      } else {
        console.log("⚠️ No DepositForBurn event found");
      }
      
    } catch (error) {
      console.log("❌ Direct CCTP call failed:", error.message);
      
      // Try to decode the error
      if (error.data) {
        console.log("📋 Error data:", error.data);
      }
      
      // Try with different parameters
      console.log("\n🔄 Trying with different parameters...");
      
      try {
        // Try V1 interface (4 parameters)
        const v1Contract = new ethers.Contract(tokenMessengerAddress, [
          "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"
        ], signer);
        
        const v1Tx = await v1Contract.depositForBurn(
          testAmount,
          0, // Sepolia domain
          mintRecipient,
          usdcAddress
        );
        
        console.log("✅ V1 interface worked!");
        console.log("📋 Transaction hash:", v1Tx.hash);
        
      } catch (v1Error) {
        console.log("❌ V1 interface also failed:", v1Error.message);
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