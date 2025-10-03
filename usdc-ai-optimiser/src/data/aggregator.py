# src/data/aggregator.py
"""Main data aggregation orchestrator"""

import asyncio
import time
from typing import List
from datetime import datetime
# Removed relative imports as they don't work in this context
from src.apis.defillama.defillama import DeFiLlamaAPI
from src.data.models import USDCOpportunity, YieldOpportunity, ProtocolInfo
from src.utils.logger import (
    log_ai_start, log_ai_end, log_ai_error, log_data_fetch, 
    log_performance_metrics, log_opportunity_analysis
)

class USDCDataAggregator:
    """Main USDC data aggregation system"""
    
    def __init__(self):
        self.defillama = DeFiLlamaAPI()
        
    async def fetch_all_opportunities(self) -> List[USDCOpportunity]:
        """Fetch opportunities from all sources"""
        
        start_time = time.time()
        log_ai_start("USDC Opportunity Data Fetch", {"source": "DeFiLlama"})
        
        try:
            # Primary data source
            async with self.defillama as api:
                opportunities = await api.fetch_usdc_opportunities()
            
            fetch_duration = time.time() - start_time
            log_data_fetch("DeFiLlama API", len(opportunities), fetch_duration)
            
            # Filter and enhance
            filter_start = time.time()
            filtered_opportunities = self._filter_opportunities(opportunities)
            filter_duration = time.time() - filter_start
            
            log_performance_metrics({
                "raw_opportunities": len(opportunities),
                "filtered_opportunities": len(filtered_opportunities),
                "filter_efficiency": len(filtered_opportunities) / len(opportunities) if opportunities else 0,
                "fetch_duration": fetch_duration,
                "filter_duration": filter_duration
            })
            
            log_opportunity_analysis([{
                "protocol": opp.protocol,
                "chain": opp.chain,
                "apy": opp.apy,
                "risk_score": opp.risk_score,
                "tvl_usd": opp.tvl_usd
            } for opp in filtered_opportunities[:5]])
            
            total_duration = time.time() - start_time
            log_ai_end("USDC Opportunity Data Fetch", {
                "final_count": len(filtered_opportunities),
                "total_duration": total_duration
            }, total_duration)
            
            return filtered_opportunities
            
        except Exception as e:
            log_ai_error("USDC Opportunity Data Fetch", e, {"source": "DeFiLlama"})
            raise
    
    def _filter_opportunities(self, opportunities: List[USDCOpportunity]) -> List[USDCOpportunity]:
        """Filter opportunities for quality and relevance"""
        
        filtered = []
        
        for opp in opportunities:
            # Quality filters
            if (opp.tvl_usd >= 1000000 and      # Min $1M TVL
                opp.apy >= 1.0 and              # Min 1% APY  
                opp.apy <= 100.0 and            # Max 100% APY (filter out extreme outliers)
                opp.usdc_liquidity >= 500000):  # Min $500k USDC liquidity
                filtered.append(opp)
        
        # Sort by risk-adjusted return
        return sorted(filtered, key=lambda x: x.apy / (1 + x.risk_score), reverse=True)

class YieldDataAggregator:
    """Enhanced yield data aggregator for the new architecture"""

    def __init__(self):
        self.defillama = DeFiLlamaAPI()
        self.usdc_aggregator = USDCDataAggregator()

        # Supported protocols configuration
        self.supported_protocols = {
            "ethereum_sepolia": [
                ProtocolInfo(
                    name="Aave V3",
                    chain="ethereum_sepolia",
                    category="lending",
                    risk_level="low",
                    current_apy=8.5,
                    tvl=1000000,
                    adapter_address="0x0000000000000000000000000000000000000000",  # Placeholder
                    is_active=True
                )
            ],
            "base_sepolia": [
                ProtocolInfo(
                    name="Moonwell",
                    chain="base_sepolia",
                    category="lending",
                    risk_level="medium",
                    current_apy=12.3,
                    tvl=500000,
                    adapter_address="0x0000000000000000000000000000000000000000",  # Placeholder
                    is_active=True
                )
            ],
            "arbitrum_sepolia": [
                ProtocolInfo(
                    name="Radiant Capital",
                    chain="arbitrum_sepolia",
                    category="lending",
                    risk_level="medium",
                    current_apy=15.8,
                    tvl=750000,
                    adapter_address="0x0000000000000000000000000000000000000000",  # Placeholder
                    is_active=True
                )
            ]
        }

    async def get_yield_opportunities(self, strategy: str = "balanced") -> List[YieldOpportunity]:
        """Get yield opportunities filtered by strategy"""

        start_time = time.time()
        log_ai_start("Yield Opportunity Generation", {"strategy": strategy})

        try:
            # Try to get real opportunities from DefiLlama, fallback to hardcoded if needed
            try:
                usdc_opportunities = await self.usdc_aggregator.fetch_all_opportunities()
            except Exception as e:
                print(f"⚠️ DefiLlama fetch failed, using hardcoded data: {e}")
                usdc_opportunities = []
            
            # If no real data, use hardcoded protocols (expanded list)
            if not usdc_opportunities:
                opportunities = self._get_expanded_hardcoded_opportunities()
            else:
                # Convert USDCOpportunity to YieldOpportunity
                opportunities = []
                for opp in usdc_opportunities:
                    risk_score = self._calculate_risk_score_from_opportunity(opp)
                    
                    opportunity = YieldOpportunity(
                        protocol=opp.protocol,
                        chain=opp.chain,
                        apy=opp.apy,
                        tvl=opp.tvl,
                        riskScore=risk_score,
                        category=opp.category,
                        minDeposit=1000000  # 1 USDC in wei
                    )
                    
                    opportunities.append(opportunity)

            # Count unique chains from actual data
            unique_chains = len(set(opp.chain for opp in opportunities))
            
            log_performance_metrics({
                "total_protocols": len(opportunities),
                "chains_covered": unique_chains
            })

            # Filter by strategy
            filtered_opportunities = self._filter_by_strategy(opportunities, strategy)

            # Sort by APY descending
            result = sorted(filtered_opportunities, key=lambda x: x.apy, reverse=True)
            
            duration = time.time() - start_time
            log_performance_metrics({
                "strategy_filtered": len(filtered_opportunities),
                "generation_duration": duration
            })
            
            log_ai_end("Yield Opportunity Generation", {
                "strategy": strategy,
                "opportunities_count": len(result),
                "avg_apy": sum(opp.apy for opp in result) / len(result) if result else 0
            }, duration)
            
            return result
            
        except Exception as e:
            log_ai_error("Yield Opportunity Generation", e, {"strategy": strategy})
            raise

    def _calculate_risk_score(self, protocol: ProtocolInfo) -> int:
        """Calculate risk score (0-100) based on protocol info"""
        risk_mapping = {
            "low": 25,
            "medium": 45,
            "high": 70
        }

        base_score = risk_mapping.get(protocol.risk_level, 50)

        # Adjust based on TVL (higher TVL = lower risk)
        if protocol.tvl > 10000000:  # > $10M
            base_score -= 5
        elif protocol.tvl < 1000000:  # < $1M
            base_score += 10

        return max(0, min(100, base_score))

    def _calculate_risk_score_from_opportunity(self, opportunity: USDCOpportunity) -> int:
        """Calculate risk score from USDCOpportunity"""
        
        # Base risk score from category
        category_risk = {
            "lending": 25,
            "dex": 35,
            "yield_farming": 45,
            "staking": 20,
            "liquidity_pool": 30
        }.get(opportunity.category, 40)
        
        # Adjust based on TVL
        if opportunity.tvl > 50_000_000:  # > $50M
            category_risk -= 10
        elif opportunity.tvl > 20_000_000:  # > $20M
            category_risk -= 5
        elif opportunity.tvl < 10_000_000:  # < $10M
            category_risk += 10
            
        return max(0, min(100, category_risk))

    def _get_expanded_hardcoded_opportunities(self) -> List[YieldOpportunity]:
        """Get expanded list of hardcoded opportunities (30+ protocols)"""
        
        # Expanded protocol list with 30+ protocols across multiple chains
        protocols_data = [
            # Ethereum protocols
            {"name": "Aave V3", "chain": "ethereum_sepolia", "apy": 8.5, "tvl": 1800000000, "category": "lending", "risk": 25},
            {"name": "Compound V3", "chain": "ethereum_sepolia", "apy": 7.2, "tvl": 1200000000, "category": "lending", "risk": 20},
            {"name": "Yearn Finance", "chain": "ethereum_sepolia", "apy": 9.8, "tvl": 450000000, "category": "yield_farming", "risk": 35},
            {"name": "Curve Finance", "chain": "ethereum_sepolia", "apy": 6.5, "tvl": 3200000000, "category": "dex", "risk": 30},
            {"name": "Uniswap V3", "chain": "ethereum_sepolia", "apy": 12.3, "tvl": 2800000000, "category": "dex", "risk": 40},
            {"name": "Balancer", "chain": "ethereum_sepolia", "apy": 8.1, "tvl": 180000000, "category": "dex", "risk": 35},
            {"name": "Convex Finance", "chain": "ethereum_sepolia", "apy": 15.2, "tvl": 320000000, "category": "yield_farming", "risk": 45},
            {"name": "Frax Finance", "chain": "ethereum_sepolia", "apy": 11.7, "tvl": 280000000, "category": "lending", "risk": 30},
            {"name": "Lido", "chain": "ethereum_sepolia", "apy": 4.8, "tvl": 15000000000, "category": "staking", "risk": 15},
            {"name": "MakerDAO", "chain": "ethereum_sepolia", "apy": 3.2, "tvl": 8000000000, "category": "lending", "risk": 20},
            
            # Base protocols
            {"name": "Moonwell", "chain": "base_sepolia", "apy": 12.3, "tvl": 42000000, "category": "lending", "risk": 30},
            {"name": "Aerodrome", "chain": "base_sepolia", "apy": 18.5, "tvl": 180000000, "category": "dex", "risk": 45},
            {"name": "Uniswap V3", "chain": "base_sepolia", "apy": 14.2, "tvl": 120000000, "category": "dex", "risk": 40},
            {"name": "SushiSwap", "chain": "base_sepolia", "apy": 16.8, "tvl": 85000000, "category": "dex", "risk": 40},
            {"name": "Compound V3", "chain": "base_sepolia", "apy": 9.1, "tvl": 65000000, "category": "lending", "risk": 25},
            {"name": "Beefy Finance", "chain": "base_sepolia", "apy": 22.3, "tvl": 45000000, "category": "yield_farming", "risk": 50},
            {"name": "Yearn Finance", "chain": "base_sepolia", "apy": 11.5, "tvl": 38000000, "category": "yield_farming", "risk": 35},
            {"name": "Balancer", "chain": "base_sepolia", "apy": 13.7, "tvl": 32000000, "category": "dex", "risk": 35},
            {"name": "Curve Finance", "chain": "base_sepolia", "apy": 8.9, "tvl": 28000000, "category": "dex", "risk": 30},
            {"name": "Aave V3", "chain": "base_sepolia", "apy": 7.8, "tvl": 150000000, "category": "lending", "risk": 25},
            
            # Arbitrum protocols
            {"name": "Radiant Capital", "chain": "arbitrum_sepolia", "apy": 16.8, "tvl": 280000000, "category": "lending", "risk": 35},
            {"name": "GMX", "chain": "arbitrum_sepolia", "apy": 24.5, "tvl": 180000000, "category": "dex", "risk": 50},
            {"name": "Uniswap V3", "chain": "arbitrum_sepolia", "apy": 15.2, "tvl": 320000000, "category": "dex", "risk": 40},
            {"name": "Camelot", "chain": "arbitrum_sepolia", "apy": 19.8, "tvl": 120000000, "category": "dex", "risk": 45},
            {"name": "SushiSwap", "chain": "arbitrum_sepolia", "apy": 17.3, "tvl": 95000000, "category": "dex", "risk": 40},
            {"name": "Balancer", "chain": "arbitrum_sepolia", "apy": 14.6, "tvl": 78000000, "category": "dex", "risk": 35},
            {"name": "Beefy Finance", "chain": "arbitrum_sepolia", "apy": 25.7, "tvl": 65000000, "category": "yield_farming", "risk": 50},
            {"name": "Yearn Finance", "chain": "arbitrum_sepolia", "apy": 13.2, "tvl": 52000000, "category": "yield_farming", "risk": 35},
            {"name": "Aave V3", "chain": "arbitrum_sepolia", "apy": 8.7, "tvl": 180000000, "category": "lending", "risk": 25},
            {"name": "Compound V3", "chain": "arbitrum_sepolia", "apy": 7.9, "tvl": 95000000, "category": "lending", "risk": 25},
            
            # Polygon protocols
            {"name": "Aave V3", "chain": "polygon", "apy": 9.2, "tvl": 320000000, "category": "lending", "risk": 25},
            {"name": "QuickSwap", "chain": "polygon", "apy": 16.5, "tvl": 180000000, "category": "dex", "risk": 40},
            {"name": "SushiSwap", "chain": "polygon", "apy": 14.8, "tvl": 120000000, "category": "dex", "risk": 40},
            {"name": "Beefy Finance", "chain": "polygon", "apy": 21.3, "tvl": 85000000, "category": "yield_farming", "risk": 50},
            {"name": "Yearn Finance", "chain": "polygon", "apy": 12.7, "tvl": 65000000, "category": "yield_farming", "risk": 35},
        ]
        
        opportunities = []
        for protocol_data in protocols_data:
            opportunity = YieldOpportunity(
                protocol=protocol_data["name"],
                chain=protocol_data["chain"],
                apy=protocol_data["apy"],
                tvl=protocol_data["tvl"],
                riskScore=protocol_data["risk"],
                category=protocol_data["category"],
                minDeposit=1000000  # 1 USDC in wei
            )
            opportunities.append(opportunity)
        
        return opportunities

    def _filter_by_strategy(self, opportunities: List[YieldOpportunity], strategy: str) -> List[YieldOpportunity]:
        """Filter opportunities based on strategy"""

        if strategy == "conservative":
            return [o for o in opportunities if o.riskScore <= 30]
        elif strategy == "balanced":
            return [o for o in opportunities if o.riskScore <= 50]
        elif strategy == "aggressive":
            return opportunities  # No filtering for aggressive
        else:
            return opportunities

    async def get_protocol_info(self, protocol_name: str, chain: str) -> ProtocolInfo:
        """Get detailed protocol information"""

        protocols = self.supported_protocols.get(chain, [])
        for protocol in protocols:
            if protocol.name == protocol_name:
                return protocol

        return None

    async def update_protocol_data(self):
        """Update protocol data from external sources"""
        try:
            # In production, this would fetch real-time data from DeFiLlama, etc.
            # For now, we'll simulate small variations in APY

            import random

            for chain in self.supported_protocols:
                for protocol in self.supported_protocols[chain]:
                    # Add small random variation to simulate real market movement
                    variation = random.uniform(-0.5, 0.5)
                    protocol.current_apy = max(0.1, protocol.current_apy + variation)

            print("📊 Protocol data updated")

        except Exception as e:
            print(f"❌ Error updating protocol data: {e}")

    def get_supported_chains(self) -> List[str]:
        """Get list of supported chains"""
        return list(self.supported_protocols.keys())

    def get_supported_protocols_for_chain(self, chain: str) -> List[ProtocolInfo]:
        """Get supported protocols for a specific chain"""
        return self.supported_protocols.get(chain, [])


# Test the data aggregator
async def test_data_aggregation():
    """Test function for data aggregation"""
    
    aggregator = USDCDataAggregator()
    opportunities = await aggregator.fetch_all_opportunities()
    
    print(f"\n📊 DATA AGGREGATION TEST RESULTS:")
    print(f"Total opportunities found: {len(opportunities)}")
    
    for i, opp in enumerate(opportunities[:5], 1):
        print(f"\n{i}. {opp.protocol.upper()} on {opp.chain.upper()}")
        print(f"   APY: {opp.apy:.2f}% | TVL: ${opp.tvl_usd:,.0f}")
        print(f"   Risk: {opp.risk_score:.2f} | Category: {opp.category}")

if __name__ == "__main__":
    asyncio.run(test_data_aggregation())

