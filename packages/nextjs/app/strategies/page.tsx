"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Input } from "~~/components/ui/input";
import { Progress } from "~~/components/ui/progress";
import { 
  ArrowLeft, 
  DollarSign, 
  Search, 
  Zap, 
  Target, 
  ChevronRight, 
  Wallet, 
  Bell, 
  User, 
  Loader2, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Activity,
  Shield,
  Clock,
  Star,
  ArrowUpRight,
  Info,
  Filter,
  SortAsc,
  Grid3X3,
  List,
  Eye,
  Bookmark,
  Share2
} from "lucide-react";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";
import { useAccount } from "wagmi";
import { useAgentLinkage } from "~~/hooks/useAgentLinkage";
import { useSmartWallet } from "~~/hooks/useSmartWallet";
import { notification } from "~~/utils/scaffold-eth";

// Strategy interface
interface Strategy {
  id: string;
  name: string;
  apy: number;
  tvl: number;
  risk: "Low" | "Medium" | "High";
  chain: string;
  protocol: string;
  category: string;
  description: string;
  features: string[];
  allocation: number;
  status: "Active" | "Beta" | "Coming Soon";
  aiOptimized: boolean;
  minDeposit: number;
  maxDeposit: number;
  fees: number;
  apyHistory: number[];
  performanceScore: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  liquidityScore: number;
  lastUpdated: string;
  tags: string[];
  icon: string;
}

// Mock strategy data - in production this would come from your backend/contracts
const mockStrategies: Strategy[] = [
  {
    id: "aave-v3-eth",
    name: "Aave V3 Optimized",
    apy: 14.2,
    tvl: 2400000,
    risk: "Low",
    chain: "Ethereum",
    protocol: "Aave",
    category: "Lending",
    description: "Low impermanent loss with multi-protocol rebalance",
    features: ["Multi-Protocol Rebalance", "Auto-Compound", "Gas Optimized"],
    allocation: 35,
    status: "Active",
    aiOptimized: true,
    minDeposit: 100,
    maxDeposit: 100000,
    fees: 0.5,
    apyHistory: [12.8, 13.1, 13.5, 13.8, 14.0, 14.2],
    performanceScore: 92,
    volatility: 2.1,
    sharpeRatio: 1.8,
    maxDrawdown: -3.2,
    liquidityScore: 95,
    lastUpdated: "2 hours ago",
    tags: ["Popular", "Stable", "Ethereum"],
    icon: "🏦",
  },
  {
    id: "base-yield-farm",
    name: "Base Yield Farm",
    apy: 18.7,
    tvl: 1200000,
    risk: "Medium",
    chain: "Base",
    protocol: "Moonwell",
    category: "Yield Farming",
    description: "High APY with moderate risk on Base network",
    features: ["High APY", "Base Native", "Low Fees"],
    allocation: 25,
    status: "Active",
    aiOptimized: true,
    minDeposit: 50,
    maxDeposit: 50000,
    fees: 0.3,
    apyHistory: [16.2, 17.1, 17.8, 18.2, 18.5, 18.7],
    performanceScore: 88,
    volatility: 4.2,
    sharpeRatio: 1.6,
    maxDrawdown: -8.1,
    liquidityScore: 78,
    lastUpdated: "1 hour ago",
    tags: ["High Yield", "Base", "Trending"],
    icon: "🌙",
  },
  {
    id: "arbitrum-stable-pool",
    name: "Arbitrum Stable Pool",
    apy: 12.8,
    tvl: 3100000,
    risk: "Low",
    chain: "Arbitrum",
    protocol: "Curve",
    category: "Liquidity Pool",
    description: "Stable yield with minimal impermanent loss",
    features: ["Stable Returns", "Low IL Risk", "Curve Integration"],
    allocation: 20,
    status: "Active",
    aiOptimized: false,
    minDeposit: 200,
    maxDeposit: 200000,
    fees: 0.2,
    apyHistory: [11.9, 12.1, 12.3, 12.5, 12.6, 12.8],
    performanceScore: 85,
    volatility: 1.8,
    sharpeRatio: 2.1,
    maxDrawdown: -2.1,
    liquidityScore: 98,
    lastUpdated: "3 hours ago",
    tags: ["Stable", "Curve", "Arbitrum"],
    icon: "📈",
  },
  {
    id: "cross-chain-arbitrage",
    name: "Cross-Chain Arbitrage",
    apy: 22.3,
    tvl: 800000,
    risk: "High",
    chain: "Multi-Chain",
    protocol: "1inch",
    category: "Arbitrage",
    description: "AI-powered cross-chain arbitrage opportunities",
    features: ["Cross-Chain", "AI Powered", "High Returns"],
    allocation: 15,
    status: "Beta",
    aiOptimized: true,
    minDeposit: 500,
    maxDeposit: 100000,
    fees: 1.0,
    apyHistory: [19.8, 20.5, 21.1, 21.6, 22.0, 22.3],
    performanceScore: 95,
    volatility: 8.5,
    sharpeRatio: 1.2,
    maxDrawdown: -15.2,
    liquidityScore: 65,
    lastUpdated: "30 minutes ago",
    tags: ["AI", "High Risk", "Multi-Chain"],
    icon: "⚡",
  },
  {
    id: "compound-v3-strategy",
    name: "Compound V3 Strategy",
    apy: 11.5,
    tvl: 5200000,
    risk: "Low",
    chain: "Ethereum",
    protocol: "Compound",
    category: "Lending",
    description: "Conservative lending strategy with proven track record",
    features: ["Battle Tested", "Conservative", "High TVL"],
    allocation: 30,
    status: "Active",
    aiOptimized: false,
    minDeposit: 100,
    maxDeposit: 500000,
    fees: 0.4,
    apyHistory: [10.8, 11.0, 11.2, 11.3, 11.4, 11.5],
    performanceScore: 90,
    volatility: 1.5,
    sharpeRatio: 2.3,
    maxDrawdown: -1.8,
    liquidityScore: 99,
    lastUpdated: "4 hours ago",
    tags: ["Conservative", "Battle Tested", "Ethereum"],
    icon: "🏛️",
  },
  {
    id: "radiant-capital-boost",
    name: "Radiant Capital Boost",
    apy: 16.4,
    tvl: 950000,
    risk: "Medium",
    chain: "Arbitrum",
    protocol: "Radiant",
    category: "Lending",
    description: "Enhanced yields through Radiant's omnichain lending",
    features: ["Omnichain", "Boosted Rewards", "Medium Risk"],
    allocation: 18,
    status: "Active",
    aiOptimized: true,
    minDeposit: 75,
    maxDeposit: 75000,
    fees: 0.6,
    apyHistory: [14.2, 15.1, 15.6, 16.0, 16.2, 16.4],
    performanceScore: 87,
    volatility: 3.8,
    sharpeRatio: 1.7,
    maxDrawdown: -6.5,
    liquidityScore: 82,
    lastUpdated: "1 hour ago",
    tags: ["Omnichain", "Boosted", "Arbitrum"],
    icon: "💎",
  },
];

const chains = ["All Chains", "Ethereum", "Base", "Arbitrum", "Multi-Chain"];
const riskLevels = ["All Risk", "Low", "Medium", "High"];
const categories = ["All Categories", "Lending", "Yield Farming", "Liquidity Pool", "Arbitrage"];

export default function StrategiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState("All Chains");
  const [selectedRisk, setSelectedRisk] = useState("All Risk");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectedToBackend, setIsConnectedToBackend] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"apy" | "tvl" | "risk" | "performance">("apy");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [executionAmount, setExecutionAmount] = useState("");

  // Get user data
  const { address: connectedAddress, chainId } = useAccount();
  const { getAgentAddress, hasLinkage } = useAgentLinkage();
  const { smartWalletAddress, smartWalletData, usdcBalance } = useSmartWallet();

  // Get agent address from linkage system
  const linkedAgentAddress = connectedAddress ? getAgentAddress(connectedAddress) : null;
  const hasAgentLinkage = connectedAddress ? hasLinkage(connectedAddress) : false;
  const agentAddress = linkedAgentAddress || smartWalletAddress;

  // Fetch strategies from backend
  const fetchStrategies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/strategies');
      const data = await response.json();

      if (data.strategies) {
        setStrategies(data.strategies);
        setSummaryData(data.summary);
        setIsConnectedToBackend(true);
      } else {
        // Fallback to mock data
        setStrategies(mockStrategies);
        setIsConnectedToBackend(false);
      }
    } catch (error) {
      console.error('Error fetching strategies:', error);
      // Fallback to mock data
      setStrategies(mockStrategies);
      setIsConnectedToBackend(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchStrategies, 30000);
    return () => clearInterval(interval);
  }, []);

  // Filter and sort strategies
  const filteredStrategies = strategies
    .filter((strategy) => {
      const matchesSearch =
        strategy.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        strategy.protocol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        strategy.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesChain = selectedChain === "All Chains" || strategy.chain === selectedChain;
      const matchesRisk = selectedRisk === "All Risk" || strategy.risk === selectedRisk;
      const matchesCategory = selectedCategory === "All Categories" || strategy.category === selectedCategory;
      const matchesAI = !showAIOnly || strategy.aiOptimized;

      return matchesSearch && matchesChain && matchesRisk && matchesCategory && matchesAI;
    })
    .sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case "apy":
          aValue = a.apy;
          bValue = b.apy;
          break;
        case "tvl":
          aValue = a.tvl;
          bValue = b.tvl;
          break;
        case "risk":
          const riskOrder = { "Low": 1, "Medium": 2, "High": 3 };
          aValue = riskOrder[a.risk];
          bValue = riskOrder[b.risk];
          break;
        case "performance":
          aValue = a.performanceScore;
          bValue = b.performanceScore;
          break;
        default:
          aValue = a.apy;
          bValue = b.apy;
      }
      
      return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
    });

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "text-green-400 border-green-400/20 bg-green-400/10";
      case "Medium":
        return "text-yellow-400 border-yellow-400/20 bg-yellow-400/10";
      case "High":
        return "text-red-400 border-red-400/20 bg-red-400/10";
      default:
        return "text-muted-foreground";
    }
  };

  const getChainColor = (chain: string) => {
    switch (chain) {
      case "Ethereum":
        return "text-blue-400 border-blue-400/20 bg-blue-400/10";
      case "Base":
        return "text-purple-400 border-purple-400/20 bg-purple-400/10";
      case "Arbitrum":
        return "text-cyan-400 border-cyan-400/20 bg-cyan-400/10";
      case "Multi-Chain":
        return "text-primary border-primary/20 bg-primary/10";
      default:
        return "text-muted-foreground";
    }
  };

  // Generate APY trend data from strategies
  const apyTrendData = strategies.length > 0 ? strategies[0].apyHistory.map((apy, index) => ({
    name: `Week ${index + 1}`,
    value: apy
  })) : [
    { name: "Week 1", value: 12.5 },
    { name: "Week 2", value: 13.2 },
    { name: "Week 3", value: 14.1 },
    { name: "Week 4", value: 14.8 },
    { name: "Week 5", value: 15.2 },
    { name: "Week 6", value: 15.8 },
  ];

  // Generate portfolio allocation data from backend summary or calculate from strategies
  const portfolioAllocationData = summaryData?.categoryBreakdown ? 
    Object.entries(summaryData.categoryBreakdown).map(([name, value], index) => ({
      name,
      value: value as number,
      color: ["bg-blue-500", "bg-purple-500", "bg-green-500", "bg-orange-500"][index] || "bg-gray-500"
    })) :
    [
      { name: "Lending", value: 45, color: "bg-blue-500" },
      { name: "Yield Farming", value: 25, color: "bg-purple-500" },
      { name: "Liquidity Pools", value: 20, color: "bg-green-500" },
      { name: "Arbitrage", value: 10, color: "bg-orange-500" },
    ];

  // Calculate summary statistics from filtered strategies
  const totalTVL = filteredStrategies.reduce((sum, s) => sum + s.tvl, 0);
  const avgAPY = filteredStrategies.length > 0 ? filteredStrategies.reduce((sum, s) => sum + s.apy, 0) / filteredStrategies.length : 0;
  const aiOptimizedCount = filteredStrategies.filter(s => s.aiOptimized).length;
  const avgPerformanceScore = filteredStrategies.length > 0 ? filteredStrategies.reduce((sum, s) => sum + s.performanceScore, 0) / filteredStrategies.length : 0;

  const handleStrategySelect = (strategy: Strategy) => {
    if (!connectedAddress) {
      notification.error("Please connect your wallet first");
      return;
    }

    if (!hasAgentLinkage) {
      notification.error("Please create and link an agent wallet first");
      return;
    }

    setSelectedStrategy(strategy);
    setShowExecutionModal(true);
  };

  const handleExecuteStrategy = async () => {
    if (!selectedStrategy || !executionAmount || isNaN(parseFloat(executionAmount)) || parseFloat(executionAmount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const deployAmount = parseFloat(executionAmount);
    
    try {
      setShowExecutionModal(false);
      notification.info("Initiating strategy execution...");
      
      // Execute strategy via backend
      const response = await fetch('/api/strategy-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: connectedAddress,
          strategyId: selectedStrategy.id,
          amount: deployAmount,
          smartWalletAddress: agentAddress
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        notification.success(`Strategy execution initiated! Redirecting to dashboard...`);
        
        // Redirect to execution dashboard with parameters
        setTimeout(() => {
          const params = new URLSearchParams({
            executionId: result.executionId,
            strategyId: selectedStrategy.id,
            amount: deployAmount.toString()
          });
          window.location.href = `/dashboard-execution?${params.toString()}`;
        }, 2000);
      } else {
        notification.error(`Strategy execution failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Strategy execution error:', error);
      notification.error("Failed to execute strategy. Please try again.");
    }
  };

  // Show connection prompt if not connected
  if (!connectedAddress) {
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
            <div className="ml-auto flex items-center space-x-4">
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                Strategy Explorer
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to explore AI-optimized yield strategies
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Wallet className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to connect your wallet to explore strategies
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
              <Link href="/fund">
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Fund
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-r from-primary to-purple-500">
                  <DollarSign className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  CrossYield
                </span>
              </div>
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
              <Button variant="ghost" size="sm" className="relative">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full"></span>
              </Button>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
                Strategy Explorer
              </h1>
              <p className="text-muted-foreground text-xl">
                Discover and deploy AI-optimized yield strategies across multiple chains
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Strategies</p>
                    <p className="text-3xl font-bold text-primary">{filteredStrategies.length}</p>
                  </div>
                  <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average APY</p>
                    <p className="text-3xl font-bold text-green-400">{avgAPY.toFixed(1)}%</p>
                  </div>
                  <div className="h-12 w-12 bg-green-400/10 rounded-full flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total TVL</p>
                    <p className="text-3xl font-bold text-blue-400">${(totalTVL / 1000000).toFixed(1)}M</p>
                  </div>
                  <div className="h-12 w-12 bg-blue-400/10 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">AI Optimized</p>
                    <p className="text-3xl font-bold text-purple-400">{aiOptimizedCount}</p>
                  </div>
                  <div className="h-12 w-12 bg-purple-400/10 rounded-full flex items-center justify-center">
                    <Zap className="h-6 w-6 text-purple-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* APY Trend Chart */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <span>APY Trend (Last 6 Weeks)</span>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-end justify-between space-x-2">
                  {apyTrendData.map((item, index) => (
                    <div key={index} className="flex flex-col items-center space-y-2 flex-1">
                      <div
                        className="w-full bg-gradient-to-t from-primary to-purple-400 rounded-t transition-all duration-300 hover:opacity-80 cursor-pointer"
                        style={{ height: `${(item.value / Math.max(...apyTrendData.map(d => d.value))) * 100}%` }}
                        title={`${item.name}: ${item.value}%`}
                      ></div>
                      <div className="text-xs text-muted-foreground font-medium">{item.value}%</div>
                      <div className="text-xs text-muted-foreground">{item.name}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  {isConnectedToBackend ? "Data from backend" : "Using mock data"}
                </div>
              </CardContent>
            </Card>

            {/* Portfolio Allocation Chart */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <PieChart className="h-5 w-5 text-primary" />
                    <span>Strategy Categories</span>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {portfolioAllocationData.map((item, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`h-4 w-4 rounded-full ${item.color}`}></div>
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${item.color} transition-all duration-500`}
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground w-8">{item.value}%</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 text-xs text-muted-foreground text-center">
                  {isConnectedToBackend ? "Data from backend" : "Using mock data"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Chain Distribution */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5 text-primary" />
                    <span>Chain Distribution</span>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summaryData?.chainBreakdown ? 
                    Object.entries(summaryData.chainBreakdown).map(([chain, count], index) => {
                      const colors = ["bg-blue-500", "bg-purple-500", "bg-cyan-500", "bg-orange-500"];
                      const percentage = (count as number / strategies.length) * 100;
                      return (
                        <div key={chain} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-4 w-4 rounded-full ${colors[index] || "bg-gray-500"}`}></div>
                            <span className="text-sm font-medium">{chain}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colors[index] || "bg-gray-500"} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-8">{count}</span>
                          </div>
                        </div>
                      );
                    }) :
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No chain data available</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>

            {/* Risk Distribution */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>Risk Distribution</span>
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {summaryData?.riskBreakdown ? 
                    Object.entries(summaryData.riskBreakdown).map(([risk, count], index) => {
                      const colors = ["bg-green-500", "bg-yellow-500", "bg-red-500"];
                      const percentage = (count as number / strategies.length) * 100;
                      return (
                        <div key={risk} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-4 w-4 rounded-full ${colors[index] || "bg-gray-500"}`}></div>
                            <span className="text-sm font-medium">{risk} Risk</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${colors[index] || "bg-gray-500"} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="text-sm text-muted-foreground w-8">{count}</span>
                          </div>
                        </div>
                      );
                    }) :
                    <div className="text-center py-8 text-muted-foreground">
                      <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No risk data available</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Agent Status */}
        {hasAgentLinkage && agentAddress && (
          <Card className="mb-8 border-green-500/50 bg-green-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">✓</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-800">Agent Wallet Ready</h3>
                  <p className="text-sm text-green-700">
                    Your agent wallet is linked and ready to deploy strategies
                  </p>
                  <div className="mt-1 text-xs text-green-600">
                    <strong>Agent Address:</strong> {agentAddress.slice(0, 6)}...{agentAddress.slice(-4)}
                    <span className="ml-4"><strong>Balance:</strong> {parseFloat(usdcBalance).toFixed(2)} USDC</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Warning if no agent linkage */}
        {!hasAgentLinkage && (
          <Card className="mb-8 border-yellow-500/50 bg-yellow-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-800">Agent Wallet Required</h3>
                  <p className="text-sm text-yellow-700">
                    You need to create and fund an agent wallet before deploying strategies
                  </p>
                  <Link href="/fund">
                    <Button variant="outline" size="sm" className="mt-2">
                      Go to Fund Page
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Enhanced Filters */}
        <Card className="mb-8 border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-primary" />
              <span>Filters & Search</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Search and AI Filter */}
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search strategies, protocols, tags..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-muted/50 border-border/50 focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant={showAIOnly ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowAIOnly(!showAIOnly)}
                  className={showAIOnly ? "bg-gradient-to-r from-primary to-purple-500" : "bg-transparent"}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  AI-Powered Only
                </Button>
                <Button variant="outline" size="sm" className="bg-transparent">
                  <SortAsc className="h-4 w-4 mr-2" />
                  Sort by {sortBy}
                </Button>
              </div>
            </div>

            {/* Filter Categories */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Chains</h4>
                <div className="flex flex-wrap gap-2">
                  {chains.map((chain) => (
                    <Button
                      key={chain}
                      variant={selectedChain === chain ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChain(chain)}
                      className={selectedChain === chain ? "bg-gradient-to-r from-primary to-purple-500" : "bg-transparent hover:bg-muted/50"}
                    >
                      {chain}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Risk Level</h4>
                <div className="flex flex-wrap gap-2">
                  {riskLevels.map((risk) => (
                    <Button
                      key={risk}
                      variant={selectedRisk === risk ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedRisk(risk)}
                      className={selectedRisk === risk ? "bg-gradient-to-r from-primary to-purple-500" : "bg-transparent hover:bg-muted/50"}
                    >
                      {risk}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className={selectedCategory === category ? "bg-gradient-to-r from-primary to-purple-500" : "bg-transparent hover:bg-muted/50"}
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Strategy Grid */}
        {isLoading ? (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="border-border/50 bg-gradient-to-br from-background to-muted/10">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="h-6 bg-muted rounded animate-pulse"></div>
                      <div className="h-4 bg-muted rounded animate-pulse w-3/4"></div>
                    </div>
                    <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="h-32 bg-muted rounded animate-pulse"></div>
                  <div className="space-y-3">
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                    <div className="h-4 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="h-20 bg-muted rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"}`}>
            {filteredStrategies.map((strategy) => (
            <Card key={strategy.id} className="border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5 bg-gradient-to-br from-background to-muted/10">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="text-2xl">{strategy.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <CardTitle className="text-lg group-hover:text-primary transition-colors">
                            {strategy.name}
                          </CardTitle>
                          {strategy.aiOptimized && (
                            <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border-primary/20">
                              <Zap className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="text-sm mt-1">{strategy.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${getRiskColor(strategy.risk)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {strategy.risk} Risk
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {strategy.lastUpdated}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <Badge variant={strategy.status === "Active" ? "default" : "secondary"}>
                      {strategy.status}
                    </Badge>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm font-medium">{strategy.performanceScore}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* APY Display with Trend */}
                <div className="text-center p-6 bg-gradient-to-br from-muted/30 to-muted/10 rounded-xl border border-border/50">
                  <div className="text-4xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-1">
                    {strategy.apy}%
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">Estimated APY</div>
                  <div className="flex items-center justify-center space-x-2 text-xs text-green-400">
                    <TrendingUp className="h-3 w-3" />
                    <span>+{((strategy.apyHistory[strategy.apyHistory.length - 1] - strategy.apyHistory[0]) / strategy.apyHistory[0] * 100).toFixed(1)}% this week</span>
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Protocol</span>
                      <span className="font-medium">{strategy.protocol}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Chain</span>
                      <Badge className={`text-xs ${getChainColor(strategy.chain)}`}>
                        {strategy.chain}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">TVL</span>
                      <span className="font-medium">${(strategy.tvl / 1000000).toFixed(1)}M</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Min Deposit</span>
                      <span className="font-medium">${strategy.minDeposit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Fees</span>
                      <span className="font-medium">{strategy.fees}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Volatility</span>
                      <span className="font-medium">{strategy.volatility}%</span>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Performance Metrics</h4>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-blue-400">{strategy.sharpeRatio}</div>
                      <div className="text-xs text-muted-foreground">Sharpe Ratio</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-red-400">{strategy.maxDrawdown}%</div>
                      <div className="text-xs text-muted-foreground">Max Drawdown</div>
                    </div>
                    <div className="p-3 bg-muted/30 rounded-lg">
                      <div className="text-lg font-bold text-purple-400">{strategy.liquidityScore}</div>
                      <div className="text-xs text-muted-foreground">Liquidity Score</div>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Features</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs bg-muted/20">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-muted-foreground">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {strategy.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs bg-primary/10 text-primary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-4 border-t border-border/50">
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    onClick={() => handleStrategySelect(strategy)}
                    disabled={!hasAgentLinkage || strategy.status === "Coming Soon"}
                  >
                    {strategy.status === "Coming Soon" ? (
                      "Coming Soon"
                    ) : (
                      <>
                        <ArrowRightLeft className="h-4 w-4 mr-2" />
                        Execute with CCTP
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="bg-transparent">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          </div>
        )}

        {/* Enhanced Empty State */}
        {filteredStrategies.length === 0 && (
          <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
            <CardContent className="py-16 text-center">
              <div className="h-20 w-20 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-semibold mb-2">No strategies found</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                We couldn't find any strategies matching your current filters. Try adjusting your search criteria or clearing some filters.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchQuery("");
                    setSelectedChain("All Chains");
                    setSelectedRisk("All Risk");
                    setSelectedCategory("All Categories");
                    setShowAIOnly(false);
                  }}
                  className="bg-transparent"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
                <Button variant="default" className="bg-gradient-to-r from-primary to-purple-500">
                  <Info className="h-4 w-4 mr-2" />
                  View All Strategies
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer Stats */}
        {filteredStrategies.length > 0 && (
          <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-primary">{filteredStrategies.length}</div>
                <div className="text-sm text-muted-foreground">Available Strategies</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {Math.max(...filteredStrategies.map((s) => s.apy)).toFixed(1)}%
                </div>
                <div className="text-sm text-muted-foreground">Highest APY</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  ${(filteredStrategies.reduce((sum, s) => sum + s.tvl, 0) / 1000000).toFixed(0)}M
                </div>
                <div className="text-sm text-muted-foreground">Total TVL</div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-6 text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {filteredStrategies.filter((s) => s.aiOptimized).length}
                </div>
                <div className="text-sm text-muted-foreground">AI-Optimized</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Execution Modal */}
        {showExecutionModal && selectedStrategy && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ArrowRightLeft className="h-5 w-5 text-primary" />
                  <span>Execute Strategy with CCTP</span>
                </CardTitle>
                <CardDescription>
                  Deploy funds to {selectedStrategy.name} using Circle's Cross-Chain Transfer Protocol
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Strategy Info */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Strategy:</span>
                    <span className="font-medium">{selectedStrategy.name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Expected APY:</span>
                    <span className="font-medium text-green-400">{selectedStrategy.apy}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Risk Level:</span>
                    <Badge className={`text-xs ${getRiskColor(selectedStrategy.risk)}`}>
                      {selectedStrategy.risk}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Min Deposit:</span>
                    <span className="font-medium">${selectedStrategy.minDeposit}</span>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount (USDC)</label>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={executionAmount}
                    onChange={(e) => setExecutionAmount(e.target.value)}
                    min={selectedStrategy.minDeposit}
                    max={selectedStrategy.maxDeposit}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Min: ${selectedStrategy.minDeposit}</span>
                    <span>Max: ${selectedStrategy.maxDeposit}</span>
                  </div>
                </div>

                {/* CCTP Info */}
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <ArrowRightLeft className="h-4 w-4 text-blue-400" />
                    <div className="text-sm font-medium text-blue-400">CCTP Cross-Chain Transfer</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Your funds will be transferred across chains using Circle's CCTP protocol for optimal yield deployment.
                  </div>
                </div>

                {/* Estimated Returns */}
                {executionAmount && !isNaN(parseFloat(executionAmount)) && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg space-y-2">
                    <div className="text-sm font-medium text-green-400">Estimated Returns</div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Daily:</span>
                        <div className="font-medium">${(parseFloat(executionAmount) * selectedStrategy.apy / 100 / 365).toFixed(2)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Monthly:</span>
                        <div className="font-medium">${(parseFloat(executionAmount) * selectedStrategy.apy / 100 / 12).toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => setShowExecutionModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                    onClick={handleExecuteStrategy}
                    disabled={!executionAmount || isNaN(parseFloat(executionAmount)) || parseFloat(executionAmount) < selectedStrategy.minDeposit}
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Execute with CCTP
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}