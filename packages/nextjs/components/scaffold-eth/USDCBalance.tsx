"use client";

import { Address } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth/useScaffoldReadContract";

type USDCBalanceProps = {
  address?: Address;
  className?: string;
};

/**
 * Display USDC balance of an ETH address.
 */
export const USDCBalance = ({ address, className = "" }: USDCBalanceProps) => {
  // Mock USDC contract address - in real app this would be the actual USDC contract
  // const USDC_ADDRESS = "0xA0b86a33E6E6E6E6E6E6E6E6E6E6E6E6E6E6E6E6" as Address;

  const {
    // data: balance,
    isError,
    isLoading,
  } = useScaffoldReadContract({
    contractName: "YourContract", // This would be the actual USDC contract
    functionName: "balanceOf",
    args: address ? [address] : undefined,
  });

  if (!address || isLoading) {
    return (
      <div className="animate-pulse flex space-x-4">
        <div className="rounded-md bg-slate-300 h-6 w-6"></div>
        <div className="flex items-center space-y-6">
          <div className="h-2 w-28 bg-slate-300 rounded-sm"></div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className={`border-2 border-base-content/30 rounded-md px-2 flex flex-col items-center max-w-fit cursor-pointer ${className}`}
      >
        <div className="text-warning">Error</div>
      </div>
    );
  }

  // Mock balance for demo purposes
  const mockBalance = 125000; // 125,000 USDC
  const formattedBalance = mockBalance.toLocaleString();

  return (
    <div className={`btn btn-sm btn-ghost flex flex-col font-normal items-center hover:bg-transparent ${className}`}>
      <div className="w-full flex items-center justify-center">
        <span className="text-[0.8em] font-bold mr-1">$</span>
        <span>{formattedBalance}</span>
        <span className="text-[0.8em] font-bold ml-1">USDC</span>
      </div>
    </div>
  );
};
