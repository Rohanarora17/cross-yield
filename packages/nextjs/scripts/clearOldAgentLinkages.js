// Quick script to clear old agent linkages from localStorage
// Run this in the browser console to clear the old wallet address

console.log('🧹 Clearing old agent linkages...');

try {
  // Clear the specific storage key
  localStorage.removeItem('crossyield-agent-linkages');
  console.log('✅ Cleared old agent linkages from localStorage');
  console.log('🔄 Please refresh the page to see the changes');
} catch (error) {
  console.error('❌ Failed to clear linkages:', error);
}

// Also show what was stored
console.log('📋 Current localStorage keys:', Object.keys(localStorage));