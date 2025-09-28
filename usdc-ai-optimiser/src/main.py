"""
CrossYield AI Optimizer - Main Backend Service
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
import asyncio

# Local imports
from src.contract_integration import contract_manager
from src.execution.cctp_engine import cctp_engine
from src.data.aggregator import YieldDataAggregator

# Initialize FastAPI app
app = FastAPI(
    title="CrossYield AI Optimizer",
    description="AI-powered cross-chain USDC yield optimization",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
yield_aggregator = YieldDataAggregator()

# Request models
class OptimizationRequest(BaseModel):
    userAddress: str
    amount: int
    strategy: str
    smartWalletAddress: str

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "running",
        "service": "CrossYield AI Optimizer",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    chain_status = {}
    for chain in ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]:
        try:
            w3 = contract_manager.web3_clients.get(chain)
            chain_status[chain] = "connected" if w3 and w3.is_connected() else "disconnected"
        except:
            chain_status[chain] = "error"

    return {
        "status": "healthy",
        "chains": chain_status,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/optimization-request")
async def request_optimization(request: OptimizationRequest):
    """Handle optimization request from frontend"""
    try:
        if request.amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        return {
            "status": "optimization_started",
            "message": f"Optimization started for {request.amount} USDC",
            "estimatedAPY": 12.5
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/portfolio/{address}")
async def get_portfolio(address: str):
    """Get user portfolio information"""
    try:
        portfolio_data = {
            "totalValue": 0,
            "currentAPY": 0,
            "allocations": [],
            "recentActivity": []
        }

        total_value = 0

        # Check each chain for user's smart wallets
        for chain in ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]:
            try:
                factory = contract_manager.get_contract(chain, "smartWalletFactory")
                has_wallet = factory.functions.hasWallet(address).call()

                if has_wallet:
                    wallet_summary = contract_manager.get_wallet_summary(address, chain)
                    if wallet_summary:
                        total_value += wallet_summary.usdcBalance + wallet_summary.totalAllocated
            except Exception as e:
                continue

        portfolio_data["totalValue"] = total_value
        return portfolio_data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/strategies")
async def get_strategies():
    """Get available strategies with expected returns"""
    try:
        strategies = []

        # Get opportunities for each strategy
        for strategy_name in ["conservative", "balanced", "aggressive"]:
            opportunities = await yield_aggregator.get_yield_opportunities(strategy_name)

            # Calculate expected APY for $10k example
            if opportunities:
                if strategy_name == "conservative":
                    expected_apy = opportunities[0].apy
                    protocols = [opportunities[0].protocol]
                    chains = [opportunities[0].chain]
                elif strategy_name == "balanced" and len(opportunities) >= 2:
                    expected_apy = (opportunities[0].apy * 0.6) + (opportunities[1].apy * 0.4)
                    protocols = [opportunities[0].protocol, opportunities[1].protocol]
                    chains = list(set([opportunities[0].chain, opportunities[1].chain]))
                elif strategy_name == "aggressive":
                    # 50/30/20 split across top 3
                    percentages = [0.5, 0.3, 0.2]
                    expected_apy = sum(
                        opp.apy * percentages[i]
                        for i, opp in enumerate(opportunities[:3])
                    )
                    protocols = [opp.protocol for opp in opportunities[:3]]
                    chains = list(set([opp.chain for opp in opportunities[:3]]))
                else:
                    expected_apy = opportunities[0].apy
                    protocols = [opportunities[0].protocol]
                    chains = [opportunities[0].chain]
            else:
                expected_apy = 0
                protocols = []
                chains = []

            # Calculate yields for $10k example
            daily_yield = (10000 * expected_apy / 100) / 365
            monthly_yield = daily_yield * 30

            strategies.append({
                "name": strategy_name,
                "title": strategy_name.title(),
                "expectedAPY": round(expected_apy, 2),
                "dailyYield": round(daily_yield, 2),
                "monthlyYield": round(monthly_yield, 0),
                "protocols": protocols,
                "chains": chains,
                "riskLevel": {
                    "conservative": "Low",
                    "balanced": "Medium",
                    "aggressive": "High"
                }[strategy_name],
                "description": {
                    "conservative": "Lowest risk, stable returns in proven protocols",
                    "balanced": "Moderate risk with optimized cross-chain allocation",
                    "aggressive": "Higher risk for maximum yield across all chains"
                }[strategy_name]
            })

        return {
            "strategies": strategies,
            "exampleAmount": 10000,
            "lastUpdated": datetime.now().isoformat()
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/strategy-preview")
async def preview_strategy(request: dict):
    """Preview strategy allocation for specific amount"""
    try:
        amount = request.get("amount", 10000)
        strategy = request.get("strategy", "balanced")

        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be positive")

        opportunities = await yield_aggregator.get_yield_opportunities(strategy)

        if not opportunities:
            raise HTTPException(status_code=404, detail="No opportunities found")

        # Generate allocation plan
        allocations = []
        amount_wei = int(amount * 1_000_000)  # Convert to USDC wei

        if strategy == "conservative":
            allocations.append({
                "protocol": opportunities[0].protocol,
                "chain": opportunities[0].chain,
                "amount": amount,
                "percentage": 100,
                "apy": opportunities[0].apy,
                "riskScore": opportunities[0].riskScore
            })
        elif strategy == "balanced" and len(opportunities) >= 2:
            allocations.extend([
                {
                    "protocol": opportunities[0].protocol,
                    "chain": opportunities[0].chain,
                    "amount": amount * 0.6,
                    "percentage": 60,
                    "apy": opportunities[0].apy,
                    "riskScore": opportunities[0].riskScore
                },
                {
                    "protocol": opportunities[1].protocol,
                    "chain": opportunities[1].chain,
                    "amount": amount * 0.4,
                    "percentage": 40,
                    "apy": opportunities[1].apy,
                    "riskScore": opportunities[1].riskScore
                }
            ])
        elif strategy == "aggressive":
            percentages = [50, 30, 20]
            for i, opp in enumerate(opportunities[:3]):
                pct = percentages[i]
                allocations.append({
                    "protocol": opp.protocol,
                    "chain": opp.chain,
                    "amount": amount * pct / 100,
                    "percentage": pct,
                    "apy": opp.apy,
                    "riskScore": opp.riskScore
                })
        else:
            allocations.append({
                "protocol": opportunities[0].protocol,
                "chain": opportunities[0].chain,
                "amount": amount,
                "percentage": 100,
                "apy": opportunities[0].apy,
                "riskScore": opportunities[0].riskScore
            })

        # Calculate combined metrics
        combined_apy = sum(alloc["apy"] * alloc["percentage"] / 100 for alloc in allocations)
        daily_yield = (amount * combined_apy / 100) / 365
        monthly_yield = daily_yield * 30

        return {
            "strategy": strategy,
            "amount": amount,
            "expectedAPY": round(combined_apy, 2),
            "dailyYield": round(daily_yield, 2),
            "monthlyYield": round(monthly_yield, 0),
            "allocations": allocations,
            "protocolCount": len(allocations),
            "chainCount": len(set(alloc["chain"] for alloc in allocations))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)