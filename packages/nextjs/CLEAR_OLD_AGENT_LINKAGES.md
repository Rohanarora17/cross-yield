# 🚨 Clear Old Agent Linkages

## Issue
Your agent wallet is still linked to the old address `0xEcde2C3BEB88C15D22D1e82CaB66FCBEA6406845` which has the wrong ABI and will cause deposit failures.

## Quick Fix

### Option 1: Use the UI (Recommended)
1. Go to the Fund page
2. Scroll down to the Debug Information section
3. Click "Clear Invalid Linkages" button
4. The page will refresh automatically

### Option 2: Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Run this command:
```javascript
localStorage.removeItem('crossyield-agent-linkages');
location.reload();
```

### Option 3: Manual Clear All
1. Go to the Fund page
2. Scroll down to the Debug Information section  
3. Click "Reset All Linkages" button
4. Confirm the action

## What This Does
- Removes the old invalid wallet address from localStorage
- Forces the system to create a new linkage with the correct wallet
- Prevents "execution reverted" errors during deposits

## After Clearing
- The old agent address will be removed
- You'll need to create a new smart wallet
- The new wallet will have the correct ABI and work properly