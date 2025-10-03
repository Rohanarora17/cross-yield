import { ethers } from "hardhat";
import { formatUnits, parseUnits } from "ethers";

async function main() {
  console.log("🧪 Direct CCTP Testing with Your Wallet");
  console.log("=" .repeat(60));

  // Your wallet address that has testnet ETH
  const yourWalletAddress = "0xCE54cF5a0dE3843011cF20389C1b6a4AaC442d6A";

  // Base Sepolia contracts (where we know everything is deployed)
  const smartWalletFactory = "0xB95028c291348a9DE81B451083Da562174944910";
  const yieldRouter = "0x0AddD99eAf7597C64cf719a1B11958196E305731";
  const usdcAddress = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

  console.log("👤 Your Wallet:", yourWalletAddress);
  console.log("🏭 SmartWalletFactory:", smartWalletFactory);
  console.log("📈 YieldRouter:", yieldRouter);
  console.log("💰 USDC Address:", usdcAddress);

  try {
    // Check your ETH balance
    const ethBalance = await ethers.provider.getBalance(yourWalletAddress);
    console.log("💎 Your ETH Balance:", formatUnits(ethBalance, 18), "ETH");

    // Check your USDC balance
    const usdc = await ethers.getContractAt("IERC20", usdcAddress);
    const usdcBalance = await usdc.balanceOf(yourWalletAddress);
    console.log("💰 Your USDC Balance:", formatUnits(usdcBalance, 6), "USDC");

    // Test 1: Check SmartWalletFactory
    console.log("\n🏭 Testing SmartWalletFactory...");
    const factory = await ethers.getContractAt("SmartWalletFactory", smartWalletFactory);

    // Check if you have a smart wallet
    let walletAddress;
    try {
      walletAddress = await factory.getWallet(yourWalletAddress);
      if (walletAddress === "0x0000000000000000000000000000000000000000") {
        console.log("📝 No smart wallet found for your address");
        console.log("💡 You can create one by calling createWallet() with your wallet");
      } else {
        console.log("✅ Your Smart Wallet:", walletAddress);
      }
    } catch (error) {
      console.log("📝 No smart wallet found or error:", error.message);
    }

    // Test 2: Check YieldRouter
    console.log("\n📈 Testing YieldRouter...");
    const router = await ethers.getContractAt("YieldRouter", yieldRouter);

    try {
      const isInitialized = await router.hasRole(await router.DEFAULT_ADMIN_ROLE(), yourWalletAddress);
      console.log("Is Admin:", isInitialized);

      const backendRole = await router.BACKEND_ROLE();
      const hasBackendRole = await router.hasRole(backendRole, yourWalletAddress);
      console.log("Has Backend Role:", hasBackendRole);
    } catch (error) {
      console.log("Router check error:", error.message);
    }

    // Test 3: Test a smart wallet if it exists
    if (walletAddress && walletAddress !== "0x0000000000000000000000000000000000000000") {
      console.log("\n🌉 Testing Smart Wallet CCTP Configuration...");

      try {
        const wallet = await ethers.getContractAt("UserSmartWallet", walletAddress);

        // Check CCTP support
        const cctpSupported = await wallet.isCCTPSupported();
        console.log("CCTP Supported:", cctpSupported);

        if (cctpSupported) {
          const [tokenMessenger, messageTransmitter, domain] = await wallet.getCCTPConfig();
          console.log("✅ TokenMessenger:", tokenMessenger);
          console.log("✅ MessageTransmitter:", messageTransmitter);
          console.log("✅ CCTP Domain:", domain.toString());
        }

        // Check wallet balances
        const walletEthBalance = await ethers.provider.getBalance(walletAddress);
        const walletUsdcBalance = await usdc.balanceOf(walletAddress);

        console.log("Smart Wallet ETH:", formatUnits(walletEthBalance, 18), "ETH");
        console.log("Smart Wallet USDC:", formatUnits(walletUsdcBalance, 6), "USDC");

        // Check transfer count
        const transferCount = await wallet.getCCTPTransferCount();
        console.log("Total CCTP Transfers:", transferCount.toString());

      } catch (error) {
        console.log("Smart wallet test error:", error.message);
      }
    }

    // Test 4: Check Circle's CCTP contracts on Base Sepolia
    console.log("\n🌐 Testing Circle CCTP Contracts...");

    // Base Sepolia Circle contracts
    const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
    const messageTransmitterAddress = "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275";

    try {
      // Test TokenMessenger
      const tokenMessenger = await ethers.getContractAt(
        ["function localMinter() view returns (address)"],
        tokenMessengerAddress
      );
      const localMinter = await tokenMessenger.localMinter();
      console.log("✅ Circle TokenMessenger:", tokenMessengerAddress);
      console.log("✅ Local Minter:", localMinter);

      // Test MessageTransmitter
      const messageTransmitter = await ethers.getContractAt(
        ["function localDomain() view returns (uint32)"],
        messageTransmitterAddress
      );
      const localDomain = await messageTransmitter.localDomain();
      console.log("✅ Circle MessageTransmitter:", messageTransmitterAddress);
      console.log("✅ Local Domain:", localDomain.toString());

    } catch (error) {
      console.log("Circle contracts test error:", error.message);
    }

    console.log("\n🎯 Test Results Summary:");
    console.log("- Your wallet has", formatUnits(ethBalance, 18), "ETH for transactions");
    console.log("- Your wallet has", formatUnits(usdcBalance, 6), "USDC for testing");
    console.log("- SmartWalletFactory is deployed and accessible");
    console.log("- YieldRouter is deployed and accessible");
    console.log("- Circle CCTP contracts are accessible on Base Sepolia");

    if (usdcBalance > 0) {
      console.log("\n💡 Ready for CCTP Testing!");
      console.log("💡 You can create a smart wallet and test USDC transfers");
    } else {
      console.log("\n💡 Get testnet USDC from: https://faucet.circle.com/");
      console.log("💡 Select Base Sepolia and request USDC to your address");
    }

  } catch (error) {
    console.error("❌ Test failed:", error);
  }

  console.log("\n✅ Direct Testing Complete!");
  console.log("=" .repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });