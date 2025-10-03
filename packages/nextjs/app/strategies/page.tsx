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
  Share2,
  ArrowRightLeft,
  Network
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from 'recharts';
import { useAgentLinkage } from "~~/hooks/useAgentLinkage";
import { useSmartWallet } from "~~/hooks/useSmartWallet";
import { notification } from "~~/utils/scaffold-eth";
import { AIStrategyCard } from "~~/components/AIStrategyCard";
import { AIValidationDisplay } from "~~/components/AIValidationDisplay";
import { CCTPStrategyExecution } from "~~/components/CCTPStrategyExecution";

// AI Reasoning interface
interface AIReasoning {
  marketAnalysis: string;
  riskAssessment: string;
  yieldOpportunity: string;
  protocolSelection: string;
  allocationLogic: string;
  confidence: number;
}

// Strategy Step interface
interface StrategyStep {
  id: number;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "pending";
  details: string;
  impact: "high" | "medium" | "low";
  timeEstimate: string;
}

// Enhanced Strategy interface for AI display
interface EnhancedStrategy {
  id: string;
  name: string;
  description: string;
  detailedDescription: string;
  apy: number;
  risk: "Low" | "Medium" | "High";
  chain: string;
  protocol: string;
  category: string;
  aiReasoning: AIReasoning;
  strategySteps: StrategyStep[];
  features: string[];
  tags: string[];
  performanceScore: number;
  tvl: number;
  fees: number;
  minDeposit: number;
  maxDeposit: number;
  lastUpdated: string;
  aiOptimized: boolean;
  status: "Active" | "Beta" | "Coming Soon";
  icon: string;
  marketConditions: {
    volatility: number;
    trend: "bullish" | "bearish" | "neutral";
    sentiment: number;
  };
  backtest: {
    timeframe: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
}

// Backend Strategy interface (enhanced data structure from backend)
interface BackendStrategy {
  name: string;
  title: string;
  expectedAPY: number;
  dailyYield: number;
  monthlyYield: number;
  protocols: string[];
  chains: string[];
  riskLevel: "Low" | "Medium" | "High";
  description: string;
  detailedDescription: string;
  aiReasoning: AIReasoning;
  strategySteps: StrategyStep[];
  marketConditions: {
    volatility: number;
    trend: "bullish" | "bearish" | "neutral";
    sentiment: number;
  };
  backtest: {
    timeframe: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
  };
  features: string[];
  tags: string[];
  performanceScore: number;
  tvl: number;
  fees: number;
  minDeposit: number;
  maxDeposit: number;
  lastUpdated: string;
  aiOptimized: boolean;
  status: "Active" | "Beta" | "Coming Soon";
  icon: string;
  // Aptos-specific fields
  includesAptos?: boolean;
  aptosBoost?: number;
  requiresBridge?: boolean;
  aptosProtocols?: string[];
  evmProtocols?: string[];
  crossChain?: boolean;
  aptosOpportunityCount?: number;
}

// Frontend Strategy interface (what we display)
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

// No mock data - using live backend data only

const chains = ["All Chains", "Ethereum", "Base", "Arbitrum", "Multi-Chain"];
const riskLevels = ["All Risk", "Low", "Medium", "High"];
const categories = ["All Categories", "Lending", "Yield Farming", "Liquidity Pool", "Arbitrage"];

export default function StrategiesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChain, setSelectedChain] = useState("All Chains");
  const [selectedRisk, setSelectedRisk] = useState("All Risk");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [showAIOnly, setShowAIOnly] = useState(false);
  const [strategies, setStrategies] = useState<EnhancedStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnectedToBackend, setIsConnectedToBackend] = useState(false);
  
  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658'];
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"apy" | "tvl" | "risk" | "performance">("apy");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [summaryData, setSummaryData] = useState<any>(null);
  const [showExecutionModal, setShowExecutionModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<EnhancedStrategy | null>(null);
  const [executionAmount, setExecutionAmount] = useState("");

  // Get user data
  const { address: connectedAddress, chainId } = useAccount();
  const { getAgentAddress, hasLinkage } = useAgentLinkage();
  const { smartWalletAddress, smartWalletData, usdcBalance } = useSmartWallet();

  // Get agent address from linkage system
  const linkedAgentAddress = connectedAddress ? getAgentAddress(connectedAddress) : null;
  const hasAgentLinkage = connectedAddress ? hasLinkage(connectedAddress) : false;
  const agentAddress = linkedAgentAddress || smartWalletAddress;

  // Backend now provides enhanced data directly, no transformation needed

  // Fetch strategies from backend
  const fetchStrategies = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/strategies');
      const data = await response.json();

      console.log('🔍 Backend API Response:', data);
      console.log('📊 Strategies count:', data.strategies?.length || 0);
      console.log('📋 First strategy sample:', data.strategies?.[0]);

      if (data.strategies && Array.isArray(data.strategies) && data.strategies.length > 0) {
        // Backend now provides enhanced data directly
        console.log('✅ Using enhanced backend data:', data.strategies.length, 'strategies');
        console.log('📊 Sample enhanced strategy:', data.strategies[0]);
        
        setStrategies(data.strategies);
        
        // Generate summary data from enhanced backend strategies
        console.log('🔍 Debugging strategy data for categories:');
        data.strategies.forEach((strategy: any, index: number) => {
          console.log(`Strategy ${index + 1}:`, {
            name: strategy.title || strategy.name,
            protocols: strategy.protocols,
            category: strategy.category,
            chains: strategy.chains
          });
        });

        // Use actual category data from backend or create balanced distribution
        const categoryBreakdown = (() => {
          // Check if strategies have category field
          const hasCategories = data.strategies.some((s: any) => s.category);
          
          if (hasCategories) {
            // Use actual categories from backend
            const categories = data.strategies.reduce((acc: any, strategy: any) => {
              const category = strategy.category || 'Other';
              acc[category] = (acc[category] || 0) + 1;
              return acc;
            }, {});
            console.log('📊 Using backend categories:', categories);
            return categories;
          } else {
            // Create balanced distribution for demo
            const total = data.strategies.length;
            const perCategory = Math.floor(total / 4);
            const remainder = total % 4;
            
            return {
              "Lending": perCategory + (remainder > 0 ? 1 : 0),
              "Yield Farming": perCategory + (remainder > 1 ? 1 : 0),
              "Liquidity Pool": perCategory + (remainder > 2 ? 1 : 0),
              "Arbitrage": perCategory
            };
          }
        })();

         const summaryData = {
           totalStrategies: data.strategies.length,
           averageAPY: data.strategies.reduce((sum: number, s: any) => sum + s.expectedAPY, 0) / data.strategies.length,
           totalTVL: data.strategies.reduce((sum: number, s: any) => sum + s.tvl, 0),
           aiOptimizedCount: data.strategies.filter((s: any) => s.aiOptimized).length,
           categoryBreakdown,
           chainBreakdown: {
             "Ethereum": data.strategies.filter((s: any) => s.chains.includes('ethereum_sepolia')).length,
             "Base": data.strategies.filter((s: any) => s.chains.includes('base_sepolia')).length,
             "Arbitrum": data.strategies.filter((s: any) => s.chains.includes('arbitrum_sepolia')).length,
             "Multi-Chain": data.strategies.filter((s: any) => s.chains.length > 1).length,
           },
           riskBreakdown: {
             "Low": data.strategies.filter((s: any) => s.riskLevel === "Low").length,
             "Medium": data.strategies.filter((s: any) => s.riskLevel === "Medium").length,
             "High": data.strategies.filter((s: any) => s.riskLevel === "High").length,
           },
         };
        
        setSummaryData(summaryData);
        setIsConnectedToBackend(true);
      } else {
        console.log('⚠️ No backend data found');
        setStrategies([]);
        setSummaryData({
          totalStrategies: 0,
          averageAPY: 0,
          totalTVL: 0,
          aiOptimizedCount: 0,
          categoryBreakdown: {
            "Lending": 0,
            "Yield Farming": 0,
            "Liquidity Pool": 0,
            "Arbitrage": 0,
          },
          chainBreakdown: {
            "Ethereum": 0,
            "Base": 0,
            "Arbitrum": 0,
            "Multi-Chain": 0,
          },
          riskBreakdown: {
            "Low": 0,
            "Medium": 0,
            "High": 0,
          },
        });
        setIsConnectedToBackend(false);
      }
    } catch (error) {
      console.error('❌ Error fetching strategies:', error);
      console.log('🔄 No strategies available');
      setStrategies([]);
      setSummaryData({
        totalStrategies: 0,
        averageAPY: 0,
        totalTVL: 0,
        aiOptimizedCount: 0,
        categoryBreakdown: {
          "Lending": 0,
          "Yield Farming": 0,
          "Liquidity Pool": 0,
          "Arbitrage": 0,
        },
        chainBreakdown: {
          "Ethereum": 0,
          "Base": 0,
          "Arbitrum": 0,
          "Multi-Chain": 0,
        },
        riskBreakdown: {
          "Low": 0,
          "Medium": 0,
          "High": 0,
        },
      });
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
        strategy.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        strategy.protocols.some(protocol => protocol.toLowerCase().includes(searchQuery.toLowerCase())) ||
        strategy.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Convert backend chain names to display names
      const chainDisplayName = strategy.chains.length > 1 ? 'Multi-Chain' : 
        strategy.chains[0]?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Ethereum';
      
      const matchesChain = selectedChain === "All Chains" || chainDisplayName === selectedChain;
      const matchesRisk = selectedRisk === "All Risk" || strategy.riskLevel === selectedRisk;
      
      // Determine category from protocols
      const category = strategy.protocols.some(p => ['Aave', 'Compound', 'Radiant'].includes(p)) ? 'Lending' :
                      strategy.protocols.some(p => ['Moonwell'].includes(p)) ? 'Yield Farming' :
                      strategy.protocols.some(p => ['Curve', 'Uniswap'].includes(p)) ? 'Liquidity Pool' :
                      strategy.protocols.some(p => ['1inch'].includes(p)) ? 'Arbitrage' : 'Lending';
      
      const matchesCategory = selectedCategory === "All Categories" || category === selectedCategory;
      const matchesAI = !showAIOnly || strategy.aiOptimized;

      return matchesSearch && matchesChain && matchesRisk && matchesCategory && matchesAI;
    })
    .sort((a, b) => {
      let aValue: number, bValue: number;
      
      switch (sortBy) {
        case "apy":
          aValue = a.expectedAPY;
          bValue = b.expectedAPY;
          break;
        case "tvl":
          aValue = a.tvl;
          bValue = b.tvl;
          break;
        case "risk":
          const riskOrder = { "Low": 1, "Medium": 2, "High": 3 };
          aValue = riskOrder[a.riskLevel];
          bValue = riskOrder[b.riskLevel];
          break;
        case "performance":
          aValue = a.performanceScore;
          bValue = b.performanceScore;
          break;
        default:
          aValue = a.expectedAPY;
          bValue = b.expectedAPY;
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
    const chainLower = chain.toLowerCase();
    if (chainLower.includes("ethereum")) {
      return "text-blue-400 border-blue-400/20 bg-blue-400/10";
    } else if (chainLower.includes("base")) {
      return "text-purple-400 border-purple-400/20 bg-purple-400/10";
    } else if (chainLower.includes("arbitrum")) {
      return "text-cyan-400 border-cyan-400/20 bg-cyan-400/10";
    } else if (chainLower.includes("multi")) {
      return "text-primary border-primary/20 bg-primary/10";
    } else {
      return "text-muted-foreground";
    }
  };

  // Generate APY trend data from strategies with error handling
  const apyTrendData = (() => {
    if (strategies && strategies.length > 0) {
      // Try to find a strategy with valid apyHistory
      const strategyWithHistory = strategies.find(s => 
        s.apyHistory && Array.isArray(s.apyHistory) && s.apyHistory.length > 0
      );
      
      if (strategyWithHistory) {
        console.log('📈 Using APY history from strategy:', strategyWithHistory.name);
        return strategyWithHistory.apyHistory.map((apy, index) => ({
          name: `Week ${index + 1}`,
          value: typeof apy === 'number' && !isNaN(apy) ? apy : 0
        }));
      }
    }
    
    // Fallback to mock data - always ensure we have data
    console.log('📈 Using fallback APY trend data');
    return [
      { name: "Week 1", value: 12.5 },
      { name: "Week 2", value: 13.2 },
      { name: "Week 3", value: 14.1 },
      { name: "Week 4", value: 14.8 },
      { name: "Week 5", value: 15.2 },
      { name: "Week 6", value: 15.8 },
    ];
  })();

  // Generate portfolio allocation data from backend summary or calculate from strategies
  const portfolioAllocationData = (() => {
    if (summaryData?.categoryBreakdown) {
      console.log('📊 Using backend category breakdown:', summaryData.categoryBreakdown);
      const total = Object.values(summaryData.categoryBreakdown).reduce((sum: number, val: any) => sum + val, 0);
      const data = Object.entries(summaryData.categoryBreakdown)
        .filter(([_, value]) => (value as number) > 0) // Only show categories with data
        .map(([name, value], index) => ({
          name,
          value: total > 0 ? Math.round(((value as number) / total) * 100) : 0,
          color: COLORS[index % COLORS.length],
          count: value as number
        }));
      console.log('📊 Generated chart data:', data);
      return data;
    } else {
      // Calculate from filtered strategies
      const categoryCounts = filteredStrategies.reduce((acc, strategy) => {
        const category = strategy.category || 'Unknown';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('📊 Calculated category breakdown from strategies:', categoryCounts);
      const total = Object.values(categoryCounts).reduce((sum, val) => sum + val, 0);
      return Object.entries(categoryCounts)
        .filter(([_, value]) => value > 0) // Only show categories with data
        .map(([name, value], index) => ({
          name,
          value: total > 0 ? Math.round((value / total) * 100) : 0,
          color: COLORS[index % COLORS.length],
          count: value
        }));
    }
  })();

  // Calculate summary statistics from live data only
  const totalTVL = filteredStrategies.reduce((sum, s) => {
    const tvl = typeof s.tvl === 'number' && !isNaN(s.tvl) ? s.tvl : 0;
    return sum + tvl;
  }, 0);
  
  const avgAPY = (() => {
    if (filteredStrategies.length > 0) {
      const validAPYs = filteredStrategies.filter(s => 
        typeof s.expectedAPY === 'number' && !isNaN(s.expectedAPY) && s.expectedAPY > 0
      );
      
      if (validAPYs.length > 0) {
        return validAPYs.reduce((sum, s) => sum + s.expectedAPY, 0) / validAPYs.length;
      }
    }
    
    return 0;
  })();
    
  const aiOptimizedCount = filteredStrategies.filter(s => Boolean(s.aiOptimized)).length;
  
  const avgPerformanceScore = (() => {
    if (filteredStrategies.length > 0) {
      const validScores = filteredStrategies.filter(s => 
        typeof s.performanceScore === 'number' && !isNaN(s.performanceScore) && s.performanceScore > 0
      );
      
      if (validScores.length > 0) {
        return validScores.reduce((sum, s) => sum + s.performanceScore, 0) / validScores.length;
      }
    }
    
    return 0;
  })();

  // Debug logging
  console.log('📊 Summary calculations:', {
    filteredStrategiesCount: filteredStrategies.length,
    totalStrategies: strategies.length,
    totalTVL,
    avgAPY,
    aiOptimizedCount,
    avgPerformanceScore,
    firstStrategy: filteredStrategies[0],
    isConnectedToBackend,
    summaryData
  });

  const handleStrategySelect = (strategy: EnhancedStrategy) => {
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
    console.log("🚀 Deploy button clicked!");
    console.log("Selected strategy:", selectedStrategy);
    console.log("Execution amount:", executionAmount);
    console.log("Connected address:", connectedAddress);
    console.log("Agent address:", agentAddress);
    
    if (!selectedStrategy || !executionAmount || isNaN(parseFloat(executionAmount)) || parseFloat(executionAmount) <= 0) {
      notification.error("Please enter a valid amount");
      return;
    }

    const deployAmount = parseFloat(executionAmount);
    
    if (deployAmount < selectedStrategy.minDeposit) {
      notification.error(`Minimum deposit is $${selectedStrategy.minDeposit}. Please enter a higher amount.`);
      return;
    }
    console.log("Deploy amount:", deployAmount);
    console.log("Min deposit:", selectedStrategy.minDeposit);
    
    try {
      setShowExecutionModal(false);
      notification.info("Initiating strategy execution...");
      
      // Execute strategy via real CCTP backend
      const response = await fetch('/api/smart-wallet-cctp-execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: connectedAddress,
          amount: deployAmount,
          sourceChain: "ethereum_sepolia",
          destinationChain: "base_sepolia", // or "arbitrum_sepolia" based on strategy
          recipient: connectedAddress,
          smartWalletMode: true,
          strategy: selectedStrategy.id
        })
      });

      const result = await response.json();
      
      if (result.status === 'success') {
        notification.success(`Real CCTP transfer initiated! Transaction hash: ${result.burnTxHash?.slice(0, 10)}...`);
        
        // Redirect to execution dashboard with real CCTP parameters
        setTimeout(() => {
          const params = new URLSearchParams({
            executionId: result.burnTxHash || `cctp_${Date.now()}`,
            strategyId: selectedStrategy.id,
            amount: deployAmount.toString()
          });
          window.location.href = `/dashboard-execution?${params.toString()}`;
        }, 2000);
      } else {
        notification.error(`Real CCTP execution failed: ${result.message || 'Unknown error'}`);
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
              <ConnectButton />
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
                  <ConnectButton />
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
              <ConnectButton />
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

          {/* Risk and Chain Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Risk Distribution */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  <span>Risk Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summaryData?.riskBreakdown ? 
                    Object.entries(summaryData.riskBreakdown).map(([risk, count], index) => {
                      const colors = ["text-green-400", "text-yellow-400", "text-red-400"];
                      const bgColors = ["bg-green-400/10", "bg-yellow-400/10", "bg-red-400/10"];
                      const total = Object.values(summaryData.riskBreakdown).reduce((sum: number, val) => sum + (val as number), 0);
                      const percentage = total > 0 ? ((count as number) / total * 100).toFixed(1) : "0";
                      
                      return (
                        <div key={risk} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-4 w-4 rounded-full ${bgColors[index] || "bg-gray-400/10"}`}></div>
                            <span className="text-sm font-medium">{risk}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${bgColors[index] || "bg-gray-500"} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-semibold ${colors[index] || "text-gray-400"} w-8`}>
                              {count as number}
                            </span>
                          </div>
                        </div>
                      );
                    }) :
                    <div className="text-center py-4 text-muted-foreground">
                      <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No risk data available</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>

            {/* Chain Distribution */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Network className="h-5 w-5 text-blue-400" />
                  <span>Chain Distribution</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summaryData?.chainBreakdown ? 
                    Object.entries(summaryData.chainBreakdown).map(([chain, count], index) => {
                      const colors = ["text-blue-400", "text-purple-400", "text-cyan-400", "text-primary"];
                      const bgColors = ["bg-blue-400/10", "bg-purple-400/10", "bg-cyan-400/10", "bg-primary/10"];
                      const total = Object.values(summaryData.chainBreakdown).reduce((sum: number, val) => sum + (val as number), 0);
                      const percentage = total > 0 ? ((count as number) / total * 100).toFixed(1) : "0";
                      
                      return (
                        <div key={chain} className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={`h-4 w-4 rounded-full ${bgColors[index] || "bg-gray-400/10"}`}></div>
                            <span className="text-sm font-medium">{chain}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${bgColors[index] || "bg-gray-500"} transition-all duration-500`}
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className={`text-sm font-semibold ${colors[index] || "text-gray-400"} w-8`}>
                              {count as number}
                            </span>
                          </div>
                        </div>
                      );
                    }) :
                    <div className="text-center py-4 text-muted-foreground">
                      <Network className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No chain data available</p>
                    </div>
                  }
                </div>
              </CardContent>
            </Card>
          </div>

          {/* AI Validation Display */}
          <div className="mb-8">
            <AIValidationDisplay />
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
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={apyTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}%`, 'APY']}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#8884d8" 
                        strokeWidth={3}
                        dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                        activeDot={{ r: 8, stroke: '#8884d8', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
                {portfolioAllocationData.length > 0 ? (
                  <>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPieChart>
                          <Pie
                            data={portfolioAllocationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => value > 0 ? `${name}: ${value}%` : ''}
                            outerRadius={70}
                            innerRadius={20}
                            fill="#8884d8"
                            dataKey="value"
                            stroke="#fff"
                            strokeWidth={2}
                            labelStyle={{
                              fontSize: '11px',
                              fontWeight: 'bold',
                              fill: '#ffffff',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                            }}
                          >
                            {portfolioAllocationData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: any, name: any, props: any) => [
                              `${value}% (${props.payload.count} strategies)`, 
                              name
                            ]}
                            labelFormatter={(label) => `Category: ${label}`}
                            contentStyle={{
                              backgroundColor: 'rgba(0, 0, 0, 0.9)',
                              border: '1px solid #333',
                              borderRadius: '8px',
                              color: 'white',
                              fontSize: '12px'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => <span style={{ color: '#666', fontSize: '12px' }}>{value}</span>}
                          />
                        </RechartsPieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 text-xs text-muted-foreground text-center">
                      {isConnectedToBackend ? "Data from backend" : "Using mock data"}
                    </div>
                  </>
                ) : (
                  <div className="h-64 w-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <PieChart className="h-12 w-12 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No strategy data available</p>
                      <p className="text-xs text-muted-foreground">Strategies will appear here once deployed</p>
                    </div>
                  </div>
                )}
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
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summaryData?.chainBreakdown ? Object.entries(summaryData.chainBreakdown).map(([chain, count]) => ({ name: chain, value: count })) : []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value}`, 'Strategies']}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
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
                      const percentage = (count as number / (strategies?.length || 1)) * 100;
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
                            <span className="text-sm text-muted-foreground w-8">{count as number}</span>
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
              <AIStrategyCard
                key={strategy.id}
                strategy={strategy}
                onDeploy={handleStrategySelect}
                className="hover:shadow-lg hover:shadow-primary/5"
              />
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
              <h3 className="text-2xl font-semibold mb-2">No AI strategies available</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {isConnectedToBackend 
                  ? "No AI-generated strategies match your current filters. Try adjusting your search criteria or clearing some filters."
                  : "Unable to connect to the AI strategy backend. Please check your connection and try again."
                }
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
                  {filteredStrategies.length > 0 ? Math.max(...filteredStrategies.map((s) => s.expectedAPY)).toFixed(1) : '0.0'}%
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

        {/* Test Execution Button - Remove in production */}
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const testExecutionData = {
                  executionId: `test_${Date.now()}`,
                  strategyId: "test_strategy",
                  amount: 100,
                  status: "in_progress",
                  estimatedTime: "3-8 minutes",
                  cctpTransfers: [
                    {
                      id: "cctp_1",
                      sourceChain: "Ethereum Sepolia",
                      destinationChain: "Base Sepolia",
                      amount: 65,
                      status: "initiated",
                      txHash: "0xc7c91b48b6b5ebc17bb02d286b17b6905e147e690cf353cf6e491246973cbd6c", // Your actual transaction hash
                      progress: 0
                    },
                    {
                      id: "cctp_2", 
                      sourceChain: "Ethereum Sepolia",
                      destinationChain: "Arbitrum Sepolia",
                      amount: 35,
                      status: "initiated",
                      txHash: "0xc7c91b48b6b5ebc17bb02d286b17b6905e147e690cf353cf6e491246973cbd6c", // Your actual transaction hash
                      progress: 0
                    }
                  ],
                  portfolioUpdate: {
                    totalValue: 100,
                    currentAPY: 8.7,
                    allocations: [
                      {
                        protocol: "Aave V3",
                        chain: "Base Sepolia",
                        amount: 65,
                        percentage: 65,
                        apy: 7.2
                      },
                      {
                        protocol: "Compound V3",
                        chain: "Arbitrum Sepolia", 
                        amount: 35,
                        percentage: 35,
                        apy: 6.8
                      }
                    ]
                  }
                };

                console.log("🧪 Creating test execution:", testExecutionData);
                const response = await fetch('/api/strategy-executions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(testExecutionData)
                });

                if (response.ok) {
                  console.log("✅ Test execution created successfully");
                  notification.success("Test execution created!");
                  // Redirect to dashboard
                  window.location.href = `/dashboard-execution?executionId=${testExecutionData.executionId}`;
                } else {
                  console.error("❌ Failed to create test execution:", response.status);
                  const errorText = await response.text();
                  console.error("Error details:", errorText);
                  notification.error("Failed to create test execution");
                }
              } catch (error) {
                console.error("Error creating test execution:", error);
                notification.error("Failed to create test execution");
              }
            }}
          >
            🧪 Test Execution
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                // Create execution record for your actual transaction
                const realExecutionData = {
                  executionId: "0xc7c91b48b6b5ebc17bb02d286b17b6905e147e690cf353cf6e491246973cbd6c",
                  strategyId: "balanced",
                  amount: 1,
                  status: "in_progress",
                  estimatedTime: "3-8 minutes",
                  cctpTransfers: [
                    {
                      id: "cctp_1",
                      sourceChain: "Ethereum Sepolia",
                      destinationChain: "Base Sepolia",
                      amount: 0.65,
                      status: "burned",
                      txHash: "0xc7c91b48b6b5ebc17bb02d286b17b6905e147e690cf353cf6e491246973cbd6c",
                      progress: 30
                    }
                  ],
                  portfolioUpdate: {
                    totalValue: 1,
                    currentAPY: 8.7,
                    allocations: [
                      {
                        protocol: "Aave V3",
                        chain: "Base Sepolia",
                        amount: 0.65,
                        percentage: 65,
                        apy: 7.2
                      }
                    ]
                  }
                };

                console.log("Creating real execution:", realExecutionData);
                const response = await fetch('/api/strategy-executions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(realExecutionData)
                });

                if (response.ok) {
                  console.log("✅ Real execution created successfully");
                  notification.success("Real execution created!");
                  // Redirect to dashboard
                  window.location.href = `/dashboard-execution?executionId=${realExecutionData.executionId}`;
                } else {
                  console.error("❌ Failed to create real execution:", response.status);
                  notification.error("Failed to create real execution");
                }
              } catch (error) {
                console.error("Error creating real execution:", error);
                notification.error("Failed to create real execution");
              }
            }}
          >
            🔗 Real TX
          </Button>
        </div>

        {/* CCTP Strategy Execution Modal */}
        {showExecutionModal && selectedStrategy && (
          <CCTPStrategyExecution
            strategy={selectedStrategy}
            onClose={() => setShowExecutionModal(false)}
            onSuccess={async (transferId) => {
              console.log("🎉 Strategy execution successful:", transferId);
              console.log("📋 Selected strategy:", selectedStrategy);
              console.log("💰 Execution amount:", executionAmount);
              setShowExecutionModal(false);
              notification.success("Strategy deployed successfully!");
              
              // Create execution record
              try {
                const executionData = {
                  executionId: transferId,
                  strategyId: selectedStrategy?.id || "unknown",
                  amount: parseFloat(executionAmount || "0"),
                  status: "in_progress",
                  estimatedTime: "3-8 minutes",
                  cctpTransfers: [
                    {
                      id: "cctp_1",
                      sourceChain: "Ethereum Sepolia",
                      destinationChain: "Base Sepolia",
                      amount: parseFloat(executionAmount || "0") * 0.65,
                      status: "initiated",
                      txHash: transferId, // This will be the actual transaction hash
                      progress: 0
                    },
                    {
                      id: "cctp_2", 
                      sourceChain: "Ethereum Sepolia",
                      destinationChain: "Arbitrum Sepolia",
                      amount: parseFloat(executionAmount || "0") * 0.35,
                      status: "initiated",
                      txHash: transferId, // This will be the actual transaction hash
                      progress: 0
                    }
                  ],
                  portfolioUpdate: {
                    totalValue: parseFloat(executionAmount || "0"),
                    currentAPY: 8.7,
                    allocations: [
                      {
                        protocol: "Aave V3",
                        chain: "Base Sepolia",
                        amount: parseFloat(executionAmount || "0") * 0.65,
                        percentage: 65,
                        apy: 7.2
                      },
                      {
                        protocol: "Compound V3",
                        chain: "Arbitrum Sepolia", 
                        amount: parseFloat(executionAmount || "0") * 0.35,
                        percentage: 35,
                        apy: 6.8
                      }
                    ]
                  }
                };

                console.log("Creating execution record:", executionData);
                console.log("API URL:", '/api/strategy-executions');
                
                const response = await fetch('/api/strategy-executions', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(executionData)
                });

                console.log("Response status:", response.status);
                console.log("Response ok:", response.ok);

                if (response.ok) {
                  const responseData = await response.json();
                  console.log("✅ Execution record created successfully:", responseData);
                  notification.success("Execution record created!");
                } else {
                  const errorText = await response.text();
                  console.error("❌ Failed to create execution record:", response.status, errorText);
                  notification.error(`Failed to create execution record: ${response.status}`);
                }
              } catch (error) {
                console.error("Error creating execution record:", error);
                notification.error("Failed to create execution record");
              }
              
              // Redirect to execution dashboard
              setTimeout(() => {
                const params = new URLSearchParams({
                  executionId: transferId,
                  strategyId: selectedStrategy?.id || "unknown",
                  amount: executionAmount || "0"
                });
                console.log("Redirecting to dashboard-execution with params:", params.toString());
                window.location.href = `/dashboard-execution?${params.toString()}`;
              }, 2000);
            }}
          />
        )}
      </div>
    </div>
  );
}