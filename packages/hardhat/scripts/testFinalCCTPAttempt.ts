import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔥 FINAL CCTP ATTEMPT TEST");
  console.log("=" .repeat(60));
  console.log("🎯 Testing with enhanced error handling and gas management");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const finalAttemptAddress = "0x2E61dd932Dd853836d255056D2b4AE4cB43a08ED";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Final CCTP Attempt:", finalAttemptAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const finalAttempt = await ethers.getContractAt("FinalCCTPAttempt", finalAttemptAddress, signer);

    const yourBalance = await usdc.balanceOf(wallet.address);
    console.log("💰 Your USDC balance:", ethers.formatUnits(yourBalance, 6), "USDC");

    if (yourBalance === 0n) {
      console.log("❌ No USDC to test with");
      return;
    }

    const testAmount = ethers.parseUnits("0.1", 6);
    const recipient = wallet.address;

    console.log("\n🎯 FINAL CCTP ATTEMPT:");
    console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
    console.log("- Recipient:", recipient);

    // Approve the contract
    console.log("\n1. Approving final attempt contract...");
    const approveTx = await usdc.approve(finalAttemptAddress, testAmount);
    await approveTx.wait();
    console.log("✅ Approval complete");

    // Try the multiple approaches function first
    console.log("\n2. Testing multiple approaches automatically...");
    try {
      const multiTx = await finalAttempt.testMultipleApproaches(testAmount, recipient, {
        gasLimit: 500000 // Provide extra gas for all the attempts
      });

      const receipt = await multiTx.wait();
      console.log("✅ Multiple approaches test completed");

      // Check for events
      for (const log of receipt.logs) {
        try {
          const parsed = finalAttempt.interface.parseLog(log);
          if (parsed) {
            if (parsed.name === "CCTPExecuted") {
              console.log("🎉🎉🎉 CCTP SUCCESS!");
              console.log("- Nonce:", parsed.args.nonce.toString());
              console.log("- Gas used:", parsed.args.gasUsed.toString());
              return; // Success!
            } else if (parsed.name === "CCTPFailed") {
              console.log("❌ CCTP Failed:", parsed.args.reason);
              console.log("- Data:", parsed.args.data);
            }
          }
        } catch (e) {
          // Skip unparseable logs
        }
      }

    } catch (error: any) {
      console.log("❌ Multiple approaches failed:", error.message);
    }

    // If that didn't work, try the simple executeCCTP
    console.log("\n3. Trying simple executeCCTP...");
    try {
      // Need to approve again since the previous test consumed it
      const approveTx2 = await usdc.approve(finalAttemptAddress, testAmount);
      await approveTx2.wait();

      const cctpTx = await finalAttempt.executeCCTP(testAmount, recipient, {
        gasLimit: 300000
      });

      const receipt = await cctpTx.wait();
      console.log("🎉 Simple executeCCTP succeeded!");

      // Check for events
      for (const log of receipt.logs) {
        try {
          const parsed = finalAttempt.interface.parseLog(log);
          if (parsed && parsed.name === "CCTPExecuted") {
            console.log("🎯 CCTP Nonce:", parsed.args.nonce.toString());
            console.log("🎯 Gas used:", parsed.args.gasUsed.toString());
          }
        } catch (e) {
          // Skip
        }
      }

    } catch (error: any) {
      console.log("❌ Simple executeCCTP also failed:", error.message);
      console.log("📊 Error data:", error.data || "No data");
    }

    console.log("\n📊 FINAL VERDICT:");
    console.log("If both approaches failed, smart contract CCTP is not working");
    console.log("Will proceed with backend service approach...");

  } catch (error: any) {
    console.error("❌ Test setup failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });