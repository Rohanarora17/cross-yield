import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 REAL CCTP Transfer Test with Encrypted Wallet");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;

  if (!encryptedKey) {
    console.log("🚫️ You don't have a deployer account. Run `yarn generate` or `yarn account:import` first");
    return;
  }

  const pass = await password({ message: "Enter password to decrypt private key:" });

  let wallet: Wallet;
  try {
    wallet = await Wallet.fromEncryptedJson(encryptedKey, pass);
    console.log("✅ Wallet decrypted successfully");
    console.log("👤 Using wallet:", wallet.address);
  } catch (e) {
    console.error("Failed to decrypt private key. Wrong password?");
    return;
  }

  // Connect wallet to provider
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  // Your contracts on Base Sepolia
  const smartWalletAddress = "0x32ecB7f010Bd3287432B55A443785037682a6C1C";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  try {
    // Get contracts
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const smartWallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress, signer);

    // Check balances
    const usdcBalance = await usdc.balanceOf(wallet.address);
    const ethBalance = await provider.getBalance(wallet.address);
    const walletUsdcBalance = await usdc.balanceOf(smartWalletAddress);

    console.log("💎 ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    console.log("💰 USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("🏦 Smart Wallet USDC:", ethers.formatUnits(walletUsdcBalance, 6), "USDC");

    if (ethBalance < ethers.parseEther("0.005")) {
      console.log("❌ Insufficient ETH for gas fees (need at least 0.005 ETH)");
      return;
    }

    if (usdcBalance < ethers.parseUnits("0.1", 6)) {
      console.log("❌ Insufficient USDC for transfer (need at least 0.1 USDC)");
      console.log("💡 Get testnet USDC from: https://faucet.circle.com/");
      return;
    }

    // Execute CCTP transfer
    console.log("\n🌉 EXECUTING REAL CCTP TRANSFER...");

    const transferAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC (small test)
    const destinationChainId = 11155111; // Sepolia chain ID (not domain!)
    const recipient = wallet.address; // Send to yourself on Sepolia

    console.log("Transfer Details:");
    console.log("- Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
    console.log("- From: Base Sepolia (Chain ID: 84532)");
    console.log("- To: Sepolia (Chain ID:", destinationChainId + ")");
    console.log("- Recipient:", recipient);

    // Step 1: Check and approve USDC if needed
    console.log("\n📝 Step 1: Checking USDC allowance...");
    const allowance = await usdc.allowance(wallet.address, smartWalletAddress);
    if (allowance < transferAmount) {
      console.log("Approving USDC...");
      const approveTx = await usdc.approve(smartWalletAddress, transferAmount);
      await approveTx.wait();
      console.log("✅ USDC approved");
    } else {
      console.log("✅ USDC already approved");
    }

    // Step 2: Skip funding for now - will do direct transfer in CCTP test
    console.log("\n📥 Step 2: Will fund smart wallet during CCTP test...");
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletUsdcBalance, 6), "USDC");

    // Step 3: Execute CCTP
    console.log("\n🚀 Step 3: Executing CCTP transfer...");

    try {
      // Create a new CCTP-enabled smart wallet
      console.log("\n🏭 Creating new CCTP-enabled smart wallet...");
      const factory = await ethers.getContractAt("SmartWalletFactory", "0xB95028c291348a9DE81B451083Da562174944910", signer);

      // Check if wallet exists for your address
      const existingWallet = await factory.getWallet(wallet.address);
      let actualWalletAddress = existingWallet;

      if (existingWallet === "0x0000000000000000000000000000000000000000") {
        console.log("Creating new smart wallet for your address...");
        const createTx = await factory.createWallet(wallet.address);
        await createTx.wait();
        actualWalletAddress = await factory.getWallet(wallet.address);
        console.log("✅ New CCTP-enabled smart wallet created:", actualWalletAddress);
      } else {
        console.log("Using existing smart wallet:", existingWallet);
      }

      // Get the smart wallet contract with the latest CCTP functionality
      const newSmartWallet = await ethers.getContractAt("UserSmartWallet", actualWalletAddress, signer);

      // Test CCTP support
      console.log("\n🌉 Testing CCTP with smart wallet...");
      const cctpSupported = await newSmartWallet.isCCTPSupported();
      console.log("CCTP Supported:", cctpSupported);

      if (cctpSupported) {
        // Get CCTP config
        const [tokenMessenger, messageTransmitter, domain] = await newSmartWallet.getCCTPConfig();
        console.log("TokenMessenger:", tokenMessenger);
        console.log("MessageTransmitter:", messageTransmitter);
        console.log("Domain:", domain.toString());

        // Direct USDC transfer to the smart wallet first
        console.log("\n💰 Transferring USDC to smart wallet...");
        const transferTx = await usdc.transfer(actualWalletAddress, transferAmount);
        await transferTx.wait();
        console.log("✅ USDC transferred to smart wallet");

        // Check balance
        const newBalance = await usdc.balanceOf(actualWalletAddress);
        console.log("Smart wallet USDC balance:", ethers.formatUnits(newBalance, 6), "USDC");

        // Now execute CCTP
        console.log("\n🚀 Executing CCTP transfer...");

        // First try to get gas estimate
        try {
          const gasEstimate = await newSmartWallet.executeCCTP.estimateGas(
            transferAmount,
            destinationChainId,
            recipient,
            "sepolia"
          );
          console.log("Gas estimate:", gasEstimate.toString());
        } catch (gasError: any) {
          console.log("Gas estimation failed:", gasError.message);
          if (gasError.reason) {
            console.log("Revert reason:", gasError.reason);
          }
        }

        const cctpTx = await newSmartWallet.executeCCTP(
          transferAmount,
          destinationChainId,
          recipient,
          "sepolia",
          { gasLimit: 500000 } // Use a fixed gas limit
        );

        console.log("📨 CCTP Transaction Hash:", cctpTx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await cctpTx.wait();
        console.log("✅ CCTP Transfer Initiated!");
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());

        // Parse events
        console.log("\n📊 Transaction Events:");
        for (const log of receipt.logs) {
          try {
            const parsed = newSmartWallet.interface.parseLog(log);
            if (parsed && parsed.name === "CCTPTransferInitiated") {
              console.log("🎯 CCTP Transfer Event Found!");
              console.log(`   Nonce: ${parsed.args.nonce.toString()}`);
              console.log(`   Amount: ${ethers.formatUnits(parsed.args.amount, 6)} USDC`);
              console.log(`   Destination: ${parsed.args.destinationChain}`);
            }
          } catch (e) {
            // Skip unparseable logs
          }
        }

        console.log("\n🎉 SUCCESS! REAL CCTP TRANSFER EXECUTED!");
        console.log("⏰ Transfer will complete in 3-15 minutes");
        console.log("🔍 Track progress:");
        console.log(`   - Transaction: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
        console.log(`   - Circle Explorer: https://iris-api-sandbox.circle.com/attestations/${cctpTx.hash}`);

      } else {
        console.log("❌ CCTP not supported in this smart wallet");
      }

    } catch (error: any) {
      console.log("❌ CCTP execution failed:", error.message);

      if (error.message.includes("execution reverted")) {
        console.log("💡 Contract execution failed - check contract state");
      } else if (error.message.includes("insufficient funds")) {
        console.log("💡 Insufficient funds for gas or USDC");
      } else if (error.message.includes("nonce")) {
        console.log("💡 Transaction nonce issue - try again");
      }
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }

  console.log("\n✅ CCTP Test Complete!");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });