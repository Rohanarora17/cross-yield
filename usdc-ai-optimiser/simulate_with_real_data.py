#!/usr/bin/env python3
"""Simulate investment strategies using real-time data from our AI layer"""

import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.protocols.defi_aggregator_integration import DeFiAggregatorIntegration
from src.protocols.smart_investment_system import SmartInvestmentSystem

async def simulate_with_real_data():
    """Simulate investment strategies using real-time DeFi data"""
    
    print("🚀 REAL-TIME INVESTMENT STRATEGY SIMULATION")
    print("=" * 60)
    print("Using live data from DeFiLlama and other aggregators...")
    print("=" * 60)
    
    try:
        # Initialize our AI-powered systems
        aggregator = DeFiAggregatorIntegration()
        investment_system = SmartInvestmentSystem()
        
        # Test amounts and risk profiles
        amounts = [10, 100, 1000, 10000]
        risk_profiles = {
            "conservative": {"risk_tolerance": 0.2, "target_apy": 5.0},
            "balanced": {"risk_tolerance": 0.5, "target_apy": 10.0},
            "aggressive": {"risk_tolerance": 0.8, "target_apy": 20.0}
        }
        
        # Get real-time yield opportunities
        print("\n1️⃣ FETCHING REAL-TIME YIELD OPPORTUNITIES")
        print("-" * 50)
        
        opportunities = await aggregator.get_yield_opportunities()
        
        if not opportunities:
            print("❌ No opportunities found from live data")
            return
        
        print(f"✅ Found {len(opportunities)} real-time opportunities:")
        for i, opp in enumerate(opportunities[:10], 1):
            print(f"   {i:2d}. {opp.protocol} ({opp.chain}): {opp.apy:.2f}% APY, ${opp.tvl:,.0f} TVL")
        
        # Check if Fluid Finance is in the results
        fluid_found = any("fluid" in opp.protocol.lower() for opp in opportunities)
        if fluid_found:
            print("✅ Fluid Finance found in real-time data!")
        else:
            print("⚠️ Fluid Finance not found in current data")
        
        # Run simulations for each amount and risk profile
        results = {}
        all_protocols = set()
        
        for amount in amounts:
            print(f"\n💰 TESTING AMOUNT: ${amount}")
            print("=" * 40)
            
            results[amount] = {}
            
            for profile_name, profile_config in risk_profiles.items():
                print(f"\n📊 {profile_name.upper()} PROFILE")
                print("-" * 30)
                
                # Use our smart investment system to find optimal investments
                investment_plan = await investment_system.find_optimal_investments(
                    strategy_name=profile_name,
                    amount=amount
                )
                
                results[amount][profile_name] = {
                    'amount': amount,
                    'risk_tolerance': profile_config['risk_tolerance'],
                    'target_apy': profile_config['target_apy'],
                    'investment_plan': investment_plan,
                    'protocols_count': len(investment_plan)
                }
                
                # Collect all protocols
                for investment in investment_plan:
                    protocol_key = f"{investment['protocol']}_{investment['chain']}"
                    all_protocols.add(protocol_key)
                
                # Print results
                print(f"   Suitable Protocols: {len(investment_plan)}")
                if investment_plan:
                    total_apy = sum(inv['apy'] * (inv['amount'] / amount) for inv in investment_plan)
                    print(f"   Weighted APY: {total_apy:.2f}%")
                    print(f"   Top Protocols:")
                    for i, inv in enumerate(investment_plan[:3], 1):
                        print(f"     {i}. {inv['protocol']} ({inv['chain']}): ${inv['amount']:.2f} - {inv['apy']:.1f}% APY")
                else:
                    print("   No suitable protocols found")
        
        # Analyze results
        print(f"\n📈 REAL-TIME SIMULATION ANALYSIS")
        print("=" * 50)
        
        # Find most common protocols
        protocol_frequency = {}
        for amount_results in results.values():
            for profile_results in amount_results.values():
                for investment in profile_results['investment_plan']:
                    protocol_key = f"{investment['protocol']}_{investment['chain']}"
                    protocol_frequency[protocol_key] = protocol_frequency.get(protocol_key, 0) + 1
        
        # Sort by frequency
        sorted_protocols = sorted(protocol_frequency.items(), key=lambda x: x[1], reverse=True)
        
        print(f"\n🎯 TOP PROTOCOLS FROM REAL-TIME DATA:")
        for i, (protocol, frequency) in enumerate(sorted_protocols[:15], 1):
            print(f"   {i:2d}. {protocol}: {frequency} appearances")
        
        # Create final integration list
        integration_list = []
        for protocol, frequency in sorted_protocols:
            if frequency >= 2:  # Appears in at least 2 scenarios
                integration_list.append(protocol)
        
        print(f"\n✅ PROTOCOLS TO INTEGRATE ({len(integration_list)} protocols):")
        for i, protocol in enumerate(integration_list, 1):
            print(f"   {i:2d}. {protocol}")
        
        # Check specific protocols
        print(f"\n🔍 PROTOCOL ANALYSIS:")
        specific_protocols = ["fluid", "aave", "convex", "yearn", "balancer", "eigenlayer", "pendle"]
        for protocol_name in specific_protocols:
            found = any(protocol_name.lower() in protocol.lower() for protocol in integration_list)
            status = "✅ FOUND" if found else "❌ NOT FOUND"
            print(f"   {protocol_name.title()}: {status}")
        
        # Show real-time data sources
        print(f"\n📊 DATA SOURCES USED:")
        print("   - DeFiLlama API (real-time yield data)")
        print("   - Protocol-specific endpoints")
        print("   - Live TVL and APY data")
        print("   - Risk assessment algorithms")
        
        return {
            'real_time_opportunities': len(opportunities),
            'integration_list': integration_list,
            'protocol_frequency': protocol_frequency,
            'results': results
        }
        
    except Exception as e:
        print(f"❌ Simulation failed: {e}")
        import traceback
        traceback.print_exc()
        return None

async def test_fluid_finance_specifically():
    """Test specifically for Fluid Finance integration"""
    
    print("\n🔍 TESTING FLUID FINANCE SPECIFICALLY")
    print("=" * 50)
    
    try:
        aggregator = DeFiAggregatorIntegration()
        
        # Try to get Fluid Finance data specifically
        print("Fetching Fluid Finance data...")
        
        # Check if we can get Fluid Finance data
        opportunities = await aggregator.get_yield_opportunities()
        
        fluid_opportunities = [opp for opp in opportunities if "fluid" in opp.protocol.lower()]
        
        if fluid_opportunities:
            print(f"✅ Found {len(fluid_opportunities)} Fluid Finance opportunities:")
            for opp in fluid_opportunities:
                print(f"   - {opp.protocol} ({opp.chain}): {opp.apy:.2f}% APY, ${opp.tvl:,.0f} TVL")
                print(f"     Method: {opp.investment_method}")
                print(f"     Risk: {opp.risk_score:.2f}")
        else:
            print("❌ No Fluid Finance opportunities found")
            print("This could be because:")
            print("   - Fluid Finance doesn't have USDC pools")
            print("   - Data not available in DeFiLlama")
            print("   - Different protocol name")
        
        # Show all protocols that might be related
        related_protocols = [opp for opp in opportunities if any(keyword in opp.protocol.lower() 
                           for keyword in ["fluid", "liquid", "stream", "flow"])]
        
        if related_protocols:
            print(f"\n🔍 Related protocols found:")
            for opp in related_protocols:
                print(f"   - {opp.protocol} ({opp.chain}): {opp.apy:.2f}% APY")
        
    except Exception as e:
        print(f"❌ Fluid Finance test failed: {e}")

if __name__ == "__main__":
    asyncio.run(simulate_with_real_data())
    asyncio.run(test_fluid_finance_specifically())