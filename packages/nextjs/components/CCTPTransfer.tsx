"use client";

import React, { useState, useEffect } from "react";
import { useCCTPAdvanced, CCTPStep } from "~~/hooks/useCCTPAdvanced";
import { useAccount, useSwitchChain } from "wagmi";
import { ChevronRightIcon, CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

interface CCTPTransferProps {
  className?: string;
}

export const CCTPTransfer: React.FC<CCTPTransferProps> = ({ className = "" }) => {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  const {
    currentTransfer,
    isProcessing,
    executeCompleteTransfer,
    resetTransfer,
    getStepProgress,
    getStepDescription,
    getSupportedChains,
    getChainConfig,
    CCTPStep
  } = useCCTPAdvanced();

  const [amount, setAmount] = useState("");
  const [destinationChainId, setDestinationChainId] = useState<number>(11155111);
  const [recipient, setRecipient] = useState("");

  const supportedChains = getSupportedChains();
  const currentChainConfig = chainId ? getChainConfig(chainId) : null;
  const destinationChainConfig = getChainConfig(destinationChainId);

  // Auto-fill recipient with current address
  useEffect(() => {
    if (address && !recipient) {
      setRecipient(address);
    }
  }, [address, recipient]);

  const handleTransfer = async () => {
    if (!amount || !recipient) {
      alert("Please fill in all fields");
      return;
    }

    await executeCompleteTransfer(amount, destinationChainId, recipient);
  };

  const renderStepIndicator = () => {
    if (!currentTransfer) return null;

    const steps = [
      { step: CCTPStep.CHECKING_BALANCE, label: "Check Balance", icon: "💰" },
      { step: CCTPStep.APPROVING, label: "Approve USDC", icon: "✅" },
      { step: CCTPStep.BURNING, label: "Burn USDC", icon: "🔥" },
      { step: CCTPStep.WAITING_ATTESTATION, label: "Attestation", icon: "⏳" },
      { step: CCTPStep.ATTESTATION_READY, label: "Ready to Mint", icon: "🎯" },
      { step: CCTPStep.COMPLETED, label: "Completed", icon: "🎉" }
    ];

    const currentStepIndex = steps.findIndex(s => s.step === currentTransfer.currentStep);
    const progress = getStepProgress(currentTransfer.currentStep);

    return (
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Transfer Progress</h3>
          <div className="text-sm text-gray-500">
            {Math.round(progress)}% Complete
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between items-center">
          {steps.map((stepInfo, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex || currentTransfer.currentStep === CCTPStep.COMPLETED;
            const isFailed = currentTransfer.currentStep === CCTPStep.FAILED && index === currentStepIndex;

            return (
              <div key={stepInfo.step} className="flex flex-col items-center">
                <div className={`
                  relative w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold
                  ${isCompleted ? 'bg-green-500 text-white' :
                    isActive ? 'bg-blue-500 text-white animate-pulse' :
                    isFailed ? 'bg-red-500 text-white' :
                    'bg-gray-200 text-gray-600'}
                  transition-all duration-300
                `}>
                  {isCompleted ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : isFailed ? (
                    <ExclamationCircleIcon className="w-6 h-6" />
                  ) : isActive ? (
                    <ClockIcon className="w-6 h-6" />
                  ) : (
                    <span>{stepInfo.icon}</span>
                  )}
                </div>
                <div className={`
                  mt-2 text-xs text-center max-w-16
                  ${isActive ? 'text-blue-600 font-semibold' :
                    isCompleted ? 'text-green-600' :
                    isFailed ? 'text-red-600' :
                    'text-gray-500'}
                `}>
                  {stepInfo.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current Step Description */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">
                {getStepDescription(currentTransfer.currentStep)}
              </p>
              {currentTransfer.error && (
                <p className="text-sm text-red-600 mt-1">{currentTransfer.error}</p>
              )}
            </div>
            {isProcessing && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
            )}
          </div>

          {/* Transaction Links */}
          {currentTransfer.txHash && (
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                href={`${currentChainConfig?.explorer}/tx/${currentTransfer.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                View Burn Transaction ↗
              </a>
              {currentTransfer.mintTxHash && (
                <a
                  href={`${destinationChainConfig?.explorer}/tx/${currentTransfer.mintTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:text-blue-800 underline"
                >
                  View Mint Transaction ↗
                </a>
              )}
            </div>
          )}

          {/* Time Remaining */}
          {currentTransfer.timeRemaining && currentTransfer.timeRemaining > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              Estimated time remaining: {Math.ceil(currentTransfer.timeRemaining / 60000)} minutes
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-4 flex gap-3">
          {currentTransfer.currentStep === CCTPStep.ATTESTATION_READY && (
            <button
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              disabled={isProcessing}
            >
              🎯 Mint on {destinationChainConfig?.name}
            </button>
          )}

          {(currentTransfer.currentStep === CCTPStep.COMPLETED || currentTransfer.currentStep === CCTPStep.FAILED) && (
            <button
              onClick={resetTransfer}
              className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Start New Transfer
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderTransferForm = () => {
    if (currentTransfer && currentTransfer.currentStep !== CCTPStep.COMPLETED && currentTransfer.currentStep !== CCTPStep.FAILED) {
      return null; // Hide form during transfer
    }

    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-2xl">🌉</div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Cross-Chain USDC Transfer</h2>
            <p className="text-sm text-gray-600">
              Transfer USDC across chains using Circle's CCTP
            </p>
          </div>
        </div>

        {/* Chain Selection */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Chain
            </label>
            <div className="relative">
              <select
                className="w-full p-3 border border-gray-300 rounded-lg bg-white"
                value={chainId || ""}
                onChange={(e) => {
                  const newChainId = parseInt(e.target.value);
                  if (switchChain && newChainId !== chainId) {
                    switchChain({ chainId: newChainId });
                  }
                }}
              >
                <option value="">Select chain...</option>
                {supportedChains.map((chain) => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name}
                  </option>
                ))}
              </select>
              {currentChainConfig && (
                <div className="absolute right-3 top-3 w-3 h-3 bg-green-500 rounded-full" />
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To Chain
            </label>
            <select
              className="w-full p-3 border border-gray-300 rounded-lg"
              value={destinationChainId}
              onChange={(e) => setDestinationChainId(parseInt(e.target.value))}
            >
              {supportedChains
                .filter(chain => chain.chainId !== chainId)
                .map((chain) => (
                  <option key={chain.chainId} value={chain.chainId}>
                    {chain.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Amount Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount (USDC)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.000001"
              placeholder="0.0"
              className="w-full p-3 border border-gray-300 rounded-lg pr-16"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="absolute right-3 top-3 text-gray-500">USDC</div>
          </div>
        </div>

        {/* Recipient */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <input
            type="text"
            placeholder="0x..."
            className="w-full p-3 border border-gray-300 rounded-lg"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-1">
            Address on {destinationChainConfig?.name} to receive USDC
          </p>
        </div>

        {/* Transfer Info */}
        {amount && destinationChainConfig && currentChainConfig && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="text-blue-600">ℹ️</div>
              <div className="text-sm font-medium text-blue-900">Transfer Summary</div>
            </div>
            <div className="text-sm text-blue-800 space-y-1">
              <div>Amount: {amount} USDC</div>
              <div>From: {currentChainConfig.name}</div>
              <div>To: {destinationChainConfig.name}</div>
              <div>Estimated time: 3-15 minutes</div>
              <div>Fee: Included in transaction gas</div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={handleTransfer}
          disabled={!address || !amount || !recipient || isProcessing || !currentChainConfig}
          className={`
            w-full py-3 px-4 rounded-lg font-semibold transition-all
            ${address && amount && recipient && currentChainConfig && !isProcessing
              ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'}
          `}
        >
          {!address ? "Connect Wallet" :
           !currentChainConfig ? "Switch to Supported Chain" :
           isProcessing ? "Processing..." :
           "🚀 Start CCTP Transfer"}
        </button>

        {/* Chain Switch Helper */}
        {address && !currentChainConfig && (
          <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
            <div className="text-sm text-yellow-800">
              Please switch to a supported chain to use CCTP transfers.
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`max-w-2xl mx-auto space-y-6 ${className}`}>
      {renderStepIndicator()}
      {renderTransferForm()}

      {/* Help Section */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-xl">💡</div>
          <h3 className="font-semibold text-gray-900">How CCTP Works</h3>
        </div>
        <div className="text-sm text-gray-700 space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span><strong>Approve:</strong> Allow the contract to spend your USDC</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span><strong>Burn:</strong> USDC is burned on the source chain</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span><strong>Attestation:</strong> Circle verifies the burn transaction</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
            <span><strong>Mint:</strong> New USDC is minted on the destination chain</span>
          </div>
        </div>
      </div>
    </div>
  );
};