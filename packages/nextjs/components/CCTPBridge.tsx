// CCTP Bridge Component - Base Sepolia → Aptos Testnet
// Implements Circle's CCTP v1 for cross-chain USDC transfers
"use client";

import { useState, useEffect } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from "wagmi";
import { parseUnits } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet as useAptosWallet } from "@aptos-labs/wallet-adapter-react";
import { MoveVector } from "@aptos-labs/ts-sdk";
import { keccak256, toUtf8Bytes, AbiCoder } from "ethers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";
import { Loader2, Check, X, ArrowRight, ExternalLink, AlertCircle } from "lucide-react";
import { CCTP_V1_CONFIG, TOKEN_MESSENGER_ABI, USDC_ABI } from "~~/config/cctp-aptos.config";
import { useAptosVault } from "~~/hooks/useAptosVault";

const config = CCTP_V1_CONFIG;

export function CCTPBridge() {
  // State
  const [amount, setAmount] = useState("0.01");
  const [step, setStep] = useState(1); // 1: Connect, 2: Approve, 3: Burn, 4: Attestation, 5: Receive, 6: Deposit to Vault
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
  const [isDepositingToVault, setIsDepositingToVault] = useState(false);

  // Wagmi hooks (EVM - Base Sepolia)
  const { address, isConnected } = useAccount();

  // Aptos wallet hooks
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
  const amountInSmallestUnits = parseUnits(amount || "0", 6);

  // Check USDC allowance
  const { data: allowanceData } = useReadContract({
    address: config.BASE_SEPOLIA.usdc as `0x${string}`,
    abi: USDC_ABI,
    functionName: "allowance",
    args: [address || "0x0", config.BASE_SEPOLIA.tokenMessenger],
    query: {
      enabled: isConnected && !!address,
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

  // Load bytecode when needed
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

  // Handle approve
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

  // Handle burn
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

  // Extract message bytes from burn transaction
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

  // Poll for attestation
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
    if (isConnected && isAptosConnected && step === 1) {
      console.log("Both wallets connected, advancing to Step 2");
      setStep(2);
    }
  }, [isConnected, isAptosConnected, step]);

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

  // Handle completing the transfer on Aptos
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
      setStep(6); // Auto-advance to vault deposit step
    } catch (err: unknown) {
      console.error("Aptos transaction error:", err);
      setError(err instanceof Error ? err.message : "Failed to complete transfer on Aptos");
      setIsSubmittingAptos(false);
    }
  };

  // Handle depositing to vault
  const handleDepositToVault = async () => {
    if (!aptosAccount) {
      setError("Please connect your Aptos wallet");
      return;
    }

    try {
      setIsDepositingToVault(true);
      setError("");

      // Admin address - using user's address for now (in production, this should be the vault admin)
      const adminAddress = aptosAccount.address.toString();

      const txHash = await depositToVault(parseFloat(amount), adminAddress);

      setVaultTxHash(txHash);
      setIsDepositingToVault(false);
    } catch (err: unknown) {
      console.error("Vault deposit error:", err);
      setError(err instanceof Error ? err.message : "Failed to deposit to vault");
      setIsDepositingToVault(false);
    }
  };

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

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Bridge USDC to Aptos</span>
          <Badge variant="outline">CCTP v1</Badge>
        </CardTitle>
        <CardDescription>Transfer USDC from Base Sepolia to Aptos using Circle's CCTP</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
              <div className="scale-75 origin-top-left">
                <ConnectButton />
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
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.01"
                className="w-32"
                disabled={step !== 2}
              />
              <span className="text-sm">USDC</span>
            </div>
            <Button
              onClick={handleApprove}
              disabled={step < 2 || !isConnected || isApprovePending || isApproveSuccess}
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
            disabled={step < 3 || !isConnected || !isAptosConnected || isBurnPending || isBurnSuccess}
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

        {/* Step 6: Deposit to Vault */}
        <div className={`p-4 border rounded-lg ${step === 6 ? "border-primary bg-primary/5" : "border-border"} ${step < 6 ? "opacity-50" : ""}`}>
          <h3 className="font-semibold mb-3">Step 6: Deposit to Vault</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Deposit your USDC into the yield-optimizing vault to start earning DeFi yields.
          </p>

          <Button
            onClick={handleDepositToVault}
            disabled={step < 6 || !aptosTxHash || !isAptosConnected || isDepositingToVault || !!vaultTxHash}
            className="w-full"
          >
            {isDepositingToVault ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Depositing to Vault...
              </>
            ) : vaultTxHash ? (
              <>
                <Check className="mr-2 h-4 w-4" />
                Deposited to Vault
              </>
            ) : (
              <>
                <ArrowRight className="mr-2 h-4 w-4" />
                Deposit to Vault
              </>
            )}
          </Button>

          {vaultTxHash && (
            <Alert className="mt-4 border-green-500 bg-green-50 dark:bg-green-950">
              <Check className="h-4 w-4 text-green-500" />
              <AlertTitle className="text-green-700 dark:text-green-300">Vault Deposit Complete!</AlertTitle>
              <AlertDescription className="text-sm">
                Your USDC is now earning yield in the vault.{" "}
                <a
                  href={`${config.APTOS_TESTNET.explorer}/txn/${vaultTxHash}?network=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-700 dark:text-green-300 hover:underline inline-flex items-center"
                >
                  View transaction <ExternalLink className="ml-1 h-3 w-3" />
                </a>
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

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200">
          <h4 className="text-sm font-semibold mb-2">How CCTP Works</h4>
          <p className="text-xs text-muted-foreground">
            Circle's CCTP enables native USDC transfers across chains. The process involves burning USDC on the source
            chain, waiting for Circle's attestation, and minting equivalent USDC on the destination chain.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
