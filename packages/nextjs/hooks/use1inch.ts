"use client";

import { useState } from "react";
import { getTokenAddresses } from "../contracts/contractAddresses";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

// 1inch API configuration
const ONEINCH_API_URL = "https://api.1inch.io/v5.0";
const CHAIN_IDS = {
  11155111: "ethereum", // Ethereum Sepolia
  84532: "base", // Base Sepolia
  421614: "arbitrum", // Arbitrum Sepolia
  31337: "ethereum", // Hardhat (use Ethereum for testing)
} as const;

export interface SwapQuote {
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  estimatedGas: string;
  gasPrice: string;
  priceImpact: number;
  protocols: any[];
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: string;
  slippage?: number;
  recipient?: string;
}

export function use1inch() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getChainName = () => {
    if (!chainId) return null;
    return CHAIN_IDS[chainId as keyof typeof CHAIN_IDS] || null;
  };

  const getTokenAddress = (tokenSymbol: string) => {
    if (!chainId) return null;
    const tokens = getTokenAddresses(chainId);
    return tokens[tokenSymbol as keyof typeof tokens] || null;
  };

  const getSwapQuote = async (params: SwapParams): Promise<SwapQuote | null> => {
    if (!chainId) {
      setError("No chain selected");
      return null;
    }

    const chainName = getChainName();
    if (!chainName) {
      setError("Unsupported chain");
      return null;
    }

    const fromTokenAddress = getTokenAddress(params.fromToken);
    const toTokenAddress = getTokenAddress(params.toToken);

    if (!fromTokenAddress || !toTokenAddress) {
      setError(`Token addresses not found for ${params.fromToken} or ${params.toToken}`);
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to wei (assuming 18 decimals for most tokens)
      const amountWei = parseUnits(params.amount, 18).toString();

      const url = `${ONEINCH_API_URL}/${chainId}/quote`;
      const queryParams = new URLSearchParams({
        fromTokenAddress,
        toTokenAddress,
        amount: amountWei,
        slippage: (params.slippage || 0.5).toString(),
      });

      const response = await fetch(`${url}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const data = await response.json();

      return {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.amount,
        toAmount: formatUnits(BigInt(data.toAmount), 6), // Assuming USDC has 6 decimals
        estimatedGas: data.estimatedGas || "0",
        gasPrice: data.gasPrice || "0",
        priceImpact: parseFloat(data.priceImpact || "0") / 100,
        protocols: data.protocols || [],
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("1inch quote error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const executeSwap = async (params: SwapParams): Promise<boolean> => {
    if (!chainId || !address || !walletClient) {
      setError("Missing required parameters for swap");
      return false;
    }

    const chainName = getChainName();
    if (!chainName) {
      setError("Unsupported chain");
      return false;
    }

    const fromTokenAddress = getTokenAddress(params.fromToken);
    const toTokenAddress = getTokenAddress(params.toToken);

    if (!fromTokenAddress || !toTokenAddress) {
      setError(`Token addresses not found for ${params.fromToken} or ${params.toToken}`);
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert amount to wei
      const amountWei = parseUnits(params.amount, 18).toString();

      const url = `${ONEINCH_API_URL}/${chainId}/swap`;
      const queryParams = new URLSearchParams({
        fromTokenAddress,
        toTokenAddress,
        amount: amountWei,
        slippage: (params.slippage || 0.5).toString(),
        fromAddress: address,
        recipient: params.recipient || address,
      });

      const response = await fetch(`${url}?${queryParams}`);

      if (!response.ok) {
        throw new Error(`1inch API error: ${response.status}`);
      }

      const swapData = await response.json();

      // Execute the swap transaction using sendTransaction instead of writeContract
      const hash = await walletClient.sendTransaction({
        to: swapData.tx.to as `0x${string}`,
        value: BigInt(swapData.tx.value || "0"),
        data: swapData.tx.data as `0x${string}`,
      });

      // Wait for transaction confirmation
      await publicClient?.waitForTransactionReceipt({ hash });

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      console.error("1inch swap error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const getTokenBalance = async (tokenSymbol: string, userAddress?: string): Promise<string> => {
    if (!chainId || !publicClient) return "0";

    const tokenAddress = getTokenAddress(tokenSymbol);
    if (!tokenAddress) return "0";

    const addressToCheck = userAddress || address;
    if (!addressToCheck) return "0";

    try {
      const balance = await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [{ name: "account", type: "address" }],
            name: "balanceOf",
            outputs: [{ name: "balance", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "balanceOf",
        args: [addressToCheck],
      });

      // Get decimals
      const decimals = await publicClient.readContract({
        address: tokenAddress,
        abi: [
          {
            inputs: [],
            name: "decimals",
            outputs: [{ name: "decimals", type: "uint8" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "decimals",
      });

      return formatUnits(balance as bigint, decimals as number);
    } catch (error) {
      console.error(`Error getting ${tokenSymbol} balance:`, error);
      return "0";
    }
  };

  const getSupportedTokens = () => {
    if (!chainId) return [];
    const tokens = getTokenAddresses(chainId);
    return Object.keys(tokens || {});
  };

  return {
    getSwapQuote,
    executeSwap,
    getTokenBalance,
    getSupportedTokens,
    isLoading,
    error,
    chainId,
    chainName: getChainName(),
  };
}
