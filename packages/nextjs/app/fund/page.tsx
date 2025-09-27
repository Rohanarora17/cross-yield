"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRightLeft, Copy, ExternalLink, Loader2, RefreshCw, Wallet } from "lucide-react";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { Progress } from "~~/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";
import { use1inch } from "~~/hooks/use1inch";
import { useSmartWallet } from "~~/hooks/useSmartWallet";

export default function FundPage() {
  const [depositAmount, setDepositAmount] = useState("");
  const [strategy, setStrategy] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [swapFromToken, setSwapFromToken] = useState("WETH");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Smart wallet integration
  const {
    smartWalletAddress,
    smartWalletData,
    createSmartWallet,
    depositToSmartWallet,
    getUSDCBalance,
    isCreating,
    isDepositing,
    hasSmartWallet,
    usdcBalance,
  } = useSmartWallet();

  // 1inch integration
  const {
    getSwapQuote,
    executeSwap,
    getSupportedTokens,
    isLoading: is1inchLoading,
    error: oneinchError,
    chainName,
  } = use1inch();

  const minimumRequired = 10.0;
  const agentBalance = smartWalletData ? parseFloat(smartWalletData.balance) : 0.0;
  const remainingNeeded = Math.max(0, minimumRequired - agentBalance);
  const progressPercentage = Math.min(100, (agentBalance / minimumRequired) * 100);

  const userWallet = "0xCE5...42d6A"; // This would come from connected wallet
  const agentWallet = smartWalletAddress || "0x93c...2d5c6";

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await getUSDCBalance();
    setIsRefreshing(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleCreateWallet = async () => {
    const success = await createSmartWallet();
    if (success) {
      // Wallet created successfully
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount) return;
    const success = await depositToSmartWallet(depositAmount, strategy);
    if (success) {
      setDepositAmount("");
    }
  };

  const handleGetSwapQuote = async () => {
    if (!swapAmount || !swapFromToken) return;

    const quote = await getSwapQuote({
      fromToken: swapFromToken,
      toToken: "USDC",
      amount: swapAmount,
      slippage: 0.5,
    });

    setSwapQuote(quote);
  };

  const handleExecuteSwap = async () => {
    if (!swapAmount || !swapFromToken || !swapQuote) return;

    const success = await executeSwap({
      fromToken: swapFromToken,
      toToken: "USDC",
      amount: swapAmount,
      slippage: 0.5,
    });

    if (success) {
      setSwapAmount("");
      setSwapQuote(null);
      await getUSDCBalance();
    }
  };

  const supportedTokens = getSupportedTokens();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">C</span>
              </div>
              <span className="font-bold">CrossYield</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/optimizer" className="text-foreground/60 hover:text-foreground">
              Optimizer
            </Link>
            <Link href="/fund" className="text-foreground">
              Fund Agent
            </Link>
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Fund Your AI Agent
            </h1>
            <p className="text-muted-foreground text-lg">
              Your AI agent needs USDC to start optimizing yields across chains
            </p>
          </div>

          {/* Minimum Requirement Alert */}
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-semibold">Minimum 10 USDC required</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Your agent needs at least 10 USDC to start generating yield. Current agent balance:{" "}
                {agentBalance.toFixed(2)} USDC
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress to minimum</span>
                  <span>
                    {agentBalance.toFixed(2)} / {minimumRequired.toFixed(2)} USDC
                  </span>
                </div>
                <Progress value={progressPercentage} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  Remaining needed:{" "}
                  <span className="text-destructive font-semibold">{remainingNeeded.toFixed(2)} USDC</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Wallet Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Your Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{userWallet}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(userWallet)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">USDC Balance:</span>
                  <span className="font-semibold">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">AI</span>
                  </div>
                  <span>Agent Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded">{agentWallet}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(agentWallet)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">USDC Balance:</span>
                  <span className="font-semibold">{agentBalance.toFixed(2)} USDC</span>
                </div>
                {smartWalletData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Allocated:</span>
                    <span className="font-semibold">{parseFloat(smartWalletData.totalAllocated).toFixed(2)} USDC</span>
                  </div>
                )}
                {smartWalletData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Protocols:</span>
                    <span className="font-semibold">{smartWalletData.protocolCount}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Balance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Asset Overview</CardTitle>
                <CardDescription>Current balances across wallets</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Balances
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Your Wallet</TableHead>
                    <TableHead>Agent Wallet</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="flex items-center space-x-2">
                      <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">$</span>
                      </div>
                      <span className="font-medium">USDC</span>
                    </TableCell>
                    <TableCell className="font-medium">{parseFloat(usdcBalance).toFixed(3)}</TableCell>
                    <TableCell className="font-medium">{agentBalance.toFixed(3)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-green-400 border-green-400/20">
                        Deposit to agent
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Smart Wallet Creation */}
          {!hasSmartWallet && (
            <Card className="border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Create Your AI Agent Wallet</span>
                </CardTitle>
                <CardDescription>First, create a smart wallet that will manage your USDC automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={handleCreateWallet} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Wallet...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Create Agent Wallet
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Deposit Options */}
          {hasSmartWallet && (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Direct Wallet Deposit */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Direct Wallet Deposit</span>
                  </CardTitle>
                  <CardDescription>Transfer USDC directly from your connected wallet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      max={parseFloat(usdcBalance)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {parseFloat(usdcBalance).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <select
                      id="strategy"
                      className="w-full p-2 border rounded-md bg-background"
                      value={strategy}
                      onChange={e => setStrategy(e.target.value as any)}
                    >
                      <option value="conservative">Conservative (8.2% APY, Low Risk)</option>
                      <option value="balanced">Balanced (15.7% APY, Medium Risk)</option>
                      <option value="aggressive">Aggressive (22.3% APY, High Risk)</option>
                    </select>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleDeposit}
                    disabled={
                      !depositAmount || Number.parseFloat(depositAmount) > parseFloat(usdcBalance) || isDepositing
                    }
                  >
                    {isDepositing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Depositing...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Deposit from Wallet
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* 1inch DEX Swap */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    <span>Swap via 1inch</span>
                  </CardTitle>
                  <CardDescription>Swap any token to USDC using 1inch DEX aggregator</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="swap-from-token">From Token</Label>
                    <select
                      id="swap-from-token"
                      className="w-full p-2 border rounded-md bg-background"
                      value={swapFromToken}
                      onChange={e => setSwapFromToken(e.target.value)}
                    >
                      {supportedTokens.map(token => (
                        <option key={token} value={token}>
                          {token}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="swap-amount">Amount</Label>
                    <Input
                      id="swap-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={swapAmount}
                      onChange={e => setSwapAmount(e.target.value)}
                    />
                  </div>

                  {swapQuote && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">You will receive:</span>
                        <span className="font-semibold">{swapQuote.toAmount} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price Impact:</span>
                        <span className="text-sm">{(swapQuote.priceImpact * 100).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Gas:</span>
                        <span className="text-sm">{swapQuote.estimatedGas}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={handleGetSwapQuote}
                      disabled={!swapAmount || !swapFromToken || is1inchLoading}
                    >
                      {is1inchLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                      )}
                      Get Quote
                    </Button>
                    <Button className="flex-1" onClick={handleExecuteSwap} disabled={!swapQuote || is1inchLoading}>
                      {is1inchLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Execute Swap
                    </Button>
                  </div>

                  {oneinchError && <p className="text-xs text-destructive">{oneinchError}</p>}

                  <p className="text-xs text-muted-foreground">
                    Best rates across 100+ DEXs powered by 1inch on {chainName}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Quick Actions */}
          {hasSmartWallet && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common funding amounts to get started</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[10, 25, 50, 100].map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="h-16 flex-col space-y-1 bg-transparent"
                      onClick={() => setDepositAmount(amount.toString())}
                      disabled={amount > parseFloat(usdcBalance)}
                    >
                      <span className="text-lg font-bold">${amount}</span>
                      <span className="text-xs text-muted-foreground">USDC</span>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
