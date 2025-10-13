/**
 * Derive Resource Account Private Key
 *
 * This script derives the private key for the vault's resource account
 * using the same seed that was used in the contract
 */

import { Account, Ed25519PrivateKey, AccountAddress } from "@aptos-labs/ts-sdk";
import * as crypto from "crypto";

// Vault configuration
const VAULT_ADDRESS = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
const SEED = "ai_YieldFlow_usdc_vault"; // Same seed as in contract

async function deriveResourceAccountKey(adminPrivateKeyHex: string) {
  try {
    console.log("🔑 Deriving Resource Account Private Key...\n");

    // Create admin account from private key
    const adminKey = new Ed25519PrivateKey(adminPrivateKeyHex);
    const adminAccount = Account.fromPrivateKey({ privateKey: adminKey });

    console.log(`Admin Address: ${adminAccount.accountAddress.toString()}`);
    console.log(`Seed: "${SEED}"`);
    console.log("");

    // Derive resource account address
    // This matches what the contract does: account::create_resource_account(admin, seed)
    const seedBytes = Buffer.from(SEED, 'utf-8');

    // The resource account address is derived as:
    // sha3-256(admin_address + seed + 0xFE)
    const adminBytes = adminAccount.accountAddress.toUint8Array();
    const combined = Buffer.concat([
      Buffer.from(adminBytes),
      seedBytes,
      Buffer.from([0xFE]) // Resource account marker
    ]);

    const hash = crypto.createHash('sha3-256').update(combined).digest();
    const resourceAddress = AccountAddress.from(hash);

    console.log(`📋 Resource Account Address: ${resourceAddress.toString()}`);
    console.log("");

    // IMPORTANT: The private key for resource accounts is NOT derivable
    // Resource accounts created via create_resource_account() only have a SignerCapability
    // The contract stores this capability and uses it to sign transactions

    console.log("⚠️  IMPORTANT NOTE:");
    console.log("Resource accounts created via create_resource_account() don't have a traditional private key.");
    console.log("Instead, the contract has a SignerCapability that allows it to sign on behalf of the resource account.");
    console.log("");
    console.log("For the Aave SDK to work, we have two options:");
    console.log("1. Use the admin account to sign (modify API to use admin instead of resource account)");
    console.log("2. Create a regular account for the vault instead of a resource account");
    console.log("");
    console.log("💡 RECOMMENDED FOR DEMO:");
    console.log("Modify the API to use your admin account's private key for both steps.");
    console.log("This will work because the vault contract allows the admin to call supply_to_aave()");

    return {
      resourceAddress: resourceAddress.toString(),
      adminAddress: adminAccount.accountAddress.toString(),
      adminPrivateKey: adminPrivateKeyHex
    };

  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}

// Main execution
const adminKey = process.argv[2];

if (!adminKey) {
  console.log("Usage: npx ts-node get-resource-account-key.ts <admin-private-key>");
  console.log("\nExample:");
  console.log("npx ts-node get-resource-account-key.ts 0x1234...");
  process.exit(1);
}

deriveResourceAccountKey(adminKey).then(result => {
  console.log("\n✅ Done!");
  console.log("\nFor testing, use your ADMIN private key in both fields of the API:");
  console.log("  adminPrivateKey: " + result.adminPrivateKey);
  console.log("  vaultPrivateKey: " + result.adminPrivateKey);
  console.log("\nThis works because:");
  console.log("1. Admin can call supply_to_aave() on the contract");
  console.log("2. For Aave SDK, we'll use admin's account temporarily");
}).catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
