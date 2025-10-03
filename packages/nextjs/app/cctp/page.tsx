"use client";

import { CCTPTransfer } from "~~/components/CCTPTransfer";
import { CCTPHistory } from "~~/components/CCTPHistory";
import { useCCTPAdvanced } from "~~/hooks/useCCTPAdvanced";
import { useAccount } from "wagmi";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

export default function CCTPPage() {
  const { isConnected } = useAccount();
  const { transferHistory } = useCCTPAdvanced();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <div className="text-2xl">🌉</div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Cross-Chain Transfer</h1>
                <p className="text-sm text-gray-600">Powered by Circle's CCTP</p>
              </div>
            </div>
            <RainbowKitCustomConnectButton />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="text-6xl mb-4">🚀</div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Seamless Cross-Chain USDC Transfers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Transfer USDC between supported chains in minutes using Circle's Cross-Chain Transfer Protocol.
            No bridges, no wrapped tokens - just native USDC on every chain.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Fast & Secure</h3>
            <p className="text-gray-600 text-sm">
              Transfers typically complete in 3-15 minutes with Circle's official protocol
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Native USDC</h3>
            <p className="text-gray-600 text-sm">
              No wrapped tokens or bridges - receive native USDC on the destination chain
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-3xl mb-4">💫</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Tracking</h3>
            <p className="text-gray-600 text-sm">
              Monitor your transfer progress with live updates and transaction links
            </p>
          </div>
        </div>

        {/* Main Transfer Component */}
        {isConnected ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <CCTPTransfer />
            </div>
            <div>
              <CCTPHistory transfers={transferHistory} />
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="text-4xl mb-4">🔌</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-4">
                Connect Your Wallet to Get Started
              </h3>
              <p className="text-gray-600 mb-6">
                Connect your wallet to start transferring USDC across chains using Circle's CCTP protocol.
              </p>
              <RainbowKitCustomConnectButton />
            </div>
          </div>
        )}

        {/* Supported Chains */}
        <div className="mt-16">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-8">
            Supported Chains
          </h3>
          <div className="flex justify-center gap-8 flex-wrap">
            <div className="bg-white rounded-lg shadow-md p-6 text-center min-w-[150px]">
              <div className="text-2xl mb-2">🌐</div>
              <div className="font-semibold text-gray-900">Ethereum</div>
              <div className="text-sm text-gray-600">Sepolia Testnet</div>
            </div>
            <div className="bg-white rounded-lg shadow-md p-6 text-center min-w-[150px]">
              <div className="text-2xl mb-2">🔵</div>
              <div className="font-semibold text-gray-900">Base</div>
              <div className="text-sm text-gray-600">Sepolia Testnet</div>
            </div>
          </div>
          <p className="text-center text-sm text-gray-500 mt-4">
            More chains coming soon! This demo uses testnets for safe testing.
          </p>
        </div>

        {/* Architecture Note */}
        <div className="mt-16 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="text-2xl">🏗️</div>
            <h3 className="text-xl font-bold text-gray-900">Clean Architecture</h3>
          </div>
          <div className="text-gray-700">
            <p className="mb-4">
              This CCTP integration follows our optimized architecture:
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-4">
                <div className="font-semibold text-green-700 mb-2">🎯 Smart Wallet</div>
                <div className="text-sm text-gray-600">
                  Focuses on automated yield optimization and DeFi strategies within each chain
                </div>
              </div>
              <div className="bg-white rounded-lg p-4">
                <div className="font-semibold text-blue-700 mb-2">🌉 CCTP Frontend</div>
                <div className="text-sm text-gray-600">
                  Handles manual cross-chain transfers with full user control and proven reliability
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 text-center">
          <div className="text-4xl mb-4">🎉</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            Ready to Transfer?
          </h3>
          <p className="text-gray-600">
            Experience the future of cross-chain USDC transfers with Circle's CCTP protocol.
          </p>
        </div>
      </div>
    </div>
  );
}