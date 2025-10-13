/**
 * Enhanced Aptos balance hook using GraphQL for comprehensive balance fetching
 * Uses the GetFungibleAssetBalances query for more efficient and complete data
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { APTOS_CONFIG } from "../config/aptos.config";

export interface AptosBalanceData {
  apt: number;
  usdc: number;
  loading: boolean;
  error: string | null;
  allAssets: Array<{
    asset_type: string;
    amount: string;
    formatted_amount: number;
    decimals: number;
  }>;
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

export function useAptosBalanceGraphQL(): AptosBalanceData {
  const { account, connected } = useWallet();
  const [balanceData, setBalanceData] = useState<AptosBalanceData>({
    apt: 0,
    usdc: 0,
    loading: false,
    error: null,
    allAssets: [],
  });

  useEffect(() => {
    if (!account?.address || !connected) {
      setBalanceData({
        apt: 0,
        usdc: 0,
        loading: false,
        error: null,
        allAssets: [],
      });
      return;
    }

    const fetchBalances = async () => {
      try {
        setBalanceData(prev => ({ ...prev, loading: true, error: null }));

        console.log("🔍 Fetching fungible assets via GraphQL for:", account.address);
        console.log("📡 Using indexer:", APTOS_CONFIG.indexerUrl);

        // Try both v1 and v2 token standards
        const tokenStandards = ["v1", "v2"];
        let allAssets: any[] = [];

        for (const standard of tokenStandards) {
          console.log(`🔍 Trying token standard: ${standard}`);
          
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
                token_standard: standard,
              },
            }),
          });

          if (!response.ok) {
            console.warn(`⚠️ HTTP error for ${standard}: ${response.status}`);
            continue;
          }

          const data = await response.json();
          console.log(`📊 GraphQL Response for ${standard}:`, data);

          if (data.errors) {
            console.warn(`⚠️ GraphQL errors for ${standard}:`, data.errors);
            continue;
          }

          const assets = data.data?.current_fungible_asset_balances || [];
          console.log(`📊 Assets found for ${standard}:`, assets.length);
          allAssets = [...allAssets, ...assets];
        }

        // Remove duplicates based on asset_type
        const uniqueAssets = allAssets.filter((asset, index, self) => 
          index === self.findIndex(a => a.asset_type === asset.asset_type)
        );
        
        console.log("📊 Total unique assets found:", uniqueAssets.length);
        console.log("📊 All unique assets:", uniqueAssets);

        // Process all assets
        const USDC_FA_ADDRESS = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";

        const processedAssets = uniqueAssets.map((asset: any) => {
          let decimals = 8; // Default to APT decimals
          let formatted_amount = 0;

          if (asset.asset_type.includes("::coin::USDC") ||
              asset.asset_type.includes(USDC_FA_ADDRESS) ||
              asset.asset_type === USDC_FA_ADDRESS) {
            decimals = 6; // USDC has 6 decimals
            formatted_amount = Number(asset.amount) / 1e6;
          } else if (asset.asset_type.includes("::aptos_coin::AptosCoin")) {
            decimals = 8; // APT has 8 decimals
            formatted_amount = Number(asset.amount) / 1e8;
          } else {
            // Try to detect decimals from asset type or use default
            formatted_amount = Number(asset.amount) / 1e8;
          }

          return {
            asset_type: asset.asset_type,
            amount: asset.amount,
            formatted_amount,
            decimals,
          };
        });

        // Extract specific balances
        // USDC_FA_ADDRESS already declared above at line 123
        const usdcAsset = processedAssets.find(asset =>
          asset.asset_type.includes("::coin::USDC") ||
          asset.asset_type.includes(USDC_FA_ADDRESS) ||
          asset.asset_type === USDC_FA_ADDRESS
        );
        const aptAsset = processedAssets.find(asset =>
          asset.asset_type.includes("::aptos_coin::AptosCoin")
        );

        const usdcBalance = usdcAsset?.formatted_amount || 0;
        const aptBalance = aptAsset?.formatted_amount || 0;

        console.log("💰 Processed balances:", {
          usdc: usdcBalance,
          apt: aptBalance,
          totalAssets: processedAssets.length,
          usdcAsset: usdcAsset?.asset_type,
          aptAsset: aptAsset?.asset_type,
        });

        setBalanceData({
          apt: aptBalance,
          usdc: usdcBalance,
          loading: false,
          error: null,
          allAssets: processedAssets,
        });

        // If no assets found, log a warning
        if (uniqueAssets.length === 0) {
          console.warn("⚠️ No fungible assets found via GraphQL. This could mean:");
          console.warn("1. The address has no fungible assets");
          console.warn("2. The GraphQL endpoint is not working");
          console.warn("3. The token standard is incorrect");
          console.warn("4. The USDC FA address is incorrect");
        }

      } catch (err: any) {
        console.error("❌ Error fetching fungible assets:", err);
        setBalanceData(prev => ({
          ...prev,
          loading: false,
          error: err.message,
        }));
      }
    };

    fetchBalances();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBalances, 30000);
    return () => clearInterval(interval);
  }, [account?.address, connected]);

  return balanceData;
}