import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";

async function main() {
  console.log("🧪 SIMPLE CCTP TEST - No Password Required");
  console.log("=" .repeat(60));
  
  const provider = ethers.provider;
  
  // Base Sepolia addresses
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  
  try {
    // Check USDC contract
    const usdcCode = await provider.getCode(usdcAddress);
    console.log("📋 USDC Contract deployed:", usdcCode !== "0x" ? "YES" : "NO");
    
    // Check TokenMessenger contract
    const messengerCode = await provider.getCode(tokenMessengerAddress);
    console.log("📋 TokenMessenger deployed:", messengerCode !== "0x" ? "YES" : "NO");
    
    // Try to get USDC info
    const usdcInterface = new ethers.Interface([
      "function name() external view returns (string)",
      "function symbol() external view returns (string)",
      "function decimals() external view returns (uint8)",
      "function totalSupply() external view returns (uint256)"
    ]);
    
    try {
      const name = await provider.call({
        to: usdcAddress,
        data: usdcInterface.encodeFunctionData("name", [])
      });
      console.log("📋 USDC Name:", ethers.toUtf8String(name));
      
      const symbol = await provider.call({
        to: usdcAddress,
        data: usdcInterface.encodeFunctionData("symbol", [])
      });
      console.log("📋 USDC Symbol:", ethers.toUtf8String(symbol));
      
      const decimals = await provider.call({
        to: usdcAddress,
        data: usdcInterface.encodeFunctionData("decimals", [])
      });
      console.log("📋 USDC Decimals:", parseInt(decimals));
      
    } catch (error) {
      console.log("❌ USDC contract call failed:", error.message);
    }
    
    // Test V1 interface
    const v1Interface = new ethers.Interface([
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"
    ]);
    
    const v1Data = v1Interface.encodeFunctionData("depositForBurn", [
      ethers.parseUnits("1", 6), // 1 USDC
      0, // Sepolia domain
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      usdcAddress
    ]);
    
    console.log("✅ V1 Function Data:", v1Data);
    
    // Test V2 interface
    const v2Interface = new ethers.Interface([
      "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 hookData, uint256 maxFee, uint32 finalityThreshold) external returns (uint64 nonce)"
    ]);
    
    const v2Data = v2Interface.encodeFunctionData("depositForBurn", [
      ethers.parseUnits("1", 6), // 1 USDC
      0, // Sepolia domain
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      usdcAddress,
      "0x0000000000000000000000000000000000000000000000000000000000000000", // hookData
      0, // maxFee
      0  // finalityThreshold
    ]);
    
    console.log("✅ V2 Function Data:", v2Data);
    
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});