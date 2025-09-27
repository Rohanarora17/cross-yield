import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying CrossYield Smart Contracts...");

  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy ChainRegistry
  console.log("\n📋 Deploying ChainRegistry...");
  const ChainRegistry = await ethers.getContractFactory("ChainRegistry");
  const chainRegistry = await ChainRegistry.deploy();
  await chainRegistry.waitForDeployment();
  const chainRegistryAddress = await chainRegistry.getAddress();
  console.log("ChainRegistry deployed to:", chainRegistryAddress);

  // Deploy SmartWalletFactory
  console.log("\n🏭 Deploying SmartWalletFactory...");
  const SmartWalletFactory = await ethers.getContractFactory("SmartWalletFactory");
  const smartWalletFactory = await SmartWalletFactory.deploy(
    deployer.address, // Backend coordinator (for now, use deployer)
    deployer.address, // Owner
  );
  await smartWalletFactory.waitForDeployment();
  const smartWalletFactoryAddress = await smartWalletFactory.getAddress();
  console.log("SmartWalletFactory deployed to:", smartWalletFactoryAddress);

  // Deploy YieldRouter
  console.log("\n🎯 Deploying YieldRouter...");
  const YieldRouter = await ethers.getContractFactory("YieldRouter");
  const yieldRouter = await YieldRouter.deploy();
  await yieldRouter.waitForDeployment();
  const yieldRouterAddress = await yieldRouter.getAddress();
  console.log("YieldRouter deployed to:", yieldRouterAddress);

  // Initialize YieldRouter
  console.log("\n⚙️ Initializing YieldRouter...");
  await yieldRouter.initialize(
    chainRegistryAddress,
    smartWalletFactoryAddress,
    deployer.address, // Admin
  );
  console.log("YieldRouter initialized");

  // Add supported chains to ChainRegistry
  console.log("\n🌐 Adding supported chains...");

  // Ethereum Mainnet
  await chainRegistry.addChain(
    1, // Chain ID
    "Ethereum",
    "0xA0b86a33E6677fC7D5e1234a1CC3b97f8B3ad8A5", // USDC address
    ethers.parseEther("0.00002"), // Gas price
    ethers.parseEther("0.001"), // Bridge cost
  );

  // Base
  await chainRegistry.addChain(
    8453,
    "Base",
    "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC address
    ethers.parseEther("0.000001"), // Gas price
    ethers.parseEther("0.0005"), // Bridge cost
  );

  // Arbitrum
  await chainRegistry.addChain(
    42161,
    "Arbitrum",
    "0xaf88d065e77c8cc2239327c5edb3a432268e5831", // USDC address
    ethers.parseEther("0.000001"), // Gas price
    ethers.parseEther("0.0003"), // Bridge cost
  );

  console.log("Supported chains added");

  // Add some example protocols
  console.log("\n📊 Adding example protocols...");

  // Aave V3 on Ethereum
  await chainRegistry.addProtocol(
    "aave_v3_ethereum",
    ethers.ZeroAddress, // Placeholder adapter address
    1, // Ethereum
    20, // Risk score (0-100)
    400, // Min APY (4%)
    600, // Max APY (6%)
  );

  // Moonwell on Base
  await chainRegistry.addProtocol(
    "moonwell_base",
    ethers.ZeroAddress, // Placeholder adapter address
    8453, // Base
    30, // Risk score
    800, // Min APY (8%)
    1200, // Max APY (12%)
  );

  // Radiant on Arbitrum
  await chainRegistry.addProtocol(
    "radiant_arbitrum",
    ethers.ZeroAddress, // Placeholder adapter address
    42161, // Arbitrum
    25, // Risk score
    1000, // Min APY (10%)
    1500, // Max APY (15%)
  );

  console.log("Example protocols added");

  // Test smart wallet creation
  console.log("\n🧪 Testing smart wallet creation...");
  const testUser = deployer.address;

  // Predict wallet address
  const predictedAddress = await smartWalletFactory.predictWalletAddress(testUser);
  console.log("Predicted wallet address:", predictedAddress);

  // Create wallet
  const tx = await smartWalletFactory.createWallet(testUser);
  await tx.wait();

  const actualAddress = await smartWalletFactory.getWallet(testUser);
  console.log("Actual wallet address:", actualAddress);
  console.log("Addresses match:", predictedAddress.toLowerCase() === actualAddress.toLowerCase());

  // Verify wallet is valid
  const isValid = await smartWalletFactory.isWalletValid(actualAddress);
  console.log("Wallet is valid:", isValid);

  // Get wallet owner
  const owner = await smartWalletFactory.getWalletOwner(actualAddress);
  console.log("Wallet owner:", owner);
  console.log("Owner matches:", owner.toLowerCase() === testUser.toLowerCase());

  console.log("\n✅ Deployment completed successfully!");
  console.log("\n📋 Contract Addresses:");
  console.log("ChainRegistry:", chainRegistryAddress);
  console.log("SmartWalletFactory:", smartWalletFactoryAddress);
  console.log("YieldRouter:", yieldRouterAddress);

  console.log("\n🔗 Next Steps:");
  console.log("1. Update contract addresses in frontend hooks");
  console.log("2. Deploy protocol adapters");
  console.log("3. Configure backend with contract addresses");
  console.log("4. Test end-to-end flow");

  // Save addresses to file for easy reference
  const addresses = {
    chainRegistry: chainRegistryAddress,
    smartWalletFactory: smartWalletFactoryAddress,
    yieldRouter: yieldRouterAddress,
    network: await ethers.provider.getNetwork(),
    deployer: deployer.address,
  };

  const fs = await import("fs");
  const path = await import("path");
  const addressesPath = path.default.join(__dirname, "..", "deployed-addresses.json");
  fs.default.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log(`\n💾 Addresses saved to: ${addressesPath}`);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
