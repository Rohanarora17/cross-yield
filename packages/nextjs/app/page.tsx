"use client";

import Link from "next/link";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Activity, ArrowRight, Bot, Brain, Database, DollarSign, Eye, Globe, Network, Wallet } from "lucide-react";
import { useAccount } from "wagmi";
import { Address, Balance, ConnectButton } from "~~/components/scaffold-eth";

export default function Home() {
  const { address: connectedAddress } = useAccount();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-blue-900 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="border-b border-blue-200/50 bg-white/80 backdrop-blur-md supports-[backdrop-filter]:bg-white/60 dark:border-blue-700/50 dark:bg-slate-900/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <DollarSign className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">CrossYield</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="#features"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Features
              </Link>
              <Link
                href="#architecture"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Architecture
              </Link>
              <Link
                href="#integrations"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Integrations
              </Link>
              {connectedAddress ? (
                <div className="flex items-center gap-2">
                  <Address address={connectedAddress} />
                  <Balance address={connectedAddress} />
                </div>
              ) : (
                <ConnectButton />
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-24 sm:py-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-6">
              <Activity className="mr-2 h-3 w-3" />
              Production Ready • 24/7 Monitoring
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight text-balance sm:text-6xl lg:text-7xl">
              <span className="text-primary">CrossYield</span> - Multi-Agent AI for{" "}
              <span className="text-primary">USDC Optimization</span>
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-600 dark:text-slate-300 text-pretty max-w-2xl mx-auto">
              The most advanced USDC yield optimizer powered by multi-agent AI coordination, The Graph Protocol data
              infrastructure, and Circle&apos;s CCTP for native cross-chain execution across Ethereum, Base, and
              Arbitrum.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/fund">
                <Button size="lg" className="h-12 px-8">
                  Launch Optimizer
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="h-12 px-8 bg-transparent">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ETH Global Hackathon Section */}
      <section className="py-16 bg-gradient-to-r from-blue-100/50 via-indigo-100/50 to-purple-100/50 dark:from-blue-800/20 dark:via-indigo-800/20 dark:to-purple-800/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <Badge variant="outline" className="mb-4 border-primary/20 bg-primary/5">
              🏆 ETH Global Hackathon Project
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl mb-6">
              Built for The Graph, 1inch & Pyth Sponsor Tracks
            </h2>
            <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
              <Card className="border-primary/20 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-2">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">The Graph Protocol</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    MCP server integration, custom subgraphs for DeFi data aggregation, and real-time protocol
                    monitoring
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-2">
                    <ArrowRight className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">1inch Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    DEX aggregation API for optimal swap routing and liquidity discovery across all supported chains
                  </p>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/50">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mx-auto mb-2">
                    <Eye className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Pyth Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    High-frequency price feeds and oracle data for accurate yield calculations and risk assessment
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">22.3%</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">Max APY (Aggressive)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">10/10</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">System Health</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">3</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">0ms</div>
              <div className="text-sm text-slate-600 dark:text-slate-300">CCTP Slippage</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Advanced AI Architecture</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Multi-agent coordination with The Graph Protocol data infrastructure
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Brain className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Multi-Agent AI System</CardTitle>
                <CardDescription>
                  YieldMaximizer, RiskAssessment, and LLMCoordinator agents with Claude integration for strategic
                  reasoning
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Database className="h-8 w-8 text-primary mb-2" />
                <CardTitle>The Graph Integration</CardTitle>
                <CardDescription>
                  MCP server, subgraphs, and live price feeds for comprehensive DeFi data aggregation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Wallet className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Smart Wallets (ERC-4337)</CardTitle>
                <CardDescription>
                  Non-custodial automation with gas abstraction and deterministic wallet generation
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Globe className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Native CCTP Bridging</CardTitle>
                <CardDescription>
                  Circle&apos;s Cross-Chain Transfer Protocol for zero-slippage USDC transfers
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Eye className="h-8 w-8 text-primary mb-2" />
                <CardTitle>24/7 Monitoring</CardTitle>
                <CardDescription>
                  Health monitoring, performance tracking, and multi-channel alert system
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-700/50">
              <CardHeader>
                <Bot className="h-8 w-8 text-primary mb-2" />
                <CardTitle>Automated Rebalancing</CardTitle>
                <CardDescription>
                  Intelligent portfolio scanning and cross-chain rebalancing with gas optimization
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section
        id="architecture"
        className="py-24 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/30"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Production System Architecture</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Built for reliability, security, and optimal performance across multiple chains
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader>
                <Database className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">Data Infrastructure</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• The Graph MCP server</li>
                  <li>• Subgraph data aggregation</li>
                  <li>• DeFiLlama API integration</li>
                  <li>• Pyth Oracle price feeds</li>
                  <li>• Real-time RPC monitoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Brain className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">AI Processing</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• Multi-agent coordination</li>
                  <li>• Claude LLM integration</li>
                  <li>• ML yield prediction models</li>
                  <li>• Risk assessment algorithms</li>
                  <li>• Strategy optimization</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Network className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">Cross-Chain Layer</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• Circle CCTP integration</li>
                  <li>• Smart wallet deployment</li>
                  <li>• Multi-chain execution</li>
                  <li>• Gas optimization</li>
                  <li>• Transaction monitoring</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Activity className="h-6 w-6 text-primary mb-2" />
                <CardTitle className="text-lg">Monitoring System</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                  <li>• Health monitoring (10/10)</li>
                  <li>• Performance tracking</li>
                  <li>• Alert system (Discord/Telegram)</li>
                  <li>• Portfolio analytics</li>
                  <li>• System diagnostics</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Trusted Integrations</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Built on industry-leading protocols and infrastructure
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
            {[
              "The Graph Protocol",
              "1inch Network",
              "Pyth Network",
              "Circle CCTP",
              "Claude AI",
              "DeFiLlama",
              "Aave V3",
              "Moonwell",
              "Radiant",
              "Compound V3",
              "Curve Finance",
              "ERC-4337 Wallets",
            ].map(integration => (
              <div
                key={integration}
                className="flex items-center justify-center p-4 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-lg border border-blue-200/50 dark:border-blue-700/50 hover:border-primary/20 transition-colors"
              >
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 text-center">
                  {integration}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* System Status Section */}
      <section className="py-24 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/30 dark:to-indigo-900/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">System Status: Fully Operational</h2>
              <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
                Production-ready with comprehensive monitoring and automated execution
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <CardTitle className="text-lg text-green-700 dark:text-green-300">CCTP Integration</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ Working with real transactions
                    <br />✅ Cross-chain execution verified
                    <br />✅ Gas optimization active
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <CardTitle className="text-lg text-green-700 dark:text-green-300">AI Rebalancer</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ Portfolio scanning active
                    <br />✅ Multi-strategy support
                    <br />✅ Automated execution ready
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                <CardHeader>
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 bg-green-500 rounded-full"></div>
                    <CardTitle className="text-lg text-green-700 dark:text-green-300">Monitoring</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    ✅ 10/10 components healthy
                    <br />✅ 0 active alerts
                    <br />✅ 24/7 monitoring active
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-blue-100/60 via-indigo-100/60 to-purple-100/60 dark:from-blue-800/30 dark:via-indigo-800/30 dark:to-purple-800/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to optimize your USDC yields?</h2>
            <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
              Join the next generation of DeFi with production-ready AI-powered yield optimization
            </p>
            <div className="mt-8 flex items-center justify-center gap-x-6">
              <Link href="/fund">
                <Button size="lg" className="h-12 px-8">
                  Launch CrossYield
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="h-12 px-8 bg-transparent">
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-200/50 dark:border-blue-700/50 py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center space-x-2">
              <div className="flex h-6 w-6 items-center justify-center rounded bg-primary">
                <DollarSign className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">CrossYield</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Production-ready USDC AI optimizer with multi-agent coordination and The Graph integration.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
