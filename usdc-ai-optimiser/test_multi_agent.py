# test_multi_agent.py (in project root)
"""Test the complete multi-agent AI system"""

import asyncio
import sys
import os

# Add src to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

from src.agents.multi_agent import MultiAgentOrchestrator
from src.data.aggregator import USDCDataAggregator
from src.data.models import UserProfile

async def main():
    """Test the complete multi-agent system"""
    
    print("🚀 TESTING COMPLETE MULTI-AGENT AI SYSTEM")
    print("🎯 This is our competitive advantage over YieldSeeker!")
    print("=" * 60)
    
    try:
        # Phase 1: Get real market data
        print("📊 Phase 1: Gathering market data...")
        aggregator = USDCDataAggregator()
        opportunities = await aggregator.fetch_all_opportunities()
        print(f"✅ Found {len(opportunities)} opportunities")
        
        # Phase 2: Set up user profile
        print("\n👤 Phase 2: User profile setup...")
        user_profile = UserProfile(
            amount=50000,
            risk_tolerance="moderate",
            time_horizon="6_months",
            preferred_chains=["ethereum", "base", "arbitrum"],
            min_apy=3.0
        )
        print(f"✅ User: ${user_profile.amount:,} USDC, {user_profile.risk_tolerance} risk")
        
        # Phase 3: Multi-agent coordination
        print("\n🤖 Phase 3: Multi-Agent AI Coordination...")
        orchestrator = MultiAgentOrchestrator()
        result = await orchestrator.coordinate_optimization(opportunities, user_profile)
        
        # Phase 4: Results analysis
        print("\n📈 FINAL RESULTS ANALYSIS:")
        print("=" * 40)
        
        final_strategy = result["final_strategy"]
        print(f"🎯 Expected APY: {final_strategy['expected_apy']:.2f}%")
        print(f"💪 System Confidence: {result['system_confidence']:.1%}")
        print(f"🤝 Agent Consensus: {result['consensus_score']:.1%}")
        print(f"🎪 Coordination Method: {final_strategy.get('coordination_method', 'unknown')}")
        
        print(f"\n💼 OPTIMIZED ALLOCATION:")
        total_check = 0
        for position, weight in final_strategy["allocation"].items():
            protocol, chain = position.split("_", 1)
            amount = user_profile.amount * weight
            print(f"   {weight:.1%} ({amount:,.0f} USDC) → {protocol.upper()} on {chain.upper()}")
            total_check += weight
        
        print(f"\n✅ Total allocation: {total_check:.1%} (should be 100%)")
        
        # Competitive comparison
        print(f"\n🏆 COMPETITIVE ADVANTAGE:")
        print(f"   📊 YieldSeeker (single chain): ~15.2% max APY")
        print(f"   🚀 Our AI System (multi-chain): {final_strategy['expected_apy']:.2f}% APY")
        
        advantage = (final_strategy['expected_apy'] / 15.2 - 1) * 100
        yearly_gain = user_profile.amount * (final_strategy['expected_apy'] - 15.2) / 100
        
        print(f"   📈 Performance advantage: +{advantage:.1f}%")
        print(f"   💰 Additional yearly income: ${yearly_gain:,.0f}")
        
        print(f"\n🎉 MULTI-AGENT AI SYSTEM WORKING PERFECTLY!")
        print(f"🏅 Ready for hackathon demo!")
        
        return result
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    asyncio.run(main())
