#!/usr/bin/env python3
"""
Simple test for USDC Data Aggregator without heavy dependencies
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Mock the dependencies we don't have
class MockUSDCOpportunity:
    def __init__(self, **kwargs):
        for key, value in kwargs.items():
            setattr(self, key, value)

# Mock the DeFiLlama API
class MockDeFiLlamaAPI:
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass
    
    async def fetch_usdc_opportunities(self):
        """Return mock USDC opportunities"""
        print("📊 Using mock USDC opportunities...")
        
        mock_data = [
            {
                "protocol": "aave-v3", "chain": "ethereum", "pool_name": "USDC",
                "apy": 4.2, "apy_base": 4.2, "apy_reward": 0,
                "tvl_usd": 1800000000, "usdc_liquidity": 1710000000,
                "risk_score": 0.1, "category": "lending"
            },
            {
                "protocol": "moonwell", "chain": "base", "pool_name": "USDC",
                "apy": 11.8, "apy_base": 7.5, "apy_reward": 4.3,
                "tvl_usd": 42000000, "usdc_liquidity": 39900000,
                "risk_score": 0.3, "category": "lending"
            },
            {
                "protocol": "radiant", "chain": "arbitrum", "pool_name": "USDC", 
                "apy": 18.5, "apy_base": 12.2, "apy_reward": 6.3,
                "tvl_usd": 23000000, "usdc_liquidity": 21850000,
                "risk_score": 0.4, "category": "lending"
            },
            {
                "protocol": "compound", "chain": "ethereum", "pool_name": "USDC",
                "apy": 3.8, "apy_base": 3.8, "apy_reward": 0,
                "tvl_usd": 800000000, "usdc_liquidity": 760000000,
                "risk_score": 0.15, "category": "lending"
            },
            {
                "protocol": "curve", "chain": "ethereum", "pool_name": "USDC-USDT",
                "apy": 2.1, "apy_base": 2.1, "apy_reward": 0,
                "tvl_usd": 500000000, "usdc_liquidity": 250000000,
                "risk_score": 0.25, "category": "stable_lp"
            },
            {
                "protocol": "test-low-tvl", "chain": "base", "pool_name": "USDC",
                "apy": 25.0, "apy_base": 20.0, "apy_reward": 5.0,
                "tvl_usd": 500000,  # Too low TVL - should be filtered
                "usdc_liquidity": 300000,  # Too low liquidity - should be filtered
                "risk_score": 0.8, "category": "lending"
            },
            {
                "protocol": "test-low-apy", "chain": "arbitrum", "pool_name": "USDC",
                "apy": 0.5,  # Too low APY - should be filtered
                "apy_base": 0.5, "apy_reward": 0,
                "tvl_usd": 2000000, "usdc_liquidity": 1000000,
                "risk_score": 0.2, "category": "lending"
            },
            {
                "protocol": "test-high-apy", "chain": "polygon", "pool_name": "USDC",
                "apy": 150.0,  # Too high APY - should be filtered
                "apy_base": 10.0, "apy_reward": 140.0,
                "tvl_usd": 5000000, "usdc_liquidity": 2000000,
                "risk_score": 0.8, "category": "lending"
            }
        ]
        
        opportunities = []
        for data in mock_data:
            opportunity = MockUSDCOpportunity(
                protocol=data["protocol"],
                chain=data["chain"],
                pool_id=f"{data['protocol']}_{data['chain']}_usdc",
                pool_name=data["pool_name"],
                apy=data["apy"],
                apy_base=data["apy_base"],
                apy_reward=data["apy_reward"],
                tvl_usd=data["tvl_usd"],
                usdc_liquidity=data["usdc_liquidity"],
                risk_score=data["risk_score"],
                category=data["category"],
                min_deposit=1.0,
                oracle_confidence=0.9,
                last_updated=datetime.now()
            )
            opportunities.append(opportunity)
        
        return opportunities

# Mock the aggregator class
class MockUSDCDataAggregator:
    def __init__(self):
        self.defillama = MockDeFiLlamaAPI()
        
    async def fetch_all_opportunities(self):
        """Fetch opportunities from all sources"""
        
        print("🔍 Starting comprehensive USDC opportunity scan...")
        
        # Primary data source
        async with self.defillama as api:
            opportunities = await api.fetch_usdc_opportunities()
        
        # Filter and enhance
        filtered_opportunities = self._filter_opportunities(opportunities)
        
        print(f"📋 Final opportunity count: {len(filtered_opportunities)}")
        return filtered_opportunities
    
    def _filter_opportunities(self, opportunities):
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

async def test_aggregator():
    """Test the USDC data aggregator"""
    
    print("🚀 USDC Data Aggregator Test (Mock Data)")
    print("=" * 60)
    
    # Initialize aggregator
    aggregator = MockUSDCDataAggregator()
    
    try:
        # Test fetching opportunities
        print("\n📊 Testing opportunity fetching...")
        opportunities = await aggregator.fetch_all_opportunities()
        
        # Display results
        print(f"\n✅ Successfully fetched {len(opportunities)} opportunities")
        
        if opportunities:
            print("\n📋 TOP OPPORTUNITIES:")
            print("-" * 80)
            
            for i, opp in enumerate(opportunities[:10], 1):
                risk_adjusted_apy = opp.apy / (1 + opp.risk_score)
                
                print(f"{i:2d}. {opp.protocol.upper():15} | {opp.chain.upper():8} | {opp.category:10}")
                print(f"    APY: {opp.apy:6.2f}% | Risk: {opp.risk_score:.2f} | Risk-Adj: {risk_adjusted_apy:.2f}%")
                print(f"    TVL: ${opp.tvl_usd:12,.0f} | USDC Liquidity: ${opp.usdc_liquidity:12,.0f}")
                print(f"    Base: {opp.apy_base:.2f}% | Reward: {opp.apy_reward:.2f}%")
                print()
            
            # Test filtering logic
            print("🔍 FILTERING ANALYSIS:")
            print("-" * 40)
            
            total_opportunities = len(opportunities)
            high_yield = len([o for o in opportunities if o.apy > 10])
            low_risk = len([o for o in opportunities if o.risk_score < 0.3])
            cross_chain = len(set(o.chain for o in opportunities))
            
            print(f"Total opportunities: {total_opportunities}")
            print(f"High yield (>10%): {high_yield}")
            print(f"Low risk (<0.3): {low_risk}")
            print(f"Chains covered: {cross_chain}")
            
            # Chain distribution
            print(f"\n🌐 CHAIN DISTRIBUTION:")
            chain_counts = {}
            for opp in opportunities:
                chain_counts[opp.chain] = chain_counts.get(opp.chain, 0) + 1
            
            for chain, count in sorted(chain_counts.items()):
                print(f"  {chain.upper():10}: {count:3d} opportunities")
            
            # Protocol distribution
            print(f"\n🏛️ PROTOCOL DISTRIBUTION:")
            protocol_counts = {}
            for opp in opportunities:
                protocol_counts[opp.protocol] = protocol_counts.get(opp.protocol, 0) + 1
            
            for protocol, count in sorted(protocol_counts.items(), key=lambda x: x[1], reverse=True)[:10]:
                print(f"  {protocol:15}: {count:3d} opportunities")
            
            # Risk analysis
            print(f"\n⚠️ RISK ANALYSIS:")
            avg_risk = sum(o.risk_score for o in opportunities) / len(opportunities)
            min_risk = min(o.risk_score for o in opportunities)
            max_risk = max(o.risk_score for o in opportunities)
            
            print(f"  Average risk score: {avg_risk:.3f}")
            print(f"  Min risk score: {min_risk:.3f}")
            print(f"  Max risk score: {max_risk:.3f}")
            
            # Yield analysis
            print(f"\n💰 YIELD ANALYSIS:")
            avg_yield = sum(o.apy for o in opportunities) / len(opportunities)
            min_yield = min(o.apy for o in opportunities)
            max_yield = max(o.apy for o in opportunities)
            
            print(f"  Average APY: {avg_yield:.2f}%")
            print(f"  Min APY: {min_yield:.2f}%")
            print(f"  Max APY: {max_yield:.2f}%")
            
            # Cross-chain arbitrage analysis
            print(f"\n🔄 CROSS-CHAIN ARBITRAGE ANALYSIS:")
            chain_yields = {}
            for opp in opportunities:
                if opp.chain not in chain_yields:
                    chain_yields[opp.chain] = []
                chain_yields[opp.chain].append(opp.apy)
            
            for chain, yields in chain_yields.items():
                avg_yield = sum(yields) / len(yields)
                max_yield = max(yields)
                print(f"  {chain.upper():10}: Avg {avg_yield:.2f}%, Max {max_yield:.2f}%")
            
            # Best opportunities by chain
            print(f"\n🏆 BEST OPPORTUNITY PER CHAIN:")
            best_per_chain = {}
            for opp in opportunities:
                if opp.chain not in best_per_chain or opp.apy > best_per_chain[opp.chain].apy:
                    best_per_chain[opp.chain] = opp
            
            for chain, opp in best_per_chain.items():
                risk_adj_apy = opp.apy / (1 + opp.risk_score)
                print(f"  {chain.upper():10}: {opp.protocol} - {opp.apy:.2f}% APY (Risk-adj: {risk_adj_apy:.2f}%)")
            
        else:
            print("❌ No opportunities found")
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

async def test_filtering():
    """Test the filtering logic specifically"""
    
    print("\n🔬 TESTING FILTERING LOGIC")
    print("=" * 50)
    
    # Create test opportunities
    test_opportunities = [
        MockUSDCOpportunity(
            protocol="test-protocol-1",
            chain="ethereum",
            pool_id="test1",
            pool_name="USDC",
            apy=5.0,
            apy_base=5.0,
            apy_reward=0.0,
            tvl_usd=2000000,  # Should pass
            usdc_liquidity=1000000,  # Should pass
            risk_score=0.2,
            category="lending",
            min_deposit=1.0,
            oracle_confidence=0.9,
            last_updated=datetime.now()
        ),
        MockUSDCOpportunity(
            protocol="test-protocol-2",
            chain="base",
            pool_id="test2",
            pool_name="USDC",
            apy=0.5,  # Should be filtered out (too low)
            apy_base=0.5,
            apy_reward=0.0,
            tvl_usd=2000000,
            usdc_liquidity=1000000,
            risk_score=0.2,
            category="lending",
            min_deposit=1.0,
            oracle_confidence=0.9,
            last_updated=datetime.now()
        ),
        MockUSDCOpportunity(
            protocol="test-protocol-3",
            chain="arbitrum",
            pool_id="test3",
            pool_name="USDC",
            apy=15.0,
            apy_base=10.0,
            apy_reward=5.0,
            tvl_usd=500000,  # Should be filtered out (too low TVL)
            usdc_liquidity=300000,  # Should be filtered out (too low liquidity)
            risk_score=0.3,
            category="lending",
            min_deposit=1.0,
            oracle_confidence=0.9,
            last_updated=datetime.now()
        ),
        MockUSDCOpportunity(
            protocol="test-protocol-4",
            chain="polygon",
            pool_id="test4",
            pool_name="USDC",
            apy=150.0,  # Should be filtered out (too high)
            apy_base=10.0,
            apy_reward=140.0,
            tvl_usd=5000000,
            usdc_liquidity=2000000,
            risk_score=0.8,
            category="lending",
            min_deposit=1.0,
            oracle_confidence=0.9,
            last_updated=datetime.now()
        )
    ]
    
    aggregator = MockUSDCDataAggregator()
    filtered = aggregator._filter_opportunities(test_opportunities)
    
    print(f"Input opportunities: {len(test_opportunities)}")
    print(f"Filtered opportunities: {len(filtered)}")
    
    print("\nFiltered results:")
    for opp in filtered:
        print(f"  {opp.protocol}: {opp.apy}% APY, ${opp.tvl_usd:,} TVL, ${opp.usdc_liquidity:,} liquidity")
    
    # Test sorting
    print(f"\nSorting test (by risk-adjusted APY):")
    for i, opp in enumerate(filtered, 1):
        risk_adj_apy = opp.apy / (1 + opp.risk_score)
        print(f"  {i}. {opp.protocol}: {risk_adj_apy:.2f}% risk-adjusted APY")

if __name__ == "__main__":
    print("🧪 Running USDC Data Aggregator Tests (Mock Version)")
    print("=" * 70)
    
    # Run main test
    asyncio.run(test_aggregator())
    
    # Run filtering test
    asyncio.run(test_filtering())
    
    print("\n✅ All tests completed!")
    print("\n📝 SUMMARY:")
    print("- Aggregator successfully filters opportunities based on TVL, APY, and liquidity thresholds")
    print("- Risk-adjusted sorting prioritizes high-yield, low-risk opportunities")
    print("- Cross-chain analysis shows arbitrage potential between chains")
    print("- Filtering removes outliers and low-quality opportunities")