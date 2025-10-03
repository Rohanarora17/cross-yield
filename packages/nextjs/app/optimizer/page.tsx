"use client";

import { useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import {
  ArrowTrendingUpIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
  PlayIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StopIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { Address, Balance, EtherInput } from "~~/components/scaffold-eth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "~~/components/ui/alert";

const Optimizer = () => {
  const { address: connectedAddress } = useAccount();
  const [amount, setAmount] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("moderate");
  const [selectedChains, setSelectedChains] = useState<string[]>(["ethereum", "base", "arbitrum", "aptos"]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const riskLevels = [
    { value: "conservative", label: "Conservative", description: "Low risk, stable yields", apy: "4-8%" },
    { value: "moderate", label: "Moderate", description: "Balanced risk/reward", apy: "8-15%" },
    { value: "aggressive", label: "Aggressive", description: "Higher risk, higher yields", apy: "15-25%" },
  ];

  const chains = [
    { id: "ethereum", name: "Ethereum", apy: "4-8%", gas: "High" },
    { id: "base", name: "Base", apy: "8-15%", gas: "Low" },
    { id: "arbitrum", name: "Arbitrum", apy: "10-18%", gas: "Medium" },
    { id: "aptos", name: "Aptos", apy: "8-15%", gas: "Low" },
    { id: "polygon", name: "Polygon", apy: "6-12%", gas: "Low" },
    { id: "avalanche", name: "Avalanche", apy: "8-16%", gas: "Medium" },
  ];

  const protocols = [
    { name: "Aave V3", chains: ["ethereum", "base", "arbitrum"], apy: "4-8%", risk: 15 },
    { name: "Thala Finance", chains: ["aptos"], apy: "8-12%", risk: 20 },
    { name: "Moonwell", chains: ["base", "arbitrum"], apy: "8-15%", risk: 25 },
    { name: "Liquidswap", chains: ["aptos"], apy: "6-12%", risk: 25 },
    { name: "Radiant Capital", chains: ["arbitrum"], apy: "10-18%", risk: 30 },
    { name: "Aries Markets", chains: ["aptos"], apy: "6-10%", risk: 18 },
    { name: "Curve Finance", chains: ["ethereum", "arbitrum"], apy: "5-12%", risk: 20 },
    { name: "Beefy Finance", chains: ["base", "arbitrum", "polygon"], apy: "12-25%", risk: 40 },
    { name: "Yearn Finance", chains: ["ethereum"], apy: "6-15%", risk: 25 },
    { name: "Compound V3", chains: ["ethereum", "base"], apy: "4-10%", risk: 20 },
  ];

  const handleChainToggle = (chainId: string) => {
    setSelectedChains(prev => (prev.includes(chainId) ? prev.filter(id => id !== chainId) : [...prev, chainId]));
  };

  const runOptimization = async () => {
    if (!connectedAddress || !amount) return;
    
    setIsOptimizing(true);

    try {
      console.log('🚀 Starting AI optimization...');
      console.log('📊 Parameters:', {
        userAddress: connectedAddress,
        amount: parseFloat(amount),
        riskTolerance,
        selectedChains,
        protocols: protocols.filter(p => 
          selectedChains.some(chain => p.chains.includes(chain))
        ).map(p => p.name)
      });

      // Call backend optimization endpoint
      const response = await fetch('/api/optimization-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: connectedAddress,
          amount: parseFloat(amount),
          strategy: {
            riskTolerance,
            selectedChains,
            protocols: protocols.filter(p => 
              selectedChains.some(chain => p.chains.includes(chain))
            ).map(p => p.name)
          },
          smartWalletAddress: connectedAddress // Using user address as smart wallet for now
        }),
      });

      console.log('📡 Backend response status:', response.status);

      if (!response.ok) {
        throw new Error(`Optimization request failed: ${response.status}`);
      }

      const result = await response.json();
      console.log('📋 Backend optimization result:', result);

      if (result.status === 'success') {
        setOptimizationResult(result);
        console.log('✅ Optimization successful!');
      } else {
        throw new Error(result.message || 'Optimization failed');
      }

    } catch (error) {
      console.error('❌ Optimization error:', error);
      
      // Enhanced fallback with realistic data based on user inputs
      const amountNum = parseFloat(amount);
      const selectedProtocols = protocols.filter(p => 
        selectedChains.some(chain => p.chains.includes(chain))
      );
      
      // Calculate realistic allocation based on risk tolerance
      const allocationPercentages = riskTolerance === 'conservative' ? [0.4, 0.3, 0.2, 0.1] :
                                   riskTolerance === 'moderate' ? [0.3, 0.3, 0.25, 0.15] :
                                   [0.2, 0.25, 0.3, 0.25]; // aggressive
      
      const mockResult = {
        expectedAPY: riskTolerance === 'conservative' ? 8.5 : 
                    riskTolerance === 'moderate' ? 12.3 : 18.7,
        riskScore: riskTolerance === 'conservative' ? 15 : 
                  riskTolerance === 'moderate' ? 25 : 35,
        gasEstimate: selectedChains.length > 1 ? 0.045 : 0.023,
        strategy: selectedProtocols.slice(0, 4).map((protocol, index) => ({
          protocol: protocol.name,
          chain: protocol.chains[0].charAt(0).toUpperCase() + protocol.chains[0].slice(1),
          amount: Math.round(amountNum * allocationPercentages[index]),
          apy: parseFloat(protocol.apy.split('-')[0]) + Math.random() * 2
        })),
        crossChainTransfers: selectedChains.length > 1 ? selectedChains.length - 1 : 0,
        estimatedTime: selectedChains.length > 1 ? "5-8 minutes" : "2-4 minutes",
        isBackendConnected: false,
        fallbackReason: error instanceof Error ? error.message : 'Unknown error'
      };

      console.log('🔄 Using fallback optimization result:', mockResult);
      setOptimizationResult(mockResult);
    } finally {
      setIsOptimizing(false);
    }
  };

  if (!connectedAddress) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Connect Your Wallet</CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Please connect your wallet to use the AI Yield Optimizer
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button className="w-full">Go to Home</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <SparklesIcon className="h-8 w-8 text-blue-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">AI Yield Optimizer</h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-6 max-w-3xl mx-auto">
            Our AI analyzes hundreds of DeFi protocols across multiple chains to find the optimal USDC yield strategy for you
          </p>
          
          {/* What it does explanation */}
          <div className="mb-6">
            <Button 
              variant="outline" 
              onClick={() => setShowExplanation(!showExplanation)}
              className="mb-4"
            >
              <InformationCircleIcon className="h-4 w-4 mr-2" />
              {showExplanation ? 'Hide' : 'Show'} How It Works
            </Button>
            
            {showExplanation && (
              <Alert className="max-w-4xl mx-auto mb-6">
                <InformationCircleIcon className="h-4 w-4" />
                <AlertTitle>How the AI Yield Optimizer Works</AlertTitle>
                <AlertDescription className="text-left">
                  <div className="space-y-3">
                    <p><strong>1. Analysis:</strong> Our AI scans 50+ DeFi protocols across Ethereum, Base, Arbitrum, and Aptos</p>
                    <p><strong>2. Optimization:</strong> It finds the best combination of protocols based on your risk tolerance and amount</p>
                    <p><strong>3. Execution:</strong> We automatically deploy your funds across multiple chains for maximum yield</p>
                    <p><strong>4. Monitoring:</strong> Continuous monitoring and rebalancing to maintain optimal returns</p>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="flex items-center gap-2">
              <Address address={connectedAddress} />
              <Balance address={connectedAddress} />
            </div>
            {/* Backend Connection Status */}
            <div className="flex items-center gap-2 px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              AI Backend Ready
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Amount Input */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CurrencyDollarIcon className="h-5 w-5 text-green-600" />
                  Investment Amount
                </CardTitle>
                <CardDescription>
                  Enter the amount of USDC you want to optimize for yield
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EtherInput value={amount} onChange={setAmount} placeholder="Enter USDC amount" />
                <div className="text-sm text-gray-500 mt-2">
                  Minimum: 1,000 USDC • Maximum: 1,000,000 USDC
                </div>
              </CardContent>
            </Card>

            {/* Risk Tolerance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheckIcon className="h-5 w-5 text-blue-600" />
                  Risk Tolerance
                </CardTitle>
                <CardDescription>
                  Choose your risk preference to optimize yield accordingly
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {riskLevels.map(level => (
                    <label key={level.value} className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        type="radio"
                        name="risk"
                        value={level.value}
                        checked={riskTolerance === level.value}
                        onChange={e => setRiskTolerance(e.target.value)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{level.label}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {level.description}
                        </div>
                        <Badge variant="outline" className="mt-1">
                          Expected APY: {level.apy}
                        </Badge>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Chain Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GlobeAltIcon className="h-5 w-5 text-purple-600" />
                  Supported Chains
                </CardTitle>
                <CardDescription>
                  Select which blockchains to include in your yield optimization
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-3">
                  {chains.map(chain => (
                    <label key={chain.id} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">
                      <input
                        type="checkbox"
                        checked={selectedChains.includes(chain.id)}
                        onChange={() => handleChainToggle(chain.id)}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 dark:text-white">{chain.name}</div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            APY: {chain.apy}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Gas: {chain.gas}
                          </Badge>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Optimize Button */}
            <Card className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-white">
                  <SparklesIcon className="h-6 w-6" />
                  AI Optimization
                </CardTitle>
                <CardDescription className="text-blue-100">
                  Let our AI find the best yield strategy for you
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button
                  onClick={runOptimization}
                  disabled={!amount || isOptimizing}
                  className="w-full bg-white text-blue-600 hover:bg-gray-100 text-lg py-3"
                  size="lg"
                >
                  {isOptimizing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Optimizing...
                    </>
                  ) : (
                    <>
                      <PlayIcon className="h-5 w-5 mr-2" />
                      Run AI Optimization
                    </>
                  )}
                </Button>
                <div className="text-blue-100 text-sm mt-3">
                  Our AI will analyze {selectedChains.length} chains and {protocols.filter(p => 
                    selectedChains.some(chain => p.chains.includes(chain))
                  ).length} protocols
                </div>
                {/* Show available protocols for selected chains */}
                <div className="mt-4 text-blue-100 text-xs">
                  <div className="font-semibold mb-2">Available Protocols:</div>
                  <div className="flex flex-wrap gap-1">
                    {protocols.filter(p => 
                      selectedChains.some(chain => p.chains.includes(chain))
                    ).slice(0, 6).map((protocol, index) => (
                      <span key={index} className="bg-blue-500/20 px-2 py-1 rounded text-xs">
                        {protocol.name}
                      </span>
                    ))}
                    {protocols.filter(p => 
                      selectedChains.some(chain => p.chains.includes(chain))
                    ).length > 6 && (
                      <span className="bg-blue-500/20 px-2 py-1 rounded text-xs">
                        +{protocols.filter(p => 
                          selectedChains.some(chain => p.chains.includes(chain))
                        ).length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>

          {/* Results Panel */}
          <div className="space-y-6">
            {optimizationResult ? (
              <>
                {/* Optimization Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircleIcon className="h-5 w-5" />
                      Optimization Complete
                    </CardTitle>
                    <CardDescription>
                      Your optimal yield strategy has been calculated
                      {optimizationResult.isBackendConnected === false && (
                        <div className="mt-2">
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                            Using Fallback Data
                          </Badge>
                          <div className="text-xs text-orange-600 mt-1">
                            Backend unavailable: {optimizationResult.fallbackReason}
                          </div>
                        </div>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-6 mb-6">
                      <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                        <div className="text-3xl font-bold text-green-600">{optimizationResult.expectedAPY}%</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Expected APY</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                        <div className="text-3xl font-bold text-blue-600">{optimizationResult.riskScore}/100</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Risk Score</div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">Gas Estimate:</span>
                        <Badge variant="outline">{optimizationResult.gasEstimate} ETH</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">Cross-Chain Transfers:</span>
                        <Badge variant="outline">{optimizationResult.crossChainTransfers}</Badge>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
                        <span className="font-medium">Estimated Time:</span>
                        <Badge variant="outline">{optimizationResult.estimatedTime}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Strategy */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ArrowTrendingUpIcon className="h-5 w-5 text-purple-600" />
                      Recommended Strategy
                    </CardTitle>
                    <CardDescription>
                      Your optimized allocation across protocols and chains
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {optimizationResult.strategy.map((position: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">{position.protocol}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{position.chain}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">${position.amount.toLocaleString()}</div>
                            <Badge variant="secondary" className="text-green-600">{position.apy}% APY</Badge>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex gap-3">
                      <Button className="flex-1">
                        <PlayIcon className="h-4 w-4 mr-2" />
                        Execute Strategy
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <StopIcon className="h-4 w-4 mr-2" />
                        Save for Later
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <CpuChipIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Ready to Optimize</h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Configure your parameters and click "Run AI Optimization" to get started
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Optimizer;
