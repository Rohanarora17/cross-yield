import { useState } from 'react';

const STORAGE_KEY = 'crossyield-agent-linkages';

export const useAgentLinkageReset = () => {
  const [isResetting, setIsResetting] = useState(false);

  const clearAllLinkages = () => {
    setIsResetting(true);
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ Cleared all agent linkages');
      return true;
    } catch (error) {
      console.error('❌ Failed to clear linkages:', error);
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  const resetAndReload = () => {
    if (clearAllLinkages()) {
      // Reload the page to refresh all data
      window.location.reload();
    }
  };

  return {
    clearAllLinkages,
    resetAndReload,
    isResetting,
  };
};