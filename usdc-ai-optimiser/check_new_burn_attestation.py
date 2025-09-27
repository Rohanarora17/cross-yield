#!/usr/bin/env python3
"""Check attestation for our successful burn transaction"""

import asyncio
import aiohttp
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def check_attestation():
    """Check if attestation is ready for our successful burn"""

    print("🔍 CHECKING ATTESTATION FOR SUCCESSFUL BURN")
    print("=" * 60)

    # Our successful burn transaction
    burn_tx = "d16204d78d7ee8d71e160f4e19f52b28932df4bbcb1391be2625810eb46ac2e3"
    source_chain = "base_sepolia"

    cctp = CCTPIntegration()
    source_domain = cctp._get_domain(source_chain)

    print(f"🔥 Burn TX: {burn_tx}")
    print(f"🔗 Source Chain: {source_chain}")
    print(f"📊 Source Domain: {source_domain}")
    print()

    # Circle API endpoints to try
    endpoints = [
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx}",
        f"https://iris-api-sandbox.circle.com/attestations/{burn_tx}",
        f"https://iris-api.circle.com/attestations/{burn_tx}",  # Try production too
    ]

    for i, url in enumerate(endpoints, 1):
        print(f"📡 Trying endpoint {i}:")
        print(f"   {url}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    print(f"   Status: {response.status}")

                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ SUCCESS! Response received:")

                        if 'messages' in data:
                            messages = data['messages']
                            print(f"      Messages found: {len(messages)}")

                            if messages:
                                msg = messages[0]
                                print(f"      Status: {msg.get('status', 'unknown')}")
                                print(f"      Source TX: {msg.get('sourceTransactionHash', 'unknown')}")

                                if msg.get('status') == 'complete':
                                    print(f"      🎯 ATTESTATION READY!")
                                    print(f"      Message: {msg.get('message', '')[:50]}...")
                                    print(f"      Attestation: {msg.get('attestation', '')[:50]}...")
                                    return msg
                                else:
                                    print(f"      ⏳ Status: {msg.get('status')} - Still processing")
                        else:
                            print(f"      Response: {str(data)[:200]}...")

                    elif response.status == 404:
                        print(f"   ⏳ Transaction not found (may still be processing)")
                    else:
                        text = await response.text()
                        print(f"   ⚠️ Error: {text[:100]}...")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

        print()

    print("💡 ATTESTATION STATUS:")
    print("   Transaction was successful (USDC burned)")
    print("   Attestation may take 10-20 minutes to be ready")
    print("   Check back in a few minutes")

    return None

if __name__ == "__main__":
    asyncio.run(check_attestation())