const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 REAL CCTP Transfer Test");
  console.log("=" .repeat(60));

  // Your contracts on Base Sepolia
  const smartWalletAddress = "0x32ecB7f010Bd3287432B55A443785037682a6C1C";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  // Get signer (should be your encrypted wallet)
  const [signer] = await ethers.getSigners();
  console.log("👤 Using wallet:", signer.address);

  // Check if this is your actual wallet
  const expectedAddress = "0xCE54cF5a0dE3843011cF20389C1b6a4AaC442d6A";
  if (signer.address.toLowerCase() !== expectedAddress.toLowerCase()) {
    console.log("⚠️  Warning: Using different wallet than expected");
    console.log("Expected:", expectedAddress);
    console.log("Actual:", signer.address);
  }

  try {
    // Get contracts
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);
    const wallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress);

    // Check balances
    const usdcBalance = await usdc.balanceOf(signer.address);
    const ethBalance = await ethers.provider.getBalance(signer.address);
    const walletUsdcBalance = await usdc.balanceOf(smartWalletAddress);

    console.log("💎 ETH Balance:", ethers.formatEther(ethBalance), "ETH");
    console.log("💰 USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");
    console.log("🏦 Smart Wallet USDC:", ethers.formatUnits(walletUsdcBalance, 6), "USDC");

    if (ethBalance < ethers.parseEther("0.01")) {
      console.log("❌ Insufficient ETH for gas fees");
      return;
    }

    if (usdcBalance < ethers.parseUnits("1", 6)) {
      console.log("❌ Insufficient USDC for transfer (need at least 1 USDC)");
      console.log("💡 Get testnet USDC from: https://faucet.circle.com/");
      return;
    }

    // Execute CCTP transfer
    console.log("\n🌉 EXECUTING REAL CCTP TRANSFER...");

    const transferAmount = ethers.parseUnits("0.1", 6); // 0.1 USDC (small test)
    const destinationDomain = 0; // Sepolia
    const recipient = signer.address; // Send to yourself on Sepolia

    console.log("Transfer Details:");
    console.log("- Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
    console.log("- From: Base Sepolia (Domain 6)");
    console.log("- To: Sepolia (Domain 0)");
    console.log("- Recipient:", recipient);

    // Step 1: Approve USDC
    console.log("\n📝 Step 1: Approving USDC...");
    const allowance = await usdc.allowance(signer.address, smartWalletAddress);
    if (allowance < transferAmount) {
      const approveTx = await usdc.approve(smartWalletAddress, transferAmount);
      await approveTx.wait();
      console.log("✅ USDC approved");
    } else {
      console.log("✅ USDC already approved");
    }

    // Step 2: Fund smart wallet
    console.log("\n📥 Step 2: Funding smart wallet...");
    if (walletUsdcBalance < transferAmount) {
      const depositTx = await wallet.depositUSDC(transferAmount);
      await depositTx.wait();
      console.log("✅ USDC deposited to smart wallet");
    } else {
      console.log("✅ Smart wallet already has sufficient USDC");
    }

    // Step 3: Execute CCTP
    console.log("\n🚀 Step 3: Executing CCTP transfer...");

    try {
      // Check if the executeCCTP function exists
      const walletInterface = wallet.interface;
      const hasExecuteCCTP = walletInterface.hasFunction("executeCCTP");

      if (!hasExecuteCCTP) {
        console.log("❌ executeCCTP function not found in smart wallet");
        console.log("💡 This means the smart wallet needs to be updated with CCTP functions");
        return;
      }

      const cctpTx = await wallet.executeCCTP(
        transferAmount,
        destinationDomain,
        recipient,
        "sepolia",
        { gasLimit: 500000 } // Set explicit gas limit
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
          const parsed = wallet.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPTransferInitiated") {
            console.log("🎯 CCTP Transfer Event Found!");
            console.log("   Nonce:", parsed.args.nonce.toString());
            console.log("   Amount:", ethers.formatUnits(parsed.args.amount, 6), "USDC");
            console.log("   Destination:", parsed.args.destinationChain);
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

      console.log("\n🎉 SUCCESS! CCTP Transfer Initiated!");
      console.log("⏰ Transfer will complete in 3-15 minutes");
      console.log("🔍 Track progress:");
      console.log(`   - Transaction: https://base-sepolia.blockscout.com/tx/${cctpTx.hash}`);
      console.log(`   - Circle Explorer: https://iris-api-sandbox.circle.com/attestations/${cctpTx.hash}`);

    } catch (error) {
      console.log("❌ CCTP execution failed:", error.message);

      if (error.message.includes("execution reverted")) {
        console.log("💡 Contract execution failed - check contract state");
      } else if (error.message.includes("insufficient funds")) {
        console.log("💡 Insufficient funds for gas or USDC");
      } else if (error.message.includes("nonce")) {
        console.log("💡 Transaction nonce issue - try again");
      }
    }

  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });