#!/usr/bin/env python3
"""Test if pool fetching is actually working"""

import asyncio
from src.apis.graph_integration import GraphIntegration

async def test_pool_fetching():
    """Test actual pool data fetching from working subgraphs"""

    print("🏊 Testing Pool Fetching from Working Subgraphs")
    print("=" * 50)

    async with GraphIntegration() as graph:

        # Test 1: Check if URLs are being generated correctly
        print("🔗 URL Generation Test:")
        test_cases = [
            ("uniswap_v3", "ethereum"),
            ("uniswap_v3", "base"),
            ("uniswap_v3", "arbitrum"),
            ("sushiswap", "ethereum"),  # Should use placeholder/fallback
        ]

        for protocol, chain in test_cases:
            url = graph._get_subgraph_url(chain, protocol)
            print(f"   {protocol}_{chain}: {url}")

        print()

        # Test 2: Try to fetch pools from Uniswap V3 Ethereum (should work)
        print("🦄 Testing Uniswap V3 Ethereum Pool Fetching:")
        try:
            pools = await graph.get_protocol_pools("uniswap_v3", "ethereum")
            print(f"   Found {len(pools)} pools")

            if pools:
                print("   ✅ Pool data structure:")
                pool = pools[0]
                print(f"      Pool Address: {pool.pool_address}")
                print(f"      Protocol: {pool.protocol}")
                print(f"      Chain: {pool.chain}")
                print(f"      Token0: {pool.token0_symbol}")
                print(f"      Token1: {pool.token1_symbol}")
                print(f"      TVL: ${pool.tvl_usd:,.2f}")
                print(f"      Volume 24h: ${pool.volume_24h:,.2f}")
                print(f"      APY: {pool.apy:.2f}%")
            else:
                print("   ⚠️ No pools returned - checking raw response...")

        except Exception as e:
            print(f"   ❌ Error: {e}")

        print()

        # Test 3: Check the GraphQL query being sent
        print("📝 Testing GraphQL Query Structure:")
        url = graph._get_subgraph_url("ethereum", "uniswap_v3")
        print(f"   Target URL: {url}")

        # Manual GraphQL test
        query = """
        query GetUniswapV3Pools {
            pools(first: 3, orderBy: totalValueLockedUSD, orderDirection: desc) {
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

        print(f"   Query: {query.strip()}")

        try:
            headers = {"Content-Type": "application/json"}
            async with graph.session.post(
                url,
                json={"query": query},
                headers=headers
            ) as response:
                print(f"   Response Status: {response.status}")
                data = await response.json()

                if response.status == 200:
                    if 'data' in data and 'pools' in data['data']:
                        pools_raw = data['data']['pools']
                        print(f"   ✅ Raw pools found: {len(pools_raw)}")

                        if pools_raw:
                            pool = pools_raw[0]
                            print(f"   📊 Sample pool:")
                            print(f"      ID: {pool.get('id', 'N/A')}")
                            print(f"      Token0: {pool.get('token0', {}).get('symbol', 'N/A')}")
                            print(f"      Token1: {pool.get('token1', {}).get('symbol', 'N/A')}")
                            print(f"      TVL: ${float(pool.get('totalValueLockedUSD', 0)):,.2f}")
                    else:
                        print(f"   ❌ No pools in response: {data}")

                elif 'errors' in data:
                    print(f"   ❌ GraphQL Error: {data['errors'][0].get('message', 'Unknown')}")
                else:
                    print(f"   ❌ Unexpected response: {data}")

        except Exception as e:
            print(f"   💥 Request failed: {e}")

        print()

        # Test 4: Try comprehensive protocol fetching
        print("🌐 Testing Comprehensive Protocol Fetching:")
        try:
            yield_data = await graph.get_all_protocols_yield_data("ethereum")
            print(f"   Protocols attempted: {len(yield_data)}")

            working_protocols = []
            failed_protocols = []

            for protocol, pools in yield_data.items():
                if pools:
                    working_protocols.append(f"{protocol} ({len(pools)} pools)")
                else:
                    failed_protocols.append(protocol)

            if working_protocols:
                print(f"   ✅ Working protocols: {', '.join(working_protocols)}")

            if failed_protocols:
                print(f"   ⚠️ No data protocols: {', '.join(failed_protocols)}")

        except Exception as e:
            print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_pool_fetching())