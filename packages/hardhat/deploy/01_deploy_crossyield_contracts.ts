import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys CrossYield smart contracts in correct order
 *
 * Deployment Order:
 * 1. ChainRegistry (existing, may need updates)
 * 2. SmartWalletFactory
 * 3. YieldRouter (updated version)
 * 4. Protocol Adapters
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("🚀 Deploying CrossYield Contracts...");
  console.log("Deployer address:", deployer);

  // Step 1: Deploy ChainRegistry (if not exists)
  console.log("\n📋 Deploying ChainRegistry...");
  const chainRegistry = await deploy("ChainRegistry", {
    from: deployer,
    args: [], // No constructor args for initializable contract
    log: true,
    waitConfirmations: 1,
  });

  // Initialize ChainRegistry (only if newly deployed)
  const chainRegistryContract = await hre.ethers.getContractAt("ChainRegistry", chainRegistry.address);
  if (chainRegistry.newlyDeployed) {
    const initTx = await chainRegistryContract.initialize(deployer);
    await initTx.wait();
    console.log("✅ ChainRegistry initialized");
  } else {
    console.log("✅ ChainRegistry already initialized");
  }

  // Get USDC address from chain config first
  const network = await hre.ethers.provider.getNetwork();
  const chainId = network.chainId;

  // Get USDC address from chain config
  const { CHAIN_CONFIGS } = await import("./config/chains");
  let usdcAddress = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"; // Default Sepolia USDC

  // Find matching chain config
  for (const [, config] of Object.entries(CHAIN_CONFIGS)) {
    if (config.chainId === chainId) {
      usdcAddress = config.usdcAddress;
      break;
    }
  }

  // Step 2: Deploy SmartWalletFactory
  console.log("\n🏭 Deploying SmartWalletFactory...");
  console.log(`Using USDC address: ${usdcAddress}`);
  const smartWalletFactory = await deploy("SmartWalletFactory", {
    from: deployer,
    args: [
      deployer, // Backend coordinator (initially deployer)
      usdcAddress, // USDC address for this chain
      deployer, // Owner
    ],
    log: true,
    waitConfirmations: 1,
  });

  // Step 3: Deploy YieldRouter (Proxy Pattern)
  console.log("\n🔄 Deploying YieldRouter...");
  const yieldRouterImpl = await deploy("YieldRouter", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: 1,
  });

  // Deploy proxy for YieldRouter
  const yieldRouterProxy = await deploy("YieldRouter_Proxy", {
    from: deployer,
    contract: "SimpleProxy",
    args: [yieldRouterImpl.address],
    log: true,
    waitConfirmations: 1,
  });

  // Initialize YieldRouter through proxy (only if newly deployed)
  if (yieldRouterProxy.newlyDeployed) {
    const yieldRouter = await hre.ethers.getContractAt("YieldRouter", yieldRouterProxy.address);
    const initTx = await yieldRouter.initialize(chainRegistry.address, smartWalletFactory.address, deployer);
    await initTx.wait();
    console.log("✅ YieldRouter initialized");
  } else {
    console.log("✅ YieldRouter already initialized");
  }

  // Step 4: Skip Protocol Adapters for now (will be chain-specific)
  console.log("\n⏭️  Skipping protocol adapters (will be deployed per-chain later)...");

  // Step 5: Configure ChainRegistry with initial protocols
  console.log("\n⚙️  Configuring ChainRegistry...");

  try {
    const addChainTx = await chainRegistryContract.addChain(
      chainId,
      network.name || "localhost",
      usdcAddress,
      "1000000000", // 1 gwei gas price
      "5000000", // 0.005 USDC bridge cost
    );
    await addChainTx.wait();
    console.log(`✅ Added chain ${chainId} to registry`);
  } catch {
    console.log("⚠️  Chain might already be added");
  }

  // Step 7: Grant roles and permissions
  console.log("\n🔐 Setting up roles and permissions...");

  // Grant backend role to deployer (for testing)
  try {
    const yieldRouterContract = await hre.ethers.getContractAt("YieldRouter", yieldRouterProxy.address);
    const grantRoleTx = await yieldRouterContract.grantBackendRole(deployer);
    await grantRoleTx.wait();
    console.log("✅ Granted backend role to deployer");
  } catch (error) {
    console.log("⚠️  Role might already be granted:", error.message);
  }

  // Final summary
  console.log("\n🎉 DEPLOYMENT COMPLETE!");
  console.log("=====================================");
  console.log("Contract Addresses:");
  console.log(`📋 ChainRegistry: ${chainRegistry.address}`);
  console.log(`🏭 SmartWalletFactory: ${smartWalletFactory.address}`);
  console.log(`🔄 YieldRouter: ${yieldRouterProxy.address}`);
  console.log("=====================================");

  // Save deployment info
  console.log("Deployment info saved to deployments folder");

  console.log("\n💾 Deployment info saved to deployments folder");

  return true;
};

export default deployContracts;
deployContracts.tags = ["CrossYield", "SmartWallets", "YieldRouter"];
deployContracts.id = "deploy_crossyield_contracts";
deployContracts.skip = async () => {
  // Skip if we don't have the required environment variables for this network
  return false;
};
