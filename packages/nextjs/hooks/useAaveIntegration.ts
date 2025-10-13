/**
 * Aave V3 Integration Hook
 * Connects vault to Aave lending protocol on Aptos testnet
 */

import { useState, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Account, Ed25519PrivateKey, PrivateKey, PrivateKeyVariants, Ed25519Account } from "@aptos-labs/ts-sdk";
import { AptosProvider, CoreClient, PoolClient } from "@aave/aave-v3-aptos-ts-sdk";
import { DEFAULT_TESTNET_CONFIG } from "@aave/aave-v3-aptos-ts-sdk";

const REFERRAL_CODE = 0;
const USDC_SYMBOL = "USDC";

export interface AavePosition {
  supplied: number;
  apy: number;
  earned: number;
}

export function useAaveIntegration() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aavePosition, setAavePosition] = useState<AavePosition | null>(null);

  /**
   * Supply USDC to Aave lending pool
   * This should be called by the vault's resource account, not the user directly
   */
  const supplyToAave = useCallback(async (amount: number, vaultPrivateKey: string) => {
    try {
      setLoading(true);
      setError(null);

      // Convert amount to micro USDC (6 decimals)
      const amountMicro = BigInt(Math.floor(amount * 1e6));

      // Setup Aave provider with testnet config
      const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
      const poolClient = new PoolClient(aptosProvider);

      // Create vault account from private key
      const formattedKey = vaultPrivateKey.startsWith("0x")
        ? vaultPrivateKey
        : "0x" + vaultPrivateKey;

      const aptosPrivateKey = new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(formattedKey, PrivateKeyVariants.Ed25519)
      );
      const vaultAccount = Account.fromPrivateKey({ privateKey: aptosPrivateKey });

      // Create core client
      const coreClient = new CoreClient(
        aptosProvider,
        vaultAccount as Ed25519Account
      );

      // Get USDC token address
      const allReserveTokens = await poolClient.getAllReservesTokens();
      const usdcToken = allReserveTokens.find(token => token.symbol === USDC_SYMBOL);

      if (!usdcToken) {
        throw new Error("USDC not found in Aave reserves");
      }

      console.log("✅ Supplying to Aave:", {
        token: usdcToken.tokenAddress.toString(),
        amount: amountMicro.toString(),
        vaultAddress: vaultAccount.accountAddress.toString()
      });

      // Execute supply transaction
      const txHash = await coreClient.supply(
        usdcToken.tokenAddress,
        amountMicro,
        vaultAccount.accountAddress,
        REFERRAL_CODE
      );

      console.log("✅ Aave supply successful:", txHash.hash);

      return txHash.hash;
    } catch (err: any) {
      console.error("❌ Aave supply error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Withdraw USDC from Aave lending pool
   */
  const withdrawFromAave = useCallback(async (amount: number, vaultPrivateKey: string) => {
    try {
      setLoading(true);
      setError(null);

      // Convert amount to micro USDC (6 decimals)
      const amountMicro = BigInt(Math.floor(amount * 1e6));

      // Setup Aave provider with testnet config
      const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
      const poolClient = new PoolClient(aptosProvider);

      // Create vault account from private key
      const formattedKey = vaultPrivateKey.startsWith("0x")
        ? vaultPrivateKey
        : "0x" + vaultPrivateKey;

      const aptosPrivateKey = new Ed25519PrivateKey(
        PrivateKey.formatPrivateKey(formattedKey, PrivateKeyVariants.Ed25519)
      );
      const vaultAccount = Account.fromPrivateKey({ privateKey: aptosPrivateKey });

      // Create core client
      const coreClient = new CoreClient(
        aptosProvider,
        vaultAccount as Ed25519Account
      );

      // Get USDC token address
      const allReserveTokens = await poolClient.getAllReservesTokens();
      const usdcToken = allReserveTokens.find(token => token.symbol === USDC_SYMBOL);

      if (!usdcToken) {
        throw new Error("USDC not found in Aave reserves");
      }

      console.log("✅ Withdrawing from Aave:", {
        token: usdcToken.tokenAddress.toString(),
        amount: amountMicro.toString(),
        vaultAddress: vaultAccount.accountAddress.toString()
      });

      // Execute withdraw transaction
      const txHash = await coreClient.withdraw(
        usdcToken.tokenAddress,
        amountMicro,
        vaultAccount.accountAddress
      );

      console.log("✅ Aave withdrawal successful:", txHash.hash);

      return txHash.hash;
    } catch (err: any) {
      console.error("❌ Aave withdraw error:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch user's Aave position
   */
  const fetchAavePosition = useCallback(async (userAddress: string) => {
    try {
      const aptosProvider = AptosProvider.fromConfig(DEFAULT_TESTNET_CONFIG);
      const poolClient = new PoolClient(aptosProvider);

      // Get user account data from Aave
      // This would need the actual Aave SDK method for getting user positions
      // For now, return placeholder
      setAavePosition({
        supplied: 0,
        apy: 0,
        earned: 0
      });

    } catch (err: any) {
      console.error("Error fetching Aave position:", err);
      setError(err.message);
    }
  }, []);

  return {
    supplyToAave,
    withdrawFromAave,
    fetchAavePosition,
    aavePosition,
    loading,
    error
  };
}
