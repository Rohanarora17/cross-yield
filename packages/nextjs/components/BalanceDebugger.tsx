/**
 * Balance Debugger Component
 * Shows detailed balance information for debugging
 */

"use client";

import { useMultiChainWallet } from "~~/hooks/useMultiChainWallet";
import { useAptosBalance } from "~~/hooks/useAptosBalance";
import { useAptosBalanceGraphQL } from "~~/hooks/useAptosBalanceGraphQL";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { RefreshCw } from "lucide-react";

export function BalanceDebugger() {
  const multiChainWallet = useMultiChainWallet();
  const aptosBalances = useAptosBalance();
  const aptosBalanceGraphQL = useAptosBalanceGraphQL();

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Balance Debugger
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* EVM Wallet Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">🔷 EVM Wallet</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Address:</div>
              <div className="font-mono">{multiChainWallet.evmAddress || "Not connected"}</div>
              <div>Connected:</div>
              <Badge variant={multiChainWallet.evmConnected ? "default" : "secondary"}>
                {multiChainWallet.evmConnected ? "Yes" : "No"}
              </Badge>
              <div>Chain ID:</div>
              <div>{multiChainWallet.evmChainId || "N/A"}</div>
              <div>USDC Balance:</div>
              <div className="font-mono">${multiChainWallet.evmBalance}</div>
              <div>Smart Wallet Balance:</div>
              <div className="font-mono">${multiChainWallet.evmSmartWalletBalance}</div>
            </div>
          </div>

          {/* Aptos Wallet Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">🟣 Aptos Wallet</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Address:</div>
              <div className="font-mono">{multiChainWallet.aptosAddress || "Not connected"}</div>
              <div>Connected:</div>
              <Badge variant={multiChainWallet.aptosConnected ? "default" : "secondary"}>
                {multiChainWallet.aptosConnected ? "Yes" : "No"}
              </Badge>
              <div>Network:</div>
              <div>{multiChainWallet.aptosNetwork || "N/A"}</div>
              <div>APT Balance:</div>
              <div className="font-mono">{aptosBalances.apt.toFixed(4)} APT</div>
              <div>USDC Balance:</div>
              <div className="font-mono">${aptosBalances.usdc.toFixed(2)}</div>
              <div>Vault Balance:</div>
              <div className="font-mono">${multiChainWallet.aptosVaultBalance}</div>
            </div>
          </div>

          {/* Combined Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">📊 Combined</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Total Wallet Balance:</div>
              <div className="font-mono">${multiChainWallet.totalWalletBalance}</div>
              <div>Total Invested Balance:</div>
              <div className="font-mono">${multiChainWallet.totalInvestedBalance}</div>
              <div>Total USDC Balance:</div>
              <div className="font-mono font-bold">${multiChainWallet.totalUSDCBalance}</div>
              <div>Fully Connected:</div>
              <Badge variant={multiChainWallet.isFullyConnected ? "default" : "secondary"}>
                {multiChainWallet.isFullyConnected ? "Yes" : "No"}
              </Badge>
            </div>
          </div>

          {/* Loading States */}
          <div className="space-y-2">
            <h3 className="font-semibold">⏳ Loading States</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Aptos Loading:</div>
              <Badge variant={aptosBalances.loading ? "default" : "secondary"}>
                {aptosBalances.loading ? "Loading..." : "Ready"}
              </Badge>
              <div>Aptos Error:</div>
              <div className="text-red-500">{aptosBalances.error || "None"}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GraphQL Balance Data */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            GraphQL Balance Data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold">💰 GraphQL Balances</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>APT (GraphQL):</div>
              <div className="font-mono">{aptosBalanceGraphQL.apt.toFixed(6)} APT</div>
              <div>USDC (GraphQL):</div>
              <div className="font-mono">${aptosBalanceGraphQL.usdc.toFixed(2)}</div>
              <div>Loading:</div>
              <Badge variant={aptosBalanceGraphQL.loading ? "default" : "secondary"}>
                {aptosBalanceGraphQL.loading ? "Loading..." : "Ready"}
              </Badge>
              <div>Error:</div>
              <div className="text-red-500">{aptosBalanceGraphQL.error || "None"}</div>
            </div>
          </div>

          {/* All Assets */}
          {aptosBalanceGraphQL.allAssets.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">📊 All Fungible Assets ({aptosBalanceGraphQL.allAssets.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {aptosBalanceGraphQL.allAssets.map((asset, index) => (
                  <div key={index} className="text-xs p-2 bg-muted rounded">
                    <div className="font-mono text-blue-600">{asset.asset_type}</div>
                    <div className="text-green-600">
                      {asset.formatted_amount.toFixed(6)} (raw: {asset.amount})
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}