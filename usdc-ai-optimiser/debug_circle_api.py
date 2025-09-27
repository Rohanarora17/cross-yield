#!/usr/bin/env python3
"""Debug Circle API calls to understand the correct format"""

import asyncio
import aiohttp
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def debug_circle_api():
    """Debug Circle API to find correct endpoint format"""

    print("🔍 DEBUGGING CIRCLE API CALLS")
    print("=" * 60)

    # Our successful burn transaction
    burn_tx = "d16204d78d7ee8d71e160f4e19f52b28932df4bbcb1391be2625810eb46ac2e3"
    source_chain = "base_sepolia"

    cctp = CCTPIntegration()

    # Circle's domain mapping from their repo
    CIRCLE_DOMAINS = {
        "ethereum_sepolia": 0,
        "avalanche_fuji": 1,
        "base_sepolia": 6,
        "arbitrum_sepolia": 3,
        "optimism_sepolia": 2,
    }

    source_domain = CIRCLE_DOMAINS[source_chain]

    print(f"🔥 Burn TX: {burn_tx}")
    print(f"🔗 Source Chain: {source_chain}")
    print(f"📊 Source Domain: {source_domain}")
    print()

    # Test different API endpoint formats from Circle's repo
    iris_api_url = "https://iris-api-sandbox.circle.com"

    test_endpoints = [
        # Format from Circle's GitHub repo - line 566
        f"{iris_api_url}/v2/messages/{source_domain}?transactionHash={burn_tx}",
        f"{iris_api_url}/v2/messages/{source_domain}?transactionHash=0x{burn_tx}",

        # Alternative formats to test
        f"{iris_api_url}/attestations/{burn_tx}",
        f"{iris_api_url}/attestations/0x{burn_tx}",
        f"{iris_api_url}/v1/messages/{source_domain}?transactionHash={burn_tx}",
        f"{iris_api_url}/v1/messages/{source_domain}?transactionHash=0x{burn_tx}",

        # Production API
        f"https://iris-api.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx}",
        f"https://iris-api.circle.com/attestations/{burn_tx}",
    ]

    for i, url in enumerate(test_endpoints, 1):
        print(f"📡 Testing endpoint {i}:")
        print(f"   {url}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    print(f"   Status: {response.status}")

                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ SUCCESS! Response received:")

                        if 'messages' in data:
                            messages = data.get('messages', [])
                            print(f"      Messages count: {len(messages)}")

                            if messages:
                                msg = messages[0]
                                status = msg.get('status', 'unknown')
                                print(f"      Status: {status}")
                                print(f"      Source TX: {msg.get('sourceTransactionHash', 'N/A')}")

                                if status == 'complete':
                                    print(f"      🎯 ATTESTATION READY!")
                                elif status == 'pending':
                                    print(f"      ⏳ PENDING - still processing")
                                else:
                                    print(f"      ❓ Unknown status: {status}")
                        else:
                            # Check for other response formats
                            print(f"      Response keys: {list(data.keys())}")
                            print(f"      Data: {str(data)[:200]}...")

                    elif response.status == 404:
                        print(f"   ⏳ 404 - Transaction not found")
                    else:
                        text = await response.text()
                        print(f"   ⚠️ Error {response.status}: {text[:100]}...")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

        print()

    # Also test with some older burn transactions to see format
    print("🔄 TESTING WITH PREVIOUS BURN TRANSACTIONS")
    print("-" * 40)

    older_burns = [
        "ce9e6bc409ac6405544350811fb8a8badf2fb0916728353ba9a050799cdab9e2",
        "09fdb1144d6bdc8e61578042306df42589db436d9869b4b447c2e0638f4100e5"
    ]

    for burn in older_burns[:1]:  # Test just one
        print(f"Testing older burn: {burn}")
        url = f"{iris_api_url}/v2/messages/{source_domain}?transactionHash={burn}"

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    print(f"   Status: {response.status}")
                    if response.status == 200:
                        data = await response.json()
                        print(f"   Found data: {str(data)[:100]}...")
                    else:
                        print(f"   No data found")
        except Exception as e:
            print(f"   Error: {e}")
        print()

if __name__ == "__main__":
    asyncio.run(debug_circle_api())