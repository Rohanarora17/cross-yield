#!/usr/bin/env python3
"""
Test script for USDC Data Aggregator
Tests the aggregator functionality with both live API and fallback data
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.data.aggregator import USDCDataAggregator
from src.data.models import USDCOpportunity

async def test_aggregator():
    """Test the USDC data aggregator"""
    
    print("🚀 USDC Data Aggregator Test")
    print("=" * 50)
    
    # Initialize aggregator
    aggregator = USDCDataAggregator()
    
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
                
                print(f"{i:2d}. {opp.protocol.upper():12} | {opp.chain.upper():8} | {opp.category:10}")
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
        USDCOpportunity(
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
        USDCOpportunity(
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
        USDCOpportunity(
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
        USDCOpportunity(
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
    
    aggregator = USDCDataAggregator()
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
    print("🧪 Running USDC Data Aggregator Tests")
    print("=" * 60)
    
    # Run main test
    asyncio.run(test_aggregator())
    
    # Run filtering test
    asyncio.run(test_filtering())
    
    print("\n✅ All tests completed!")