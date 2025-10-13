// Multi-Chain Wallet Hook - Manages both EVM and Aptos wallet connections
"use client";

import { useState, useEffect } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { useSmartWallet } from "./useSmartWallet";
import { useAptosVault } from "./useAptosVault";
import { useAptosBalance } from "./useAptosBalance";
import { getUSDCAddress } from "../contracts/contractAddresses";

export interface MultiChainWalletState {
  // EVM State
  evmAddress: string | undefined;
  evmConnected: boolean;
  evmChainId: number | undefined;
  evmBalance: string;
  evmSmartWalletBalance: string;

  // Aptos State
  aptosAddress: string | undefined;
  aptosConnected: boolean;
  aptosBalance: string;
  aptosVaultBalance: string;
  aptosNetwork: string | undefined;

  // Combined State
  isFullyConnected: boolean; // Both wallets connected
  totalUSDCBalance: string;
  totalInvestedBalance: string; // Smart wallet + vault balances
  totalWalletBalance: string; // Direct wallet balances

  // Methods
  disconnectEVM: () => void;
  disconnectAptos: () => void;
  disconnectAll: () => void;
  refreshBalances: () => Promise<void>;
}

export function useMultiChainWallet(): MultiChainWalletState {
  // EVM Connection
  const {
    address: evmAddress,
    isConnected: evmConnected,
    chainId
  } = useAccount();

  // Aptos Connection
  const {
    account: aptosAccount,
    connected: aptosConnected,
    disconnect: aptosDisconnect,
    network: aptosNetwork
  } = useAptosWallet();

  // Public client for EVM calls
  const publicClient = usePublicClient();

  // Smart wallet and vault data
  const smartWallet = useSmartWallet();
  const aptosVault = useAptosVault();
  const aptosBalances = useAptosBalance();

  // State for balances
  const [evmBalance, setEvmBalance] = useState<string>("0");

  // Fetch EVM USDC balance
  useEffect(() => {
    const fetchEvmBalance = async () => {
      if (!evmAddress || !evmConnected || !publicClient || !chainId) {
        setEvmBalance("0");
        return;
      }

      try {
        const usdcAddress = getUSDCAddress(chainId);
        
        // USDC ABI for balanceOf function
        const usdcAbi = [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "decimals",
            outputs: [{ name: "decimals", type: "uint8" }],
            stateMutability: "view",
            type: "function",
          },
        ] as const;

        // Get USDC balance
        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [evmAddress],
        });

        // Get USDC decimals
        const decimals = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "decimals",
        });

        // Convert from wei to USDC (6 decimals)
        const balanceFormatted = (Number(balance) / Math.pow(10, Number(decimals))).toFixed(2);
        console.log("EVM USDC Balance:", {
          address: evmAddress,
          usdcAddress,
          balance: balance.toString(),
          decimals: decimals.toString(),
          formatted: balanceFormatted
        });
        setEvmBalance(balanceFormatted);
      } catch (error) {
        console.error("Error fetching EVM USDC balance:", error);
        setEvmBalance("0");
      }
    };

    fetchEvmBalance();
  }, [evmAddress, evmConnected, publicClient, chainId]);

  // Calculate balances
  const evmSmartWalletBalance = smartWallet.smartWalletData?.balance || "0";
  const aptosVaultBalance = aptosVault.vaultData?.totalValue?.toString() || "0";
  const aptosBalance = aptosBalances.usdc.toString();

  const totalWalletBalance = (
    parseFloat(evmBalance || "0") + parseFloat(aptosBalance || "0")
  ).toFixed(2);

  const totalInvestedBalance = (
    parseFloat(evmSmartWalletBalance || "0") + parseFloat(aptosVaultBalance || "0")
  ).toFixed(2);

  const totalUSDCBalance = (
    parseFloat(totalWalletBalance) + parseFloat(totalInvestedBalance)
  ).toFixed(2);

  // Refresh all balances
  const refreshBalances = async () => {
    // Refresh EVM balance
    if (evmAddress && evmConnected && publicClient && chainId) {
      try {
        const usdcAddress = getUSDCAddress(chainId);
        const usdcAbi = [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
          {
            inputs: [],
            name: "decimals",
            outputs: [{ name: "decimals", type: "uint8" }],
            stateMutability: "view",
            type: "function",
          },
        ] as const;

        const balance = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [evmAddress],
        });

        const decimals = await publicClient.readContract({
          address: usdcAddress,
          abi: usdcAbi,
          functionName: "decimals",
        });

        const balanceFormatted = (Number(balance) / Math.pow(10, Number(decimals))).toFixed(2);
        setEvmBalance(balanceFormatted);
      } catch (error) {
        console.error("Error refreshing EVM balance:", error);
      }
    }

    // Refresh other balances
    await Promise.all([
      smartWallet.getUSDCBalance?.(),
      aptosVault.refresh?.(),
    ]);
  };

  // Disconnect methods
  const disconnectEVM = () => {
    // EVM disconnect is handled by wagmi/RainbowKit
    console.log("Disconnect EVM wallet");
  };

  const disconnectAll = () => {
    disconnectEVM();
    if (aptosConnected) {
      aptosDisconnect();
    }
  };

  return {
    evmAddress,
    evmConnected,
    evmChainId: chainId,
    evmBalance,
    evmSmartWalletBalance,

    aptosAddress: aptosAccount?.address,
    aptosConnected,
    aptosBalance,
    aptosVaultBalance,
    aptosNetwork: aptosNetwork?.name,

    isFullyConnected: evmConnected && aptosConnected,
    totalUSDCBalance,
    totalInvestedBalance,
    totalWalletBalance,

    disconnectEVM,
    disconnectAptos: aptosDisconnect,
    disconnectAll,
    refreshBalances,
  };
}

// Hook to check if Aptos wallet is available
export function useIsAptosWalletAvailable(): boolean {
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    // Check if Petra wallet is installed
    const checkWallet = () => {
      if (typeof window !== "undefined") {
        const hasPetra = "aptos" in window;
        const hasMartian = "martian" in window;
        setIsAvailable(hasPetra || hasMartian);
      }
    };

    checkWallet();
  }, []);

  return isAvailable;
}
