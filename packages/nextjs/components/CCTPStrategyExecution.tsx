"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~~/components/ui/card";
import { Button } from "~~/components/ui/button";
import { Input } from "~~/components/ui/input";
import { Badge } from "~~/components/ui/badge";
import { Progress } from "~~/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "~~/components/ui/alert";
import { 
  ArrowRightLeft, 
  CheckCircle, 
  Check,
  Clock, 
  AlertTriangle, 
  Loader2,
  ExternalLink,
  Zap,
  Shield,
  Target,
  BarChart3,
  ArrowRight,
  AlertCircle
} from "lucide-react";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { MoveVector } from "@aptos-labs/ts-sdk";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import { CCTP_V1_CONFIG, TOKEN_MESSENGER_ABI, USDC_ABI } from "~~/config/cctp-aptos.config";
import { useAptosVault } from "~~/hooks/useAptosVault";
import { notification } from "~~/utils/scaffold-eth";
import { useRouter } from "next/navigation";

interface EnhancedStrategy {
  id: string;
  name: string;
  apy: number;
  risk: string;
  minDeposit: number;
  maxDeposit: number;
  chains: string[];
  protocols: string[];
  expectedAPY?: number;
  riskLevel?: string;
}

interface CCTPStrategyExecutionProps {
  strategy: EnhancedStrategy;
  onClose: () => void;
  onSuccess?: (transferId: string) => void;
  onFailure?: (error: string) => void;
}

export const CCTPStrategyExecution: React.FC<CCTPStrategyExecutionProps> = ({
  strategy,
  onClose,
  onSuccess,
  onFailure
}) => {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const router = useRouter();
  
  // CCTP v1 Configuration (same as Fund page)
  const config = CCTP_V1_CONFIG;
  
  // State (same as CCTPBridge)
  const [executionAmount, setExecutionAmount] = useState("0.01");
  const [step, setStep] = useState(1); // 1: Connect, 2: Approve, 3: Burn, 4: Attestation, 5: Receive, 6: Deploy to Aave
  const [messageBytes, setMessageBytes] = useState<string | null>(null);
  const [messageHash, setMessageHash] = useState("");
  const [attestation, setAttestation] = useState("");
  const [error, setError] = useState("");
  const [isPollingAttestation, setIsPollingAttestation] = useState(false);
  const [aptosTxHash, setAptosTxHash] = useState("");
  const [isSubmittingAptos, setIsSubmittingAptos] = useState(false);
  const [bytecode, setBytecode] = useState<Uint8Array | null>(null);
  const [loadingBytecode, setLoadingBytecode] = useState(false);
  const [vaultTxHash, setVaultTxHash] = useState("");
  const [vaultTrackingTxHash, setVaultTrackingTxHash] = useState("");
  const [isDepositingToVault, setIsDepositingToVault] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isSwitchingChain, setIsSwitchingChain] = useState(false);

  // Aptos wallet hooks (same as CCTPBridge)
  const {
    connect: connectAptosWallet,
    account: aptosAccount,
    connected: isAptosConnected,
    disconnect: disconnectAptosWallet,
    wallet: aptosWallet,
    wallets: aptosWallets,
    signAndSubmitTransaction,
  } = useAptosWallet();

  // Vault hook
  const { depositToVault } = useAptosVault();

  // Convert amount to smallest units (USDC has 6 decimals)
  const amountInSmallestUnits = parseUnits(executionAmount || "0", 6);

  // Check USDC allowance
  const { data: allowanceData } = useReadContract({
    address: config.BASE_SEPOLIA.usdc as `0x${string}`,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address || "0x0", config.BASE_SEPOLIA.tokenMessenger],
    query: {
      enabled: !!address,
    },
  });

  // Approve USDC
  const {
    writeContract: approveUsdc,
    data: approveTxHash,
    isPending: isApprovePending,
  } = useWriteContract();

  // Wait for approve transaction
  const { isSuccess: isApproveSuccess, isError: isApproveError } = useWaitForTransactionReceipt({
    hash: approveTxHash,
  });

  // Burn USDC
  const {
    writeContract: burnUsdc,
    data: burnTxHash,
    isPending: isBurnPending,
  } = useWriteContract();

  // Wait for burn transaction
  const {
    isSuccess: isBurnSuccess,
    isError: isBurnError,
    data: burnReceipt,
  } = useWaitForTransactionReceipt({
    hash: burnTxHash,
  });

  // Load bytecode when needed (same as CCTPBridge)
  useEffect(() => {
    const fetchBytecode = async () => {
      if (step === 5 && !bytecode && !loadingBytecode) {
        try {
          setLoadingBytecode(true);
          const response = await fetch("/api/cctp-bytecode");
          if (!response.ok) {
            throw new Error(`Failed to load bytecode: ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          setBytecode(new Uint8Array(arrayBuffer));
          setLoadingBytecode(false);
        } catch (err) {
          console.error("Error loading bytecode:", err);
          setError("Failed to load transaction bytecode");
          setLoadingBytecode(false);
        }
      }
    };

    fetchBytecode();
  }, [step, bytecode, loadingBytecode]);

  // Auto-switch to Base Sepolia for CCTP to Aptos
  useEffect(() => {
    const autoSwitchToBaseSepolia = async () => {
      if (chainId !== 84532 && !isSwitchingChain) {
        setIsSwitchingChain(true);
        try {
          await switchChain({ chainId: 84532 });
          notification.info("Switched to Base Sepolia for CCTP bridge to Aptos");
        } catch (error) {
          console.error("Failed to switch to Base Sepolia:", error);
          notification.error("Please switch to Base Sepolia manually for CCTP bridge");
        } finally {
          setIsSwitchingChain(false);
        }
      }
    };

    autoSwitchToBaseSepolia();
  }, [chainId, switchChain, isSwitchingChain]);

  // CCTP v1 Handlers (same as CCTPBridge)
  const handleApprove = async () => {
    try {
      setError("");

      if (!address) {
        throw new Error("Please connect your wallet");
      }

      approveUsdc({
        address: config.BASE_SEPOLIA.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "approve",
        args: [config.BASE_SEPOLIA.tokenMessenger, amountInSmallestUnits],
      });
    } catch (err: unknown) {
      console.error("Approval error:", err);
      setError(err instanceof Error ? err.message : "Failed to approve USDC");
    }
  };

  const handleBurn = async () => {
    try {
      setError("");

      if (!address) {
        throw new Error("Please connect your wallet");
      }

      if (!aptosAccount?.address) {
        throw new Error("Please connect your Aptos wallet");
      }

      // Format Aptos address as bytes32 for CCTP
      const aptosAddressHex = aptosAccount.address.toString().startsWith("0x")
        ? aptosAccount.address.toString().slice(2)
        : aptosAccount.address.toString();

      const bytes32Address = `0x${aptosAddressHex.padStart(64, "0")}`;

      burnUsdc({
        address: config.BASE_SEPOLIA.tokenMessenger as `0x${string}`,
        abi: TOKEN_MESSENGER_ABI,
        functionName: "depositForBurn",
        args: [amountInSmallestUnits, config.APTOS_TESTNET.domain, bytes32Address, config.BASE_SEPOLIA.usdc],
      });
    } catch (err: unknown) {
      console.error("Burn error:", err);
      setError(err instanceof Error ? err.message : "Failed to burn USDC");
    }
  };

  const handleReceiveOnAptos = async () => {
    if (!isAptosConnected || !aptosAccount) {
      setError("Please connect your Aptos wallet");
      return;
    }

    if (!attestation || !messageBytes) {
      setError("Missing attestation data or message bytes");
      return;
    }

    if (loadingBytecode) {
      setError("Bytecode is still loading. Please wait...");
      return;
    }

    if (!bytecode) {
      setError("Failed to load bytecode. Please refresh and try again.");
      return;
    }

    try {
      setIsSubmittingAptos(true);
      setError("");

      console.log("Preparing Aptos transaction");

      // Convert messageBytes to Buffer
      let messageBytesBuffer: Buffer;
      if (typeof messageBytes === "string" && messageBytes.startsWith("0x")) {
        messageBytesBuffer = Buffer.from(messageBytes.slice(2), "hex");
      } else if (Buffer.isBuffer(messageBytes)) {
        messageBytesBuffer = messageBytes;
      } else {
        messageBytesBuffer = Buffer.from(String(messageBytes));
      }

      // Convert attestation to Buffer
      let attestationBuffer: Buffer;
      if (typeof attestation === "string" && attestation.startsWith("0x")) {
        attestationBuffer = Buffer.from(attestation.slice(2), "hex");
      } else if (Buffer.isBuffer(attestation)) {
        attestationBuffer = attestation;
      } else {
        attestationBuffer = Buffer.from(attestation);
      }

      console.log(`Message bytes buffer length: ${messageBytesBuffer.length}`);
      console.log(`Attestation buffer length: ${attestationBuffer.length}`);

      // Create transaction with bytecode
      const transaction = {
        type: "simple_transaction",
        data: {
          bytecode,
          functionArguments: [MoveVector.U8(messageBytesBuffer), MoveVector.U8(attestationBuffer)],
        },
      };

      console.log("Submitting transaction to Aptos...");
      const pendingTxn = await signAndSubmitTransaction(transaction);

      console.log("Transaction submitted:", pendingTxn);
      setAptosTxHash(pendingTxn.hash);
      setIsSubmittingAptos(false);
      setStep(6); // Auto-advance to Aave deployment step
    } catch (err: unknown) {
      console.error("Aptos transaction error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete transfer on Aptos");
      setIsSubmittingAptos(false);
    }
  };

  const handleDepositToAave = async () => {
    if (!aptosAccount) {
      setError("Please connect your Aptos wallet");
      return;
    }

    try {
      setIsDepositingToVault(true);
      setError("");

      console.log(`🚀 Supplying ${executionAmount} USDC to Aave via vault...`);

      // Call the vault-aave-supply API endpoint
      const response = await fetch('/api/vault-aave-supply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: parseFloat(executionAmount)
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Aave supply successful:', result);

      // Store both transaction hashes
      const trackingTxHash = result.step1_vaultTracking.txHash;
      const aaveTxHash = result.step2_aaveDeposit.txHash;

      setVaultTrackingTxHash(trackingTxHash);
      setVaultTxHash(aaveTxHash);
      setIsDepositingToVault(false);

      // Call success callback with Aave transaction hash
      if (onSuccess) {
        onSuccess(aaveTxHash);
      }

      // Show success notification with both transaction links
      notification.success(
        `Strategy deployed! View transactions in the alert below.`
      );
    } catch (err: unknown) {
      console.error("Aave supply error:", err);
      setError(err instanceof Error ? err.message : "Failed to supply to Aave");
      setIsDepositingToVault(false);
      
      // Call failure callback
      if (onFailure) {
        onFailure(err instanceof Error ? err.message : "Failed to supply to Aave");
      }
    }
  };

  // Extract message bytes from burn transaction (same as CCTPBridge)
  useEffect(() => {
    if (burnReceipt && isBurnSuccess && step === 3) {
      try {
        console.log("Burn transaction receipt:", burnReceipt);

        const eventSignature = "MessageSent(bytes)";
        const eventTopic = keccak256(toUtf8Bytes(eventSignature));

        console.log("Looking for event with topic:", eventTopic);

        const log = burnReceipt.logs.find(l => l.topics && l.topics[0] === eventTopic);

        if (!log) {
          console.log("Available topics in logs:");
          burnReceipt.logs.forEach((l, i) => {
            console.log(`Log ${i} topics:`, l.topics);
          });
          throw new Error("MessageSent event not found in transaction logs");
        }

        if (!log.data) {
          throw new Error("No data found in MessageSent event");
        }

        // Decode message bytes
        const abiCoder = new AbiCoder();
        const messageBytes = abiCoder.decode(["bytes"], log.data)[0];
        console.log("Decoded message bytes:", messageBytes);

        // Calculate message hash
        const messageHash = keccak256(messageBytes);
        console.log("Message hash:", messageHash);

        setMessageBytes(messageBytes);
        setMessageHash(messageHash);
        setStep(4);
        setIsPollingAttestation(true);
      } catch (err) {
        console.error("Error extracting message from logs:", err);
        setError(err instanceof Error ? err.message : "Failed to extract message from transaction");
      }
    }
  }, [burnReceipt, isBurnSuccess, step]);

  // Poll for attestation (same as CCTPBridge)
  useEffect(() => {
    if (!isPollingAttestation || !messageHash) return;

    let pollingInterval: NodeJS.Timeout | undefined;
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals

    const pollAttestation = async () => {
      try {
        attempts++;
        console.log(`Polling for attestation (attempt ${attempts}/${maxAttempts})...`);

        const response = await fetch(`${config.IRIS_API.sandbox}/attestations/${messageHash}`);

        if (!response.ok) {
          console.warn(`Attestation API returned ${response.status}`);
          return;
        }

        const data = await response.json();
        console.log("Attestation response:", data);

        if (data.status === "complete") {
          setAttestation(data.attestation);
          setIsPollingAttestation(false);
          setStep(5);
          if (pollingInterval) clearInterval(pollingInterval);
        }
      } catch (err: unknown) {
        console.error("Error polling for attestation:", err);
      }
    };

    // Initial poll
    pollAttestation();

    // Poll every 5 seconds
    pollingInterval = setInterval(pollAttestation, 5000);

    return () => {
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [isPollingAttestation, messageHash]);

  // Check if approval is needed
  const needsApproval =
    !allowanceData || (typeof allowanceData === "bigint" && allowanceData < amountInSmallestUnits);

  // Auto-progress to Step 2 when both wallets are connected
  useEffect(() => {
    if (address && isAptosConnected && step === 1) {
      console.log("Both wallets connected, advancing to Step 2");
      setStep(2);
    }
  }, [address, isAptosConnected, step]);

  // Update step when approve is confirmed
  useEffect(() => {
    if (isApproveSuccess && step === 2) {
      setStep(3);
    }
  }, [isApproveSuccess, step]);

  // Handle errors
  useEffect(() => {
    if (isApproveError) {
      setError("USDC approval failed. Please try again.");
    } else if (isBurnError) {
      setError("USDC burn failed. Please try again.");
    }
  }, [isApproveError, isBurnError]);

  // Utility functions (same as CCTPBridge)
  const getStepProgress = () => {
    switch (step) {
      case 1:
        return 0;
      case 2:
        return 16;
      case 3:
        return 33;
      case 4:
        return 50;
      case 5:
        return aptosTxHash ? 66 : 60;
      case 6:
        return vaultTxHash ? 100 : 83;
      default:
        return 0;
    }
  };

  // Get step description for display
  const getStepDescription = (stepNumber: number) => {
    switch (stepNumber) {
      case 1: return "Connect Wallets";
      case 2: return "Approve USDC";
      case 3: return "Burn USDC on Base";
      case 4: return "Wait for Attestation";
      case 5: return "Receive on Aptos";
      case 6: return "Deploy Strategy to Aave";
      default: return "Unknown Step";
    }
  };

  // Handle strategy execution - start the CCTP flow
  const handleExecuteStrategy = async () => {
    if (!executionAmount || isNaN(parseFloat(executionAmount))) {
      notification.error("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(executionAmount);
    if (amount < strategy.minDeposit) {
      notification.error(`Minimum deposit is $${strategy.minDeposit}`);
      return;
    }

    setIsExecuting(true);
    notification.info("Initiating cross-chain strategy deployment...");

    try {
      // Start the CCTP flow by advancing to step 2 (approve)
      setStep(2);
      notification.info("Starting CCTP bridge process...");
    } catch (error) {
      console.error("Strategy execution failed:", error);
      notification.error("Failed to execute strategy. Please try again.");
    } finally {
      setIsExecuting(false);
    }
  };

  // Check if this is a same-chain transfer (always false for Aptos strategies)
  const isSameChainTransfer = () => {
    return false; // Always cross-chain for Aptos strategies
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl border border-gray-200 bg-white shadow-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <ArrowRightLeft className="h-5 w-5 text-blue-600" />
            <span>Deploy {strategy.name} Strategy</span>
            <Badge variant="outline">CCTP v1</Badge>
          </CardTitle>
          <CardDescription className="text-gray-600">
            Transfer funds to deploy {strategy.name} on Aptos via CCTP bridge
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Strategy Overview */}
          <div className="p-4 bg-gray-50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Strategy:</span>
              <span className="font-medium text-gray-900">{strategy.name}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Expected APY:</span>
              <span className="font-medium text-green-600">
                {strategy.expectedAPY || strategy.apy}%
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Risk Level:</span>
              <Badge className={`text-xs ${
                (strategy.riskLevel || strategy.risk) === 'Low' ? 'bg-green-100 text-green-700 border-green-200' :
                (strategy.riskLevel || strategy.risk) === 'Medium' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                'bg-red-100 text-red-700 border-red-200'
              }`}>
                {strategy.riskLevel || strategy.risk}
              </Badge>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{getStepProgress()}%</span>
            </div>
            <Progress value={getStepProgress()} className="h-2" />
          </div>

          {/* Step 1: Connect Wallets */}
          <div className={`p-4 border rounded-lg ${step === 1 ? "border-primary bg-primary/5" : "border-border"}`}>
            <h3 className="font-semibold mb-3">Step 1: Connect Wallets</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Base Wallet */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Base Sepolia Wallet</p>
                <div className={`p-2 rounded border ${address ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                  <p className="text-sm">
                    {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
                  </p>
                </div>
              </div>

              {/* Aptos Wallet */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">Aptos Wallet</p>
                {!isAptosConnected ? (
                  <div className="space-y-2">
                    {aptosWallets.map(wallet => (
                      <Button key={wallet.name} onClick={() => connectAptosWallet(wallet.name)} variant="outline" size="sm" className="w-full">
                        Connect {wallet.name}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded border border-green-200">
                    <p className="text-sm text-green-700 dark:text-green-300 mb-1">
                      Connected: {aptosWallet?.name}
                    </p>
                    <p className="text-xs font-mono mb-2">
                      {aptosAccount?.address.toString().slice(0, 6)}...{aptosAccount?.address.toString().slice(-4)}
                    </p>
                    <Button onClick={() => disconnectAptosWallet()} variant="outline" size="sm" className="w-full">
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 2: Approve USDC */}
          <div className={`p-4 border rounded-lg ${step === 2 ? "border-primary bg-primary/5" : "border-border"} ${step < 2 ? "opacity-50" : ""}`}>
            <h3 className="font-semibold mb-3">Step 2: Approve USDC Spending</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={executionAmount}
                  onChange={e => setExecutionAmount(e.target.value)}
                  placeholder="0.01"
                  className="w-32"
                  disabled={step !== 2}
                />
                <span className="text-sm">USDC</span>
              </div>
              <Button
                onClick={handleApprove}
                disabled={step < 2 || !address || isApprovePending || isApproveSuccess}
                className="w-full"
              >
                {isApprovePending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : isApproveSuccess ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Approved
                  </>
                ) : needsApproval ? (
                  "Approve"
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Already Approved
                  </>
                )}
              </Button>
              {approveTxHash && (
                <div className="text-xs">
                  Tx:{" "}
                  <a
                    href={`${config.BASE_SEPOLIA.explorer}/tx/${approveTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline inline-flex items-center"
                  >
                    {approveTxHash.slice(0, 10)}...{approveTxHash.slice(-8)}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Step 3: Burn USDC */}
          <div className={`p-4 border rounded-lg ${step === 3 ? "border-primary bg-primary/5" : "border-border"} ${step < 3 ? "opacity-50" : ""}`}>
            <h3 className="font-semibold mb-3">Step 3: Burn USDC on Base</h3>
            <p className="text-sm text-muted-foreground mb-4">
              This initiates the cross-chain transfer by burning USDC on Base Sepolia.
            </p>
            <Button
              onClick={handleBurn}
              disabled={step < 3 || !address || !isAptosConnected || isBurnPending || isBurnSuccess}
              className="w-full"
            >
              {isBurnPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : isBurnSuccess ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  USDC Burned
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Burn USDC
                </>
              )}
            </Button>
            {burnTxHash && (
              <div className="text-xs mt-2">
                Tx:{" "}
                <a
                  href={`${config.BASE_SEPOLIA.explorer}/tx/${burnTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center"
                >
                  {burnTxHash.slice(0, 10)}...{burnTxHash.slice(-8)}
                  <ExternalLink className="ml-1 h-3 w-3" />
                </a>
              </div>
            )}
          </div>

          {/* Step 4: Wait for Attestation */}
          <div className={`p-4 border rounded-lg ${step === 4 ? "border-primary bg-primary/5" : "border-border"} ${step < 4 ? "opacity-50" : ""}`}>
            <h3 className="font-semibold mb-3">Step 4: Wait for Circle Attestation</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Circle validates and attests the burn transaction. This can take 2-5 minutes.
            </p>
            {messageHash && (
              <div className="text-xs mb-3">
                Message Hash: <span className="font-mono">{messageHash.slice(0, 10)}...{messageHash.slice(-8)}</span>
              </div>
            )}
            {step === 4 && isPollingAttestation && (
              <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950 rounded">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span>Waiting for attestation...</span>
              </div>
            )}
          </div>

          {/* Step 5: Receive on Aptos */}
          <div className={`p-4 border rounded-lg ${step === 5 ? "border-primary bg-primary/5" : "border-border"} ${step < 5 ? "opacity-50" : ""}`}>
            <h3 className="font-semibold mb-3">Step 5: Receive USDC on Aptos</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Complete the transfer by receiving USDC on Aptos using your connected wallet.
            </p>

            {loadingBytecode && (
              <div className="flex items-center justify-center p-3 bg-blue-50 dark:bg-blue-950 rounded mb-4">
                <Loader2 className="mr-2 h-5 w-5 animate-spin text-primary" />
                <span>Loading transaction bytecode...</span>
              </div>
            )}

            <Button
              onClick={handleReceiveOnAptos}
              disabled={step < 5 || !attestation || !isAptosConnected || isSubmittingAptos || loadingBytecode || !bytecode}
              className="w-full"
            >
              {isSubmittingAptos ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting to Aptos...
                </>
              ) : loadingBytecode ? (
                "Loading..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Receive on Aptos
                </>
              )}
            </Button>

            {aptosTxHash && (
              <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
                <Check className="h-4 w-4 text-green-500" />
                <AlertTitle className="text-green-700 dark:text-green-300">Transfer Complete!</AlertTitle>
                <AlertDescription className="text-sm">
                  Tx:{" "}
                  <a
                    href={`${config.APTOS_TESTNET.explorer}/txn/${aptosTxHash}?network=testnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-700 dark:text-green-300 hover:underline inline-flex items-center"
                  >
                    {aptosTxHash.slice(0, 10)}...{aptosTxHash.slice(-8)}
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Step 6: Deploy Strategy to Aave */}
          <div className={`p-4 border rounded-lg ${step === 6 ? "border-primary bg-primary/5" : "border-border"} ${step < 6 ? "opacity-50" : ""}`}>
            <h3 className="font-semibold mb-3">Step 6: Deploy Strategy to Aave</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Deploy your {strategy.name} strategy by supplying USDC to Aave V3. The vault will track your position while earning real DeFi yields.
            </p>

            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Strategy Details</span>
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 space-y-1">
                <div>• Protocol: Aave V3 (Aptos)</div>
                <div>• Expected APY: {strategy.expectedAPY || strategy.apy}%</div>
                <div>• Risk Level: {strategy.riskLevel || strategy.risk}</div>
                <div>• Vault will track your position automatically</div>
                <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-700">
                  <div className="font-medium text-blue-800 dark:text-blue-200">How it works:</div>
                  <div>1. Vault contract updates tracking (on-chain)</div>
                  <div>2. Aave SDK deposits USDC to Aave pool</div>
                  <div>3. Both transactions visible on explorer</div>
                </div>
              </div>
            </div>

            <Button
              onClick={handleDepositToAave}
              disabled={step < 6 || !aptosTxHash || !isAptosConnected || isDepositingToVault || !!vaultTxHash}
              className="w-full"
            >
              {isDepositingToVault ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying Strategy...
                </>
              ) : vaultTxHash ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Strategy Deployed
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Deploy to Aave
                </>
              )}
            </Button>

            {vaultTxHash && (
              <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle className="text-green-800 dark:text-green-200 font-bold text-lg mb-3">
                  🎉 Strategy Deployed Successfully!
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Your {strategy.name} strategy is now active and earning yield on Aave V3! The vault is tracking your position.
                  </p>

                  <div className="bg-white dark:bg-green-900/20 rounded-lg p-3 space-y-2 border border-green-200 dark:border-green-700">
                    <p className="text-xs font-semibold text-green-800 dark:text-green-200 uppercase tracking-wide">
                      Transaction Details:
                    </p>

                    {vaultTrackingTxHash && (
                      <div className="space-y-1">
                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                          Step 1: Vault Tracking Update
                        </p>
                        <a
                          href={`${config.APTOS_TESTNET.explorer}/txn/${vaultTrackingTxHash}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded"
                        >
                          <span>{vaultTrackingTxHash.slice(0, 12)}...{vaultTrackingTxHash.slice(-8)}</span>
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}

                    <div className="space-y-1">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                        Step 2: Aave V3 Deposit
                      </p>
                      <a
                        href={`${config.APTOS_TESTNET.explorer}/txn/${vaultTxHash}?network=testnet`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-mono bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded"
                      >
                        <span>{vaultTxHash.slice(0, 12)}...{vaultTxHash.slice(-8)}</span>
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-900/30 p-2 rounded">
                    <Zap className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Your USDC is now earning {strategy.expectedAPY || strategy.apy}% APY on Aave V3!</p>
                      <p className="mt-1">Both transactions are visible on the Aptos explorer for full transparency.</p>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2">
            <Button
              variant="outline"
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50"
              onClick={() => {
                console.log("Cancel button clicked");
                setIsExecuting(false);
                onClose();
              }}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleExecuteStrategy}
              disabled={
                !executionAmount || 
                isNaN(parseFloat(executionAmount)) || 
                parseFloat(executionAmount) < strategy.minDeposit ||
                isExecuting ||
                isSwitchingChain ||
                step > 1
              }
            >
              {isSwitchingChain ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Switching to Base Sepolia...
                </>
              ) : isExecuting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : step > 1 ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  In Progress
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Deploy Strategy
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};