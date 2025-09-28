"use client";

import { useState } from "react";
import { getTokenAddresses } from "../contracts/contractAddresses";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

// 1inch API configuration - Updated to v6.0
const ONEINCH_API_URL = "https://api.1inch.dev/swap/v6.0";
const CHAIN_IDS = {
  1: 1, // Ethereum mainnet
  11155111: 1, // Ethereum Sepolia -> use mainnet for testing
  84532: 8453, // Base Sepolia -> use Base mainnet for testing
  421614: 42161, // Arbitrum Sepolia -> use Arbitrum mainnet for testing
  31337: 1, // Hardhat -> use Ethereum mainnet
} as const;

// 1inch API key - Get your API key from: https://portal.1inch.dev/
const ONEINCH_API_KEY = process.env.NEXT_PUBLIC_1INCH_API_KEY || "";

// For testnets, we'll simulate quotes since 1inch doesn't support all testnets
const TESTNET_CHAINS = [11155111, 84532, 421614];

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

  const getApiChainId = () => {
    if (!chainId) return null;
    return CHAIN_IDS[chainId as keyof typeof CHAIN_IDS] || null;
  };

  const isTestnetChain = () => {
    return chainId ? TESTNET_CHAINS.includes(chainId) : false;
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

    const apiChainId = getApiChainId();
    if (!apiChainId) {
      setError("Unsupported chain");
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // For testnets, first try 1inch API, then fall back to DEX simulation
      if (isTestnetChain()) {
        console.log("Testnet detected - trying 1inch API first, then simulation fallback");

        // Try 1inch API first (they might support some testnets)
        if (ONEINCH_API_KEY) {
          try {
            const fromTokenAddress = getTokenAddress(params.fromToken);
            const toTokenAddress = getTokenAddress(params.toToken);

            if (fromTokenAddress && toTokenAddress) {
              const amountWei = parseUnits(params.amount, 18).toString();
              const url = `${ONEINCH_API_URL}/${apiChainId}/quote`;
              const queryParams = new URLSearchParams({
                src: fromTokenAddress,
                dst: toTokenAddress,
                amount: amountWei,
                includeProtocols: "true",
                includeGas: "true",
              });

              const headers: HeadersInit = {
                'Accept': 'application/json',
                'Authorization': `Bearer ${ONEINCH_API_KEY}`,
              };

              const response = await fetch(`${url}?${queryParams}`, { headers });

              if (response.ok) {
                const data = await response.json();
                console.log("✅ 1inch API worked on testnet!");
                return {
                  fromToken: params.fromToken,
                  toToken: params.toToken,
                  fromAmount: params.amount,
                  toAmount: formatUnits(BigInt(data.dstAmount), 6),
                  estimatedGas: data.gas || "0",
                  gasPrice: data.gasPrice || "0",
                  priceImpact: 0.001,
                  protocols: data.protocols || [],
                };
              }
            }
          } catch (error) {
            console.log("1inch API failed on testnet, falling back to simulation:", error);
          }
        }

        // Fallback to DEX simulation with real prices
        console.log("Using DEX simulation with real-time prices");
        try {
          const priceResponse = await fetch(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,wrapped-bitcoin,dai&vs_currencies=usd'
          );
          const priceData = await priceResponse.json();

          const exchangeRates: { [key: string]: number } = {
            'WETH': priceData.ethereum?.usd || 2500,
            'WBTC': priceData['wrapped-bitcoin']?.usd || 45000,
            'DAI': priceData.dai?.usd || 1,
            'USDT': 1,
          };

          const rate = exchangeRates[params.fromToken] || 1;
          const fromAmount = parseFloat(params.amount);
          const toAmount = fromAmount * rate;

          await new Promise(resolve => setTimeout(resolve, 1000));

          return {
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromAmount: params.amount,
            toAmount: toAmount.toFixed(6),
            estimatedGas: "150000",
            gasPrice: "2000000000",
            priceImpact: 0.001,
            protocols: [{ name: "Testnet DEX Simulation (Real-time Prices)", part: 100 }],
          };
        } catch (error) {
          console.error("Failed to fetch real prices, using fallback rates:", error);

          const exchangeRates: { [key: string]: number } = {
            'WETH': 2500,
            'WBTC': 45000,
            'DAI': 1,
            'USDT': 1,
          };

          const rate = exchangeRates[params.fromToken] || 1;
          const fromAmount = parseFloat(params.amount);
          const toAmount = fromAmount * rate;

          await new Promise(resolve => setTimeout(resolve, 1000));

          return {
            fromToken: params.fromToken,
            toToken: params.toToken,
            fromAmount: params.amount,
            toAmount: toAmount.toFixed(6),
            estimatedGas: "150000",
            gasPrice: "2000000000",
            priceImpact: 0.001,
            protocols: [{ name: "Testnet DEX Simulation (Fallback)", part: 100 }],
          };
        }
      }

      // Real API call for mainnet
      if (!ONEINCH_API_KEY) {
        setError("1inch API key not configured. Add NEXT_PUBLIC_1INCH_API_KEY to your .env file.");
        return null;
      }

      const fromTokenAddress = getTokenAddress(params.fromToken);
      const toTokenAddress = getTokenAddress(params.toToken);

      if (!fromTokenAddress || !toTokenAddress) {
        const errorMsg = `Token addresses not found for ${params.fromToken} or ${params.toToken}`;
        setError(errorMsg);
        return null;
      }

      // Convert amount to wei (assuming 18 decimals for most tokens)
      const amountWei = parseUnits(params.amount, 18).toString();

      const url = `${ONEINCH_API_URL}/${apiChainId}/quote`;
      const queryParams = new URLSearchParams({
        src: fromTokenAddress,
        dst: toTokenAddress,
        amount: amountWei,
        includeProtocols: "true",
        includeGas: "true",
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
      };

      const response = await fetch(`${url}?${queryParams}`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("1inch API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`1inch API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      return {
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.amount,
        toAmount: formatUnits(BigInt(data.dstAmount), 6), // USDC has 6 decimals
        estimatedGas: data.gas || "0",
        gasPrice: data.gasPrice || "0",
        priceImpact: 0.001, // 1inch doesn't always provide this
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

    const apiChainId = getApiChainId();
    if (!apiChainId) {
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
      // For testnets, simulate the swap since 1inch doesn't support them
      if (isTestnetChain()) {
        console.log("Simulating 1inch swap for testnet");

        // Simulate some delay
        await new Promise(resolve => setTimeout(resolve, 2000));

        // In a real testnet environment, this would need to interact with a testnet DEX
        // For now, we'll just simulate success
        console.log("Testnet swap simulation completed");
        return true;
      }

      // Real API call for mainnet
      if (!ONEINCH_API_KEY) {
        setError("1inch API key not configured. Add NEXT_PUBLIC_1INCH_API_KEY to your .env file.");
        return false;
      }

      // Convert amount to wei (assuming 18 decimals for most tokens)
      const amountWei = parseUnits(params.amount, 18).toString();

      const url = `${ONEINCH_API_URL}/${apiChainId}/swap`;
      const queryParams = new URLSearchParams({
        src: fromTokenAddress,
        dst: toTokenAddress,
        amount: amountWei,
        slippage: (params.slippage || 0.5).toString(),
        from: address,
        recipient: params.recipient || address,
      });

      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
      };

      const response = await fetch(`${url}?${queryParams}`, { headers });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("1inch Swap API Error:", {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
        throw new Error(`1inch API error: ${response.status} - ${errorText}`);
      }

      const swapData = await response.json();

      // Execute the swap transaction using sendTransaction
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

  const getChainName = () => {
    if (!chainId) return null;
    const chainNames = {
      1: "ethereum",
      11155111: "ethereum_sepolia",
      8453: "base",
      84532: "base_sepolia",
      42161: "arbitrum",
      421614: "arbitrum_sepolia",
      31337: "localhost"
    } as const;
    return chainNames[chainId as keyof typeof chainNames] || null;
  };

  const chainName = getChainName();

  return {
    getSwapQuote,
    executeSwap,
    getTokenBalance,
    getSupportedTokens,
    isLoading,
    error,
    chainId,
    chainName,
  };
}
