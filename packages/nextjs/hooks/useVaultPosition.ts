/**
 * Hook to fetch user's position in the Aptos vault contract
 * Reads real on-chain data from deployed vault
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// Initialize Aptos client
const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

// Vault contract address (deployed)
const VAULT_CONTRACT = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
const VAULT_MODULE = "yieldflow_v3";

export interface VaultPosition {
  principal: number;
  yieldEarned: number;
  total: number;
  lastDepositTime: number;
  lastWithdrawTime: number;
  loading: boolean;
  error: string | null;
}

export function useVaultPosition(userAddress?: string) {
  const { account } = useWallet();
  const address = userAddress || account?.address;

  const [position, setPosition] = useState<VaultPosition>({
    principal: 0,
    yieldEarned: 0,
    total: 0,
    lastDepositTime: 0,
    lastWithdrawTime: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!address) {
      setPosition({
        principal: 0,
        yieldEarned: 0,
        total: 0,
        lastDepositTime: 0,
        lastWithdrawTime: 0,
        loading: false,
        error: null,
      });
      return;
    }

    const fetchPosition = async () => {
      try {
        setPosition(prev => ({ ...prev, loading: true, error: null }));

        // Call vault view function: get_user_position
        const result = await aptos.view({
          payload: {
            function: `${VAULT_CONTRACT}::${VAULT_MODULE}::get_user_position`,
            functionArguments: [address],
          },
        });

        if (result && result.length >= 4) {
          const principal = Number(result[0]) / 1e6; // Convert from micro USDC
          const yieldEarned = Number(result[1]) / 1e6;
          const lastDepositTime = Number(result[2]);
          const lastWithdrawTime = Number(result[3]);

          setPosition({
            principal,
            yieldEarned,
            total: principal + yieldEarned,
            lastDepositTime,
            lastWithdrawTime,
            loading: false,
            error: null,
          });
        } else {
          // No position found
          setPosition({
            principal: 0,
            yieldEarned: 0,
            total: 0,
            lastDepositTime: 0,
            lastWithdrawTime: 0,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.error("Error fetching vault position:", err);
        setPosition({
          principal: 0,
          yieldEarned: 0,
          total: 0,
          lastDepositTime: 0,
          lastWithdrawTime: 0,
          loading: false,
          error: err.message || "Failed to fetch vault position",
        });
      }
    };

    fetchPosition();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPosition, 30000);
    return () => clearInterval(interval);
  }, [address]);

  return position;
}

/**
 * Hook to fetch vault stats (total deposits, total yield)
 */
export function useVaultStats(adminAddress: string) {
  const [stats, setStats] = useState<{
    totalDeposits: number;
    totalYield: number;
    loading: boolean;
    error: string | null;
  }>({
    totalDeposits: 0,
    totalYield: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setStats(prev => ({ ...prev, loading: true, error: null }));

        const result = await aptos.view({
          payload: {
            function: `${VAULT_CONTRACT}::${VAULT_MODULE}::get_vault_stats`,
            functionArguments: [adminAddress],
          },
        });

        if (result && result.length >= 2) {
          setStats({
            totalDeposits: Number(result[0]) / 1e6,
            totalYield: Number(result[1]) / 1e6,
            loading: false,
            error: null,
          });
        }
      } catch (err: any) {
        console.error("Error fetching vault stats:", err);
        setStats({
          totalDeposits: 0,
          totalYield: 0,
          loading: false,
          error: err.message || "Failed to fetch vault stats",
        });
      }
    };

    fetchStats();

    // Refresh every 60 seconds
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, [adminAddress]);

  return stats;
}
