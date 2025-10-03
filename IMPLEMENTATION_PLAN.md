# 3-Hour Implementation Plan: CrossYield Aptos Integration

## 🤖 Multi-Agent Strategy Session

### Senior Blockchain Dev: *"Let me analyze the technical requirements"*
*"Looking at the codebase, I see we have a complete EVM system with SmartWalletFactory and UserSmartWallet. The Aptos vault exists but is isolated. We need to create a bridge between these systems. The key is the `/api/strategy-execute` endpoint - it currently only handles EVM allocations, but we need to extend it to handle Aptos allocations via CCTP bridge."*

### Junior Blockchain Dev: *"I'll map out the implementation steps"*
*"The integration points are clear:
1. Backend: Extend strategy-execute to call Aptos vault
2. Frontend: Update strategy display to show Aptos allocations  
3. CCTP: Connect bridge to strategy execution
4. Testing: End-to-end flow validation"*

### Hackathon Winner: *"Let's prioritize for maximum impact"*
*"We have 3 hours. Focus on:
1. **Hour 1**: Backend integration (strategy-execute + Aptos vault)
2. **Hour 2**: Frontend updates (Aptos strategy display + wallet connection)
3. **Hour 3**: Testing + demo preparation

Skip complex protocol integrations - focus on core money flow working."*

---

## 🎯 Core Implementation Strategy

### Phase 1: Backend Integration (Hour 1)

#### 1.1 Copy Aptos Contracts to CrossYield Project
```bash
# Copy Aptos vault contract
cp /Users/rohan/aptos-cctp/contracts/sources/native_usdc_vault.move packages/hardhat/contracts/aptos/
cp /Users/rohan/aptos-cctp/contracts/Move.toml packages/hardhat/contracts/aptos/
```

#### 1.2 Integrate VaultIntegrationService
```typescript
// Add to usdc-ai-optimiser/src/services/
// Copy vaultIntegration.ts from aptos-cctp backend
// Adapt for CrossYield backend structure
```

#### 1.3 Extend Strategy Execution Endpoint
```python
# Modify usdc-ai-optimiser/src/main.py
# Add Aptos allocation handling to /api/strategy-execute
# Integrate CCTP bridge for EVM → Aptos transfers
```

### Phase 2: Frontend Integration (Hour 2)

#### 2.1 Update Strategy Display
```typescript
// Modify packages/nextjs/app/strategies/page.tsx
// Add Aptos strategy filtering and display
// Show cross-chain allocation breakdown
```

#### 2.2 Aptos Wallet Connection
```typescript
// Enhance packages/nextjs/hooks/useMultiChainWallet.ts
// Add Petra wallet connection
// Handle Aptos wallet state management
```

#### 2.3 CCTP Bridge Integration
```typescript
// Connect packages/nextjs/components/CCTPBridge.tsx
// Integrate with strategy execution flow
// Show bridge status and progress
```

### Phase 3: Testing & Demo (Hour 3)

#### 3.1 End-to-End Testing
```bash
# Test complete flow:
# 1. User selects cross-chain strategy
# 2. Backend generates EVM + Aptos allocation
# 3. CCTP bridge transfers USDC to Aptos
# 4. Aptos vault receives and tracks funds
# 5. Frontend shows cross-chain balances
```

#### 3.2 Demo Preparation
```bash
# Prepare demo script
# Test all user flows
# Document any issues
# Prepare presentation materials
```

---

## 🔧 Technical Implementation Details

### Backend Integration Points

#### Current Strategy Execution Flow:
```python
# usdc-ai-optimiser/src/main.py
@app.post("/api/strategy-execute")
async def execute_strategy(strategy: StrategyRequest):
    # Current: Only handles EVM allocations
    for allocation in strategy.allocations:
        if allocation.chain_id in EVM_CHAINS:
            # Execute EVM allocation
            await execute_evm_allocation(allocation)
    
    # Missing: Aptos allocation handling
    # Need: CCTP bridge + Aptos vault integration
```

#### Enhanced Strategy Execution Flow:
```python
@app.post("/api/strategy-execute")
async def execute_strategy(strategy: StrategyRequest):
    # Handle EVM allocations
    for allocation in strategy.allocations:
        if allocation.chain_id in EVM_CHAINS:
            await execute_evm_allocation(allocation)
        elif allocation.chain_id == "aptos":
            # New: Handle Aptos allocations
            await execute_aptos_allocation(allocation)
    
    # New: Execute CCTP bridge if needed
    if strategy.requires_bridge:
        await execute_cctp_bridge(strategy)
```

### Frontend Integration Points

#### Current Strategy Display:
```typescript
// packages/nextjs/app/strategies/page.tsx
const chainBreakdown = strategies.reduce((acc, strategy) => {
    strategy.allocations.forEach(allocation => {
        if (EVM_CHAINS.includes(allocation.chain_id)) {
            acc[allocation.chain_id] = (acc[allocation.chain_id] || 0) + allocation.amount;
        }
    });
    return acc;
}, {});
```

#### Enhanced Strategy Display:
```typescript
const chainBreakdown = strategies.reduce((acc, strategy) => {
    strategy.allocations.forEach(allocation => {
        if (EVM_CHAINS.includes(allocation.chain_id)) {
            acc[allocation.chain_id] = (acc[allocation.chain_id] || 0) + allocation.amount;
        } else if (allocation.chain_id === "aptos") {
            // New: Handle Aptos allocations
            acc.aptos = (acc.aptos || 0) + allocation.amount;
        }
    });
    return acc;
}, {});
```

---

## 🚨 Critical Success Factors

### Senior Dev: *"Technical Requirements"*
1. **Aptos Vault Integration**: Must connect to existing vault contract
2. **CCTP Bridge**: Must handle EVM → Aptos transfers
3. **Real Data**: No hardcoded values, use actual contract calls
4. **Error Handling**: Robust error handling for cross-chain operations

### Junior Dev: *"Implementation Details"*
1. **Code Reuse**: Leverage existing aptos-cctp backend services
2. **Consistent APIs**: Maintain consistent API patterns
3. **Type Safety**: Proper TypeScript types for Aptos integration
4. **Testing**: Unit tests for critical functions

### Hackathon Winner: *"Demo Strategy"*
1. **Working Demo**: Must show complete cross-chain flow
2. **User Experience**: Smooth user interaction
3. **Visual Impact**: Clear demonstration of cross-chain capabilities
4. **Time Management**: Stick to 3-hour timeline

---

## 📋 Implementation Checklist

### Hour 1: Backend Integration
- [ ] Copy Aptos contracts to CrossYield project
- [ ] Integrate VaultIntegrationService
- [ ] Extend strategy-execute endpoint for Aptos
- [ ] Add CCTP bridge integration
- [ ] Test backend Aptos integration

### Hour 2: Frontend Integration  
- [ ] Update strategy display for Aptos
- [ ] Add Aptos wallet connection
- [ ] Integrate CCTP bridge UI
- [ ] Update fund page for cross-chain
- [ ] Test frontend Aptos integration

### Hour 3: Testing & Demo
- [ ] End-to-end flow testing
- [ ] Fix any integration issues
- [ ] Prepare demo script
- [ ] Document final implementation
- [ ] Prepare presentation

---

## 🎯 Success Metrics

### Technical Metrics:
- [ ] Cross-chain strategy execution working
- [ ] CCTP bridge transfers successful
- [ ] Aptos vault integration functional
- [ ] Frontend shows cross-chain balances
- [ ] No hardcoded/mock data

### Demo Metrics:
- [ ] User can select cross-chain strategy
- [ ] Backend generates EVM + Aptos allocation
- [ ] CCTP bridge transfers USDC to Aptos
- [ ] Frontend displays cross-chain portfolio
- [ ] Complete flow works end-to-end

---

*Implementation plan created by Multi-Agent Team*
*Ready to begin execution*