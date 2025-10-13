/**
 * Hook to fetch all fungible asset balances using GraphQL
 * More comprehensive than individual resource calls
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { APTOS_CONFIG } from "../config/aptos.config";

export interface FungibleAssetBalance {
  asset_type: string;
  amount: string;
  __typename: string;
}

export interface AptosFungibleAssets {
  balances: FungibleAssetBalance[];
  loading: boolean;
  error: string | null;
  usdcBalance: number;
  aptBalance: number;
}

const GRAPHQL_QUERY = `
  query GetFungibleAssetBalances(
    $address: String!
    $offset: Int
    $token_standard: String
  ) {
    current_fungible_asset_balances(
      where: {
        owner_address: { _eq: $address }
        token_standard: { _eq: $token_standard }
      }
      offset: $offset
      limit: 100
      order_by: { amount: desc }
    ) {
      asset_type
      amount
      __typename
    }
  }
`;

export function useAptosFungibleAssets(): AptosFungibleAssets {
  const { account, connected } = useWallet();
  const [balances, setBalances] = useState<FungibleAssetBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get USDC and APT balances from the fungible asset data
  const usdcBalance = balances.find(balance => 
    balance.asset_type.includes("::coin::USDC")
  )?.amount ? Number(balances.find(balance => 
    balance.asset_type.includes("::coin::USDC")
  )?.amount) / 1e6 : 0;

  const aptBalance = balances.find(balance => 
    balance.asset_type.includes("::aptos_coin::AptosCoin")
  )?.amount ? Number(balances.find(balance => 
    balance.asset_type.includes("::aptos_coin::AptosCoin")
  )?.amount) / 1e8 : 0;

  useEffect(() => {
    if (!account?.address || !connected) {
      setBalances([]);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchFungibleAssets = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("Fetching fungible assets for:", account.address);
        console.log("Using indexer:", APTOS_CONFIG.indexerUrl);

        const response = await fetch(APTOS_CONFIG.indexerUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            query: GRAPHQL_QUERY,
            variables: {
              address: account.address,
              offset: 0,
              token_standard: "v2", // Use v2 for new FA standard
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.errors) {
          throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
        }

        const fungibleAssets = data.data?.current_fungible_asset_balances || [];
        
        console.log("Fungible assets fetched:", fungibleAssets);
        console.log("USDC Balance:", usdcBalance);
        console.log("APT Balance:", aptBalance);

        setBalances(fungibleAssets);
      } catch (err: any) {
        console.error("Error fetching fungible assets:", err);
        setError(err.message);
        setBalances([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFungibleAssets();
  }, [account?.address, connected]);

  return {
    balances,
    loading,
    error,
    usdcBalance,
    aptBalance,
  };
}