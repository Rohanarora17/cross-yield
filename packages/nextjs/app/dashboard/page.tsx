"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
  CpuChipIcon,
  CurrencyDollarIcon,
  GlobeAltIcon,
} from "@heroicons/react/24/outline";
import { Address, Balance } from "~~/components/scaffold-eth";

const Dashboard = () => {
  const { address: connectedAddress } = useAccount();

  // Mock data - in real app this would come from smart contracts
  const portfolioData = {
    totalValue: 125000,
    totalAPY: 18.7,
    dailyYield: 64.38,
    weeklyYield: 450.68,
    monthlyYield: 1931.25,
    lastOptimization: "2 hours ago",
    optimizationCount: 47,
    gasSpent: 0.0234,
  };

  const positions = [
    {
      protocol: "Moonwell",
      chain: "Base",
      amount: 50000,
      apy: 12.5,
      value: 50000,
      change: 2.3,
      riskScore: 25,
    },
    {
      protocol: "Radiant Capital",
      chain: "Arbitrum",
      amount: 35000,
      apy: 15.8,
      value: 35000,
      change: -1.2,
      riskScore: 30,
    },
    {
      protocol: "Aave V3",
      chain: "Ethereum",
      amount: 40000,
      apy: 8.2,
      value: 40000,
      change: 0.8,
      riskScore: 15,
    },
  ];

  const recentOptimizations = [
    {
      timestamp: "2 hours ago",
      action: "Rebalanced to Moonwell",
      expectedAPY: 12.5,
      actualAPY: 12.7,
      gasCost: 0.0045,
      success: true,
    },
    {
      timestamp: "1 day ago",
      action: "Cross-chain to Arbitrum",
      expectedAPY: 15.8,
      actualAPY: 15.6,
      gasCost: 0.0089,
      success: true,
    },
    {
      timestamp: "3 days ago",
      action: "Added Aave position",
      expectedAPY: 8.2,
      actualAPY: 8.1,
      gasCost: 0.0023,
      success: true,
    },
  ];

  if (!connectedAddress) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Connect Your Wallet</h1>
          <p className="text-base-content/70 mb-8">Please connect your wallet to view your dashboard</p>
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
        <h1 className="text-3xl font-bold mb-2">Portfolio Dashboard</h1>
        <div className="flex items-center gap-4">
          <Address address={connectedAddress} />
          <Balance address={connectedAddress} />
        </div>
      </div>

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-base-content/70">Total Portfolio Value</div>
                <div className="text-2xl font-bold">${portfolioData.totalValue.toLocaleString()}</div>
              </div>
              <CurrencyDollarIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-base-content/70">Current APY</div>
                <div className="text-2xl font-bold text-success">{portfolioData.totalAPY}%</div>
              </div>
              <ArrowTrendingUpIcon className="h-8 w-8 text-success" />
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-base-content/70">Daily Yield</div>
                <div className="text-2xl font-bold">${portfolioData.dailyYield}</div>
              </div>
              <ChartBarIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-base-content/70">Optimizations</div>
                <div className="text-2xl font-bold">{portfolioData.optimizationCount}</div>
              </div>
              <CpuChipIcon className="h-8 w-8 text-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Current Positions */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Current Positions</h2>
            <div className="space-y-4">
              {positions.map((position, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{position.protocol}</span>
                      <span className="badge badge-sm badge-outline">{position.chain}</span>
                    </div>
                    <div className="text-sm text-base-content/70">
                      ${position.amount.toLocaleString()} • {position.apy}% APY
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 ${position.change >= 0 ? "text-success" : "text-error"}`}>
                      {position.change >= 0 ? (
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                      ) : (
                        <ArrowTrendingDownIcon className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">{position.change}%</span>
                    </div>
                    <div className="text-xs text-base-content/70">Risk: {position.riskScore}/100</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Optimizations */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-4">Recent Optimizations</h2>
            <div className="space-y-4">
              {recentOptimizations.map((optimization, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-base-100 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold mb-1">{optimization.action}</div>
                    <div className="text-sm text-base-content/70">
                      {optimization.timestamp} • Gas: {optimization.gasCost} ETH
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <div className="text-sm">
                        <div>Expected: {optimization.expectedAPY}%</div>
                        <div>Actual: {optimization.actualAPY}%</div>
                      </div>
                      <div className={`badge ${optimization.success ? "badge-success" : "badge-error"}`}>
                        {optimization.success ? "Success" : "Failed"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <Link href="/optimizer" className="btn btn-primary btn-lg">
          <CpuChipIcon className="h-5 w-5 mr-2" />
          Run AI Optimization
        </Link>
        <Link href="/protocols" className="btn btn-outline btn-lg">
          <GlobeAltIcon className="h-5 w-5 mr-2" />
          Explore Protocols
        </Link>
      </div>
    </div>
  );
};

export default Dashboard;
