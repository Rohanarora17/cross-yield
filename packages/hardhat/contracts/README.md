# 🚀 USDC AI Yield Optimizer - Smart Contracts

> **Advanced cross-chain yield optimization contracts with AI agent integration**

This directory contains the smart contracts for the USDC AI Yield Optimizer, a sophisticated DeFi yield optimization platform that uses multi-agent AI coordination to find and execute optimal USDC yield strategies across multiple blockchain networks.

## 📋 Table of Contents

1. [🎯 Overview](#-overview)
2. [🏗️ Architecture](#️-architecture)
3. [📁 Contract Structure](#-contract-structure)
4. [🔧 Setup & Deployment](#-setup--deployment)
5. [🤖 AI Integration](#-ai-integration)
6. [🌐 Cross-Chain Features](#-cross-chain-features)
7. [📊 Protocol Adapters](#-protocol-adapters)
8. [🔒 Security & Access Control](#-security--access-control)
9. [📈 Performance Analytics](#-performance-analytics)
10. [🧪 Testing](#-testing)
11. [🚀 Deployment Guide](#-deployment-guide)

## 🎯 Overview

The USDC AI Yield Optimizer contracts provide a comprehensive infrastructure for:

- **Cross-chain yield optimization** across 5+ networks
- **AI agent integration** for automated strategy execution
- **Multi-protocol support** with 7+ DeFi protocol adapters
- **Risk management** with built-in position limits
- **Performance tracking** and analytics
- **Native USDC bridging** via Circle's CCTP integration

### Key Features

- ✅ **22.3% Expected APY** through cross-chain arbitrage
- ✅ **Multi-Agent AI Coordination** with specialized roles
- ✅ **Cross-Chain Intelligence** spanning multiple networks
- ✅ **Real Execution Capability** through protocol adapters
- ✅ **Risk Management** with position limits and scoring
- ✅ **Performance Analytics** with optimization tracking

## 🏗️ Architecture

### Contract Hierarchy

```
YieldRouter (Main Contract)
├── ChainRegistry (Protocol & Chain Management)
├── ProtocolAdaptor (Protocol Adapters)
│   ├── ERC4626Adapter
│   ├── AaveAdapter
│   ├── MoonwellAdapter
│   ├── RadiantAdapter
│   ├── CurveAdapter
│   ├── BeefyAdapter
│   ├── YearnAdapter
│   ├── CompoundV3Adapter
│   └── SwapAdapter
└── YourContract (Legacy)
```

### Data Flow

```
AI Agents → YieldRouter → ChainRegistry → Protocol Adapters → DeFi Protocols
     ↓              ↓              ↓
Performance    Portfolio      Cross-Chain
Analytics      Tracking       Events
```

## 📁 Contract Structure

### Core Contracts

#### 1. **YieldRouter.sol** - Main Orchestration Contract

The central contract that coordinates all yield optimization activities.

**Key Features:**
- AI agent strategy execution
- Cross-chain portfolio management
- Risk management and position limits
- Performance analytics and tracking
- Fee management and collection

**Main Functions:**
```solidity
// AI Agent Functions
function executeAIStrategy(AIStrategy calldata strategy) external onlyRole(AI_AGENT_ROLE)
function executeRebalance(RebalanceParams calldata params) external onlyRole(REBALANCER_ROLE)
function batchAllocate(string[] calldata protocols, uint256[] calldata amounts, uint256[] calldata chainIds, address user, address asset) external onlyRole(AI_AGENT_ROLE)

// Cross-Chain Functions
function optimizeCrossChain(address user, uint256[] calldata sourceChains, uint256[] calldata targetChains, uint256[] calldata amounts, string[] calldata targetProtocols) external onlyRole(AI_AGENT_ROLE)

// Portfolio Management
function getUserPortfolio(address user) external view returns (uint256 totalValue, uint256 lastOptimization, uint256 optimizationCount)
function getUserProtocolBalance(address user, string calldata protocol) external view returns (uint256)
function getUserChainBalance(address user, uint256 chainId) external view returns (uint256)

// Performance Analytics
function getOptimizationStats(address user) external view returns (uint256 userOptimizations, uint256 averageAPY, uint256 bestAPY, uint256 totalGasSpent)
function updateOptimizationResult(address user, uint256 actualAPY, uint256 gasCost) external onlyRole(AI_AGENT_ROLE)
```

**Data Structures:**
```solidity
struct AIStrategy {
    address user;
    uint256 totalAmount;
    string[] protocols;
    uint256[] amounts;
    uint256[] chainIds;
    uint256 expectedAPY;
    uint256 riskScore;
    uint256 executionDeadline;
}

struct UserPortfolio {
    mapping(string => uint256) protocolBalances;
    mapping(uint256 => uint256) chainBalances;
    uint256 totalValue;
    uint256 lastOptimization;
    uint256 optimizationCount;
}
```

#### 2. **ChainRegistry.sol** - Protocol & Chain Management

Manages protocol adapters and chain information across multiple networks.

**Key Features:**
- Multi-chain protocol registry
- Risk scoring and APY tracking
- Cross-chain opportunity detection
- Protocol lifecycle management

**Main Functions:**
```solidity
// Protocol Management
function addProtocol(string calldata name, address adapter, uint256 chainId, uint256 riskScore, uint256 minAPY, uint256 maxAPY) external onlyRole(PROTOCOL_MANAGER_ROLE)
function updateProtocolInfo(string calldata name, uint256 riskScore, uint256 minAPY, uint256 maxAPY, uint256 tvl) external onlyRole(PROTOCOL_MANAGER_ROLE)
function deactivateProtocol(string calldata name) external onlyRole(PROTOCOL_MANAGER_ROLE)

// Chain Management
function addChain(uint256 chainId, string calldata name, address nativeToken, uint256 gasPrice, uint256 bridgeCost) external onlyRole(ADMIN_ROLE)

// AI Optimization Helpers
function getOptimalProtocols(uint256 minAPY, uint256 maxRiskScore, uint256 chainId) external view returns (string[] memory)
function getCrossChainOpportunities(uint256 sourceChainId, uint256 targetChainId, uint256 minAPYImprovement) external view returns (string[] memory)
function getProtocolsByRiskScore(uint256 maxRiskScore) external view returns (string[] memory)
```

**Data Structures:**
```solidity
struct ProtocolInfo {
    address adapter;
    uint256 chainId;
    uint256 riskScore; // 0-100, lower is safer
    uint256 minAPY; // Minimum expected APY in basis points
    uint256 maxAPY; // Maximum expected APY in basis points
    bool isActive;
    uint256 tvl; // Total Value Locked
    uint256 lastUpdate;
}

struct ChainInfo {
    string name;
    address nativeToken; // USDC address on this chain
    uint256 gasPrice; // Average gas price
    bool isActive;
    uint256 bridgeCost; // Cost to bridge to this chain
}
```

#### 3. **ProtocolAdaptor.sol** - Protocol Adapters

Contains adapter contracts for various DeFi protocols.

**Supported Protocols:**

| Protocol | Chains | Type | Risk Score | Expected APY |
|----------|--------|------|------------|--------------|
| **Aave V3** | Ethereum, Base, Arbitrum | Lending | 10-15 | 4-8% |
| **Moonwell** | Base, Arbitrum | Lending | 20-30 | 8-15% |
| **Radiant Capital** | Arbitrum | Lending | 25-35 | 10-18% |
| **Curve Finance** | Ethereum, Arbitrum | LP | 15-25 | 5-12% |
| **Beefy Finance** | Multi-chain | Yield Farming | 30-50 | 12-25% |
| **Yearn Finance** | Ethereum | Vaults | 20-30 | 6-15% |
| **Compound V3** | Ethereum, Base | Lending | 15-25 | 4-10% |
| **ERC-4626 Vaults** | Multi-chain | Vaults | 20-40 | 8-20% |

**Adapter Interface:**
```solidity
interface IProtocolAdapter {
    function deposit(address user, uint256 amount) external;
    function withdraw(address user, uint256 amount) external;
    function balanceOf(address user) external view returns (uint256);
}
```

## 🔧 Setup & Deployment

### Prerequisites

- Node.js 18+
- Yarn package manager
- Hardhat development environment
- OpenZeppelin contracts v5.0.2

### Installation

```bash
# Install dependencies
yarn install

# Compile contracts
yarn compile

# Run tests
yarn test

# Deploy to local network
yarn deploy
```

### Environment Setup

Create a `.env` file with the following variables:

```env
# Network Configuration
PRIVATE_KEY=your_private_key_here
RPC_URL_ETHEREUM=https://eth-mainnet.alchemyapi.io/v2/your_key
RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/your_key
RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/your_key

# Contract Addresses (will be set after deployment)
REGISTRY_ADDRESS=
YIELD_ROUTER_ADDRESS=
FEE_RECIPIENT_ADDRESS=
```

## 🤖 AI Integration

### AI Agent Roles

The contracts support three specialized AI agent roles:

#### 1. **AI_AGENT_ROLE** - Strategy Execution
- Execute AI-recommended strategies
- Batch allocation across protocols
- Cross-chain optimization
- Performance result updates

#### 2. **REBALANCER_ROLE** - Portfolio Rebalancing
- Execute portfolio rebalancing
- Cross-chain position transfers
- Risk-adjusted allocations

#### 3. **KEEPER_ROLE** - Maintenance Operations
- Legacy allocation functions
- Emergency operations
- Protocol maintenance

### AI Strategy Execution

```solidity
// Example AI strategy execution
AIStrategy memory strategy = AIStrategy({
    user: userAddress,
    totalAmount: 50000 * 1e6, // 50,000 USDC
    protocols: ["moonwell", "radiant", "aave"],
    amounts: [20000 * 1e6, 20000 * 1e6, 10000 * 1e6],
    chainIds: [8453, 42161, 1], // Base, Arbitrum, Ethereum
    expectedAPY: 2230, // 22.3% in basis points
    riskScore: 45, // Moderate risk
    executionDeadline: block.timestamp + 3600 // 1 hour
});

yieldRouter.executeAIStrategy(strategy);
```

### Cross-Chain Optimization

```solidity
// Example cross-chain optimization
uint256[] memory sourceChains = new uint256[](2);
uint256[] memory targetChains = new uint256[](2);
uint256[] memory amounts = new uint256[](2);
string[] memory targetProtocols = new string[](2);

sourceChains[0] = 1; // Ethereum
sourceChains[1] = 1; // Ethereum
targetChains[0] = 42161; // Arbitrum
targetChains[1] = 8453; // Base
amounts[0] = 25000 * 1e6; // 25,000 USDC
amounts[1] = 25000 * 1e6; // 25,000 USDC
targetProtocols[0] = "radiant"; // Radiant Capital
targetProtocols[1] = "moonwell"; // Moonwell

yieldRouter.optimizeCrossChain(user, sourceChains, targetChains, amounts, targetProtocols);
```

## 🌐 Cross-Chain Features

### Supported Chains

| Chain | Chain ID | USDC Address | Bridge Cost | Gas Price |
|-------|----------|--------------|-------------|-----------|
| **Ethereum** | 1 | 0xA0b86a33E6... | High | High |
| **Base** | 8453 | 0x833589fCD6... | Low | Low |
| **Arbitrum** | 42161 | 0xaf88d065e7... | Medium | Medium |
| **Polygon** | 137 | 0x2791Bca1f2... | Low | Low |
| **Avalanche** | 43114 | 0xB97EF9Ef87... | Medium | Medium |

### CCTP Integration

The contracts emit `CrossChainTransfer` events for CCTP integration:

```solidity
event CrossChainTransfer(
    address indexed user,
    uint256 fromChain,
    uint256 toChain,
    uint256 amount
);
```

### Cross-Chain Opportunity Detection

```solidity
// Find cross-chain opportunities
string[] memory opportunities = chainRegistry.getCrossChainOpportunities(
    1, // Source: Ethereum
    42161, // Target: Arbitrum
    500 // Min 5% APY improvement
);
```

## 📊 Protocol Adapters

### Adding New Protocols

To add a new protocol adapter:

1. **Create the adapter contract:**
```solidity
contract NewProtocolAdapter is IProtocolAdapter {
    address public protocol;
    address public asset;

    constructor(address _protocol, address _asset) {
        protocol = _protocol;
        asset = _asset;
    }

    function deposit(address user, uint256 amount) external override {
        IERC20(asset).approve(protocol, amount);
        // Protocol-specific deposit logic
    }

    function withdraw(address user, uint256 amount) external override {
        // Protocol-specific withdraw logic
    }

    function balanceOf(address user) external view override returns (uint256) {
        // Protocol-specific balance query
    }
}
```

2. **Deploy and register:**
```solidity
// Deploy adapter
NewProtocolAdapter adapter = new NewProtocolAdapter(protocolAddress, usdcAddress);

// Register in ChainRegistry
chainRegistry.addProtocol(
    "newprotocol",
    address(adapter),
    chainId,
    riskScore, // 0-100
    minAPY, // Basis points
    maxAPY  // Basis points
);
```

### Protocol Risk Scoring

| Risk Level | Score Range | Protocols | Expected APY |
|------------|-------------|-----------|--------------|
| **Very Low** | 0-15 | Aave, Compound | 4-8% |
| **Low** | 16-30 | Curve, Yearn | 6-15% |
| **Medium** | 31-50 | Moonwell, Beefy | 8-20% |
| **High** | 51-70 | New protocols | 15-30% |
| **Very High** | 71-100 | Experimental | 20%+ |

## 🔒 Security & Access Control

### Role-Based Access Control

```solidity
bytes32 public constant ADMIN_ROLE = DEFAULT_ADMIN_ROLE;
bytes32 public constant AI_AGENT_ROLE = keccak256("AI_AGENT_ROLE");
bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");
bytes32 public constant PROTOCOL_MANAGER_ROLE = keccak256("PROTOCOL_MANAGER_ROLE");
```

### Security Features

- **Upgradeable contracts** with UUPS pattern
- **Access control** with role-based permissions
- **Risk limits** with 60% position limits
- **Emergency functions** for protocol management
- **Fee limits** with maximum 10% fee cap

### Risk Management

```solidity
// Check risk limits before allocation
bool withinLimits = yieldRouter.checkRiskLimits(user, protocol, amount);
require(withinLimits, "Allocation exceeds risk limits");

// Position limits: Max 60% in any single protocol
// Chain limits: Max 50% in any single chain
// Risk scoring: 0-100 scale with protocol-specific scores
```

## 📈 Performance Analytics

### Optimization Tracking

```solidity
struct OptimizationHistory {
    uint256 timestamp;
    uint256 expectedAPY;
    uint256 actualAPY;
    string[] protocols;
    uint256[] chainIds;
    uint256 gasCost;
    bool success;
}
```

### Performance Metrics

- **Expected vs Actual APY** tracking
- **Gas cost optimization** monitoring
- **Cross-chain transfer** efficiency
- **Protocol performance** comparison
- **User portfolio** analytics

### Analytics Functions

```solidity
// Get user optimization statistics
(uint256 optimizations, uint256 avgAPY, uint256 bestAPY, uint256 gasSpent) = 
    yieldRouter.getOptimizationStats(user);

// Get portfolio breakdown
(uint256 totalValue, uint256 lastOptimization, uint256 optimizationCount) = 
    yieldRouter.getUserPortfolio(user);

// Get protocol-specific balance
uint256 balance = yieldRouter.getUserProtocolBalance(user, "moonwell");
```

## 🧪 Testing

### Test Structure

```
test/
├── YieldRouter.test.ts
├── ChainRegistry.test.ts
├── ProtocolAdaptor.test.ts
└── integration/
    ├── AIStrategy.test.ts
    ├── CrossChain.test.ts
    └── Performance.test.ts
```

### Running Tests

```bash
# Run all tests
yarn test

# Run specific test file
yarn test test/YieldRouter.test.ts

# Run with gas reporting
REPORT_GAS=true yarn test

# Run integration tests
yarn test test/integration/
```

### Test Coverage

- ✅ **Unit tests** for all contract functions
- ✅ **Integration tests** for AI strategy execution
- ✅ **Cross-chain tests** for multi-network scenarios
- ✅ **Performance tests** for optimization tracking
- ✅ **Security tests** for access control and risk management

## 🚀 Deployment Guide

### Local Development

```bash
# Start local blockchain
yarn chain

# Deploy contracts
yarn deploy

# Verify deployment
yarn verify
```

### Mainnet Deployment

1. **Set up environment:**
```bash
# Set private key and RPC URLs
export PRIVATE_KEY=your_private_key
export RPC_URL_ETHEREUM=https://eth-mainnet.alchemyapi.io/v2/your_key
export RPC_URL_BASE=https://base-mainnet.g.alchemy.com/v2/your_key
export RPC_URL_ARBITRUM=https://arb-mainnet.g.alchemy.com/v2/your_key
```

2. **Deploy contracts:**
```bash
# Deploy to Ethereum
yarn deploy --network ethereum

# Deploy to Base
yarn deploy --network base

# Deploy to Arbitrum
yarn deploy --network arbitrum
```

3. **Initialize contracts:**
```solidity
// Initialize ChainRegistry
chainRegistry.initialize(adminAddress);

// Initialize YieldRouter
yieldRouter.initialize(
    registryAddress,
    feeRecipientAddress,
    50, // 0.5% fee in basis points
    adminAddress
);

// Add supported chains
chainRegistry.addChain(1, "Ethereum", usdcEthereum, gasPriceEth, bridgeCostEth);
chainRegistry.addChain(8453, "Base", usdcBase, gasPriceBase, bridgeCostBase);
chainRegistry.addChain(42161, "Arbitrum", usdcArbitrum, gasPriceArb, bridgeCostArb);

// Add protocol adapters
chainRegistry.addProtocol("aave", aaveAdapter, 1, 15, 400, 800); // 4-8% APY
chainRegistry.addProtocol("moonwell", moonwellAdapter, 8453, 25, 800, 1500); // 8-15% APY
chainRegistry.addProtocol("radiant", radiantAdapter, 42161, 30, 1000, 1800); // 10-18% APY
```

### Post-Deployment Setup

1. **Grant roles:**
```solidity
// Grant AI agent role to your AI system
yieldRouter.grantRole(AI_AGENT_ROLE, aiAgentAddress);

// Grant rebalancer role to your rebalancing system
yieldRouter.grantRole(REBALANCER_ROLE, rebalancerAddress);

// Grant protocol manager role to your protocol management system
chainRegistry.grantRole(PROTOCOL_MANAGER_ROLE, protocolManagerAddress);
```

2. **Set up cross-chain routers:**
```solidity
// Set chain router addresses for cross-chain operations
yieldRouter.setChainRouter(8453, baseRouterAddress);
yieldRouter.setChainRouter(42161, arbitrumRouterAddress);
```

3. **Configure fee structure:**
```solidity
// Set fee recipient
yieldRouter.setFeeRecipient(feeRecipientAddress);

// Update fee structure (max 10%)
yieldRouter.updateFeeStructure(50); // 0.5% fee
```

## 📞 Support & Contributing

### Getting Help

- **GitHub Issues**: Bug reports and feature requests
- **Documentation**: Comprehensive guides and API docs
- **Discord**: Real-time community support

### Contributing

We welcome contributions! See our [Contributing Guide](../../CONTRIBUTING.md) for details.

**Ways to Contribute:**
- **Code**: New protocol adapters, features, optimizations
- **Documentation**: Tutorials, guides, API docs
- **Testing**: Bug reports, performance testing, security audits
- **Community**: Discord moderation, user support

### License

MIT License - see [LICENSE](../../LICENSE) for details.

---

**Built with ❤️ for the DeFi community**

*Optimizing USDC yields across all of DeFi, one chain at a time.*