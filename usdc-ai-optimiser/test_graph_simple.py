#!/usr/bin/env python3
"""Simple test to verify Graph API connectivity"""

import asyncio
import aiohttp
import json

async def test_graph_api():
    """Test basic Graph API connectivity"""
    
    # Test with a simple query
    query = """
    query {
        pools(first: 5) {
            id
        }
    }
    """
    
    urls = [
        "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
        "https://api.thegraph.com/subgraphs/name/curvefi/curve",
        "https://api.thegraph.com/subgraphs/name/aave/protocol-v3"
    ]
    
    async with aiohttp.ClientSession() as session:
        for url in urls:
            print(f"\n🔍 Testing: {url}")
            try:
                async with session.post(url, json={"query": query}) as response:
                    if response.status == 200:
                        data = await response.json()
                        pools = data.get("data", {}).get("pools", [])
                        print(f"   ✅ Status: {response.status}")
                        print(f"   📊 Pools found: {len(pools)}")
                        if pools:
                            print(f"   🏊 Sample pool: {pools[0]['id']}")
                    else:
                        print(f"   ❌ Status: {response.status}")
                        error_text = await response.text()
                        print(f"   Error: {error_text[:200]}...")
            except Exception as e:
                print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_graph_api())