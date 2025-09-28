import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { Address } from "viem";

export const useContractAgentLinkage = () => {
  // Read functions
  const { data: getUserWallet } = useScaffoldReadContract({
    contractName: "SmartWalletFactory",
    functionName: "getWallet",
  });

  const { data: getUserForAgent } = useScaffoldReadContract({
    contractName: "SmartWalletFactory", 
    functionName: "getUserForAgent",
  });

  const { data: hasWallet } = useScaffoldReadContract({
    contractName: "SmartWalletFactory",
    functionName: "hasWallet",
  });

  const { data: isWalletValid } = useScaffoldReadContract({
    contractName: "SmartWalletFactory",
    functionName: "isWalletValid",
  });

  // Write functions
  const { writeContractAsync: writeSmartWalletFactory } = useScaffoldWriteContract({
    contractName: "SmartWalletFactory",
  });

  // Helper functions
  const getAgentAddress = async (userAddress: Address): Promise<Address | null> => {
    try {
      const result = await getUserWallet?.(userAddress);
      return result || null;
    } catch (error) {
      console.error("Failed to get agent address:", error);
      return null;
    }
  };

  const getUserAddress = async (agentAddress: Address): Promise<Address | null> => {
    try {
      const result = await getUserForAgent?.(agentAddress);
      return result || null;
    } catch (error) {
      console.error("Failed to get user address:", error);
      return null;
    }
  };

  const checkHasWallet = async (userAddress: Address): Promise<boolean> => {
    try {
      const result = await hasWallet?.(userAddress);
      return result || false;
    } catch (error) {
      console.error("Failed to check wallet existence:", error);
      return false;
    }
  };

  const checkWalletValid = async (walletAddress: Address): Promise<boolean> => {
    try {
      const result = await isWalletValid?.(walletAddress);
      return result || false;
    } catch (error) {
      console.error("Failed to check wallet validity:", error);
      return false;
    }
  };

  const createWallet = async (userAddress: Address): Promise<Address | null> => {
    try {
      const result = await writeSmartWalletFactory({
        functionName: "createWallet",
        args: [userAddress],
      });
      return result as Address;
    } catch (error) {
      console.error("Failed to create wallet:", error);
      return null;
    }
  };

  return {
    getAgentAddress,
    getUserAddress,
    checkHasWallet,
    checkWalletValid,
    createWallet,
  };
};