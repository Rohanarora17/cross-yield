# src/data/models.py (UPDATED)
"""Data models for USDC opportunities"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List
from datetime import datetime

class USDCOpportunity(BaseModel):
    """USDC yield opportunity data model"""
    
    protocol: str
    chain: str
    pool_id: str
    pool_name: str
    apy: float
    apy_base: Optional[float] = 0.0  # ← Allow None, default to 0.0
    apy_reward: Optional[float] = 0.0  # ← Allow None, default to 0.0
    tvl_usd: float
    usdc_liquidity: float
    risk_score: float
    category: str  # lending, lp, yield_farm
    min_deposit: float = 1.0
    oracle_confidence: float = 0.9
    last_updated: datetime
    
    # Enhanced fields
    oneinch_executable: bool = True
    cctp_accessible: bool = True
    adjusted_apy: Optional[float] = None

class UserProfile(BaseModel):
    """User investment profile"""
    
    amount: float
    risk_tolerance: str  # conservative, moderate, aggressive
    time_horizon: str = "6_months"
    preferred_chains: List[str] = ["ethereum", "base", "arbitrum"]
    min_apy: float = 2.0

class AgentRecommendation(BaseModel):
    """Agent recommendation structure"""
    
    agent_name: str
    strategy_type: str
    allocation: Dict[str, float]
    expected_apy: float
    confidence: float
    reasoning: str

class ExecutionPlan(BaseModel):
    """Execution plan for strategy"""
    
    total_amount: float
    cross_chain_transfers: List[Dict]
    protocol_deposits: List[Dict]
    estimated_gas_cost: float
    estimated_execution_time: str
    cctp_transfers: List[Dict]
    oneinch_swaps: List[Dict]

class ProtocolInfo(BaseModel):
    """Protocol information model"""
    name: str
    chain: str
    category: str  # "lending", "liquidity", "yield_farm"
    risk_level: str  # "low", "medium", "high"
    current_apy: float
    tvl: float
    adapter_address: Optional[str] = None
    is_active: bool = True

class YieldOpportunity(BaseModel):
    """Yield opportunity model"""
    protocol: str
    chain: str
    apy: float
    tvl: float
    riskScore: int  # 0-100
    category: str
    minDeposit: Optional[int] = None

class SmartWalletPortfolio(BaseModel):
    """Smart wallet portfolio model"""
    address: str
    owner: str
    chain: str
    total_value: int
    usdc_balance: int
    total_allocated: int
    active_protocols: List[str]
    protocol_balances: Dict[str, int]
    is_active: bool

class CrossChainAllocation(BaseModel):
    """Cross-chain allocation model"""
    user_address: str
    source_chain: str
    destination_chain: str
    amount: int
    protocol_name: str
    expected_apy: float
    status: str  # "pending", "bridging", "allocated", "completed", "failed"
    created_at: datetime
    updated_at: datetime

