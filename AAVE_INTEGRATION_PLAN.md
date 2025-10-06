# Aave V3 Integration Plan - Complete Implementation Guide

## 🔍 Issues Identified

### Issue #1: Vault Address is `0x0`
- **Error**: `Module not found by Address(0x0), Module name(yieldflow)`
- **Root Cause**: `NEXT_PUBLIC_APTOS_VAULT_ADDRESS` environment variable not set
- **Location**: `/packages/nextjs/config/aptos.config.ts`
- **Impact**: All vault operations fail
- **Fix**: Set correct vault address in config

### Issue #2: Strategy Page CCTP Not Working
- **Component**: `CCTPStrategyExecution` uses `useCCTPAdvanced` hook
- **Fund Page**: `CCTPBridge` component works (different implementation)
- **Root Cause**: Different CCTP implementations, need to consolidate
- **Impact**: Users cannot execute CCTP from strategy page

### Issue #3: Indexer Error
- **Error**: `POST https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql/transactions 400`
- **Location**: `useAptosVault.ts` transaction fetching
- **Impact**: Transaction history not loading
- **Fix**: Update indexer URL or query format

---

## 📋 COMPLETE PLAN - STEP BY STEP

### Phase 1: Fix Critical Issues 🔥

#### Step 1.1: Fix Vault Address Configuration
**Priority**: 🔴 CRITICAL - BLOCKING EVERYTHING

**Current Issue**:
```typescript
// config/aptos.config.ts
vaultAddress: process.env.NEXT_PUBLIC_APTOS_VAULT_ADDRESS || "0x0"  // ❌ Defaults to 0x0
```

**Solution**:
```typescript
// config/aptos.config.ts
vaultAddress: "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b"  // ✅ Hardcoded
```

**Files to Modify**:
- [ ] `/packages/nextjs/config/aptos.config.ts`
- [ ] Remove all `|| "0x0"` fallbacks
- [ ] Use actual deployed vault address

---

#### Step 1.2: Fix Indexer URL
**Priority**: 🔴 CRITICAL

**Current Issue**:
```
POST https://indexer-testnet.staging.gcp.aptosdev.com/v1/graphql/transactions 400
```

**Solution**:
```typescript
// config/aptos.config.ts
indexerUrl: "https://api.testnet.aptoslabs.com/v1/graphql"  // Correct testnet URL
```

**Files to Modify**:
- [ ] `/packages/nextjs/config/aptos.config.ts`
- [ ] `/packages/nextjs/hooks/useAptosVault.ts` - Add error handling for indexer

**Error Handling**:
```typescript
try {
  const response = await fetch(APTOS_CONFIG.indexerUrl, { ... });
  if (!response.ok) {
    console.warn("Indexer unavailable, using fallback");
    setTransactions([]); // Graceful degradation
    return;
  }
} catch (err) {
  console.error("Indexer error:", err);
  // Don't fail entire app if indexer is down
}
```

---

#### Step 1.3: Uncomment Aave Integration in Move Contract
**Priority**: 🔴 CRITICAL

**Current State**: Aave integration is commented out for safety

**Location**: `/Users/rohan/aptos-cctp/contracts/sources/native_usdc_vault.move`

**Changes Required**:

```move
public entry fun supply_to_aave(admin: &signer, amount: u64)
acquires VaultManager {
    // ... existing code ...

    // UNCOMMENT THIS SECTION:
    let amount_u256 = (amount as u256);
    let referral_code: u16 = 0;
    AAVE_POOL::supply_logic::supply(
        &vault_signer,
        USDC_FA_METADATA,
        amount_u256,
        vault_addr,
        referral_code
    );

    // REMOVE THIS LINE:
    // vault.aave_supplied = vault.aave_supplied + amount;  // ❌ Delete this
}
```

**Also Update**:
```move
public entry fun withdraw_from_aave(admin: &signer, amount: u64) {
    // UNCOMMENT:
    let amount_u256 = (amount as u256);
    AAVE_POOL::supply_logic::withdraw(
        &vault_signer,
        USDC_FA_METADATA,
        amount_u256,
        vault_addr
    );

    // REMOVE THIS:
    // vault.aave_supplied = vault.aave_supplied - amount;  // ❌ Delete this
}
```

**Deployment Steps**:
1. Uncomment Aave calls
2. Remove tracking-only lines
3. Compile contract: `aptos move compile`
4. Deploy: `aptos move publish --profile <your-profile>`
5. Note new deployment address

---

### Phase 2: Consolidate CCTP 🌉

#### Step 2.1: Analysis - Compare CCTP Implementations

**Working Component**: `CCTPBridge.tsx` (used in Fund page)
- Uses direct contract calls
- Implements full 6-step flow
- Handles Aptos wallet integration
- Includes vault deposit step

**Not Working**: `CCTPStrategyExecution.tsx` (used in Strategy page)
- Uses `useCCTPAdvanced` hook
- Different step tracking
- Missing Aptos wallet integration?

**Action Items**:
- [ ] Read both files side-by-side
- [ ] Identify key differences
- [ ] Document why CCTPBridge works
- [ ] Find what's missing in CCTPStrategyExecution

---

#### Step 2.2: Create Unified CCTP Component

**Approach**: Extract working logic from `CCTPBridge` into reusable hook

**New File**: `/packages/nextjs/hooks/useCCTPUnified.ts`

```typescript
export function useCCTPUnified() {
  return {
    // Step 1: Approve USDC
    approveUSDC: async (amount: string) => { ... },

    // Step 2: Burn USDC and get message
    burnUSDC: async (amount: string) => { ... },

    // Step 3: Get attestation from Circle
    getAttestation: async (messageHash: string) => { ... },

    // Step 4: Receive on Aptos
    receiveOnAptos: async (messageBytes: string, attestation: string) => { ... },

    // Step 5: Deposit to vault (optional)
    depositToVault: async (amount: number, adminAddress: string) => { ... },

    // Complete flow
    executeFullCCTP: async (amount: string, depositToVault: boolean) => { ... }
  };
}
```

---

#### Step 2.3: Update Strategy Page

**File**: `/packages/nextjs/app/strategies/page.tsx`

**Replace**:
```tsx
<CCTPStrategyExecution strategy={selectedStrategy} />
```

**With**:
```tsx
<AptosStrategyExecutor strategy={selectedStrategy} />
```

**New Component**: `/packages/nextjs/components/AptosStrategyExecutor.tsx`
- Uses unified CCTP hook
- Same working logic as Fund page
- Adds strategy-specific UI

---

### Phase 3: Complete Flow Integration 🔄

#### Step 3.1: End-to-End Flow Design

```
┌─────────────────────────────────────────────────────────────┐
│ User clicks "Deploy to Aptos Strategy (Aave)"              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 1: CCTP Bridge (Base Sepolia → Aptos)                 │
│ - User on Base Sepolia                                      │
│ - Approve USDC                                              │
│ - Burn USDC                                                 │
│ - Get attestation from Circle                               │
│ - Receive on Aptos user wallet                             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: User Wallet → Vault                                 │
│ - User signs transaction                                    │
│ - deposit(amount, admin_address)                            │
│ - USDC transferred to vault's resource account             │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Vault → Aave (Admin Action)                        │
│ - Admin calls supply_to_aave(amount)                        │
│ - Vault's resource account signs Aave transaction          │
│ - USDC supplied to Aave lending pool                       │
│ - Starts earning yield                                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ Strategy Active - Earning Yield in Aave                  │
└─────────────────────────────────────────────────────────────┘
```

---

#### Step 3.2: Implementation - Unified Strategy Executor

**New File**: `/packages/nextjs/hooks/useAptosStrategyExecution.ts`

```typescript
import { useState } from "react";
import { useCCTPUnified } from "./useCCTPUnified";
import { useAptosVault } from "./useAptosVault";

export function useAptosStrategyExecution() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cctp = useCCTPUnified();
  const { depositToVault, supplyToAave } = useAptosVault();

  const executeFullStrategy = async (
    amount: string,
    skipCCTP: boolean = false,
    adminAddress: string
  ) => {
    try {
      setIsExecuting(true);
      setError(null);

      if (!skipCCTP) {
        // Step 1: CCTP Bridge
        setCurrentStep(1);
        await cctp.executeFullCCTP(amount, false);
      }

      // Step 2: Deposit to Vault
      setCurrentStep(2);
      const amountNum = parseFloat(amount);
      await depositToVault(amountNum, adminAddress);

      // Step 3: Supply to Aave (admin action)
      setCurrentStep(3);
      await supplyToAave(amountNum);

      setCurrentStep(4); // Complete
      return true;
    } catch (err: any) {
      setError(err.message);
      return false;
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    executeFullStrategy,
    currentStep,
    isExecuting,
    error,
    resetExecution: () => {
      setCurrentStep(0);
      setError(null);
    }
  };
}
```

---

#### Step 3.3: Direct Deposit Option (Skip CCTP)

**Use Case**: User already has USDC on Aptos, wants to deploy directly

**UI Component**:

```tsx
// components/AptosStrategyExecutor.tsx

const [skipCCTP, setSkipCCTP] = useState(false);
const [aptosBalance, setAptosBalance] = useState(0);

// Fetch user's Aptos USDC balance
useEffect(() => {
  if (aptosAccount) {
    fetchAptosUSDCBalance(aptosAccount.address).then(setAptosBalance);
  }
}, [aptosAccount]);

return (
  <Card>
    <CardHeader>
      <CardTitle>Deploy to Aave Strategy on Aptos</CardTitle>
    </CardHeader>
    <CardContent>
      {/* Option 1: CCTP Bridge */}
      <div className="mb-4">
        <label>
          <input
            type="checkbox"
            checked={skipCCTP}
            onChange={(e) => setSkipCCTP(e.target.checked)}
          />
          I already have USDC on Aptos (skip bridge)
        </label>
      </div>

      {skipCCTP && (
        <Alert>
          <AlertDescription>
            Your Aptos USDC Balance: {aptosBalance.toFixed(2)} USDC
          </AlertDescription>
        </Alert>
      )}

      <Input
        type="number"
        placeholder="Amount to deposit"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        max={skipCCTP ? aptosBalance : undefined}
      />

      <Button onClick={() => executeStrategy(amount, skipCCTP)}>
        {skipCCTP ? "Deploy Directly" : "Bridge & Deploy"}
      </Button>

      {/* Progress indicator */}
      {isExecuting && (
        <div className="mt-4">
          <Progress value={getProgressPercentage(currentStep)} />
          <p className="text-sm mt-2">{getStepDescription(currentStep)}</p>
        </div>
      )}
    </CardContent>
  </Card>
);
```

**Step Descriptions**:
```typescript
function getStepDescription(step: number, skipCCTP: boolean): string {
  if (skipCCTP) {
    switch (step) {
      case 1: return "Depositing USDC to vault...";
      case 2: return "Supplying to Aave lending pool...";
      case 3: return "✅ Strategy deployed! Earning yield in Aave";
      default: return "";
    }
  } else {
    switch (step) {
      case 1: return "Bridging USDC from Base to Aptos...";
      case 2: return "Depositing to vault...";
      case 3: return "Supplying to Aave...";
      case 4: return "✅ Complete! Earning yield";
      default: return "";
    }
  }
}
```

---

### Phase 4: UI/UX Improvements ✨

#### Step 4.1: Strategy Execution Progress UI

**Visual Flow Indicator**:

```tsx
<div className="flex items-center justify-between mb-6">
  {/* Step 1: CCTP */}
  <div className={`step ${currentStep >= 1 ? 'active' : ''}`}>
    <div className="step-icon">
      {currentStep > 1 ? <CheckCircle /> : <Loader2 />}
    </div>
    <p className="step-label">Bridge USDC</p>
  </div>

  <ArrowRight className="mx-2" />

  {/* Step 2: Vault */}
  <div className={`step ${currentStep >= 2 ? 'active' : ''}`}>
    <div className="step-icon">
      {currentStep > 2 ? <CheckCircle /> : <Clock />}
    </div>
    <p className="step-label">Deposit to Vault</p>
  </div>

  <ArrowRight className="mx-2" />

  {/* Step 3: Aave */}
  <div className={`step ${currentStep >= 3 ? 'active' : ''}`}>
    <div className="step-icon">
      {currentStep > 3 ? <CheckCircle /> : <Clock />}
    </div>
    <p className="step-label">Supply to Aave</p>
  </div>

  <ArrowRight className="mx-2" />

  {/* Step 4: Complete */}
  <div className={`step ${currentStep === 4 ? 'active' : ''}`}>
    <div className="step-icon">
      {currentStep === 4 ? <CheckCircle /> : <Target />}
    </div>
    <p className="step-label">Earning Yield</p>
  </div>
</div>
```

---

#### Step 4.2: Transaction Links & Explorer Integration

**After Each Step**:

```tsx
{cctpTxHash && (
  <Alert>
    <AlertDescription>
      CCTP Transaction:
      <a
        href={`https://sepolia.basescan.org/tx/${cctpTxHash}`}
        target="_blank"
        className="ml-2 text-blue-500"
      >
        View on BaseScan <ExternalLink className="inline w-4 h-4" />
      </a>
    </AlertDescription>
  </Alert>
)}

{vaultDepositTxHash && (
  <Alert>
    <AlertDescription>
      Vault Deposit:
      <a
        href={`https://explorer.aptoslabs.com/txn/${vaultDepositTxHash}?network=testnet`}
        target="_blank"
        className="ml-2 text-blue-500"
      >
        View on Aptos Explorer <ExternalLink className="inline w-4 h-4" />
      </a>
    </AlertDescription>
  </Alert>
)}

{aaveSupplyTxHash && (
  <Alert variant="success">
    <AlertDescription>
      Aave Supply:
      <a
        href={`https://explorer.aptoslabs.com/txn/${aaveSupplyTxHash}?network=testnet`}
        target="_blank"
        className="ml-2 text-blue-500"
      >
        View on Aptos Explorer <ExternalLink className="inline w-4 h-4" />
      </a>
    </AlertDescription>
  </Alert>
)}
```

---

#### Step 4.3: Balance Display at Each Step

```tsx
<div className="grid grid-cols-3 gap-4 mb-4">
  {/* User Aptos Wallet */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Aptos Wallet</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{userAptosBalance} USDC</p>
    </CardContent>
  </Card>

  {/* Vault Balance */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Vault</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{vaultBalance} USDC</p>
    </CardContent>
  </Card>

  {/* Aave Position */}
  <Card>
    <CardHeader>
      <CardTitle className="text-sm">Aave (Earning {aaveApy}% APY)</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">{aaveBalance} USDC</p>
      <p className="text-sm text-green-500">+{aaveEarnings} earned</p>
    </CardContent>
  </Card>
</div>
```

---

### Phase 5: Testing 🧪

#### Step 5.1: Unit Tests

**Test Vault Address Resolution**:
```typescript
// __tests__/config.test.ts
describe('APTOS_CONFIG', () => {
  it('should have valid vault address', () => {
    expect(APTOS_CONFIG.vaultAddress).not.toBe("0x0");
    expect(APTOS_CONFIG.vaultAddress).toMatch(/^0x[a-f0-9]{64}$/);
  });
});
```

**Test CCTP Flow**:
```typescript
// __tests__/useCCTPUnified.test.ts
describe('useCCTPUnified', () => {
  it('should execute full CCTP flow', async () => {
    const { executeFullCCTP } = useCCTPUnified();
    const result = await executeFullCCTP("10", false);
    expect(result.success).toBe(true);
  });
});
```

---

#### Step 5.2: Integration Tests

**Complete Flow Test**:
```typescript
// __tests__/integration/aptos-strategy.test.ts
describe('Aptos Strategy Execution', () => {
  it('should execute CCTP -> Vault -> Aave flow', async () => {
    // 1. Mock CCTP bridge
    const cctpResult = await mockCCTPBridge("10");
    expect(cctpResult.received).toBe(true);

    // 2. Deposit to vault
    const vaultResult = await depositToVault(10, adminAddress);
    expect(vaultResult.success).toBe(true);

    // 3. Supply to Aave
    const aaveResult = await supplyToAave(10);
    expect(aaveResult.success).toBe(true);

    // 4. Verify balances
    const aaveBalance = await getAaveBalance(adminAddress);
    expect(aaveBalance).toBe(10);
  });
});
```

**Direct Deposit Test**:
```typescript
it('should deposit directly from Aptos wallet', async () => {
  const { executeFullStrategy } = useAptosStrategyExecution();
  const result = await executeFullStrategy("5", true, adminAddress);
  expect(result).toBe(true);
});
```

---

#### Step 5.3: Manual Testing Checklist

**Pre-Test Setup**:
- [ ] Fund Base Sepolia wallet with testnet ETH
- [ ] Get testnet USDC on Base Sepolia
- [ ] Fund Aptos testnet wallet with APT
- [ ] Get testnet USDC on Aptos (via faucet or CCTP)
- [ ] Connect both wallets to app

**Test Case 1: Full CCTP Flow**
- [ ] Navigate to Strategies page
- [ ] Select "Aptos Aave Strategy"
- [ ] Click "Deploy Strategy"
- [ ] Enter amount: 10 USDC
- [ ] Do NOT check "Skip CCTP"
- [ ] Execute flow
- [ ] Verify Step 1: CCTP completes
- [ ] Verify Step 2: Vault deposit completes
- [ ] Verify Step 3: Aave supply completes
- [ ] Check Aave balance in UI
- [ ] Check transactions on explorer

**Test Case 2: Direct Deposit (Skip CCTP)**
- [ ] Ensure Aptos wallet has USDC
- [ ] Navigate to Strategies page
- [ ] Select "Aptos Aave Strategy"
- [ ] Click "Deploy Strategy"
- [ ] Enter amount: 5 USDC
- [ ] Check "Skip CCTP" checkbox
- [ ] Verify UI shows Aptos balance
- [ ] Execute flow
- [ ] Verify skips CCTP steps
- [ ] Verify Vault deposit completes
- [ ] Verify Aave supply completes

**Test Case 3: Error Scenarios**
- [ ] Try with 0 USDC balance
- [ ] Try with insufficient balance
- [ ] Cancel transaction midway
- [ ] Try with wrong network
- [ ] Verify error messages are helpful

---

## 📁 Files to Create/Modify

### New Files to Create

| File Path | Purpose | Lines (Est.) |
|-----------|---------|--------------|
| `/packages/nextjs/hooks/useCCTPUnified.ts` | Unified CCTP logic | ~300 |
| `/packages/nextjs/hooks/useAptosStrategyExecution.ts` | Complete strategy flow | ~200 |
| `/packages/nextjs/components/AptosStrategyExecutor.tsx` | Strategy UI component | ~400 |
| `/packages/nextjs/hooks/useAptosBalance.ts` | Fetch Aptos USDC balance | ~50 |
| `/AAVE_INTEGRATION_PLAN.md` | This document | ~1000 |

### Files to Modify

| File Path | Changes Required | Priority |
|-----------|------------------|----------|
| `/packages/nextjs/config/aptos.config.ts` | Fix vault address & indexer URL | 🔴 Critical |
| `/packages/nextjs/hooks/useAptosVault.ts` | Fix indexer error handling | 🔴 Critical |
| `/Users/rohan/aptos-cctp/contracts/sources/native_usdc_vault.move` | Uncomment Aave integration | 🔴 Critical |
| `/packages/nextjs/app/strategies/page.tsx` | Integrate AptosStrategyExecutor | 🟡 High |
| `/packages/nextjs/components/CCTPStrategyExecution.tsx` | Replace or refactor | 🟡 High |
| `/packages/nextjs/components/CCTPBridge.tsx` | Extract reusable logic | 🟢 Medium |

---

## ⚠️ Critical Path - Must Complete in Order

```
┌────────────────────────────────────────────────────────────┐
│ 1. Fix vault address (0x0 → real address)                 │
│    ❌ BLOCKING: All vault operations fail without this     │
│    ⏱️  Time: 5 minutes                                     │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 2. Fix indexer URL                                         │
│    ⚠️  BLOCKING: Transaction history not loading           │
│    ⏱️  Time: 5 minutes                                     │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 3. Test deposit to vault                                   │
│    ✅ VALIDATION: Confirms fixes work                      │
│    ⏱️  Time: 10 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 4. Uncomment Aave code in Move contract                   │
│    🎯 GOAL: Enable real Aave integration                  │
│    ⏱️  Time: 10 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 5. Deploy Move contract to Aptos testnet                  │
│    🚀 DEPLOYMENT: Make Aave integration live               │
│    ⏱️  Time: 15 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 6. Test Aave supply from frontend                         │
│    ✅ VALIDATION: Verify Aave integration works           │
│    ⏱️  Time: 10 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 7. Compare CCTP implementations                            │
│    🔍 ANALYSIS: Find why strategy page fails              │
│    ⏱️  Time: 20 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 8. Fix strategy page CCTP                                 │
│    🔧 FIX: Make strategy CCTP work like fund page         │
│    ⏱️  Time: 30 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 9. Integrate full flow (CCTP → Vault → Aave)              │
│    🎯 GOAL: Complete strategy execution                   │
│    ⏱️  Time: 45 minutes                                    │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ 10. Add direct deposit UI (skip CCTP option)              │
│     ✨ ENHANCEMENT: Better UX for Aptos users             │
│     ⏱️  Time: 30 minutes                                   │
└────────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────────┐
│ ✅ COMPLETE - Ready for Hackathon Demo!                    │
│    Total Time: ~3 hours                                    │
└────────────────────────────────────────────────────────────┘
```

---

## 🎯 Recommended Execution Order

### Immediate (Do Now - ~20 min)
1. ✅ Fix vault address in `config/aptos.config.ts`
2. ✅ Fix indexer URL in `config/aptos.config.ts`
3. ✅ Test deposit to vault (confirm fix works)

### High Priority (Next - ~35 min)
4. ✅ Uncomment Aave code in Move contract
5. ✅ Deploy Move contract to testnet
6. ✅ Test Aave supply from frontend

### Medium Priority (Then - ~50 min)
7. ✅ Compare CCTP implementations
8. ✅ Fix strategy page CCTP

### Final Integration (Last - ~75 min)
9. ✅ Create unified strategy execution
10. ✅ Add direct deposit option
11. ✅ Polish UI/UX
12. ✅ End-to-end testing

---

## 📊 Success Metrics

### Must Have (Critical)
- [ ] Vault address resolves correctly (not 0x0)
- [ ] Deposit to vault works from user wallet
- [ ] Aave supply function works from vault
- [ ] CCTP works from strategy page
- [ ] Can execute full flow: CCTP → Vault → Aave

### Should Have (Important)
- [ ] Direct deposit option (skip CCTP)
- [ ] Transaction history loads
- [ ] Proper error handling
- [ ] Progress indicators work
- [ ] Balance displays update

### Nice to Have (Enhancement)
- [ ] Aave APY displays correctly
- [ ] Yield tracking over time
- [ ] Multiple strategy options
- [ ] Advanced analytics

---

## 🚀 Deployment Checklist

### Before Deploying Move Contract
- [ ] All Aave calls uncommented
- [ ] No syntax errors
- [ ] Compile succeeds locally
- [ ] Test on local testnet first

### After Deploying Move Contract
- [ ] Note new contract address
- [ ] Update frontend config with new address
- [ ] Verify contract on explorer
- [ ] Test all functions via CLI

### Before Going Live
- [ ] All critical issues fixed
- [ ] End-to-end flow tested
- [ ] Error handling in place
- [ ] UI/UX polished
- [ ] Documentation updated

---

## 📝 Notes for Hackathon Demo

### What to Highlight
1. **Real Protocol Integration**
   - "We've integrated Aave V3, the first non-EVM deployment"
   - Show actual contract calls to Aave

2. **Cross-Chain Innovation**
   - "Users bridge from Base using Circle's CCTP"
   - Emphasize native USDC (not wrapped)

3. **Resource Account Architecture**
   - "Vault uses Move's resource account with signer capability"
   - Show how vault autonomously interacts with Aave

4. **Complete Flow**
   - Demonstrate full CCTP → Vault → Aave
   - Show balances updating at each step

### Demo Script
```
1. "Let me show you our cross-chain yield optimizer"
2. "User starts with USDC on Base Sepolia"
3. "We use Circle's CCTP to bridge to Aptos - native USDC"
4. "Funds deposit into our smart vault"
5. "Vault automatically supplies to Aave V3 on Aptos"
6. "This is Aave's first non-EVM deployment, written in Move"
7. "User's funds are now earning X% APY in Aave"
8. [Show transaction links on explorer]
9. [Show balances updating in real-time]
```

---

## 🐛 Troubleshooting Guide

### Issue: Vault address is 0x0
**Solution**: Update `/packages/nextjs/config/aptos.config.ts` with hardcoded address

### Issue: Indexer 400 error
**Solution**: Use correct indexer URL or add error handling to gracefully degrade

### Issue: CCTP not working in strategy page
**Solution**: Use same implementation as Fund page CCTPBridge component

### Issue: Aave supply fails
**Solution**: Verify Aave contract is deployed on testnet, check function signatures

### Issue: Transaction fails with "Module not found"
**Solution**: Ensure Move contract is deployed to correct address

---

## 📚 Additional Resources

### Aave V3 on Aptos
- GitHub: https://github.com/aave/aptos-aave-v3
- SDK: https://github.com/aave/aave-v3-aptos-ts-sdk
- Testnet UI: https://aptos.aave.com/

### Circle CCTP
- Docs: https://developers.circle.com/stablecoins/docs/cctp-getting-started
- Aptos Integration: https://developers.circle.com/stablecoins/quickstart-setup-transfer-usdc-aptos

### Aptos Resources
- Move Docs: https://aptos.dev/move/move-on-aptos/
- Explorer: https://explorer.aptoslabs.com/?network=testnet
- Faucet: https://aptos.dev/en/network/faucet

---

## ✅ Final Checklist Before Demo

- [ ] Vault address configured correctly
- [ ] Indexer URL working or gracefully degrading
- [ ] Move contract deployed with Aave integration
- [ ] CCTP works from both fund and strategy pages
- [ ] Direct deposit option available
- [ ] Full flow tested end-to-end
- [ ] UI polished and error messages helpful
- [ ] Transaction links work
- [ ] Balances display correctly
- [ ] Demo script prepared
- [ ] Backup plan if live demo fails (video/screenshots)

---

**Document Version**: 1.0
**Last Updated**: 2025-01-06
**Author**: Claude
**Status**: Ready for Implementation
