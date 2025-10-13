import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 CHECKING IF USDC IS PAUSED OR RESTRICTED");
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
    // Check if USDC is paused or has restrictions
    console.log("\n🔍 Checking USDC State Functions:");

    const pausableChecks = [
      { name: "paused", sig: "0x5c975abb" },
      { name: "isBlacklisted", sig: "0xfe575a87" },
      { name: "isFrozen", sig: "0x33eeb147" },
      { name: "owner", sig: "0x8da5cb5b" },
      { name: "minter", sig: "0x07546172" },
      { name: "masterMinter", sig: "0x35d99f35" },
      { name: "blacklister", sig: "0x4c68bbd3" },
    ];

    for (const check of pausableChecks) {
      try {
        let result;

        if (check.name === "isBlacklisted") {
          // isBlacklisted(address) - needs parameter
          const data = ethers.concat([
            check.sig,
            ethers.zeroPadValue(wallet.address, 32)
          ]);
          result = await provider.call({ to: usdcAddress, data });
        } else {
          // No parameters needed
          result = await provider.call({ to: usdcAddress, data: check.sig });
        }

        if (result && result !== "0x") {
          if (check.name === "paused" || check.name === "isBlacklisted" || check.name === "isFrozen") {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["bool"], result)[0];
            console.log(`✅ ${check.name}(): ${decoded}`);

            if (decoded && (check.name === "paused" || check.name === "isBlacklisted")) {
              console.log(`🚨 FOUND THE ISSUE! USDC is ${check.name}!`);
            }
          } else if (check.name.includes("owner") || check.name.includes("minter") || check.name.includes("blacklister")) {
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["address"], result)[0];
            console.log(`✅ ${check.name}(): ${decoded}`);
          } else {
            console.log(`✅ ${check.name}(): ${result.slice(0, 20)}...`);
          }
        }

      } catch (error: any) {
        console.log(`❌ ${check.name}(): failed (${error.message})`);
      }
    }

    // Try to find the real issue by testing a simple transfer
    console.log("\n🧪 Testing Simple USDC Operations:");

    try {
      // Test approve with minimal amount
      console.log("Testing approve...");
      const usdc = await ethers.getContractAt(
        ["function approve(address spender, uint256 amount) external returns (bool)"],
        usdcAddress,
        signer
      );

      const testSpender = "0x1111111111111111111111111111111111111111"; // Dummy address
      const testAmount = 1; // 1 wei

      const approveTx = await usdc.approve(testSpender, testAmount);
      await approveTx.wait();
      console.log("✅ Approve worked!");

    } catch (approveError: any) {
      console.log("❌ Approve failed:", approveError.message);

      if (approveError.data) {
        console.log("   Error data:", approveError.data);

        // Try to decode specific USDC errors
        const usdcErrors = {
          "0xd301b48e": "Pausable: paused",
          "0x570ca1e7": "Blacklistable: account is blacklisted",
        };

        const errorSig = approveError.data.slice(0, 10);
        if (usdcErrors[errorSig]) {
          console.log(`🎯 DECODED ERROR: ${usdcErrors[errorSig]}`);
        }
      }
    }

    // Check if we can find the correct USDC address
    console.log("\n🔍 Looking for Alternative USDC Addresses:");

    // Common testnet USDC addresses to try
    const testnetUSDCs = [
      { name: "Circle Official", address: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" },
      { name: "Bridged USDC", address: "0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA" }, // Base bridged USDC
      { name: "Mock USDC", address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" }, // Mainnet USDC (wrong network)
    ];

    for (const usdc of testnetUSDCs) {
      if (usdc.address.toLowerCase() === usdcAddress.toLowerCase()) {
        console.log(`   Current: ${usdc.name} - ${usdc.address}`);
        continue;
      }

      try {
        const code = await provider.getCode(usdc.address);
        if (code !== "0x") {
          const nameData = await provider.call({ to: usdc.address, data: "0x06fdde03" });
          if (nameData && nameData !== "0x") {
            const name = ethers.AbiCoder.defaultAbiCoder().decode(["string"], nameData)[0];
            console.log(`   Alternative: ${usdc.name} - ${usdc.address} (${name})`);
          }
        }
      } catch (e) {
        // Skip invalid addresses
      }
    }

    console.log("\n💡 SOLUTION STRATEGY:");
    console.log("1. If USDC is paused/blacklisted, that's the issue");
    console.log("2. If no pause/blacklist, check for different USDC contract");
    console.log("3. If all else fails, try different testnet or mainnet");

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