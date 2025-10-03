// Multi-Chain Wallet Hook - Manages both EVM and Aptos wallet connections
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

export interface MultiChainWalletState {
  // EVM State
  evmAddress: string | undefined;
  evmConnected: boolean;
  evmChainId: number | undefined;
  evmBalance: string;

  // Aptos State
  aptosAddress: string | undefined;
  aptosConnected: boolean;
  aptosBalance: string;
  aptosNetwork: string | undefined;

  // Combined State
  isFullyConnected: boolean; // Both wallets connected
  totalUSDCBalance: string;

  // Methods
  disconnectEVM: () => void;
  disconnectAptos: () => void;
  disconnectAll: () => void;
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

  // State for balances
  const [evmBalance, setEvmBalance] = useState<string>("0");
  const [aptosBalance, setAptosBalance] = useState<string>("0");

  // Fetch EVM USDC balance
  useEffect(() => {
    const fetchEvmBalance = async () => {
      if (!evmAddress || !evmConnected) {
        setEvmBalance("0");
        return;
      }

      try {
        // This would use your existing USDC balance hook
        // For now, we'll set a placeholder
        setEvmBalance("0");
      } catch (error) {
        console.error("Error fetching EVM balance:", error);
        setEvmBalance("0");
      }
    };

    fetchEvmBalance();
  }, [evmAddress, evmConnected]);

  // Fetch Aptos USDC balance
  useEffect(() => {
    const fetchAptosBalance = async () => {
      if (!aptosAccount?.address || !aptosConnected) {
        setAptosBalance("0");
        return;
      }

      try {
        const config = new AptosConfig({
          network: aptosNetwork?.name as Network || Network.TESTNET
        });
        const aptos = new Aptos(config);

        // Fetch USDC balance (Circle USDC on Aptos)
        const usdcType = "0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T";

        const resources = await aptos.getAccountResources({
          accountAddress: aptosAccount.address
        });

        const coinResource = resources.find(
          (r) => r.type === `0x1::coin::CoinStore<${usdcType}>`
        );

        if (coinResource && coinResource.data) {
          const data = coinResource.data as any;
          const balance = data.coin?.value || "0";
          // Convert from smallest unit (6 decimals for USDC)
          setAptosBalance((parseInt(balance) / 1_000_000).toFixed(2));
        } else {
          setAptosBalance("0");
        }
      } catch (error) {
        console.error("Error fetching Aptos balance:", error);
        setAptosBalance("0");
      }
    };

    fetchAptosBalance();
  }, [aptosAccount, aptosConnected, aptosNetwork]);

  // Calculate total USDC balance
  const totalUSDCBalance = (
    parseFloat(evmBalance || "0") + parseFloat(aptosBalance || "0")
  ).toFixed(2);

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

    aptosAddress: aptosAccount?.address,
    aptosConnected,
    aptosBalance,
    aptosNetwork: aptosNetwork?.name,

    isFullyConnected: evmConnected && aptosConnected,
    totalUSDCBalance,

    disconnectEVM,
    disconnectAptos: aptosDisconnect,
    disconnectAll,
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
