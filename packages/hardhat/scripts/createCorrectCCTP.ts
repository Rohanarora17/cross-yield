import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🎯 CREATING CORRECT CCTP TRANSFER");
  console.log("=" .repeat(50));
  console.log("🚨 TASK: Create CCTP transfer to Ethereum Sepolia");
  console.log("🚨 Destination Domain: 11155111 (Ethereum Sepolia)");
  console.log("=" .repeat(50));
  
  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  if (!encryptedKey) {
    throw new Error("DEPLOYER_PRIVATE_KEY_ENCRYPTED not found in .env");
  }
  
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);
  
  console.log("👤 Your Wallet:", wallet.address);
  
  try {
    // Check USDC balance
    const usdcAddress = "0x036cbd53842c5426634e7929541ec2318f3dcf7e"; // Base Sepolia USDC
    const usdcContract = new ethers.Contract(usdcAddress, [
      "function balanceOf(address) external view returns (uint256)",
      "function approve(address spender, uint256 amount) external returns (bool)"
    ], signer);
    
    const balance = await usdcContract.balanceOf(wallet.address);
    console.log("💰 USDC Balance:", ethers.formatUnits(balance, 6), "USDC");
    
    if (balance < ethers.parseUnits("0.1", 6)) {
      console.log("❌ Insufficient USDC balance. Need at least 0.1 USDC");
      return;
    }
    
    // Create CCTP transfer to Ethereum Sepolia
    const amount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const destinationDomain = 11155111; // Ethereum Sepolia
    const recipient = wallet.address; // Your wallet on Sepolia
    
    console.log("\n🎯 CREATING CCTP TRANSFER:");
    console.log("📋 Amount:", ethers.formatUnits(amount, 6), "USDC");
    console.log("📋 Destination Domain:", destinationDomain, "(Ethereum Sepolia)");
    console.log("📋 Recipient:", recipient);
    
    // TokenMessenger address on Base Sepolia
    const tokenMessengerAddress = "0x1682ae6375c4e4a4e0804885eea2f50878ddf326";
    
    // Approve USDC for TokenMessenger
    console.log("\n📋 Approving USDC for TokenMessenger...");
    const approveTx = await usdcContract.approve(tokenMessengerAddress, amount);
    await approveTx.wait();
    console.log("✅ USDC approved");
    
    // Create CCTP transfer
    const tokenMessengerContract = new ethers.Contract(tokenMessengerAddress, [
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes memory hookData, uint256 maxFee, uint256 finalityThreshold) external returns (uint64 nonce)"
    ], signer);
    
    const mintRecipient = ethers.zeroPadValue(recipient, 32);
    const hookData = "0x";
    const maxFee = 1000;
    const finalityThreshold = 2000;
    
    console.log("\n📋 Calling depositForBurn...");
    console.log("📋 Parameters:");
    console.log("  - amount:", ethers.formatUnits(amount, 6), "USDC");
    console.log("  - destinationDomain:", destinationDomain);
    console.log("  - mintRecipient:", mintRecipient);
    console.log("  - burnToken:", usdcAddress);
    console.log("  - hookData:", hookData);
    console.log("  - maxFee:", maxFee);
    console.log("  - finalityThreshold:", finalityThreshold);
    
    const burnTx = await tokenMessengerContract.depositForBurn(
      amount,
      destinationDomain,
      mintRecipient,
      usdcAddress,
      hookData,
      maxFee,
      finalityThreshold
    );
    
    console.log("✅ Burn transaction sent!");
    console.log("📋 Transaction hash:", burnTx.hash);
    
    const burnReceipt = await burnTx.wait();
    console.log("✅ Burn transaction confirmed!");
    console.log("📋 Gas used:", burnReceipt.gasUsed.toString());
    console.log("📋 Block number:", burnReceipt.blockNumber);
    
    // Extract the nonce from the transaction
    const nonce = await burnTx.wait().then(receipt => {
      const event = receipt.logs.find(log => {
        try {
          const parsed = tokenMessengerContract.interface.parseLog(log);
          return parsed.name === "MessageSent";
        } catch {
          return false;
        }
      });
      return event ? tokenMessengerContract.interface.parseLog(event).args.nonce : null;
    });
    
    if (nonce) {
      console.log("📋 Nonce:", nonce.toString());
    }
    
    console.log("\n🎉 CCTP TRANSFER CREATED SUCCESSFULLY!");
    console.log("✅ USDC burned on Base Sepolia");
    console.log("✅ Transfer initiated to Ethereum Sepolia");
    console.log("✅ Transaction hash:", burnTx.hash);
    
    console.log("\n📊 NEXT STEPS:");
    console.log("1. Wait for Circle attestation (check with API)");
    console.log("2. Use attestation to mint USDC on Ethereum Sepolia");
    console.log("3. Verify USDC received on destination chain");
    
    console.log("\n🔍 MONITORING COMMAND:");
    console.log(`npx hardhat run scripts/monitorAttestation.ts --network baseSepolia`);
    console.log(`# Then check: https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${burnTx.hash}`);
    
  } catch (error) {
    console.error("❌ CCTP transfer failed:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});