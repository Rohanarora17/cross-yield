import { ethers } from "hardhat";
import { formatUnits, parseUnits } from "ethers";

async function main() {
  console.log("🚀 LIVE CCTP Transfer Test");
  console.log("=" .repeat(60));

  // Use your encrypted wallet
  const [signer] = await ethers.getSigners();
  console.log("👤 Using wallet:", signer.address);

  // Your existing smart wallet (discovered from previous test)
  const smartWalletAddress = "0x32ecB7f010Bd3287432B55A443785037682a6C1C";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("🎯 Smart Wallet:", smartWalletAddress);
  console.log("💰 USDC Address:", usdcAddress);

  try {
    // Get contracts
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);
    const wallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress);

    // Check balances
    const usdcBalance = await usdc.balanceOf(signer.address);
    const walletUsdcBalance = await usdc.balanceOf(smartWalletAddress);
    const ethBalance = await ethers.provider.getBalance(signer.address);

    console.log("💎 Your ETH:", formatUnits(ethBalance, 18), "ETH");
    console.log("💰 Your USDC:", formatUnits(usdcBalance, 6), "USDC");
    console.log("🏦 Wallet USDC:", formatUnits(walletUsdcBalance, 6), "USDC");

    if (usdcBalance > parseUnits("1", 6)) {
      console.log("\n🔄 Executing Real CCTP Transfer Test...");

      const transferAmount = parseUnits("1", 6); // 1 USDC
      const destinationDomain = 0; // Sepolia domain
      const recipient = signer.address; // Send back to yourself on Sepolia

      console.log("Amount:", formatUnits(transferAmount, 6), "USDC");
      console.log("From: Base Sepolia (Domain 6)");
      console.log("To: Sepolia (Domain 0)");
      console.log("Recipient:", recipient);

      // Step 1: Approve smart wallet to spend USDC
      console.log("\n📝 Step 1: Approving USDC...");
      const approveTx = await usdc.approve(smartWalletAddress, transferAmount);
      await approveTx.wait();
      console.log("✅ USDC approved for smart wallet");

      // Step 2: Deposit USDC to smart wallet
      console.log("\n📥 Step 2: Depositing USDC to smart wallet...");
      const depositTx = await wallet.depositUSDC(transferAmount);
      await depositTx.wait();
      console.log("✅ USDC deposited to smart wallet");

      // Check wallet balance after deposit
      const newWalletBalance = await usdc.balanceOf(smartWalletAddress);
      console.log("🏦 Wallet USDC after deposit:", formatUnits(newWalletBalance, 6), "USDC");

      // Step 3: Execute CCTP transfer
      console.log("\n🌉 Step 3: Executing CCTP transfer...");

      try {
        const cctpTx = await wallet.executeCCTP(
          transferAmount,
          destinationDomain,
          recipient,
          "sepolia"
        );

        console.log("📨 CCTP Transaction:", cctpTx.hash);
        console.log("⏳ Waiting for confirmation...");

        const receipt = await cctpTx.wait();
        console.log("✅ CCTP Transfer Transaction Confirmed!");
        console.log("⛽ Gas Used:", receipt.gasUsed.toString());

        // Parse events
        console.log("\n📊 Transaction Events:");
        for (const log of receipt.logs) {
          try {
            const parsed = wallet.interface.parseLog(log);
            if (parsed) {
              console.log(`🎯 Event: ${parsed.name}`);
              if (parsed.name === "CCTPTransferInitiated") {
                console.log(`   Nonce: ${parsed.args.nonce}`);
                console.log(`   Amount: ${formatUnits(parsed.args.amount, 6)} USDC`);
                console.log(`   Destination: ${parsed.args.destinationChain}`);
              }
            }
          } catch {
            // Skip unparseable logs
          }
        }

        console.log("\n🎉 CCTP TRANSFER SUCCESSFULLY INITIATED!");
        console.log("⏰ Transfer will complete in 3-15 minutes");
        console.log("🔍 Monitor on Circle Explorer:");
        console.log(`   https://iris-api-sandbox.circle.com/attestations/${receipt.transactionHash}`);

      } catch (error) {
        console.log("❌ CCTP execution failed:", error.message);
        if (error.message.includes("executeCCTP")) {
          console.log("💡 This might be due to missing function in deployed contract");
          console.log("💡 Check if the smart wallet has the latest CCTP functions");
        }
      }

    } else {
      console.log("\n⚠️ Not enough USDC for transfer test");
      console.log("💡 You need at least 1 USDC for testing");
      console.log("💡 Get testnet USDC from: https://faucet.circle.com/");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("\n✅ CCTP Transfer Test Complete!");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });