# src/data/aggregator.py
"""Main data aggregation orchestrator"""

import asyncio
from typing import List
from src.apis.defillama import DeFiLlamaAPI
from src.data.models import USDCOpportunity

class USDCDataAggregator:
    """Main USDC data aggregation system"""
    
    def __init__(self):
        self.defillama = DeFiLlamaAPI()
        
    async def fetch_all_opportunities(self) -> List[USDCOpportunity]:
        """Fetch opportunities from all sources"""
        
        print("🔍 Starting comprehensive USDC opportunity scan...")
        
        # Primary data source
        async with self.defillama as api:
            opportunities = await api.fetch_usdc_opportunities()
        
        # Filter and enhance
        filtered_opportunities = self._filter_opportunities(opportunities)
        
        print(f"📋 Final opportunity count: {len(filtered_opportunities)}")
        return filtered_opportunities
    
    def _filter_opportunities(self, opportunities: List[USDCOpportunity]) -> List[USDCOpportunity]:
        """Filter opportunities for quality and relevance"""
        
        filtered = []
        
        for opp in opportunities:
            # Quality filters
            if (opp.tvl_usd >= 1000000 and  # Min $1M TVL
                opp.apy >= 1.0 and          # Min 1% APY
                opp.usdc_liquidity >= 500000):  # Min $500k USDC liquidity
                filtered.append(opp)
        
        # Sort by risk-adjusted return
        return sorted(filtered, key=lambda x: x.apy / (1 + x.risk_score), reverse=True)

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

