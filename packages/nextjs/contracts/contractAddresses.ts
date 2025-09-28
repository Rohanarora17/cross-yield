import { Address } from "viem";

// Contract addresses for different networks
export const DEPLOYED_CONTRACTS = {
  // Ethereum Sepolia (Chain ID: 11155111)
  11155111: {
    chainRegistry: "0xa9714b3C50DfAabF4c828ed62e02D6eDcf9F6CA3" as Address,
    smartWalletFactory: "0xCE2C6Cb2cc38c82920D1a860978890085aB3F1b8" as Address,
    yieldRouter: "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11" as Address,
    yieldRouterProxy: "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11" as Address,
  },

  // Base Sepolia (Chain ID: 84532)
  84532: {
    chainRegistry: "0x01f6A4b9E0fA914C59950F89E701E3eF032cF966" as Address,
    smartWalletFactory: "0x3fCb812C6CAe20C254662A619096EB698ebd6ef3" as Address,
    yieldRouter: "0x0FAE5e7b22ca43Ba521021627Fe32796882c1f2d" as Address,
    yieldRouterProxy: "0x0FAE5e7b22ca43Ba521021627Fe32796882c1f2d" as Address,
  },
  // Arbitrum Sepolia (Chain ID: 421614)
  421614: {
    chainRegistry: "0xa767A250819a4813061DF666c1AaCF60e5b5a2D4" as Address,
    smartWalletFactory: "0x97Ce69a3b569903B64bc49e6D91077e1ce59959b" as Address,
    yieldRouter: "0x780BE3b0aDf2189b4fa72086A48F2a8BD19B14b8" as Address,
    yieldRouterProxy: "0x780BE3b0aDf2189b4fa72086A48F2a8BD19B14b8" as Address,
  },
} as const;
  // Hardhat Local (Chain ID: 31337)
 

// USDC addresses for different networks
export const USDC_ADDRESSES = {
  // Ethereum Sepolia
  11155111: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
  // Base Sepolia
  84532: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
  // Arbitrum Sepolia
  421614: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address,
  // Hardhat Local
} as const;

// Token addresses for 1inch integration
export const TOKEN_ADDRESSES = {
  // Ethereum Sepolia
  11155111: {
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as Address,
    WETH: "0xfFf9976782d46CC05687DfA2De4e38c4F82A2947" as Address,
    DAI: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357" as Address,
  },
  // Base Sepolia
  84532: {
    USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
    WETH: "0x4200000000000000000000000000000000000006" as Address,
  },
  // Arbitrum Sepolia
  421614: {
    USDC: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as Address,
    WETH: "0xc556bAe1e86B2aE128C22E1f9e8B6c5b7c4E8C7a" as Address,
  },
  // Hardhat Local
  31337: {
    USDC: "0x5FbDB2315678afecb367f032d93F642f64180aa3" as Address,
    WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address,
  },
} as const;

// Helper function to get contract addresses for current chain
export function getContractAddresses(chainId: number) {
  return DEPLOYED_CONTRACTS[chainId as keyof typeof DEPLOYED_CONTRACTS] || DEPLOYED_CONTRACTS[31337];
}

// Helper function to get USDC address for current chain
export function getUSDCAddress(chainId: number) {
  return USDC_ADDRESSES[chainId as keyof typeof USDC_ADDRESSES] || USDC_ADDRESSES[31337];
}

// Helper function to get token addresses for current chain
export function getTokenAddresses(chainId: number) {
  return TOKEN_ADDRESSES[chainId as keyof typeof TOKEN_ADDRESSES] || TOKEN_ADDRESSES[31337];
}

// Network names for display
export const NETWORK_NAMES = {
  11155111: "Ethereum Sepolia",
  84532: "Base Sepolia",
  421614: "Arbitrum Sepolia",
} as const;
