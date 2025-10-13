/**
 * Aave V3 Aptos Integration Hooks
 * React hooks for interacting with Aave V3 lending protocol on Aptos
 */

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { AAVE_APTOS_CONFIG, getAaveAptosFunction, toMicroUsdc, fromMicroUsdc, type AavePosition, type AaveReserveData, type AaveUserAccountData } from "~~/config/aave-aptos.config";
import { APTOS_CONFIG } from "~~/config/aptos.config";

// Initialize Aptos client for testnet
const config = new AptosConfig({ network: APTOS_CONFIG.network === "mainnet" ? Network.MAINNET : Network.TESTNET });
const aptos = new Aptos(config);

/**
 * Hook to get Aave V3 APY for USDC
 */
export function useAaveAptosApy() {
  const [apy, setApy] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchApy = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_supply_rate"),
            functionArguments: [AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS],
          },
        });

        if (result && result.length > 0) {
          // Convert from basis points to percentage
          const apyValue = Number(result[0]) / 100;
          setApy(apyValue);
        }
      } catch (err: any) {
        console.error("Error fetching Aave APY:", err);
        setError(err.message);
        // Fallback to typical APY for demo
        setApy(8.5);
      } finally {
        setLoading(false);
      }
    };

    fetchApy();
  }, []);

  return { apy, loading, error };
}

/**
 * Hook to get Aave V3 reserve data
 */
export function useAaveAptosReserveData() {
  const [reserveData, setReserveData] = useState<AaveReserveData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReserveData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_reserve_data"),
            functionArguments: [AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS],
          },
        });

        if (result && result.length > 0) {
          const data = result[0] as any;
          setReserveData({
            totalSupply: fromMicroUsdc(data.totalSupply || 0),
            totalDebt: fromMicroUsdc(data.totalDebt || 0),
            supplyRate: Number(data.supplyRate || 0) / 100,
            borrowRate: Number(data.borrowRate || 0) / 100,
            utilizationRate: Number(data.utilizationRate || 0) / 100,
            liquidityRate: Number(data.liquidityRate || 0) / 100,
            variableBorrowRate: Number(data.variableBorrowRate || 0) / 100,
            stableBorrowRate: Number(data.stableBorrowRate || 0) / 100,
            averageStableRate: Number(data.averageStableRate || 0) / 100,
            liquidityIndex: Number(data.liquidityIndex || 0) / 1e27,
            variableBorrowIndex: Number(data.variableBorrowIndex || 0) / 1e27,
            lastUpdateTimestamp: Number(data.lastUpdateTimestamp || 0),
          });
        }
      } catch (err: any) {
        console.error("Error fetching Aave reserve data:", err);
        setError(err.message);
        // Fallback to mock data for demo
        setReserveData({
          totalSupply: 2500000,
          totalDebt: 1200000,
          supplyRate: 8.5,
          borrowRate: 12.3,
          utilizationRate: 0.48,
          liquidityRate: 8.2,
          variableBorrowRate: 12.3,
          stableBorrowRate: 15.8,
          averageStableRate: 13.2,
          liquidityIndex: 1.045,
          variableBorrowIndex: 1.123,
          lastUpdateTimestamp: Date.now() / 1000,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchReserveData();
  }, []);

  return { reserveData, loading, error };
}

/**
 * Hook to get user's Aave V3 position
 */
export function useAaveAptosPosition(userAddress?: string) {
  const { account } = useWallet();
  const [position, setPosition] = useState<AavePosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = userAddress || account?.address;

  useEffect(() => {
    if (!address) {
      setPosition(null);
      return;
    }

    const fetchPosition = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get user's supply balance
        const balanceResult = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_user_supply_balance"),
            functionArguments: [address, AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS],
          },
        });

        // Get user's interest earned
        const interestResult = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_user_interest_earned"),
            functionArguments: [address, AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS],
          },
        });

        // Get current APY
        const apyResult = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_supply_rate"),
            functionArguments: [AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS],
          },
        });

        // Get user account data
        const accountDataResult = await aptos.view({
          payload: {
            function: getAaveAptosFunction("get_user_account_data"),
            functionArguments: [address],
          },
        });

        const principal = balanceResult && balanceResult.length > 0
          ? fromMicroUsdc(balanceResult[0] as bigint)
          : 0;

        const interest = interestResult && interestResult.length > 0
          ? fromMicroUsdc(interestResult[0] as bigint)
          : 0;

        const apy = apyResult && apyResult.length > 0
          ? Number(apyResult[0]) / 100
          : 8.5;

        let accountData: AaveUserAccountData | null = null;
        if (accountDataResult && accountDataResult.length > 0) {
          const data = accountDataResult[0] as any;
          accountData = {
            totalCollateralETH: fromMicroUsdc(data.totalCollateralETH || 0),
            totalDebtETH: fromMicroUsdc(data.totalDebtETH || 0),
            availableBorrowsETH: fromMicroUsdc(data.availableBorrowsETH || 0),
            currentLiquidationThreshold: Number(data.currentLiquidationThreshold || 0) / 100,
            ltv: Number(data.ltv || 0) / 100,
            healthFactor: Number(data.healthFactor || 0) / 1e18,
          };
        }

        setPosition({
          principal,
          interest,
          total: principal + interest,
          apy,
          healthFactor: accountData?.healthFactor || 0,
          collateralValue: accountData?.totalCollateralETH || 0,
          debtValue: accountData?.totalDebtETH || 0,
          availableBorrows: accountData?.availableBorrowsETH || 0,
        });
      } catch (err: any) {
        console.error("Error fetching Aave position:", err);
        setError(err.message);
        setPosition({
          principal: 0,
          interest: 0,
          total: 0,
          apy: 0,
          healthFactor: 0,
          collateralValue: 0,
          debtValue: 0,
          availableBorrows: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPosition();

    // Refresh every 30 seconds
    const interval = setInterval(fetchPosition, 30000);
    return () => clearInterval(interval);
  }, [address]);

  return { position, loading, error, refresh: () => setPosition(null) };
}

/**
 * Hook to supply USDC to Aave V3
 */
export function useAaveAptosSupply() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const supply = async (amount: number) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountMicro = toMicroUsdc(amount);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: getAaveAptosFunction("supply"),
          typeArguments: [],
          functionArguments: [AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS, amountMicro.toString()],
        },
      });

      const hash = typeof response === 'object' && 'hash' in response
        ? response.hash
        : response.toString();

      setTxHash(hash);

      // Wait for transaction
      await aptos.waitForTransaction({ transactionHash: hash });

      return hash;
    } catch (err: any) {
      console.error("Error supplying to Aave:", err);
      setError(err.message || "Failed to supply to Aave");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { supply, loading, error, txHash };
}

/**
 * Hook to withdraw USDC from Aave V3
 */
export function useAaveAptosWithdraw() {
  const { account, signAndSubmitTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const withdraw = async (amount: number) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    try {
      setLoading(true);
      setError(null);
      setTxHash(null);

      const amountMicro = toMicroUsdc(amount);

      const response = await signAndSubmitTransaction({
        sender: account.address,
        data: {
          function: getAaveAptosFunction("withdraw"),
          typeArguments: [],
          functionArguments: [AAVE_APTOS_CONFIG.USDC_TOKEN_ADDRESS, amountMicro.toString()],
        },
      });

      const hash = typeof response === 'object' && 'hash' in response
        ? response.hash
        : response.toString();

      setTxHash(hash);

      // Wait for transaction
      await aptos.waitForTransaction({ transactionHash: hash });

      return hash;
    } catch (err: any) {
      console.error("Error withdrawing from Aave:", err);
      setError(err.message || "Failed to withdraw from Aave");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { withdraw, loading, error, txHash };
}