"use client";

import { useEffect, useState, useCallback } from "react";
import { smartWalletFactoryABI } from "../contracts/abis";
import { getContractAddresses, getUSDCAddress } from "../contracts/contractAddresses";
import { formatUnits, parseUnits } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useScaffoldReadContract, useScaffoldWriteContract } from "./scaffold-eth";

// This hook uses the latest deployed contract addresses from contractAddresses.ts
// and the correct UserSmartWallet ABI with deposit(uint256 amount, string strategy) signature

// User Smart Wallet ABI (extracted from deployedContracts.ts)
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
    outputs: [{ name: "", type: "address" }],
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
  {
    inputs: [],
    name: "isActive",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalDeposited",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalWithdrawn",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "USDC",
    outputs: [{ name: "", type: "address" }],
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

  // Use Scaffold-ETH hooks for contract interactions
  const { writeContractAsync: writeSmartWalletFactory } = useScaffoldWriteContract({
    contractName: "SmartWalletFactory",
  });


  // Read wallet address using Scaffold-ETH
  const { data: walletAddress } = useScaffoldReadContract({
    contractName: "SmartWalletFactory",
    functionName: "getWallet",
    args: address ? [address] : undefined,
  });

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
        address: walletAddress as `0x${string}`,
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
    if (!address || !writeSmartWalletFactory) return false;

    setIsCreating(true);
    try {
      console.log("Creating smart wallet for:", address);
      const hash = await writeSmartWalletFactory({
        functionName: "createWallet",
        args: [address],
      });

      console.log("Smart wallet creation transaction sent:", hash);

      // Wait for transaction confirmation
      if (publicClient && hash) {
        await publicClient.waitForTransactionReceipt({ hash });
        console.log("Smart wallet creation confirmed");
      }

      // Wait a moment for contract state to update
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Check if the wallet was actually created
      await checkExistingWallet();

      return true;
    } catch (error) {
      console.error("Error creating wallet:", error);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  const getUSDCBalance = useCallback(async () => {
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
  }, [address, publicClient, usdcAddress]);

  const approveUSDC = async (amount: string, spender: string) => {
    if (!walletClient || !usdcAddress) {
      console.error("Missing walletClient or usdcAddress:", { walletClient: !!walletClient, usdcAddress });
      return false;
    }

    try {
      console.log("Getting USDC decimals...");
      const decimals = await publicClient?.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "decimals",
      });

      console.log("USDC decimals:", decimals);
      const approvalAmount = parseUnits(amount, decimals as number);
      console.log("Approving amount:", approvalAmount.toString());

      const hash = await walletClient.writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [spender as `0x${string}`, approvalAmount],
      });

      console.log("Approval transaction sent:", hash);
      await publicClient?.waitForTransactionReceipt({ hash });
      console.log("Approval confirmed");
      return true;
    } catch (error) {
      console.error("Error approving USDC:", error);
      return false;
    }
  };

  const depositToSmartWallet = async (amount: string, strategy: string) => {
    if (!walletClient || !smartWalletAddress || !amount) {
      console.error("Missing requirements:", { walletClient: !!walletClient, smartWalletAddress, amount });
      return false;
    }

    setIsDepositing(true);
    try {
      console.log("Starting deposit:", { amount, strategy, smartWalletAddress });

      // Check USDC balance first
      const userBalance = parseFloat(usdcBalance);
      const depositAmount = parseFloat(amount);

      if (depositAmount > userBalance) {
        console.error("Insufficient USDC balance:", { userBalance, depositAmount });
        throw new Error(`Insufficient USDC balance. You have ${userBalance} USDC but trying to deposit ${depositAmount} USDC`);
      }

      // First approve USDC
      console.log("Approving USDC...");
      const approved = await approveUSDC(amount, smartWalletAddress);
      if (!approved) {
        console.error("USDC approval failed");
        throw new Error("Failed to approve USDC transfer");
      }

      console.log("USDC approved, depositing to smart wallet...");
      // Then deposit to smart wallet with correct ABI
      const hash = await walletClient.writeContract({
        address: smartWalletAddress as `0x${string}`,
        abi: USER_SMART_WALLET_ABI,
        functionName: "deposit",
        args: [parseUnits(amount, 6), strategy], // USDC has 6 decimals, pass strategy directly
      });

      console.log("Deposit transaction sent:", hash);
      await publicClient?.waitForTransactionReceipt({ hash });
      console.log("Deposit transaction confirmed");

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

  // Update smart wallet address when walletAddress changes
  useEffect(() => {
    if (walletAddress && walletAddress !== "0x0000000000000000000000000000000000000000") {
      setSmartWalletAddress(walletAddress as string);
      fetchSmartWalletData(walletAddress as string);
    } else {
      setSmartWalletAddress(null);
      setSmartWalletData(null);
    }
  }, [walletAddress]);

  useEffect(() => {
    getUSDCBalance();
  }, [getUSDCBalance]);

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
