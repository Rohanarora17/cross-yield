# Quick Start Guide - Aptos Aave Integration Demo

## ✅ Everything is Set Up!

### Configuration Summary
```
✅ Vault Contract: 0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b
✅ Resource Account: 0x8564ea6c07a463b3c68809c5745429cfb46b7d0282cde4814102a5f52ca86170
✅ Admin Private Key: Stored in .env.local
✅ Environment: Aptos Testnet
✅ Integration: Vault Contract + Aave SDK
```

## 🚀 Testing in 3 Steps

### Step 1: Restart the Server
```bash
# Stop current server (Ctrl+C if running)
cd /Users/rohan/cross-yield/cross-yield/packages/nextjs
npm run dev
```

Wait for: `✓ Ready in X seconds`

### Step 2: Test the Integration
```bash
# Open new terminal
cd /Users/rohan/cross-yield/cross-yield

# Run test script
./test-aave-integration.sh
```

OR manually:
```bash
curl -X POST http://localhost:3000/api/vault-aave-supply \
  -H "Content-Type: application/json" \
  -d '{"amount": 1}' | jq
```

### Step 3: Verify Results
You should see:
```json
{
  "success": true,
  "step1_vaultTracking": {
    "txHash": "0x...",
    "explorerUrl": "https://explorer.aptoslabs.com/txn/0x...?network=testnet"
  },
  "step2_aaveDeposit": {
    "txHash": "0x...",
    "explorerUrl": "https://explorer.aptoslabs.com/txn/0x...?network=testnet"
  }
}
```

## 🎯 For Demo Presentation

### Show Both Transactions
1. **Transaction 1** (Contract Tracking):
   - Proves contracts are useful
   - Shows vault updating internal state
   - On-chain transparency

2. **Transaction 2** (Aave Deposit):
   - Proves real yield generation
   - Shows SDK integration working
   - Actual USDC in Aave earning yield

### Key Talking Points
- ✅ "Hybrid approach: Contracts for security + SDK for DeFi composability"
- ✅ "Two transactions prove both systems working together"
- ✅ "User deposits are tracked on-chain, yield is real from Aave"
- ✅ "Scalable to any DeFi protocol on Aptos"

## 📁 Key Files

### Configuration
- `.env.local` - Private keys (NEVER COMMIT!)
- `SETUP_RECORD.md` - Complete deployment record

### API
- `app/api/vault-aave-supply/route.ts` - Main integration endpoint

### Contract
- `contracts/sources/native_usdc_vault.move` - Vault contract

### Docs
- `DEMO_PLAN.md` - Presentation guide
- `TEST_COMMANDS.md` - Detailed testing
- `SETUP_RECORD.md` - Technical details

## 🔍 Troubleshooting

### Server won't start
```bash
cd packages/nextjs
rm -rf .next
npm install
npm run dev
```

### API returns 500 error
Check `.env.local` has:
```
APTOS_VAULT_ADMIN_PRIVATE_KEY=0x6008ac17eae184f10fd06a3c3747723d2761be244cd0716edee74946a5b83df4
```

### Insufficient balance error
Admin needs USDC:
```bash
# Check balance
aptos account list --account 0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b

# Get from faucet or transfer from another wallet
```

## 📊 Check Vault State

```bash
# Get vault stats
aptos move view \
  --function-id "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b::yieldflow_v3::get_vault_stats" \
  --args address:0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b

# Get Aave balance
aptos move view \
  --function-id "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b::yieldflow_v3::get_aave_balance" \
  --args address:0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b
```

## 🎉 You're Ready!

Everything is configured and ready to demo. Just:
1. Restart server
2. Run test
3. Show both transactions on explorer
4. Explain hybrid approach

Good luck with your demo! 🚀
