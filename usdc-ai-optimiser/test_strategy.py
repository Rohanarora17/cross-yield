#!/usr/bin/env python3
"""
Test CrossYield Strategy System
Quick way to see how the AI optimization works
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root / "src"))

from src.data.aggregator import YieldDataAggregator
from src.execution.cctp_engine import cctp_engine
from src.contract_integration import contract_manager

async def test_strategy(user_address: str, amount_usd: float, strategy: str):
    """Test the complete strategy flow"""
    print(f"🎯 Testing {strategy.upper()} strategy for ${amount_usd:,.0f}")
    print("=" * 60)

    # Convert to USDC wei (6 decimals)
    amount_usdc_wei = int(amount_usd * 1_000_000)

    # Step 1: Get yield opportunities
    print("1️⃣ Fetching yield opportunities...")
    aggregator = YieldDataAggregator()
    opportunities = await aggregator.get_yield_opportunities(strategy)

    print(f"   Found {len(opportunities)} opportunities for {strategy} strategy:")
    for i, opp in enumerate(opportunities, 1):
        print(f"   {i}. {opp.protocol} on {opp.chain}")
        print(f"      💰 APY: {opp.apy:.2f}%")
        print(f"      ⚠️  Risk: {opp.riskScore}/100")
        print()

    # Step 2: Generate allocation plan
    print("2️⃣ Generating allocation plan...")

    if not opportunities:
        print("   ❌ No opportunities found for this strategy")
        return

    # Allocation logic based on strategy
    allocations = []
    if strategy == "conservative":
        # 100% to safest option
        allocations.append({
            "protocol": opportunities[0].protocol,
            "chain": opportunities[0].chain,
            "amount": amount_usdc_wei,
            "percentage": 100,
            "apy": opportunities[0].apy
        })
    elif strategy == "balanced":
        # 60/40 split between top 2
        if len(opportunities) >= 2:
            allocations.extend([
                {
                    "protocol": opportunities[0].protocol,
                    "chain": opportunities[0].chain,
                    "amount": int(amount_usdc_wei * 0.6),
                    "percentage": 60,
                    "apy": opportunities[0].apy
                },
                {
                    "protocol": opportunities[1].protocol,
                    "chain": opportunities[1].chain,
                    "amount": int(amount_usdc_wei * 0.4),
                    "percentage": 40,
                    "apy": opportunities[1].apy
                }
            ])
        else:
            allocations.append({
                "protocol": opportunities[0].protocol,
                "chain": opportunities[0].chain,
                "amount": amount_usdc_wei,
                "percentage": 100,
                "apy": opportunities[0].apy
            })
    else:  # aggressive
        # Split across top 3 (or available)
        percentages = [50, 30, 20]
        for i, opp in enumerate(opportunities[:3]):
            pct = percentages[i] if i < len(percentages) else 0
            if pct > 0:
                allocations.append({
                    "protocol": opp.protocol,
                    "chain": opp.chain,
                    "amount": int(amount_usdc_wei * pct / 100),
                    "percentage": pct,
                    "apy": opp.apy
                })

    # Display allocation plan
    print("   📋 Allocation Plan:")
    total_expected_apy = 0

    for alloc in allocations:
        amount_display = alloc["amount"] / 1_000_000
        print(f"   💰 ${amount_display:,.0f} ({alloc['percentage']}%) → {alloc['protocol']} on {alloc['chain']}")
        print(f"      📈 Expected APY: {alloc['apy']:.2f}%")
        total_expected_apy += alloc['apy'] * (alloc['percentage'] / 100)

    print(f"\n   🎯 Combined Expected APY: {total_expected_apy:.2f}%")
    print(f"   💵 Expected Annual Yield: ${(amount_usd * total_expected_apy / 100):,.0f}")
    print()

    # Step 3: Check cross-chain requirements
    print("3️⃣ Checking cross-chain requirements...")

    source_chain = "ethereum_sepolia"  # Assume user starts here
    cross_chain_needed = []

    for alloc in allocations:
        if alloc['chain'] != source_chain:
            cross_chain_needed.append(alloc)

    if cross_chain_needed:
        print(f"   🌉 Cross-chain transfers needed: {len(cross_chain_needed)}")

        for alloc in cross_chain_needed:
            amount_display = alloc["amount"] / 1_000_000
            route = cctp_engine.get_optimal_bridge_route(
                source_chain, alloc['chain'], alloc['amount']
            )

            print(f"   • ${amount_display:,.0f} → {alloc['chain']}")
            print(f"     Time: ~{route.get('estimated_time_minutes', 0)} minutes")
            print(f"     Cost: ~${route.get('estimated_cost_usd', 0):.2f}")
    else:
        print("   ✅ No cross-chain transfers needed")

    print()

    # Step 4: Execution summary
    print("4️⃣ Execution Summary:")
    print(f"   💼 Strategy: {strategy.title()}")
    print(f"   💰 Total Amount: ${amount_usd:,.0f}")
    print(f"   📊 Expected APY: {total_expected_apy:.2f}%")
    print(f"   🏦 Protocols Used: {len(allocations)}")
    print(f"   🌉 Chains Used: {len(set(alloc['chain'] for alloc in allocations))}")

    # Calculate expected daily/monthly yields
    daily_yield = (amount_usd * total_expected_apy / 100) / 365
    monthly_yield = daily_yield * 30

    print(f"   📅 Expected Daily Yield: ${daily_yield:.2f}")
    print(f"   📆 Expected Monthly Yield: ${monthly_yield:.2f}")

    return {
        "strategy": strategy,
        "amount": amount_usd,
        "expected_apy": total_expected_apy,
        "allocations": allocations,
        "daily_yield": daily_yield,
        "monthly_yield": monthly_yield
    }

async def compare_strategies(user_address: str, amount_usd: float):
    """Compare all three strategies"""
    print("🔍 STRATEGY COMPARISON")
    print("=" * 60)

    strategies = ["conservative", "balanced", "aggressive"]
    results = []

    for strategy in strategies:
        print(f"\n📊 Testing {strategy.upper()} Strategy:")
        print("-" * 30)
        result = await test_strategy(user_address, amount_usd, strategy)
        if result:
            results.append(result)

    # Comparison table
    print("\n📈 STRATEGY COMPARISON SUMMARY")
    print("=" * 60)
    print(f"{'Strategy':<12} {'APY':<8} {'Daily $':<10} {'Monthly $':<12} {'Protocols':<10}")
    print("-" * 60)

    for result in results:
        print(f"{result['strategy'].title():<12} "
              f"{result['expected_apy']:.1f}%{'':<4} "
              f"${result['daily_yield']:.2f}{'':<4} "
              f"${result['monthly_yield']:.0f}{'':<8} "
              f"{len(result['allocations'])}")

    return results

async def main():
    """Main test function"""
    print("🚀 CrossYield Strategy Test")
    print("=" * 60)

    # Test parameters
    test_user = "0x742d35Cc6634C0532925a3b8D7C0E0d1234567890"
    test_amount = 10000  # $10,000 USDC

    print(f"👤 Test User: {test_user}")
    print(f"💰 Test Amount: ${test_amount:,.0f} USDC")
    print()

    # Option 1: Test a specific strategy
    print("Choose test mode:")
    print("1. Test specific strategy")
    print("2. Compare all strategies")
    print("3. Quick balanced strategy test")

    # For demo, let's run comparison
    await compare_strategies(test_user, test_amount)

    print("\n✅ Strategy testing complete!")
    print("\n🚀 To deploy for real:")
    print("   1. Connect wallet to frontend")
    print("   2. Deposit USDC")
    print("   3. Choose strategy")
    print("   4. Let AI optimize!")

if __name__ == "__main__":
    asyncio.run(main())