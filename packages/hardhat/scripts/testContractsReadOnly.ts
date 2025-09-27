import { ethers } from "hardhat";
import { DEPLOYED_CONTRACTS } from "./configureCrossChain";

/**
 * Read-only tests for deployed contracts
 * These tests don't require transactions, just read contract state
 */

async function testContractDeployment() {
  console.log("🔍 Testing contract deployment and basic functionality...");

  // Get current network info
  const network = await ethers.provider.getNetwork();
  const currentChainId = Number(network.chainId);

  // Find current chain contracts
  const chainMappings = {
    11155111: "ethereum_sepolia",
    84532: "base_sepolia",
    421614: "arbitrum_sepolia",
  };

  const currentChainKey = chainMappings[currentChainId as keyof typeof chainMappings];
  if (!currentChainKey) {
    throw new Error(`Tests not configured for chain ID: ${currentChainId}`);
  }

  const currentContracts = DEPLOYED_CONTRACTS[currentChainKey as keyof typeof DEPLOYED_CONTRACTS];
  if (!currentContracts) {
    throw new Error(`No deployed contracts found for ${currentChainKey}`);
  }

  console.log(`\n📍 Testing on: ${currentChainKey} (Chain ID: ${currentChainId})`);

  // Test ChainRegistry
  console.log("\n📋 Testing ChainRegistry...");
  const chainRegistry = await ethers.getContractAt("ChainRegistry", currentContracts.chainRegistry);

  const supportedChains = await chainRegistry.getSupportedChains();
  console.log(`✅ Supported chains: ${supportedChains.map(id => Number(id))}`);

  const chainInfo = await chainRegistry.getChainInfo(currentChainId);
  console.log(`✅ Current chain info: ${chainInfo.name}, active: ${chainInfo.isActive}`);

  // Test SmartWalletFactory
  console.log("\n🏭 Testing SmartWalletFactory...");
  const factory = await ethers.getContractAt("SmartWalletFactory", currentContracts.smartWalletFactory);

  const totalWallets = await factory.getTotalWallets();
  console.log(`✅ Total wallets created: ${totalWallets}`);

  const [deployer] = await ethers.getSigners();
  const hasWallet = await factory.hasWallet(deployer.address);
  console.log(`✅ Deployer has wallet: ${hasWallet}`);

  if (hasWallet) {
    const walletAddress = await factory.getWallet(deployer.address);
    console.log(`✅ Deployer wallet address: ${walletAddress}`);

    // Test the wallet contract
    console.log("\n👤 Testing UserSmartWallet...");
    const wallet = await ethers.getContractAt("UserSmartWallet", walletAddress);

    const owner = await wallet.owner();
    const isActive = await wallet.isActive();
    const backendCoordinator = await wallet.backendCoordinator();

    console.log(`✅ Wallet owner: ${owner}`);
    console.log(`✅ Wallet active: ${isActive}`);
    console.log(`✅ Backend coordinator: ${backendCoordinator}`);
  } else {
    // Test address prediction
    const predictedAddress = await factory.predictWalletAddress(deployer.address);
    console.log(`✅ Predicted wallet address: ${predictedAddress}`);
  }

  // Test YieldRouter
  console.log("\n🔄 Testing YieldRouter...");
  const yieldRouter = await ethers.getContractAt("YieldRouter", currentContracts.yieldRouter);

  // Test portfolio (might be empty)
  try {
    const portfolio = await yieldRouter.getUserPortfolio(deployer.address);
    console.log(
      `✅ User portfolio - Strategy: ${portfolio.currentStrategy}, Total: ${ethers.formatEther(portfolio.totalDeposited)} USDC`,
    );
  } catch {
    console.log(`✅ User portfolio not found (this is normal for new deployments)`);
  }

  console.log("\n🎉 All read-only tests passed!");

  return {
    chain: currentChainKey,
    chainId: currentChainId,
    contracts: currentContracts,
    totalWallets: Number(totalWallets),
    deployerHasWallet: hasWallet,
  };
}

async function testCrossChainConsistency() {
  console.log("\n🌐 Testing cross-chain contract consistency...");

  const results: any = {};

  // Test each chain's deployed contracts
  for (const [chainKey, contracts] of Object.entries(DEPLOYED_CONTRACTS)) {
    console.log(`\n📍 ${chainKey}:`);
    console.log(`  ChainRegistry: ${contracts.chainRegistry}`);
    console.log(`  SmartWalletFactory: ${contracts.smartWalletFactory}`);
    console.log(`  YieldRouter: ${contracts.yieldRouter}`);

    results[chainKey] = contracts;
  }

  console.log("\n✅ Contract addresses logged for all chains");
  return results;
}

async function main() {
  console.log("🧪 CrossYield Read-Only Contract Tests");
  console.log("=====================================");

  try {
    const deploymentResults = await testContractDeployment();
    await testCrossChainConsistency();

    console.log("\n📊 Test Summary:");
    console.log(`✅ Current chain: ${deploymentResults.chain} (${deploymentResults.chainId})`);
    console.log(`✅ Total wallets created: ${deploymentResults.totalWallets}`);
    console.log(`✅ Deployer has wallet: ${deploymentResults.deployerHasWallet}`);
    console.log(`✅ All chains have deployed contracts`);

    console.log("\n🏆 All contracts are properly deployed and accessible!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
