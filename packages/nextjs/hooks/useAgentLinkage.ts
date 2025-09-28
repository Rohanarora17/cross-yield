import { useState, useEffect, useCallback } from 'react';
import { Address } from 'viem';

interface AgentLinkage {
  userAddress: Address;
  agentAddress: Address;
  createdAt: string;
  isActive: boolean;
}

interface AgentLinkagesData {
  agentLinkages: Record<string, AgentLinkage>;
  metadata: {
    version: string;
    description: string;
    lastUpdated: string;
  };
}

const STORAGE_KEY = 'crossyield-agent-linkages';

// Known old/invalid wallet addresses that should be cleared
const INVALID_WALLET_ADDRESSES = [
  '0xEcde2C3BEB88C15D22D1e82CaB66FCBEA6406845', // Old Base Sepolia wallet with wrong ABI
];

export const useAgentLinkage = () => {
  const [linkages, setLinkages] = useState<Record<string, AgentLinkage>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Validate and clean up invalid linkages
  const validateAndCleanLinkages = useCallback((linkages: Record<string, AgentLinkage>) => {
    const cleanedLinkages: Record<string, AgentLinkage> = {};
    let hasInvalidLinkages = false;

    Object.entries(linkages).forEach(([userAddress, linkage]) => {
      const isInvalid = INVALID_WALLET_ADDRESSES.includes(linkage.agentAddress.toLowerCase());
      if (isInvalid) {
        console.warn(`🚨 Removing invalid agent linkage for ${userAddress}: ${linkage.agentAddress}`);
        hasInvalidLinkages = true;
      } else {
        cleanedLinkages[userAddress] = linkage;
      }
    });

    if (hasInvalidLinkages) {
      console.log('🧹 Cleaned up invalid agent linkages');
      return cleanedLinkages;
    }

    return linkages;
  }, []);

  // Load linkages from localStorage
  const loadLinkages = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data: AgentLinkagesData = JSON.parse(stored);
        const linkages = data.agentLinkages || {};
        const cleanedLinkages = validateAndCleanLinkages(linkages);
        
        // If linkages were cleaned, save the cleaned version
        if (Object.keys(cleanedLinkages).length !== Object.keys(linkages).length) {
          saveLinkages(cleanedLinkages);
        } else {
          setLinkages(cleanedLinkages);
        }
      }
    } catch (error) {
      console.error('Failed to load agent linkages:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save linkages to localStorage
  const saveLinkages = useCallback((newLinkages: Record<string, AgentLinkage>) => {
    try {
      const data: AgentLinkagesData = {
        agentLinkages: newLinkages,
        metadata: {
          version: '1.0.0',
          description: 'Agent-User linkage mapping for CrossYield platform',
          lastUpdated: new Date().toISOString(),
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setLinkages(newLinkages);
    } catch (error) {
      console.error('Failed to save agent linkages:', error);
    }
  }, []);

  // Create a new agent linkage
  const createLinkage = useCallback((userAddress: Address, agentAddress: Address) => {
    const linkage: AgentLinkage = {
      userAddress,
      agentAddress,
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    const newLinkages = {
      ...linkages,
      [userAddress.toLowerCase()]: linkage,
    };

    saveLinkages(newLinkages);
    return linkage;
  }, [linkages, saveLinkages]);

  // Get agent address for a user
  const getAgentAddress = useCallback((userAddress: Address): Address | null => {
    const linkage = linkages[userAddress.toLowerCase()];
    return linkage?.isActive ? linkage.agentAddress : null;
  }, [linkages]);

  // Get user address for an agent
  const getUserAddress = useCallback((agentAddress: Address): Address | null => {
    const linkage = Object.values(linkages).find(
      (l) => l.agentAddress.toLowerCase() === agentAddress.toLowerCase() && l.isActive
    );
    return linkage?.userAddress || null;
  }, [linkages]);

  // Check if linkage exists
  const hasLinkage = useCallback((userAddress: Address): boolean => {
    const linkage = linkages[userAddress.toLowerCase()];
    return linkage?.isActive || false;
  }, [linkages]);

  // Deactivate linkage
  const deactivateLinkage = useCallback((userAddress: Address) => {
    const linkage = linkages[userAddress.toLowerCase()];
    if (linkage) {
      const newLinkages = {
        ...linkages,
        [userAddress.toLowerCase()]: {
          ...linkage,
          isActive: false,
        },
      };
      saveLinkages(newLinkages);
    }
  }, [linkages, saveLinkages]);

  // Get all linkages for a user (including inactive)
  const getUserLinkages = useCallback((userAddress: Address): AgentLinkage[] => {
    return Object.values(linkages).filter(
      (l) => l.userAddress.toLowerCase() === userAddress.toLowerCase()
    );
  }, [linkages]);

  // Get all active linkages
  const getActiveLinkages = useCallback((): AgentLinkage[] => {
    return Object.values(linkages).filter((l) => l.isActive);
  }, [linkages]);

  // Clear invalid linkages manually
  const clearInvalidLinkages = useCallback(() => {
    const cleanedLinkages = validateAndCleanLinkages(linkages);
    if (Object.keys(cleanedLinkages).length !== Object.keys(linkages).length) {
      saveLinkages(cleanedLinkages);
      return true; // Indicates that linkages were cleaned
    }
    return false; // No invalid linkages found
  }, [linkages, validateAndCleanLinkages, saveLinkages]);

  // Load linkages on mount
  useEffect(() => {
    loadLinkages();
  }, [loadLinkages]);

  return {
    linkages,
    isLoading,
    createLinkage,
    getAgentAddress,
    getUserAddress,
    hasLinkage,
    deactivateLinkage,
    getUserLinkages,
    getActiveLinkages,
    loadLinkages,
    clearInvalidLinkages,
  };
};