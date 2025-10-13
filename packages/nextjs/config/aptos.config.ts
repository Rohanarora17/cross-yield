// Aptos Chain Configuration for CrossYield
// Supports both testnet and mainnet

export interface AptosChainConfig {
  name: string;
  network: "mainnet" | "testnet" | "devnet";
  chainId: number;
  rpcUrl: string;
  indexerUrl?: string;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  usdcAddress?: string;
  vaultAddress?: string;
  messageReceiverAddress?: string;
}

export const APTOS_TESTNET: AptosChainConfig = {
  name: "Aptos Testnet",
  network: "testnet",
  chainId: 2,
  rpcUrl: process.env.NEXT_PUBLIC_NODIT_APTOS_RPC || "https://fullnode.testnet.aptoslabs.com/v1",
  indexerUrl: process.env.NEXT_PUBLIC_NODIT_APTOS_INDEXER || "https://api.testnet.aptoslabs.com/v1/graphql",
  explorerUrl: "https://explorer.aptoslabs.com/?network=testnet",
  nativeCurrency: {
    name: "Aptos",
    symbol: "APT",
    decimals: 8,
  },
  // Circle USDC on Aptos Testnet (official Circle USDC FA)
  // Note: This might be incorrect - testing with different addresses
  usdcAddress: "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832::coin::USDC",
  // Our vault contract - YieldFlow module deployed on testnet
  vaultAddress: "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b",
  // CCTP Message Receiver (update when available)
  messageReceiverAddress: process.env.NEXT_PUBLIC_APTOS_MESSAGE_RECEIVER || "0x0",
};

export const APTOS_MAINNET: AptosChainConfig = {
  name: "Aptos Mainnet",
  network: "mainnet",
  chainId: 1,
  rpcUrl: process.env.NEXT_PUBLIC_NODIT_APTOS_RPC || "https://fullnode.mainnet.aptoslabs.com/v1",
  indexerUrl: process.env.NEXT_PUBLIC_NODIT_APTOS_INDEXER || "https://indexer.mainnet.aptoslabs.com/v1/graphql",
  explorerUrl: "https://explorer.aptoslabs.com/",
  nativeCurrency: {
    name: "Aptos",
    symbol: "APT",
    decimals: 8,
  },
  usdcAddress: "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b::coin::USDC",
  vaultAddress: "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b",
  messageReceiverAddress: process.env.NEXT_PUBLIC_APTOS_MESSAGE_RECEIVER || "0x0",
};

// Default to testnet for development
export const APTOS_CONFIG = process.env.NEXT_PUBLIC_APTOS_NETWORK === "mainnet"
  ? APTOS_MAINNET
  : APTOS_TESTNET;

// Aptos Protocol Registry
export interface AptosProtocol {
  id: string;
  name: string;
  type: "dex" | "lending" | "staking" | "yield";
  website: string;
  contractAddress: string;
  tvl?: number;
  apy?: number;
  riskLevel: "low" | "medium" | "high";
  active: boolean;
}

export const APTOS_PROTOCOLS: Record<string, AptosProtocol> = {
  liquidswap: {
    id: "liquidswap",
    name: "Liquidswap",
    type: "dex",
    website: "https://liquidswap.com",
    contractAddress: "0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12",
    riskLevel: "medium",
    active: true,
  },
  thala: {
    id: "thala",
    name: "Thala Finance",
    type: "lending",
    website: "https://thala.fi",
    contractAddress: "0x48271d39d0b05bd6efca2278f22277d6fcc375504f9839fd73f74ace240861af",
    riskLevel: "medium",
    active: true,
  },
  aries: {
    id: "aries",
    name: "Aries Markets",
    type: "lending",
    website: "https://ariesmarkets.xyz",
    contractAddress: "0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3",
    riskLevel: "low",
    active: true,
  },
  tortuga: {
    id: "tortuga",
    name: "Tortuga Finance",
    type: "staking",
    website: "https://tortuga.finance",
    contractAddress: "0x8f396e4246b2ba87b51c0739ef5ea4f26515a98375308c31ac2ec1e42142a57f",
    riskLevel: "low",
    active: true,
  },
  pancakeswap: {
    id: "pancakeswap",
    name: "PancakeSwap",
    type: "dex",
    website: "https://pancakeswap.finance",
    contractAddress: "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa",
    riskLevel: "low",
    active: true,
  },
};

// CCTP Domain IDs (hypothetical - will be updated when Circle supports Aptos)
export const CCTP_DOMAINS = {
  ETHEREUM: 0,
  AVALANCHE: 1,
  OPTIMISM: 2,
  ARBITRUM: 3,
  BASE: 6,
  POLYGON: 7,
  APTOS: 22, // Hypothetical - to be confirmed
};

export const getAptosProtocolList = (): AptosProtocol[] => {
  return Object.values(APTOS_PROTOCOLS).filter(p => p.active);
};

export const getAptosProtocolById = (id: string): AptosProtocol | undefined => {
  return APTOS_PROTOCOLS[id];
};
