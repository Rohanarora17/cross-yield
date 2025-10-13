/**
 * Aptos Vault Integration Hook
 * Fetches real data from Aptos vault contract and Thala positions
 */

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { THALA_CONFIG, getThalaFunction, fromMicroUsdc, toMicroUsdc, type ThalaPosition } from "~~/config/thala.config";
import { APTOS_CONFIG } from "~~/config/aptos.config";

// Initialize Aptos client
const config = new AptosConfig({ 
  network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET 
});
const aptos = new Aptos(config);

export interface AptosVaultData {
  vaultAddress: string | null;
  resourceAccountAddress: string | null;
  usdcBalance: number;
  thalaPosition: ThalaPosition | null;
  totalValue: number;
  lastUpdate: number;
  isActive: boolean;
}

export interface VaultTransaction {
  hash: string;
  type: "deposit" | "withdraw" | "supply" | "withdraw_supply";
  amount: number;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  protocol?: string;
}

export function useAptosVault() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [vaultData, setVaultData] = useState<AptosVaultData | null>(null);
  const [transactions, setTransactions] = useState<VaultTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vault contract address (deployed on testnet)
  const VAULT_ADDRESS = APTOS_CONFIG.vaultAddress || "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
  const VAULT_MODULE = "yieldflow_v3";

  const fetchVaultData = useCallback(async () => {
    if (!account || !connected || VAULT_ADDRESS === "0x0") {
      setVaultData(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get vault resource account address
      let resourceAccountAddr = null;
      try {
        const resourceResult = await aptos.view({
          payload: {
            function: `${VAULT_ADDRESS}::${VAULT_MODULE}::vault_resource_addr`,
            functionArguments: [account.address.toString()],
          },
        });
        resourceAccountAddr = resourceResult && resourceResult.length > 0
          ? resourceResult[0].toString()
          : null;
      } catch (err) {
        console.log("Could not fetch resource account address");
      }

      // Get user's position in vault
      const userPositionResult = await aptos.view({
        payload: {
          function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_user_position`,
          functionArguments: [account.address.toString()],
        },
      });

      // Get vault stats (total deposits, total yield)
      const vaultStatsResult = await aptos.view({
        payload: {
          function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_vault_stats`,
          functionArguments: [account.address.toString()], // Using user address as admin param
        },
      });

      // Get Aave balance from vault
      let aaveBalance = 0;
      try {
        const aaveBalanceResult = await aptos.view({
          payload: {
            function: `${VAULT_ADDRESS}::${VAULT_MODULE}::get_aave_balance`,
            functionArguments: [account.address.toString()],
          },
        });
        aaveBalance = aaveBalanceResult && aaveBalanceResult.length > 0
          ? Number(aaveBalanceResult[0]) / 1e6
          : 0;
      } catch (aaveErr) {
        console.log("No Aave balance in vault yet");
      }

      // Fetch Aave APY (placeholder - would need actual Aave view function)
      let aaveApy = 5.2; // Typical lending APY, would fetch from Aave in production
      try {
        // TODO: Call Aave view function to get actual supply APY
        // const aaveApyResult = await aptos.view({
        //   payload: {
        //     function: `${AAVE_POOL_ADDRESS}::pool_data_provider::get_reserve_data`,
        //     functionArguments: [USDC_FA_METADATA],
        //   },
        // });
        // aaveApy = calculate from result
      } catch (apyErr) {
        console.log("Could not fetch Aave APY");
      }

      // Process user position data
      const userPrincipal = userPositionResult && userPositionResult.length >= 1
        ? Number(userPositionResult[0]) / 1e6
        : 0;

      const userYield = userPositionResult && userPositionResult.length >= 2
        ? Number(userPositionResult[1]) / 1e6
        : 0;

      // Calculate vault USDC balance (principal - thala deposited)
      const vaultBalance = userPrincipal;

      // Build Aave position
      const aavePosition: ThalaPosition = {
        principal: aaveBalance,
        interest: 0, // Will be calculated by Aave over time
        total: aaveBalance,
        apy: aaveApy,
      };

      const totalValue = vaultBalance + aavePosition.total + userYield;

      setVaultData({
        vaultAddress: VAULT_ADDRESS,
        resourceAccountAddress: resourceAccountAddr,
        usdcBalance: vaultBalance,
        thalaPosition: aavePosition, // Renamed from Thala to Aave
        totalValue,
        lastUpdate: Date.now(),
        isActive: totalValue > 0,
      });

    } catch (err: any) {
      console.error("Error fetching vault data:", err);
      setError(err.message);

      // Set null instead of mock data - we want real data only
      setVaultData({
        vaultAddress: VAULT_ADDRESS,
        resourceAccountAddress: null,
        usdcBalance: 0,
        thalaPosition: null,
        totalValue: 0,
        lastUpdate: Date.now(),
        isActive: false,
      });
    } finally {
      setLoading(false);
    }
  }, [account, connected, VAULT_ADDRESS]);

  const fetchTransactions = useCallback(async () => {
    if (!account || !connected) return;

    try {
      // Fetch recent transactions from Aptos indexer
      const response = await fetch(APTOS_CONFIG.indexerUrl || "", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetVaultTransactions($address: String!) {
              transactions(
                where: {
                  _or: [
                    { sender: { _eq: $address } }
                    { payload: { function: { _contains: $address } } }
                  ]
                }
                order_by: { version: desc }
                limit: 20
              ) {
                version
                hash
                timestamp
                payload {
                  function
                  arguments
                }
                success
              }
            }
          `,
          variables: {
            address: account.address.toString(),
          },
        }),
      });

      // Check if response is OK
      if (!response.ok) {
        console.warn(`Indexer returned ${response.status}, using empty transaction history`);
        setTransactions([]);
        return;
      }

      const data = await response.json();
      
      if (data.data?.transactions) {
        const processedTransactions: VaultTransaction[] = data.data.transactions.map((tx: any) => {
          const functionName = tx.payload?.function || '';
          let type: VaultTransaction['type'] = 'deposit';
          let amount = 0;
          let protocol = '';

          if (functionName.includes('deposit')) {
            type = 'deposit';
            amount = tx.payload?.arguments?.[1] ? fromMicroUsdc(tx.payload.arguments[1]) : 0;
          } else if (functionName.includes('withdraw')) {
            type = 'withdraw';
            amount = tx.payload?.arguments?.[1] ? fromMicroUsdc(tx.payload.arguments[1]) : 0;
          } else if (functionName.includes('supply')) {
            type = 'supply';
            amount = tx.payload?.arguments?.[1] ? fromMicroUsdc(tx.payload.arguments[1]) : 0;
            protocol = 'Thala Finance';
          } else if (functionName.includes('withdraw_supply')) {
            type = 'withdraw_supply';
            amount = tx.payload?.arguments?.[1] ? fromMicroUsdc(tx.payload.arguments[1]) : 0;
            protocol = 'Thala Finance';
          }

          return {
            hash: tx.hash,
            type,
            amount,
            timestamp: new Date(tx.timestamp).getTime(),
            status: tx.success ? 'completed' : 'failed',
            protocol,
          };
        });

        setTransactions(processedTransactions);
      }
    } catch (err) {
      console.warn("Indexer unavailable, skipping transaction history:", err);
      // Gracefully degrade - don't show mock transactions, just empty
      setTransactions([]);
      // Don't fail the entire app if indexer is down
    }
  }, [account, connected]);

  const depositToVault = async (amount: number, adminAddress: string) => {
    if (!account || !signAndSubmitTransaction) throw new Error("Wallet not connected");

    try {
      setLoading(true);
      setError(null);

      const amountMicro = toMicroUsdc(amount);

      // Call vault deposit function
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${VAULT_ADDRESS}::${VAULT_MODULE}::deposit`,
          functionArguments: [amountMicro.toString(), adminAddress],
        },
      });

      // Wait for transaction to be confirmed
      await aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      // Refresh data
      await fetchVaultData();
      await fetchTransactions();

      return response.hash;
    } catch (err: any) {
      console.error("Error depositing to vault:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const supplyToAave = async (amount: number) => {
    if (!account || !signAndSubmitTransaction) throw new Error("Wallet not connected");

    try {
      setLoading(true);
      setError(null);

      const amountMicro = toMicroUsdc(amount);

      // Call vault's supply_to_aave function (admin only!)
      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: `${VAULT_ADDRESS}::${VAULT_MODULE}::supply_to_aave`,
          functionArguments: [amountMicro.toString()],
        },
      });

      // Wait for transaction to be confirmed
      await aptos.waitForTransaction({
        transactionHash: response.hash,
      });

      // Refresh data
      await fetchVaultData();
      await fetchTransactions();

      return response.hash;
    } catch (err: any) {
      console.error("Error supplying to Aave:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (connected) {
      fetchVaultData();
      fetchTransactions();
      
      const interval = setInterval(() => {
        fetchVaultData();
        fetchTransactions();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [connected, fetchVaultData, fetchTransactions]);

  return {
    vaultData,
    transactions,
    loading,
    error,
    depositToVault,
    supplyToAave,
    refresh: fetchVaultData,
    isConnected: connected,
    vaultAddress: VAULT_ADDRESS,
  };
}