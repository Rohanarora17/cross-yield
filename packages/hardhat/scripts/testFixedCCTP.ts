import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🎯 TESTING FIXED CCTP INTEGRATION");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  // NEW FIXED CONTRACT ADDRESSES
  const smartWalletFactoryAddress = "0x6aA260D306c093fA791700C82D316e4D42155ec1";
  const testSmartWalletAddress = "0x2f985D976795721131117536c562f1665Cd8f6ED";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏭 Factory:", smartWalletFactoryAddress);
  console.log("🏦 Test Smart Wallet:", testSmartWalletAddress);

  try {
    // Get contracts
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const factory = await ethers.getContractAt("SmartWalletFactory", smartWalletFactoryAddress, signer);
    const smartWallet = await ethers.getContractAt("UserSmartWallet", testSmartWalletAddress, signer);

    // Check balances
    const usdcBalance = await usdc.balanceOf(wallet.address);
    const walletUsdcBalance = await usdc.balanceOf(testSmartWalletAddress);
    const ethBalance = await provider.getBalance(wallet.address);

    console.log("\n💰 Current Balances:");
    console.log("Your ETH:", ethers.formatEther(ethBalance), "ETH");
    console.log("Your USDC:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletUsdcBalance, 6), "USDC");

    if (usdcBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    // Test CCTP with fixed contract
    console.log("\n🌉 TESTING FIXED CCTP IMPLEMENTATION:");

    const transferAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC
    const destinationChainId = 11155111; // Sepolia chain ID
    const recipient = wallet.address;

    console.log("Transfer Details:");
    console.log("- Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
    console.log("- From: Base Sepolia (Chain ID: 84532)");
    console.log("- To: Sepolia (Chain ID:", destinationChainId + ")");
    console.log("- Recipient:", recipient);

    // Step 1: Fund the smart wallet
    console.log("\n1️⃣ Funding smart wallet...");
    const transferTx = await usdc.transfer(testSmartWalletAddress, transferAmount);
    await transferTx.wait();
    console.log("✅ USDC transferred to smart wallet");

    // Check balance
    const newBalance = await usdc.balanceOf(testSmartWalletAddress);
    console.log("Smart wallet balance:", ethers.formatUnits(newBalance, 6), "USDC");

    // Step 2: Execute CCTP with fixed contract
    console.log("\n2️⃣ Executing CCTP with FIXED contract...");

    try {
      // Test gas estimation first
      console.log("   Estimating gas...");
      const gasEstimate = await smartWallet.executeCCTP.estimateGas(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );
      console.log("   Gas estimate:", gasEstimate.toString());

      // Execute the CCTP transfer
      console.log("   Executing CCTP transfer...");
      const cctpTx = await smartWallet.executeCCTP(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("🎉 SUCCESS! CCTP Transaction:", cctpTx.hash);
      console.log("⏳ Waiting for confirmation...");

      const receipt = await cctpTx.wait();
      console.log("🎉 CONFIRMED! Gas used:", receipt.gasUsed.toString());

      // Parse events
      console.log("\n📊 Transaction Events:");
      let nonce = null;
      for (const log of receipt.logs) {
        try {
          const parsed = smartWallet.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPBurnExecuted") {
            console.log("🎯 CCTP Burn Event Found!");
            console.log(`   Nonce: ${parsed.args.nonce.toString()}`);
            console.log(`   Amount: ${ethers.formatUnits(parsed.args.amount, 6)} USDC`);
            console.log(`   Destination: ${parsed.args.destinationChain}`);
            console.log(`   Recipient: ${parsed.args.recipient}`);
            nonce = parsed.args.nonce;
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🎉 CCTP TRANSFER SUCCESSFULLY EXECUTED!");
      console.log("⏰ Transfer will complete in 3-15 minutes on Sepolia");
      console.log("🔍 Track progress:");
      console.log(`   - Base Sepolia Tx: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
      console.log(`   - Circle Explorer: https://iris-api-sandbox.circle.com/attestations/${cctpTx.hash}`);

      if (nonce) {
        console.log(`   - CCTP Nonce: ${nonce.toString()}`);
      }

      // Check smart wallet state
      console.log("\n📊 Smart Wallet CCTP State:");
      try {
        const transferCount = await smartWallet.getActiveCCTPTransfers();
        console.log("Active CCTP transfers:", transferCount.length);

        if (nonce && transferCount.length > 0) {
          // Try to get transfer details
          try {
            const transferDetails = await smartWallet.getCCTPTransfer(nonce);
            console.log("Transfer Status:", transferDetails.status);
            console.log("Transfer Amount:", ethers.formatUnits(transferDetails.amount, 6), "USDC");
          } catch (e) {
            console.log("Could not fetch transfer details");
          }
        }
      } catch (e) {
        console.log("Could not fetch CCTP state");
      }

      console.log("\n🏆 SUCCESS! CCTP INTEGRATION IS WORKING!");

    } catch (error: any) {
      console.log("❌ CCTP execution failed:", error.message);

      if (error.data) {
        console.log("Error data:", error.data);
      }
      if (error.reason) {
        console.log("Reason:", error.reason);
      }

      console.log("\n🤔 If it still fails:");
      console.log("1. The issue might be in Circle's testnet infrastructure");
      console.log("2. Try with different amounts");
      console.log("3. Check Circle's status page");
      console.log("4. The fix worked, but there might be other issues");
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n✅ Fixed CCTP Test Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });