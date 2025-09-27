"use client";

import { useEffect, useState } from "react";
import { smartWalletFactoryABI } from "../contracts/abis";
import { getContractAddresses, getUSDCAddress } from "../contracts/contractAddresses";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

// User Smart Wallet ABI (simplified for the hook)
const USER_SMART_WALLET_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "strategy", type: "string" },
    ],
    name: "deposit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getBalance",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "owner",
    outputs: [{ name: "owner", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getWalletSummary",
    outputs: [
      { name: "usdcBalance", type: "uint256" },
      { name: "totalAllocated", type: "uint256" },
      { name: "protocolCount", type: "uint256" },
      { name: "active", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

// USDC ABI (simplified)
const USDC_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [{ name: "decimals", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export interface SmartWalletData {
  address: string | null;
  balance: string;
  totalAllocated: string;
  protocolCount: number;
  isActive: boolean;
}

export function useSmartWallet() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [smartWalletData, setSmartWalletData] = useState<SmartWalletData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");

  // Get contract addresses for current chain
  const contractAddresses = chainId ? getContractAddresses(chainId) : null;
  const smartWalletFactoryAddress = contractAddresses?.smartWalletFactory;

  // Get USDC address for current chain
  const usdcAddress = chainId ? getUSDCAddress(chainId) : null;

  const checkExistingWallet = async () => {
    if (!address || !publicClient || !smartWalletFactoryAddress) return;

    try {
      const walletAddress = await publicClient.readContract({
        address: smartWalletFactoryAddress,
        abi: smartWalletFactoryABI,
        functionName: "getWallet",
        args: [address],
      });

      if (walletAddress && walletAddress !== "0x0000000000000000000000000000000000000000") {
        setSmartWalletAddress(walletAddress as string);
        await fetchSmartWalletData(walletAddress as string);
      }
    } catch (error) {
      console.error("Error checking wallet:", error);
    }
  };

  const fetchSmartWalletData = async (walletAddress: string) => {
    if (!publicClient) return;

    try {
      const summary = await publicClient.readContract({
        address: walletAddress,
        abi: USER_SMART_WALLET_ABI,
        functionName: "getWalletSummary",
      });

      const [usdcBalance, totalAllocated, protocolCount, isActive] = summary as readonly [
        bigint,
        bigint,
        bigint,
        boolean,
      ];

      setSmartWalletData({
        address: walletAddress,
        balance: formatUnits(usdcBalance, 6), // USDC has 6 decimals
        totalAllocated: formatUnits(totalAllocated, 6),
        protocolCount: Number(protocolCount),
        isActive,
      });
    } catch (error) {
      console.error("Error fetching wallet data:", error);
    }
  };

  const createSmartWallet = async () => {
    if (!address || !walletClient || !smartWalletFactoryAddress) return;

    setIsCreating(true);
    try {
      const hash = await walletClient.writeContract({
        address: smartWalletFactoryAddress,
        abi: smartWalletFactoryABI,
        functionName: "createWallet",
        args: [address],
      });

      // Wait for transaction confirmation
      await publicClient?.waitForTransactionReceipt({ hash });

      // Get the newly created wallet address
      await checkExistingWallet();

      return true;
    } catch (error) {
      console.error("Error creating wallet:", error);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const getUSDCBalance = async () => {
    if (!address || !publicClient || !usdcAddress) return;

    try {
      const balance = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [address],
      });

      const decimals = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "decimals",
      });

      setUsdcBalance(formatUnits(balance as bigint, decimals as number));
    } catch (error) {
      console.error("Error getting USDC balance:", error);
    }
  };

  const approveUSDC = async (amount: string, spender: string) => {
    if (!walletClient || !usdcAddress) return false;

    try {
      const decimals = await publicClient?.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "decimals",
      });

      const hash = await walletClient.writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [spender as `0x${string}`, parseUnits(amount, decimals as number)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      return true;
    } catch (error) {
      console.error("Error approving USDC:", error);
      return false;
    }
  };

  const depositToSmartWallet = async (amount: string, strategy: string) => {
    if (!walletClient || !smartWalletAddress || !amount) return false;

    setIsDepositing(true);
    try {
      // First approve USDC
      const approved = await approveUSDC(amount, smartWalletAddress);
      if (!approved) {
        return false;
      }

      // Then deposit to smart wallet
      const hash = await walletClient.writeContract({
        address: smartWalletAddress,
        abi: USER_SMART_WALLET_ABI,
        functionName: "deposit",
        args: [parseUnits(amount, 6), strategy], // USDC has 6 decimals
      });

      await publicClient?.waitForTransactionReceipt({ hash });

      // Refresh data
      await fetchSmartWalletData(smartWalletAddress);
      await getUSDCBalance();

      return true;
    } catch (error) {
      console.error("Error depositing:", error);
      return false;
    } finally {
      setIsDepositing(false);
    }
  };

  useEffect(() => {
    checkExistingWallet();
    getUSDCBalance();
  }, [address, publicClient, chainId, checkExistingWallet, getUSDCBalance]);

  return {
    smartWalletAddress,
    smartWalletData,
    createSmartWallet,
    depositToSmartWallet,
    getUSDCBalance,
    isCreating,
    isDepositing,
    hasSmartWallet: !!smartWalletAddress,
    usdcBalance,
    usdcAddress,
  };
}
