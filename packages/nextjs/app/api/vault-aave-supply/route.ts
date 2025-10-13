/**
 * API Route: Vault → Aave Supply (DEMO VERSION)
 *
 * DEMO FLOW:
 * 1. Call vault contract's supply_to_aave() to update tracking
 * 2. Use Aave SDK to actually deposit vault's USDC to Aave
 * 3. Return both transaction hashes to show contract + SDK working together
 *
 * This demonstrates:
 * - Vault contract tracking deposits
 * - Real Aave yield generation via SDK
 * - Integration between Move contracts and TypeScript SDK
 */

import { NextRequest, NextResponse } from "next/server";
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey, PrivateKey, PrivateKeyVariants, Ed25519Account } from "@aptos-labs/ts-sdk";
import { AptosProvider, CoreClient, PoolClient } from "@aave/aave-v3-aptos-ts-sdk";
import { DEFAULT_TESTNET_CONFIG } from "@aave/aave-v3-aptos-ts-sdk";

// Initialize Aptos client for contract calls
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Vault configuration
const VAULT_ADDRESS = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
const VAULT_MODULE = "yieldflow_v3";

const REFERRAL_CODE = 0;
const USDC_SYMBOL = "USDC";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { amount } = body;

    // Get admin private key from environment
    const adminPrivateKey = process.env.APTOS_VAULT_ADMIN_PRIVATE_KEY;

    // Validation
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    if (!adminPrivateKey) {
      return NextResponse.json(
        { error: "Admin private key not configured in environment variables" },
        { status: 500 }
      );
    }

    console.log(`\n🚀 DEMO: Supplying ${amount} USDC from vault to Aave...`);

    // Convert amount to micro USDC (6 decimals)
    const amountMicro = BigInt(Math.floor(amount * 1e6));

    // ========================================
    // STEP 1: Update Vault Contract Tracking
    // ========================================
    console.log("\n📝 STEP 1: Calling vault contract to update tracking...");

    const adminKey = new Ed25519PrivateKey(adminPrivateKey);
    const adminAccount = Account.fromPrivateKey({ privateKey: adminKey });

    const trackingTx = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${VAULT_ADDRESS}::${VAULT_MODULE}::supply_to_aave`,
        functionArguments: [amountMicro.toString()],
      },
    });

    const committedTrackingTx = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction: trackingTx,
    });

    await aptos.waitForTransaction({
      transactionHash: committedTrackingTx.hash,
    });

    console.log(`✅ Vault contract updated: ${committedTrackingTx.hash}`);

    // ========================================
    // STEP 2: Actually Supply to Aave via SDK
    // ========================================
    console.log("\n💰 STEP 2: Using Aave SDK to deposit USDC to Aave...");
    console.log("   NOTE: Using admin account for Aave SDK (resource accounts don't have private keys)");

    // Setup Aave provider with testnet config
    const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
    const poolClient = new PoolClient(aptosProvider);

    // Use admin account for Aave SDK
    // (Resource accounts created via create_resource_account() don't have private keys)
    const vaultAccount = adminAccount;

    console.log(`Vault account: ${vaultAccount.accountAddress.toString()}`);

    // Create core client
    const coreClient = new CoreClient(
      aptosProvider,
      vaultAccount as Ed25519Account
    );

    // Get USDC token address from Aave reserves
    const allReserveTokens = await poolClient.getAllReservesTokens();
    const usdcToken = allReserveTokens.find(token => token.symbol === USDC_SYMBOL);

    if (!usdcToken) {
      return NextResponse.json(
        { error: "USDC not found in Aave reserves" },
        { status: 404 }
      );
    }

    console.log(`USDC token address: ${usdcToken.tokenAddress.toString()}`);
    console.log(`Amount to supply: ${amountMicro.toString()}`);

    // Execute supply transaction
    const txHash = await coreClient.supply(
      usdcToken.tokenAddress,
      amountMicro,
      vaultAccount.accountAddress,
      REFERRAL_CODE
    );

    console.log(`✅ Aave SDK supply successful: ${txHash.hash}`);
    console.log(`\n🎉 DEMO COMPLETE! Check both transactions on explorer`);

    return NextResponse.json({
      success: true,
      step1_vaultTracking: {
        txHash: committedTrackingTx.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTrackingTx.hash}?network=testnet`,
        description: "Vault contract tracking updated",
      },
      step2_aaveDeposit: {
        txHash: txHash.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${txHash.hash}?network=testnet`,
        description: "USDC deposited to Aave via SDK",
      },
      amount: amount,
      protocol: "Aave V3",
      message: `Successfully supplied ${amount} USDC to Aave (contract tracking + SDK deposit)`,
    });

  } catch (error: any) {
    console.error("Vault → Aave supply error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to supply to Aave",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check Aave position
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const vaultAddress = searchParams.get("vaultAddress");

    if (!vaultAddress) {
      return NextResponse.json(
        { error: "Vault address is required" },
        { status: 400 }
      );
    }

    // Setup Aave provider
    const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
    const poolClient = new PoolClient(aptosProvider);

    // Get all reserve tokens
    const allReserveTokens = await poolClient.getAllReservesTokens();
    const usdcToken = allReserveTokens.find(token => token.symbol === USDC_SYMBOL);

    if (!usdcToken) {
      return NextResponse.json(
        { error: "USDC not found in Aave reserves" },
        { status: 404 }
      );
    }

    // TODO: Get user's actual Aave position
    // This would require additional SDK methods or view functions

    return NextResponse.json({
      vaultAddress,
      protocol: "Aave V3",
      network: "testnet",
      usdcTokenAddress: usdcToken.tokenAddress.toString(),
      // Placeholder data - would fetch real position from Aave
      supplied: 0,
      apy: 0,
      earned: 0,
    });

  } catch (error: any) {
    console.error("Error fetching Aave position:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch Aave position",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
