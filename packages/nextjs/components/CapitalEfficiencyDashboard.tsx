"use client";

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import {
  TrendingUp,
  ArrowRight,
  DollarSign,
  Zap,
  BarChart3,
  PieChart,
  Target,
  Award,
  ArrowUpRight
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

interface CapitalEfficiencyDashboardProps {
  investmentAmount?: number;
}

export const CapitalEfficiencyDashboard: React.FC<CapitalEfficiencyDashboardProps> = ({
  investmentAmount = 10000
}) => {
  // Strategy comparison data
  const strategies = [
    {
      name: "Conservative",
      evmAPY: 5.2,
      aptosAPY: 5.2,
      aptosBoost: 0,
      evmMonthly: 43,
      aptosMonthly: 43,
      evmAnnual: 520,
      aptosAnnual: 520,
      gain: 0
    },
    {
      name: "Balanced",
      evmAPY: 6.2,
      aptosAPY: 8.7,
      aptosBoost: 2.5,
      evmMonthly: 51,
      aptosMonthly: 72,
      evmAnnual: 620,
      aptosAnnual: 870,
      gain: 250
    },
    {
      name: "Aggressive",
      evmAPY: 7.8,
      aptosAPY: 11.4,
      aptosBoost: 3.8,
      evmMonthly: 65,
      aptosMonthly: 95,
      evmAnnual: 780,
      aptosAnnual: 1140,
      gain: 360
    }
  ];

  // APY comparison chart data
  const apyChartData = strategies.map(s => ({
    name: s.name,
    "EVM Only": s.evmAPY,
    "With Aptos": s.aptosAPY,
    boost: s.aptosBoost
  }));

  // Annual returns chart data
  const returnsChartData = strategies.map(s => ({
    name: s.name,
    "EVM Only": s.evmAnnual,
    "With Aptos": s.aptosAnnual,
    gain: s.gain
  }));

  // Calculate average efficiency gain
  const avgBoost = strategies.reduce((sum, s) => sum + s.aptosBoost, 0) / strategies.length;
  const totalGain = strategies.reduce((sum, s) => sum + s.gain, 0) / strategies.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2">
          <Target className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Capital Efficiency Dashboard
          </h2>
        </div>
        <p className="text-muted-foreground">
          Cross-chain capital allocation analysis for ${investmentAmount.toLocaleString()} USDC
        </p>
        <Badge className="bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border-primary/20">
          <Award className="h-3 w-3 mr-1" />
          Hyperion Bounty Showcase
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 bg-gradient-to-br from-background to-green-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg APY Boost</p>
                <p className="text-3xl font-bold text-green-400">+{avgBoost.toFixed(1)}%</p>
              </div>
              <div className="h-12 w-12 bg-green-400/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average yield improvement with Aptos
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-background to-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Annual Gain</p>
                <p className="text-3xl font-bold text-blue-400">${totalGain.toFixed(0)}</p>
              </div>
              <div className="h-12 w-12 bg-blue-400/10 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-blue-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Average extra annual return
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-gradient-to-br from-background to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Efficiency Gain</p>
                <p className="text-3xl font-bold text-purple-400">41%</p>
              </div>
              <div className="h-12 w-12 bg-purple-400/10 rounded-full flex items-center justify-center">
                <Zap className="h-6 w-6 text-purple-400" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Capital efficiency improvement
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Strategy Comparison Table */}
      <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            <span>Strategy Comparison (${investmentAmount.toLocaleString()} USDC)</span>
          </CardTitle>
          <CardDescription>Side-by-side comparison of EVM-only vs EVM+Aptos strategies</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Strategy</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">EVM Only APY</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">With Aptos APY</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Monthly Yield</th>
                  <th className="text-right py-3 px-4 font-semibold text-muted-foreground">Annual Gain</th>
                </tr>
              </thead>
              <tbody>
                {strategies.map((strategy) => (
                  <tr key={strategy.name} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{strategy.name}</span>
                        {strategy.aptosBoost > 0 && (
                          <Badge className="text-xs bg-purple-500/10 text-purple-400 border-purple-400/20">
                            <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 0L2 12h8v12h4V12h8L12 0z"/>
                            </svg>
                            Aptos
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-4 px-4 text-muted-foreground">{strategy.evmAPY}%</td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <span className={strategy.aptosBoost > 0 ? "font-bold text-green-400" : "text-muted-foreground"}>
                          {strategy.aptosAPY}%
                        </span>
                        {strategy.aptosBoost > 0 && (
                          <Badge className="text-xs bg-green-500/10 text-green-400 border-green-400/20">
                            +{strategy.aptosBoost}%
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        <span className="text-muted-foreground line-through text-sm">${strategy.evmMonthly}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className={strategy.aptosBoost > 0 ? "font-bold text-green-400" : "text-muted-foreground"}>
                          ${strategy.aptosMonthly}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-4 px-4">
                      <div className="flex items-center justify-end space-x-2">
                        {strategy.gain > 0 ? (
                          <>
                            <span className="font-bold text-green-400">+${strategy.gain}</span>
                            <ArrowUpRight className="h-4 w-4 text-green-400" />
                          </>
                        ) : (
                          <span className="text-muted-foreground">$0</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* APY Comparison Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span>APY Comparison</span>
            </CardTitle>
            <CardDescription>EVM-only vs EVM+Aptos yield rates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={apyChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'APY (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "boost") return [`+${value}%`, 'Aptos Boost'];
                      return [`${value}%`, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="EVM Only" fill="#8884d8" />
                  <Bar dataKey="With Aptos" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Annual Returns Chart */}
        <Card className="border-border/50 bg-gradient-to-br from-background to-muted/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <PieChart className="h-5 w-5 text-primary" />
              <span>Annual Returns (${investmentAmount.toLocaleString()})</span>
            </CardTitle>
            <CardDescription>Total annual yield comparison</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={returnsChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Annual Return ($)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    formatter={(value: any, name: string) => {
                      if (name === "gain") return [`+$${value}`, 'Additional Gain'];
                      return [`$${value}`, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="EVM Only" fill="#ff8042" />
                  <Bar dataKey="With Aptos" fill="#00c49f" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benefits Section */}
      <Card className="border-border/50 bg-gradient-to-br from-background to-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-primary" />
            <span>Why Cross-Chain Capital Efficiency Matters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-400">Higher Yields</h4>
                  <p className="text-sm text-muted-foreground">
                    Aptos protocols consistently offer 2.5-3.8% higher APY than comparable EVM protocols,
                    translating to significant extra returns over time.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Target className="h-4 w-4 text-blue-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-blue-400">Risk Diversification</h4>
                  <p className="text-sm text-muted-foreground">
                    Spreading capital across multiple blockchains reduces systemic risk and protects
                    against chain-specific vulnerabilities.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-purple-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Zap className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-purple-400">AI Optimization</h4>
                  <p className="text-sm text-muted-foreground">
                    Our AI analyzes 15+ protocols across EVM and Aptos to find the optimal allocation
                    based on current market conditions and risk tolerance.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="h-8 w-8 bg-orange-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-orange-400">Maximized Capital Efficiency</h4>
                  <p className="text-sm text-muted-foreground">
                    Achieve up to 41% better capital efficiency by accessing the best opportunities
                    across multiple ecosystems instead of limiting yourself to one chain.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Powered by Section */}
      <div className="text-center text-sm text-muted-foreground">
        <p className="flex items-center justify-center space-x-2">
          <span>Powered by</span>
          <Badge variant="outline" className="text-xs">
            Circle CCTP v1
          </Badge>
          <span>+</span>
          <Badge variant="outline" className="text-xs">
            <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L2 12h8v12h4V12h8L12 0z"/>
            </svg>
            Aptos
          </Badge>
          <span>+</span>
          <Badge variant="outline" className="text-xs">
            Nodit Infrastructure
          </Badge>
        </p>
      </div>
    </div>
  );
};
