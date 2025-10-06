// Multi-Chain Wallet Connect - Shows both EVM and Aptos wallet status
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { useMultiChainWallet } from "~~/hooks/useMultiChainWallet";
import { Wallet, Check, X, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";

export function MultiChainWalletConnect() {
  const wallet = useMultiChainWallet();
  const { connect: connectAptos, wallets: aptosWallets } = useAptosWallet();

  const getStatusColor = (connected: boolean) =>
    connected ? "bg-green-500" : "bg-red-500";

  const getStatusIcon = (connected: boolean) =>
    connected ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />;

  return (
    <div className="space-y-4">
      {/* Status Overview */}
      <Card className={wallet.isFullyConnected ? "border-green-500/50 bg-green-500/5" : "border-border"}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">
                  {wallet.isFullyConnected ? "Multi-Chain Ready" : "Connect Wallets"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {wallet.isFullyConnected
                    ? "Both EVM and Aptos wallets connected"
                    : "Connect both wallets to access cross-chain strategies"}
                </p>
              </div>
            </div>
            {wallet.isFullyConnected && (
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                Total: ${wallet.totalUSDCBalance} USDC
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Wallet Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* EVM Wallet Card */}
        <Card className={`${wallet.evmConnected ? "border-blue-500/50" : "border-border"} min-h-0 overflow-hidden`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div
                className={`w-3 h-3 rounded-full ${getStatusColor(wallet.evmConnected)}`}
              />
              <span>🔷 EVM Chains</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallet.evmConnected ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <span className="text-sm font-mono">
                      {wallet.evmAddress?.slice(0, 6)}...{wallet.evmAddress?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Network</span>
                    <Badge variant="outline" className="text-xs">
                      {wallet.evmChainId === 1 ? "Ethereum" :
                       wallet.evmChainId === 11155111 ? "Sepolia" :
                       wallet.evmChainId === 8453 ? "Base" :
                       wallet.evmChainId === 84532 ? "Base Sepolia" :
                       wallet.evmChainId === 42161 ? "Arbitrum" :
                       wallet.evmChainId === 421614 ? "Arbitrum Sepolia" :
                       `Chain ${wallet.evmChainId}`}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">USDC Balance</span>
                    <span className="text-sm font-semibold">${wallet.evmBalance}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <div className="scale-75 origin-center">
                    <ConnectButton />
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your EVM wallet to access Ethereum, Base, Arbitrum, and more
                  </p>
                  <div className="scale-75 origin-center">
                    <ConnectButton />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Aptos Wallet Card */}
        <Card className={`${wallet.aptosConnected ? "border-purple-500/50" : "border-border"} min-h-0 overflow-hidden`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <div
                className={`w-3 h-3 rounded-full ${getStatusColor(wallet.aptosConnected)}`}
              />
              <span>🟣 Aptos Chain</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {wallet.aptosConnected ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Address</span>
                    <span className="text-sm font-mono">
                      {wallet.aptosAddress?.slice(0, 6)}...{wallet.aptosAddress?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Network</span>
                    <Badge variant="outline" className="text-xs">
                      {wallet.aptosNetwork || "Testnet"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">USDC Balance</span>
                    <span className="text-sm font-semibold">${wallet.aptosBalance}</span>
                  </div>
                </div>
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => wallet.disconnectAptos()}
                  >
                    Disconnect Aptos
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-6">
                  <Wallet className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Aptos wallet to access higher yields on Aptos
                  </p>
                  {aptosWallets.length > 0 ? (
                    <div className="space-y-2">
                      {aptosWallets.map((w) => (
                        <Button
                          key={w.name}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => connectAptos(w.name)}
                        >
                          Connect {w.name}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          No Aptos wallet detected. Please install one of these wallets:
                        </AlertDescription>
                      </Alert>
                      <div className="grid grid-cols-1 gap-2">
                        <a
                          href="https://petra.app"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-6 h-6 bg-blue-500 rounded"></div>
                          <span className="text-sm font-medium">Petra Wallet</span>
                        </a>
                        <a
                          href="https://pontem.network/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-6 h-6 bg-purple-500 rounded"></div>
                          <span className="text-sm font-medium">Pontem Wallet</span>
                        </a>
                        <a
                          href="https://martianwallet.xyz/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                        >
                          <div className="w-6 h-6 bg-orange-500 rounded"></div>
                          <span className="text-sm font-medium">Martian Wallet</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Help Section */}
      {!wallet.isFullyConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Why connect both?</strong> CrossYield optimizes your yields across EVM chains
            (Ethereum, Base, Arbitrum) AND Aptos. By connecting both wallets, you can access
            8-12% APY on Aptos vs 4-6% on EVM chains alone.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
