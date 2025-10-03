"use client";

import { useState } from "react";
import { ChartBarIcon, FunnelIcon } from "@heroicons/react/24/outline";

const Protocols = () => {
  const [selectedChain, setSelectedChain] = useState("all");
  const [selectedRisk, setSelectedRisk] = useState("all");
  const [sortBy, setSortBy] = useState("apy");

  const chains = [
    { id: "all", name: "All Chains", count: 10 },
    { id: "ethereum", name: "Ethereum", count: 3 },
    { id: "base", name: "Base", count: 2 },
    { id: "arbitrum", name: "Arbitrum", count: 4 },
    { id: "aptos", name: "Aptos", count: 3 },
    { id: "polygon", name: "Polygon", count: 1 },
    { id: "avalanche", name: "Avalanche", count: 1 },
  ];

  const protocols = [
    {
      name: "Aave V3",
      description: "Decentralized lending protocol with multiple markets",
      chains: ["Ethereum", "Base", "Arbitrum"],
      apy: 6.2,
      tvl: 1250000000,
      riskScore: 15,
      category: "Lending",
      logo: "🦄",
      features: ["Liquidation Protection", "Variable Rates", "Collateral Swapping"],
    },
    {
      name: "Thala Finance",
      description: "Leading lending protocol on Aptos with real USDC markets",
      chains: ["Aptos"],
      apy: 11.2,
      tvl: 32000000,
      riskScore: 20,
      category: "Lending",
      logo: "🏛️",
      features: ["Real USDC Integration", "High APY", "Native Aptos"],
    },
    {
      name: "Moonwell",
      description: "Community-driven lending protocol on Base and Arbitrum",
      chains: ["Base", "Arbitrum"],
      apy: 12.8,
      tvl: 45000000,
      riskScore: 25,
      category: "Lending",
      logo: "🌙",
      features: ["High APY", "Community Governance", "Cross-Chain"],
    },
    {
      name: "Liquidswap",
      description: "Leading DEX on Aptos with AMM and farming",
      chains: ["Aptos"],
      apy: 9.5,
      tvl: 45000000,
      riskScore: 25,
      category: "DEX",
      logo: "💧",
      features: ["AMM Trading", "Farming Rewards", "USDC-APT Pools"],
    },
    {
      name: "Radiant Capital",
      description: "Omnichain money market protocol",
      chains: ["Arbitrum"],
      apy: 16.5,
      tvl: 280000000,
      riskScore: 30,
      category: "Lending",
      logo: "⚡",
      features: ["Omnichain", "High Yield", "Native Assets"],
    },
    {
      name: "Aries Markets",
      description: "Decentralized lending protocol on Aptos with competitive rates",
      chains: ["Aptos"],
      apy: 8.7,
      tvl: 28000000,
      riskScore: 18,
      category: "Lending",
      logo: "♈",
      features: ["Competitive Rates", "Borrowing", "Collateral Management"],
    },
    {
      name: "Curve Finance",
      description: "Automated market maker for stablecoins",
      chains: ["Ethereum", "Arbitrum"],
      apy: 8.7,
      tvl: 3200000000,
      riskScore: 20,
      category: "DEX",
      logo: "📈",
      features: ["Low Slippage", "Stablecoin Focus", "Governance Token"],
    },
    {
      name: "Beefy Finance",
      description: "Multi-chain yield optimizer and auto-compounder",
      chains: ["Base", "Arbitrum", "Polygon"],
      apy: 18.2,
      tvl: 180000000,
      riskScore: 40,
      category: "Yield Farming",
      logo: "🥩",
      features: ["Auto-Compound", "Multi-Chain", "High APY"],
    },
    {
      name: "Yearn Finance",
      description: "Automated yield farming strategies",
      chains: ["Ethereum"],
      apy: 9.4,
      tvl: 450000000,
      riskScore: 25,
      category: "Vaults",
      logo: "🏦",
      features: ["Strategy Automation", "Risk Management", "Governance"],
    },
    {
      name: "Compound V3",
      description: "Next-generation lending protocol",
      chains: ["Ethereum", "Base"],
      apy: 7.1,
      tvl: 890000000,
      riskScore: 20,
      category: "Lending",
      logo: "🔗",
      features: ["Isolated Markets", "Capital Efficiency", "Governance"],
    },
  ];

  const filteredProtocols = protocols
    .filter(protocol => {
      const chainMatch =
        selectedChain === "all" || protocol.chains.some(chain => chain.toLowerCase() === selectedChain);
      const riskMatch =
        selectedRisk === "all" ||
        (selectedRisk === "low" && protocol.riskScore <= 20) ||
        (selectedRisk === "medium" && protocol.riskScore > 20 && protocol.riskScore <= 40) ||
        (selectedRisk === "high" && protocol.riskScore > 40);

      return chainMatch && riskMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "apy":
          return b.apy - a.apy;
        case "tvl":
          return b.tvl - a.tvl;
        case "risk":
          return a.riskScore - b.riskScore;
        default:
          return 0;
      }
    });

  const getRiskColor = (riskScore: number) => {
    if (riskScore <= 20) return "badge-success";
    if (riskScore <= 40) return "badge-warning";
    return "badge-error";
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore <= 20) return "Low Risk";
    if (riskScore <= 40) return "Medium Risk";
    return "High Risk";
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">DeFi Protocol Explorer</h1>
        <p className="text-base-content/70 mb-4">
          Discover and compare yield opportunities across EVM and Aptos chains and protocols
        </p>
      </div>

      {/* Filters */}
      <div className="card bg-base-200 shadow-xl mb-8">
        <div className="card-body">
          <h3 className="card-title mb-4">
            <FunnelIcon className="h-5 w-5" />
            Filters & Sorting
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chain Filter */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Chain</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedChain}
                onChange={e => setSelectedChain(e.target.value)}
              >
                {chains.map(chain => (
                  <option key={chain.id} value={chain.id}>
                    {chain.name} ({chain.count})
                  </option>
                ))}
              </select>
            </div>

            {/* Risk Filter */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Risk Level</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={selectedRisk}
                onChange={e => setSelectedRisk(e.target.value)}
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk (≤20)</option>
                <option value="medium">Medium Risk (21-40)</option>
                <option value="high">High Risk (&gt;40)</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="label">
                <span className="label-text font-semibold">Sort By</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="apy">APY (High to Low)</option>
                <option value="tvl">TVL (High to Low)</option>
                <option value="risk">Risk (Low to High)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Protocol Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProtocols.map((protocol, index) => (
          <div key={index} className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
            <div className="card-body">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{protocol.logo}</div>
                <div>
                  <h3 className="card-title text-lg">{protocol.name}</h3>
                  <div className="badge badge-outline badge-sm">{protocol.category}</div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-base-content/70 mb-4">{protocol.description}</p>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-success">{protocol.apy}%</div>
                  <div className="text-xs text-base-content/70">Current APY</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold">${(protocol.tvl / 1000000).toFixed(0)}M</div>
                  <div className="text-xs text-base-content/70">Total TVL</div>
                </div>
              </div>

              {/* Risk Score */}
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium">Risk Score:</span>
                <div className={`badge ${getRiskColor(protocol.riskScore)}`}>{getRiskLabel(protocol.riskScore)}</div>
              </div>

              {/* Supported Chains */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Supported Chains:</div>
                <div className="flex flex-wrap gap-1">
                  {protocol.chains.map((chain, chainIndex) => (
                    <span key={chainIndex} className="badge badge-sm badge-outline">
                      {chain}
                    </span>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Key Features:</div>
                <div className="space-y-1">
                  {protocol.features.slice(0, 3).map((feature, featureIndex) => (
                    <div key={featureIndex} className="text-xs text-base-content/70">
                      • {feature}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="card-actions justify-end">
                <button className="btn btn-primary btn-sm">
                  <ChartBarIcon className="h-4 w-4 mr-1" />
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary">{filteredProtocols.length}</div>
            <div className="text-sm text-base-content/70">Protocols Found</div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-success">
              {filteredProtocols.length > 0 ? Math.max(...filteredProtocols.map(p => p.apy)).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-base-content/70">Highest APY</div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary">
              {filteredProtocols.length > 0 ? Math.min(...filteredProtocols.map(p => p.riskScore)) : 0}
            </div>
            <div className="text-sm text-base-content/70">Lowest Risk</div>
          </div>
        </div>

        <div className="card bg-base-200 shadow-xl">
          <div className="card-body text-center">
            <div className="text-3xl font-bold text-primary">
              ${filteredProtocols.reduce((sum, p) => sum + p.tvl, 0) / 1000000000}M
            </div>
            <div className="text-sm text-base-content/70">Total TVL</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Protocols;
