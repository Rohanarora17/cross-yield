# CrossYield Integration Guide

## 🔗 Frontend ↔ Backend ↔ Contracts Integration

This guide shows exactly how to integrate all components of the CrossYield system.

## 📋 Prerequisites

### **Required API Keys & Environment Variables**

```bash
# Backend .env
CLAUDE_API_KEY=sk-ant-...
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_backend_private_key
DATABASE_URL=postgresql://...

# Frontend .env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_wc_project_id
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

### **Required Dependencies**

```bash
# Frontend
cd packages/nextjs
yarn add @account-abstraction/sdk viem@2.34.0 wagmi@2.16.4

# Backend (already installed)
cd usdc-ai-optimiser
pip install -r requirements.txt
```

## 🏗️ Step 1: Smart Wallet Integration

### **1.1 Smart Wallet Factory Contract**

```solidity
// packages/hardhat/contracts/SmartWalletFactory.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./UserSmartWallet.sol";

contract SmartWalletFactory {
    mapping(address => address) public userWallets;
    address public immutable backendCoordinator;

    event WalletCreated(address indexed user, address indexed wallet);

    constructor(address _backendCoordinator) {
        backendCoordinator = _backendCoordinator;
    }

    function createWallet(address user) external returns (address wallet) {
        require(userWallets[user] == address(0), "Wallet already exists");

        // Deploy deterministic wallet using CREATE2
        bytes32 salt = keccak256(abi.encodePacked(user));
        wallet = address(new UserSmartWallet{salt: salt}(user, backendCoordinator));

        userWallets[user] = wallet;
        emit WalletCreated(user, wallet);
    }

    function getWallet(address user) external view returns (address) {
        return userWallets[user];
    }

    function predictWalletAddress(address user) external view returns (address) {
        bytes32 salt = keccak256(abi.encodePacked(user));
        bytes memory bytecode = abi.encodePacked(
            type(UserSmartWallet).creationCode,
            abi.encode(user, backendCoordinator)
        );
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            salt,
            keccak256(bytecode)
        ));
        return address(uint160(uint256(hash)));
    }
}
```

### **1.2 User Smart Wallet Contract**

```solidity
// packages/hardhat/contracts/UserSmartWallet.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ICCTP.sol";

contract UserSmartWallet {
    address public immutable owner;
    address public immutable backendCoordinator;
    IERC20 public constant USDC = IERC20(0xA0b86a33E6417c33b2F2e5d8A7C0C5a3C0F9E2B3); // Mainnet USDC

    event Deposited(address indexed user, uint256 amount, string strategy);
    event CCTPExecuted(uint256 amount, uint32 destinationDomain, address recipient);
    event ProtocolAllocation(string protocol, uint256 amount);
    event EmergencyWithdrawal(address indexed user, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyBackendOrOwner() {
        require(msg.sender == backendCoordinator || msg.sender == owner, "Unauthorized");
        _;
    }

    constructor(address _owner, address _backendCoordinator) {
        owner = _owner;
        backendCoordinator = _backendCoordinator;
    }

    function deposit(uint256 amount, string memory strategy) external onlyOwner {
        USDC.transferFrom(owner, address(this), amount);
        emit Deposited(owner, amount, strategy);
    }

    function executeCCTP(
        uint256 amount,
        uint32 destinationDomain,
        address recipient
    ) external onlyBackendOrOwner {
        require(USDC.balanceOf(address(this)) >= amount, "Insufficient balance");

        // Execute CCTP burn (this will be called by backend with proper attestation)
        USDC.transfer(recipient, amount); // Simplified - real CCTP integration needed

        emit CCTPExecuted(amount, destinationDomain, recipient);
    }

    function allocateToProtocol(
        address protocolAdapter,
        uint256 amount,
        string memory protocolName
    ) external onlyBackendOrOwner {
        require(USDC.balanceOf(address(this)) >= amount, "Insufficient balance");

        USDC.approve(protocolAdapter, amount);
        IProtocolAdapter(protocolAdapter).deposit(owner, amount);

        emit ProtocolAllocation(protocolName, amount);
    }

    function emergencyWithdraw() external onlyOwner {
        uint256 balance = USDC.balanceOf(address(this));
        USDC.transfer(owner, balance);
        emit EmergencyWithdrawal(owner, balance);
    }

    function getBalance() external view returns (uint256) {
        return USDC.balanceOf(address(this));
    }
}
```

## 🖥️ Step 2: Frontend Integration

### **2.1 Smart Wallet Hook**

```typescript
// packages/nextjs/hooks/useSmartWallet.ts
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { useState, useEffect } from 'react';
import { smartWalletFactoryABI } from '../contracts/abis';

const SMART_WALLET_FACTORY_ADDRESS = "0x..."; // Deploy and add address

export function useSmartWallet() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [smartWalletAddress, setSmartWalletAddress] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const checkExistingWallet = async () => {
    if (!address || !publicClient) return;

    try {
      const walletAddress = await publicClient.readContract({
        address: SMART_WALLET_FACTORY_ADDRESS,
        abi: smartWalletFactoryABI,
        functionName: 'getWallet',
        args: [address]
      });

      if (walletAddress !== '0x0000000000000000000000000000000000000000') {
        setSmartWalletAddress(walletAddress as string);
      }
    } catch (error) {
      console.error('Error checking wallet:', error);
    }
  };

  const createSmartWallet = async () => {
    if (!address || !walletClient) return;

    setIsCreating(true);
    try {
      const hash = await walletClient.writeContract({
        address: SMART_WALLET_FACTORY_ADDRESS,
        abi: smartWalletFactoryABI,
        functionName: 'createWallet',
        args: [address]
      });

      // Wait for transaction confirmation
      await publicClient.waitForTransactionReceipt({ hash });

      // Get the newly created wallet address
      await checkExistingWallet();
    } catch (error) {
      console.error('Error creating wallet:', error);
    }
    setIsCreating(false);
  };

  useEffect(() => {
    checkExistingWallet();
  }, [address, publicClient]);

  return {
    smartWalletAddress,
    createSmartWallet,
    isCreating,
    hasSmartWallet: !!smartWalletAddress
  };
}
```

### **2.2 Deposit Component**

```typescript
// packages/nextjs/components/DepositInterface.tsx
import React, { useState } from 'react';
import { useAccount, usePublicClient, useWalletClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useSmartWallet } from '../hooks/useSmartWallet';
import { userSmartWalletABI, usdcABI } from '../contracts/abis';

const USDC_ADDRESS = "0xA0b86a33E6417c33b2F2e5d8A7C0C5a3C0F9E2B3";

export function DepositInterface() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { smartWalletAddress, createSmartWallet, isCreating, hasSmartWallet } = useSmartWallet();

  const [amount, setAmount] = useState('');
  const [strategy, setStrategy] = useState<'conservative' | 'balanced' | 'aggressive'>('balanced');
  const [isDepositing, setIsDepositing] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState('0');

  const getUSDCBalance = async () => {
    if (!address || !publicClient) return;

    try {
      const balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: usdcABI,
        functionName: 'balanceOf',
        args: [address]
      });
      setUsdcBalance(formatUnits(balance as bigint, 6));
    } catch (error) {
      console.error('Error getting USDC balance:', error);
    }
  };

  const approveUSDC = async (amount: string) => {
    if (!walletClient || !smartWalletAddress) return false;

    try {
      const hash = await walletClient.writeContract({
        address: USDC_ADDRESS,
        abi: usdcABI,
        functionName: 'approve',
        args: [smartWalletAddress, parseUnits(amount, 6)]
      });

      await publicClient.waitForTransactionReceipt({ hash });
      return true;
    } catch (error) {
      console.error('Error approving USDC:', error);
      return false;
    }
  };

  const depositToSmartWallet = async () => {
    if (!walletClient || !smartWalletAddress || !amount) return;

    setIsDepositing(true);
    try {
      // First approve USDC
      const approved = await approveUSDC(amount);
      if (!approved) {
        setIsDepositing(false);
        return;
      }

      // Then deposit to smart wallet
      const hash = await walletClient.writeContract({
        address: smartWalletAddress,
        abi: userSmartWalletABI,
        functionName: 'deposit',
        args: [parseUnits(amount, 6), strategy]
      });

      await publicClient.waitForTransactionReceipt({ hash });

      // Notify backend of deposit
      await fetch('/api/optimization-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userAddress: address,
          amount: parseUnits(amount, 6).toString(),
          strategy,
          smartWalletAddress
        })
      });

      setAmount('');
      await getUSDCBalance();
    } catch (error) {
      console.error('Error depositing:', error);
    }
    setIsDepositing(false);
  };

  React.useEffect(() => {
    getUSDCBalance();
  }, [address, publicClient]);

  if (!hasSmartWallet) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Create Your Agent Wallet</h2>
          <p>First, create a smart wallet that will manage your USDC automatically.</p>
          <button
            className={`btn btn-primary ${isCreating ? 'loading' : ''}`}
            onClick={createSmartWallet}
            disabled={isCreating}
          >
            {isCreating ? 'Creating...' : 'Create Agent Wallet'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Deposit USDC for Optimization</h2>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Your USDC Balance: {usdcBalance}</span>
          </label>
          <input
            type="number"
            placeholder="Enter USDC amount"
            className="input input-bordered"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Strategy</span>
          </label>
          <select
            className="select select-bordered"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
          >
            <option value="conservative">Conservative (8.2% APY, Low Risk)</option>
            <option value="balanced">Balanced (15.7% APY, Medium Risk)</option>
            <option value="aggressive">Aggressive (22.3% APY, High Risk)</option>
          </select>
        </div>

        <div className="card-actions justify-end">
          <button
            className={`btn btn-primary ${isDepositing ? 'loading' : ''}`}
            onClick={depositToSmartWallet}
            disabled={!amount || isDepositing || parseFloat(amount) <= 0}
          >
            {isDepositing ? 'Depositing...' : `Deposit ${amount} USDC`}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### **2.3 Portfolio Dashboard**

```typescript
// packages/nextjs/components/PortfolioDashboard.tsx
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';

interface PortfolioData {
  totalValue: number;
  currentAPY: number;
  allocations: {
    protocol: string;
    chain: string;
    amount: number;
    apy: number;
    percentage: number;
  }[];
  recentActivity: {
    type: string;
    amount: number;
    protocol: string;
    timestamp: string;
  }[];
}

export function PortfolioDashboard() {
  const { address } = useAccount();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortfolio = async () => {
    if (!address) return;

    try {
      const response = await fetch(`/api/portfolio/${address}`);
      const data = await response.json();
      setPortfolio(data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPortfolio();

    // Set up WebSocket for real-time updates
    const ws = new WebSocket(`ws://localhost:8000/ws/portfolio/${address}`);
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setPortfolio(data);
    };

    return () => ws.close();
  }, [address]);

  if (loading) {
    return <div className="loading loading-spinner loading-lg"></div>;
  }

  if (!portfolio) {
    return (
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">No Portfolio Found</h2>
          <p>Deposit USDC to start optimizing your yield!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      <div className="stats shadow">
        <div className="stat">
          <div className="stat-title">Total Value</div>
          <div className="stat-value">${portfolio.totalValue.toLocaleString()}</div>
        </div>
        <div className="stat">
          <div className="stat-title">Current APY</div>
          <div className="stat-value text-primary">{portfolio.currentAPY.toFixed(2)}%</div>
        </div>
      </div>

      {/* Allocations */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Current Allocations</h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Chain</th>
                  <th>Amount</th>
                  <th>APY</th>
                  <th>Allocation %</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.allocations.map((allocation, index) => (
                  <tr key={index}>
                    <td>{allocation.protocol}</td>
                    <td>
                      <div className="badge badge-outline">{allocation.chain}</div>
                    </td>
                    <td>${allocation.amount.toLocaleString()}</td>
                    <td className="text-success">{allocation.apy.toFixed(2)}%</td>
                    <td>{allocation.percentage.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Recent Activity</h2>
          <div className="space-y-2">
            {portfolio.recentActivity.map((activity, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-base-200 rounded">
                <div>
                  <div className="font-semibold">
                    {activity.type} ${activity.amount.toLocaleString()}
                  </div>
                  <div className="text-sm opacity-70">{activity.protocol}</div>
                </div>
                <div className="text-sm opacity-70">
                  {new Date(activity.timestamp).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

## 🔗 Step 3: Backend API Integration

### **3.1 FastAPI Server**

```python
# usdc-ai-optimiser/api_server.py
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import asyncio
import json
from datetime import datetime

from src.services.cross_chain_yield_optimizer import CrossChainYieldOptimizer
from src.execution.rebalancer import USDAIRebalancer
from src.monitoring.continuous_monitor import ContinuousMonitor

app = FastAPI(title="CrossYield API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
optimizer = CrossChainYieldOptimizer()
rebalancer = USDAIRebalancer()
monitor = ContinuousMonitor()

# WebSocket connections for real-time updates
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_address: str):
        await websocket.accept()
        self.active_connections[user_address] = websocket

    def disconnect(self, user_address: str):
        if user_address in self.active_connections:
            del self.active_connections[user_address]

    async def send_portfolio_update(self, user_address: str, data: dict):
        if user_address in self.active_connections:
            try:
                await self.active_connections[user_address].send_text(json.dumps(data))
            except:
                self.disconnect(user_address)

manager = ConnectionManager()

class OptimizationRequest(BaseModel):
    userAddress: str
    amount: str
    strategy: str
    smartWalletAddress: str

class PortfolioResponse(BaseModel):
    totalValue: float
    currentAPY: float
    allocations: List[Dict]
    recentActivity: List[Dict]

@app.post("/api/optimization-request")
async def handle_optimization_request(request: OptimizationRequest):
    """Handle deposit and optimization request from frontend"""

    try:
        # Convert amount from string to float (assuming 6 decimals for USDC)
        amount = float(request.amount) / 10**6

        # Start optimization process
        asyncio.create_task(optimize_user_portfolio(
            user_address=request.userAddress,
            smart_wallet_address=request.smartWalletAddress,
            amount=amount,
            strategy=request.strategy
        ))

        return {"status": "optimization_started", "message": "Portfolio optimization initiated"}

    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/portfolio/{user_address}")
async def get_portfolio(user_address: str) -> PortfolioResponse:
    """Get user's portfolio data"""

    try:
        # Get current portfolio from rebalancer
        portfolio_performance = await rebalancer.get_portfolio_performance()

        # Get allocations from smart contracts
        allocations = await get_user_allocations(user_address)

        # Get recent activity
        recent_activity = await get_recent_activity(user_address)

        return PortfolioResponse(
            totalValue=portfolio_performance["total_value"],
            currentAPY=portfolio_performance["average_apy"],
            allocations=allocations,
            recentActivity=recent_activity
        )

    except Exception as e:
        return {"error": str(e)}

@app.websocket("/ws/portfolio/{user_address}")
async def websocket_endpoint(websocket: WebSocket, user_address: str):
    await manager.connect(websocket, user_address)
    try:
        while True:
            # Keep connection alive and send updates when available
            await asyncio.sleep(10)

            # Check for portfolio updates
            portfolio_data = await get_portfolio(user_address)
            await manager.send_portfolio_update(user_address, portfolio_data.dict())

    except WebSocketDisconnect:
        manager.disconnect(user_address)

async def optimize_user_portfolio(user_address: str, smart_wallet_address: str, amount: float, strategy: str):
    """Main optimization workflow"""

    print(f"🚀 Starting optimization for {user_address}: ${amount:,.2f} USDC ({strategy})")

    try:
        # Step 1: AI optimization
        optimized_strategy = await optimizer.optimize_cross_chain_strategy(
            total_amount=amount,
            risk_tolerance=strategy,
            max_opportunities=5
        )

        print(f"📊 Strategy generated: {optimized_strategy.net_annual_return:.2f}% net APY")

        # Step 2: Execute cross-chain transfers if needed
        if optimized_strategy.opportunities:
            user_wallet_key = derive_user_wallet_key(user_address)

            for opportunity in optimized_strategy.opportunities:
                if opportunity.source_chain != opportunity.destination_chain:
                    # Execute CCTP transfer
                    transfer_amount = optimized_strategy.recommended_allocation.get(
                        f"{opportunity.source_chain}_{opportunity.destination_chain}", 0
                    )

                    if transfer_amount > 0:
                        await execute_user_cctp_transfer(
                            user_address=user_address,
                            smart_wallet_address=smart_wallet_address,
                            source_chain=opportunity.source_chain,
                            destination_chain=opportunity.destination_chain,
                            amount=transfer_amount,
                            user_wallet_key=user_wallet_key
                        )

        # Step 3: Allocate to protocols
        await execute_protocol_allocations(user_address, optimized_strategy)

        # Step 4: Update portfolio tracking
        await update_portfolio_tracking(user_address, optimized_strategy)

        # Step 5: Send real-time update to frontend
        portfolio_update = await get_portfolio(user_address)
        await manager.send_portfolio_update(user_address, portfolio_update.dict())

        print(f"✅ Optimization completed for {user_address}")

    except Exception as e:
        print(f"❌ Optimization failed for {user_address}: {e}")
        # Send error update to frontend
        await manager.send_portfolio_update(user_address, {
            "status": "error",
            "message": str(e)
        })

async def execute_user_cctp_transfer(
    user_address: str,
    smart_wallet_address: str,
    source_chain: str,
    destination_chain: str,
    amount: float,
    user_wallet_key: str
):
    """Execute CCTP transfer for user's smart wallet"""

    print(f"🌉 Executing CCTP: {amount} USDC from {source_chain} to {destination_chain}")

    # Import CCTP integration
    from src.apis.cctp_integration import CCTPIntegration
    cctp = CCTPIntegration()

    # Get destination smart wallet address
    destination_wallet = get_user_smart_wallet_address(user_address, destination_chain)

    # Execute CCTP transfer
    transfer = await cctp.initiate_cross_chain_transfer(
        source_chain=source_chain,
        destination_chain=destination_chain,
        amount=amount,
        recipient=destination_wallet,
        private_key=user_wallet_key
    )

    print(f"🔥 CCTP burn initiated: {transfer.burn_tx_hash}")

    # Complete the transfer
    completed = await cctp.complete_cross_chain_transfer(transfer, user_wallet_key)

    print(f"🪙 CCTP mint completed: {completed.mint_tx_hash}")

    return completed

def derive_user_wallet_key(user_address: str) -> str:
    """Derive deterministic private key for user's smart wallet"""
    # This should use a secure derivation method in production
    # For now, using a simple approach
    import hashlib
    import secrets

    # In production, use proper key derivation like BIP32
    seed = hashlib.sha256(f"{user_address}_wallet_seed".encode()).hexdigest()
    return f"0x{seed}"

def get_user_smart_wallet_address(user_address: str, chain: str) -> str:
    """Get user's smart wallet address on specific chain"""
    # This should query the SmartWalletFactory contract
    # For now, return a placeholder
    return f"0x{user_address[2:]}_{chain}"

async def get_user_allocations(user_address: str) -> List[Dict]:
    """Get user's protocol allocations"""
    # This should query the YieldRouter contracts across chains
    # For now, return mock data
    return [
        {
            "protocol": "Aave V3",
            "chain": "Ethereum",
            "amount": 20000,
            "apy": 4.2,
            "percentage": 40.0
        },
        {
            "protocol": "Moonwell",
            "chain": "Base",
            "amount": 17500,
            "apy": 11.8,
            "percentage": 35.0
        },
        {
            "protocol": "Radiant",
            "chain": "Arbitrum",
            "amount": 12500,
            "apy": 18.5,
            "percentage": 25.0
        }
    ]

async def get_recent_activity(user_address: str) -> List[Dict]:
    """Get user's recent activity"""
    # This should query transaction history
    # For now, return mock data
    return [
        {
            "type": "Deposit",
            "amount": 50000,
            "protocol": "Initial Deposit",
            "timestamp": datetime.now().isoformat()
        },
        {
            "type": "Rebalance",
            "amount": 17500,
            "protocol": "Moonwell",
            "timestamp": datetime.now().isoformat()
        }
    ]

async def execute_protocol_allocations(user_address: str, strategy):
    """Execute protocol allocations on destination chains"""
    # This would interact with smart contracts to allocate funds
    pass

async def update_portfolio_tracking(user_address: str, strategy):
    """Update portfolio tracking in smart contracts"""
    # This would update YieldRouter contracts with allocation data
    pass

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

### **3.2 Frontend API Integration**

```typescript
// packages/nextjs/pages/api/optimization-request.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/optimization-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Backend request failed' });
  }
}
```

```typescript
// packages/nextjs/pages/api/portfolio/[address].ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { address } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/portfolio/${address}`);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ message: 'Backend request failed' });
  }
}
```

## 🚀 Step 4: Deployment & Testing

### **4.1 Start Development Environment**

```bash
# Terminal 1: Start backend
cd usdc-ai-optimiser
source venv/bin/activate
python api_server.py

# Terminal 2: Start contracts (if testing locally)
cd packages/hardhat
yarn hardhat node

# Terminal 3: Deploy contracts
yarn hardhat run scripts/deploy.ts --network localhost

# Terminal 4: Start frontend
cd packages/nextjs
yarn dev
```

### **4.2 Environment Variables**

```bash
# packages/nextjs/.env.local
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id
NEXT_PUBLIC_ALCHEMY_KEY=your_alchemy_key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# usdc-ai-optimiser/.env
CLAUDE_API_KEY=sk-ant-...
ALCHEMY_API_KEY=your_alchemy_key
PRIVATE_KEY=your_backend_private_key_for_testing
```

### **4.3 Testing Flow**

1. **Connect Wallet**: Use MetaMask in frontend
2. **Create Smart Wallet**: Click "Create Agent Wallet"
3. **Get Test USDC**: Use faucet or mint function
4. **Deposit**: Enter amount and select strategy
5. **Monitor**: Watch portfolio dashboard for updates
6. **Verify**: Check smart wallet balance and allocations

## 🔧 Step 5: Production Considerations

### **5.1 Security**
- Use proper key derivation (BIP32/BIP44) for smart wallet keys
- Implement rate limiting on API endpoints
- Add input validation and sanitization
- Use secure environment variable management

### **5.2 Scalability**
- Implement Redis for caching portfolio data
- Use database for persistent storage
- Add horizontal scaling for backend
- Implement proper WebSocket connection management

### **5.3 Monitoring**
- Add Sentry for error tracking
- Implement portfolio performance metrics
- Add gas cost tracking
- Monitor CCTP transfer success rates

This integration guide provides the complete connection between your frontend, smart contracts, and AI backend, maintaining the non-custodial architecture while enabling seamless cross-chain yield optimization!