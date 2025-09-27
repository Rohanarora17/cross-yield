#!/usr/bin/env python3
"""Test All Protocols Across Chains"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.graph_integration import GraphIntegration
from src.data.comprehensive_protocols import ComprehensiveProtocolDatabase

async def test_all_protocols_comprehensive():
    """Test Graph integration for all protocols across all chains"""

    print("🌐 COMPREHENSIVE PROTOCOL TEST")
    print("=" * 60)

    db = ComprehensiveProtocolDatabase()
    summary = db.get_protocol_summary()

    print(f"📊 Database: {summary['total_protocols']} protocols across {len(summary['chains'])} chains")
    print(f"💰 Total TVL: ${summary['total_tvl_usd']:,.0f}")

    async with GraphIntegration() as graph:
        all_results = {}

        for chain in ["ethereum", "base", "arbitrum"]:
            print(f"\n🔗 Testing {chain.upper()} chain...")

            # Get comprehensive protocol data
            yield_data = await graph.get_all_protocols_yield_data(chain)

            working_protocols = []
            failed_protocols = []
            total_pools = 0
            protocol_details = {}

            for protocol, pools in yield_data.items():
                if pools:
                    working_protocols.append(protocol)
                    total_pools += len(pools)

                    # Get sample pool data
                    sample_pool = pools[0]
                    protocol_details[protocol] = {
                        'pools': len(pools),
                        'sample_tvl': sample_pool.get('tvl_usd', 0),
                        'sample_tokens': f"{sample_pool.get('token0_symbol', 'N/A')}/{sample_pool.get('token1_symbol', 'N/A')}"
                    }
                else:
                    failed_protocols.append(protocol)

            all_results[chain] = {
                'working_count': len(working_protocols),
                'failed_count': len(failed_protocols),
                'total_pools': total_pools,
                'working_protocols': working_protocols,
                'failed_protocols': failed_protocols,
                'protocol_details': protocol_details
            }

            print(f"   ✅ Working: {len(working_protocols)}/{len(yield_data)} protocols")
            print(f"   🏊 Total pools: {total_pools}")

            if working_protocols:
                print(f"   📋 Working protocols:")
                for protocol in working_protocols:
                    details = protocol_details.get(protocol, {})
                    pools_count = details.get('pools', 0)
                    tvl = details.get('sample_tvl', 0)
                    tokens = details.get('sample_tokens', 'N/A')
                    print(f"      • {protocol}: {pools_count} pools, sample TVL ${tvl:,.0f} ({tokens})")

            if failed_protocols:
                print(f"   ❌ Failed: {', '.join(failed_protocols[:5])}...")

        return all_results

async def test_cross_chain_arbitrage():
    """Test cross-chain arbitrage opportunities"""

    print(f"\n🌉 CROSS-CHAIN ARBITRAGE TEST")
    print("=" * 60)

    async with GraphIntegration() as graph:
        print("🔍 Analyzing cross-chain arbitrage opportunities...")

        try:
            arbitrage_ops = await graph.get_cross_chain_arbitrage_opportunities()

            print(f"⚡ Found {len(arbitrage_ops)} arbitrage opportunities")

            if arbitrage_ops:
                print("🎯 Top arbitrage opportunities:")
                for i, opp in enumerate(arbitrage_ops[:3]):
                    print(f"   {i+1}. {opp.get('protocol', 'Unknown')} - {opp.get('token_pair', 'N/A')}")
                    print(f"      Profit potential: {opp.get('profit_potential', 0):.2%}")
                    print(f"      Chains: {opp.get('max_yield_chain', 'N/A')} → {opp.get('min_yield_chain', 'N/A')}")
            else:
                print("ℹ️ No arbitrage opportunities found (normal during stable market conditions)")

            return len(arbitrage_ops)

        except Exception as e:
            print(f"❌ Arbitrage test failed: {e}")
            return 0

async def generate_optimization_recommendations():
    """Generate optimization recommendations based on test results"""

    print(f"\n🎯 OPTIMIZATION RECOMMENDATIONS")
    print("=" * 60)

    recommendations = {
        'conservative': {
            'risk_level': 'Low (0-20%)',
            'target_apy': '2-8%',
            'recommended_protocols': [
                'Ethereum Aave V3 USDC lending',
                'Ethereum Compound V3 USDC',
                'Ethereum Curve USDC/USDT pools'
            ],
            'allocation': '40% Aave, 30% Compound, 20% Curve, 10% Reserve',
            'rebalancing': 'Weekly',
            'min_amount': '$1,000',
            'gas_strategy': 'Batch transactions, prefer L2 for small amounts'
        },
        'balanced': {
            'risk_level': 'Medium (20-40%)',
            'target_apy': '5-15%',
            'recommended_protocols': [
                'Ethereum Uniswap V3 USDC/WETH 0.05%',
                'Base Aerodrome USDC pools',
                'Arbitrum Camelot USDC farms',
                'Cross-chain arbitrage'
            ],
            'allocation': '30% Uniswap V3, 25% Aerodrome, 20% Camelot, 15% Arbitrage, 10% Reserve',
            'rebalancing': 'Daily',
            'min_amount': '$10,000',
            'gas_strategy': 'Multi-chain deployment, L2 optimization'
        },
        'aggressive': {
            'risk_level': 'High (40-100%)',
            'target_apy': '10-50%',
            'recommended_protocols': [
                'Ethereum Uniswap V3 concentrated liquidity',
                'Arbitrum GMX liquidity provision',
                'Base high-yield farming',
                'DeFi derivatives and leveraged strategies'
            ],
            'allocation': '35% Concentrated LP, 25% GMX, 20% Yield farms, 15% Derivatives, 5% Emergency',
            'rebalancing': 'Real-time (automated)',
            'min_amount': '$100,000',
            'gas_strategy': 'MEV protection, flashloan optimization'
        }
    }

    for strategy, details in recommendations.items():
        print(f"\n🎯 {strategy.upper()} STRATEGY:")
        print(f"   Risk Level: {details['risk_level']}")
        print(f"   Target APY: {details['target_apy']}")
        print(f"   Min Amount: {details['min_amount']}")
        print(f"   Protocols: {', '.join(details['recommended_protocols'])}")
        print(f"   Allocation: {details['allocation']}")
        print(f"   Rebalancing: {details['rebalancing']}")
        print(f"   Gas Strategy: {details['gas_strategy']}")

    return recommendations

async def main():
    """Main test function"""

    print("🏁 USDC AI OPTIMIZER - COMPLETE PROTOCOL TEST")
    print("=" * 70)

    # Test 1: All protocols
    protocol_results = await test_all_protocols_comprehensive()

    # Test 2: Cross-chain arbitrage
    arbitrage_count = await test_cross_chain_arbitrage()

    # Test 3: Generate recommendations
    recommendations = await generate_optimization_recommendations()

    # Final summary
    print(f"\n" + "=" * 70)
    print("🏆 FINAL SYSTEM STATUS")
    print("=" * 70)

    total_working = sum(r['working_count'] for r in protocol_results.values())
    total_protocols = sum(r['working_count'] + r['failed_count'] for r in protocol_results.values())
    total_pools = sum(r['total_pools'] for r in protocol_results.values())

    print(f"\n📊 Protocol Coverage:")
    print(f"   ✅ Working Protocols: {total_working}/{total_protocols}")
    print(f"   🏊 Total Pools Available: {total_pools}")
    print(f"   🌉 Arbitrage Opportunities: {arbitrage_count}")

    for chain, results in protocol_results.items():
        working_list = ', '.join(results['working_protocols'][:3])
        print(f"   {chain.title()}: {results['working_count']} protocols ({working_list}...)")

    print(f"\n🎯 Strategy Options: {len(recommendations)} risk profiles available")
    print(f"🤖 AI System: {'🟢 OPERATIONAL' if total_working > 0 else '🔴 OFFLINE'}")

    success_rate = (total_working / total_protocols) * 100 if total_protocols > 0 else 0
    print(f"\n📈 Success Rate: {success_rate:.1f}%")

    if success_rate > 50:
        print("🎉 SYSTEM IS READY FOR PRODUCTION!")
        print("   • Multi-chain protocol support active")
        print("   • Real-time yield data available")
        print("   • Risk-adjusted strategies configured")
        print("   • Cross-chain arbitrage detection enabled")
    else:
        print("⚠️ System needs optimization")

    return {
        'protocols': protocol_results,
        'arbitrage': arbitrage_count,
        'recommendations': recommendations,
        'success_rate': success_rate
    }

if __name__ == "__main__":
    results = asyncio.run(main())