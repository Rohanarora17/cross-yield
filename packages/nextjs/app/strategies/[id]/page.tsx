"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { Progress } from "~~/components/ui/progress";
import { ArrowLeft, DollarSign, Zap, Target, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useAgentLinkage } from "~~/hooks/useAgentLinkage";
import { useSmartWallet } from "~~/hooks/useSmartWallet";
import { notification } from "~~/utils/scaffold-eth";

// Strategy interface (same as in strategies page)
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
  },
];

export default function StrategyDeployPage() {
  const params = useParams();
  const router = useRouter();
  const strategyId = params.id as string;
  
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [deployAmount, setDeployAmount] = useState("");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deploymentStep, setDeploymentStep] = useState(0);

  // Get user data
  const { address: connectedAddress } = useAccount();
  const { getAgentAddress, hasLinkage } = useAgentLinkage();
  const { smartWalletAddress, smartWalletData, usdcBalance } = useSmartWallet();

  // Get agent address from linkage system
  const linkedAgentAddress = connectedAddress ? getAgentAddress(connectedAddress) : null;
  const hasAgentLinkage = connectedAddress ? hasLinkage(connectedAddress) : false;
  const agentAddress = linkedAgentAddress || smartWalletAddress;
  const agentBalance = smartWalletData ? parseFloat(smartWalletData.balance) : 0.0;

  // Find strategy by ID
  useEffect(() => {
    const foundStrategy = mockStrategies.find(s => s.id === strategyId);
    if (foundStrategy) {
      setStrategy(foundStrategy);
      // Set default deployment amount to minimum
      setDeployAmount(foundStrategy.minDeposit.toString());
    } else {
      // Strategy not found, redirect back
      router.push("/strategies");
    }
  }, [strategyId, router]);

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

  const handleDeploy = async () => {
    if (!strategy || !deployAmount) return;

    const amount = parseFloat(deployAmount);
    if (amount < strategy.minDeposit) {
      notification.error(`Minimum deposit is $${strategy.minDeposit}`);
      return;
    }
    if (amount > strategy.maxDeposit) {
      notification.error(`Maximum deposit is $${strategy.maxDeposit}`);
      return;
    }
    if (amount > agentBalance) {
      notification.error(`Insufficient balance. Available: $${agentBalance.toFixed(2)}`);
      return;
    }

    setIsDeploying(true);
    setDeploymentStep(1);

    try {
      // Simulate deployment process
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDeploymentStep(2);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDeploymentStep(3);
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      setDeploymentStep(4);

      notification.success(`Successfully deployed ${strategy.name} with $${amount} USDC!`);
      
      // Redirect back to strategies page
      setTimeout(() => {
        router.push("/strategies");
      }, 2000);

    } catch (error) {
      notification.error("Deployment failed. Please try again.");
      setDeploymentStep(0);
    } finally {
      setIsDeploying(false);
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
                Strategy Deployment
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to deploy strategies
              </p>
            </div>
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground" />
                  <h3 className="text-lg font-semibold">Connect Your Wallet</h3>
                  <p className="text-sm text-muted-foreground">
                    You need to connect your wallet to deploy strategies
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

  if (!strategy) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading strategy...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/strategies">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Strategies
                </Button>
              </Link>
              <div className="flex items-center space-x-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <DollarSign className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">CrossYield</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Strategy Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Deploy {strategy.name}
            </h1>
            <p className="text-muted-foreground text-lg">{strategy.description}</p>
          </div>

          {/* Agent Status */}
          {hasAgentLinkage && agentAddress ? (
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center space-x-3">
                  <div className="h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">✓</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800">Agent Wallet Ready</h3>
                    <p className="text-sm text-green-700">
                      Your agent wallet is linked and ready to deploy this strategy
                    </p>
                    <div className="mt-1 text-xs text-green-600">
                      <strong>Agent Address:</strong> {agentAddress.slice(0, 6)}...{agentAddress.slice(-4)}
                      <span className="ml-4"><strong>Balance:</strong> {agentBalance.toFixed(2)} USDC</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-yellow-500/50 bg-yellow-500/5">
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

          <div className="grid md:grid-cols-2 gap-8">
            {/* Strategy Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5" />
                  <span>Strategy Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected APY</span>
                  <span className="text-2xl font-bold text-green-400">{strategy.apy}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Risk Level</span>
                  <Badge className={`text-xs ${getRiskColor(strategy.risk)}`}>
                    {strategy.risk}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Protocol</span>
                  <span className="font-medium">{strategy.protocol}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Chain</span>
                  <Badge className={`text-xs ${getChainColor(strategy.chain)}`}>
                    {strategy.chain}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Fees</span>
                  <span className="font-medium">{strategy.fees}%</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value Locked</span>
                  <span className="font-medium">${(strategy.tvl / 1000000).toFixed(1)}M</span>
                </div>
                
                <div className="pt-4 border-t">
                  <div className="text-sm font-medium mb-2">Features</div>
                  <div className="flex flex-wrap gap-1">
                    {strategy.features.map((feature, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deployment Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Deployment Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deploy-amount">Deployment Amount (USDC)</Label>
                  <Input
                    id="deploy-amount"
                    type="number"
                    placeholder="Enter amount"
                    value={deployAmount}
                    onChange={(e) => setDeployAmount(e.target.value)}
                    min={strategy.minDeposit}
                    max={strategy.maxDeposit}
                  />
                  <div className="text-xs text-muted-foreground">
                    Min: ${strategy.minDeposit} | Max: ${strategy.maxDeposit}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium">Available Balance</div>
                  <div className="text-lg font-semibold">{agentBalance.toFixed(2)} USDC</div>
                </div>

                {deployAmount && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Expected Returns</div>
                    <div className="text-lg font-semibold text-green-400">
                      +${(parseFloat(deployAmount) * strategy.apy / 100).toFixed(2)} / year
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <Button
                    className="w-full"
                    onClick={handleDeploy}
                    disabled={!hasAgentLinkage || !deployAmount || isDeploying}
                  >
                    {isDeploying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deploying...
                      </>
                    ) : (
                      <>
                        <Target className="mr-2 h-4 w-4" />
                        Deploy Strategy
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Deployment Progress */}
          {isDeploying && (
            <Card>
              <CardHeader>
                <CardTitle>Deployment Progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={(deploymentStep / 4) * 100} className="h-2" />
                <div className="space-y-2">
                  {deploymentStep >= 1 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Validating deployment parameters</span>
                    </div>
                  )}
                  {deploymentStep >= 2 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Executing smart contract transactions</span>
                    </div>
                  )}
                  {deploymentStep >= 3 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Configuring strategy parameters</span>
                    </div>
                  )}
                  {deploymentStep >= 4 && (
                    <div className="flex items-center space-x-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>Strategy deployed successfully!</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}