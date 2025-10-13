# CrossYield - AI-Powered Cross-Chain Yield Optimizer

**First AI-driven cross-chain yield optimizer integrating EVM and Aptos ecosystems with real protocol integrations.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 20+](https://img.shields.io/badge/node.js-20+-green.svg)](https://nodejs.org/)

---

## 🎯 Overview

CrossYield is an AI-powered cross-chain yield optimizer that bridges USDC between EVM chains and Aptos, deploying funds across multiple DeFi protocols for maximum yield generation. Built for the Aptos Hackathon with real protocol integrations.

### Key Features

🌉 **Cross-Chain Bridge**
- Circle CCTP v1 for native USDC bridging
- Base Sepolia → Aptos Testnet transfers
- Real-time transaction tracking

🏦 **Aptos Protocol Integration**
- **Thala Finance** - Lending with real APY data
- **Aave V3** - Live yield generation
- **Move Vault Contract** - Position tracking

🤖 **AI Strategy Optimization**
- Multi-agent system for yield analysis
- Real-time APY and risk assessment
- Automated portfolio rebalancing

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│              CROSSYIELD ARCHITECTURE                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (Next.js)                                      │
│  ├─ Multi-chain wallet support                          │
│  ├─ Strategy visualization                              │
│  └─ Real-time portfolio tracking                        │
│                                                          │
│  Cross-Chain Bridge (CCTP)                              │
│  ├─ Base → Aptos USDC transfers                         │
│  ├─ 6-step bridge flow                                  │
│  └─ Attestation monitoring                              │
│                                                          │
│  Aptos Integration                                       │
│  ├─ Thala Finance (Lending)                             │
│  ├─ Aave V3 (Yield Generation)                          │
│  └─ Move Vault Contract                                 │
│                                                          │
│  AI Backend                                              │
│  ├─ Multi-agent optimization                            │
│  ├─ Real-time APY analysis                              │
│  └─ Risk assessment                                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 20.18.3+
- Python 3.8+
- Yarn 3.2.3+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/cross-yield.git
   cd cross-yield
   ```

2. **Install dependencies**
   ```bash
   yarn install
   cd packages/nextjs
   yarn install
   ```

3. **Configure environment**
   ```bash
   cp packages/nextjs/.env.example packages/nextjs/.env.local
   ```

4. **Start development**
   ```bash
   # Frontend
   cd packages/nextjs
   yarn dev

   # Backend
   cd usdc-ai-optimiser
   python src/main.py
   ```

5. **Access application**
   - Open http://localhost:3000
   - Connect wallets (EVM + Aptos)
   - Start optimizing yields!

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - App router & TypeScript
- **Wagmi** - EVM interactions
- **Aptos Wallet Adapter** - Aptos integration
- **Tailwind CSS** - Styling

### Cross-Chain
- **Circle CCTP v1** - USDC bridging
- **Base Sepolia** ↔ **Aptos Testnet**

### Aptos Integration
- **Move Contracts** - Vault management
- **Aptos SDK** - Blockchain interactions
- **Aave V3 SDK** - Protocol integration
- **Thala Finance** - Lending integration

### AI Backend
- **Python FastAPI** - Backend API
- **Multi-agent System** - Yield optimization
- **Claude AI** - Strategic reasoning

### Infrastructure
- **Nodit** - Aptos RPC & indexer
- **Hyperion** - Capital efficiency
- **Circle CCTP** - Cross-chain transfers

---

## 🏆 Aptos Hackathon Features

### Live Integrations
✅ **CCTP Bridge** - Production-ready Base → Aptos transfers
✅ **Thala Finance** - Real APY data & lending integration
✅ **Aave V3** - Live yield generation
✅ **Move Vault** - On-chain position tracking
✅ **AI Optimization** - Multi-agent strategy selection

### Key Technologies
- **Hyperion** - Capital efficiency optimization
- **Nodit** - Aptos RPC and indexer services
- **Circle CCTP** - Cross-chain bridge protocol
- **Aptos SDK** - Blockchain interaction

---

## ⚙️ Configuration

### Environment Variables

Create `.env.local` in `packages/nextjs/`:

```bash
# Aptos Configuration
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_APTOS_VAULT_ADDRESS=0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b
NEXT_PUBLIC_NODIT_APTOS_INDEXER=https://api.testnet.aptoslabs.com/v1/graphql

# CCTP Configuration
NEXT_PUBLIC_CCTP_IRIS_API=https://iris-api-sandbox.circle.com

# Optional
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 🤖 AI Multi-Agent System

### Agent Architecture

**YieldMaximizerAgent** - Finds highest yield opportunities
**RiskAssessmentAgent** - Evaluates protocol safety
**LLMCoordinatorAgent** - Strategic coordination with Claude AI

### Workflow

1. **Parallel Analysis** - Agents analyze opportunities simultaneously
2. **Coordination** - Debate and consensus building
3. **Execution** - Optimal strategy deployment

---

## 🌐 Supported Chains

| Chain | USDC Address | CCTP Domain | Protocols |
|-------|--------------|-------------|-----------|
| Base Sepolia | 0x036CbD53842c5426634e7929541eC2318f3dCF7e | 6 | Moonwell, Aerodrome |
| Ethereum Sepolia | 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 | 0 | Aave V3, Compound V3 |
| Aptos Testnet | Native USDC | - | Thala, Aave V3 |

---

## 🧪 Testing

```bash
# Smart contracts
yarn hardhat:test

# Backend
cd usdc-ai-optimiser
python -m pytest tests/

# Frontend
cd packages/nextjs
yarn test
```

---

## 📚 API Documentation

### REST Endpoints

**Optimize Strategy**
```http
POST /api/optimize
{
  "user_address": "0x...",
  "amount": 50000,
  "risk_profile": "balanced"
}
```

**Get Opportunities**
```http
GET /api/opportunities
```

**Portfolio Data**
```http
GET /api/portfolio/{user_address}
```

---

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Circle** - CCTP cross-chain infrastructure
- **Aptos** - Move blockchain platform
- **Thala Finance** - Lending protocol integration
- **Anthropic** - Claude AI capabilities
- **Nodit** - Aptos RPC services
- **Hyperion** - Capital efficiency

---

**Built with ❤️ for the DeFi community**
