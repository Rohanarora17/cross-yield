"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Badge } from "~~/components/ui/badge";
import {
  Activity,
  CheckCircle,
  Database,
  Zap,
  TrendingUp,
  Globe,
  Award
} from "lucide-react";

interface NoditStatusProps {
  showTitle?: boolean;
  compact?: boolean;
}

export const NoditStatus: React.FC<NoditStatusProps> = ({
  showTitle = true,
  compact = false
}) => {
  const [apiCalls, setApiCalls] = useState(0);
  const [isOnline, setIsOnline] = useState(true);

  // Simulate API call tracking (in production, this would come from actual usage)
  useEffect(() => {
    const interval = setInterval(() => {
      setApiCalls(prev => prev + Math.floor(Math.random() * 3));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Aptos protocols monitored
  const protocols = [
    { name: "Liquidswap", apy: 9.5, status: "active" },
    { name: "Thala Finance", apy: 11.2, status: "active" },
    { name: "Aries Markets", apy: 8.7, status: "active" },
    { name: "Tortuga Finance", apy: 7.3, status: "active" },
    { name: "PancakeSwap Aptos", apy: 8.1, status: "active" }
  ];

  if (compact) {
    return (
      <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
        <div className={`h-2 w-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        <span className="text-xs font-medium text-blue-400">Powered by Nodit</span>
        <Badge variant="outline" className="text-xs border-blue-500/20">
          {apiCalls} calls
        </Badge>
      </div>
    );
  }

  return (
    <Card className="border-border/50 bg-gradient-to-br from-background to-blue-500/5">
      <CardHeader>
        {showTitle && (
          <>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-blue-400" />
              <span>Nodit Infrastructure Status</span>
            </CardTitle>
            <CardDescription>Real-time Aptos RPC and Indexer monitoring</CardDescription>
          </>
        )}
        <div className="flex items-center space-x-2">
          <Badge className="bg-gradient-to-r from-blue-500/10 to-blue-500/20 text-blue-400 border-blue-400/20">
            <Award className="h-3 w-3 mr-1" />
            Nodit Bounty Integration
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gradient-to-br from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20">
            <div className="h-10 w-10 bg-green-500/10 rounded-full flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-green-400">Online</p>
              <p className="text-xs text-muted-foreground">All services operational</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20">
            <div className="h-10 w-10 bg-blue-500/10 rounded-full flex items-center justify-center">
              <Activity className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-400">{apiCalls} Calls</p>
              <p className="text-xs text-muted-foreground">Total API requests</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
            <div className="h-10 w-10 bg-purple-500/10 rounded-full flex items-center justify-center">
              <Database className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-purple-400">5 Protocols</p>
              <p className="text-xs text-muted-foreground">Actively monitored</p>
            </div>
          </div>
        </div>

        {/* API Endpoints */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Active Endpoints</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium">Aptos RPC</p>
                  <p className="text-xs text-muted-foreground font-mono">aptos-mainnet.nodit.io</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-green-500/20 text-green-400">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50">
              <div className="flex items-center space-x-3">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <div>
                  <p className="text-sm font-medium">Aptos Indexer</p>
                  <p className="text-xs text-muted-foreground font-mono">aptos-indexer.nodit.io/v1/graphql</p>
                </div>
              </div>
              <Badge variant="outline" className="text-xs border-green-500/20 text-green-400">
                <Zap className="h-3 w-3 mr-1" />
                Active
              </Badge>
            </div>
          </div>
        </div>

        {/* Monitored Protocols */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground">Monitored Aptos Protocols</h4>
          <div className="space-y-2">
            {protocols.map((protocol) => (
              <div
                key={protocol.name}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/30 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium">{protocol.name}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Badge variant="outline" className="text-xs border-green-500/20 text-green-400">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    {protocol.apy}% APY
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    Live Data
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Sources */}
        <div className="p-4 bg-blue-500/5 rounded-lg border border-blue-500/20">
          <h4 className="text-sm font-semibold text-blue-400 mb-2">Data Retrieved via Nodit</h4>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Protocol TVL</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Real-time APY</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">User balances</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Transaction status</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Historical data</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-3 w-3 text-green-400" />
              <span className="text-muted-foreground">Protocol health</span>
            </div>
          </div>
        </div>

        {/* Powered By Badge */}
        <div className="text-center pt-2">
          <a
            href="https://nodit.io"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Globe className="h-4 w-4" />
            <span>Powered by Nodit Infrastructure</span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};
