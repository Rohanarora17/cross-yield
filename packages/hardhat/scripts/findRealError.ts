import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 FINDING THE REAL ERROR - Deep Debug");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Wallet:", wallet.address);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);

    // Get the FULL TokenMessenger ABI from Circle
    const tokenMessenger = await ethers.getContractAt(
      [
        "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
        "function localMinter() external view returns (address)",
        "function version() external view returns (uint32)",
        "function localDomain() external view returns (uint32)",
        "function remoteTokensToLocalTokens(bytes32) external view returns (address)",
        "function burnLimitsPerMessage(address) external view returns (uint256)"
      ],
      tokenMessengerAddress,
      signer
    );

    console.log("\n📊 Circle Contract State Analysis:");

    // Check contract version and state
    try {
      const version = await tokenMessenger.version();
      console.log("TokenMessenger Version:", version.toString());
    } catch (e) {
      console.log("Version check failed:", e.message);
    }

    try {
      const localDomain = await tokenMessenger.localDomain();
      console.log("Local Domain:", localDomain.toString());
    } catch (e) {
      console.log("Local domain check failed:", e.message);
    }

    try {
      const localMinter = await tokenMessenger.localMinter();
      console.log("Local Minter:", localMinter);
    } catch (e) {
      console.log("Local minter check failed:", e.message);
    }

    // Check burn limits
    try {
      const burnLimit = await tokenMessenger.burnLimitsPerMessage(usdcAddress);
      console.log("Burn Limit for USDC:", ethers.formatUnits(burnLimit, 6), "USDC");
    } catch (e) {
      console.log("Burn limit check failed:", e.message);
    }

    // Check your USDC balance and allowance
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log("Your USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

    const allowance = await usdc.allowance(wallet.address, tokenMessengerAddress);
    console.log("Current Allowance:", ethers.formatUnits(allowance, 6), "USDC");

    // Now test with DETAILED error catching
    console.log("\n🧪 DETAILED ERROR ANALYSIS:");

    const testAmount = ethers.parseUnits("1", 6); // 1 USDC
    const recipient = wallet.address;
    const mintRecipient = ethers.zeroPadValue(recipient, 32);

    console.log("Test Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("Recipient:", recipient);
    console.log("Mint Recipient (bytes32):", mintRecipient);
    console.log("Destination Domain: 0 (Ethereum Sepolia)");

    // Step 1: Approve with more allowance
    console.log("\n1️⃣ Ensuring sufficient allowance...");
    if (allowance < testAmount) {
      const approveTx = await usdc.approve(tokenMessengerAddress, ethers.parseUnits("10", 6)); // Approve 10 USDC
      await approveTx.wait();
      console.log("✅ Approved 10 USDC");
    }

    // Step 2: Try with different methods to capture error
    console.log("\n2️⃣ Testing depositForBurn with error capture...");

    try {
      // First try with callStatic to see what would happen
      console.log("   Trying callStatic first...");
      const staticResult = await tokenMessenger.depositForBurn.staticCall(
        testAmount,
        0, // Ethereum Sepolia
        mintRecipient,
        usdcAddress
      );
      console.log("   🎉 Static call succeeded! Nonce would be:", staticResult.toString());

      // If static call works, try the real thing
      console.log("   Static call worked, executing real transaction...");
      const tx = await tokenMessenger.depositForBurn(
        testAmount,
        0,
        mintRecipient,
        usdcAddress
      );

      console.log("   🎉 SUCCESS! Transaction:", tx.hash);
      const receipt = await tx.wait();
      console.log("   🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

    } catch (error: any) {
      console.log("   ❌ ERROR DETAILS:");
      console.log("   Message:", error.message);

      if (error.data) {
        console.log("   Data:", error.data);

        // Try to decode the error
        try {
          // Common error signatures
          const errorSignatures = {
            "0x08c379a0": "Error(string)", // Generic revert
            "0x4e487b71": "Panic(uint256)", // Panic
          };

          const errorSig = error.data.slice(0, 10);
          console.log("   Error Signature:", errorSig);

          if (errorSig === "0x08c379a0") {
            // Decode string error
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["string"], "0x" + error.data.slice(10));
            console.log("   🎯 DECODED ERROR:", decoded[0]);
          } else if (errorSig === "0x4e487b71") {
            // Decode panic
            const decoded = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], "0x" + error.data.slice(10));
            console.log("   🎯 PANIC CODE:", decoded[0].toString());
          }
        } catch (decodeError) {
          console.log("   Could not decode error data");
        }
      }

      if (error.reason) {
        console.log("   Reason:", error.reason);
      }

      if (error.code) {
        console.log("   Code:", error.code);
      }
    }

    // Step 3: Try different destination domains
    console.log("\n3️⃣ Testing different destination domains...");

    const domains = [
      { name: "Ethereum Sepolia", domain: 0 },
      { name: "Arbitrum Sepolia", domain: 3 },
    ];

    for (const dest of domains) {
      console.log(`\n   Testing ${dest.name} (Domain ${dest.domain}):`);
      try {
        const staticResult = await tokenMessenger.depositForBurn.staticCall(
          testAmount,
          dest.domain,
          mintRecipient,
          usdcAddress
        );
        console.log(`   ✅ ${dest.name} WORKS! Nonce: ${staticResult.toString()}`);
      } catch (error: any) {
        console.log(`   ❌ ${dest.name} failed:`, error.message);
      }
    }

    // Step 4: Check if it's a USDC contract issue
    console.log("\n4️⃣ Verifying USDC contract...");

    try {
      const usdcName = await usdc.name();
      const usdcSymbol = await usdc.symbol();
      const usdcDecimals = await usdc.decimals();

      console.log("   USDC Name:", usdcName);
      console.log("   USDC Symbol:", usdcSymbol);
      console.log("   USDC Decimals:", usdcDecimals);

      // Check if this USDC is supported by Circle
      console.log("   USDC Address:", usdcAddress);
      console.log("   Expected: 0x036CbD53842c5426634e7929541eC2318f3dCF7e");

    } catch (error: any) {
      console.log("   USDC contract verification failed:", error.message);
    }

  } catch (error: any) {
    console.error("❌ Analysis failed:", error.message);
  }

  console.log("\n🎯 NEXT STEPS:");
  console.log("1. If we get a decoded error, that's our bug to fix");
  console.log("2. If all domains fail the same way, it's a systemic issue");
  console.log("3. If USDC verification fails, wrong token address");
  console.log("4. If no clear error, we'll try a working example from Circle docs");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });