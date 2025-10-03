"use client";

/**
 * Advanced CCTP Hook - Complete Step-by-Step Process
 *
 * Flow: Approve → Burn → Attestation → Mint
 * Features: Real-time polling, detailed status, error handling
 */

import { useState, useCallback, useEffect } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { notification } from "~~/utils/scaffold-eth";

// CCTP Contract addresses (Circle's official)
const CCTP_CONTRACTS = {
  11155111: { // Ethereum Sepolia
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    domain: 0,
    name: "Ethereum Sepolia",
    explorer: "https://sepolia.etherscan.io"
  },
  84532: { // Base Sepolia
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    domain: 6,
    name: "Base Sepolia",
    explorer: "https://base-sepolia.blockscout.com"
  },
  421614: { // Arbitrum Sepolia
    tokenMessenger: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
    messageTransmitter: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    domain: 3,
    name: "Arbitrum Sepolia",
    explorer: "https://sepolia.arbiscan.io"
  }
} as const;

// CCTP Transfer steps
export enum CCTPStep {
  IDLE = 'idle',
  CHECKING_BALANCE = 'checking_balance',
  APPROVING = 'approving',
  APPROVED = 'approved',
  BURNING = 'burning',
  BURNED = 'burned',
  WAITING_ATTESTATION = 'waiting_attestation',
  ATTESTATION_READY = 'attestation_ready',
  MINTING = 'minting',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface CCTPTransfer {
  id: string;
  sourceChain: keyof typeof CCTP_CONTRACTS;
  destinationChain: keyof typeof CCTP_CONTRACTS;
  amount: string;
  recipient: string;
  currentStep: CCTPStep;
  txHash?: string;
  mintTxHash?: string;
  nonce?: string;
  timestamp: number;
  estimatedTime: number;
  timeRemaining?: number;
  error?: string;
  attestation?: {
    status: string;
    signature?: string;
    message?: string;
  };
}

// Contract ABIs - Updated to match Circle CCTP V2
const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
      { name: "hookData", type: "bytes32" },
      { name: "maxFee", type: "uint256" },
      { name: "finalityThreshold", type: "uint32" }
    ],
    name: "depositForBurn",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const MESSAGE_TRANSMITTER_ABI = [
  {
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" }
    ],
    name: "receiveMessage",
    outputs: [{ name: "success", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

const USDC_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  }
];

export function useCCTPAdvanced() {
  const { address, chainId } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [currentTransfer, setCurrentTransfer] = useState<CCTPTransfer | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transferHistory, setTransferHistory] = useState<CCTPTransfer[]>([]);

  // Get chain configuration
  const getChainConfig = useCallback((chainId: number) => {
    return CCTP_CONTRACTS[chainId as keyof typeof CCTP_CONTRACTS];
  }, []);

  // Update transfer step
  const updateTransferStep = useCallback((step: CCTPStep, data?: Partial<CCTPTransfer>) => {
    setCurrentTransfer(prev => {
      if (!prev) return null;

      const updated = {
        ...prev,
        currentStep: step,
        ...data
      };

      // Calculate time remaining based on step
      const now = Date.now();
      const elapsed = now - updated.timestamp;
      const remaining = Math.max(0, updated.estimatedTime - elapsed);
      updated.timeRemaining = remaining;

      return updated;
    });
  }, []);

  // Step 1: Check balance and allowance
  const checkBalanceAndAllowance = async (
    amount: string,
    sourceChainId: number
  ): Promise<{ hasBalance: boolean; hasAllowance: boolean; balance: string; allowance: string }> => {
    if (!address || !publicClient) throw new Error("Wallet not connected");

    const config = getChainConfig(sourceChainId);
    if (!config) throw new Error("Unsupported chain");

    updateTransferStep(CCTPStep.CHECKING_BALANCE);

    const amountWei = parseUnits(amount, 6);

    // Check USDC balance
    const balance = await publicClient.readContract({
      address: config.usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: "balanceOf",
      args: [address]
    }) as bigint;

    // Check allowance
    const allowance = await publicClient.readContract({
      address: config.usdc as `0x${string}`,
      abi: USDC_ABI,
      functionName: "allowance",
      args: [address, config.tokenMessenger]
    }) as bigint;

    return {
      hasBalance: balance >= amountWei,
      hasAllowance: allowance >= amountWei,
      balance: formatUnits(balance, 6),
      allowance: formatUnits(allowance, 6)
    };
  };

  // Step 2: Approve USDC spending
  const approveUSDC = async (amount: string, sourceChainId: number): Promise<string> => {
    if (!address || !walletClient || !publicClient) throw new Error("Wallet not connected");

    const config = getChainConfig(sourceChainId);
    if (!config) throw new Error("Unsupported chain");

    updateTransferStep(CCTPStep.APPROVING);

    const amountWei = parseUnits(amount, 6);

    console.log("🔐 Approving USDC spending:", {
      amount: amount,
      amountWei: amountWei.toString(),
      usdc: config.usdc,
      tokenMessenger: config.tokenMessenger,
      chain: config.name
    });

    try {
      // Check current allowance first
      const currentAllowance = await publicClient.readContract({
        address: config.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [address, config.tokenMessenger]
      }) as bigint;

      console.log("🔍 Current allowance check:", {
        current: formatUnits(currentAllowance, 6),
        required: amount,
        needsApproval: currentAllowance < amountWei
      });

      // Only approve if needed
      if (currentAllowance >= amountWei) {
        console.log("✅ Sufficient allowance already exists");
        updateTransferStep(CCTPStep.APPROVED, { txHash: "existing_allowance" });
        return "existing_allowance";
      }

      const approvalHash = await walletClient.writeContract({
        address: config.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "approve",
        args: [config.tokenMessenger, amountWei]
      });

      console.log("✅ Approval transaction submitted:", approvalHash);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({ hash: approvalHash });

      console.log("📋 Approval transaction receipt:", {
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString()
      });

      if (receipt.status !== "success") {
        throw new Error(`Approval transaction failed with status: ${receipt.status}`);
      }

      // Verify the approval actually worked
      const newAllowance = await publicClient.readContract({
        address: config.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "allowance",
        args: [address, config.tokenMessenger]
      }) as bigint;

      console.log("✅ Approval verification:", {
        newAllowance: formatUnits(newAllowance, 6),
        required: amount,
        sufficient: newAllowance >= amountWei
      });

      if (newAllowance < amountWei) {
        throw new Error(`Approval transaction succeeded but allowance is still insufficient. Expected: ${amount}, Got: ${formatUnits(newAllowance, 6)}`);
      }

      updateTransferStep(CCTPStep.APPROVED, { txHash: approvalHash });
      return approvalHash;
    } catch (error) {
      console.error("❌ Approval transaction error:", error);
      throw new Error(`Approval transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Step 3: Burn USDC (initiate CCTP)
  const burnUSDC = async (
    amount: string,
    sourceChainId: number,
    destinationChainId: number,
    recipient: string
  ): Promise<{ burnHash: string; nonce: string }> => {
    if (!address || !walletClient || !publicClient) throw new Error("Wallet not connected");

    const sourceConfig = getChainConfig(sourceChainId);
    const destConfig = getChainConfig(destinationChainId);

    if (!sourceConfig || !destConfig) throw new Error("Unsupported chain");

    updateTransferStep(CCTPStep.BURNING);

    const amountWei = parseUnits(amount, 6);
    // Convert recipient address to bytes32 format (exactly matching backend implementation)
    const recipientBytes32 = `0x${"0".repeat(24)}${recipient.slice(2)}` as `0x${string}`;
    
    console.log("👤 Recipient formatting (matching backend):", {
      original: recipient,
      formatted: recipientBytes32,
      length: recipientBytes32.length,
      backendFormat: `0x${"0".repeat(24)}${recipient.slice(2)}`
    });

    // Validate recipient address
    if (!recipient || !recipient.startsWith('0x') || recipient.length !== 42) {
      throw new Error(`Invalid recipient address: ${recipient}`);
    }

    // Check balance and allowance before burning
    const balanceInfo = await checkBalanceAndAllowance(amount, sourceChainId);
    console.log("💰 Balance and allowance check:", balanceInfo);

    if (!balanceInfo.hasBalance) {
      throw new Error(`Insufficient USDC balance. Required: ${amount}, Available: ${balanceInfo.balance}`);
    }

    if (!balanceInfo.hasAllowance) {
      console.error("❌ Insufficient allowance detected:", {
        required: amount,
        approved: balanceInfo.allowance,
        user: address,
        tokenMessenger: sourceConfig.tokenMessenger,
        usdc: sourceConfig.usdc
      });
      
      // Try to approve again automatically
      console.log("🔄 Attempting to approve USDC again...");
      try {
        await approveUSDC(amount, sourceChainId);
        console.log("✅ Re-approval successful, retrying burn...");
      } catch (approvalError) {
        console.error("❌ Re-approval failed:", approvalError);
        throw new Error(`Insufficient allowance. Required: ${amount}, Approved: ${balanceInfo.allowance}. Please approve USDC spending first.`);
      }
    }

    // Verify CCTP contracts are accessible
    try {
      const tokenMessengerCode = await publicClient.getBytecode({ 
        address: sourceConfig.tokenMessenger as `0x${string}` 
      });
      if (!tokenMessengerCode || tokenMessengerCode === "0x") {
        throw new Error("TokenMessenger contract not found or not deployed");
      }
      console.log("✅ TokenMessenger contract verified");
    } catch (error) {
      console.error("❌ TokenMessenger contract check failed:", error);
      throw new Error(`TokenMessenger contract not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Check if USDC is paused
    try {
      const isPaused = await publicClient.readContract({
        address: sourceConfig.usdc as `0x${string}`,
        abi: USDC_ABI,
        functionName: "paused"
      });
      if (isPaused) {
        throw new Error("USDC contract is paused - transfers are disabled");
      }
      console.log("✅ USDC contract is not paused");
    } catch (error) {
      console.error("❌ USDC pause check failed:", error);
      throw new Error(`USDC contract check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log("🌐 Attempting CCTP transfer to domain", destConfig.domain, `(${destConfig.name})`);

    console.log("🔥 Burning USDC with parameters:", {
      amount: amount,
      amountWei: amountWei.toString(),
      sourceChain: sourceConfig.name,
      destinationChain: destConfig.name,
      recipient: recipient,
      recipientBytes32: recipientBytes32,
      tokenMessenger: sourceConfig.tokenMessenger,
      usdc: sourceConfig.usdc,
      destinationDomain: destConfig.domain
    });

    try {
      // Circle CCTP V2 parameters (matching backend implementation exactly)
      const hookData = "0x" + "0".repeat(64); // Empty bytes32
      const maxFee = amountWei - 1n; // Slightly less than burn amount (exactly like backend)
      const finalityThreshold = 2000; // Standard transfer (1000 for fast)

      console.log("🔥 CCTP V2 Parameters:", {
        amountWei: amountWei.toString(),
        destinationDomain: destConfig.domain,
        recipientBytes32: recipientBytes32,
        burnToken: sourceConfig.usdc,
        hookData: hookData,
        maxFee: maxFee.toString(),
        finalityThreshold: finalityThreshold
      });

      // Try to simulate the transaction first to catch revert reasons
      try {
        console.log("🔍 Simulating burn transaction...");
        await publicClient.simulateContract({
          address: sourceConfig.tokenMessenger as `0x${string}`,
          abi: TOKEN_MESSENGER_ABI,
          functionName: "depositForBurn",
          args: [
            amountWei,
            destConfig.domain,
            recipientBytes32,
            sourceConfig.usdc,
            hookData,
            maxFee,
            finalityThreshold
          ],
          account: address as `0x${string}`
        });
        console.log("✅ Transaction simulation successful");
      } catch (simError) {
        console.error("❌ Transaction simulation failed:", simError);
        throw new Error(`Transaction simulation failed: ${simError instanceof Error ? simError.message : 'Unknown error'}`);
      }

      const burnHash = await walletClient.writeContract({
        address: sourceConfig.tokenMessenger as `0x${string}`,
        abi: TOKEN_MESSENGER_ABI,
        functionName: "depositForBurn",
        args: [
          amountWei,
          destConfig.domain,
          recipientBytes32,
          sourceConfig.usdc,
          hookData,
          maxFee,
          finalityThreshold
        ],
        gas: 200000n, // Match backend gas limit
      });

      console.log("✅ Burn transaction submitted:", burnHash);

      // Wait for confirmation and extract nonce
      const receipt = await publicClient.waitForTransactionReceipt({ hash: burnHash });

      console.log("📋 Burn transaction receipt:", {
        status: receipt.status,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber.toString(),
        logs: receipt.logs.length,
        effectiveGasPrice: receipt.effectiveGasPrice?.toString()
      });

      if (receipt.status !== "success") {
        // Try to get more details about the revert
        try {
          const tx = await publicClient.getTransaction({ hash: burnHash });
          console.log("🔍 Transaction details:", {
            from: tx.from,
            to: tx.to,
            value: tx.value?.toString(),
            gas: tx.gas?.toString(),
            gasPrice: tx.gasPrice?.toString(),
            input: tx.input
          });
        } catch (error) {
          console.log("❌ Could not fetch transaction details:", error);
        }

        // Check if there are any revert reasons in logs
        if (receipt.logs.length > 0) {
          console.log("📋 Transaction logs:", receipt.logs);
        }

        throw new Error(`Burn transaction failed with status: ${receipt.status}`);
      }

      // Extract nonce from MessageSent event (CCTP V2)
      let nonce = "";

      // MessageSent event signature: keccak256("MessageSent(bytes)")
      const messageSentSignature = "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036";

      console.log("📋 Analyzing transaction logs for nonce:", {
        totalLogs: receipt.logs.length,
        messageSentSignature: messageSentSignature
      });

      // Look for MessageSent event in logs
      for (const log of receipt.logs) {
        try {
          console.log("🔍 Checking log:", {
            topics: log.topics,
            data: log.data,
            address: log.address
          });

          if (log.topics[0] === messageSentSignature) {
            // Nonce is typically in the second topic
            if (log.topics[1]) {
              nonce = parseInt(log.topics[1], 16).toString();
              console.log("✅ Found nonce in MessageSent event:", nonce);
              break;
            }
          }
        } catch (error) {
          console.warn("Error parsing log:", error);
        }
      }

      // Fallback: try other logs if MessageSent not found
      if (!nonce) {
        console.log("🔍 MessageSent event not found, trying fallback extraction...");
        for (const log of receipt.logs) {
          if (log.topics.length >= 2) {
            try {
              const potentialNonce = log.topics[1];
              const nonceValue = parseInt(potentialNonce, 16);
              if (nonceValue > 0 && nonceValue < 2**32) { // Reasonable nonce range
                nonce = nonceValue.toString();
                console.log("✅ Found nonce in fallback:", nonce);
                break;
              }
            } catch (error) {
              continue;
            }
          }
        }
      }

      // Final fallback if nonce extraction fails
      if (!nonce) {
        nonce = `fallback_${Date.now()}`;
        console.warn("❌ Could not extract nonce from transaction logs, using fallback");
      } else {
        console.log("✅ Nonce extracted successfully:", nonce);
      }

      updateTransferStep(CCTPStep.BURNED, {
        txHash: burnHash,
        nonce: nonce
      });

      return { burnHash, nonce };

    } catch (error) {
      console.error("❌ Burn transaction error:", error);
      throw new Error(`Burn transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Step 4: Wait for attestation
  const waitForAttestation = async (txHash: string): Promise<{ message: string; signature: string }> => {
    updateTransferStep(CCTPStep.WAITING_ATTESTATION);

    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 180; // 30 minutes (10 second intervals) - testnets can be slow

      const pollAttestation = async () => {
        if (attempts >= maxAttempts) {
          console.error(`❌ Attestation timeout after ${maxAttempts} attempts (${maxAttempts * 10} seconds)`);
          console.error(`🔍 Final transaction hash: ${txHash}`);
          console.error(`🔍 Final API URL: https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=${txHash}`);
          console.error(`ℹ️ Note: Testnet attestations can take 15-30+ minutes. Transaction was successful.`);
          reject(new Error(`Attestation timeout after ${maxAttempts} attempts (${maxAttempts * 10} seconds). Transaction was successful but attestation is delayed on testnet. Hash: ${txHash}`));
          return;
        }

        try {
          // Circle's CCTP V2 API - correct format with sourceDomainId
          // Base Sepolia has domain 6, so we use that as sourceDomainId
          const sourceDomainId = 6; // Base Sepolia domain
          const response = await fetch(
            `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomainId}?transactionHash=${txHash}`
          );

          if (response.ok) {
            const data = await response.json();
            console.log("🔍 Attestation API response:", data);

            // Circle's V2 API returns messages array
            if (data.messages && data.messages.length > 0) {
              const message = data.messages[0];
              console.log("📋 Found message:", message);
              console.log("🔍 Status check:", {
                status: message.status,
                attestation: message.attestation,
                isComplete: message.status === 'complete',
                hasAttestation: !!message.attestation,
                attestationNotPending: message.attestation !== 'PENDING'
              });

              if (message.status === 'complete' && message.attestation && message.attestation !== 'PENDING') {
                updateTransferStep(CCTPStep.ATTESTATION_READY, {
                  attestation: {
                    status: message.status,
                    signature: message.attestation,
                    message: message.message
                  }
                });

                resolve({
                  message: message.message,
                  signature: message.attestation
                });
                return;
              } else if (message.status === 'pending' || message.status === 'pending_confirmations') {
                updateTransferStep(CCTPStep.WAITING_ATTESTATION, {
                  attestation: {
                    status: message.status
                  }
                });
                console.log(`⏳ Attestation status: ${message.status} (attempt ${attempts + 1}/${maxAttempts})`);
              }
            }
          } else if (response.status === 404) {
            console.log(`⏳ Attestation not found yet (attempt ${attempts + 1}/${maxAttempts}), waiting...`);
            console.log(`🔍 Checking transaction: ${txHash}`);
          } else {
            console.log("⏳ Attestation not ready yet, status:", response.status);
            const errorText = await response.text();
            console.log("Error details:", errorText);
            
            // If we get a 400 or other error, the transaction might be invalid
            if (response.status === 400) {
              console.error("❌ Bad request - transaction hash might be invalid:", txHash);
              reject(new Error(`Invalid transaction hash: ${txHash}`));
              return;
            }
          }

          attempts++;
          setTimeout(pollAttestation, 10000); // Poll every 10 seconds

        } catch (error) {
          console.warn("Attestation polling error:", error);
          attempts++;
          setTimeout(pollAttestation, 10000);
        }
      };

      // Start polling after 30 seconds
      setTimeout(pollAttestation, 30000);
    });
  };

  // Step 5: Mint on destination chain (optional - user can do manually)
  const mintOnDestination = async (
    destinationChainId: number,
    message: string,
    signature: string
  ): Promise<string> => {
    if (!address || !walletClient || !publicClient) throw new Error("Wallet not connected");

    const config = getChainConfig(destinationChainId);
    if (!config) throw new Error("Unsupported chain");

    updateTransferStep(CCTPStep.MINTING);

    const mintHash = await walletClient.writeContract({
      address: config.messageTransmitter as `0x${string}`,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [message as `0x${string}`, signature as `0x${string}`]
    });

    await publicClient.waitForTransactionReceipt({ hash: mintHash });

    updateTransferStep(CCTPStep.COMPLETED, { mintTxHash: mintHash });
    return mintHash;
  };

  // Main function: Execute complete CCTP transfer
  const executeCompleteTransfer = async (
    amount: string,
    destinationChainId: number,
    recipient: string
  ) => {
    if (!chainId || !address) {
      notification.error("Please connect your wallet");
      return;
    }

    const sourceChainId = chainId;
    const transferId = `cctp_${Date.now()}`;

    // Initialize transfer
    const transfer: CCTPTransfer = {
      id: transferId,
      sourceChain: sourceChainId as keyof typeof CCTP_CONTRACTS,
      destinationChain: destinationChainId as keyof typeof CCTP_CONTRACTS,
      amount,
      recipient,
      currentStep: CCTPStep.IDLE,
      timestamp: Date.now(),
      estimatedTime: 15 * 60 * 1000 // 15 minutes
    };

    setCurrentTransfer(transfer);
    setIsProcessing(true);

    try {
      // Step 1: Check balance and allowance
      const { hasBalance, hasAllowance, balance } = await checkBalanceAndAllowance(amount, sourceChainId);

      if (!hasBalance) {
        throw new Error(`Insufficient USDC balance. You have ${balance} USDC, need ${amount} USDC`);
      }

      // Step 2: Approve if needed
      if (!hasAllowance) {
        notification.info("Please approve USDC spending in your wallet");
        await approveUSDC(amount, sourceChainId);
        notification.success("USDC approval confirmed!");
      }

      // Step 3: Burn USDC
      notification.info("Please confirm the CCTP burn transaction in your wallet");
      const { burnHash } = await burnUSDC(amount, sourceChainId, destinationChainId, recipient);
      notification.success("CCTP burn transaction confirmed! Waiting for attestation...");

      // Step 4: Wait for attestation
      await waitForAttestation(burnHash);
      notification.success("Attestation ready! You can now mint on the destination chain.");

      // Step 5: Auto-mint (optional)
      // For demo, we'll just mark as attestation ready
      // User can manually mint or we can provide a button

      // Add to history
      setTransferHistory(prev => [...prev, { ...transfer, currentStep: CCTPStep.ATTESTATION_READY }]);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      updateTransferStep(CCTPStep.FAILED, { error: errorMessage });
      notification.error(`CCTP transfer failed: ${errorMessage}`);
      console.error("CCTP transfer error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset current transfer
  const resetTransfer = useCallback(() => {
    setCurrentTransfer(null);
    setIsProcessing(false);
  }, []);

  // Get step progress percentage
  const getStepProgress = useCallback((step: CCTPStep): number => {
    const stepProgress = {
      [CCTPStep.IDLE]: 0,
      [CCTPStep.CHECKING_BALANCE]: 10,
      [CCTPStep.APPROVING]: 20,
      [CCTPStep.APPROVED]: 30,
      [CCTPStep.BURNING]: 40,
      [CCTPStep.BURNED]: 50,
      [CCTPStep.WAITING_ATTESTATION]: 60,
      [CCTPStep.ATTESTATION_READY]: 80,
      [CCTPStep.MINTING]: 90,
      [CCTPStep.COMPLETED]: 100,
      [CCTPStep.FAILED]: 0
    };
    return stepProgress[step] || 0;
  }, []);

  // Get step description
  const getStepDescription = useCallback((step: CCTPStep): string => {
    const descriptions = {
      [CCTPStep.IDLE]: "Ready to start",
      [CCTPStep.CHECKING_BALANCE]: "Checking USDC balance...",
      [CCTPStep.APPROVING]: "Approving USDC spending...",
      [CCTPStep.APPROVED]: "USDC spending approved",
      [CCTPStep.BURNING]: "Burning USDC on source chain...",
      [CCTPStep.BURNED]: "USDC burned successfully",
      [CCTPStep.WAITING_ATTESTATION]: "Waiting for Circle attestation...",
      [CCTPStep.ATTESTATION_READY]: "Attestation ready - can mint on destination",
      [CCTPStep.MINTING]: "Minting USDC on destination chain...",
      [CCTPStep.COMPLETED]: "Transfer completed successfully!",
      [CCTPStep.FAILED]: "Transfer failed"
    };
    return descriptions[step] || "Unknown step";
  }, []);

  // Get supported chains
  const getSupportedChains = useCallback(() => {
    return Object.entries(CCTP_CONTRACTS).map(([chainId, config]) => ({
      chainId: parseInt(chainId),
      name: config.name,
      domain: config.domain
    }));
  }, []);

  // Check which domains are supported by a TokenMessenger
  const getSupportedDomains = useCallback(async (sourceChainId: number) => {
    if (!publicClient) return [];
    
    const sourceConfig = getChainConfig(sourceChainId);
    if (!sourceConfig) return [];

    const supportedDomains = [];
    
    // Check common domains
    const domainsToCheck = [0, 1, 3, 6, 7]; // Ethereum, Avalanche, Arbitrum, Base, Polygon
    
    for (const domain of domainsToCheck) {
      try {
        const remoteTokenMessenger = await publicClient.readContract({
          address: sourceConfig.tokenMessenger as `0x${string}`,
          abi: [
            {
              inputs: [{ name: "domain", type: "uint32" }],
              name: "remoteTokenMessenger",
              outputs: [{ name: "", type: "bytes32" }],
              stateMutability: "view",
              type: "function"
            }
          ],
          functionName: "remoteTokenMessenger",
          args: [domain]
        });
        
        if (remoteTokenMessenger !== "0x0000000000000000000000000000000000000000000000000000000000000000") {
          supportedDomains.push(domain);
        }
      } catch (error) {
        console.log(`Domain ${domain} not supported:`, error);
      }
    }
    
    return supportedDomains;
  }, [publicClient, getChainConfig]);

  return {
    // State
    currentTransfer,
    isProcessing,
    transferHistory,

    // Functions
    executeCompleteTransfer,
    resetTransfer,
    mintOnDestination,
    checkBalanceAndAllowance,
    approveUSDC,

    // Utilities
    getStepProgress,
    getStepDescription,
    getSupportedChains,
    getChainConfig,

    // Constants
    CCTPStep
  };
}