"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import {
  Brain,
  CheckCircle,
  AlertTriangle,
  Activity,
  Shield,
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Clock,
  Database,
  Cpu,
  Gauge,
  Award,
  Star
} from "lucide-react";

interface AIValidationData {
  ai_model_version: string;
  validation_timestamp: string;
  model_performance: {
    accuracy: number;
    precision: number;
    recall: number;
    f1_score: number;
  };
  risk_modeling: {
    monte_carlo_simulations: number;
    var_calculation_accuracy: number;
    correlation_analysis: number;
    stress_test_results: string;
  };
  market_intelligence: {
    data_sources: number;
    real_time_feeds: number;
    prediction_accuracy: number;
    latency_ms: number;
  };
  protocol_analysis: {
    security_score: number;
    audit_coverage: number;
    governance_maturity: number;
    innovation_index: number;
  };
  execution_optimization: {
    gas_efficiency: number;
    slippage_protection: number;
    mev_protection: number;
    execution_success_rate: number;
  };
  overall_ai_confidence: number;
}

interface AIValidationDisplayProps {
  className?: string;
}

export const AIValidationDisplay: React.FC<AIValidationDisplayProps> = ({ className = "" }) => {
  const [validationData, setValidationData] = useState<AIValidationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchValidationData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/ai-validation');
      const data = await response.json();
      
      if (data.status === 'success' && data.validation_results) {
        setValidationData(data.validation_results);
      } else {
        setError('Failed to fetch AI validation data');
      }
    } catch (err) {
      setError('Error connecting to AI validation service');
      console.error('AI validation error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchValidationData();
  }, []);

  const getScoreColor = (score: number) => {
    if (score >= 95) return "text-green-400";
    if (score >= 90) return "text-blue-400";
    if (score >= 85) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 95) return "bg-green-400/10 border-green-400/20";
    if (score >= 90) return "bg-blue-400/10 border-blue-400/20";
    if (score >= 85) return "bg-yellow-400/10 border-yellow-400/20";
    return "bg-red-400/10 border-red-400/20";
  };

  if (isLoading) {
    return (
      <Card className={`border-border/50 bg-gradient-to-br from-background to-muted/10 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-primary" />
            <span>AI System Validation</span>
          </CardTitle>
          <CardDescription>Loading AI validation metrics...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Activity className="h-8 w-8 animate-spin text-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !validationData) {
    return (
      <Card className={`border-red-500/50 bg-red-500/5 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-red-400">
            <AlertTriangle className="h-5 w-5" />
            <span>AI Validation Error</span>
          </CardTitle>
          <CardDescription>{error || 'Unable to load AI validation data'}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchValidationData} variant="outline" className="w-full">
            <Activity className="h-4 w-4 mr-2" />
            Retry Validation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-border/50 bg-gradient-to-br from-background to-muted/10 ${className}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Brain className="h-5 w-5 text-primary" />
              <span>AI System Validation</span>
            </CardTitle>
            <CardDescription>
              Real-time AI model performance and validation metrics
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-green-500/10 text-green-400 border-green-500/20">
              <CheckCircle className="h-3 w-3 mr-1" />
              Validated
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchValidationData}>
              <Activity className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Overall Confidence */}
        <div className="p-4 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-xl border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span className="font-semibold">Overall AI Confidence</span>
            </div>
            <span className={`text-2xl font-bold ${getScoreColor(validationData.overall_ai_confidence)}`}>
              {validationData.overall_ai_confidence}%
            </span>
          </div>
          <Progress value={validationData.overall_ai_confidence} className="h-2" />
          <div className="text-xs text-muted-foreground mt-1">
            Model Version: {validationData.ai_model_version}
          </div>
        </div>

        {/* Model Performance */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-primary flex items-center">
            <Cpu className="h-4 w-4 mr-2" />
            Model Performance
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.model_performance.accuracy)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Accuracy</span>
                <span className={`font-bold ${getScoreColor(validationData.model_performance.accuracy)}`}>
                  {validationData.model_performance.accuracy}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.model_performance.precision)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Precision</span>
                <span className={`font-bold ${getScoreColor(validationData.model_performance.precision)}`}>
                  {validationData.model_performance.precision}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.model_performance.recall)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Recall</span>
                <span className={`font-bold ${getScoreColor(validationData.model_performance.recall)}`}>
                  {validationData.model_performance.recall}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.model_performance.f1_score)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">F1 Score</span>
                <span className={`font-bold ${getScoreColor(validationData.model_performance.f1_score)}`}>
                  {validationData.model_performance.f1_score}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Modeling */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Risk Modeling
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg">
              <div className="text-lg font-bold text-blue-400 mb-1">
                {validationData.risk_modeling.monte_carlo_simulations.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Monte Carlo Simulations</div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.risk_modeling.var_calculation_accuracy)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">VaR Accuracy</span>
                <span className={`font-bold ${getScoreColor(validationData.risk_modeling.var_calculation_accuracy)}`}>
                  {validationData.risk_modeling.var_calculation_accuracy}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.risk_modeling.correlation_analysis)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Correlation Analysis</span>
                <span className={`font-bold ${getScoreColor(validationData.risk_modeling.correlation_analysis)}`}>
                  {validationData.risk_modeling.correlation_analysis}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">
                  {validationData.risk_modeling.stress_test_results}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Intelligence */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-blue-400 flex items-center">
            <Database className="h-4 w-4 mr-2" />
            Market Intelligence
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-400 mb-1">
                {validationData.market_intelligence.data_sources}
              </div>
              <div className="text-xs text-muted-foreground">Data Sources</div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center">
              <div className="text-lg font-bold text-cyan-400 mb-1">
                {validationData.market_intelligence.real_time_feeds}
              </div>
              <div className="text-xs text-muted-foreground">Real-time Feeds</div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.market_intelligence.prediction_accuracy)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Prediction Accuracy</span>
                <span className={`font-bold ${getScoreColor(validationData.market_intelligence.prediction_accuracy)}`}>
                  {validationData.market_intelligence.prediction_accuracy}%
                </span>
              </div>
            </div>
            <div className="p-3 bg-muted/20 rounded-lg text-center">
              <div className="text-lg font-bold text-green-400 mb-1">
                {validationData.market_intelligence.latency_ms}ms
              </div>
              <div className="text-xs text-muted-foreground">Latency</div>
            </div>
          </div>
        </div>

        {/* Protocol Analysis */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-orange-400 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Protocol Analysis
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.protocol_analysis.security_score * 10)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Security Score</span>
                <span className={`font-bold ${getScoreColor(validationData.protocol_analysis.security_score * 10)}`}>
                  {validationData.protocol_analysis.security_score}/10
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.protocol_analysis.audit_coverage)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Audit Coverage</span>
                <span className={`font-bold ${getScoreColor(validationData.protocol_analysis.audit_coverage)}`}>
                  {validationData.protocol_analysis.audit_coverage}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.protocol_analysis.governance_maturity * 10)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Governance</span>
                <span className={`font-bold ${getScoreColor(validationData.protocol_analysis.governance_maturity * 10)}`}>
                  {validationData.protocol_analysis.governance_maturity}/10
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.protocol_analysis.innovation_index * 10)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Innovation</span>
                <span className={`font-bold ${getScoreColor(validationData.protocol_analysis.innovation_index * 10)}`}>
                  {validationData.protocol_analysis.innovation_index}/10
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Execution Optimization */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-green-400 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Execution Optimization
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/20 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-400 mb-1">
                {validationData.execution_optimization.gas_efficiency}%
              </div>
              <div className="text-xs text-muted-foreground">Gas Efficiency</div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.execution_optimization.slippage_protection)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Slippage Protection</span>
                <span className={`font-bold ${getScoreColor(validationData.execution_optimization.slippage_protection)}`}>
                  {validationData.execution_optimization.slippage_protection}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.execution_optimization.mev_protection)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">MEV Protection</span>
                <span className={`font-bold ${getScoreColor(validationData.execution_optimization.mev_protection)}`}>
                  {validationData.execution_optimization.mev_protection}%
                </span>
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${getScoreBgColor(validationData.execution_optimization.execution_success_rate)}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Success Rate</span>
                <span className={`font-bold ${getScoreColor(validationData.execution_optimization.execution_success_rate)}`}>
                  {validationData.execution_optimization.execution_success_rate}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
          Last validated: {new Date(validationData.validation_timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};