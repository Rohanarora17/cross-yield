import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 DEBUG USDC APPROVAL MECHANISM");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const smartWalletAddress = "0x748ee4ba633ED10D24927B0Fe1CA0d8ABDb5165c";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 Smart Wallet:", smartWalletAddress);
  console.log("💰 USDC:", usdcAddress);
  console.log("📨 TokenMessenger:", tokenMessengerAddress);

  try {
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);
    const smartWallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress, signer);

    console.log("\n🔍 CHECKING APPROVAL MECHANISM:");

    // Check smart wallet's USDC balance
    const walletBalance = await usdc.balanceOf(smartWalletAddress);
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletBalance, 6), "USDC");

    if (walletBalance === 0n) {
      console.log("❌ Smart wallet has no USDC to test with");
      return;
    }

    // Check current allowance from smart wallet to TokenMessenger
    const currentAllowance = await usdc.allowance(smartWalletAddress, tokenMessengerAddress);
    console.log("Current Allowance (Smart Wallet → TokenMessenger):", ethers.formatUnits(currentAllowance, 6), "USDC");

    console.log("\n🧪 TESTING SMART CONTRACT APPROVE:");

    // Try to call approve from our smart contract
    const testAmount = ethers.parseUnits("0.1", 6);

    try {
      console.log("Testing approve call from smart contract...");

      // Let's simulate what happens in our executeCCTP function
      console.log("1. Checking pre-conditions...");

      // Check if USDC balance is sufficient
      if (walletBalance < testAmount) {
        console.log("❌ Insufficient balance");
        return;
      }

      console.log("2. Testing USDC.approve() call...");

      // Create a test transaction to see what happens
      const approveCalldata = usdc.interface.encodeFunctionData("approve", [tokenMessengerAddress, testAmount]);
      console.log("Approve calldata:", approveCalldata);

      // Try to simulate the call from smart wallet perspective
      const approveResult = await provider.call({
        to: usdcAddress,
        from: smartWalletAddress,
        data: approveCalldata
      });

      console.log("✅ Approve simulation successful:", approveResult);

      console.log("3. Testing depositForBurn parameters...");

      const destinationDomain = 0; // Sepolia
      const recipient = wallet.address;
      const mintRecipient = ethers.zeroPadValue(recipient, 32);

      console.log("- Amount:", ethers.formatUnits(testAmount, 6), "USDC");
      console.log("- Destination Domain:", destinationDomain);
      console.log("- Mint Recipient:", mintRecipient);
      console.log("- Burn Token:", usdcAddress);

      // Try to simulate depositForBurn
      console.log("4. Testing depositForBurn simulation...");

      const tokenMessenger = await ethers.getContractAt(
        ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"],
        tokenMessengerAddress,
        signer
      );

      try {
        const burnCalldata = tokenMessenger.interface.encodeFunctionData("depositForBurn", [
          testAmount,
          destinationDomain,
          mintRecipient,
          usdcAddress
        ]);

        console.log("DepositForBurn calldata:", burnCalldata);

        // This should fail because we don't have approval yet
        const burnResult = await provider.call({
          to: tokenMessengerAddress,
          from: smartWalletAddress,
          data: burnCalldata
        });

        console.log("Burn simulation result:", burnResult);

      } catch (burnError: any) {
        console.log("Expected burn failure (no approval):", burnError.message);
      }

      console.log("\n💡 KEY INSIGHT:");
      console.log("The issue might be in the exact sequence of:");
      console.log("1. Smart contract must approve USDC to TokenMessenger");
      console.log("2. Then immediately call depositForBurn");
      console.log("3. Both calls must happen in the same transaction");

      console.log("\n🔧 DEBUGGING SMART CONTRACT EXECUTION:");

      // Let's try to execute our smart contract function step by step
      console.log("Testing our smart contract executeCCTP function...");

      try {
        // First, let's see what happens if we try to call executeCCTP
        const cctpResult = await smartWallet.executeCCTP.staticCall(
          testAmount,
          11155111, // Sepolia chain ID
          recipient,
          "sepolia"
        );

        console.log("✅ Smart contract CCTP would succeed! Nonce:", cctpResult.toString());

      } catch (cctpError: any) {
        console.log("❌ Smart contract CCTP failed:", cctpError.message);

        if (cctpError.data) {
          console.log("Error data:", cctpError.data);

          // Try to decode the error
          try {
            const errorSig = cctpError.data.slice(0, 10);
            console.log("Error signature:", errorSig);

            // Common Circle error signatures
            const knownErrors = {
              "0x08c379a0": "Error(string)",
              "0x4e487b71": "Panic(uint256)",
            };

            if (knownErrors[errorSig]) {
              console.log("Known error type:", knownErrors[errorSig]);
            }
          } catch (e) {
            console.log("Could not decode error");
          }
        }
      }

    } catch (error: any) {
      console.log("❌ Approval test failed:", error.message);
    }

  } catch (error: any) {
    console.error("❌ Setup failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });