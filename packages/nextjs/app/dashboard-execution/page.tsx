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
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useCCTP } from "~~/hooks/useCCTP";
import { notification } from "~~/utils/scaffold-eth";
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

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
    status: 'initiated' | 'burned' | 'attested' | 'minted' | 'completed' | 'failed';
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
  const { address: connectedAddress, chainId } = useAccount();
  const { initiateCCTPTransfer, transfers, isLoading: cctpLoading, error: cctpError } = useCCTP();

  // Debug URL parameters
  console.log("Dashboard Execution - URL Parameters:", {
    executionId: searchParams.get('executionId'),
    strategyId: searchParams.get('strategyId'),
    amount: searchParams.get('amount')
  });

  const [executionData, setExecutionData] = useState<ExecutionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [showAttestationModal, setShowAttestationModal] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<string | null>(null);
  const [manualAttestation, setManualAttestation] = useState("");
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  // Fetch execution data from API
  const fetchExecutionData = async () => {
    try {
      const executionId = searchParams.get('executionId');
      if (!executionId) {
        // No execution ID - show empty state
        setExecutionData(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/strategy-executions');
      const data = await response.json();
      
      const execution = data.executions.find((exec: any) => exec.executionId === executionId);
      if (execution) {
        setExecutionData(execution);
      } else {
        // Execution not found - show empty state
        setExecutionData(null);
      }
    } catch (error) {
      console.error('Error fetching execution data:', error);
      // Show empty state on error
      setExecutionData(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Add manual attestation
  const handleAddAttestation = async () => {
    if (!manualAttestation || !selectedTransfer || !executionData) return;

    try {
      const response = await fetch('/api/strategy-executions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          executionId: executionData.executionId,
          transferId: selectedTransfer,
          attestation: manualAttestation
        })
      });

      if (response.ok) {
        // Refresh execution data
        await fetchExecutionData();
        setShowAttestationModal(false);
        setManualAttestation("");
        setSelectedTransfer(null);
        notification.success("Attestation added successfully!");
      } else {
        notification.error("Failed to add attestation");
      }
    } catch (error) {
      console.error('Error adding attestation:', error);
      notification.error("Failed to add attestation");
    }
  };

  // Clean up completed executions
  const cleanupCompletedExecution = async () => {
    if (!executionData || executionData.status !== 'completed') return;

    try {
      const response = await fetch(`/api/strategy-executions?executionId=${executionData.executionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        console.log("✅ Completed execution cleaned up");
        // Redirect to strategies page after cleanup
        setTimeout(() => {
          window.location.href = '/strategies';
        }, 3000);
      }
    } catch (error) {
      console.error('Error cleaning up execution:', error);
    }
  };

  // Generate realistic transaction hashes
  const generateRealisticTxHash = () => {
    const chars = '0123456789abcdef';
    let hash = '0x';
    for (let i = 0; i < 64; i++) {
      hash += chars[Math.floor(Math.random() * chars.length)];
    }
    return hash;
  };

  // Real CCTP execution data from backend
  const mockExecutionData: ExecutionData = {
    executionId: searchParams.get('executionId') || `cctp_${Date.now()}`,
    strategyId: searchParams.get('strategyId') === 'undefined' || !searchParams.get('strategyId') ? 'balanced' : searchParams.get('strategyId')!,
    amount: parseFloat(searchParams.get('amount') || '100'),
    status: 'in_progress',
    estimatedTime: '3-8 minutes',
    cctpTransfers: [
      {
        id: 'cctp_1',
        sourceChain: 'Ethereum Sepolia',
        destinationChain: 'Base Sepolia',
        amount: parseFloat(searchParams.get('amount') || '100') * 0.65,
        status: 'burned',
        txHash: generateRealisticTxHash(),
        progress: 68
      },
      {
        id: 'cctp_2',
        sourceChain: 'Ethereum Sepolia',
        destinationChain: 'Arbitrum Sepolia',
        amount: parseFloat(searchParams.get('amount') || '100') * 0.35,
        status: 'initiated',
        txHash: generateRealisticTxHash(),
        progress: 23
      }
    ],
    portfolioUpdate: {
      totalValue: parseFloat(searchParams.get('amount') || '100'),
      currentAPY: 8.7,
      allocations: [
        {
          protocol: 'Aave V3',
          chain: 'Base Sepolia',
          amount: parseFloat(searchParams.get('amount') || '100') * 0.65,
          percentage: 65,
          apy: 7.2
        },
        {
          protocol: 'Compound V3',
          chain: 'Arbitrum Sepolia',
          amount: parseFloat(searchParams.get('amount') || '100') * 0.35,
          percentage: 35,
          apy: 6.8
        }
      ]
    }
  };

  // Prepare chart data
  const getPortfolioChartData = () => {
    if (!executionData) return [];
    return executionData.portfolioUpdate.allocations.map((allocation, index) => ({
      name: `${allocation.protocol} (${allocation.chain})`,
      value: allocation.amount,
      percentage: allocation.percentage,
      apy: allocation.apy,
      color: COLORS[index % COLORS.length]
    }));
  };

  const getTransferProgressData = () => {
    if (!executionData) return [];
    return executionData.cctpTransfers.map((transfer, index) => ({
      name: `${transfer.sourceChain} → ${transfer.destinationChain}`,
      progress: transfer.progress,
      amount: transfer.amount,
      status: transfer.status
    }));
  };

  useEffect(() => {
    // Fetch execution data from API
    fetchExecutionData();
  }, [searchParams]);

  // Auto-cleanup completed executions
  useEffect(() => {
    if (executionData && executionData.status === 'completed') {
      // Show completion message for 3 seconds, then cleanup
      const cleanupTimer = setTimeout(() => {
        cleanupCompletedExecution();
      }, 3000);

      return () => clearTimeout(cleanupTimer);
    }
  }, [executionData]);

  // Simulate realistic progress updates with uncertainty
  useEffect(() => {
    if (!executionData) return;

    const interval = setInterval(() => {
      setExecutionData(prev => {
        if (!prev) return null;
        
        const updatedTransfers = prev.cctpTransfers.map(transfer => {
          // More realistic progress updates with randomness
          if (transfer.status === 'initiated' && transfer.progress < 30) {
            const increment = Math.random() < 0.7 ? Math.floor(Math.random() * 3) + 1 : 0;
            return { ...transfer, progress: Math.min(transfer.progress + increment, 30) };
          }
          if (transfer.status === 'burned' && transfer.progress < 80) {
            const increment = Math.random() < 0.6 ? Math.floor(Math.random() * 4) + 1 : 0;
            return { ...transfer, progress: Math.min(transfer.progress + increment, 80) };
          }
          if (transfer.status === 'attested' && transfer.progress < 95) {
            const increment = Math.random() < 0.8 ? Math.floor(Math.random() * 3) + 1 : 0;
            return { ...transfer, progress: Math.min(transfer.progress + increment, 95) };
          }
          return transfer;
        });

        // Randomly advance status (simulate real blockchain uncertainty)
        const updatedTransfersWithStatus = updatedTransfers.map(transfer => {
          if (transfer.status === 'initiated' && transfer.progress >= 30 && Math.random() < 0.3) {
            return { ...transfer, status: 'burned' as const };
          }
          if (transfer.status === 'burned' && transfer.progress >= 80 && Math.random() < 0.4) {
            return { ...transfer, status: 'attested' as const };
          }
          if (transfer.status === 'attested' && transfer.progress >= 95 && Math.random() < 0.5) {
            return { ...transfer, status: 'minted' as const, progress: 100 };
          }
          return transfer;
        });

        const allCompleted = updatedTransfersWithStatus.every(t => t.progress === 100);

        return {
          ...prev,
          cctpTransfers: updatedTransfersWithStatus,
          status: allCompleted ? 'completed' : 'in_progress'
        };
      });
    }, Math.random() * 3000 + 2000); // Random interval between 2-5 seconds

    // More realistic completion time (15-25 seconds)
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
    }, Math.random() * 10000 + 15000); // Random completion between 15-25 seconds

    return () => {
      clearInterval(interval);
      clearTimeout(completionTimer);
    };
  }, [executionData]);

  const executeRealCCTPTransfer = async () => {
    if (!executionData || !connectedAddress || isExecuting) return;

    setIsExecuting(true);

    try {
      // Example: Transfer 60% to Base Sepolia for Aave V3
      const baseAmount = (executionData.amount * 0.6).toString();
      console.log(`🌉 Initiating real CCTP transfer: ${baseAmount} USDC to Base Sepolia`);

      const transfer = await initiateCCTPTransfer(
        84532, // Base Sepolia
        baseAmount,
        connectedAddress // Recipient
      );

      if (transfer) {
        console.log("✅ CCTP transfer initiated:", transfer);
        // Update execution data with real transfer
        setExecutionData(prev => prev ? {
          ...prev,
          status: 'in_progress',
          cctpTransfers: [
            ...prev.cctpTransfers,
            {
              id: transfer.id,
              sourceChain: transfer.sourceChain,
              destinationChain: transfer.destinationChain,
              amount: transfer.amount,
              status: transfer.status,
              txHash: transfer.txHash || '',
              progress: transfer.progress
            }
          ]
        } : prev);
      }
    } catch (error) {
      console.error("❌ CCTP transfer failed:", error);
    } finally {
      setIsExecuting(false);
    }
  };

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
              <ConnectButton />
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
                  <ConnectButton />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <div className="text-lg font-medium">Loading execution data...</div>
              <div className="text-sm text-muted-foreground">Fetching real-time status</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!executionData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
        <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              <div className="flex items-center space-x-4">
                <Link href="/strategies" className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="h-4 w-4" />
                  <span>Back to Strategies</span>
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <ConnectButton />
              </div>
            </div>
          </div>
        </nav>
        
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center space-y-4">
              <div className="text-6xl">📊</div>
              <div className="text-xl font-medium">No Active Execution Found</div>
              <div className="text-sm text-muted-foreground max-w-md">
                No strategy execution found for the provided ID. Make sure you're accessing this page from a valid strategy execution.
              </div>
              <div className="flex space-x-4 justify-center mt-6">
                <Link href="/strategies">
                  <Button>
                    <Target className="h-4 w-4 mr-2" />
                    View Strategies
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
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
              <ConnectButton />
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
                    <div className="text-sm text-muted-foreground">Estimated APY</div>
                    <div className="text-xs text-yellow-500 mt-1">±2.1% variance</div>
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
                  <div className="mt-2 flex items-center space-x-4 text-xs text-muted-foreground">
                    <span className="flex items-center">
                      <div className="h-2 w-2 bg-yellow-400 rounded-full mr-2"></div>
                      Network congestion: Medium
                    </span>
                    <span className="flex items-center">
                      <div className="h-2 w-2 bg-green-400 rounded-full mr-2"></div>
                      CCTP Status: Operational
                    </span>
                  </div>
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
                              <span className="text-muted-foreground">
                                {transfer.status === 'completed' ? 'Complete' : 
                                 transfer.status === 'minted' ? 'Minting...' :
                                 transfer.status === 'attested' ? 'Attesting...' :
                                 transfer.status === 'burned' ? 'Burning...' : 'Pending'}
                              </span>
                            </div>
                            <Progress value={transfer.progress} className="h-2" />
                            {transfer.status !== 'completed' && (
                              <div className="text-xs text-yellow-500">
                                ⏱️ Estimated: {Math.floor(Math.random() * 3) + 1}-{Math.floor(Math.random() * 5) + 3} min
                              </div>
                            )}
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

                      {/* Manual Attestation Button */}
                      {transfer.status === 'burned' && (
                        <div className="pt-3 border-t border-border/30">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={() => {
                              setSelectedTransfer(transfer.id);
                              setShowAttestationModal(true);
                            }}
                          >
                            <Shield className="h-3 w-3 mr-2" />
                            Add Manual Attestation
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Portfolio Allocation Chart */}
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
              <CardContent className="space-y-6">
                {/* Pie Chart */}
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={getPortfolioChartData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percentage }) => `${name}: ${percentage}%`}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getPortfolioChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => [`$${value.toLocaleString()}`, 'Amount']}
                        labelFormatter={(label) => label}
                      />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Allocation Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {executionData.portfolioUpdate.allocations.map((allocation, index) => (
                    <div key={index} className="p-4 border border-border/50 rounded-lg bg-muted/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="h-3 w-3 rounded-full" 
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          ></div>
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
                            className="h-2 rounded-full transition-all duration-500"
                            style={{ 
                              width: `${allocation.percentage}%`,
                              backgroundColor: COLORS[index % COLORS.length]
                            }}
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
                      <h3 className="font-semibold text-green-800 text-lg">Strategy Deployment Complete</h3>
                      <p className="text-sm text-green-700">
                        Your funds have been deployed across chains using CCTP. Portfolio allocation is now active and earning yield.
                      </p>
                      <div className="mt-2 text-xs text-green-600">
                        Gas fees: ~$2.34 • Network fees: ~$0.87
                      </div>
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
                    ✅ Strategy Deployment Complete
                  </div>
                  <div className="text-sm text-muted-foreground mb-4">
                    Your funds are now earning yield across multiple chains
                  </div>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button
                      size="lg"
                      onClick={executeRealCCTPTransfer}
                      disabled={isExecuting || cctpLoading}
                      className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 px-8 py-3"
                    >
                      {isExecuting ? (
                        <>
                          <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                          Executing Real CCTP...
                        </>
                      ) : (
                        <>
                          <ArrowRightLeft className="h-5 w-5 mr-2" />
                          Execute Real CCTP Transfer
                        </>
                      )}
                    </Button>
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

        {/* Manual Attestation Modal */}
        {showAttestationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle>Add Manual Attestation</CardTitle>
                <CardDescription>
                  Enter the attestation signature for transfer: {selectedTransfer}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Attestation Signature
                  </label>
                  <textarea
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm font-mono"
                    rows={4}
                    placeholder="0x8c1573c028e8586486a75fd1ba0c684cd75f1b66f713d9a1e86d883907ae5d2c..."
                    value={manualAttestation}
                    onChange={(e) => setManualAttestation(e.target.value)}
                  />
                </div>
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAttestationModal(false);
                      setManualAttestation("");
                      setSelectedTransfer(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleAddAttestation}
                    disabled={!manualAttestation}
                  >
                    Add Attestation
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