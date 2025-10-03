// CCTP v1 Configuration for Base → Aptos Bridge
// Based on Circle's official CCTP implementation

export const CCTP_V1_CONFIG = {
  // Base Sepolia (Source Chain)
  BASE_SEPOLIA: {
    chainId: 84532,
    domain: 6,
    tokenMessenger: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
    messageTransmitter: "0x7865fAfC2db2093669d92c0F33AEeF291086BEFD",
    usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    explorer: "https://sepolia.basescan.org",
  },

  // Aptos Testnet (Destination Chain)
  APTOS_TESTNET: {
    network: "testnet",
    domain: 9, // CCTP domain for Aptos
    messageTransmitter: "0x081e86cebf457a0c6004f35bd648a2794698f52e0dde09a48619dcd3d4cc23d9",
    tokenMessengerMinter: "0x8f1f4b0c7d0e8b5c9d4f3a2e1b0a8d7c6e5b4a3f2e1d0c9b8a7f6e5d4c3b2a1",
    usdc: "0x1::usdc::USDC",
    explorer: "https://explorer.aptoslabs.com",
  },

  // Circle Iris API (Attestation Service)
  IRIS_API: {
    sandbox: "https://iris-api-sandbox.circle.com",
    production: "https://iris-api.circle.com"
  }
} as const;

// Helper to get CCTP config for environment
export function getCCTPConfig() {
  const isProduction = process.env.NEXT_PUBLIC_NETWORK === "mainnet";

  return {
    base: CCTP_V1_CONFIG.BASE_SEPOLIA,
    aptos: CCTP_V1_CONFIG.APTOS_TESTNET,
    irisApi: isProduction
      ? CCTP_V1_CONFIG.IRIS_API.production
      : CCTP_V1_CONFIG.IRIS_API.sandbox
  };
}

// Contract ABIs
export const TOKEN_MESSENGER_ABI = [
  {
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" }
    ],
    name: "depositForBurn",
    outputs: [{ name: "nonce", type: "uint64" }],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

export const USDC_ABI = [
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
  }
] as const;
