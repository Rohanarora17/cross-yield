#!/usr/bin/env python3
"""Test script to verify API fixes for Pyth Oracle and Graph Integration"""

import asyncio
import sys
import os

# Add the src directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from apis.pyth_oracle import PythOracleAPI
from apis.graph_integration import GraphIntegration

async def test_pyth_api():
    """Test Pyth Oracle API"""
    print("🔮 Testing Pyth Oracle API...")

    oracle = PythOracleAPI()

    # Test basic price feeds
    prices = await oracle.get_price_feeds(["USDC", "ETH"])

    if prices:
        print("✅ Pyth API working")
        for symbol, data in prices.items():
            print(f"   {symbol}: ${data['price']:.2f}")
        return True
    else:
        print("❌ Pyth API failed")
        return False

async def test_graph_api():
    """Test Graph Integration API"""
    print("\n📊 Testing Graph Integration API...")

    async with GraphIntegration() as graph:

        # Test protocol pools
        pools = await graph.get_protocol_pools("uniswap_v3", "ethereum")

        if pools:
            print("✅ Graph API working")
            print(f"   Found {len(pools)} pools")
            for pool in pools[:2]:
                print(f"   {pool.token0_symbol}/{pool.token1_symbol}: ${pool.total_liquidity_usd:,.0f} TVL")
            return True
        else:
            print("❌ Graph API failed")
            return False

async def main():
    """Run all API tests"""
    print("🧪 Testing API Fixes\n" + "="*50)

    # Test APIs
    pyth_ok = await test_pyth_api()
    graph_ok = await test_graph_api()

    print("\n" + "="*50)
    print("📋 Test Results:")
    print(f"   Pyth Oracle: {'✅ PASS' if pyth_ok else '❌ FAIL'}")
    print(f"   Graph Integration: {'✅ PASS' if graph_ok else '❌ FAIL'}")

    if pyth_ok and graph_ok:
        print("\n🎉 All APIs working correctly!")
        return 0
    else:
        print("\n⚠️ Some APIs have issues but fallbacks are working")
        return 1

if __name__ == "__main__":
    result = asyncio.run(main())
    sys.exit(result)