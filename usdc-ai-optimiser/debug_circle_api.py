#!/usr/bin/env python3
"""Debug Circle API responses in detail"""

import asyncio
import aiohttp
import json

async def debug_circle_api():
    """Debug Circle API responses in detail"""
    
    print("🔍 DEBUGGING CIRCLE API RESPONSES")
    print("=" * 50)
    
    # The latest burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
    
    print(f"🌐 URL: {url}")
    print(f"📊 Transaction: {burn_tx_hash}")
    print(f"🌐 Domain: {source_domain} (Base Sepolia)")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"\n📊 RESPONSE DETAILS:")
                print(f"   Status Code: {response.status}")
                print(f"   Headers: {dict(response.headers)}")
                
                # Get response text
                response_text = await response.text()
                print(f"\n📊 RESPONSE BODY:")
                print(f"   Raw Text: {response_text}")
                
                # Try to parse as JSON
                try:
                    if response_text:
                        response_json = await response.json()
                        print(f"\n📊 PARSED JSON:")
                        print(json.dumps(response_json, indent=2))
                    else:
                        print(f"\n📊 EMPTY RESPONSE BODY")
                except Exception as e:
                    print(f"\n📊 JSON PARSE ERROR: {e}")
                
                # Check different endpoints
                print(f"\n🔍 CHECKING ALTERNATIVE ENDPOINTS:")
                
                # Try without transactionHash parameter
                alt_url1 = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}"
                print(f"\n🌐 Alternative URL 1: {alt_url1}")
                try:
                    async with session.get(alt_url1) as alt_response:
                        print(f"   Status: {alt_response.status}")
                        alt_text = await alt_response.text()
                        print(f"   Response: {alt_text[:200]}...")
                except Exception as e:
                    print(f"   Error: {e}")
                
                # Try with different domain
                alt_url2 = f"https://iris-api-sandbox.circle.com/v2/messages/0?transactionHash={burn_tx_hash}"
                print(f"\n🌐 Alternative URL 2: {alt_url2}")
                try:
                    async with session.get(alt_url2) as alt_response:
                        print(f"   Status: {alt_response.status}")
                        alt_text = await alt_response.text()
                        print(f"   Response: {alt_text[:200]}...")
                except Exception as e:
                    print(f"   Error: {e}")
                
                # Try mainnet endpoint
                alt_url3 = f"https://iris-api.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
                print(f"\n🌐 Mainnet URL: {alt_url3}")
                try:
                    async with session.get(alt_url3) as alt_response:
                        print(f"   Status: {alt_response.status}")
                        alt_text = await alt_response.text()
                        print(f"   Response: {alt_text[:200]}...")
                except Exception as e:
                    print(f"   Error: {e}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_circle_api())