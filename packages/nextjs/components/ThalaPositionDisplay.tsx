/**
 * Thala Finance Position Display Component
 * Shows user's lending position in Thala Finance
 */

"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, TrendingUp, DollarSign, Percent, RefreshCw } from "lucide-react";
import { useThalaPosition, useThalaApy, useThalaWithdraw } from "~~/hooks/useThala";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { useState } from "react";
import { notification } from "~~/utils/scaffold-eth";

interface ThalaPositionDisplayProps {
  userAddress?: string;
  onWithdrawSuccess?: () => void;
}

export function ThalaPositionDisplay({ userAddress, onWithdrawSuccess }: ThalaPositionDisplayProps) {
  const { account } = useWallet();
  const address = userAddress || account?.address;

  const { position, loading: positionLoading, error: positionError, refresh } = useThalaPosition(address);
  const { apy, loading: apyLoading } = useThalaApy();
  const { withdraw, loading: withdrawLoading } = useThalaWithdraw();

  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const handleWithdraw = async () => {
    try {
      const amount = parseFloat(withdrawAmount);
      if (isNaN(amount) || amount <= 0) {
        notification.error("Please enter a valid amount");
        return;
      }

      if (position && amount > position.total) {
        notification.error("Insufficient balance");
        return;
      }

      const hash = await withdraw(amount);
      notification.success(`Withdrawal successful! TX: ${hash.substring(0, 8)}...`);
      setWithdrawAmount("");
      setShowWithdrawForm(false);
      refresh();
      onWithdrawSuccess?.();
    } catch (error: any) {
      notification.error(`Withdrawal failed: ${error.message}`);
    }
  };

  if (!address) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="pt-6">
          <Alert>
            <AlertDescription>Connect your Aptos wallet to view your Thala position</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (positionLoading || apyLoading) {
    return (
      <Card className="border-purple-500/20">
        <CardContent className="pt-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
          <span className="ml-2 text-muted-foreground">Loading Thala position...</span>
        </CardContent>
      </Card>
    );
  }

  if (positionError) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertDescription>Error loading Thala position: {positionError}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const hasPosition = position && position.total > 0;

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <svg className="h-5 w-5 text-purple-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0L2 12h8v12h4V12h8L12 0z"/>
              </svg>
              Thala Finance Position
            </CardTitle>
            <CardDescription>Lending position on Aptos testnet</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="bg-transparent"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current APY */}
        <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-purple-500" />
              <span className="text-sm font-medium text-muted-foreground">Current APY</span>
            </div>
            <div className="text-2xl font-bold text-purple-500">
              {apy ? apy.toFixed(2) : "11.20"}%
            </div>
          </div>
        </div>

        {/* Position Details */}
        {hasPosition ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Principal</span>
                </div>
                <div className="text-xl font-bold">${position!.principal.toFixed(2)}</div>
              </div>

              <div className="p-4 bg-green-500/10 rounded-lg border border-green-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-muted-foreground">Interest Earned</span>
                </div>
                <div className="text-xl font-bold text-green-500">
                  ${position!.interest.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-500/10 to-green-500/10 rounded-lg border border-purple-500/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total Balance</span>
                <div className="text-2xl font-bold">${position!.total.toFixed(2)}</div>
              </div>
            </div>

            {/* Withdraw Section */}
            {!showWithdrawForm ? (
              <Button
                onClick={() => setShowWithdrawForm(true)}
                className="w-full bg-purple-500 hover:bg-purple-600"
              >
                Withdraw from Thala
              </Button>
            ) : (
              <div className="space-y-3 p-4 bg-muted/20 rounded-lg">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Amount to Withdraw</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="0.00"
                      className="flex-1 px-3 py-2 bg-background border border-border rounded-md"
                      max={position!.total}
                      step="0.01"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setWithdrawAmount(position!.total.toString())}
                      className="bg-transparent"
                    >
                      Max
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Available: ${position!.total.toFixed(2)} USDC
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawLoading || !withdrawAmount}
                    className="flex-1 bg-purple-500 hover:bg-purple-600"
                  >
                    {withdrawLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Withdrawing...
                      </>
                    ) : (
                      "Confirm Withdrawal"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowWithdrawForm(false);
                      setWithdrawAmount("");
                    }}
                    disabled={withdrawLoading}
                    className="bg-transparent"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No active position in Thala Finance. Deposit USDC to start earning {apy?.toFixed(2)}% APY.
            </AlertDescription>
          </Alert>
        )}

        {/* Protocol Badge */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Protocol: Thala Finance</span>
          <Badge variant="outline" className="text-purple-500 border-purple-500/20">
            Aptos Testnet
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
