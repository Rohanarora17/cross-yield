import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🚀 DEPLOYING FINAL CCTP ATTEMPT");
  console.log("=" .repeat(60));
  console.log("🎯 Testing with gas limits, low-level calls, and detailed error handling");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Deployer:", wallet.address);
  console.log("📡 Network:", (await provider.getNetwork()).name);

  try {
    console.log("\n🚀 Deploying FinalCCTPAttempt...");
    const FinalCCTPAttempt = await ethers.getContractFactory("FinalCCTPAttempt", signer);
    const finalAttempt = await FinalCCTPAttempt.deploy();
    await finalAttempt.waitForDeployment();
    const contractAddress = await finalAttempt.getAddress();
    console.log("✅ FinalCCTPAttempt deployed:", contractAddress);

    console.log("\n🎯 READY FOR FINAL CCTP TEST!");
    console.log("=" .repeat(60));
    console.log("✅ Enhanced error handling and gas management");
    console.log("✅ Multiple approaches tested automatically");
    console.log("✅ Low-level calls with various gas limits");
    console.log("=" .repeat(60));
    console.log(`FINAL_CCTP_ATTEMPT_ADDRESS="${contractAddress}"`);

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