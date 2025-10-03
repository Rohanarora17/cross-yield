import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 Testing Circle CCTP Routes & Requirements");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Your Wallet:", wallet.address);

  // Circle's official addresses on Base Sepolia
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const tokenMessenger = await ethers.getContractAt(
      [
        "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)",
        "function localMinter() external view returns (address)",
        "function remoteTokensToLocalTokens(bytes32) external view returns (address)"
      ],
      tokenMessengerAddress,
      signer
    );

    console.log("\n📊 Circle CCTP Analysis:");

    // Check your USDC balance
    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log("Your USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

    // Check Circle contract state
    try {
      const localMinter = await tokenMessenger.localMinter();
      console.log("Circle Local Minter:", localMinter);
    } catch (e) {
      console.log("Could not get local minter:", e.message);
    }

    if (usdcBalance > 0) {
      console.log("\n🔬 Testing Direct Circle CCTP Call:");

      const testAmount = ethers.parseUnits("0.01", 6); // Tiny amount: 0.01 USDC
      const recipient = wallet.address;
      const mintRecipient = ethers.zeroPadValue(recipient, 32);

      console.log("Test Amount:", ethers.formatUnits(testAmount, 6), "USDC");
      console.log("Recipient:", recipient);
      console.log("Mint Recipient (bytes32):", mintRecipient);

      // Test 1: Try Ethereum Sepolia (domain 0)
      console.log("\n1️⃣ Testing Base Sepolia → Ethereum Sepolia (Domain 0):");
      try {
        // First approve
        console.log("   Approving USDC...");
        const approveTx = await usdc.approve(tokenMessengerAddress, testAmount);
        await approveTx.wait();
        console.log("   ✅ USDC approved");

        // Check allowance
        const allowance = await usdc.allowance(wallet.address, tokenMessengerAddress);
        console.log("   Allowance:", ethers.formatUnits(allowance, 6), "USDC");

        // Try the CCTP call
        console.log("   Attempting depositForBurn...");
        const cctpTx = await tokenMessenger.depositForBurn(
          testAmount,
          0, // Ethereum Sepolia domain
          mintRecipient,
          usdcAddress
        );

        console.log("   🎉 SUCCESS! Transaction:", cctpTx.hash);
        const receipt = await cctpTx.wait();
        console.log("   🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

        // Parse events to get nonce
        for (const log of receipt.logs) {
          try {
            console.log("   Event:", log.topics[0]);
          } catch (e) {
            // Skip
          }
        }

      } catch (error: any) {
        console.log("   ❌ Domain 0 failed:", error.message);
        if (error.reason) {
          console.log("   Reason:", error.reason);
        }
        if (error.data) {
          console.log("   Data:", error.data);
        }
      }

      // Test 2: Try Arbitrum Sepolia (domain 3)
      console.log("\n2️⃣ Testing Base Sepolia → Arbitrum Sepolia (Domain 3):");
      try {
        const cctpTx = await tokenMessenger.depositForBurn(
          testAmount,
          3, // Arbitrum Sepolia domain
          mintRecipient,
          usdcAddress
        );

        console.log("   🎉 SUCCESS! Transaction:", cctpTx.hash);
        const receipt = await cctpTx.wait();
        console.log("   🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

      } catch (error: any) {
        console.log("   ❌ Domain 3 failed:", error.message);
      }

      // Test 3: Try same chain (invalid - should fail)
      console.log("\n3️⃣ Testing Base Sepolia → Base Sepolia (Domain 6 - should fail):");
      try {
        const cctpTx = await tokenMessenger.depositForBurn(
          testAmount,
          6, // Same domain (invalid)
          mintRecipient,
          usdcAddress
        );

        console.log("   ❌ Unexpected success:", cctpTx.hash);

      } catch (error: any) {
        console.log("   ✅ Expected failure:", error.message);
      }

      console.log("\n💡 CONCLUSION:");
      console.log("If none of the direct Circle calls work, the issue might be:");
      console.log("1. Circle testnet CCTP routes are restricted/disabled");
      console.log("2. Minimum amount requirements");
      console.log("3. Your wallet needs to be allowlisted");
      console.log("4. Base Sepolia CCTP might be temporarily down");

    } else {
      console.log("⚠️  No USDC to test with");
    }

  } catch (error: any) {
    console.error("❌ Test failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });