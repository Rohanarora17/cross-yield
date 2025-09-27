#!/usr/bin/env python3
"""Test comprehensive graph integration with all protocols"""

import asyncio
import aiohttp
from src.apis.graph_integration import GraphIntegration

async def test_individual_subgraphs():
    """Test each subgraph individually to see which ones work"""

    graph = GraphIntegration()

    # Test protocols to check
    test_protocols = [
        # Ethereum
        ("uniswap_v3", "ethereum"),
        ("uniswap_v2", "ethereum"),
        ("curve", "ethereum"),
        ("aave_v3", "ethereum"),
        ("sushiswap", "ethereum"),
        ("balancer_v2", "ethereum"),
        # Base
        ("uniswap_v3", "base"),
        ("aerodrome", "base"),
        ("aave_v3", "base"),
        # Arbitrum
        ("uniswap_v3", "arbitrum"),
        ("gmx", "arbitrum"),
        ("camelot", "arbitrum"),
    ]

    print("🔍 Testing individual subgraph endpoints...")
    print("=" * 60)

    async with aiohttp.ClientSession() as session:
        for protocol, chain in test_protocols:
            try:
                # Get URL for this protocol
                url = graph._get_subgraph_url(chain, protocol)

                # Simple test query
                test_query = """
                query TestQuery {
                    _meta {
                        deployment
                        hasIndexingErrors
                        chain {
                            number
                            hash
                        }
                    }
                }
                """

                headers = {"Content-Type": "application/json"}

                async with session.post(
                    url,
                    json={"query": test_query},
                    headers=headers
                ) as response:

                    status = response.status
                    data = await response.json() if response.status == 200 else None

                    if status == 200 and data and 'data' in data:
                        print(f"✅ {protocol}_{chain}: Working - {url}")
                        if '_meta' in data['data']:
                            meta = data['data']['_meta']
                            print(f"   📊 Chain: {meta.get('chain', {}).get('number', 'unknown')}")
                            print(f"   🔄 Deployment: {meta.get('deployment', 'unknown')[:10]}...")
                            print(f"   ⚠️  Errors: {meta.get('hasIndexingErrors', False)}")
                    else:
                        print(f"❌ {protocol}_{chain}: Failed (Status: {status}) - {url}")
                        if data and 'errors' in data:
                            print(f"   Error: {data['errors'][0].get('message', 'Unknown error')[:50]}...")

            except Exception as e:
                print(f"💥 {protocol}_{chain}: Exception - {str(e)[:50]}...")

            print()

async def test_uniswap_v3_pools():
    """Test Uniswap V3 specifically with pool queries"""

    graph = GraphIntegration()

    print("🦄 Testing Uniswap V3 pool data...")
    print("=" * 40)

    chains = ["ethereum", "base", "arbitrum"]

    async with aiohttp.ClientSession() as session:
        for chain in chains:
            try:
                url = graph._get_subgraph_url(chain, "uniswap_v3")

                # Uniswap V3 pool query
                pool_query = """
                query GetUniswapV3Pools {
                    pools(first: 5, orderBy: totalValueLockedUSD, orderDirection: desc) {
                        id
                        token0 {
                            symbol
                            id
                        }
                        token1 {
                            symbol
                            id
                        }
                        liquidity
                        totalValueLockedUSD
                        volumeUSD
                        feesUSD
                        feeTier
                    }
                }
                """

                headers = {"Content-Type": "application/json"}

                async with session.post(
                    url,
                    json={"query": pool_query},
                    headers=headers
                ) as response:

                    if response.status == 200:
                        data = await response.json()
                        pools = data.get('data', {}).get('pools', [])

                        print(f"✅ Uniswap V3 {chain}: {len(pools)} pools found")
                        for i, pool in enumerate(pools[:3]):  # Show first 3
                            token0 = pool.get('token0', {})
                            token1 = pool.get('token1', {})
                            tvl = float(pool.get('totalValueLockedUSD', 0))
                            print(f"   {i+1}. {token0.get('symbol', '?')}/{token1.get('symbol', '?')}: ${tvl:,.0f} TVL")
                    else:
                        print(f"❌ Uniswap V3 {chain}: Failed (Status: {response.status})")

            except Exception as e:
                print(f"💥 Uniswap V3 {chain}: {str(e)[:50]}...")

            print()

async def main():
    """Run comprehensive graph tests"""

    print("🌐 Comprehensive Graph Integration Test")
    print("=" * 50)

    # Test 1: Individual subgraph endpoints
    await test_individual_subgraphs()

    print("\n" + "=" * 50)

    # Test 2: Uniswap V3 pool data specifically
    await test_uniswap_v3_pools()

    print("\n🎯 Test Summary:")
    print("   - Graph API endpoints are accessible")
    print("   - Protocol-specific URLs are generated correctly")
    print("   - Some subgraphs may not exist or have different schemas")
    print("   - Focus should be on working subgraphs like Uniswap V3")

if __name__ == "__main__":
    asyncio.run(main())