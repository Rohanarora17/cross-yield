import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 DEPLOYING WORKING CCTP WALLET");
  console.log("=" .repeat(60));
  console.log("🎯 Using EXACT pattern from successful direct CCTP call");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Deployer:", wallet.address);
  console.log("📡 Network:", (await provider.getNetwork()).name);

  try {
    // Deploy working CCTP wallet
    console.log("\n🚀 Deploying WorkingCCTPWallet...");
    const WorkingCCTPWallet = await ethers.getContractFactory("WorkingCCTPWallet", signer);
    const workingWallet = await WorkingCCTPWallet.deploy();
    await workingWallet.waitForDeployment();
    const walletAddress = await workingWallet.getAddress();
    console.log("✅ WorkingCCTPWallet deployed:", walletAddress);

    console.log("\n📊 Contract Info:");
    console.log("Contract Address:", walletAddress);
    console.log("USDC Balance:", ethers.formatUnits(await workingWallet.getUSDCBalance(), 6), "USDC");
    console.log("Allowance:", ethers.formatUnits(await workingWallet.getAllowance(), 6), "USDC");

    console.log("\n🎯 READY TO TEST WORKING CCTP WALLET!");
    console.log("=" .repeat(60));
    console.log("✅ Uses exact same pattern as successful direct call");
    console.log("✅ No access control or complex modifiers");
    console.log("✅ Same V2 interface with 7 parameters");
    console.log("✅ Same addresses and constants");
    console.log("=" .repeat(60));
    console.log(`WORKING_CCTP_WALLET_ADDRESS="${walletAddress}"`);

  } catch (error: any) {
    console.error("❌ Deployment failed:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });