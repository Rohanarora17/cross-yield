/**
 * Real Dashboard Component
 * Displays actual multi-chain portfolio data with real-time updates
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Alert, AlertDescription } from "./ui/alert";
import { useMultiChainPortfolio } from "~~/hooks/useMultiChainPortfolio";
import { useMultiChainWallet } from "~~/hooks/useMultiChainWallet";
import { BalanceDebugger } from "./BalanceDebugger";
import { USDCFATest } from "./USDCFATest";
import { USDCFAAddressTest } from "./USDCFAAddressTest";
import { GraphQLTest } from "./GraphQLTest";
import { AaveAdminPanel } from "./AaveAdminPanel";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Zap, 
  Shield, 
  Activity, 
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Wallet,
  Globe,
  BarChart3,
  PieChart,
  Settings
} from "lucide-react";

export function RealDashboard() {
  const portfolio = useMultiChainPortfolio();
  const multiChainWallet = useMultiChainWallet();
  const [selectedTimeframe, setSelectedTimeframe] = useState("30D");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await portfolio.refreshPortfolio();
    setIsRefreshing(false);
  };

  if (!portfolio.isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Multi-Chain Portfolio Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallets to view your cross-chain yield optimization performance
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connect Your Wallets</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect both EVM and Aptos wallets to access the full dashboard
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${multiChainWallet.evmConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>EVM Wallet: {multiChainWallet.evmConnected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-2 h-2 rounded-full ${multiChainWallet.aptosConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span>Aptos Wallet: {multiChainWallet.aptosConnected ? 'Connected' : 'Not Connected'}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (portfolio.loading && !portfolio.portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary" />
              <p className="text-muted-foreground">Loading portfolio data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (portfolio.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <Alert className="max-w-2xl mx-auto">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error loading portfolio:</strong> {portfolio.error}
              <Button 
                variant="outline" 
                size="sm" 
                className="ml-4"
                onClick={handleRefresh}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  const data = portfolio.portfolio;
  const positions = portfolio.positions;
  const transactions = portfolio.transactions;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Portfolio Dashboard
              </h1>
              <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500">
                Live Data
              </Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Last updated: {data ? new Date(data.lastUpdate).toLocaleTimeString() : 'Never'}
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Debug Info - Remove this in production */}
            <div className="mb-8 space-y-4">
              <BalanceDebugger />
              <USDCFATest />
              <USDCFAAddressTest />
              <GraphQLTest />
            </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                ${data?.totalValue.toLocaleString() || '0'}
              </div>
              <div className="flex items-center text-sm">
                {data?.gainPercentage && data.gainPercentage >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
                )}
                <span className={data?.gainPercentage && data.gainPercentage >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {data?.gainPercentage ? `${data.gainPercentage >= 0 ? '+' : ''}${data.gainPercentage.toFixed(2)}%` : '0%'}
                </span>
                <span className="text-muted-foreground ml-1">({selectedTimeframe})</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current APY</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {data?.currentAPY.toFixed(2) || '0'}%
              </div>
              <div className="text-sm text-muted-foreground">
                Weighted average across all positions
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Yield</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">
                ${data?.dailyYield.toFixed(2) || '0'}
              </div>
              <div className="text-sm text-muted-foreground">
                ${data?.monthlyYield.toFixed(2) || '0'} monthly
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">
                {data?.riskScore ? Math.round(data.riskScore) : 0}/100
              </div>
              <div className="flex items-center text-sm">
                <div className="w-full bg-muted rounded-full h-2 mr-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${data?.riskScore || 0}%` }}
                  ></div>
                </div>
                <span className="text-muted-foreground">
                  {data?.riskScore && data.riskScore > 80 ? 'Low' : 
                   data?.riskScore && data.riskScore > 60 ? 'Medium' : 'High'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Aave Admin Panel - For vault management */}
        <div className="mb-8">
          <div className="mb-4">
            <h2 className="text-2xl font-bold text-foreground mb-2">Vault Management</h2>
            <p className="text-muted-foreground mb-4">
              Deploy vault funds to Aave V3 for real yield generation. The vault tracks your position while earning DeFi yields.
            </p>
            
            {/* Complete Flow Explanation */}
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">Complete Flow</h3>
              <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span><strong>Step 1:</strong> Bridge USDC from Base Sepolia → Aptos via CCTP</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span><strong>Step 2:</strong> Deposit USDC to vault contract (Move contract)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span><strong>Step 3:</strong> Deploy to Aave V3 using admin panel below</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span><strong>Result:</strong> Real yield generation on Aave V3 + vault tracking</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Aave Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Aave V3 Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">Active</div>
                <div className="text-sm text-muted-foreground">Real yield generation</div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Vault Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-400">On-Chain</div>
                <div className="text-sm text-muted-foreground">Move contract tracking</div>
              </CardContent>
            </Card>
            
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Protocol</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-400">Aave V3</div>
                <div className="text-sm text-muted-foreground">Aptos testnet</div>
              </CardContent>
            </Card>
          </div>
          
          <AaveAdminPanel />
        </div>

        {/* Portfolio Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Positions Breakdown */}
          <Card className="lg:col-span-2 border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-foreground">Portfolio Positions</CardTitle>
              <CardDescription>Your current allocations across protocols and chains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {positions.length > 0 ? (
                  positions.map((position) => (
                    <div key={position.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-primary"></div>
                          <div>
                            <div className="font-medium text-foreground">{position.protocol}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {position.chain}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-foreground">
                            ${position.value.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {position.percentage.toFixed(1)}% • {position.apy.toFixed(1)}% APY
                          </div>
                        </div>
                      </div>
                      <Progress value={position.percentage} className="h-2" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <PieChart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No positions found</p>
                    <p className="text-sm">Connect wallets and deposit funds to see positions</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Chain Distribution */}
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-foreground">Chain Distribution</CardTitle>
              <CardDescription>Allocation across different blockchains</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data?.chainCount ? (
                  <>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary">{data.chainCount}</div>
                      <div className="text-sm text-muted-foreground">Active Chains</div>
                    </div>
                    <div className="space-y-2">
                      {multiChainWallet.evmConnected && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">EVM Chains</span>
                          <Badge variant="outline">Connected</Badge>
                        </div>
                      )}
                      {multiChainWallet.aptosConnected && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Aptos</span>
                          <Badge variant="outline">Connected</Badge>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Globe className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No chains connected</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20 mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Transactions</CardTitle>
            <CardDescription>Latest activity across all chains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {transactions.length > 0 ? (
                transactions.slice(0, 10).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-gradient-to-r from-muted/5 to-muted/10 hover:from-muted/10 hover:to-muted/20 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${
                        tx.type === "deposit" ? "bg-green-500/10" :
                        tx.type === "withdraw" ? "bg-red-500/10" :
                        tx.type === "supply" ? "bg-blue-500/10" :
                        tx.type === "claim" ? "bg-yellow-500/10" :
                        "bg-purple-500/10"
                      }`}>
                        {tx.type === "deposit" ? (
                          <ArrowDownRight className="h-4 w-4 text-green-500" />
                        ) : tx.type === "withdraw" ? (
                          <ArrowUpRight className="h-4 w-4 text-red-500" />
                        ) : tx.type === "supply" ? (
                          <Zap className="h-4 w-4 text-blue-500" />
                        ) : tx.type === "claim" ? (
                          <Target className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <ArrowRightLeft className="h-4 w-4 text-purple-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-foreground capitalize">{tx.type}</div>
                        <div className="text-sm text-muted-foreground">
                          {tx.protocol} • {tx.fromChain}
                          {tx.toChain && ` → ${tx.toChain}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-foreground">${tx.amount.toLocaleString()}</div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        <Badge 
                          variant="secondary" 
                          className={
                            tx.status === "completed" ? "bg-green-500/10 text-green-400" :
                            tx.status === "failed" ? "bg-red-500/10 text-red-400" :
                            "bg-yellow-500/10 text-yellow-400"
                          }
                        >
                          {tx.status === "completed" ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : tx.status === "failed" ? (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No transactions found</p>
                  <p className="text-sm">Start using the platform to see transaction history</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button className="h-16 flex-col gap-2 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
            <Wallet className="h-5 w-5" />
            Deposit USDC
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent">
            <ArrowUpRight className="h-5 w-5" />
            Withdraw
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent">
            <ArrowRightLeft className="h-5 w-5" />
            Cross-Chain Transfer
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent">
            <Target className="h-5 w-5" />
            Optimize Portfolio
          </Button>
        </div>
      </div>
    </div>
  );
}