import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🔍 CHECKING DENYLIST STATUS");
  console.log("=" .repeat(60));
  console.log("🎯 Investigating if smart contracts are denylisted");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  const tokenMessengerAddress = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA";
  const workingWalletV2Address = "0x321fD60EAd95775C579A9dc507cbc008955dA59e";
  const workingWalletV1Address = "0x5B09f9A748D8D754F3B3202ED38ab5125085529b";

  console.log("👤 Your Wallet:", wallet.address);
  console.log("🏦 TokenMessenger:", tokenMessengerAddress);
  console.log("🏦 Working Wallet V2:", workingWalletV2Address);
  console.log("🏦 Working Wallet V1:", workingWalletV1Address);

  try {
    // Create interface to check denylist
    const tokenMessengerInterface = [
      "function isDenylisted(address account) external view returns (bool)"
    ];
    const tokenMessenger = new ethers.Contract(tokenMessengerAddress, tokenMessengerInterface, signer);

    console.log("\n🔍 CHECKING DENYLIST STATUS:");

    // Check your wallet
    try {
      const yourWalletDenylisted = await tokenMessenger.isDenylisted(wallet.address);
      console.log("👤 Your Wallet denylisted:", yourWalletDenylisted);
    } catch (error: any) {
      console.log("👤 Your Wallet denylist check failed:", error.message);
    }

    // Check V2 working wallet
    try {
      const v2WalletDenylisted = await tokenMessenger.isDenylisted(workingWalletV2Address);
      console.log("🏦 Working Wallet V2 denylisted:", v2WalletDenylisted);
    } catch (error: any) {
      console.log("🏦 Working Wallet V2 denylist check failed:", error.message);
    }

    // Check V1 working wallet
    try {
      const v1WalletDenylisted = await tokenMessenger.isDenylisted(workingWalletV1Address);
      console.log("🏦 Working Wallet V1 denylisted:", v1WalletDenylisted);
    } catch (error: any) {
      console.log("🏦 Working Wallet V1 denylist check failed:", error.message);
    }

    console.log("\n🎯 ADDITIONAL CHECKS:");

    // Check if this TokenMessenger even has denylist functionality
    try {
      const hasFunction = await provider.getCode(tokenMessengerAddress);
      console.log("📊 TokenMessenger has code:", hasFunction !== "0x");
    } catch (error) {
      console.log("📊 Code check failed");
    }

    // Try to check owner/admin functions
    try {
      const ownerInterface = [
        "function owner() external view returns (address)"
      ];
      const ownerContract = new ethers.Contract(tokenMessengerAddress, ownerInterface, signer);
      const owner = await ownerContract.owner();
      console.log("👑 TokenMessenger Owner:", owner);
    } catch (error: any) {
      console.log("👑 Owner check failed:", error.message);
    }

  } catch (error: any) {
    console.error("❌ Denylist check failed:", error.message);

    console.log("\n🤔 This suggests:");
    console.log("1. TokenMessenger might not have denylist functionality");
    console.log("2. Base Sepolia might be using V1 without denylists");
    console.log("3. The issue is something else entirely");
  }

  console.log("\n📊 SUMMARY:");
  console.log("✅ Direct calls work perfectly");
  console.log("❌ Both V1 and V2 smart contracts fail");
  console.log("🤔 Need to investigate other potential causes");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });