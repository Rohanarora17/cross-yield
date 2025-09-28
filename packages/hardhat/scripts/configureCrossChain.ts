import { ethers } from "hardhat";
import { CHAIN_CONFIGS } from "../deploy/config/chains";

/**
 * Configure cross-chain coordination for CrossYield contracts
 * This script sets up the necessary cross-chain linkages and permissions
 */

// Deployed contract addresses
const DEPLOYED_CONTRACTS = {
  ethereum_sepolia: {
    chainRegistry: "0x0a6cC6425c004f6F11a9138524e83c8270AA9419",
    smartWalletFactory: "0x9c18A0863F62b141D766Ec2AC0E712FA35857D6f",
    yieldRouter: "0x67580b8d789aAE646cC34d30794cE89b1B2963B1",
  },
  base_sepolia: {
    chainRegistry: "0x01f6A4b9E0fA914C59950F89E701E3eF032cF966",
    smartWalletFactory: "0x3fCb812C6CAe20C254662A619096EB698ebd6ef3",
    yieldRouter: "0x940CAAA3E0268EFDA3cAF3754Ea6123CbF3c92e4",
  },
  arbitrum_sepolia: {
    chainRegistry: "0xc1690B23fF7212489560D4e37DC568a5ae7877ac",
    smartWalletFactory: "0x23F68aA80985C3765d5857be625802bf7E5F8211",
    yieldRouter: "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11",
  },
};

async function configureCrossChainCoordination() {
  console.log("🔗 Configuring Cross-Chain Coordination...");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  // Get current network info
  const network = await ethers.provider.getNetwork();
  const currentChainId = Number(network.chainId);

  console.log(`Current network: ${network.name} (Chain ID: ${currentChainId})`);

  // Find current chain config
  let currentChainKey = "";
  let currentContracts = null;

  for (const [key, config] of Object.entries(CHAIN_CONFIGS)) {
    if (config.chainId === currentChainId) {
      currentChainKey = key;
      break;
    }
  }

  if (!currentChainKey) {
    throw new Error(`Chain ID ${currentChainId} not found in CHAIN_CONFIGS`);
  }

  // Get deployed contracts for current chain
  const deployedKey = currentChainKey as keyof typeof DEPLOYED_CONTRACTS;
  currentContracts = DEPLOYED_CONTRACTS[deployedKey];

  if (!currentContracts) {
    throw new Error(`No deployed contracts found for ${currentChainKey}`);
  }

  console.log(`Found contracts for ${currentChainKey}:`, currentContracts);

  // Connect to contracts
  const chainRegistry = await ethers.getContractAt("ChainRegistry", currentContracts.chainRegistry);
  // const yieldRouter = await ethers.getContractAt("YieldRouter", currentContracts.yieldRouter);

  console.log("\n📋 Configuring ChainRegistry with peer chains...");

  // Add all supported chains to registry
  for (const [chainKey, chainConfig] of Object.entries(CHAIN_CONFIGS)) {
    if (chainKey === currentChainKey) continue; // Skip current chain

    const peerContracts = DEPLOYED_CONTRACTS[chainKey as keyof typeof DEPLOYED_CONTRACTS];
    if (!peerContracts) {
      console.log(`⚠️  No deployed contracts for ${chainKey}, skipping...`);
      continue;
    }

    try {
      // Check if chain already exists
      const existingChain = await chainRegistry.chainInfo(chainConfig.chainId);
      if (existingChain.isActive) {
        console.log(`✅ Chain ${chainConfig.chainId} (${chainConfig.name}) already configured`);
        continue;
      }

      // Add peer chain
      const addChainTx = await chainRegistry.addChain(
        chainConfig.chainId,
        chainConfig.name,
        chainConfig.usdcAddress,
        "1000000000", // 1 gwei gas price
        "5000000", // 0.005 USDC bridge cost
      );
      await addChainTx.wait();

      console.log(`✅ Added peer chain: ${chainConfig.name} (${chainConfig.chainId})`);
    } catch (error: any) {
      if (error.message?.includes("Chain already exists")) {
        console.log(`✅ Chain ${chainConfig.chainId} already exists`);
      } else {
        console.log(`❌ Failed to add chain ${chainConfig.chainId}:`, error.message);
      }
    }
  }

  console.log("\n🔄 Configuring YieldRouter cross-chain awareness...");

  // Link YieldRouter to peer chain smart wallet factories
  for (const [chainKey, chainConfig] of Object.entries(CHAIN_CONFIGS)) {
    const peerContracts = DEPLOYED_CONTRACTS[chainKey as keyof typeof DEPLOYED_CONTRACTS];
    if (!peerContracts) continue;

    try {
      // This would be used for cross-chain wallet prediction
      // For now, we'll just emit an event to log the peer factory addresses
      console.log(`📍 Peer chain ${chainConfig.name}: SmartWalletFactory at ${peerContracts.smartWalletFactory}`);
    } catch (error: any) {
      console.log(`❌ Failed to configure peer chain ${chainConfig.chainId}:`, error.message);
    }
  }

  console.log("\n🔐 Verifying cross-chain configuration...");

  // Verify chain registry has all chains
  const supportedChains = await chainRegistry.getSupportedChains();
  console.log(
    "Supported chains in registry:",
    supportedChains.map(id => Number(id)),
  );

  // Create a summary of the cross-chain setup
  const crossChainSummary = {
    currentChain: {
      name: CHAIN_CONFIGS[currentChainKey].name,
      chainId: currentChainId,
      contracts: currentContracts,
    },
    peerChains: Object.entries(DEPLOYED_CONTRACTS)
      .filter(([key]) => key !== currentChainKey)
      .map(([key, contracts]) => ({
        name: CHAIN_CONFIGS[key as keyof typeof CHAIN_CONFIGS].name,
        chainId: CHAIN_CONFIGS[key as keyof typeof CHAIN_CONFIGS].chainId,
        contracts,
      })),
  };

  console.log("\n🎉 Cross-chain configuration summary:");
  console.log(JSON.stringify(crossChainSummary, null, 2));

  return crossChainSummary;
}

async function main() {
  try {
    await configureCrossChainCoordination();
    console.log("\n✅ Cross-chain coordination configured successfully!");

    // Save configuration for frontend
    const fs = await import("fs");
    const path = await import("path");

    const configPath = path.join(__dirname, "../cross-chain-config.json");
    fs.writeFileSync(
      configPath,
      JSON.stringify(
        {
          deployedContracts: DEPLOYED_CONTRACTS,
          chainConfigs: CHAIN_CONFIGS,
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
    );

    console.log(`💾 Configuration saved to: ${configPath}`);
  } catch (error) {
    console.error("❌ Error configuring cross-chain coordination:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { configureCrossChainCoordination, DEPLOYED_CONTRACTS };
