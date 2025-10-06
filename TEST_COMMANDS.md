# Test Commands for Aave Integration Demo

## Quick Test

### Option 1: Using the Test Script (Recommended)
```bash
cd /Users/rohan/cross-yield/cross-yield
./test-aave-integration.sh
```

The script will:
1. Check if server is running
2. Ask for your admin private key
3. Ask for vault resource private key
4. Send test transaction
5. Show both transaction hashes with explorer links

### Option 2: Manual cURL Command

```bash
curl -X POST http://localhost:3000/api/vault-aave-supply \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10,
    "adminPrivateKey": "YOUR_ADMIN_PRIVATE_KEY"
  }'
```

**Note**: The API now uses only the admin private key. The vault resource account is handled internally by the contract's SignerCapability.

## Getting Your Private Keys

### Admin Private Key
This is the private key you used to deploy the vault contract.

```bash
# If you have the key file
cat ~/.aptos/config.yaml | grep private_key
```

### Vault Resource Private Key
The vault creates a resource account. To get its private key, you need to derive it from the seed.

**Seed used in contract**: `b"ai_YieldFlow_usdc_vault"`

You can get this by:
1. Reading the vault contract initialization
2. Or using Aptos CLI to list resource accounts

## Expected Response

### Success Response:
```json
{
  "success": true,
  "step1_vaultTracking": {
    "txHash": "0x...",
    "explorerUrl": "https://explorer.aptoslabs.com/txn/0x...?network=testnet",
    "description": "Vault contract tracking updated"
  },
  "step2_aaveDeposit": {
    "txHash": "0x...",
    "explorerUrl": "https://explorer.aptoslabs.com/txn/0x...?network=testnet",
    "description": "USDC deposited to Aave via SDK"
  },
  "amount": 10,
  "protocol": "Aave V3",
  "message": "Successfully supplied 10 USDC to Aave (contract tracking + SDK deposit)"
}
```

### What This Proves:
✅ **Transaction 1**: Vault contract successfully tracked the deposit
✅ **Transaction 2**: Aave SDK successfully deposited USDC to Aave
✅ **Integration**: Contracts + SDK working together

## Troubleshooting

### Error: "Vault resource account not found"
**Solution**: Initialize the vault first:
```bash
aptos move run \
  --function-id "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b::yieldflow_v3::initialize" \
  --private-key YOUR_ADMIN_PRIVATE_KEY
```

### Error: "Insufficient USDC balance"
**Solution**: Make sure the vault resource account has USDC:
1. Get vault resource account address:
   ```bash
   aptos move view \
     --function-id "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b::yieldflow_v3::vault_resource_addr" \
     --args address:YOUR_ADMIN_ADDRESS
   ```

2. Send test USDC to that address from faucet or your wallet

### Error: "USDC not found in Aave reserves"
**Solution**: Aave V3 might not have USDC listed on testnet. Check available reserves:
```bash
curl http://localhost:3000/api/vault-aave-supply?vaultAddress=YOUR_VAULT_ADDRESS
```

## Verification Steps

After successful test:

1. **Check Vault Contract State**:
   ```bash
   aptos move view \
     --function-id "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b::yieldflow_v3::get_aave_balance" \
     --args address:YOUR_ADMIN_ADDRESS
   ```

2. **Check Transactions on Explorer**:
   - Open both explorer URLs from response
   - Verify both transactions succeeded
   - Check events emitted

3. **Check Aave Position**:
   - Query Aave for vault's aToken balance
   - Should show supplied amount + accrued interest

## Demo Presentation Flow

1. **Show Vault Contract**:
   ```
   "First, users deposit USDC to our vault contract on Aptos..."
   [Show deposit transaction on explorer]
   ```

2. **Show Admin Action**:
   ```
   "Then, admin deploys funds to Aave for yield generation..."
   [Run the test command]
   ```

3. **Show Both Transactions**:
   ```
   "Notice TWO transactions:
   1. Vault contract tracking - proves contracts are useful
   2. Aave SDK deposit - proves real yield generation"
   [Open both explorer links]
   ```

4. **Show Yield**:
   ```
   "Now the vault is earning X% APY on Aave, completely transparent..."
   [Show Aave dashboard or query balance]
   ```

## Next Steps for Production

- [ ] Remove private keys from frontend/API
- [ ] Use secure key management (AWS KMS, HashiCorp Vault)
- [ ] Add transaction batching for better UX
- [ ] Implement automated rebalancing
- [ ] Add more DeFi protocols beyond Aave
