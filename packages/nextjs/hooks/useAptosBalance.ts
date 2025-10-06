/**
 * Hook to fetch real Aptos wallet balances
 * Gets APT and USDC FA balances from Aptos blockchain
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { APTOS_CONFIG } from "../config/aptos.config";
import { useAptosFungibleAssets } from "./useAptosFungibleAssets";

// Initialize Aptos client with proper network configuration
const config = new AptosConfig({ 
  network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET 
});
const aptos = new Aptos(config);

// USDC FA metadata address (official Circle USDC on Aptos)
// Use the correct address based on network
const USDC_FA_METADATA = APTOS_CONFIG.network === "mainnet" 
  ? "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"  // Mainnet
  : "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"; // Testnet
const USDC_TYPE = `${USDC_FA_METADATA}::coin::USDC`;

export interface AptosBalances {
  apt: number;
  usdc: number;
  loading: boolean;
  error: string | null;
}

export function useAptosBalance() {
  const { account } = useWallet();
  const [balances, setBalances] = useState<AptosBalances>({
    apt: 0,
    usdc: 0,
    loading: false,
    error: null,
  });

  useEffect(() => {
    if (!account?.address) {
      setBalances({ apt: 0, usdc: 0, loading: false, error: null });
      return;
    }

    const fetchBalances = async () => {
      try {
        setBalances(prev => ({ ...prev, loading: true, error: null }));

        // Get APT balance
        const aptBalance = await aptos.getAccountAPTAmount({
          accountAddress: account.address,
        });

        // Get USDC FA balance using the correct FA method
        let usdcBalance = 0;
        try {
          // Get USDC FA balance using primary_fungible_store::balance equivalent
          const usdcResource = await aptos.getAccountResource({
            accountAddress: account.address,
            resourceType: `0x1::coin::CoinStore<${USDC_TYPE}>`,
          });

          if (usdcResource && usdcResource.data) {
            const data = usdcResource.data as any;
            const rawBalance = data.coin?.value || "0";
            usdcBalance = Number(rawBalance) / 1e6; // USDC has 6 decimals
            console.log("Aptos USDC Balance found:", {
              address: account.address,
              usdcType: USDC_TYPE,
              rawBalance: rawBalance,
              formatted: usdcBalance
            });
          }
        } catch (err: any) {
          if (err.status === 404) {
            console.log("ℹ️ No USDC FA balance found for address:", account.address);
            console.log("ℹ️ This is normal if the address has no USDC FA tokens");
            console.log("ℹ️ USDC FA Type attempted:", USDC_TYPE);
          } else {
            console.error("❌ Error fetching USDC FA balance:", err);
            console.error("❌ USDC FA Type attempted:", USDC_TYPE);
          }
        }

        setBalances({
          apt: Number(aptBalance) / 1e8, // 8 decimals
          usdc: usdcBalance,
          loading: false,
          error: null,
        });
      } catch (err: any) {
        console.error("Error fetching Aptos balances:", err);
        setBalances({
          apt: 0,
          usdc: 0,
          loading: false,
          error: err.message || "Failed to fetch balances",
        });
      }
    };

    fetchBalances();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [account?.address]);

  return balances;
}
