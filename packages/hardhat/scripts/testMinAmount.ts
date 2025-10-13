import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 Testing Circle CCTP Minimum Amount Requirements");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const tokenMessenger = await ethers.getContractAt(
      ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"],
      tokenMessengerAddress,
      signer
    );

    const usdcBalance = await usdc.balanceOf(wallet.address);
    console.log("Your USDC Balance:", ethers.formatUnits(usdcBalance, 6), "USDC");

    if (usdcBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    const recipient = wallet.address;
    const mintRecipient = ethers.zeroPadValue(recipient, 32);

    // Test different amounts to find minimum
    const testAmounts = [
      ethers.parseUnits("0.001", 6),  // 0.001 USDC
      ethers.parseUnits("0.01", 6),   // 0.01 USDC
      ethers.parseUnits("0.1", 6),    // 0.1 USDC
      ethers.parseUnits("1", 6),      // 1 USDC
      ethers.parseUnits("5", 6),      // 5 USDC
    ];

    for (let i = 0; i < testAmounts.length; i++) {
      const amount = testAmounts[i];
      if (amount > usdcBalance) {
        console.log(`⏭️  Skipping ${ethers.formatUnits(amount, 6)} USDC (insufficient balance)`);
        continue;
      }

      console.log(`\n${i + 1}️⃣ Testing ${ethers.formatUnits(amount, 6)} USDC:`);

      try {
        // Approve
        console.log("   Approving USDC...");
        const approveTx = await usdc.approve(tokenMessengerAddress, amount);
        await approveTx.wait();

        // Test gas estimation first
        console.log("   Testing gas estimation...");
        const gasEstimate = await tokenMessenger.depositForBurn.estimateGas(
          amount,
          0, // Ethereum Sepolia domain
          mintRecipient,
          usdcAddress
        );
        console.log("   ✅ Gas estimation successful:", gasEstimate.toString());

        // If gas estimation works, try the actual call
        console.log("   Executing depositForBurn...");
        const cctpTx = await tokenMessenger.depositForBurn(
          amount,
          0,
          mintRecipient,
          usdcAddress
        );

        console.log("   🎉 SUCCESS! Transaction:", cctpTx.hash);
        const receipt = await cctpTx.wait();
        console.log("   🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

        // If we succeed, we found the working amount
        console.log(`\n🎯 FOUND WORKING AMOUNT: ${ethers.formatUnits(amount, 6)} USDC`);
        break;

      } catch (error: any) {
        console.log("   ❌ Failed:", error.message);

        if (error.reason) {
          console.log("   Reason:", error.reason);
        }

        // If it's a gas estimation error, try to decode it
        if (error.message.includes("gas estimation")) {
          console.log("   🔍 Gas estimation failed - likely minimum amount issue");
        }
      }
    }

    console.log("\n💡 If all amounts failed, the issue is likely:");
    console.log("1. Circle CCTP Base Sepolia testnet is down/restricted");
    console.log("2. Your address needs to be allowlisted");
    console.log("3. The destination route (Base Sepolia → Ethereum Sepolia) is disabled");
    console.log("4. There's a contract bug in our integration");

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