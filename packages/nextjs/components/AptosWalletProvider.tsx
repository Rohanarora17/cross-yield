// Aptos Wallet Provider - Wraps the app with Aptos wallet functionality
"use client";

import { AptosWalletAdapterProvider, NetworkName, type Network } from "@aptos-labs/wallet-adapter-react";
import { ReactNode } from "react";

interface AptosWalletProviderProps {
  children: ReactNode;
}

export function AptosWalletProvider({ children }: AptosWalletProviderProps) {
  return (
    <AptosWalletAdapterProvider
      autoConnect={true}
      dappConfig={{
        network: NetworkName.Testnet as unknown as Network,
        aptosConnectDappId: "crossyield"
      }}
      // Let the adapter auto-detect all available wallets
      onError={(error) => {
        console.error("Aptos wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
