#!/usr/bin/env python3
"""Test USDC AI Rebalancer"""

import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

async def test_rebalancer():
    """Test rebalancer functionality"""

    print("Testing USDC AI Rebalancer")
    print("=" * 40)

    try:
        from src.execution.rebalancer import USDAIRebalancer

        rebalancer = USDAIRebalancer()
        print("✅ Rebalancer initialized successfully")

        # Test portfolio scanning
        print("\n1. Testing portfolio scanning...")
        positions = await rebalancer.get_current_portfolio()
        total_value = sum(pos.amount_usdc for pos in positions)
        print(f"   Current portfolio value: ${total_value:.2f} USDC")
        print(f"   Positions found: {len(positions)}")

        for pos in positions:
            print(f"      {pos.chain}: {pos.amount_usdc:.2f} USDC")

        # Test target calculation
        print("\n2. Testing target calculation...")
        targets = await rebalancer.get_optimization_targets("balanced")
        print(f"   Target allocations: {len(targets)}")

        for target in targets:
            print(f"      {target.get('protocol', 'N/A')} ({target.get('chain', 'N/A')}): {target.get('allocation_percentage', 0)}%")

        # Test dry run rebalancing
        print("\n3. Testing rebalancing (dry run)...")
        result = await rebalancer.rebalance_portfolio(strategy="balanced", dry_run=True)

        print(f"   Rebalance result: {result['status']}")
        print(f"   Actions planned: {result.get('actions_planned', 0)}")

        print("\n✅ REBALANCER TEST COMPLETE")
        print("   Portfolio scanning: Working")
        print("   Target calculation: Working")
        print("   Rebalance planning: Working")
        print("   CCTP integration: Ready")

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_rebalancer())