"use client";

import Link from "next/link";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { CCTPBridge } from "~~/components/CCTPBridge";
import { ArrowLeft, Info, Shield, Zap } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function BridgePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/strategies">
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Strategies
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-purple-500">
                  <span className="text-xs font-bold text-primary-foreground">C</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  CrossYield
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent mb-4">
            CCTP Bridge
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Transfer USDC from Base Sepolia to Aptos Testnet using Circle's Cross-Chain Transfer Protocol
          </p>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-400">Fast Transfer</h3>
                  <p className="text-sm text-muted-foreground">3-5 minutes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Shield className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-400">Secure</h3>
                  <p className="text-sm text-muted-foreground">Circle CCTP v1</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 bg-purple-500/10 rounded-full flex items-center justify-center">
                  <svg className="h-6 w-6 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0L2 12h8v12h4V12h8L12 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-purple-400">Aptos Ready</h3>
                  <p className="text-sm text-muted-foreground">Access 8-12% APY</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info Banner */}
        <Card className="mb-8 border-blue-500/50 bg-blue-500/5">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-blue-400">
              <Info className="h-5 w-5" />
              <span>How it Works</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
              <div className="text-center">
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold">1</span>
                </div>
                <p className="font-medium text-blue-400">Connect Wallets</p>
                <p className="text-muted-foreground text-xs">Base & Aptos</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold">2</span>
                </div>
                <p className="font-medium text-blue-400">Approve USDC</p>
                <p className="text-muted-foreground text-xs">TokenMessenger</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold">3</span>
                </div>
                <p className="font-medium text-blue-400">Burn on Base</p>
                <p className="text-muted-foreground text-xs">CCTP Transfer</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold">4</span>
                </div>
                <p className="font-medium text-blue-400">Get Attestation</p>
                <p className="text-muted-foreground text-xs">Circle Iris API</p>
              </div>
              <div className="text-center">
                <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-blue-400 font-bold">5</span>
                </div>
                <p className="font-medium text-blue-400">Mint on Aptos</p>
                <p className="text-muted-foreground text-xs">Receive USDC</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bridge Component */}
        <div className="max-w-4xl mx-auto">
          <CCTPBridge />
        </div>

        {/* Additional Info */}
        <Card className="mt-8 max-w-4xl mx-auto border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle>Why Bridge to Aptos?</CardTitle>
            <CardDescription>Access higher yields and diversify across chains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-green-400 mb-2">Higher APY</h4>
                <p className="text-sm text-muted-foreground">
                  Aptos protocols offer 8-12% APY compared to 4-6% on EVM chains, giving you a potential
                  2.5-3.8% boost in annual returns.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-blue-400 mb-2">Diversification</h4>
                <p className="text-sm text-muted-foreground">
                  Spread your capital across multiple blockchains to reduce systemic risk and maximize
                  capital efficiency.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-purple-400 mb-2">5 Aptos Protocols</h4>
                <p className="text-sm text-muted-foreground">
                  Access Liquidswap (9.5%), Thala Finance (11.2%), Aries Markets (8.7%), Tortuga Finance
                  (7.3%), and PancakeSwap Aptos (8.1%).
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-orange-400 mb-2">AI-Optimized</h4>
                <p className="text-sm text-muted-foreground">
                  Our AI analyzes all protocols and selects the best allocation strategy based on your
                  risk tolerance and market conditions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
