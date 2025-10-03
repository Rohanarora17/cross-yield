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
            opportunities = []

            # Convert protocol info to yield opportunities
            for chain, protocols in self.supported_protocols.items():
                for protocol in protocols:
                    if protocol.is_active:
                        risk_score = self._calculate_risk_score(protocol)

                        opportunity = YieldOpportunity(
                            protocol=protocol.name,
                            chain=chain,
                            apy=protocol.current_apy,
                            tvl=protocol.tvl,
                            riskScore=risk_score,
                            category=protocol.category,
                            minDeposit=1000000  # 1 USDC in wei
                        )

                        opportunities.append(opportunity)

            log_performance_metrics({
                "total_protocols": len(opportunities),
                "chains_covered": len(self.supported_protocols)
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

