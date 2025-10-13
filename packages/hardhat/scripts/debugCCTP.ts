import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 DETAILED CCTP DEBUG - Finding the Exact Issue");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const smartWalletAddress = "0x32ecB7f010Bd3287432B55A443785037682a6C1C";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  try {
    const smartWallet = await ethers.getContractAt("UserSmartWallet", smartWalletAddress, signer);
    const usdc = await ethers.getContractAt("IERC20", usdcAddress, signer);

    console.log("👤 Your Wallet:", wallet.address);
    console.log("🏦 Smart Wallet:", smartWalletAddress);

    // Test parameters
    const transferAmount = ethers.parseUnits("0.1", 6);
    const destinationChainId = 11155111; // Sepolia
    const recipient = wallet.address;

    console.log("\n📊 Pre-flight Checks:");

    // 1. Check balances
    const walletUSDC = await usdc.balanceOf(smartWalletAddress);
    console.log("Smart Wallet USDC:", ethers.formatUnits(walletUSDC, 6), "USDC");
    console.log("Transfer Amount:", ethers.formatUnits(transferAmount, 6), "USDC");
    console.log("Sufficient Balance?", walletUSDC >= transferAmount);

    // 2. Check basic validations
    console.log("Amount > 0?", transferAmount > 0);
    console.log("Recipient not zero?", recipient !== ethers.ZeroAddress);

    // 3. Check CCTP config
    const [tokenMessenger, messageTransmitter, domain] = await smartWallet.getCCTPConfig();
    console.log("TokenMessenger:", tokenMessenger);
    console.log("MessageTransmitter:", messageTransmitter);
    console.log("Current Domain:", domain);

    // 4. Check destination domain mapping
    const destDomain = await smartWallet.cctpDomains ? "Unknown" : "Function not available";
    console.log("Destination Chain ID:", destinationChainId);
    console.log("Expected Destination Domain: 0 (Sepolia)");

    // 5. Check wallet state
    const isActive = await smartWallet.isActive();
    console.log("Wallet Active?", isActive);

    console.log("\n🧪 STEP-BY-STEP CCTP DEBUG:");

    // Test 1: Try to call Circle's TokenMessenger directly
    console.log("\n1️⃣ Testing Circle TokenMessenger directly...");
    try {
      const tokenMessengerContract = await ethers.getContractAt(
        ["function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken) external returns (uint64 nonce)"],
        tokenMessenger,
        signer
      );

      // First approve from smart wallet
      console.log("   Approving USDC from smart wallet to TokenMessenger...");

      // Get current allowance
      const currentAllowance = await usdc.allowance(smartWalletAddress, tokenMessenger);
      console.log("   Current allowance:", ethers.formatUnits(currentAllowance, 6), "USDC");

      if (currentAllowance < transferAmount) {
        console.log("   Need to approve more USDC");
        // We can't approve from external wallet, this needs to be done by the smart wallet
      }

      // Test gas estimation on Circle's contract
      try {
        const mintRecipient = ethers.zeroPadValue(recipient, 32);
        console.log("   Estimating gas for Circle depositForBurn...");

        // This will likely fail because we don't have approval, but let's see the error
        const gasEstimate = await tokenMessengerContract.depositForBurn.estimateGas(
          transferAmount,
          0, // Sepolia domain
          mintRecipient,
          usdcAddress
        );
        console.log("   Circle contract gas estimate:", gasEstimate.toString());
      } catch (circleError: any) {
        console.log("   Circle contract error:", circleError.message);
        if (circleError.reason) {
          console.log("   Circle revert reason:", circleError.reason);
        }
      }

    } catch (error: any) {
      console.log("   Circle direct test failed:", error.message);
    }

    // Test 2: Debug smart wallet internal state
    console.log("\n2️⃣ Checking smart wallet internal validations...");

    // Check if the smart wallet can approve tokens
    try {
      console.log("   Testing smart wallet USDC operations...");

      // Test a simple balance check call
      const balance = await smartWallet.getBalance();
      console.log("   Smart wallet getBalance():", ethers.formatUnits(balance, 6), "USDC");

    } catch (error: any) {
      console.log("   Smart wallet basic operations failed:", error.message);
    }

    // Test 3: Try CCTP with more detailed error catching
    console.log("\n3️⃣ Attempting CCTP with detailed error tracing...");

    try {
      // Use call static to see what would happen without executing
      console.log("   Trying static call first...");

      const result = await smartWallet.executeCCTP.staticCall(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );
      console.log("   Static call succeeded! Nonce would be:", result.toString());

      // If static call works, try the real call
      console.log("   Static call worked, trying real execution...");
      const tx = await smartWallet.executeCCTP(
        transferAmount,
        destinationChainId,
        recipient,
        "sepolia"
      );

      console.log("   🎉 SUCCESS! Transaction:", tx.hash);
      const receipt = await tx.wait();
      console.log("   🎉 Confirmed! Gas used:", receipt.gasUsed.toString());

    } catch (detailedError: any) {
      console.log("   ❌ Detailed error:", detailedError.message);

      if (detailedError.data) {
        console.log("   Error data:", detailedError.data);
      }

      if (detailedError.reason) {
        console.log("   Revert reason:", detailedError.reason);
      }

      // Try to decode the revert reason
      if (detailedError.data && detailedError.data.length > 2) {
        try {
          const decoded = smartWallet.interface.parseError(detailedError.data);
          console.log("   Decoded error:", decoded);
        } catch (decodeError) {
          console.log("   Could not decode error data");
        }
      }
    }

  } catch (error: any) {
    console.error("❌ Debug failed:", error.message);
  }

  console.log("\n🔍 Debug Complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });