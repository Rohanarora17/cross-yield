"use client";

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import {
  ChevronDown,
  ChevronUp,
  Brain,
  Target,
  TrendingUp,
  Shield,
  Zap,
  Clock,
  DollarSign,
  BarChart3,
  Eye,
  Bookmark,
  Share2,
  ArrowRightLeft,
  CheckCircle,
  AlertTriangle,
  Info,
  Lightbulb,
  Activity,
  Network,
  Star
} from "lucide-react";

interface AIReasoning {
  marketAnalysis: string;
  riskAssessment: string;
  yieldOpportunity: string;
  protocolSelection: string;
  allocationLogic: string;
  confidence: number;
}

interface StrategyStep {
  id: number;
  title: string;
  description: string;
  status: "completed" | "in_progress" | "pending";
  details: string;
  impact: "high" | "medium" | "low";
  timeEstimate: string;
}

interface EnhancedStrategy {
  id?: string;
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
    tvl?: number;
    liquidity_score?: number;
    institutional_flow?: number;
    defi_growth_rate?: number;
  };
  backtest: {
    timeframe: string;
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
    winRate: number;
    sortinoRatio?: number;
    calmarRatio?: number;
    var95?: number;
    expectedShortfall?: number;
    beta?: number;
    alpha?: number;
    informationRatio?: number;
    treynorRatio?: number;
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
}

interface AIStrategyCardProps {
  strategy: EnhancedStrategy;
  onDeploy?: (strategy: EnhancedStrategy) => void;
  className?: string;
}

export const AIStrategyCard: React.FC<AIStrategyCardProps> = ({
  strategy,
  onDeploy,
  className = ""
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"reasoning" | "steps" | "backtest">("reasoning");

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

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-400" />;
      case "in_progress":
        return <Activity className="h-4 w-4 text-blue-400 animate-pulse" />;
      case "pending":
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-400 bg-red-400/10";
      case "medium":
        return "text-yellow-400 bg-yellow-400/10";
      case "low":
        return "text-green-400 bg-green-400/10";
      default:
        return "text-gray-400 bg-gray-400/10";
    }
  };

  return (
    <Card className={`border-border/50 hover:border-primary/30 transition-all duration-300 group hover:shadow-lg hover:shadow-primary/5 bg-gradient-to-br from-background to-muted/10 ${className}`}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">{strategy.icon}</div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <CardTitle className="text-xl group-hover:text-primary transition-colors">
                    {strategy.title || strategy.name}
                  </CardTitle>
                  {strategy.aiOptimized && (
                    <Badge variant="secondary" className="bg-gradient-to-r from-primary/10 to-purple-500/10 text-primary border-primary/20">
                      <Brain className="h-3 w-3 mr-1" />
                      AI Optimized
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm mt-1 leading-relaxed">
                  {strategy.description}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center space-x-2 flex-wrap">
              <Badge className={`text-xs ${getRiskColor(strategy.riskLevel)}`}>
                <Shield className="h-3 w-3 mr-1" />
                {strategy.riskLevel} Risk
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Network className="h-3 w-3 mr-1" />
                {strategy.chains.length > 1 ? 'Multi-Chain' : strategy.chains[0]?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Ethereum'}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Target className="h-3 w-3 mr-1" />
                {strategy.protocols.join(', ')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {new Date(strategy.lastUpdated).toLocaleDateString()}
              </Badge>
            </div>
          </div>

          <div className="flex flex-col items-end space-y-2">
            <Badge variant={strategy.status === "Active" ? "default" : "secondary"}>
              {strategy.status}
            </Badge>
            <div className="flex items-center space-x-1">
              <Star className="h-4 w-4 text-yellow-400 fill-current" />
              <span className="text-sm font-medium">{strategy.performanceScore}</span>
            </div>
            {/* AI Confidence Indicator */}
            <div className="flex items-center space-x-1">
              <Brain className="h-3 w-3 text-primary" />
              <span className="text-xs font-medium text-primary">{strategy.aiReasoning.confidence}%</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* APY & Market Conditions */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-xl border border-green-500/20">
            <div className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent mb-1">
              {strategy.expectedAPY}%
            </div>
            <div className="text-sm text-muted-foreground">Expected APY</div>
            <div className="flex items-center justify-center space-x-1 text-xs text-green-400 mt-1">
              <TrendingUp className="h-3 w-3" />
              <span>AI Optimized</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Daily: ${strategy.dailyYield.toFixed(2)} | Monthly: ${strategy.monthlyYield.toFixed(0)}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-xl border border-blue-500/20">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Market Trend</span>
                <span className={`font-medium ${
                  strategy.marketConditions.trend === 'bullish' ? 'text-green-400' :
                  strategy.marketConditions.trend === 'bearish' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {strategy.marketConditions.trend.charAt(0).toUpperCase() + strategy.marketConditions.trend.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">AI Confidence</span>
                <span className="font-medium text-primary">{strategy.aiReasoning.confidence}%</span>
              </div>
              <Progress value={strategy.aiReasoning.confidence} className="h-1.5" />
              {strategy.marketConditions.tvl && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>DeFi TVL</span>
                  <span>${strategy.marketConditions.tvl.toFixed(1)}B</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Protocols</span>
              <span className="font-medium text-right">{strategy.protocols.join(', ')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">TVL</span>
              <span className="font-medium">${(strategy.tvl / 1000000).toFixed(1)}M</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Fees</span>
              <span className="font-medium">{strategy.fees}%</span>
            </div>
            {strategy.marketConditions.liquidity_score && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Liquidity Score</span>
                <span className="font-medium text-blue-400">{strategy.marketConditions.liquidity_score.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Min Deposit</span>
              <span className="font-medium">${strategy.minDeposit}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Volatility</span>
              <span className="font-medium">{strategy.marketConditions.volatility.toFixed(1)}/10</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Win Rate</span>
              <span className="font-medium text-green-400">{strategy.backtest.winRate}%</span>
            </div>
            {strategy.marketConditions.institutional_flow && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Institutional Flow</span>
                <span className="font-medium text-purple-400">${strategy.marketConditions.institutional_flow.toFixed(1)}B</span>
              </div>
            )}
          </div>
        </div>

        {/* AI Reasoning Summary */}
        <div className="p-4 bg-gradient-to-br from-primary/5 to-purple-500/5 rounded-xl border border-primary/20">
          <div className="flex items-center space-x-2 mb-3">
            <Brain className="h-5 w-5 text-primary" />
            <span className="font-semibold text-primary">AI Analysis Summary</span>
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              {strategy.aiReasoning.confidence}% Confidence
            </Badge>
          </div>
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong>Market:</strong> {strategy.aiReasoning.marketAnalysis.split('.')[0]}...
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong>Risk:</strong> {strategy.aiReasoning.riskAssessment.split('.')[0]}...
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              <strong>Yield:</strong> {strategy.aiReasoning.yieldOpportunity.split('.')[0]}...
            </div>
          </div>
        </div>

        {/* AI Analysis Button */}
        <Button
          variant="outline"
          className="w-full bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20 hover:from-primary/10 hover:to-purple-500/10"
          onClick={() => setShowDetails(!showDetails)}
        >
          <Brain className="h-4 w-4 mr-2" />
          {showDetails ? "Hide" : "Show"} Full AI Analysis & Execution Steps
          {showDetails ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>

        {/* Detailed Analysis */}
        {showDetails && (
          <div className="space-y-4 border-t border-border/50 pt-4">
            {/* Tab Navigation */}
            <div className="flex space-x-1 bg-muted/30 rounded-lg p-1">
              <Button
                variant={activeTab === "reasoning" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("reasoning")}
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                AI Reasoning
              </Button>
              <Button
                variant={activeTab === "steps" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("steps")}
              >
                <Target className="h-3 w-3 mr-1" />
                Strategy Steps
              </Button>
              <Button
                variant={activeTab === "backtest" ? "default" : "ghost"}
                size="sm"
                className="flex-1 text-xs"
                onClick={() => setActiveTab("backtest")}
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                Backtest
              </Button>
            </div>

            {/* Tab Content */}
            {activeTab === "reasoning" && (
              <div className="space-y-4">
                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-primary mb-2 flex items-center">
                    <Brain className="h-4 w-4 mr-2" />
                    AI Market Analysis
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strategy.aiReasoning.marketAnalysis}
                  </p>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center">
                    <Shield className="h-4 w-4 mr-2" />
                    Risk Assessment
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strategy.aiReasoning.riskAssessment}
                  </p>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-green-400 mb-2 flex items-center">
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Yield Opportunity
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strategy.aiReasoning.yieldOpportunity}
                  </p>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center">
                    <Target className="h-4 w-4 mr-2" />
                    Protocol Selection Logic
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strategy.aiReasoning.protocolSelection}
                  </p>
                </div>

                <div className="p-4 bg-muted/20 rounded-lg">
                  <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center">
                    <DollarSign className="h-4 w-4 mr-2" />
                    Allocation Strategy
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {strategy.aiReasoning.allocationLogic}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "steps" && (
              <div className="space-y-3">
                {strategy.strategySteps.map((step, index) => (
                  <div key={step.id} className="p-4 bg-muted/20 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getStepStatusIcon(step.status)}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold">{step.title}</h4>
                          <div className="flex items-center space-x-2">
                            <Badge className={`text-xs ${getImpactColor(step.impact)}`}>
                              {step.impact} impact
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {step.timeEstimate}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {step.description}
                        </p>
                        <div className="p-3 bg-background/50 rounded border border-border/50">
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            <strong>Details:</strong> {step.details}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === "backtest" && (
              <div className="space-y-4">
                {/* Primary Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      +{strategy.backtest.totalReturn}%
                    </div>
                    <div className="text-sm text-muted-foreground">Total Return</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {strategy.backtest.timeframe}
                    </div>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">
                      {strategy.backtest.sharpeRatio}
                    </div>
                    <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-xs text-green-400 mt-1">
                      {strategy.backtest.sharpeRatio > 2 ? 'Excellent' : strategy.backtest.sharpeRatio > 1.5 ? 'Good' : 'Moderate'} Risk-Adjusted Return
                    </div>
                  </div>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-red-400 mb-1">
                      {strategy.backtest.maxDrawdown}%
                    </div>
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                  </div>
                  <div className="p-4 bg-muted/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      {strategy.backtest.winRate}%
                    </div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                </div>

                {/* Advanced Financial Metrics */}
                {(strategy.backtest.sortinoRatio || strategy.backtest.calmarRatio || strategy.backtest.var95) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-primary flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Advanced Financial Metrics
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      {strategy.backtest.sortinoRatio && (
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-bold text-purple-400 mb-1">
                            {strategy.backtest.sortinoRatio}
                          </div>
                          <div className="text-xs text-muted-foreground">Sortino Ratio</div>
                        </div>
                      )}
                      {strategy.backtest.calmarRatio && (
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-bold text-orange-400 mb-1">
                            {strategy.backtest.calmarRatio}
                          </div>
                          <div className="text-xs text-muted-foreground">Calmar Ratio</div>
                        </div>
                      )}
                      {strategy.backtest.var95 && (
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-bold text-red-400 mb-1">
                            {strategy.backtest.var95}%
                          </div>
                          <div className="text-xs text-muted-foreground">VaR (95%)</div>
                        </div>
                      )}
                      {strategy.backtest.alpha && (
                        <div className="p-3 bg-muted/20 rounded-lg text-center">
                          <div className="text-lg font-bold text-green-400 mb-1">
                            {strategy.backtest.alpha}%
                          </div>
                          <div className="text-xs text-muted-foreground">Alpha</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Performance Summary */}
                <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm font-medium text-green-400">AI-Optimized Performance Summary</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This strategy has been backtested over {strategy.backtest.timeframe} with sophisticated AI optimization.
                    The Sharpe ratio of {strategy.backtest.sharpeRatio} indicates {strategy.backtest.sharpeRatio > 2 ? 'excellent' : strategy.backtest.sharpeRatio > 1.5 ? 'good' : 'moderate'} risk-adjusted returns.
                    Win rate of {strategy.backtest.winRate}% demonstrates consistent profitability with controlled risk exposure of {strategy.backtest.maxDrawdown}% max drawdown.
                    {strategy.backtest.sortinoRatio && ` Sortino ratio of ${strategy.backtest.sortinoRatio} shows superior downside risk management.`}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Features and Tags */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Features & Tags</h4>
          <div className="flex flex-wrap gap-1">
            {strategy.features.map((feature, index) => (
              <Badge key={`feature-${index}`} variant="outline" className="text-xs bg-muted/20 px-2 py-1">
                <Zap className="h-3 w-3 mr-1" />
                {feature}
              </Badge>
            ))}
            {strategy.tags.map((tag, index) => (
              <Badge key={`tag-${index}`} variant="secondary" className="text-xs bg-primary/10 text-primary px-2 py-1">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-border/50">
          <div className="flex flex-col space-y-2">
            <Button
              className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90 h-11"
              onClick={() => onDeploy?.(strategy)}
              disabled={strategy.status === "Coming Soon"}
            >
              {strategy.status === "Coming Soon" ? (
                "Coming Soon"
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Deploy AI Strategy
                  <Zap className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
            <div className="flex space-x-1">
              <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs">
                <Eye className="h-3 w-3 mr-1" />
                View Details
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs">
                <Bookmark className="h-3 w-3 mr-1" />
                Save Strategy
              </Button>
              <Button variant="outline" size="sm" className="flex-1 bg-transparent text-xs">
                <Share2 className="h-3 w-3 mr-1" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};