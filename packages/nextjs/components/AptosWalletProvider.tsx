// Aptos Wallet Provider - Wraps the app with Aptos wallet functionality
"use client";

import { AptosWalletAdapterProvider } from "@aptos-labs/wallet-adapter-react";
import { PetraWallet } from "petra-plugin-wallet-adapter";
import { Network } from "@aptos-labs/ts-sdk";
import { ReactNode } from "react";

interface AptosWalletProviderProps {
  children: ReactNode;
}

export function AptosWalletProvider({ children }: AptosWalletProviderProps) {
  const wallets = [new PetraWallet()];

  const network = process.env.NEXT_PUBLIC_APTOS_NETWORK === "mainnet"
    ? Network.MAINNET
    : Network.TESTNET;

  return (
    <AptosWalletAdapterProvider
      plugins={wallets}
      autoConnect={true}
      onError={(error) => {
        console.error("Aptos wallet error:", error);
      }}
    >
      {children}
    </AptosWalletAdapterProvider>
  );
}
