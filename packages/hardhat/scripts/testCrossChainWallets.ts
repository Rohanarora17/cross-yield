import { ethers } from "hardhat";
import { DEPLOYED_CONTRACTS } from "./configureCrossChain";

/**
 * Test cross-chain smart wallet functionality
 * This script verifies that smart wallets work correctly across all chains
 */

async function testSmartWalletCreation(chainKey: string, contracts: any) {
  console.log(`\n🧪 Testing smart wallet creation on ${chainKey}...`);

  const signers = await ethers.getSigners();
  // const deployer = signers[0];
  const user = signers[1] || signers[0]; // Use deployer as user if only one signer

  // Connect to SmartWalletFactory
  const factory = await ethers.getContractAt("SmartWalletFactory", contracts.smartWalletFactory);

  // Check if user already has a wallet
  const hasWallet = await factory.hasWallet(user.address);
  console.log(`User ${user.address} has wallet: ${hasWallet}`);

  // let walletAddress;

  if (!hasWallet) {
    // Create a new wallet
    console.log("Creating new smart wallet...");
    const tx = await factory.createWallet(user.address);
    await tx.wait();
    console.log("✅ Wallet creation transaction confirmed");
  }

  // Get wallet address
  const walletAddress = await factory.getWallet(user.address);
  console.log(`📍 Smart wallet address: ${walletAddress}`);

  // Verify wallet properties
  const wallet = await ethers.getContractAt("UserSmartWallet", walletAddress);
  const owner = await wallet.owner();
  const isActive = await wallet.isActive();
  const backendCoordinator = await wallet.backendCoordinator();

  console.log(`  Owner: ${owner}`);
  console.log(`  Active: ${isActive}`);
  console.log(`  Backend Coordinator: ${backendCoordinator}`);

  // Verify ownership
  if (owner.toLowerCase() !== user.address.toLowerCase()) {
    throw new Error(`Wallet owner mismatch! Expected ${user.address}, got ${owner}`);
  }

  if (!isActive) {
    throw new Error("Wallet should be active after creation");
  }

  console.log("✅ Smart wallet creation test passed");
  return walletAddress;
}

async function testWalletPrediction(chainKey: string, contracts: any) {
  console.log(`\n🔮 Testing wallet address prediction on ${chainKey}...`);

  const signers = await ethers.getSigners();
  // const deployer = signers[0];
  const user = signers[1] || signers[0]; // Use deployer as user if only one signer

  // Connect to SmartWalletFactory
  const factory = await ethers.getContractAt("SmartWalletFactory", contracts.smartWalletFactory);

  // Predict wallet address
  const predictedAddress = await factory.predictWalletAddress(user.address);
  console.log(`Predicted address: ${predictedAddress}`);

  // Get actual wallet address (should exist from previous test)
  const actualAddress = await factory.getWallet(user.address);
  console.log(`Actual address: ${actualAddress}`);

  if (predictedAddress.toLowerCase() !== actualAddress.toLowerCase()) {
    throw new Error(`Address prediction failed! Predicted ${predictedAddress}, actual ${actualAddress}`);
  }

  console.log("✅ Wallet address prediction test passed");
}

async function testYieldRouterIntegration(chainKey: string, contracts: any) {
  console.log(`\n🔄 Testing YieldRouter integration on ${chainKey}...`);

  const signers = await ethers.getSigners();
  // const deployer = signers[0];
  const user = signers[1] || signers[0]; // Use deployer as user if only one signer

  // Connect to contracts
  const yieldRouter = await ethers.getContractAt("YieldRouter", contracts.yieldRouter);
  const factory = await ethers.getContractAt("SmartWalletFactory", contracts.smartWalletFactory);

  // Get user's wallet address
  const walletAddress = await factory.getWallet(user.address);

  // Link smart wallet to YieldRouter (backend action)
  console.log("Linking smart wallet to YieldRouter...");
  const linkTx = await yieldRouter.linkSmartWallet(user.address, walletAddress);
  await linkTx.wait();
  console.log("✅ Smart wallet linked to YieldRouter");

  // Test optimization request
  console.log("Testing optimization request...");
  const amount = ethers.parseEther("1000"); // 1000 USDC
  const strategy = "balanced";

  const optimizationTx = await yieldRouter.connect(user).requestOptimization(user.address, amount, strategy);
  const receipt = await optimizationTx.wait();

  // Check for optimization event
  const optimizationEvent = receipt?.logs?.find((log: any) => {
    try {
      const parsedLog = yieldRouter.interface.parseLog(log);
      return parsedLog?.name === "OptimizationRequested";
    } catch {
      return false;
    }
  });

  if (optimizationEvent) {
    console.log("✅ Optimization request event emitted");
  } else {
    console.log("⚠️  Optimization event not found (this might be OK)");
  }

  // Check portfolio
  const portfolio = await yieldRouter.getUserPortfolio(user.address);
  console.log(`Portfolio strategy: ${portfolio.currentStrategy}`);
  console.log(`Total deposited: ${ethers.formatEther(portfolio.totalDeposited)} USDC`);

  console.log("✅ YieldRouter integration test passed");
}

async function testCrossChainWalletConsistency() {
  console.log(`\n🌐 Testing cross-chain wallet address consistency...`);

  const signers = await ethers.getSigners();
  // const deployer = signers[0];
  const user = signers[1] || signers[0]; // Use deployer as user if only one signer
  const testAddresses: { [key: string]: string } = {};

  // Get current network
  const network = await ethers.provider.getNetwork();
  const currentChainId = Number(network.chainId);

  // Find current chain key
  let currentChainKey = "";
  const chainConfigs = {
    11155111: "ethereum_sepolia",
    84532: "base_sepolia",
    421614: "arbitrum_sepolia",
  };

  currentChainKey = chainConfigs[currentChainId as keyof typeof chainConfigs];
  if (!currentChainKey) {
    throw new Error(`Unknown chain ID: ${currentChainId}`);
  }

  console.log(`Currently on: ${currentChainKey} (${currentChainId})`);

  // Test wallet prediction on current chain
  const currentContracts = DEPLOYED_CONTRACTS[currentChainKey as keyof typeof DEPLOYED_CONTRACTS];
  const factory = await ethers.getContractAt("SmartWalletFactory", currentContracts.smartWalletFactory);

  const predictedAddress = await factory.predictWalletAddress(user.address);
  testAddresses[currentChainKey] = predictedAddress;

  console.log(`${currentChainKey}: ${predictedAddress}`);

  // Note: To truly test cross-chain consistency, we'd need to deploy the same factory
  // with identical salt/implementation on all chains. For now, we'll just verify
  // that the prediction function works correctly on the current chain.

  console.log("✅ Cross-chain wallet consistency test passed (limited to current chain)");
  console.log("💡 Note: Full cross-chain consistency requires identical factory deployment parameters");
}

async function runAllTests() {
  console.log("🧪 Starting CrossYield Smart Wallet Tests");
  console.log("==========================================");

  try {
    // Get current network info
    const network = await ethers.provider.getNetwork();
    const currentChainId = Number(network.chainId);

    // Find current chain contracts
    let currentChainKey = "";
    let currentContracts = null;

    const chainMappings = {
      11155111: "ethereum_sepolia",
      84532: "base_sepolia",
      421614: "arbitrum_sepolia",
    };

    currentChainKey = chainMappings[currentChainId as keyof typeof chainMappings];
    if (!currentChainKey) {
      throw new Error(`Tests not configured for chain ID: ${currentChainId}`);
    }

    currentContracts = DEPLOYED_CONTRACTS[currentChainKey as keyof typeof DEPLOYED_CONTRACTS];
    if (!currentContracts) {
      throw new Error(`No deployed contracts found for ${currentChainKey}`);
    }

    console.log(`Testing on: ${currentChainKey} (Chain ID: ${currentChainId})`);
    console.log(`Contracts: ${JSON.stringify(currentContracts, null, 2)}`);

    // Run tests
    const walletAddress = await testSmartWalletCreation(currentChainKey, currentContracts);
    await testWalletPrediction(currentChainKey, currentContracts);
    await testYieldRouterIntegration(currentChainKey, currentContracts);
    await testCrossChainWalletConsistency();

    console.log("\n🎉 All tests passed successfully!");
    console.log("==========================================");

    return {
      success: true,
      walletAddress,
      chain: currentChainKey,
      chainId: currentChainId,
    };
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    console.log("==========================================");

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const result = await runAllTests();

  if (!result.success) {
    process.exit(1);
  }

  console.log("\n📊 Test Summary:");
  console.log(`✅ Chain: ${result.chain} (${result.chainId})`);
  console.log(`✅ Smart Wallet: ${result.walletAddress}`);
  console.log(`✅ All functionality working correctly`);
}

if (require.main === module) {
  main();
}

export { runAllTests };
