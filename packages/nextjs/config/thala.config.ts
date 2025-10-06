/**
 * Thala Finance Integration Configuration
 * Contract addresses and function signatures for Thala lending protocol on Aptos testnet
 */

export const THALA_CONFIG = {
  // Thala Finance lending pool contract (testnet)
  CONTRACT_ADDRESS: "0x48271d39d0b05bd6efca2278f22277d6fcc375504f9839fd73f74ace240861af",

  // USDC Fungible Asset metadata address (official Circle USDC on Aptos)
  // Use the correct address based on network
  USDC_FA_METADATA: process.env.NEXT_PUBLIC_APTOS_NETWORK === "mainnet" 
    ? "0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b"  // Mainnet
    : "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832", // Testnet

  // Module names
  MODULE: "lending_pool",

  // Function signatures
  FUNCTIONS: {
    supply: "supply",
    withdraw: "withdraw",
    get_supply_rate: "get_supply_rate",
    get_total_supply: "get_total_supply",
    get_user_supply_balance: "get_user_supply_balance",
    get_user_interest_earned: "get_user_interest_earned",
  },

  // USDC decimals
  USDC_DECIMALS: 6,
} as const;

/**
 * Get full function name for Thala contract calls
 */
export function getThalaFunction(functionName: keyof typeof THALA_CONFIG.FUNCTIONS): string {
  return `${THALA_CONFIG.CONTRACT_ADDRESS}::${THALA_CONFIG.MODULE}::${THALA_CONFIG.FUNCTIONS[functionName]}`;
}

/**
 * Convert USDC amount to micro units (6 decimals)
 */
export function toMicroUsdc(amount: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, THALA_CONFIG.USDC_DECIMALS)));
}

/**
 * Convert micro USDC to regular units
 */
export function fromMicroUsdc(microAmount: bigint | number): number {
  return Number(microAmount) / Math.pow(10, THALA_CONFIG.USDC_DECIMALS);
}

/**
 * Thala transaction payload types
 */
export interface ThalaSupplyPayload {
  function: string;
  typeArguments: string[];
  functionArguments: [string, bigint]; // [usdc_metadata, amount]
}

export interface ThalaWithdrawPayload {
  function: string;
  typeArguments: string[];
  functionArguments: [string, bigint]; // [usdc_metadata, amount]
}

/**
 * Thala user position interface
 */
export interface ThalaPosition {
  principal: number;  // Amount supplied
  interest: number;   // Interest earned
  total: number;      // Total balance
  apy: number;        // Current APY
}
