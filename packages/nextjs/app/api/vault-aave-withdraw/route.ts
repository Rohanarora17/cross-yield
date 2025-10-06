/**
 * API Route: Withdraw from Aave (DEMO VERSION)
 *
 * DEMO FLOW:
 * 1. Call vault contract's withdraw_from_aave() to update tracking
 * 2. Use Aave SDK to actually withdraw USDC from Aave
 * 3. Return both transaction hashes
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

    console.log(`\n🚀 DEMO: Withdrawing ${amount} USDC from Aave...`);

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
        function: `${VAULT_ADDRESS}::${VAULT_MODULE}::withdraw_from_aave`,
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
    // STEP 2: Actually Withdraw from Aave via SDK
    // ========================================
    console.log("\n💰 STEP 2: Using Aave SDK to withdraw USDC from Aave...");
    console.log("   NOTE: Using admin account for Aave SDK");

    // Setup Aave provider with testnet config
    const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
    const poolClient = new PoolClient(aptosProvider);

    // Use admin account for Aave SDK
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
    console.log(`Amount to withdraw: ${amountMicro.toString()}`);

    // Execute withdraw transaction
    const txHash = await coreClient.withdraw(
      usdcToken.tokenAddress,
      amountMicro,
      vaultAccount.accountAddress
    );

    console.log(`✅ Aave SDK withdrawal successful: ${txHash.hash}`);
    console.log(`\n🎉 DEMO COMPLETE! Check both transactions on explorer`);

    return NextResponse.json({
      success: true,
      step1_vaultTracking: {
        txHash: committedTrackingTx.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTrackingTx.hash}?network=testnet`,
        description: "Vault contract tracking updated",
      },
      step2_aaveWithdraw: {
        txHash: txHash.hash,
        explorerUrl: `https://explorer.aptoslabs.com/txn/${txHash.hash}?network=testnet`,
        description: "USDC withdrawn from Aave via SDK",
      },
      amount: amount,
      protocol: "Aave V3",
      message: `Successfully withdrew ${amount} USDC from Aave (contract tracking + SDK withdrawal)`,
    });

  } catch (error: any) {
    console.error("❌ Vault → Aave withdrawal error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to withdraw from Aave",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminAddress = searchParams.get("adminAddress");

    if (!adminAddress) {
      return NextResponse.json(
        { error: "Admin address is required" },
        { status: 400 }
      );
    }

    // Get Aave balance tracked in vault
    const aaveBalanceResult = await aptos.view({
      payload: {
        function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_aave_balance`,
        functionArguments: [adminAddress],
      },
    });

    const aaveSupplied = aaveBalanceResult && aaveBalanceResult.length > 0
      ? Number(aaveBalanceResult[0]) / 1e6
      : 0;

    return NextResponse.json({
      vaultAddress: VAULT_ADDRESS,
      aaveSupplied,
      availableToWithdraw: aaveSupplied,
    });

  } catch (error: any) {
    console.error("Error fetching Aave balance:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch Aave balance",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
