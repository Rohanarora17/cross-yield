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
} from "@heroicons/react/24/outline";
import { Address, Balance, EtherInput } from "~~/components/scaffold-eth";

const Optimizer = () => {
  const { address: connectedAddress } = useAccount();
  const [amount, setAmount] = useState("");
  const [riskTolerance, setRiskTolerance] = useState("medium");
  const [selectedChains, setSelectedChains] = useState<string[]>(["ethereum", "base", "arbitrum"]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<any>(null);

  const riskLevels = [
    { value: "conservative", label: "Conservative", description: "Low risk, stable yields", apy: "4-8%" },
    { value: "moderate", label: "Moderate", description: "Balanced risk/reward", apy: "8-15%" },
    { value: "aggressive", label: "Aggressive", description: "Higher risk, higher yields", apy: "15-25%" },
  ];

  const chains = [
    { id: "ethereum", name: "Ethereum", apy: "4-8%", gas: "High" },
    { id: "base", name: "Base", apy: "8-15%", gas: "Low" },
    { id: "arbitrum", name: "Arbitrum", apy: "10-18%", gas: "Medium" },
    { id: "polygon", name: "Polygon", apy: "6-12%", gas: "Low" },
    { id: "avalanche", name: "Avalanche", apy: "8-16%", gas: "Medium" },
  ];

  const protocols = [
    { name: "Aave V3", chains: ["ethereum", "base", "arbitrum"], apy: "4-8%", risk: 15 },
    { name: "Moonwell", chains: ["base", "arbitrum"], apy: "8-15%", risk: 25 },
    { name: "Radiant Capital", chains: ["arbitrum"], apy: "10-18%", risk: 30 },
    { name: "Curve Finance", chains: ["ethereum", "arbitrum"], apy: "5-12%", risk: 20 },
    { name: "Beefy Finance", chains: ["base", "arbitrum", "polygon"], apy: "12-25%", risk: 40 },
    { name: "Yearn Finance", chains: ["ethereum"], apy: "6-15%", risk: 25 },
    { name: "Compound V3", chains: ["ethereum", "base"], apy: "4-10%", risk: 20 },
  ];

  const handleChainToggle = (chainId: string) => {
    setSelectedChains(prev => (prev.includes(chainId) ? prev.filter(id => id !== chainId) : [...prev, chainId]));
  };

  const runOptimization = async () => {
    setIsOptimizing(true);

    // Simulate AI optimization process
    setTimeout(() => {
      const mockResult = {
        expectedAPY: 18.7,
        riskScore: 28,
        gasEstimate: 0.0234,
        strategy: [
          { protocol: "Moonwell", chain: "Base", amount: 40000, apy: 12.5 },
          { protocol: "Radiant Capital", chain: "Arbitrum", amount: 35000, apy: 15.8 },
          { protocol: "Aave V3", chain: "Ethereum", amount: 25000, apy: 8.2 },
        ],
        crossChainTransfers: 2,
        estimatedTime: "3-5 minutes",
      };

      setOptimizationResult(mockResult);
      setIsOptimizing(false);
    }, 3000);
  };

  if (!connectedAddress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-base-content/70 mb-8">Please connect your wallet to use the AI optimizer</p>
          <Link href="/" className="btn btn-primary">
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Yield Optimizer</h1>
        <p className="text-base-content/70 mb-4">
          Let our AI agents find the optimal USDC yield strategy across multiple chains and protocols
        </p>
        <div className="flex items-center gap-4">
          <Address address={connectedAddress} />
          <Balance address={connectedAddress} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          {/* Amount Input */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title mb-4">
                <CurrencyDollarIcon className="h-5 w-5" />
                Investment Amount
              </h3>
              <EtherInput value={amount} onChange={setAmount} placeholder="Enter USDC amount" />
              <div className="text-sm text-base-content/70 mt-2">Minimum: 1,000 USDC • Maximum: 1,000,000 USDC</div>
            </div>
          </div>

          {/* Risk Tolerance */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title mb-4">
                <ShieldCheckIcon className="h-5 w-5" />
                Risk Tolerance
              </h3>
              <div className="space-y-3">
                {riskLevels.map(level => (
                  <label key={level.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="risk"
                      value={level.value}
                      checked={riskTolerance === level.value}
                      onChange={e => setRiskTolerance(e.target.value)}
                      className="radio radio-primary mr-3"
                    />
                    <div className="inline-block">
                      <div className="font-semibold">{level.label}</div>
                      <div className="text-sm text-base-content/70">
                        {level.description} • Expected APY: {level.apy}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Chain Selection */}
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h3 className="card-title mb-4">
                <GlobeAltIcon className="h-5 w-5" />
                Supported Chains
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {chains.map(chain => (
                  <label key={chain.id} className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedChains.includes(chain.id)}
                      onChange={() => handleChainToggle(chain.id)}
                      className="checkbox checkbox-primary mr-3"
                    />
                    <div className="inline-block">
                      <div className="font-semibold">{chain.name}</div>
                      <div className="text-sm text-base-content/70">
                        APY: {chain.apy} • Gas: {chain.gas}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Optimize Button */}
          <div className="card bg-gradient-to-r from-primary to-secondary shadow-xl">
            <div className="card-body text-center">
              <h3 className="card-title text-white justify-center mb-4">
                <SparklesIcon className="h-5 w-5" />
                AI Optimization
              </h3>
              <button
                onClick={runOptimization}
                disabled={!amount || isOptimizing}
                className="btn btn-white btn-lg w-full"
              >
                {isOptimizing ? (
                  <>
                    <span className="loading loading-spinner loading-sm mr-2"></span>
                    Optimizing...
                  </>
                ) : (
                  <>
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Run AI Optimization
                  </>
                )}
              </button>
              <div className="text-white/80 text-sm mt-2">
                Our AI agents will analyze {selectedChains.length} chains and {protocols.length} protocols
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="space-y-6">
          {optimizationResult ? (
            <>
              {/* Optimization Results */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title mb-4 text-success">
                    <ArrowTrendingUpIcon className="h-5 w-5" />
                    Optimization Complete
                  </h3>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">{optimizationResult.expectedAPY}%</div>
                      <div className="text-sm text-base-content/70">Expected APY</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{optimizationResult.riskScore}/100</div>
                      <div className="text-sm text-base-content/70">Risk Score</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span>Gas Estimate:</span>
                      <span>{optimizationResult.gasEstimate} ETH</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cross-Chain Transfers:</span>
                      <span>{optimizationResult.crossChainTransfers}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Estimated Time:</span>
                      <span>{optimizationResult.estimatedTime}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommended Strategy */}
              <div className="card bg-base-200 shadow-xl">
                <div className="card-body">
                  <h3 className="card-title mb-4">Recommended Strategy</h3>
                  <div className="space-y-4">
                    {optimizationResult.strategy.map((position: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                        <div>
                          <div className="font-semibold">{position.protocol}</div>
                          <div className="text-sm text-base-content/70">{position.chain}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">${position.amount.toLocaleString()}</div>
                          <div className="text-sm text-success">{position.apy}% APY</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 flex gap-3">
                    <button className="btn btn-primary flex-1">
                      <PlayIcon className="h-4 w-4 mr-2" />
                      Execute Strategy
                    </button>
                    <button className="btn btn-outline flex-1">
                      <StopIcon className="h-4 w-4 mr-2" />
                      Save for Later
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center py-12">
                <CpuChipIcon className="h-16 w-16 text-base-content/30 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Ready to Optimize</h3>
                <p className="text-base-content/70">
                  Configure your parameters and click &quot;Run AI Optimization&quot; to get started
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Optimizer;
