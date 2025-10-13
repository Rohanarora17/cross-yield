import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 CHECKING USDC CONTRACT - Finding the Real Issue");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Wallet:", wallet.address);
  console.log("🪙 USDC Address:", usdcAddress);

  try {
    // Check what's actually deployed at this address
    const code = await provider.getCode(usdcAddress);
    console.log("\n📊 Contract Analysis:");
    console.log("Contract has code?", code !== "0x");
    console.log("Code length:", code.length);

    if (code === "0x") {
      console.log("❌ NO CONTRACT at this address!");
      return;
    }

    // Try different function signatures to identify the contract
    console.log("\n🧪 Testing Contract Functions:");

    const contract = new ethers.Contract(usdcAddress, [], signer);

    // Test ERC20 functions
    const erc20Functions = [
      { name: "name", sig: "0x06fdde03" },
      { name: "symbol", sig: "0x95d89b41" },
      { name: "decimals", sig: "0x313ce567" },
      { name: "totalSupply", sig: "0x18160ddd" },
      { name: "balanceOf", sig: "0x70a08231" },
      { name: "transfer", sig: "0xa9059cbb" },
      { name: "allowance", sig: "0xdd62ed3e" },
      { name: "approve", sig: "0x095ea7b3" },
    ];

    for (const func of erc20Functions) {
      try {
        if (func.name === "balanceOf" || func.name === "allowance") {
          // These need parameters, skip for now
          continue;
        }

        const result = await provider.call({
          to: usdcAddress,
          data: func.sig
        });

        console.log(`✅ ${func.name}(): works (${result.slice(0, 20)}...)`);

        // If it's name, try to decode it
        if (func.name === "name" && result !== "0x") {
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], result);
            console.log(`   Decoded name: "${decoded[0]}"`);
          } catch (e) {
            console.log(`   Name decode failed: ${e.message}`);
          }
        }

        // If it's symbol, try to decode it
        if (func.name === "symbol" && result !== "0x") {
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], result);
            console.log(`   Decoded symbol: "${decoded[0]}"`);
          } catch (e) {
            console.log(`   Symbol decode failed: ${e.message}`);
          }
        }

        // If it's decimals, try to decode it
        if (func.name === "decimals" && result !== "0x") {
          try {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint8"], result);
            console.log(`   Decoded decimals: ${decoded[0]}`);
          } catch (e) {
            console.log(`   Decimals decode failed: ${e.message}`);
          }
        }

      } catch (error: any) {
        console.log(`❌ ${func.name}(): failed (${error.message})`);
      }
    }

    // Test your balance with proper ABI
    console.log("\n💰 Balance Check:");
    try {
      const balanceData = ethers.concat([
        "0x70a08231", // balanceOf signature
        ethers.zeroPadValue(wallet.address, 32) // your address padded
      ]);

      const balanceResult = await provider.call({
        to: usdcAddress,
        data: balanceData
      });

      const balance = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], balanceResult)[0];
      console.log("Your Balance:", ethers.formatUnits(balance, 6), "tokens");

    } catch (error: any) {
      console.log("Balance check failed:", error.message);
    }

    // Check if this is the RIGHT USDC address for Base Sepolia
    console.log("\n🔍 USDC Address Verification:");
    console.log("Current address: 0x036CbD53842c5426634e7929541eC2318f3dCF7e");
    console.log("Expected Base Sepolia USDC from Circle docs: 0x036CbD53842c5426634e7929541eC2318f3dCF7e");

    // Let's check Circle's TokenMessenger to see what USDC it expects
    console.log("\n🎯 Checking TokenMessenger Configuration:");
    const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";

    try {
      const localMinterData = "0x0a1028c4"; // localMinter() signature
      const localMinterResult = await provider.call({
        to: tokenMessengerAddress,
        data: localMinterData
      });

      const localMinter = ethers.AbiCoder.defaultAbiCoder().decode(["address"], localMinterResult)[0];
      console.log("TokenMessenger LocalMinter:", localMinter);

      // Check what token the minter supports
      console.log("This tells us which USDC contract Circle expects");

    } catch (error: any) {
      console.log("TokenMessenger check failed:", error.message);
    }

    console.log("\n💡 DIAGNOSIS:");
    console.log("1. If USDC functions work, the issue is elsewhere");
    console.log("2. If USDC functions fail, we have the wrong USDC address");
    console.log("3. If LocalMinter check works, we can verify the correct USDC");

  } catch (error: any) {
    console.error("❌ Analysis failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });