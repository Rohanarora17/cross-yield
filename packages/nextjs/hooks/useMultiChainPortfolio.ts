/**
 * Multi-Chain Portfolio Hook
 * Aggregates data from EVM smart wallets, Aptos vault, and Thala positions
 */

import { useState, useEffect, useCallback } from "react";
import { useAccount } from "wagmi";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { useSmartWallet } from "./useSmartWallet";
import { useAptosVault } from "./useAptosVault";
import { useThalaPosition } from "./useThala";
import { THALA_CONFIG } from "~~/config/thala.config";
import { useMultiChainWallet } from "./useMultiChainWallet";

export interface PortfolioPosition {
  id: string;
  protocol: string;
  chain: string;
  amount: number;
  apy: number;
  value: number;
  percentage: number;
  type: "vault" | "smart_wallet" | "thala_direct";
  address: string;
  lastUpdate: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalGain: number;
  gainPercentage: number;
  currentAPY: number;
  dailyYield: number;
  monthlyYield: number;
  riskScore: number;
  positionCount: number;
  chainCount: number;
  lastUpdate: number;
}

export interface CrossChainTransaction {
  id: string;
  type: "deposit" | "withdraw" | "transfer" | "supply" | "claim";
  amount: number;
  fromChain: string;
  toChain?: string;
  protocol: string;
  hash: string;
  timestamp: number;
  status: "pending" | "completed" | "failed";
  gasCost?: number;
}

export function useMultiChainPortfolio() {
  const { address: evmAddress, chainId } = useAccount();
  const { account: aptosAccount, connected: aptosConnected } = useAptosWallet();
  
  // Individual hooks
  const smartWallet = useSmartWallet();
  const aptosVault = useAptosVault();
  const thalaPosition = useThalaPosition(aptosAccount?.address?.toString());
  const multiChainWallet = useMultiChainWallet();

  const [portfolio, setPortfolio] = useState<PortfolioSummary | null>(null);
  const [positions, setPositions] = useState<PortfolioPosition[]>([]);
  const [transactions, setTransactions] = useState<CrossChainTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculatePortfolio = useCallback(() => {
    const allPositions: PortfolioPosition[] = [];
    let totalValue = 0;
    let totalDeposited = 0;
    let totalWithdrawn = 0;
    let weightedApy = 0;
    let positionCount = 0;
    const chains = new Set<string>();

    // EVM Smart Wallet positions
    if (smartWallet.smartWalletData) {
      const smartWalletValue = parseFloat(smartWallet.smartWalletData.balance) + 
                              parseFloat(smartWallet.smartWalletData.totalAllocated);
      
      if (smartWalletValue > 0) {
        allPositions.push({
          id: `evm-smart-wallet-${chainId}`,
          protocol: "Smart Wallet",
          chain: chainId === 8453 ? "Base" : chainId === 1 ? "Ethereum" : `Chain ${chainId}`,
          amount: smartWalletValue,
          apy: 8.5, // Average EVM APY
          value: smartWalletValue,
          percentage: 0, // Will be calculated after total
          type: "smart_wallet",
          address: smartWallet.smartWalletAddress || "",
          lastUpdate: Date.now(),
        });
        
        totalValue += smartWalletValue;
        totalDeposited += parseFloat(smartWallet.smartWalletData.balance);
        positionCount++;
        chains.add(chainId?.toString() || "");
      }
    }

    // Aptos Vault positions
    if (aptosVault.vaultData) {
      const vaultValue = aptosVault.vaultData.totalValue;
      
      if (vaultValue > 0) {
        allPositions.push({
          id: "aptos-vault",
          protocol: "Aptos Vault",
          chain: "Aptos",
          amount: vaultValue,
          apy: 12.5, // Vault average APY
          value: vaultValue,
          percentage: 0,
          type: "vault",
          address: aptosVault.vaultAddress || "",
          lastUpdate: aptosVault.vaultData.lastUpdate,
        });
        
        totalValue += vaultValue;
        totalDeposited += vaultValue;
        positionCount++;
        chains.add("aptos");
      }

      // Aave position within vault (renamed from Thala)
      if (aptosVault.vaultData.thalaPosition && aptosVault.vaultData.thalaPosition.total > 0) {
        allPositions.push({
          id: "aave-vault",
          protocol: "Aave V3",
          chain: "Aptos",
          amount: aptosVault.vaultData.thalaPosition.total,
          apy: aptosVault.vaultData.thalaPosition.apy,
          value: aptosVault.vaultData.thalaPosition.total,
          percentage: 0,
          type: "thala_direct",
          address: "0xbd7912c555a06809c2e385eab635ff0ef52b1fa062ce865c785c67694a12bb12", // Aave pool address
          lastUpdate: Date.now(),
        });
      }
    }

    // Direct Thala position (if user has direct position)
    if (thalaPosition.position && thalaPosition.position.total > 0) {
      allPositions.push({
        id: "thala-direct",
        protocol: "Thala Finance",
        chain: "Aptos",
        amount: thalaPosition.position.total,
        apy: thalaPosition.position.apy,
        value: thalaPosition.position.total,
        percentage: 0,
        type: "thala_direct",
        address: THALA_CONFIG.CONTRACT_ADDRESS,
        lastUpdate: Date.now(),
      });
      
      totalValue += thalaPosition.position.total;
      positionCount++;
      chains.add("aptos");
    }

    // Calculate percentages and weighted APY
    allPositions.forEach(position => {
      position.percentage = totalValue > 0 ? (position.value / totalValue) * 100 : 0;
      weightedApy += position.apy * position.percentage;
    });

    const currentAPY = totalValue > 0 ? weightedApy / 100 : 0;
    const totalGain = totalValue - totalDeposited;
    const gainPercentage = totalDeposited > 0 ? (totalGain / totalDeposited) * 100 : 0;
    const dailyYield = (totalValue * currentAPY / 100) / 365;
    const monthlyYield = dailyYield * 30;

    // Calculate risk score (simplified)
    const riskScore = Math.min(100, Math.max(0, 
      50 - // Base risk
      (chains.size * 5) + // Diversification bonus
      (currentAPY > 15 ? 10 : 0) + // High APY penalty
      (positionCount > 3 ? 5 : 0) // Over-diversification penalty
    ));

    const summary: PortfolioSummary = {
      totalValue,
      totalDeposited,
      totalWithdrawn,
      totalGain,
      gainPercentage,
      currentAPY,
      dailyYield,
      monthlyYield,
      riskScore,
      positionCount,
      chainCount: chains.size,
      lastUpdate: Date.now(),
    };

    setPortfolio(summary);
    setPositions(allPositions);
  }, [smartWallet, aptosVault, thalaPosition, chainId]);

  const aggregateTransactions = useCallback(() => {
    const allTransactions: CrossChainTransaction[] = [];

    // Add EVM transactions (mock for now)
    if (smartWallet.smartWalletData) {
      allTransactions.push({
        id: "evm-deposit-1",
        type: "deposit",
        amount: 5000,
        fromChain: "Ethereum",
        protocol: "Smart Wallet",
        hash: "0x1234567890abcdef",
        timestamp: Date.now() - 3600000,
        status: "completed",
        gasCost: 0.002,
      });
    }

    // Add Aptos vault transactions
    if (aptosVault.transactions.length > 0) {
      aptosVault.transactions.forEach(tx => {
        allTransactions.push({
          id: `aptos-${tx.hash}`,
          type: tx.type === "supply" ? "supply" : tx.type === "withdraw_supply" ? "claim" : tx.type,
          amount: tx.amount,
          fromChain: "Aptos",
          protocol: tx.protocol || "Aptos Vault",
          hash: tx.hash,
          timestamp: tx.timestamp,
          status: tx.status,
        });
      });
    }

    // Sort by timestamp (newest first)
    allTransactions.sort((a, b) => b.timestamp - a.timestamp);

    setTransactions(allTransactions);
  }, [smartWallet, aptosVault]);

  const refreshPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Refresh all individual data sources
      await Promise.all([
        smartWallet.fetchSmartWalletData?.(),
        aptosVault.refresh?.(),
        thalaPosition.refresh?.(),
      ]);

      calculatePortfolio();
      aggregateTransactions();
    } catch (err: any) {
      console.error("Error refreshing portfolio:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [smartWallet, aptosVault, thalaPosition, calculatePortfolio, aggregateTransactions]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (evmAddress || aptosConnected) {
      calculatePortfolio();
      aggregateTransactions();

      const interval = setInterval(() => {
        calculatePortfolio();
        aggregateTransactions();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [evmAddress, aptosConnected, calculatePortfolio, aggregateTransactions]);

  return {
    portfolio,
    positions,
    transactions,
    loading,
    error,
    refreshPortfolio,
    isConnected: !!(evmAddress || aptosConnected),
    hasEVMWallet: !!evmAddress,
    hasAptosWallet: !!aptosConnected,
    multiChainWallet,
  };
}