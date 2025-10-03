# Cross-Yield Architecture Documentation

## Overview

Cross-Yield is a yield optimization platform that combines automated smart wallet strategies with manual cross-chain transfers for optimal user control and functionality.

## Core Architecture

### 🎯 Design Principle: Separation of Concerns

```
┌─────────────────────────────────────────────────────────────┐
│                    CROSS-YIELD PLATFORM                     │
├─────────────────────┬───────────────────────────────────────┤
│   AUTOMATED YIELDS  │         MANUAL CCTP                   │
│                     │                                       │
│  Smart Wallet       │     Frontend + Direct Calls          │
│  • Auto-compound    │     • User signs                      │
│  • Strategy exec    │     • Full control                    │
│  • Gas optimization │     • Proven working                  │
│  • No user signing  │     • Cross-chain transfers          │
└─────────────────────┴───────────────────────────────────────┘
```

## Components

### 1. Smart Wallet Contract
**Purpose**: Automated yield optimization within a single chain

**Features**:
- ✅ Hold user funds securely
- ✅ Execute yield strategies automatically
- ✅ Batch operations for gas efficiency
- ✅ Programmable logic for optimal timing
- ✅ No user interaction required for strategy execution

**Example Flow**:
```
User deposits USDC → Smart Wallet → Auto-compound in DeFi protocols
                                 → Rebalance based on APY
                                 → Optimize gas timing
                                 → Generate yield reports
```

### 2. Frontend CCTP Integration
**Purpose**: Manual cross-chain transfers with full user control

**Features**:
- ✅ Direct wallet integration (proven working)
- ✅ User signs each CCTP transaction
- ✅ Real-time attestation tracking
- ✅ Cross-chain balance monitoring
- ✅ User maintains complete control

**Example Flow**:
```
User wants to move funds → Frontend prepares CCTP → User signs → Circle processes
Base: 100 USDC                Transaction details   Wallet sig   Attestation
                              ↓                      ↓           ↓
Ethereum: 0 USDC              Gas estimate           Broadcast    Mint on dest
```

## Technical Implementation

### Smart Wallet Architecture

```solidity
contract UserSmartWallet {
    // Core functionality
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external;
    function executeStrategy(bytes calldata strategyData) external;

    // Automated features
    function autoCompound() internal;
    function rebalancePortfolio() internal;
    function optimizeGas() internal;

    // NO CCTP integration - keeping it simple and focused
}
```

### Frontend CCTP Integration

```javascript
// Proven working pattern
const cctpTransfer = async (amount, destinationChain) => {
  // Direct wallet call (works perfectly)
  const tx = await tokenMessenger.depositForBurn(
    amount,
    destinationDomain,
    recipient,
    burnToken,
    destinationCaller,
    maxFee,
    minFinalityThreshold
  );

  // Track attestation
  await trackAttestation(tx.hash);
};
```

## Why This Architecture?

### ✅ Benefits

1. **Clear Separation**: Each component has a single, focused responsibility
2. **Proven Technology**: CCTP works perfectly via direct calls
3. **User Control**: Users maintain full control over cross-chain moves
4. **Automation**: Smart wallet handles complex yield strategies automatically
5. **Reliability**: No forcing incompatible technologies together
6. **Security**: Reduces attack surface by avoiding complex integrations

### ❌ Previous Issues (Solved)

1. **Smart Contract CCTP**: Failed consistently despite multiple attempts
2. **Complex Architecture**: Trying to force everything into smart contracts
3. **User Experience**: Users lost control over cross-chain transfers
4. **Reliability**: Multiple points of failure in integrated approach

## Development Status

### ✅ Completed
- CCTP V2 interface research and implementation
- Multiple smart contract CCTP attempts (confirmed not working)
- Direct CCTP calls (confirmed working perfectly)
- Architecture decision and documentation

### 🚧 Current Implementation
- Smart wallet optimization for yield strategies
- Frontend CCTP integration
- Complete end-to-end testing

### 📋 Next Steps
1. Focus UserSmartWallet on yield optimization
2. Integrate proven CCTP pattern in frontend
3. Test complete user journey
4. Deploy and validate

## Repository Structure

```
packages/
├── hardhat/
│   ├── contracts/
│   │   ├── UserSmartWallet.sol    # Yield-focused smart wallet
│   │   └── strategies/            # Yield strategy contracts
│   └── scripts/
│       ├── testDirectCCTP.ts      # Proven working CCTP
│       └── deploy/                # Deployment scripts
├── nextjs/
│   ├── hooks/
│   │   ├── useCCTP.ts             # CCTP frontend integration
│   │   └── useSmartWallet.ts      # Smart wallet interactions
│   └── components/
│       ├── CCTPTransfer.tsx       # Manual CCTP UI
│       └── YieldDashboard.tsx     # Automated yield display
└── ARCHITECTURE.md                # This document
```

## Security Considerations

### Smart Wallet Security
- Multi-signature capabilities
- Time-locked withdrawals for large amounts
- Strategy whitelisting
- Emergency pause functionality

### CCTP Security
- User signs every cross-chain transaction
- Real-time attestation verification
- Destination address validation
- Amount limits and confirmations

## Conclusion

This architecture provides the best of both worlds:
- **Automation** where it adds value (yield optimization)
- **User control** where it matters (cross-chain transfers)
- **Proven technology** for reliable operation
- **Clear separation** for maintainable code

The platform focuses on what each component does best, resulting in a more reliable, secure, and user-friendly system.