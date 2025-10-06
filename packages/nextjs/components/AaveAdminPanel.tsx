/**
 * Aave Admin Panel Component
 * Allows admin to manage vault's Aave deposits
 * - Supply USDC to Aave
 * - Withdraw from Aave
 * - View current Aave position
 */

"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Alert, AlertDescription } from "./ui/alert";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ExternalLink,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";

export function AaveAdminPanel() {
  const { account, connected } = useWallet();
  const [supplyAmount, setSupplyAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHashes, setTxHashes] = useState<{
    tracking?: string;
    aave?: string;
  } | null>(null);

  // Check if user is admin
  const ADMIN_ADDRESS = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b";
  const isAdmin = connected && account?.address.toString() === ADMIN_ADDRESS;

  const handleSupply = async () => {
    if (!supplyAmount || parseFloat(supplyAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHashes(null);

      const response = await fetch("/api/vault-aave-supply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(supplyAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to supply to Aave");
      }

      setSuccess(`Successfully supplied ${supplyAmount} USDC to Aave!`);
      setTxHashes({
        tracking: data.step1_vaultTracking?.txHash,
        aave: data.step2_aaveDeposit?.txHash,
      });
      setSupplyAmount("");

    } catch (err: any) {
      console.error("Supply error:", err);
      setError(err.message || "Failed to supply to Aave");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setTxHashes(null);

      const response = await fetch("/api/vault-aave-withdraw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to withdraw from Aave");
      }

      setSuccess(`Successfully withdrew ${withdrawAmount} USDC from Aave!`);
      setTxHashes({
        tracking: data.step1_vaultTracking?.txHash,
        aave: data.step2_aaveWithdraw?.txHash,
      });
      setWithdrawAmount("");

    } catch (err: any) {
      console.error("Withdraw error:", err);
      setError(err.message || "Failed to withdraw from Aave");
    } finally {
      setLoading(false);
    }
  };

  if (!connected) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aave Admin Panel
          </CardTitle>
          <CardDescription>
            Connect your Aptos wallet to manage Aave deposits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              Please connect your Aptos wallet to access admin functions
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Aave Admin Panel
          </CardTitle>
          <CardDescription>
            Admin-only functions for managing vault Aave deposits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              Access denied. This panel is only available to the vault admin.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Aave V3 Admin Panel
              <Badge variant="outline" className="ml-2">Admin Only</Badge>
            </CardTitle>
            <CardDescription>
              Manage vault's Aave deposits and withdrawals
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Success Message */}
        {success && (
          <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertDescription className="text-green-700 dark:text-green-300">
              {success}
            </AlertDescription>
          </Alert>
        )}

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Transaction Links */}
        {txHashes && (
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium">Transactions Submitted:</p>
            {txHashes.tracking && (
              <a
                href={`https://explorer.aptoslabs.com/txn/${txHashes.tracking}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
                Step 1: Vault Tracking ({txHashes.tracking.slice(0, 8)}...)
              </a>
            )}
            {txHashes.aave && (
              <a
                href={`https://explorer.aptoslabs.com/txn/${txHashes.aave}?network=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
                Step 2: Aave Deposit ({txHashes.aave.slice(0, 8)}...)
              </a>
            )}
          </div>
        )}

        {/* Supply Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-green-500" />
            <h3 className="font-semibold">Supply to Aave</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Deploy vault USDC to Aave V3 lending pool to earn yield
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount (USDC)"
              value={supplyAmount}
              onChange={(e) => setSupplyAmount(e.target.value)}
              disabled={loading}
              min="0"
              step="0.01"
            />
            <Button
              onClick={handleSupply}
              disabled={loading || !supplyAmount}
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Supplying...
                </>
              ) : (
                <>
                  <ArrowUpRight className="mr-2 h-4 w-4" />
                  Supply
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            This will execute 2 transactions: vault tracking + Aave deposit
          </p>
        </div>

        {/* Withdraw Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold">Withdraw from Aave</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Withdraw USDC from Aave back to vault (includes earned yield)
          </p>
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder="Amount (USDC)"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              disabled={loading}
              min="0"
              step="0.01"
            />
            <Button
              onClick={handleWithdraw}
              disabled={loading || !withdrawAmount}
              variant="outline"
              className="whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                <>
                  <ArrowDownLeft className="mr-2 h-4 w-4" />
                  Withdraw
                </>
              )}
            </Button>
          </div>
          <Badge variant="secondary" className="text-xs">
            Coming Soon
          </Badge>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="text-sm font-semibold mb-2 text-blue-900 dark:text-blue-100">
            How it works
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Step 1:</strong> Vault contract updates tracking (on-chain)</li>
            <li>• <strong>Step 2:</strong> Aave SDK deposits USDC to Aave pool</li>
            <li>• <strong>Result:</strong> USDC earns yield on Aave V3</li>
            <li>• <strong>Transparency:</strong> Both transactions visible on explorer</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
