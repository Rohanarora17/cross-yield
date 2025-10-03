"use client";

import React from "react";
import { CCTPTransfer, CCTPStep } from "~~/hooks/useCCTPAdvanced";
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

interface CCTPHistoryProps {
  transfers: CCTPTransfer[];
  className?: string;
}

export const CCTPHistory: React.FC<CCTPHistoryProps> = ({ transfers, className = "" }) => {
  if (transfers.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Transfer History</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-500">No transfers yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Your CCTP transfer history will appear here
          </p>
        </div>
      </div>
    );
  }

  const getStatusIcon = (step: CCTPStep) => {
    switch (step) {
      case CCTPStep.COMPLETED:
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case CCTPStep.FAILED:
        return <ExclamationCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (step: CCTPStep) => {
    switch (step) {
      case CCTPStep.COMPLETED:
        return "text-green-700 bg-green-50";
      case CCTPStep.FAILED:
        return "text-red-700 bg-red-50";
      default:
        return "text-yellow-700 bg-yellow-50";
    }
  };

  const getStepLabel = (step: CCTPStep) => {
    const labels = {
      [CCTPStep.IDLE]: "Initiated",
      [CCTPStep.CHECKING_BALANCE]: "Checking Balance",
      [CCTPStep.APPROVING]: "Approving",
      [CCTPStep.APPROVED]: "Approved",
      [CCTPStep.BURNING]: "Burning",
      [CCTPStep.BURNED]: "Burned",
      [CCTPStep.WAITING_ATTESTATION]: "Waiting Attestation",
      [CCTPStep.ATTESTATION_READY]: "Attestation Ready",
      [CCTPStep.MINTING]: "Minting",
      [CCTPStep.COMPLETED]: "Completed",
      [CCTPStep.FAILED]: "Failed"
    };
    return labels[step] || "Unknown";
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return "Just now";
  };

  const getChainConfig = (chainId: keyof typeof chainConfigs) => {
    const chainConfigs = {
      11155111: { name: "Ethereum Sepolia", explorer: "https://sepolia.etherscan.io" },
      84532: { name: "Base Sepolia", explorer: "https://base-sepolia.blockscout.com" }
    };
    return chainConfigs[chainId];
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Transfer History</h3>
        <div className="text-sm text-gray-500">
          {transfers.length} transfer{transfers.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="space-y-4">
        {transfers.slice().reverse().map((transfer) => {
          const sourceConfig = getChainConfig(transfer.sourceChain);
          const destConfig = getChainConfig(transfer.destinationChain);

          return (
            <div
              key={transfer.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getStatusIcon(transfer.currentStep)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {transfer.amount} USDC
                    </div>
                    <div className="text-sm text-gray-600">
                      {sourceConfig?.name} → {destConfig?.name}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transfer.currentStep)}`}>
                    {getStepLabel(transfer.currentStep)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatTimeAgo(transfer.timestamp)}
                  </div>
                </div>
              </div>

              {transfer.error && (
                <div className="mb-3 p-2 bg-red-50 rounded text-sm text-red-700">
                  Error: {transfer.error}
                </div>
              )}

              {/* Progress bar */}
              <div className="mb-3">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      transfer.currentStep === CCTPStep.COMPLETED ? 'bg-green-500' :
                      transfer.currentStep === CCTPStep.FAILED ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{
                      width: `${transfer.currentStep === CCTPStep.COMPLETED ? 100 :
                              transfer.currentStep === CCTPStep.FAILED ? 100 :
                              Math.max(10, Math.min(90,
                                transfer.currentStep === CCTPStep.BURNED ? 50 :
                                transfer.currentStep === CCTPStep.WAITING_ATTESTATION ? 70 :
                                transfer.currentStep === CCTPStep.ATTESTATION_READY ? 90 : 30
                              ))}%`
                    }}
                  />
                </div>
              </div>

              {/* Transaction links */}
              <div className="flex flex-wrap gap-3 text-xs">
                {transfer.txHash && (
                  <a
                    href={`${sourceConfig?.explorer}/tx/${transfer.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Burn Transaction ↗
                  </a>
                )}
                {transfer.mintTxHash && (
                  <a
                    href={`${destConfig?.explorer}/tx/${transfer.mintTxHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Mint Transaction ↗
                  </a>
                )}
                {transfer.nonce && (
                  <div className="text-gray-500">
                    Nonce: {transfer.nonce}
                  </div>
                )}
              </div>

              {/* Recipient */}
              <div className="mt-2 text-xs text-gray-500">
                To: {transfer.recipient.slice(0, 6)}...{transfer.recipient.slice(-4)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};