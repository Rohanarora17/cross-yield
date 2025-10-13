import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 DEPLOYING WORKING CCTP WALLET V1");
  console.log("=" .repeat(60));
  console.log("🎯 Testing V1 interface (4 parameters) like example repository");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Deployer:", wallet.address);
  console.log("📡 Network:", (await provider.getNetwork()).name);

  try {
    // Deploy working CCTP wallet V1
    console.log("\n🚀 Deploying WorkingCCTPWalletV1...");
    const WorkingCCTPWalletV1 = await ethers.getContractFactory("WorkingCCTPWalletV1", signer);
    const workingWalletV1 = await WorkingCCTPWalletV1.deploy();
    await workingWalletV1.waitForDeployment();
    const walletAddress = await workingWalletV1.getAddress();
    console.log("✅ WorkingCCTPWalletV1 deployed:", walletAddress);

    console.log("\n📊 Contract Info:");
    console.log("Contract Address:", walletAddress);
    console.log("USDC Balance:", ethers.formatUnits(await workingWalletV1.getUSDCBalance(), 6), "USDC");
    console.log("Allowance:", ethers.formatUnits(await workingWalletV1.getAllowance(), 6), "USDC");

    console.log("\n🎯 READY TO TEST V1 CCTP WALLET!");
    console.log("=" .repeat(60));
    console.log("✅ Uses V1 interface with 4 parameters");
    console.log("✅ Matches example repository pattern");
    console.log("✅ No denylist modifiers in V1");
    console.log("=" .repeat(60));
    console.log(`WORKING_CCTP_WALLET_V1_ADDRESS="${walletAddress}"`);

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