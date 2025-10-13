/**
 * API Route: Vault → Thala Deposit
 *
 * This endpoint allows the vault admin to deposit funds from the vault into Thala Finance
 * This is a critical operation that should only be called by the vault admin
 */

import { NextRequest, NextResponse } from "next/server";
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";

// Initialize Aptos client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Vault configuration
const VAULT_ADDRESS = process.env.APTOS_VAULT_ADDRESS || "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
const VAULT_MODULE = "yieldflow_v3";

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    const { amount, adminPrivateKey } = body;

    // Validation
    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Invalid amount. Must be a positive number." },
        { status: 400 }
      );
    }

    if (!adminPrivateKey) {
      return NextResponse.json(
        { error: "Admin private key is required for this operation" },
        { status: 401 }
      );
    }

    // Create admin account from private key
    const privateKey = new Ed25519PrivateKey(adminPrivateKey);
    const adminAccount = Account.fromPrivateKey({ privateKey });

    console.log(`Admin account: ${adminAccount.accountAddress.toString()}`);
    console.log(`Depositing ${amount} USDC to Thala from vault...`);

    // Convert amount to micro USDC (6 decimals)
    const amountMicro = BigInt(Math.floor(amount * 1e6));

    // Build transaction to deposit from vault to Thala
    const transaction = await aptos.transaction.build.simple({
      sender: adminAccount.accountAddress,
      data: {
        function: `${VAULT_ADDRESS}::${VAULT_MODULE}::deposit_to_thala`,
        functionArguments: [amountMicro.toString()],
      },
    });

    // Sign and submit transaction
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: adminAccount,
      transaction,
    });

    // Wait for transaction to be confirmed
    const executedTransaction = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    console.log(`Transaction successful: ${committedTxn.hash}`);

    return NextResponse.json({
      success: true,
      transactionHash: committedTxn.hash,
      amount: amount,
      message: `Successfully deposited ${amount} USDC from vault to Thala`,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTxn.hash}?network=testnet`,
    });

  } catch (error: any) {
    console.error("Vault → Thala deposit error:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to deposit to Thala",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check vault and Thala balances
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

    // Get vault stats
    const vaultStats = await aptos.view({
      payload: {
        function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_vault_stats`,
        functionArguments: [adminAddress],
      },
    });

    // Get Thala balance in vault
    let thalaBalance = 0;
    try {
      const thalaBalanceResult = await aptos.view({
        payload: {
          function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_thala_balance`,
          functionArguments: [adminAddress],
        },
      });
      thalaBalance = thalaBalanceResult && thalaBalanceResult.length > 0
        ? Number(thalaBalanceResult[0]) / 1e6
        : 0;
    } catch (err) {
      console.log("No Thala balance in vault yet");
    }

    const totalDeposits = vaultStats && vaultStats.length >= 1
      ? Number(vaultStats[0]) / 1e6
      : 0;

    const totalYield = vaultStats && vaultStats.length >= 2
      ? Number(vaultStats[1]) / 1e6
      : 0;

    return NextResponse.json({
      vaultAddress: VAULT_ADDRESS,
      totalDeposits,
      totalYield,
      thalaDeposited: thalaBalance,
      availableToDeposit: totalDeposits - thalaBalance,
    });

  } catch (error: any) {
    console.error("Error fetching vault stats:", error);

    return NextResponse.json(
      {
        error: error.message || "Failed to fetch vault stats",
        details: error.toString(),
      },
      { status: 500 }
    );
  }
}
