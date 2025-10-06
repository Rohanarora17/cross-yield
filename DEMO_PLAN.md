# Aptos Hackathon Demo Plan

## Overview
Cross-chain yield optimizer that bridges USDC from EVM → Aptos and deposits to Aave V3 for yield generation.

## Architecture

```
User (EVM) → CCTP Bridge → Aptos Vault Contract → Aave V3 (via SDK)
                              ↓
                         Earns Yield
```

## Key Components

### 1. Vault Contract (`yieldflow_v3`)
- **Address**: `0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b`
- **Functions**:
  - `deposit()` - Users deposit USDC
  - `withdraw()` - Users withdraw USDC + yield
  - `supply_to_aave()` - Admin function to track Aave deposits
  - `get_vault_stats()` - View total deposits and yield

### 2. Aave Integration
- **Method**: Aave TypeScript SDK (`@aave/aave-v3-aptos-ts-sdk`)
- **Why SDK**: Move contracts cannot call external contracts during deployment due to module conflicts
- **Solution**: Vault tracks amounts, SDK handles actual Aave interactions

### 3. Frontend
- React/Next.js with Aptos wallet adapter
- Multi-chain wallet connect (EVM + Aptos)
- CCTP bridge integration
- Admin dashboard for Aave operations

## Demo Flow

### Step 1: User Deposits USDC
```
1. User connects EVM wallet (Arbitrum/Base/Optimism)
2. User deposits USDC to cross-chain bridge
3. CCTP mints USDC on Aptos
4. Frontend calls vault.deposit() with bridged USDC
5. Vault contract stores USDC in resource account
```

**Contract**: `yieldflow_v3::deposit(user, amount, admin_addr)`

### Step 2: Admin Deploys to Aave
```
1. Admin clicks "Deploy to Aave" in dashboard
2. Frontend calls API: /api/vault-aave-supply
3. API executes TWO transactions:
   a) Call vault.supply_to_aave() → updates tracking
   b) Use Aave SDK → actually deposits to Aave
4. Show both transaction hashes
```

**API Endpoint**: `POST /api/vault-aave-supply`
**Payload**:
```json
{
  "amount": 100,
  "adminPrivateKey": "0x...",
  "vaultPrivateKey": "0x..."
}
```

**Response**:
```json
{
  "success": true,
  "step1_vaultTracking": {
    "txHash": "0x...",
    "description": "Vault contract tracking updated"
  },
  "step2_aaveDeposit": {
    "txHash": "0x...",
    "description": "USDC deposited to Aave via SDK"
  }
}
```

### Step 3: Show Yield Accrual
```
1. Query Aave for current balance
2. Show APY from Aave reserves
3. Calculate yield earned over time
4. Display in dashboard
```

### Step 4: User Withdraws
```
1. User clicks withdraw
2. Admin withdraws from Aave (if needed)
3. Vault returns principal + yield to user
4. User bridges back to EVM (optional)
```

## Key Demo Points

### 1. Show Contract Integration
✅ **Vault contract handles user deposits** - prove contracts are useful
- Show transaction on Aptos Explorer
- Display vault resource account address
- Show USDC balance in vault

### 2. Show Aave SDK Working
✅ **Real yield generation from Aave V3**
- Show both transactions (vault tracking + Aave deposit)
- Prove funds actually went to Aave
- Display Aave aToken balance

### 3. Show Cross-Chain Flow
✅ **CCTP bridge integration**
- Start with USDC on EVM chain
- Bridge to Aptos
- End with yield-earning position on Aave

## Testing Locally

### 1. Start Frontend
```bash
cd packages/nextjs
npm run dev
```

### 2. Test Vault Deposit
```bash
# Connect Aptos wallet
# Call deposit with test USDC
```

### 3. Test Aave Integration
```bash
curl -X POST http://localhost:3000/api/vault-aave-supply \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "adminPrivateKey": "YOUR_ADMIN_KEY",
    "vaultPrivateKey": "YOUR_VAULT_RESOURCE_KEY"
  }'
```

## Environment Variables

```env
# Vault Contract
APTOS_VAULT_ADDRESS=0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b
APTOS_ADMIN_ADDRESS=0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b

# Private Keys (for demo only - use secure vault in production)
NEXT_PUBLIC_ADMIN_PRIVATE_KEY=0x...
NEXT_PUBLIC_VAULT_RESOURCE_PRIVATE_KEY=0x...

# Network
NEXT_PUBLIC_APTOS_NETWORK=testnet
```

## Demo Script

### Opening (30 seconds)
"We built a cross-chain yield optimizer that bridges USDC from any EVM chain to Aptos and automatically deploys it to Aave V3 to earn yield."

### Problem (30 seconds)
"Users have USDC sitting idle on EVM chains. Aptos has great DeFi protocols like Aave V3 with better yields. But bridging and managing cross-chain positions is complex."

### Solution (2 minutes)
1. **Show CCTP Bridge**: "User deposits USDC on Arbitrum..."
2. **Show Vault Contract**: "Our Move contract receives it on Aptos and stores it securely..."
3. **Show Aave Integration**: "Admin deploys to Aave using our SDK integration - watch TWO transactions..."
4. **Show Yield**: "Now earning X% APY on Aave, tracked by our contract..."

### Technical Highlights (1 minute)
- "Vault contract in Move handles deposits and tracking"
- "Aave SDK handles actual yield generation"
- "Both work together - contract for security, SDK for composability"
- "Can withdraw anytime, yields automatically calculated"

### Closing (30 seconds)
"This makes Aptos DeFi accessible to all EVM users through one simple interface. Secure, transparent, and earning real yield."

## Troubleshooting

### Issue: Aave SDK import errors
**Solution**: Make sure `@aave/aave-v3-aptos-ts-sdk` is installed:
```bash
npm install @aave/aave-v3-aptos-ts-sdk
```

### Issue: Vault resource account not found
**Solution**: Call `initialize()` on vault contract first:
```move
yieldflow_v3::initialize(admin)
```

### Issue: Insufficient balance
**Solution**: Fund vault resource account with test USDC from faucet

## Resources

- **Vault Contract**: https://explorer.aptoslabs.com/account/0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b?network=testnet
- **Aave V3 on Aptos**: https://docs.aave.com/developers/
- **CCTP Docs**: https://developers.circle.com/stablecoins/docs/cctp-getting-started
- **Aptos Docs**: https://aptos.dev

## Success Metrics

✅ User deposits USDC via CCTP
✅ Vault contract receives and tracks deposit
✅ Admin deploys to Aave (2 transactions)
✅ Aave position shows up with yield
✅ User can withdraw principal + yield

---

**Demo Ready Checklist:**
- [ ] Vault contract deployed
- [ ] Frontend running locally
- [ ] Test USDC in wallet
- [ ] Admin keys configured
- [ ] Aave SDK tested
- [ ] Transactions confirmed on explorer
