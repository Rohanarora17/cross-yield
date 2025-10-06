/**
 * Thala Finance Integration Hooks
 * React hooks for interacting with Thala lending protocol
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { THALA_CONFIG, getThalaFunction, toMicroUsdc, fromMicroUsdc, type ThalaPosition } from "~~/config/thala.config";
import { APTOS_CONFIG } from "~~/config/aptos.config";

// Initialize Aptos client with proper network configuration
const config = new AptosConfig({ 
  network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET 
});
const aptos = new Aptos(config);

/**
 * Hook to get Thala APY for USDC
 */
export function useThalaApy() {
  const [apy, setApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApy = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await aptos.view({
          payload: {
            function: getThalaFunction("get_supply_rate"),
            functionArguments: [THALA_CONFIG.USDC_FA_METADATA],
          },
        });

        if (result && result.length > 0) {
          // Convert from basis points or wei to percentage
          const apyValue = Number(result[0]) / 1e18 * 100;
          setApy(apyValue);
        }
      } catch (err: any) {
        console.error("Error fetching Thala APY:", err);
        setError(err.message);
        // Fallback to typical APY
        setApy(11.2);
      } finally {
        setLoading(false);
      }
    };

    fetchApy();
  }, []);

  return { apy, loading, error };
}

/**
 * Hook to get user's Thala position
 */
export function useThalaPosition(userAddress?: string) {
  const { account } = useWallet();
  const [position, setPosition] = useState<ThalaPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = userAddress || account?.address;

  useEffect(() => {
    if (!address) {
      setPosition(null);
      return;
    }

    const fetchPosition = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's supply balance
        const balanceResult = await aptos.view({
          payload: {
            function: getThalaFunction("get_user_supply_balance"),
            functionArguments: [address, THALA_CONFIG.USDC_FA_METADATA],
          },
        });

        // Get user's interest earned
        const interestResult = await aptos.view({
          payload: {
            function: getThalaFunction("get_user_interest_earned"),
            functionArguments: [address, THALA_CONFIG.USDC_FA_METADATA],
          },
        });

        // Get current APY
        const apyResult = await aptos.view({
          payload: {
            function: getThalaFunction("get_supply_rate"),
            functionArguments: [THALA_CONFIG.USDC_FA_METADATA],
          },
        });

        const principal = balanceResult && balanceResult.length > 0
          ? fromMicroUsdc(balanceResult[0] as bigint)
          : 0;

        const interest = interestResult && interestResult.length > 0
          ? fromMicroUsdc(interestResult[0] as bigint)
          : 0;

        const apy = apyResult && apyResult.length > 0
          ? Number(apyResult[0]) / 1e18 * 100
          : 11.2;

        setPosition({
          principal,
          interest,
          total: principal + interest,
          apy,
        });
      } catch (err: any) {
        console.error("Error fetching Thala position:", err);
        setError(err.message);
        setPosition({
          principal: 0,
          interest: 0,
          total: 0,
          apy: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPosition();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPosition, 30000);
    return () => clearInterval(interval);
  }, [address]);

  return { position, loading, error, refresh: () => setPosition(null) };
}

/**
 * Hook to supply USDC to Thala
 */
export function useThalaSupply() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const supply = async (amount: number) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountMicro = toMicroUsdc(amount);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: getThalaFunction("supply"),
          typeArguments: [],
          functionArguments: [THALA_CONFIG.USDC_FA_METADATA, amountMicro.toString()],
        },
      });

      const hash = typeof response === 'object' && 'hash' in response
        ? response.hash
        : response.toString();

      setTxHash(hash);

      // Wait for transaction
      await aptos.waitForTransaction({ transactionHash: hash });

      return hash;
    } catch (err: any) {
      console.error("Error supplying to Thala:", err);
      setError(err.message || "Failed to supply to Thala");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { supply, loading, error, txHash };
}

/**
 * Hook to withdraw USDC from Thala
 */
export function useThalaWithdraw() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const withdraw = async (amount: number) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountMicro = toMicroUsdc(amount);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: getThalaFunction("withdraw"),
          typeArguments: [],
          functionArguments: [THALA_CONFIG.USDC_FA_METADATA, amountMicro.toString()],
        },
      });

      const hash = typeof response === 'object' && 'hash' in response
        ? response.hash
        : response.toString();

      setTxHash(hash);

      // Wait for transaction
      await aptos.waitForTransaction({ transactionHash: hash });

      return hash;
    } catch (err: any) {
      console.error("Error withdrawing from Thala:", err);
      setError(err.message || "Failed to withdraw from Thala");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error, txHash };
}
