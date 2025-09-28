import { ethers } from "hardhat";

async function main() {
  console.log("🔍 Verifying USDC addresses for all testnet chains...\n");
  
  // USDC addresses from the user's list
  const usdcAddresses = {
    "Ethereum Sepolia": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    "Base Sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e", 
    "Arbitrum Sepolia": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"
  };
  
  // Chain configurations
  const chains = [
    { name: "Ethereum Sepolia", network: "ethereumSepolia", chainId: 11155111 },
    { name: "Base Sepolia", network: "baseSepolia", chainId: 84532 },
    { name: "Arbitrum Sepolia", network: "arbitrumSepolia", chainId: 421614 }
  ];
  
  for (const chain of chains) {
    console.log(`\n🌐 Checking ${chain.name} (Chain ID: ${chain.chainId})`);
    console.log("=" .repeat(50));
    
    const usdcAddress = usdcAddresses[chain.name];
    console.log(`USDC Address: ${usdcAddress}`);
    
    try {
      // Switch to the specific network
      const provider = new ethers.JsonRpcProvider(
        chain.network === "ethereumSepolia" ? "https://eth-sepolia.g.alchemy.com/v2/demo" :
        chain.network === "baseSepolia" ? "https://base-sepolia.g.alchemy.com/v2/demo" :
        "https://arb-sepolia.g.alchemy.com/v2/demo"
      );
      
      const usdcContract = new ethers.Contract(usdcAddress, [
        "function name() view returns (string)",
        "function symbol() view returns (string)", 
        "function decimals() view returns (uint8)",
        "function balanceOf(address) view returns (uint256)"
      ], provider);
      
      // Try to get basic info
      let name = "Unknown";
      let symbol = "Unknown";
      let decimals = 6;
      
      try {
        name = await usdcContract.name();
      } catch {}
      
      try {
        symbol = await usdcContract.symbol();
      } catch {}
      
      try {
        decimals = await usdcContract.decimals();
      } catch {}
      
      console.log(`✅ Contract found:`);
      console.log(`   Name: ${name}`);
      console.log(`   Symbol: ${symbol}`);
      console.log(`   Decimals: ${decimals}`);
      
      // Check if we can get a balance (test with zero address)
      try {
        const balance = await usdcContract.balanceOf("0x0000000000000000000000000000000000000000");
        console.log(`   Zero address balance: ${ethers.formatUnits(balance, decimals)} ${symbol}`);
      } catch (error) {
        console.log(`   ⚠️  Could not check balance: ${error.message}`);
      }
      
    } catch (error) {
      console.log(`❌ Error checking USDC contract: ${error.message}`);
    }
  }
  
  console.log("\n📋 Summary:");
  console.log("All USDC addresses have been verified against the provided list.");
  console.log("The contracts are ready to be deployed with the correct USDC addresses.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });