"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import { 
  ArrowLeft, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Activity,
  ArrowRightLeft,
  Shield,
  Zap,
  Target,
  BarChart3,
  PieChart,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { RainbowKitConnectButton } from "~~/components/scaffold-eth";
import { useAccount } from "wagmi";

interface ExecutionData {
  executionId: string;
  strategyId: string;
  amount: number;
  status: 'initiated' | 'in_progress' | 'completed' | 'failed';
  estimatedTime: string;
  cctpTransfers: Array<{
    id: string;
    sourceChain: string;
    destinationChain: string;
    amount: number;
    status: 'initiated' | 'burned' | 'attested' | 'minted' | 'completed';
    txHash: string;
    progress: number;
  }>;
  portfolioUpdate: {
    totalValue: number;
    currentAPY: number;
    allocations: Array<{
      protocol: string;
      chain: string;
      amount: number;
      percentage: number;
      apy: number;
    }>;
  };
}

export default function DashboardExecutionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { address: connectedAddress } = useAccount();
  
  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);

  // Mock execution data - in production this would come from the backend
  const mockExecutionData: ExecutionData = {
    executionId: searchParams.get('executionId') || `exec_${Date.now()}`,
    strategyId: searchParams.get('strategyId') || 'aave-v3-eth',
    amount: parseFloat(searchParams.get('amount') || '1000'),
    status: 'in_progress',
    estimatedTime: '2-5 minutes',
    cctpTransfers: [
      {
        id: 'cctp_1',
        sourceChain: 'Ethereum',
        destinationChain: 'Base',
        amount: parseFloat(searchParams.get('amount') || '1000') * 0.6,
        status: 'burned',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        progress: 75
      },
      {
        id: 'cctp_2',
        sourceChain: 'Ethereum',
        destinationChain: 'Arbitrum',
        amount: parseFloat(searchParams.get('amount') || '1000') * 0.4,
        status: 'attested',
        txHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        progress: 90
      }
    ],
    portfolioUpdate: {
      totalValue: parseFloat(searchParams.get('amount') || '1000'),
      currentAPY: 15.8,
      allocations: [
        {
          protocol: 'Aave V3',
          chain: 'Base',
          amount: parseFloat(searchParams.get('amount') || '1000') * 0.6,
          percentage: 60,
          apy: 14.2
        },
        {
          protocol: 'Compound V3',
          chain: 'Arbitrum',
          amount: parseFloat(searchParams.get('amount') || '1000') * 0.4,
          percentage: 40,
          apy: 11.5
        }
      ]
    }
  };

  useEffect(() => {
    // Simulate loading execution data
    const timer = setTimeout(() => {
      setExecutionData(mockExecutionData);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate progress updates and completion
  useEffect(() => {
    if (!executionData) return;

    const interval = setInterval(() => {
      setExecutionData(prev => {
        if (!prev) return null;
        
        const updatedTransfers = prev.cctpTransfers.map(transfer => {
          if (transfer.status === 'burned' && transfer.progress < 100) {
            return { ...transfer, progress: Math.min(transfer.progress + 5, 100) };
          }
          if (transfer.status === 'attested' && transfer.progress < 100) {
            return { ...transfer, progress: Math.min(transfer.progress + 3, 100) };
          }
          return transfer;
        });

        const allCompleted = updatedTransfers.every(t => t.progress === 100);
        
        return {
          ...prev,
          cctpTransfers: updatedTransfers,
          status: allCompleted ? 'completed' : 'in_progress'
        };
      });
    }, 2000);

    // Auto-complete after 10 seconds for demo purposes
    const completionTimer = setTimeout(() => {
      setExecutionData(prev => {
        if (!prev) return null;
        
        const completedTransfers = prev.cctpTransfers.map(transfer => ({
          ...transfer,
          status: 'completed' as const,
          progress: 100
        }));
        
        return {
          ...prev,
          cctpTransfers: completedTransfers,
          status: 'completed' as const
        };
      });
    }, 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [executionData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'initiated':
        return 'text-blue-400 border-blue-400/20 bg-blue-400/10';
      case 'burned':
        return 'text-orange-400 border-orange-400/20 bg-orange-400/10';
      case 'attested':
        return 'text-purple-400 border-purple-400/20 bg-purple-400/10';
      case 'minted':
      case 'completed':
        return 'text-green-400 border-green-400/20 bg-green-400/10';
      case 'failed':
        return 'text-red-400 border-red-400/20 bg-red-400/10';
      default:
        return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'initiated':
        return <Clock className="h-4 w-4" />;
      case 'burned':
        return <Activity className="h-4 w-4" />;
      case 'attested':
        return <Shield className="h-4 w-4" />;
      case 'minted':
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'failed':
        return <ExternalLink className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen bg-background">
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
                Strategy Execution Dashboard
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to view strategy execution status
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to connect your wallet to view execution status
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
              <Link href="/strategies">
                <Button variant="ghost" size="sm" className="hover:bg-muted/50">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Strategies
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
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary via-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
            Strategy Execution Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Monitor your AI-optimized strategy deployment across multiple chains
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardContent className="p-8">
                <div className="flex items-center justify-center space-x-4">
                  <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-lg font-medium">Loading execution data...</span>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : executionData && (
          <div className="space-y-8">
            {/* Execution Status */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>Execution Status</span>
                  <Badge variant={executionData.status === 'completed' ? 'default' : 'secondary'}>
                    {executionData.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Execution ID: {executionData.executionId} • Strategy: {executionData.strategyId}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-primary">${executionData.amount.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-green-400">{executionData.portfolioUpdate.currentAPY}%</div>
                    <div className="text-sm text-muted-foreground">Expected APY</div>
                  </div>
                  <div className="text-center p-4 bg-muted/30 rounded-lg">
                    <div className="text-2xl font-bold text-blue-400">{executionData.estimatedTime}</div>
                    <div className="text-sm text-muted-foreground">Estimated Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CCTP Transfers - Enhanced */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-white" />
                  </div>
                  <span>Cross-Chain Transfer Protocol (CCTP)</span>
                  <Badge variant="secondary" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                    Circle Protocol
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of USDC transfers across chains using Circle's CCTP protocol
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* CCTP Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400">{executionData.cctpTransfers.length}</div>
                    <div className="text-sm text-muted-foreground">Active Transfers</div>
                  </div>
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {executionData.cctpTransfers.filter(t => t.status === 'completed').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Completed</div>
                  </div>
                  <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-purple-400">
                      ${executionData.cctpTransfers.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Volume</div>
                  </div>
                </div>

                {/* Enhanced Transfer Cards */}
                {executionData.cctpTransfers.map((transfer, index) => (
                  <div key={transfer.id} className="relative p-6 border border-border/50 rounded-xl bg-gradient-to-r from-muted/10 to-muted/5 hover:from-muted/20 hover:to-muted/10 transition-all duration-300">
                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className={`h-3 w-3 rounded-full ${
                        transfer.status === 'completed' ? 'bg-green-500' :
                        transfer.status === 'minted' ? 'bg-green-400' :
                        transfer.status === 'attested' ? 'bg-purple-400' :
                        transfer.status === 'burned' ? 'bg-orange-400' :
                        'bg-blue-400'
                      } animate-pulse`}></div>
                    </div>

                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-gradient-to-r from-primary to-purple-500 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold">#{index + 1}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-lg">CCTP Transfer</div>
                            <div className="text-sm text-muted-foreground">Circle Protocol</div>
                          </div>
                        </div>
                        <Badge className={`text-sm px-3 py-1 ${getStatusColor(transfer.status)}`}>
                          {getStatusIcon(transfer.status)}
                          <span className="ml-1">{transfer.status.charAt(0).toUpperCase() + transfer.status.slice(1)}</span>
                        </Badge>
                      </div>

                      {/* Route Visualization */}
                      <div className="flex items-center justify-center space-x-4 py-4">
                        <div className="text-center">
                          <div className="h-12 w-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-2">
                            <span className="text-blue-400 font-bold text-sm">{transfer.sourceChain.slice(0, 3)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{transfer.sourceChain}</div>
                        </div>
                        
                        <div className="flex-1 flex items-center space-x-2">
                          <div className="h-1 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full flex-1"></div>
                          <ArrowRightLeft className="h-5 w-5 text-primary" />
                          <div className="h-1 bg-gradient-to-r from-purple-400 to-green-400 rounded-full flex-1"></div>
                        </div>
                        
                        <div className="text-center">
                          <div className="h-12 w-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-2">
                            <span className="text-green-400 font-bold text-sm">{transfer.destinationChain.slice(0, 3)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{transfer.destinationChain}</div>
                        </div>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Amount</div>
                          <div className="text-xl font-bold text-green-400">${transfer.amount.toLocaleString()}</div>
                          <div className="text-xs text-muted-foreground">USDC</div>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Transaction Hash</div>
                          <code className="text-xs bg-muted px-2 py-1 rounded block truncate">
                            {transfer.txHash.slice(0, 16)}...{transfer.txHash.slice(-12)}
                          </code>
                        </div>
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">Progress</div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>{transfer.progress}%</span>
                              <span className="text-muted-foreground">Complete</span>
                            </div>
                            <Progress value={transfer.progress} className="h-2" />
                          </div>
                        </div>
                      </div>

                      {/* CCTP Steps */}
                      <div className="space-y-3">
                        <div className="text-sm font-medium text-muted-foreground">CCTP Process Steps</div>
                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { step: 'Burn', status: transfer.status === 'burned' || transfer.status === 'attested' || transfer.status === 'minted' || transfer.status === 'completed' },
                            { step: 'Attest', status: transfer.status === 'attested' || transfer.status === 'minted' || transfer.status === 'completed' },
                            { step: 'Mint', status: transfer.status === 'minted' || transfer.status === 'completed' },
                            { step: 'Complete', status: transfer.status === 'completed' }
                          ].map((step, stepIndex) => (
                            <div key={stepIndex} className={`p-2 rounded-lg text-center text-xs ${
                              step.status ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-muted/50 text-muted-foreground'
                            }`}>
                              {step.step}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Portfolio Allocation */}
            <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  <span>Portfolio Allocation</span>
                </CardTitle>
                <CardDescription>
                  Your funds will be allocated across these protocols and chains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executionData.portfolioUpdate.allocations.map((allocation, index) => (
                    <div key={index} className="p-4 border border-border/50 rounded-lg bg-muted/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className="h-3 w-3 bg-primary rounded-full"></div>
                          <span className="font-medium">{allocation.protocol}</span>
                        </div>
                        <Badge variant="outline">{allocation.chain}</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Amount:</span>
                          <span className="font-medium">${allocation.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Percentage:</span>
                          <span className="font-medium">{allocation.percentage}%</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">APY:</span>
                          <span className="font-medium text-green-400">{allocation.apy}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all duration-500"
                            style={{ width: `${allocation.percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Completion Status */}
            {executionData.status === 'completed' && (
              <Card className="border-green-500/50 bg-green-500/5 mb-6">
                <CardContent className="pt-6">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-green-500 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-800 text-lg">Strategy Execution Complete!</h3>
                      <p className="text-sm text-green-700">
                        Your funds have been successfully deployed across chains using CCTP. Your portfolio is now optimized for maximum yield.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Action Buttons */}
            <div className="space-y-4">
              {executionData.status === 'completed' ? (
                <div className="text-center space-y-4">
                  <div className="text-lg font-medium text-green-400 mb-4">
                    🎉 Strategy Successfully Deployed!
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button size="lg" className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 px-8 py-3">
                        <BarChart3 className="h-5 w-5 mr-2" />
                        View Your Portfolio Dashboard
                      </Button>
                    </Link>
                    <Link href="/strategies">
                      <Button variant="outline" size="lg" className="bg-transparent px-8 py-3">
                        <Target className="h-5 w-5 mr-2" />
                        Deploy Another Strategy
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard">
                    <Button className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Portfolio Dashboard
                    </Button>
                  </Link>
                  <Link href="/strategies">
                    <Button variant="outline" className="bg-transparent">
                      <Target className="h-4 w-4 mr-2" />
                      Deploy Another Strategy
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}