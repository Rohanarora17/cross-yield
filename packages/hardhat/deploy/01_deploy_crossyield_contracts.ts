import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

/**
 * Deploys CrossYield CCTP-enabled smart contracts
 *
 * Deployment Order:
 * 1. SmartWalletFactory (with CCTP support)
 * 2. YieldRouter (simplified version)
 * 3. Test wallet creation and CCTP verification
 */
const deployContracts: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, getNamedAccounts } = hre;
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  console.log("🚀 Deploying CrossYield CCTP System...");
  console.log("📡 Network:", hre.network.name);
  console.log("👤 Deployer:", deployer);

  // Get USDC address for current network
  const usdcAddresses: { [key: string]: string } = {
    // Testnets
    sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Circle's official Sepolia USDC
    baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Circle's official Base Sepolia USDC
    arbitrumSepolia: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d", // Circle's official Arbitrum Sepolia USDC

    // Mainnets
    mainnet: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // Official Ethereum USDC
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // Official Base USDC
    arbitrum: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831", // Official Arbitrum USDC
    localhost: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // Use Sepolia USDC for local testing
  };

  const usdcAddress = usdcAddresses[hre.network.name];
  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${hre.network.name}`);
  }

  console.log("💰 USDC Address:", usdcAddress);

  // 1. Deploy SmartWalletFactory
  console.log("\n📝 Deploying SmartWalletFactory...");
  const smartWalletFactory = await deploy("SmartWalletFactory", {
    from: deployer,
    args: [
      deployer, // backendCoordinator (admin initially)
      usdcAddress, // USDC address for this chain
      deployer, // owner
    ],
    log: true,
    autoMine: true,
  });

  // 2. Deploy YieldRouter (simplified version)
  console.log("\n📊 Deploying YieldRouter...");
  const yieldRouter = await deploy("YieldRouter", {
    from: deployer,
    args: [],
    log: true,
    autoMine: true,
  });

  // Initialize YieldRouter (only if newly deployed)
  if (yieldRouter.newlyDeployed) {
    const yieldRouterContract = await hre.ethers.getContractAt("YieldRouter", yieldRouter.address);
    const initTx = await yieldRouterContract.initialize(
      smartWalletFactory.address, // Use factory as placeholder registry
      smartWalletFactory.address, // walletFactory
      deployer // admin
    );
    await initTx.wait();
    console.log("✅ YieldRouter initialized");
  }

  // Get deployed contracts
  const factory = await hre.ethers.getContractAt("SmartWalletFactory", smartWalletFactory.address);
  const router = await hre.ethers.getContractAt("YieldRouter", yieldRouter.address);

  console.log("\n✅ Deployment Complete!");
  console.log("🏭 SmartWalletFactory:", await factory.getAddress());
  console.log("📈 YieldRouter:", await router.getAddress());

  // Create a test smart wallet to verify deployment
  console.log("\n🧪 Testing Smart Wallet Creation...");
  try {
    const createTx = await factory.createWallet(deployer);
    const receipt = await createTx.wait();

    const walletAddress = await factory.getWallet(deployer);
    console.log("✅ Test Smart Wallet Created:", walletAddress);

    // Test CCTP configuration
    const wallet = await hre.ethers.getContractAt("UserSmartWallet", walletAddress);
    const cctpSupported = await wallet.isCCTPSupported();
    console.log("🌉 CCTP Supported:", cctpSupported);

    if (cctpSupported) {
      const [tokenMessenger, messageTransmitter, domain] = await wallet.getCCTPConfig();
      console.log("📨 TokenMessenger:", tokenMessenger);
      console.log("📬 MessageTransmitter:", messageTransmitter);
      console.log("🏷️  CCTP Domain:", domain.toString());
    }

    // Grant backend role to deployer for testing
    const grantRoleTx = await router.grantBackendRole(deployer);
    await grantRoleTx.wait();
    console.log("✅ Granted backend role to deployer");

  } catch (error) {
    console.log("⚠️ Test wallet creation failed:", error);
  }

  // Output summary
  console.log("\n📋 Deployment Summary:");
  console.log("=".repeat(50));
  console.log(`Network: ${hre.network.name}`);
  console.log(`USDC Address: ${usdcAddress}`);
  console.log(`SmartWalletFactory: ${await factory.getAddress()}`);
  console.log(`YieldRouter: ${await router.getAddress()}`);
  console.log("=".repeat(50));

  return {
    smartWalletFactory: await factory.getAddress(),
    yieldRouter: await router.getAddress(),
    usdcAddress,
  };
};

export default deployContracts;
deployContracts.tags = ["CrossYield", "SmartWallets", "YieldRouter"];
deployContracts.id = "deploy_crossyield_contracts";
deployContracts.skip = async () => {
  // Skip if we don't have the required environment variables for this network
  return false;
};
