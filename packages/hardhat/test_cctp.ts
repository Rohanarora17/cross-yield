import { ethers } from "hardhat";
import { parseUnits, formatUnits } from "ethers";

async function main() {
  console.log("🧪 Testing CCTP Integration on Live Testnets");
  console.log("=" .repeat(60));

  // Test configurations for different networks
  const testConfigs = {
    sepolia: {
      rpcUrl: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      chainId: 11155111,
      smartWalletFactory: "0xc3196c01cbe5904A67fb539281691003A844159d",
      yieldRouter: "0xeB6b0Eef0B1a9De992DA6887F52CF218bc04BF26",
      usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      cctpDomain: 0
    },
    baseSepolia: {
      rpcUrl: "https://base-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY",
      chainId: 84532,
      smartWalletFactory: "0xB95028c291348a9DE81B451083Da562174944910",
      yieldRouter: "0x0AddD99eAf7597C64cf719a1B11958196E305731",
      usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      cctpDomain: 6
    },
    arbitrumSepolia: {
      rpcUrl: "https://arbitrum-sepolia.infura.io/v3/YOUR_INFURA_KEY",
      chainId: 421614,
      smartWalletFactory: "0x97Ce69a3b569903B64bc49e6D91077e1ce59959b",
      yieldRouter: "0x17f68347966D3372c07b481801E8Dfc57AB90865",
      usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
      cctpDomain: 3
    }
  };

  const [deployer] = await ethers.getSigners();
  console.log("👤 Testing with account:", deployer.address);

  // Check account balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("👤 Account ETH Balance:", ethers.formatEther(balance), "ETH");

  // Test 1: Verify Smart Wallet Creation and CCTP Setup
  console.log("\n🏭 Testing Smart Wallet Factory...");

  try {
    const factory = await ethers.getContractAt(
      "SmartWalletFactory",
      testConfigs.baseSepolia.smartWalletFactory
    );

    // Check if wallet already exists
    let walletAddress;
    try {
      walletAddress = await factory.getWallet(deployer.address);
      if (walletAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("No wallet exists");
      }
      console.log("✅ Existing Smart Wallet:", walletAddress);
    } catch {
      console.log("📝 Creating new smart wallet...");
      const createTx = await factory.createWallet(deployer.address);
      await createTx.wait();
      walletAddress = await factory.getWallet(deployer.address);
      console.log("✅ New Smart Wallet Created:", walletAddress);
    }

    // Test 2: Verify CCTP Configuration
    console.log("\n🌉 Testing CCTP Configuration...");
    const wallet = await ethers.getContractAt("UserSmartWallet", walletAddress);

    const cctpSupported = await wallet.isCCTPSupported();
    console.log("CCTP Supported:", cctpSupported);

    if (cctpSupported) {
      const [tokenMessenger, messageTransmitter, domain] = await wallet.getCCTPConfig();
      console.log("TokenMessenger:", tokenMessenger);
      console.log("MessageTransmitter:", messageTransmitter);
      console.log("CCTP Domain:", domain.toString());
      console.log("✅ CCTP Configuration Valid");
    }

    // Test 3: Check USDC Balance and Allowance
    console.log("\n💰 Checking USDC Status...");
    const usdc = await ethers.getContractAt("IERC20", testConfigs.baseSepolia.usdcAddress);

    const balance = await usdc.balanceOf(deployer.address);
    const walletBalance = await usdc.balanceOf(walletAddress);

    console.log("Your USDC Balance:", formatUnits(balance, 6), "USDC");
    console.log("Wallet USDC Balance:", formatUnits(walletBalance, 6), "USDC");

    // Test 4: Simulate CCTP Transfer (if we have USDC)
    if (balance > 0) {
      console.log("\n🚀 Testing CCTP Transfer Simulation...");

      const transferAmount = parseUnits("1", 6); // 1 USDC
      const destinationDomain = testConfigs.sepolia.cctpDomain; // Transfer to Sepolia
      const recipient = deployer.address;

      try {
        // First approve the smart wallet to spend USDC
        console.log("📝 Approving USDC transfer...");
        const approveTx = await usdc.approve(walletAddress, transferAmount);
        await approveTx.wait();
        console.log("✅ USDC approved");

        // Deposit USDC to smart wallet first
        console.log("📥 Depositing USDC to smart wallet...");
        const depositTx = await wallet.depositUSDC(transferAmount);
        await depositTx.wait();
        console.log("✅ USDC deposited to smart wallet");

        // Now test CCTP transfer
        console.log("🌉 Initiating CCTP transfer...");
        console.log(`Amount: ${formatUnits(transferAmount, 6)} USDC`);
        console.log(`From: Base Sepolia (Domain ${testConfigs.baseSepolia.cctpDomain})`);
        console.log(`To: Sepolia (Domain ${destinationDomain})`);
        console.log(`Recipient: ${recipient}`);

        // Get the transfer fee and gas estimate
        const gasEstimate = await wallet.executeCCTP.estimateGas(
          transferAmount,
          destinationDomain,
          recipient,
          "sepolia"
        );

        console.log(`Estimated Gas: ${gasEstimate.toString()}`);

        // Execute the CCTP transfer
        const cctpTx = await wallet.executeCCTP(
          transferAmount,
          destinationDomain,
          recipient,
          "sepolia",
          { gasLimit: gasEstimate * 120n / 100n } // 20% buffer
        );

        console.log("📨 CCTP Transfer Transaction:", cctpTx.hash);
        const receipt = await cctpTx.wait();
        console.log("✅ CCTP Transfer Initiated!");

        // Parse events to get the nonce
        const events = receipt.logs;
        for (const event of events) {
          try {
            const parsed = wallet.interface.parseLog(event);
            if (parsed?.name === "CCTPTransferInitiated") {
              console.log("🎯 CCTP Nonce:", parsed.args.nonce.toString());
              console.log("🎯 Burn Amount:", formatUnits(parsed.args.amount, 6), "USDC");
              console.log("🎯 Destination Domain:", parsed.args.destinationDomain);
            }
          } catch {}
        }

        // Check transfer status
        console.log("\n📊 Checking Transfer Status...");
        const transferCount = await wallet.getCCTPTransferCount();
        console.log("Total CCTP Transfers:", transferCount.toString());

        if (transferCount > 0) {
          const latestTransfer = await wallet.getCCTPTransfer(transferCount - 1n);
          console.log("Latest Transfer Status:", latestTransfer.status);
          console.log("Latest Transfer Amount:", formatUnits(latestTransfer.amount, 6), "USDC");
          console.log("Latest Transfer Destination:", latestTransfer.destinationChain);
        }

      } catch (error) {
        console.log("⚠️ CCTP Transfer Test Failed:", error.message);
        if (error.message.includes("insufficient funds")) {
          console.log("💡 Note: You need testnet USDC to test transfers");
          console.log("💡 Get testnet USDC from: https://faucet.circle.com/");
        }
      }
    } else {
      console.log("⚠️ No USDC balance found for testing transfers");
      console.log("💡 Get testnet USDC from: https://faucet.circle.com/");
    }

    // Test 5: Test Batch Operations
    console.log("\n🔄 Testing Batch Operations...");
    try {
      const batchData = await wallet.getBatchExecutionStatus();
      console.log("Batch Execution Status:", batchData);
      console.log("✅ Batch operations interface working");
    } catch (error) {
      console.log("⚠️ Batch operations test failed:", error.message);
    }

    console.log("\n🎉 CCTP Testing Complete!");
    console.log("=" .repeat(60));

  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });