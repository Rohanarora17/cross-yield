"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import {
  TrendingUp,
  DollarSign,
  Zap,
  Shield,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Settings,
  Bell,
  Wallet,
  Activity,
  BarChart3,
  PieChart,
  RefreshCw,
  ArrowRightLeft,
  CpuChipIcon,
  GlobeAltIcon,
  WifiIcon,
} from "lucide-react";
import { Address, Balance } from "~~/components/scaffold-eth";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

interface PortfolioData {
  totalValue: number;
  currentAPY: number;
  allocations: {
    protocol: string;
    chain: string;
    amount: number;
    apy: number;
    percentage: number;
  }[];
  recentActivity: {
    type: string;
    amount: number;
    protocol: string;
    timestamp: string;
  }[];
}

// Mock data for enhanced dashboard
const portfolioData = [
  { date: "Jan", value: 45000, apy: 8.2 },
  { date: "Feb", value: 47500, apy: 9.1 },
  { date: "Mar", value: 52000, apy: 10.5 },
  { date: "Apr", value: 55800, apy: 11.2 },
  { date: "May", value: 58350, apy: 12.1 },
  { date: "Jun", value: 61200, apy: 12.8 },
];

const holdingsData = [
  { name: "Aave V3", value: 35, color: "#8B5CF6", apy: 14.2, chain: "Ethereum" },
  { name: "Compound", value: 25, color: "#06B6D4", apy: 11.5, chain: "Ethereum" },
  { name: "Moonwell", value: 20, color: "#10B981", apy: 18.7, chain: "Base" },
  { name: "Curve", value: 15, color: "#F59E0B", apy: 12.8, chain: "Arbitrum" },
  { name: "Others", value: 5, color: "#6B7280", apy: 8.5, chain: "Multi" },
];

const strategiesData = [
  { name: "Ethereum", apy: 12.8, allocation: 45, risk: "Low", status: "Active", protocols: 2, tvl: 2400000 },
  { name: "Base", apy: 14.2, allocation: 30, risk: "Medium", status: "Active", protocols: 1, tvl: 1200000 },
  { name: "Arbitrum", apy: 11.5, allocation: 25, risk: "Low", status: "Active", protocols: 1, tvl: 3100000 },
];

const recentTransactions = [
  { type: "Deposit", amount: 5000, protocol: "Aave V3", chain: "Ethereum", time: "2 hours ago", status: "Completed", txHash: "0x1234..." },
  { type: "CCTP Transfer", amount: 12000, protocol: "Cross-Chain", chain: "Ethereum → Base", time: "6 hours ago", status: "Completed", txHash: "0x5678..." },
  { type: "Yield Claim", amount: 245, protocol: "Moonwell", chain: "Base", time: "1 day ago", status: "Completed", txHash: "0x9abc..." },
  { type: "Rebalance", amount: 2500, protocol: "Compound", chain: "Ethereum", time: "2 days ago", status: "Completed", txHash: "0xdef0..." },
];

const Dashboard = () => {
  const { address: connectedAddress } = useAccount();
  const [portfolioDataBackend, setPortfolioDataBackend] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnectedToBackend, setIsConnectedToBackend] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState("30D");

  const fetchPortfolio = async () => {
    if (!connectedAddress) return;

    try {
      setIsLoading(true);
      const response = await fetch(`/api/portfolio/${connectedAddress}`);
      const data = await response.json();

      setPortfolioDataBackend(data);
      setIsConnectedToBackend(true);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
      setIsConnectedToBackend(false);

      // Fallback to mock data when backend is not available
      setPortfolioDataBackend({
        totalValue: 61200,
        currentAPY: 12.8,
        allocations: [
          { protocol: "Aave V3", chain: "Ethereum", amount: 21420, apy: 14.2, percentage: 35 },
          { protocol: "Compound", chain: "Ethereum", amount: 15300, apy: 11.5, percentage: 25 },
          { protocol: "Moonwell", chain: "Base", amount: 12240, apy: 18.7, percentage: 20 },
          { protocol: "Curve", chain: "Arbitrum", amount: 9180, apy: 12.8, percentage: 15 },
          { protocol: "Others", chain: "Multi", amount: 3060, apy: 8.5, percentage: 5 },
        ],
        recentActivity: recentTransactions,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();

    // Set up polling every 30 seconds
    const interval = setInterval(fetchPortfolio, 30000);
    return () => clearInterval(interval);
  }, [connectedAddress]);

  // Calculate derived metrics from portfolio data
  const totalValue = portfolioDataBackend?.totalValue || 61200;
  const currentAPY = portfolioDataBackend?.currentAPY || 12.8;
  const dailyYield = (totalValue * currentAPY / 100) / 365;
  const positions = portfolioDataBackend?.allocations || [];
  const recentActivity = portfolioDataBackend?.recentActivity || recentTransactions;
  
  // Calculate gains
  const totalGain = 4320;
  const gainPercentage = 7.6;
  const pendingRewards = 235.1;

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
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
            <div className="ml-auto flex items-center space-x-4">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Portfolio Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to view your yield optimization performance
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to connect your wallet to view your portfolio dashboard
                  </p>
                  <RainbowKitCustomConnectButton />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Enhanced Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-gradient-to-r from-primary to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">C</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  CrossYield
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              {/* Backend Connection Status */}
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                isConnectedToBackend
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                <div className={`h-2 w-2 rounded-full ${isConnectedToBackend ? 'bg-green-500' : 'bg-red-500'}`}></div>
                {isConnectedToBackend ? 'Backend Connected' : 'Backend Offline'}
              </div>
              {isLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Portfolio Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Track your USDC yield optimization performance across multiple chains
              </p>
              <div className="flex items-center gap-4 mt-2">
                <Address address={connectedAddress} />
                <Balance address={connectedAddress} />
              </div>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Portfolio Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">${totalValue.toLocaleString()}</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">
                  +{gainPercentage}% (${totalGain})
                </span>
                <span className="text-muted-foreground ml-1">30D</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Current APY</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{currentAPY}%</div>
              <div className="flex items-center text-sm">
                <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
                <span className="text-green-500">+0.8%</span>
                <span className="text-muted-foreground ml-1">vs last week</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Daily Yield</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-400">${dailyYield.toFixed(2)}</div>
              <div className="text-sm text-muted-foreground">
                ${(dailyYield * 30).toFixed(2)} monthly
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Risk Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">Low</div>
              <div className="flex items-center text-sm">
                <div className="w-full bg-muted rounded-full h-2 mr-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: "25%" }}></div>
                </div>
                <span className="text-muted-foreground">25/100</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Portfolio Performance Chart */}
          <Card className="lg:col-span-2 border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-foreground">Portfolio Performance</CardTitle>
                  <CardDescription>Historical value and APY trends</CardDescription>
                </div>
                <div className="flex gap-2">
                  {["7D", "30D", "90D", "1Y"].map((period) => (
                    <Button
                      key={period}
                      variant={selectedTimeframe === period ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTimeframe(period)}
                      className={selectedTimeframe === period ? "bg-gradient-to-r from-primary to-purple-500" : "bg-transparent"}
                    >
                      {period}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/20 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Portfolio performance chart</p>
                  <p className="text-sm text-muted-foreground">Integration with charting library pending</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Holdings Breakdown */}
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardHeader>
              <CardTitle className="text-foreground">Holdings by Protocol</CardTitle>
              <CardDescription>Current allocation across DeFi protocols</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {holdingsData.map((item, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                        <span className="text-sm font-medium text-foreground">{item.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium text-foreground">{item.value}%</span>
                        <div className="text-xs text-muted-foreground">{item.apy}% APY</div>
                      </div>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Strategies */}
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20 mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Active Strategies</CardTitle>
            <CardDescription>Your current yield optimization strategies across chains</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {strategiesData.map((strategy, index) => (
                <Card key={index} className="border-border/50 bg-gradient-to-br from-muted/10 to-muted/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-foreground">{strategy.name}</h3>
                      <Badge variant={strategy.status === "Active" ? "default" : "secondary"} className="bg-green-500/10 text-green-400 border-green-500/20">
                        {strategy.status}
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">APY</span>
                        <span className="text-sm font-medium text-green-400">{strategy.apy}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Allocation</span>
                        <span className="text-sm font-medium text-foreground">{strategy.allocation}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Protocols</span>
                        <span className="text-sm font-medium text-foreground">{strategy.protocols}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">TVL</span>
                        <span className="text-sm font-medium text-foreground">${(strategy.tvl / 1000000).toFixed(1)}M</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Risk</span>
                        <Badge variant={strategy.risk === "Low" ? "secondary" : "outline"} className={
                          strategy.risk === "Low" ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                          strategy.risk === "Medium" ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" :
                          "bg-red-500/10 text-red-400 border-red-500/20"
                        }>
                          {strategy.risk}
                        </Badge>
                      </div>
                      <Progress value={strategy.allocation} className="mt-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20 mb-8">
          <CardHeader>
            <CardTitle className="text-foreground">Recent Activity</CardTitle>
            <CardDescription>Latest transactions and strategy updates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((tx, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-gradient-to-r from-muted/5 to-muted/10 hover:from-muted/10 hover:to-muted/20 transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-full ${
                        tx.type === "Deposit"
                          ? "bg-green-500/10"
                          : tx.type === "Withdraw"
                            ? "bg-red-500/10"
                            : tx.type === "Yield Claim"
                              ? "bg-yellow-500/10"
                              : tx.type === "CCTP Transfer"
                                ? "bg-blue-500/10"
                                : "bg-purple-500/10"
                      }`}
                    >
                      {tx.type === "Deposit" ? (
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                      ) : tx.type === "Withdraw" ? (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      ) : tx.type === "Yield Claim" ? (
                        <Zap className="h-4 w-4 text-yellow-500" />
                      ) : tx.type === "CCTP Transfer" ? (
                        <ArrowRightLeft className="h-4 w-4 text-blue-500" />
                      ) : (
                        <Activity className="h-4 w-4 text-purple-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{tx.type}</div>
                      <div className="text-sm text-muted-foreground">
                        {tx.protocol} on {tx.chain}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-foreground">${tx.amount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">{tx.time}</div>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
                    {tx.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/fund">
            <Button className="h-16 flex-col gap-2 w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
              <Plus className="h-5 w-5" />
              Deposit USDC
            </Button>
          </Link>
          <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent">
            <Minus className="h-5 w-5" />
            Withdraw
          </Button>
          <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent">
            <Activity className="h-5 w-5" />
            Rebalance
          </Button>
          <Link href="/strategies">
            <Button variant="outline" className="h-16 flex-col gap-2 bg-transparent w-full">
              <Target className="h-5 w-5" />
              New Strategy
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
