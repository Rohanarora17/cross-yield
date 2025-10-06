/**
 * Aave V3 Aptos Integration Configuration
 * Contract addresses and function signatures for Aave V3 on Aptos testnet
 */

export const AAVE_APTOS_CONFIG = {
  // Aave V3 Lending Pool contract (Aptos testnet)
  // Note: These are placeholder addresses - update with actual deployed addresses
  LENDING_POOL_ADDRESS: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  
  // USDC Token address on Aptos (Circle USDC)
  USDC_TOKEN_ADDRESS: "0x5e156f1207d0ebfa19a9eeff00d62a282278fb8719f4fab3a586a0a2c0fffbea::coin::T",
  
  // Aave V3 Module names
  MODULE: "lending_pool",
  
  // Function signatures for Aave V3
  FUNCTIONS: {
    supply: "supply",
    withdraw: "withdraw",
    get_supply_rate: "get_supply_rate",
    get_total_supply: "get_total_supply",
    get_user_supply_balance: "get_user_supply_balance",
    get_user_interest_earned: "get_user_interest_earned",
    get_reserve_data: "get_reserve_data",
    get_user_account_data: "get_user_account_data",
  },

  // USDC decimals
  USDC_DECIMALS: 6,
  
  // Aave V3 specific configuration
  RESERVE_FACTOR: 1000, // 10% in basis points
  LTV: 8000, // 80% in basis points
  LIQUIDATION_THRESHOLD: 8500, // 85% in basis points
  LIQUIDATION_BONUS: 500, // 5% in basis points
  
  // Interest rate model parameters
  INTEREST_RATE_MODEL: {
    BASE_RATE: 0, // 0% base rate
    SLOPE_1: 400, // 4% slope 1
    SLOPE_2: 10000, // 100% slope 2
    KINK: 8000, // 80% kink
  },
} as const;

/**
 * Get full function name for Aave V3 contract calls
 */
export function getAaveAptosFunction(functionName: keyof typeof AAVE_APTOS_CONFIG.FUNCTIONS): string {
  return `${AAVE_APTOS_CONFIG.LENDING_POOL_ADDRESS}::${AAVE_APTOS_CONFIG.MODULE}::${AAVE_APTOS_CONFIG.FUNCTIONS[functionName]}`;
}

/**
 * Convert USDC amount to micro units (6 decimals)
 */
export function toMicroUsdc(amount: number): bigint {
  return BigInt(Math.floor(amount * Math.pow(10, AAVE_APTOS_CONFIG.USDC_DECIMALS)));
}

/**
 * Convert micro USDC to regular units
 */
export function fromMicroUsdc(microAmount: bigint | number): number {
  return Number(microAmount) / Math.pow(10, AAVE_APTOS_CONFIG.USDC_DECIMALS);
}

/**
 * Aave V3 transaction payload types
 */
export interface AaveSupplyPayload {
  function: string;
  typeArguments: string[];
  functionArguments: [string, bigint]; // [usdc_token_address, amount]
}

export interface AaveWithdrawPayload {
  function: string;
  typeArguments: string[];
  functionArguments: [string, bigint]; // [usdc_token_address, amount]
}

/**
 * Aave V3 user position interface
 */
export interface AavePosition {
  principal: number;  // Amount supplied
  interest: number;   // Interest earned
  total: number;      // Total balance
  apy: number;        // Current APY
  healthFactor: number; // Health factor (1.0 = 100%)
  collateralValue: number; // Collateral value
  debtValue: number;  // Debt value
  availableBorrows: number; // Available borrow capacity
}

/**
 * Aave V3 reserve data interface
 */
export interface AaveReserveData {
  totalSupply: number;
  totalDebt: number;
  supplyRate: number;
  borrowRate: number;
  utilizationRate: number;
  liquidityRate: number;
  variableBorrowRate: number;
  stableBorrowRate: number;
  averageStableRate: number;
  liquidityIndex: number;
  variableBorrowIndex: number;
  lastUpdateTimestamp: number;
}

/**
 * Aave V3 user account data interface
 */
export interface AaveUserAccountData {
  totalCollateralETH: number;
  totalDebtETH: number;
  availableBorrowsETH: number;
  currentLiquidationThreshold: number;
  ltv: number;
  healthFactor: number;
}