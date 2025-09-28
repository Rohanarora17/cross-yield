// Simple script to clear agent linkages from localStorage
// Run this in browser console if needed

const STORAGE_KEY = 'crossyield-agent-linkages';

console.log('Current agent linkages:', localStorage.getItem(STORAGE_KEY));

if (confirm('Clear all agent linkages from localStorage?')) {
  localStorage.removeItem(STORAGE_KEY);
  console.log('✅ Cleared agent linkages');
  console.log('Please refresh the page to see changes');
} else {
  console.log('❌ Cancelled');
}