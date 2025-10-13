import * as dotenv from "dotenv";
dotenv.config();
import { ethers } from "hardhat";
import { Wallet } from "ethers";
import password from "@inquirer/password";

async function main() {
  console.log("🧪 DEPLOYING MINIMAL CCTP TEST CONTRACT");
  console.log("=" .repeat(60));

  const encryptedKey = process.env.DEPLOYER_PRIVATE_KEY_ENCRYPTED;
  const pass = await password({ message: "Enter password to decrypt private key:" });
  const wallet = await Wallet.fromEncryptedJson(encryptedKey!, pass);
  const provider = ethers.provider;
  const signer = wallet.connect(provider);

  console.log("👤 Deployer:", wallet.address);
  console.log("📡 Network:", (await provider.getNetwork()).name);

  try {
    // Deploy minimal test contract
    console.log("\n🧪 Deploying MinimalCCTPTest...");
    const MinimalCCTPTest = await ethers.getContractFactory("MinimalCCTPTest", signer);
    const testContract = await MinimalCCTPTest.deploy();
    await testContract.waitForDeployment();
    const contractAddress = await testContract.getAddress();
    console.log("✅ MinimalCCTPTest deployed:", contractAddress);

    console.log("\n📊 Contract Info:");
    console.log("Contract Address:", contractAddress);
    console.log("USDC Balance:", ethers.formatUnits(await testContract.getUSDCBalance(), 6), "USDC");
    console.log("Allowance:", ethers.formatUnits(await testContract.getAllowance(), 6), "USDC");

    console.log("\n🎯 READY TO TEST MINIMAL CCTP!");
    console.log(`MINIMAL_CCTP_TEST_ADDRESS="${contractAddress}"`);

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