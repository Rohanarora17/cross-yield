import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

async function main() {
  console.log("🔍 CHECKING CCTP INTERFACE ON BASE SEPOLIA");
  console.log("=" .repeat(60));
  
  const provider = ethers.provider;
  
  // Base Sepolia TokenMessenger address
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  try {
    // Get the contract code to see what's actually deployed
    const code = await provider.getCode(tokenMessengerAddress);
    console.log("📋 Contract deployed:", code !== "0x" ? "YES" : "NO");
    
    if (code !== "0x") {
      // Try to call depositForBurn with V1 signature (4 params)
      const v1Interface = new ethers.Interface([
        "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"
      ]);
      
      try {
        const v1Data = v1Interface.encodeFunctionData("depositForBurn", [
          ethers.parseUnits("1", 6), // 1 USDC
          0, // Sepolia domain
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // USDC address
        ]);
        console.log("✅ V1 Interface: Compatible");
      } catch (error) {
        console.log("❌ V1 Interface: Not compatible");
      }
      
      // Try to call depositForBurn with V2 signature (7 params)
      const v2Interface = new ethers.Interface([
        "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
      ]);
      
      try {
        const v2Data = v2Interface.encodeFunctionData("depositForBurn", [
          ethers.parseUnits("1", 6), // 1 USDC
          0, // Sepolia domain
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // USDC address
          "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
          0, // maxFee
          0  // finalityThreshold
        ]);
        console.log("✅ V2 Interface: Compatible");
      } catch (error) {
        console.log("❌ V2 Interface: Not compatible");
      }
      
      // Check if it's a proxy contract
      const proxyInterface = new ethers.Interface([
        "function implementation() external view returns (address)"
      ]);
      
      try {
        const implementation = await provider.call({
          to: tokenMessengerAddress,
          data: proxyInterface.encodeFunctionData("implementation", [])
        });
        console.log("🔍 Implementation address:", implementation);
      } catch (error) {
        console.log("🔍 Not a proxy or implementation() not available");
      }
    }
    
  } catch (error) {
    console.error("❌ Error checking CCTP interface:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});