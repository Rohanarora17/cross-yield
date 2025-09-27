# src/data/comprehensive_protocols.py
"""Comprehensive DeFi Protocol Database Across All Chains"""

from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

@dataclass
class ProtocolInfo:
    """Protocol information structure"""
    name: str
    category: str  # lending, dex, yield_farm, stablecoin, derivatives
    chain: str
    contract_address: str
    tvl_usd: float
    apy_range: tuple  # (min_apy, max_apy)
    risk_score: float  # 0-1, lower is safer
    liquidity_score: float  # 0-1, higher is more liquid
    security_score: float  # 0-1, higher is more secure
    supported_tokens: List[str]
    features: List[str]
    last_audit: str
    description: str

class ComprehensiveProtocolDatabase:
    """Comprehensive database of DeFi protocols across all chains"""
    
    def __init__(self):
        self.protocols = self._initialize_protocols()
    
    def _initialize_protocols(self) -> Dict[str, List[ProtocolInfo]]:
        """Initialize comprehensive protocol database"""
        
        protocols = {
            "ethereum": [
                # DEX Protocols
                ProtocolInfo(
                    name="Uniswap V3",
                    category="dex",
                    chain="ethereum",
                    contract_address="0x1F98431c8aD98523631AE4a59f267346ea31F984",
                    tvl_usd=4_200_000_000,
                    apy_range=(5.0, 25.0),
                    risk_score=0.2,
                    liquidity_score=0.95,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "USDT", "DAI", "WBTC"],
                    features=["concentrated_liquidity", "multiple_fee_tiers", "flash_swaps"],
                    last_audit="2023-08-15",
                    description="Leading DEX with concentrated liquidity and multiple fee tiers"
                ),
                ProtocolInfo(
                    name="Uniswap V2",
                    category="dex",
                    chain="ethereum",
                    contract_address="0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f",
                    tvl_usd=1_800_000_000,
                    apy_range=(3.0, 15.0),
                    risk_score=0.15,
                    liquidity_score=0.9,
                    security_score=0.95,
                    supported_tokens=["USDC", "WETH", "USDT", "DAI", "WBTC"],
                    features=["constant_product_amm", "simple_interface"],
                    last_audit="2020-05-01",
                    description="Battle-tested DEX with constant product AMM"
                ),
                ProtocolInfo(
                    name="SushiSwap",
                    category="dex",
                    chain="ethereum",
                    contract_address="0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac",
                    tvl_usd=800_000_000,
                    apy_range=(4.0, 18.0),
                    risk_score=0.25,
                    liquidity_score=0.8,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "USDT", "DAI", "SUSHI"],
                    features=["yield_farming", "governance_token", "bento_box"],
                    last_audit="2021-03-15",
                    description="Community-driven DEX with yield farming and governance"
                ),
                ProtocolInfo(
                    name="Curve Finance",
                    category="dex",
                    chain="ethereum",
                    contract_address="0xD533a949740bb3306d119CC777fa900bA034cd52",
                    tvl_usd=2_500_000_000,
                    apy_range=(2.0, 12.0),
                    risk_score=0.1,
                    liquidity_score=0.9,
                    security_score=0.95,
                    supported_tokens=["USDC", "USDT", "DAI", "FRAX", "LUSD"],
                    features=["stablecoin_optimized", "low_slippage", "gauge_system"],
                    last_audit="2023-06-20",
                    description="Optimized for stablecoin swaps with minimal slippage"
                ),
                ProtocolInfo(
                    name="Balancer V2",
                    category="dex",
                    chain="ethereum",
                    contract_address="0xBA12222222228d8Ba445958a75a0704d566BF2C8",
                    tvl_usd=600_000_000,
                    apy_range=(3.0, 20.0),
                    risk_score=0.2,
                    liquidity_score=0.75,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "BAL", "WBTC"],
                    features=["weighted_pools", "stable_pools", "liquidity_bootstrapping"],
                    last_audit="2021-04-15",
                    description="Flexible AMM with weighted pools and custom configurations"
                ),
                
                # Lending Protocols
                ProtocolInfo(
                    name="Aave V3",
                    category="lending",
                    chain="ethereum",
                    contract_address="0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
                    tvl_usd=8_500_000_000,
                    apy_range=(2.0, 15.0),
                    risk_score=0.1,
                    liquidity_score=0.95,
                    security_score=0.95,
                    supported_tokens=["USDC", "USDT", "DAI", "WETH", "WBTC"],
                    features=["flash_loans", "rate_switching", "collateral_swapping"],
                    last_audit="2023-01-20",
                    description="Leading lending protocol with advanced features"
                ),
                ProtocolInfo(
                    name="Compound V3",
                    category="lending",
                    chain="ethereum",
                    contract_address="0xc3d688B66703497DAA19211EEdff47f25387cdc3",
                    tvl_usd=2_800_000_000,
                    apy_range=(1.5, 12.0),
                    risk_score=0.1,
                    liquidity_score=0.9,
                    security_score=0.95,
                    supported_tokens=["USDC", "WETH", "WBTC"],
                    features=["isolated_markets", "gas_optimized", "risk_management"],
                    last_audit="2022-11-10",
                    description="Gas-optimized lending with isolated markets"
                ),
                ProtocolInfo(
                    name="Euler Finance",
                    category="lending",
                    chain="ethereum",
                    contract_address="0x27182842E098f60e3D576794A5bFFb0777E025d3",
                    tvl_usd=200_000_000,
                    apy_range=(3.0, 18.0),
                    risk_score=0.3,
                    liquidity_score=0.6,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "DAI"],
                    features=["permissionless_listing", "risk_adjusted_rates"],
                    last_audit="2022-03-15",
                    description="Permissionless lending with risk-adjusted interest rates"
                ),
                
                # Yield Farming Protocols
                ProtocolInfo(
                    name="Yearn Finance",
                    category="yield_farm",
                    chain="ethereum",
                    contract_address="0x50c1a2eA0a861A967D9d0FFE2d401dc7181c5D2c",
                    tvl_usd=400_000_000,
                    apy_range=(5.0, 25.0),
                    risk_score=0.2,
                    liquidity_score=0.8,
                    security_score=0.9,
                    supported_tokens=["USDC", "USDT", "DAI", "WETH"],
                    features=["automated_strategies", "vaults", "governance"],
                    last_audit="2023-05-10",
                    description="Automated yield farming with optimized strategies"
                ),
                ProtocolInfo(
                    name="Convex Finance",
                    category="yield_farm",
                    chain="ethereum",
                    contract_address="0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
                    tvl_usd=1_200_000_000,
                    apy_range=(4.0, 20.0),
                    risk_score=0.15,
                    liquidity_score=0.85,
                    security_score=0.9,
                    supported_tokens=["CRV", "CVX", "USDC", "USDT"],
                    features=["curve_boosting", "cvx_rewards", "staking"],
                    last_audit="2022-08-20",
                    description="Curve boost and yield optimization platform"
                ),
                
                # Stablecoin Protocols
                ProtocolInfo(
                    name="MakerDAO",
                    category="stablecoin",
                    chain="ethereum",
                    contract_address="0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B",
                    tvl_usd=6_500_000_000,
                    apy_range=(1.0, 8.0),
                    risk_score=0.05,
                    liquidity_score=0.95,
                    security_score=0.98,
                    supported_tokens=["DAI", "USDC", "WETH", "WBTC"],
                    features=["cdp_system", "governance", "stability_fee"],
                    last_audit="2023-09-15",
                    description="Decentralized stablecoin system with CDP mechanism"
                ),
                ProtocolInfo(
                    name="Frax Finance",
                    category="stablecoin",
                    chain="ethereum",
                    contract_address="0x853d955aCEf822Db058eb8505911ED77F175b99e",
                    tvl_usd=800_000_000,
                    apy_range=(2.0, 12.0),
                    risk_score=0.2,
                    liquidity_score=0.8,
                    security_score=0.9,
                    supported_tokens=["FRAX", "FXS", "USDC"],
                    features=["algorithmic_stablecoin", "fractional_reserve", "staking"],
                    last_audit="2023-04-10",
                    description="Algorithmic stablecoin with fractional reserve system"
                ),
                
                # Derivatives Protocols
                ProtocolInfo(
                    name="Synthetix",
                    category="derivatives",
                    chain="ethereum",
                    contract_address="0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
                    tvl_usd=300_000_000,
                    apy_range=(8.0, 30.0),
                    risk_score=0.4,
                    liquidity_score=0.7,
                    security_score=0.85,
                    supported_tokens=["SNX", "sUSD", "sETH", "sBTC"],
                    features=["synthetic_assets", "staking_rewards", "debt_pools"],
                    last_audit="2023-02-28",
                    description="Synthetic asset protocol with staking rewards"
                ),
                ProtocolInfo(
                    name="dYdX",
                    category="derivatives",
                    chain="ethereum",
                    contract_address="0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e",
                    tvl_usd=500_000_000,
                    apy_range=(5.0, 20.0),
                    risk_score=0.3,
                    liquidity_score=0.8,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "WBTC"],
                    features=["perpetual_trading", "margin_trading", "liquidity_mining"],
                    last_audit="2023-06-15",
                    description="Decentralized perpetual trading platform"
                )
            ],
            
            "base": [
                # DEX Protocols
                ProtocolInfo(
                    name="Uniswap V3",
                    category="dex",
                    chain="base",
                    contract_address="0x33128a8fC17869897dcE68Ed026d694621f6FDfD",
                    tvl_usd=800_000_000,
                    apy_range=(8.0, 35.0),
                    risk_score=0.25,
                    liquidity_score=0.85,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "USDbC"],
                    features=["concentrated_liquidity", "low_gas_fees"],
                    last_audit="2023-08-15",
                    description="Uniswap V3 on Base with lower gas fees"
                ),
                ProtocolInfo(
                    name="SushiSwap",
                    category="dex",
                    chain="base",
                    contract_address="0x6BDED42c6DA8FBf0d2bA55B2fa120C5e0c8D7891",
                    tvl_usd=150_000_000,
                    apy_range=(10.0, 40.0),
                    risk_score=0.3,
                    liquidity_score=0.7,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "SUSHI"],
                    features=["yield_farming", "cross_chain"],
                    last_audit="2023-05-20",
                    description="SushiSwap on Base with yield farming"
                ),
                ProtocolInfo(
                    name="Aerodrome",
                    category="dex",
                    chain="base",
                    contract_address="0x4200000000000000000000000000000000000002",
                    tvl_usd=200_000_000,
                    apy_range=(12.0, 50.0),
                    risk_score=0.35,
                    liquidity_score=0.75,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "AERO"],
                    features=["ve_tokenomics", "gauge_system", "bribes"],
                    last_audit="2023-09-10",
                    description="Base-native DEX with ve-tokenomics"
                ),
                ProtocolInfo(
                    name="BaseSwap",
                    category="dex",
                    chain="base",
                    contract_address="0x327Df1E6de05895d2ab08513aaDD9313Fe505d86",
                    tvl_usd=80_000_000,
                    apy_range=(15.0, 60.0),
                    risk_score=0.4,
                    liquidity_score=0.6,
                    security_score=0.75,
                    supported_tokens=["USDC", "WETH", "BSWAP"],
                    features=["yield_farming", "governance"],
                    last_audit="2023-07-15",
                    description="Base-native DEX with yield farming"
                ),
                
                # Lending Protocols
                ProtocolInfo(
                    name="Aave V3",
                    category="lending",
                    chain="base",
                    contract_address="0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
                    tvl_usd=1_200_000_000,
                    apy_range=(3.0, 20.0),
                    risk_score=0.15,
                    liquidity_score=0.9,
                    security_score=0.95,
                    supported_tokens=["USDC", "WETH", "USDbC"],
                    features=["flash_loans", "cross_chain"],
                    last_audit="2023-01-20",
                    description="Aave V3 on Base with cross-chain support"
                ),
                ProtocolInfo(
                    name="Moonwell",
                    category="lending",
                    chain="base",
                    contract_address="0x628ff693426583D9a7FB391E54366292F509D457",
                    tvl_usd=300_000_000,
                    apy_range=(5.0, 25.0),
                    risk_score=0.25,
                    liquidity_score=0.8,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "WELL"],
                    features=["lending", "borrowing", "governance"],
                    last_audit="2023-08-05",
                    description="Base-native lending protocol with governance"
                ),
                ProtocolInfo(
                    name="Fluid Finance",
                    category="lending",
                    chain="base",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=150_000_000,
                    apy_range=(8.0, 30.0),
                    risk_score=0.3,
                    liquidity_score=0.7,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "FLUID"],
                    features=["lending", "yield_optimization", "cross_chain"],
                    last_audit="2023-10-15",
                    description="Cross-chain lending with yield optimization"
                ),
                
                # Yield Farming Protocols
                ProtocolInfo(
                    name="Beefy Finance",
                    category="yield_farm",
                    chain="base",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=100_000_000,
                    apy_range=(10.0, 45.0),
                    risk_score=0.3,
                    liquidity_score=0.7,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "BIFI"],
                    features=["auto_compounding", "vaults", "multi_chain"],
                    last_audit="2023-06-20",
                    description="Auto-compounding yield farming platform"
                ),
                ProtocolInfo(
                    name="Pendle Finance",
                    category="yield_farm",
                    chain="base",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=80_000_000,
                    apy_range=(8.0, 35.0),
                    risk_score=0.35,
                    liquidity_score=0.65,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "PENDLE"],
                    features=["yield_trading", "fixed_yield", "liquidity_provision"],
                    last_audit="2023-07-10",
                    description="Yield trading and fixed yield protocol"
                )
            ],
            
            "arbitrum": [
                # DEX Protocols
                ProtocolInfo(
                    name="Uniswap V3",
                    category="dex",
                    chain="arbitrum",
                    contract_address="0x1F98431c8aD98523631AE4a59f267346ea31F984",
                    tvl_usd=1_500_000_000,
                    apy_range=(6.0, 28.0),
                    risk_score=0.2,
                    liquidity_score=0.9,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "ARB"],
                    features=["concentrated_liquidity", "low_gas_fees"],
                    last_audit="2023-08-15",
                    description="Uniswap V3 on Arbitrum with lower gas fees"
                ),
                ProtocolInfo(
                    name="SushiSwap",
                    category="dex",
                    chain="arbitrum",
                    contract_address="0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506",
                    tvl_usd=200_000_000,
                    apy_range=(8.0, 32.0),
                    risk_score=0.25,
                    liquidity_score=0.8,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "SUSHI"],
                    features=["yield_farming", "cross_chain"],
                    last_audit="2023-05-20",
                    description="SushiSwap on Arbitrum with yield farming"
                ),
                ProtocolInfo(
                    name="Camelot",
                    category="dex",
                    chain="arbitrum",
                    contract_address="0x6EcCab422D763aC031210895C81787Baba43B53F",
                    tvl_usd=300_000_000,
                    apy_range=(10.0, 40.0),
                    risk_score=0.3,
                    liquidity_score=0.8,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "GRAIL"],
                    features=["dynamic_fees", "yield_farming", "launchpad"],
                    last_audit="2023-04-15",
                    description="Arbitrum-native DEX with dynamic fees"
                ),
                ProtocolInfo(
                    name="GMX",
                    category="dex",
                    chain="arbitrum",
                    contract_address="0x489ee077994B6658eAfA855C308275EAd8097C4A",
                    tvl_usd=800_000_000,
                    apy_range=(5.0, 25.0),
                    risk_score=0.25,
                    liquidity_score=0.85,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "GMX"],
                    features=["perpetual_trading", "liquidity_provision", "staking"],
                    last_audit="2023-03-20",
                    description="Decentralized perpetual exchange"
                ),
                
                # Lending Protocols
                ProtocolInfo(
                    name="Aave V3",
                    category="lending",
                    chain="arbitrum",
                    contract_address="0x794a61358D6845594F94dc1DB02A252b5b4814aD",
                    tvl_usd=2_000_000_000,
                    apy_range=(3.0, 18.0),
                    risk_score=0.15,
                    liquidity_score=0.9,
                    security_score=0.95,
                    supported_tokens=["USDC", "WETH", "ARB"],
                    features=["flash_loans", "cross_chain"],
                    last_audit="2023-01-20",
                    description="Aave V3 on Arbitrum with cross-chain support"
                ),
                ProtocolInfo(
                    name="Radiant Capital",
                    category="lending",
                    chain="arbitrum",
                    contract_address="0x2032b9A8e9F7e76768CA9271003d3e43E1616B1F",
                    tvl_usd=400_000_000,
                    apy_range=(4.0, 22.0),
                    risk_score=0.2,
                    liquidity_score=0.8,
                    security_score=0.85,
                    supported_tokens=["USDC", "WETH", "RDNT"],
                    features=["cross_chain_lending", "yield_farming"],
                    last_audit="2023-06-10",
                    description="Cross-chain lending with yield farming"
                ),
                ProtocolInfo(
                    name="Fluid Finance",
                    category="lending",
                    chain="arbitrum",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=200_000_000,
                    apy_range=(6.0, 28.0),
                    risk_score=0.25,
                    liquidity_score=0.75,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "FLUID"],
                    features=["lending", "yield_optimization", "cross_chain"],
                    last_audit="2023-10-15",
                    description="Cross-chain lending with yield optimization"
                ),
                
                # Yield Farming Protocols
                ProtocolInfo(
                    name="Beefy Finance",
                    category="yield_farm",
                    chain="arbitrum",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=150_000_000,
                    apy_range=(8.0, 35.0),
                    risk_score=0.3,
                    liquidity_score=0.75,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "BIFI"],
                    features=["auto_compounding", "vaults", "multi_chain"],
                    last_audit="2023-06-20",
                    description="Auto-compounding yield farming platform"
                ),
                ProtocolInfo(
                    name="Pendle Finance",
                    category="yield_farm",
                    chain="arbitrum",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=120_000_000,
                    apy_range=(6.0, 30.0),
                    risk_score=0.3,
                    liquidity_score=0.7,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "PENDLE"],
                    features=["yield_trading", "fixed_yield", "liquidity_provision"],
                    last_audit="2023-07-10",
                    description="Yield trading and fixed yield protocol"
                ),
                
                # Derivatives Protocols
                ProtocolInfo(
                    name="GMX",
                    category="derivatives",
                    chain="arbitrum",
                    contract_address="0x489ee077994B6658eAfA855C308275EAd8097C4A",
                    tvl_usd=800_000_000,
                    apy_range=(5.0, 25.0),
                    risk_score=0.25,
                    liquidity_score=0.85,
                    security_score=0.9,
                    supported_tokens=["USDC", "WETH", "GMX"],
                    features=["perpetual_trading", "liquidity_provision", "staking"],
                    last_audit="2023-03-20",
                    description="Decentralized perpetual exchange"
                ),
                ProtocolInfo(
                    name="Gains Network",
                    category="derivatives",
                    chain="arbitrum",
                    contract_address="0x0000000000000000000000000000000000000000",  # TBD
                    tvl_usd=100_000_000,
                    apy_range=(8.0, 30.0),
                    risk_score=0.35,
                    liquidity_score=0.7,
                    security_score=0.8,
                    supported_tokens=["USDC", "WETH", "GNS"],
                    features=["leverage_trading", "liquidity_provision"],
                    last_audit="2023-05-15",
                    description="Decentralized leverage trading platform"
                )
            ]
        }
        
        return protocols
    
    def get_protocols_by_chain(self, chain: str) -> List[ProtocolInfo]:
        """Get all protocols for a specific chain"""
        return self.protocols.get(chain, [])
    
    def get_protocols_by_category(self, category: str) -> List[ProtocolInfo]:
        """Get all protocols for a specific category across all chains"""
        all_protocols = []
        for chain_protocols in self.protocols.values():
            all_protocols.extend([p for p in chain_protocols if p.category == category])
        return all_protocols
    
    def get_top_protocols_by_tvl(self, limit: int = 10) -> List[ProtocolInfo]:
        """Get top protocols by TVL across all chains"""
        all_protocols = []
        for chain_protocols in self.protocols.values():
            all_protocols.extend(chain_protocols)
        
        return sorted(all_protocols, key=lambda x: x.tvl_usd, reverse=True)[:limit]
    
    def get_protocols_by_apy_range(self, min_apy: float, max_apy: float) -> List[ProtocolInfo]:
        """Get protocols within specific APY range"""
        matching_protocols = []
        
        for chain_protocols in self.protocols.values():
            for protocol in chain_protocols:
                if protocol.apy_range[0] <= max_apy and protocol.apy_range[1] >= min_apy:
                    matching_protocols.append(protocol)
        
        return matching_protocols
    
    def get_protocols_by_risk_score(self, max_risk: float) -> List[ProtocolInfo]:
        """Get protocols with risk score below threshold"""
        safe_protocols = []
        
        for chain_protocols in self.protocols.values():
            for protocol in chain_protocols:
                if protocol.risk_score <= max_risk:
                    safe_protocols.append(protocol)
        
        return safe_protocols
    
    def get_protocol_summary(self) -> Dict[str, Any]:
        """Get comprehensive protocol summary"""
        total_protocols = sum(len(protocols) for protocols in self.protocols.values())
        total_tvl = sum(sum(p.tvl_usd for p in protocols) for protocols in self.protocols.values())
        
        category_counts = {}
        chain_counts = {}
        
        for chain, protocols in self.protocols.items():
            chain_counts[chain] = len(protocols)
            for protocol in protocols:
                category_counts[protocol.category] = category_counts.get(protocol.category, 0) + 1
        
        return {
            "total_protocols": total_protocols,
            "total_tvl_usd": total_tvl,
            "protocols_by_chain": chain_counts,
            "protocols_by_category": category_counts,
            "chains": list(self.protocols.keys()),
            "categories": list(set(p.category for protocols in self.protocols.values() for p in protocols))
        }
    
    def search_protocols(self, query: str) -> List[ProtocolInfo]:
        """Search protocols by name or description"""
        query_lower = query.lower()
        matching_protocols = []
        
        for chain_protocols in self.protocols.values():
            for protocol in chain_protocols:
                if (query_lower in protocol.name.lower() or 
                    query_lower in protocol.description.lower() or
                    query_lower in protocol.category.lower()):
                    matching_protocols.append(protocol)
        
        return matching_protocols

# Test the comprehensive protocol database
def test_comprehensive_protocols():
    """Test the comprehensive protocol database"""
    
    db = ComprehensiveProtocolDatabase()
    
    print("🏦 Comprehensive DeFi Protocol Database")
    print("=" * 50)
    
    # Get summary
    summary = db.get_protocol_summary()
    print(f"\n📊 Database Summary:")
    print(f"   Total Protocols: {summary['total_protocols']}")
    print(f"   Total TVL: ${summary['total_tvl_usd']:,.0f}")
    print(f"   Chains: {', '.join(summary['chains'])}")
    print(f"   Categories: {', '.join(summary['categories'])}")
    
    # Show protocols by chain
    print(f"\n🌐 Protocols by Chain:")
    for chain, count in summary['protocols_by_chain'].items():
        print(f"   {chain.title()}: {count} protocols")
    
    # Show protocols by category
    print(f"\n📋 Protocols by Category:")
    for category, count in summary['protocols_by_category'].items():
        print(f"   {category.title()}: {count} protocols")
    
    # Show top protocols by TVL
    print(f"\n🏆 Top 10 Protocols by TVL:")
    top_protocols = db.get_top_protocols_by_tvl(10)
    for i, protocol in enumerate(top_protocols, 1):
        print(f"   {i:2d}. {protocol.name} ({protocol.chain})")
        print(f"       TVL: ${protocol.tvl_usd:,.0f}")
        print(f"       APY: {protocol.apy_range[0]:.1f}%-{protocol.apy_range[1]:.1f}%")
        print(f"       Risk: {protocol.risk_score:.2f}")
        print()
    
    # Show Fluid Finance specifically
    print(f"\n💧 Fluid Finance Protocols:")
    fluid_protocols = db.search_protocols("Fluid")
    for protocol in fluid_protocols:
        print(f"   {protocol.name} ({protocol.chain})")
        print(f"       TVL: ${protocol.tvl_usd:,.0f}")
        print(f"       APY: {protocol.apy_range[0]:.1f}%-{protocol.apy_range[1]:.1f}%")
        print(f"       Risk: {protocol.risk_score:.2f}")
        print(f"       Features: {', '.join(protocol.features)}")
        print(f"       Description: {protocol.description}")
        print()

if __name__ == "__main__":
    test_comprehensive_protocols()