"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRightLeft, Copy, ExternalLink, Loader2, RefreshCw, Wallet, Target, X } from "lucide-react";
import { Badge } from "~~/components/ui/badge";
import { Button } from "~~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Input } from "~~/components/ui/input";
import { Label } from "~~/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~~/components/ui/table";
import { use1inch } from "~~/hooks/use1inch";
import { useAgentLinkage } from "~~/hooks/useAgentLinkage";
import { useAgentLinkageReset } from "~~/hooks/useAgentLinkageReset";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { notification } from "~~/utils/scaffold-eth";
import { formatUnits, parseUnits } from "viem";
import { smartWalletFactoryABI } from "~~/contracts/abis";
import { getContractAddresses, NETWORK_NAMES, getUSDCAddress } from "~~/contracts/contractAddresses";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth/useScaffoldWriteContract";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { CCTPBridge } from "~~/components/CCTPBridge";
import { MultiChainWalletConnect } from "~~/components/MultiChainWalletConnect";
import { useMultiChainWallet } from "~~/hooks/useMultiChainWallet";

export default function FundPage() {
  const router = useRouter();
  const [depositAmount, setDepositAmount] = useState("");
  const [strategy, setStrategy] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [swapFromToken, setSwapFromToken] = useState("WETH");
  const [swapAmount, setSwapAmount] = useState("");
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [userTokensWithBalances, setUserTokensWithBalances] = useState<{token: string, balance: string}[]>([]);
  const [showCCTPBridge, setShowCCTPBridge] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Get connected wallet address and chain info
  const { address: connectedAddress, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  // Multi-chain wallet support
  const multiChainWallet = useMultiChainWallet();

  // Check if current chain is supported
  const supportedChainIds = [11155111, 84532, 421614]; // Sepolia, Base Sepolia, Arbitrum Sepolia
  const isChainSupported = chainId ? supportedChainIds.includes(chainId) : false;
  const networkName = chainId ? NETWORK_NAMES[chainId as keyof typeof NETWORK_NAMES] : 'Unknown Network';

  // Agent linkage system
  const {
    getAgentAddress,
    hasLinkage,
    createLinkage,
    clearInvalidLinkages,
    isLoading: isLinkageLoading,
  } = useAgentLinkage();

  // Agent linkage reset system
  const {
    clearAllLinkages,
    resetAndReload,
    isResetting,
  } = useAgentLinkageReset();

  // State for agent address - declare before hooks that use it
  const [agentAddress, setAgentAddress] = useState<string | null>(null);

  // Scaffold-ETH hooks for contract interaction
  const { data: agentWalletAddress } = useScaffoldReadContract({
    contractName: "SmartWalletFactory",
    functionName: "getWallet",
    args: [connectedAddress],
  });

  const { writeContractAsync: writeSmartWalletFactoryAsync } = useScaffoldWriteContract({
    contractName: "SmartWalletFactory",
  });

  // Read USDC balance using direct contract call (more reliable)
  const getUSDCBalance = async () => {
    if (!connectedAddress || !publicClient) {
      console.log("Missing requirements for USDC balance:", { connectedAddress: !!connectedAddress, publicClient: !!publicClient });
      return;
    }

    try {
      console.log("Getting USDC balance for:", connectedAddress);
      console.log("Using USDC address:", usdcAddress);
      
      const balance = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "balanceOf",
        args: [connectedAddress],
      });

      console.log("Raw balance:", balance);

      const decimals = await publicClient.readContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "decimals",
      });

      console.log("USDC decimals:", decimals);

      const formattedBalance = formatUnits(balance as bigint, decimals as number);
      setUsdcBalance(formattedBalance);
      console.log("Formatted USDC balance:", formattedBalance);
    } catch (error) {
      console.error("Error getting USDC balance:", error);
      setUsdcBalance("0");
      console.log("Set balance to 0 due to error");
    }
  };

  // Read smart wallet data using direct contract call
  const [smartWalletSummary, setSmartWalletSummary] = useState<any>(null);
  
  const getSmartWalletSummary = async () => {
    if (!agentAddress || !publicClient) {
      console.log("Missing requirements for smart wallet summary:", { agentAddress: !!agentAddress, publicClient: !!publicClient });
      return;
    }

    try {
      console.log("Getting smart wallet summary for:", agentAddress);
      console.log("Current chain ID:", chainId);
      console.log("Public client:", publicClient);
      
      const summary = await publicClient.readContract({
        address: agentAddress as `0x${string}`,
        abi: USER_SMART_WALLET_ABI,
        functionName: "getWalletSummary",
        args: [],
      });

      console.log("Smart wallet summary:", summary);
      setSmartWalletSummary(summary);
    } catch (error) {
      console.error("Error getting smart wallet summary:", error);
      console.error("Agent address:", agentAddress);
      console.error("Chain ID:", chainId);
      
      // Fallback: try to read USDC balance directly
      try {
        console.log("Trying fallback: reading USDC balance directly for agent wallet");
        const usdcBalance = await publicClient.readContract({
          address: usdcAddress,
          abi: USDC_ABI,
          functionName: "balanceOf",
          args: [agentAddress],
        });
        
        const balanceFormatted = formatUnits(usdcBalance as bigint, 6);
        console.log("Agent USDC balance (fallback):", balanceFormatted);
        
        // Create a mock summary with just the balance
        setSmartWalletSummary([
          usdcBalance, // usdcBalance
          0n, // totalAllocated
          0n, // protocolCount
          true // isActive
        ]);
      } catch (fallbackError) {
        console.error("Fallback also failed:", fallbackError);
        setSmartWalletSummary(null);
      }
    }
  };

  // Contract addresses and ABIs - using the new architecture
  const contractAddresses = chainId ? getContractAddresses(chainId) : null;
  const smartWalletFactoryAddress = contractAddresses?.smartWalletFactory || "0xCE2C6Cb2cc38c82920D1a860978890085aB3F1b8" as `0x${string}`;
  const usdcAddress = chainId ? getUSDCAddress(chainId) : "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as `0x${string}`;
  
  // Contract ABIs
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
    {
      inputs: [
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
      ],
      name: "transfer",
      outputs: [{ name: "success", type: "bool" }],
      stateMutability: "nonpayable",
      type: "function",
    },
  ] as const;

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
      name: "getActiveProtocols",
      outputs: [{ name: "protocols", type: "string[]" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getTotalValue",
      outputs: [{ name: "totalValue", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [{ name: "protocolName", type: "string" }],
      name: "getProtocolBalance",
      outputs: [{ name: "balance", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  // State variables
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [smartWalletData, setSmartWalletData] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");


  // Update agent address when contract data changes
  useEffect(() => {
    if (agentWalletAddress && agentWalletAddress !== "0x0000000000000000000000000000000000000000") {
      setAgentAddress(agentWalletAddress as string);
      console.log("Agent wallet found via Scaffold-ETH hook:", agentWalletAddress);
    } else {
      setAgentAddress(null);
      console.log("No agent wallet found via Scaffold-ETH hook");
    }
  }, [agentWalletAddress]);

  // Get smart wallet summary when agent address changes
  useEffect(() => {
    if (agentAddress && publicClient) {
      getSmartWalletSummary();
    }
  }, [agentAddress, publicClient]);

  // Initialize USDC balance when component mounts or address changes
  useEffect(() => {
    if (connectedAddress && publicClient) {
      getUSDCBalance();
    }
  }, [connectedAddress, publicClient]);

  // Update smart wallet data when contract data changes
  useEffect(() => {
    if (smartWalletSummary && agentAddress) {
      const [usdcBalance, totalAllocated, protocolCount, isActive] = smartWalletSummary as readonly [
        bigint,
        bigint,
        bigint,
        boolean,
      ];

      setSmartWalletData({
        address: agentAddress,
        balance: formatUnits(usdcBalance, 6),
        totalAllocated: formatUnits(totalAllocated, 6),
        protocolCount: Number(protocolCount),
        isActive,
      });
      
      console.log("Smart wallet data updated via direct contract call:", {
        balance: formatUnits(usdcBalance, 6),
        totalAllocated: formatUnits(totalAllocated, 6),
        protocolCount: Number(protocolCount),
        isActive,
        agentAddress,
      });
    }
  }, [smartWalletSummary, agentAddress]);

  // Legacy functions kept for compatibility but not used since we're using Scaffold-ETH hooks

  // Create smart wallet using Scaffold-ETH hook
  const createSmartWallet = async () => {
    if (!connectedAddress || !writeSmartWalletFactoryAsync) return false;

    setIsCreating(true);
    try {
      console.log("Creating smart wallet for:", connectedAddress);
      const hash = await writeSmartWalletFactoryAsync({
        functionName: "createWallet",
        args: [connectedAddress],
      });

      console.log("Wallet creation transaction sent:", hash);
      // The Scaffold-ETH hook will automatically refresh the data
      console.log("Wallet created successfully");
      return true;
    } catch (error) {
      console.error("Error creating wallet:", error);
      return false;
    } finally {
      setIsCreating(false);
    }
  };

  // Legacy getUSDCBalance function - now handled by Scaffold-ETH hook


  // Direct deposit to smart wallet using new architecture
  const depositToSmartWallet = async (amount: string, strategy: string) => {
    if (!walletClient || !amount || !agentAddress || !publicClient) {
      console.error("Missing requirements:", { walletClient: !!walletClient, amount, agentAddress, publicClient: !!publicClient });
      return false;
    }

    setIsDepositing(true);
    try {
      console.log("Starting deposit with new architecture:", { amount, strategy, agentAddress });

      // Check USDC balance first
      const userBalance = parseFloat(usdcBalance);
      const depositAmount = parseFloat(amount);

      if (depositAmount > userBalance) {
        throw new Error(`Insufficient USDC balance. You have ${userBalance} USDC but trying to deposit ${depositAmount} USDC`);
      }

      const depositAmountWei = parseUnits(amount, 6); // USDC has 6 decimals
      console.log("Parsed deposit amount:", depositAmountWei.toString(), "for", amount, "USDC");

      // Step 1: Approve USDC to smart wallet
      console.log("Step 1: Approving USDC to smart wallet...");
      const approvalHash = await walletClient.writeContract({
        address: usdcAddress,
        abi: USDC_ABI,
        functionName: "approve",
        args: [agentAddress as `0x${string}`, depositAmountWei],
      });

      console.log("Approval transaction sent:", approvalHash);
      await publicClient.waitForTransactionReceipt({ hash: approvalHash });
      console.log("USDC approval confirmed");

      // Step 2: Call deposit function on smart wallet
      console.log("Step 2: Calling deposit function on smart wallet...");
      const depositHash = await walletClient.writeContract({
        address: agentAddress as `0x${string}`,
        abi: USER_SMART_WALLET_ABI,
        functionName: "deposit",
        args: [depositAmountWei, strategy],
      });

      console.log("Deposit transaction sent:", depositHash);
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      console.log("Deposit confirmed successfully");

      // Refresh data
      await getUSDCBalance();
      // Smart wallet data will be refreshed automatically via Scaffold-ETH hooks

      return true;
    } catch (error) {
      console.error("Error in deposit:", error);
      notification.error(`Deposit failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    } finally {
      setIsDepositing(false);
    }
  };

  // Computed values
  const hasSmartWallet = true; // Always show deposit options
  const agentBalance = smartWalletData ? parseFloat(smartWalletData.balance) : 0.0;

  // Get agent address from linkage system
  const linkedAgentAddress = connectedAddress ? getAgentAddress(connectedAddress) : null;
  const hasAgentLinkage = connectedAddress ? hasLinkage(connectedAddress) : false;

  // Scaffold-ETH hooks automatically handle data fetching when connectedAddress changes

  // Auto-create linkage if smart wallet exists but no linkage
  useEffect(() => {
    if (connectedAddress && agentAddress && !hasAgentLinkage) {
      createLinkage(connectedAddress, agentAddress);
    }
  }, [connectedAddress, agentAddress, hasAgentLinkage, createLinkage]);

  // Debug info available in debug panel below

  // 1inch integration
  const {
    getSwapQuote,
    executeSwap,
    getSupportedTokens,
    getUserTokenBalances,
    getSupportedTokensWithBalances,
    isLoading: is1inchLoading,
    error: oneinchError,
    chainName,
  } = use1inch();

  // Format wallet addresses for display
  const formatAddress = (address: string | undefined) => {
    if (!address) return "Not available";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const userWallet = formatAddress(connectedAddress);
  // Use the actual agent address from contract
  const agentWallet = formatAddress(agentAddress || undefined);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Refresh USDC balance
    await getUSDCBalance();
    // Refresh smart wallet summary
    await getSmartWalletSummary();
    // Force refresh linkage status
    if (connectedAddress && agentAddress && !hasAgentLinkage) {
      createLinkage(connectedAddress, agentAddress);
    }
    setIsRefreshing(false);
  };

  const handleClearInvalidLinkages = () => {
    const wasCleared = clearInvalidLinkages();
    if (wasCleared) {
      notification.success("Cleared invalid agent linkages! Please refresh the page.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      notification.info("No invalid linkages found.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const copyFullAddress = (address: string | undefined) => {
    if (address) {
      copyToClipboard(address);
    }
  };

  const handleCreateWallet = async () => {
    const success = await createSmartWallet();
    if (success && connectedAddress) {
      // Wait a moment for the smart wallet address to be updated
      setTimeout(() => {
        if (smartWalletAddress) {
          // Create linkage between user and agent
          createLinkage(connectedAddress, smartWalletAddress);
          notification.success("Agent wallet created and linked successfully!");
        } else {
          notification.success("Agent wallet created successfully!");
        }
      }, 1000);
    } else {
      notification.error("Failed to create agent wallet. Please try again.");
    }
  };

  // Validate smart wallet comes from the current factory
  const validateSmartWallet = async (walletAddress: string) => {
    if (!chainId) return false;
    const contractAddresses = getContractAddresses(chainId);
    if (!contractAddresses) return false;

    // Check if wallet was created by current factory (this is a simple check)
    // In a real scenario, you'd query the factory's getWallet function
    return walletAddress && walletAddress !== "0x0000000000000000000000000000000000000000";
  };


  const handleDeposit = async () => {
    console.log("handleDeposit called with:", {
      depositAmount,
      depositAmountType: typeof depositAmount,
      depositAmountLength: depositAmount?.length,
      connectedAddress: !!connectedAddress,
      agentAddress: !!agentAddress,
      strategy
    });

    if (!depositAmount || depositAmount.trim() === "" || !connectedAddress || !agentAddress) {
      notification.error("Missing required information for deposit");
      console.log("Missing required information:", {
        depositAmount: depositAmount,
        hasDepositAmount: !!depositAmount,
        trimmedDepositAmount: depositAmount?.trim(),
        hasConnectedAddress: !!connectedAddress,
        hasAgentAddress: !!agentAddress
      });
      return;
    }

    const parsedDepositAmount = parseFloat(depositAmount.trim());
    if (isNaN(parsedDepositAmount) || parsedDepositAmount <= 0) {
      notification.error("Please enter a valid deposit amount greater than 0");
      console.log("Invalid deposit amount:", { depositAmount, parsedDepositAmount });
      return;
    }

    const userBalance = parseFloat(usdcBalance);
    if (parsedDepositAmount > userBalance) {
      notification.error(`Insufficient USDC balance. You have ${userBalance.toFixed(2)} USDC but trying to deposit ${parsedDepositAmount} USDC`);
      console.log("Insufficient balance:", { userBalance, parsedDepositAmount });
      return;
    }

    console.log("Starting deposit process:", {
      depositAmount,
      parsedDepositAmount,
      userBalance,
      strategy,
      agentAddress
    });

    const success = await depositToSmartWallet(depositAmount, strategy);
    if (success) {
      // Increment the agent wallet counter
      
      notification.success(`Successfully deposited ${depositAmount} USDC with ${strategy} strategy!`);
      
      // Notify backend of deposit and trigger optimization
      try {
        const response = await fetch('/api/optimization-request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userAddress: connectedAddress,
            amount: parseFloat(depositAmount) * 1000000, // Convert to USDC units (6 decimals)
            strategy,
            smartWalletAddress: agentAddress
          })
        });

        const result = await response.json();
        if (result.status === 'optimization_started') {
          notification.success("AI optimization started!");
        } else {
          notification.warning(`Deposit successful, but optimization may not have started: ${result.message}`);
        }
      } catch (error) {
        console.error('Failed to trigger optimization:', error);
        notification.warning("Deposit successful, but failed to trigger AI optimization.");
      }

      setDepositAmount("");
      // Refresh USDC balance after deposit
      await getUSDCBalance();
      
      // Redirect to strategies page after successful deposit
      setTimeout(() => {
        router.push("/strategies");
      }, 2000);
    } else {
      notification.error("Failed to deposit USDC. Please try again.");
    }
  };

  const handleGetSwapQuote = async () => {
    if (!swapAmount || !swapFromToken) return;

    const quote = await getSwapQuote({
      fromToken: swapFromToken,
      toToken: "USDC",
      amount: swapAmount,
      slippage: 0.5,
    });

    if (quote) {
      setSwapQuote(quote);
      notification.success("Swap quote retrieved successfully!");
    } else {
      notification.error("Failed to get swap quote. Please check your inputs and try again.");
    }
  };

  const handleExecuteSwap = async () => {
    console.log("handleExecuteSwap called with:", {
      swapAmount,
      swapFromToken,
      swapQuote: !!swapQuote,
      connectedAddress: !!connectedAddress,
      chainId
    });

    if (!swapAmount || swapAmount.trim() === "") {
      notification.error("Please enter a swap amount");
      console.log("Missing swap amount");
      return;
    }

    if (!swapFromToken) {
      notification.error("Please select a token to swap from");
      console.log("Missing from token");
      return;
    }

    if (!swapQuote) {
      notification.error("Please get a quote first before executing the swap");
      console.log("Missing swap quote");
      return;
    }

    if (!connectedAddress) {
      notification.error("Please connect your wallet");
      console.log("Missing wallet connection");
      return;
    }

    const parsedSwapAmount = parseFloat(swapAmount.trim());
    if (isNaN(parsedSwapAmount) || parsedSwapAmount <= 0) {
      notification.error("Please enter a valid swap amount greater than 0");
      console.log("Invalid swap amount:", { swapAmount, parsedSwapAmount });
      return;
    }

    // Check if user has sufficient balance of the from token
    const selectedToken = userTokensWithBalances.find(t => t.token === swapFromToken);
    if (selectedToken) {
      const tokenBalance = parseFloat(selectedToken.balance);
      if (parsedSwapAmount > tokenBalance) {
        notification.error(`Insufficient ${swapFromToken} balance. You have ${tokenBalance.toFixed(4)} but trying to swap ${parsedSwapAmount}`);
        console.log("Insufficient token balance:", { tokenBalance, parsedSwapAmount });
        return;
      }
    }

    console.log("Executing swap with validated parameters:", {
      fromToken: swapFromToken,
      toToken: "USDC",
      amount: swapAmount,
      parsedAmount: parsedSwapAmount,
      slippage: 0.5
    });

    try {
    const success = await executeSwap({
      fromToken: swapFromToken,
      toToken: "USDC",
      amount: swapAmount,
      slippage: 0.5,
    });

    if (success) {
      setSwapAmount("");
      setSwapQuote(null);
      await getUSDCBalance();
        await fetchUserTokens(); // Refresh token balances
      notification.success(`Successfully swapped ${swapAmount} ${swapFromToken} to USDC!`);
    } else {
      notification.error("Failed to execute swap. Please try again.");
      }
    } catch (error) {
      console.error("Swap execution error:", error);
      notification.error(`Swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const supportedTokens = getSupportedTokens();

  // Fetch user tokens with balances
  const fetchUserTokens = async () => {
    try {
      const tokensWithBalances = await getSupportedTokensWithBalances();
      setUserTokensWithBalances(tokensWithBalances);

      // If user has tokens, set the first one with balance as default
      if (tokensWithBalances.length > 0 && !swapFromToken) {
        setSwapFromToken(tokensWithBalances[0].token);
      }
    } catch (error) {
      console.error("Error fetching user tokens:", error);
    }
  };

  // Fetch user tokens when wallet connects or chain changes
  useEffect(() => {
    if (connectedAddress && chainId) {
      fetchUserTokens();
    }
  }, [connectedAddress, chainId]);

  // Show loading state while checking linkage
  if (isLinkageLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading agent linkage...</p>
        </div>
      </div>
    );
  }

  // Always show the fund page - wallet connection is handled in the main UI

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Link className="mr-6 flex items-center space-x-2" href="/">
              <div className="h-6 w-6 bg-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-bold text-primary-foreground">C</span>
              </div>
              <span className="font-bold">CrossYield</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link href="/dashboard" className="text-foreground/60 hover:text-foreground">
              Dashboard
            </Link>
            <Link href="/optimizer" className="text-foreground/60 hover:text-foreground">
              Optimizer
            </Link>
            <Link href="/fund" className="text-foreground">
              Fund Agent
            </Link>
          </nav>
          <div className="ml-auto flex items-center space-x-4">
            <Button variant="outline" size="sm" onClick={() => setShowWalletModal(true)}>
              <Wallet className="h-4 w-4 mr-2" />
              Wallets
            </Button>
            <ConnectButton />
          </div>
        </div>
      </header>

      {/* Wallet Connection Banner */}
      {!connectedAddress && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-b border-blue-200/50 dark:border-blue-700/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-800">
                    <Wallet className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      Connect Your Wallet to Fund Agent
                    </h3>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Connect your EVM wallet to fund your AI agent and access cross-chain strategies
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <ConnectButton />
                  <Button variant="outline" size="sm" onClick={() => setShowWalletModal(true)}>
                    <Wallet className="h-4 w-4 mr-2" />
                    Multi-Chain
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Page Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              Fund Your Advanced AI Agent
            </h1>
            <p className="text-muted-foreground text-lg">
              Your sophisticated AI agent uses Monte Carlo risk modeling, VaR analysis, and institutional-grade financial metrics to optimize yields across multiple chains
            </p>
            <div className="flex items-center justify-center space-x-6 mt-4">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">96.2% AI Confidence</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">35K+ Monte Carlo Simulations</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                <span className="text-sm text-muted-foreground">Advanced Risk Modeling</span>
              </div>
            </div>
          </div>

          {/* Network Warning */}
          {chainId && !isChainSupported && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-red-800">Unsupported Network</h3>
                    <p className="text-sm text-red-700 mt-1">
                      Please switch to one of the supported testnets to use the deployed contracts.
                    </p>
                    <div className="mt-2 text-xs text-red-600">
                      <strong>Current Network:</strong> {networkName} (Chain ID: {chainId})<br/>
                      <strong>Supported Networks:</strong> Ethereum Sepolia (11155111), Base Sepolia (84532), Arbitrum Sepolia (421614)<br/>
                      <strong>Smart Wallet Factory:</strong> {smartWalletFactoryAddress}<br/>
                      <strong>USDC Address:</strong> {usdcAddress}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Wallet Information */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5" />
                  <span>Your Wallet</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded max-w-[120px] truncate">{userWallet}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyFullAddress(connectedAddress)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">USDC Balance:</span>
                  <div className="flex items-center space-x-2">
                  <span className="font-semibold">{parseFloat(usdcBalance).toFixed(2)} USDC</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        console.log("Manual balance refresh clicked");
                        getUSDCBalance();
                      }}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="h-5 w-5 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-primary-foreground">AI</span>
                  </div>
                  <span>Agent Wallet</span>
                  {hasAgentLinkage && (
                    <Badge variant="secondary" className="text-green-600 border-green-600/20">
                      Linked
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address:</span>
                  <div className="flex items-center space-x-2">
                    <code className="text-sm bg-muted px-2 py-1 rounded max-w-[120px] truncate">
                      {agentWallet}
                    </code>
                    <Button variant="ghost" size="sm" onClick={() => copyFullAddress(agentAddress || undefined)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <div className="flex items-center space-x-2">
                    {hasAgentLinkage ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        ✓ Linked to your wallet
                      </Badge>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                          ⚠ Not linked
                        </Badge>
                        {smartWalletAddress && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (connectedAddress && smartWalletAddress) {
                                createLinkage(connectedAddress, smartWalletAddress);
                                notification.success("Agent wallet linked successfully!");
                              }
                            }}
                          >
                            Link Now
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">USDC Balance:</span>
                  <span className="font-semibold">{agentBalance.toFixed(2)} USDC</span>
                </div>
                {smartWalletData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Allocated:</span>
                    <span className="font-semibold">{parseFloat(smartWalletData.totalAllocated).toFixed(2)} USDC</span>
                  </div>
                )}
                {smartWalletData && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Active Protocols:</span>
                    <span className="font-semibold">{smartWalletData.protocolCount}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Balance Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Asset Overview</CardTitle>
                <CardDescription>Current balances across wallets</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Balances
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Your Wallet</TableHead>
                    <TableHead>Agent Wallet</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="flex items-center space-x-2">
                      <div className="h-6 w-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-bold text-white">$</span>
                      </div>
                      <span className="font-medium">USDC</span>
                    </TableCell>
                    <TableCell className="font-medium">{parseFloat(usdcBalance).toFixed(3)}</TableCell>
                    <TableCell className="font-medium">{agentBalance.toFixed(3)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-green-400 border-green-400/20">
                        Deposit to agent
                      </Badge>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Agent Wallet Info */}
            <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
                <span>Your Advanced AI Agent Wallet</span>
                {agentAddress ? (
                  <Badge variant="secondary" className="text-green-600 border-green-600/20">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-1"></div>
                    Active & Linked
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Not Found
                  </Badge>
                )}
                </CardTitle>
                <CardDescription>
                {agentAddress 
                  ? "Your sophisticated AI agent is ready to deploy advanced strategies with Monte Carlo risk modeling, VaR analysis, and institutional-grade financial optimization"
                  : "Create an advanced AI agent wallet to start deploying sophisticated yield optimization strategies."
                }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="h-6 w-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-white">AI</span>
                    </div>
                    <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-2">
                      {agentAddress ? "Your Advanced AI Agent is Ready!" : "Advanced AI Agent Wallet Not Found"}
                    </p>
                      <ul className="mt-1 text-blue-700 space-y-1">
                      <li>• Agent wallet address: {agentWallet}</li>
                      {agentAddress ? (
                        <>
                          <li>• <strong>Monte Carlo Risk Modeling:</strong> 35K+ simulations for optimal allocation</li>
                          <li>• <strong>VaR Analysis:</strong> 95% confidence interval risk assessment</li>
                          <li>• <strong>Kelly Criterion:</strong> Optimal position sizing for maximum returns</li>
                          <li>• <strong>Cross-Chain Optimization:</strong> Automated yield farming across Ethereum, Base, Arbitrum</li>
                          <li>• <strong>Real-Time Monitoring:</strong> 24/7 performance tracking and rebalancing</li>
                          <li>• <strong>Institutional-Grade Security:</strong> Multi-factor protocol analysis (8.5-9.9/10 scores)</li>
                        </>
                      ) : (
                        <>
                          <li>• Click "Create Agent Wallet" to deploy sophisticated AI strategies</li>
                          <li>• Your agent will use advanced financial modeling for yield optimization</li>
                          <li>• Features 96.2% AI confidence scoring and institutional-grade analysis</li>
                          <li>• You maintain full control and can withdraw funds anytime</li>
                        </>
                      )}
                      </ul>
                    </div>
                  </div>
                </div>
              {!agentAddress && (
                <Button 
                  className="w-full" 
                  onClick={handleCreateWallet} 
                  disabled={isCreating || isLinkageLoading}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating Wallet...
                    </>
                  ) : (
                    <>
                      <Wallet className="mr-2 h-4 w-4" />
                      Create Agent Wallet
                    </>
                  )}
                </Button>
                )}
              </CardContent>
            </Card>

          {/* Deposit Options */}
          {agentAddress && (
            <div className="grid md:grid-cols-3 gap-6">
              {/* Direct Wallet Deposit */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Wallet className="h-5 w-5" />
                    <span>Direct Wallet Deposit</span>
                  </CardTitle>
                  <CardDescription>Transfer USDC directly from your connected wallet</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deposit-amount">Amount (USDC)</Label>
                    <Input
                      id="deposit-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={e => setDepositAmount(e.target.value)}
                      max={parseFloat(usdcBalance)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Available: {parseFloat(usdcBalance).toFixed(2)} USDC
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy Preference</Label>
                    <select
                      id="strategy"
                      className="w-full p-2 border rounded-md bg-background"
                      value={strategy}
                      onChange={e => setStrategy(e.target.value as any)}
                    >
                      <option value="conservative">Conservative (Lower risk)</option>
                      <option value="balanced">Balanced (Medium risk)</option>
                      <option value="aggressive">Aggressive (Higher risk)</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Your preference for yield optimization. You can change this later.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      console.log("Deposit button clicked!");
                      console.log("Deposit amount:", depositAmount);
                      console.log("Agent address:", agentAddress);
                      console.log("USDC balance:", usdcBalance);
                      console.log("Is depositing:", isDepositing);
                      handleDeposit();
                    }}
                    disabled={isDepositing}
                  >
                    {isDepositing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Depositing...
                      </>
                    ) : (
                      <>
                        <Wallet className="mr-2 h-4 w-4" />
                        Deposit from Wallet
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              {/* 1inch DEX Swap */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    <span>Swap via 1inch</span>
                  </CardTitle>
                  <CardDescription>Swap any token to USDC using 1inch DEX aggregator</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="swap-from-token">From Token</Label>
                    <select
                      id="swap-from-token"
                      className="w-full p-2 border rounded-md bg-background"
                      value={swapFromToken}
                      onChange={e => setSwapFromToken(e.target.value)}
                    >
                      {userTokensWithBalances.length > 0 ? (
                        <>
                          {userTokensWithBalances.map(({ token, balance }) => (
                        <option key={token} value={token}>
                              {token} (Balance: {parseFloat(balance).toFixed(4)})
                        </option>
                      ))}
                          <option disabled>---</option>
                          <option value="">Other supported tokens:</option>
                          {supportedTokens
                            .filter(token => !userTokensWithBalances.some(t => t.token === token))
                            .map(token => (
                              <option key={token} value={token}>
                                {token} (Balance: 0)
                              </option>
                            ))}
                        </>
                      ) : (
                        supportedTokens.map(token => (
                          <option key={token} value={token}>
                            {token}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="flex items-center justify-between">
                      {userTokensWithBalances.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Showing {userTokensWithBalances.length} tokens with available balance
                        </p>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={fetchUserTokens}
                        className="text-xs h-6 px-2"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="swap-amount">Amount</Label>
                    <div className="flex space-x-2">
                    <Input
                      id="swap-amount"
                      type="number"
                      placeholder="Enter amount"
                      value={swapAmount}
                      onChange={e => setSwapAmount(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const selectedToken = userTokensWithBalances.find(t => t.token === swapFromToken);
                          if (selectedToken) {
                            setSwapAmount(selectedToken.balance);
                          }
                        }}
                        disabled={!userTokensWithBalances.find(t => t.token === swapFromToken)}
                        className="px-3"
                      >
                        Max
                      </Button>
                    </div>
                    {userTokensWithBalances.find(t => t.token === swapFromToken) && (
                      <p className="text-xs text-muted-foreground">
                        Available: {parseFloat(userTokensWithBalances.find(t => t.token === swapFromToken)?.balance || "0").toFixed(4)} {swapFromToken}
                      </p>
                    )}
                  </div>

                  {swapQuote && (
                    <div className="p-3 border rounded-lg bg-muted/50 space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">You will receive:</span>
                        <span className="font-semibold">{parseFloat(swapQuote.toAmount).toFixed(6)} USDC</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Price Impact:</span>
                        <span className={`text-sm ${Math.abs(swapQuote.priceImpact * 100) > 5 ? 'text-destructive' : 'text-green-600'}`}>
                          {(swapQuote.priceImpact * 100).toFixed(2)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Estimated Gas:</span>
                        <span className="text-sm">{swapQuote.estimatedGas}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Exchange Rate:</span>
                        <span className="text-sm">1 {swapFromToken} = {(parseFloat(swapQuote.toAmount) / parseFloat(swapAmount)).toFixed(6)} USDC</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        console.log("Get quote button clicked!");
                        console.log("Swap amount:", swapAmount);
                        console.log("Swap from token:", swapFromToken);
                        handleGetSwapQuote();
                      }}
                      disabled={is1inchLoading}
                    >
                      {is1inchLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                      )}
                      Get Quote
                    </Button>
                    <Button 
                      className="flex-1" 
                      onClick={() => {
                        console.log("Execute swap button clicked!");
                        console.log("Swap quote:", swapQuote);
                        handleExecuteSwap();
                      }} 
                      disabled={is1inchLoading}
                    >
                      {is1inchLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ExternalLink className="mr-2 h-4 w-4" />
                      )}
                      Execute Swap
                    </Button>
                  </div>

                  {oneinchError && (
                    <div className="p-3 border border-destructive/50 rounded-lg bg-destructive/5">
                      <p className="text-sm text-destructive font-semibold">1inch Error:</p>
                      <p className="text-xs text-destructive mt-1">{oneinchError}</p>
                      {oneinchError.includes("API key") && (
                        <p className="text-xs text-muted-foreground mt-2">
                          To fix this, add NEXT_PUBLIC_1INCH_API_KEY to your .env file. 
                          Get your API key from <a href="https://portal.1inch.dev/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">portal.1inch.dev</a>
                        </p>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Best rates across 100+ DEXs powered by 1inch on {chainName}
                    </p>
                    {oneinchError && oneinchError.includes("API key") && (
                      <div className="p-2 border border-yellow-500/50 rounded bg-yellow-500/5">
                        <p className="text-xs text-yellow-600">
                          ⚠️ 1inch API key not configured. Add NEXT_PUBLIC_1INCH_API_KEY to your .env file to enable swaps.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* CCTP Bridge to Aptos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <ArrowRightLeft className="h-5 w-5" />
                    <span>Bridge to Aptos</span>
                  </CardTitle>
                  <CardDescription>Bridge USDC to Aptos for cross-chain yield optimization</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Transfer USDC from your EVM wallet to Aptos for enhanced yield opportunities
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <div className="h-2 w-2 bg-blue-400 rounded-full"></div>
                      <span>Base Sepolia → Aptos Testnet</span>
                    </div>
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      <strong>Note:</strong> CCTP bridge requires your direct signature - cannot be automated through agent wallet
                    </div>
                  </div>
                  
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => setShowCCTPBridge(!showCCTPBridge)}
                  >
                    {showCCTPBridge ? "Close Bridge" : "Open CCTP Bridge"}
                  </Button>

                  {/* CCTP Bridge Modal */}
                  {showCCTPBridge && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                      <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                          <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold">CCTP Bridge to Aptos</h2>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowCCTPBridge(false)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <CCTPBridge />
                          
                          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                            <h4 className="text-sm font-medium mb-2">Bridge Information:</h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>• Transfer USDC from Base Sepolia to Aptos Testnet</li>
                              <li>• Powered by Circle's CCTP v1 for secure cross-chain transfers</li>
                              <li>• Native USDC bridging with no wrapped tokens</li>
                              <li>• Estimated time: 3-8 minutes for complete transfer</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Powered by Circle's CCTP v1 for secure cross-chain transfers
                    </p>
                    <div className="flex items-center space-x-4 text-xs">
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-green-400 rounded-full"></div>
                        <span>Native USDC</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <div className="h-2 w-2 bg-purple-400 rounded-full"></div>
                        <span>Aptos Protocols</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Advanced AI Architecture Info */}
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-purple-500/5">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <div className="h-5 w-5 bg-gradient-to-r from-primary to-purple-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">AI</span>
                </div>
                <span>Advanced AI Architecture</span>
              </CardTitle>
              <CardDescription>
                Your smart wallet is powered by sophisticated AI with institutional-grade financial modeling
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h4 className="font-semibold text-primary mb-2">Smart Contract Features</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Deterministic wallet creation (CREATE2)</li>
                    <li>• Cross-chain CCTP integration</li>
                    <li>• Protocol allocation tracking</li>
                    <li>• Emergency withdrawal capabilities</li>
                  </ul>
                </div>
                <div className="p-3 bg-muted/20 rounded-lg">
                  <h4 className="font-semibold text-purple-400 mb-2">AI Capabilities</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Monte Carlo risk modeling (35K+ simulations)</li>
                    <li>• VaR analysis with 95% confidence intervals</li>
                    <li>• Kelly Criterion position sizing</li>
                    <li>• Real-time market intelligence</li>
                  </ul>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-2">
                  <div className="h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center mt-0.5">
                    <span className="text-xs font-bold text-white">i</span>
                  </div>
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 mb-1">New Architecture Benefits</p>
                    <ul className="text-blue-700 space-y-1">
                      <li>• <strong>Deterministic Addresses:</strong> Same wallet address across all chains</li>
                      <li>• <strong>Enhanced Security:</strong> Multi-signature and emergency controls</li>
                      <li>• <strong>CCTP Integration:</strong> Native Circle cross-chain transfers</li>
                      <li>• <strong>Protocol Tracking:</strong> Real-time allocation and performance monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {agentAddress && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common funding amounts to get started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[10, 25, 50, 100].map(amount => (
                    <Button
                      key={amount}
                      variant="outline"
                      className="h-16 flex-col space-y-1 bg-transparent"
                      onClick={() => {
                        console.log(`Quick action button clicked: $${amount}`);
                        setDepositAmount(amount.toString());
                      }}
                    >
                      <span className="text-lg font-bold">${amount}</span>
                      <span className="text-xs text-muted-foreground">USDC</span>
                    </Button>
                  ))}
                </div>
                
                {/* View Strategies Button */}
                  <div className="pt-4 border-t">
                    <div className="text-center space-y-3">
                      <div>
                        <h3 className="font-semibold">Ready to Deploy Advanced AI Strategies?</h3>
                        <p className="text-sm text-muted-foreground">
                        After depositing USDC, explore sophisticated AI strategies with Monte Carlo risk modeling, VaR analysis, and institutional-grade financial optimization
                        </p>
                      </div>
                      <Link href="/strategies">
                        <Button className="w-full bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90">
                          <Target className="mr-2 h-4 w-4" />
                          Explore AI Strategies
                        </Button>
                      </Link>
                    </div>
                  </div>
              </CardContent>
            </Card>
          )}

          {/* Debug Panel */}
          <Card className="border-dashed border-gray-300">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Debug Information</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  {showDebug ? "Hide" : "Show"} Debug
                </Button>
              </CardTitle>
            </CardHeader>
            {showDebug && (
              <CardContent>
                <div className="space-y-4 text-sm">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <strong>Connected Address:</strong>
                      <p className="font-mono text-xs">{connectedAddress || "Not connected"}</p>
                    </div>
                    <div>
                      <strong>Smart Wallet Address:</strong>
                      <p className="font-mono text-xs">{agentAddress || "Not found"}</p>
                    </div>
                    <div>
                      <strong>Linked Agent Address:</strong>
                      <p className="font-mono text-xs">{linkedAgentAddress || "Not linked"}</p>
                    </div>
                    <div>
                      <strong>Has Agent Linkage:</strong>
                      <p className="font-mono text-xs">{hasAgentLinkage ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <strong>Has Smart Wallet:</strong>
                      <p className="font-mono text-xs">{hasSmartWallet ? "Yes" : "No"}</p>
                    </div>
                    <div>
                      <strong>USDC Balance:</strong>
                      <p className="font-mono text-xs">{usdcBalance} USDC</p>
                    </div>
                    <div>
                      <strong>USDC Address:</strong>
                      <p className="font-mono text-xs">{usdcAddress}</p>
                    </div>
                    <div>
                      <strong>Button States:</strong>
                      <p className="font-mono text-xs">
                        Deposit: {!depositAmount ? 'No amount' : 'OK'}, 
                        Agent: {!agentAddress ? 'No agent' : 'OK'}, 
                        Balance: {parseFloat(usdcBalance) <= 0 ? 'No balance' : 'OK'}
                      </p>
                    </div>
                    <div>
                      <strong>Current Network:</strong>
                      <p className="font-mono text-xs">
                        {chainId === 11155111 ? 'Sepolia (11155111) ✅' : `Chain ID ${chainId} ❌`}
                      </p>
                    </div>
                    <div>
                      <strong>SmartWalletFactory:</strong>
                      <p className="font-mono text-xs">{smartWalletFactoryAddress}</p>
                    </div>
                    <div>
                      <strong>Contract Addresses:</strong>
                      <p className="font-mono text-xs">
                        Factory: {contractAddresses?.smartWalletFactory || 'N/A'}<br/>
                        YieldRouter: {contractAddresses?.yieldRouter || 'N/A'}<br/>
                        ChainRegistry: {contractAddresses?.chainRegistry || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <strong>Actions:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (connectedAddress && smartWalletAddress) {
                            createLinkage(connectedAddress, smartWalletAddress);
                          }
                        }}
                      >
                        Force Create Linkage
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                      >
                        Refresh All Data
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          console.log("Setting test balance");
                          setUsdcBalance("1000.0");
                        }}
                      >
                        Set Test Balance
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('This will clear all agent linkages and reload the page. Continue?')) {
                            resetAndReload();
                          }
                        }}
                        disabled={isResetting}
                      >
                        {isResetting ? 'Resetting...' : 'Reset All Linkages'}
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          if (confirm('🚨 EMERGENCY: Clear ALL data and force new wallet creation? This will clear localStorage and reload.')) {
                            // Clear ALL localStorage
                            localStorage.clear();
                            sessionStorage.clear();
                            // Force reload
                            window.location.reload();
                          }
                        }}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        🚨 EMERGENCY RESET
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearInvalidLinkages}
                        className="text-orange-600 border-orange-600 hover:bg-orange-50"
                      >
                        Clear Invalid Linkages
                      </Button>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      💡 If you're seeing old agent addresses, click "Reset All Linkages" to clear old data
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Wallet Connection Modal */}
        {showWalletModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Connect Wallets</h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowWalletModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                <MultiChainWalletConnect />
                
                <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Supported Networks:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Ethereum Sepolia (Testnet)</li>
                    <li>• Base Sepolia (Testnet)</li>
                    <li>• Arbitrum Sepolia (Testnet)</li>
                    <li>• Aptos Testnet</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Connect EVM wallet to fund agent, Aptos wallet for cross-chain features
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
