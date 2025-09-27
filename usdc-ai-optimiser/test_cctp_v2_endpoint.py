#!/usr/bin/env python3
"""Test CCTP V2 endpoint"""

import asyncio
import aiohttp
import json

async def test_cctp_v2_endpoint():
    """Test CCTP V2 endpoint"""
    
    print("🔍 TESTING CCTP V2 ENDPOINT")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    # Try different endpoints
    endpoints_to_test = [
        # V2 endpoints
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        f"https://iris-api.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        
        # V1 endpoints (if they exist)
        f"https://iris-api-sandbox.circle.com/v1/messages/{source_domain}?nonce={nonce}",
        f"https://iris-api.circle.com/v1/messages/{source_domain}?nonce={nonce}",
        
        # Alternative V2 endpoints
        f"https://iris-api-sandbox.circle.com/v2/attestations/{source_domain}?nonce={nonce}",
        f"https://iris-api-sandbox.circle.com/v2/attestations/{source_domain}?transactionHash={burn_tx_hash}",
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            for i, url in enumerate(endpoints_to_test, 1):
                print(f"\n🌐 TEST {i}: {url}")
                
                try:
                    async with session.get(url) as response:
                        print(f"   📊 Status: {response.status}")
                        
                        if response.status == 200:
                            response_text = await response.text()
                            print(f"   📊 Response: {response_text[:200]}...")
                            
                            try:
                                response_json = await response.json()
                                print(f"   📊 Parsed JSON:")
                                print(json.dumps(response_json, indent=2))
                                
                                # Check for CCTP version
                                if 'messages' in response_json:
                                    messages = response_json['messages']
                                    if messages:
                                        message = messages[0]
                                        cctp_version = message.get('cctpVersion')
                                        print(f"   🎯 CCTP Version: {cctp_version}")
                                        
                                        if cctp_version == 2:
                                            print(f"   ✅ FOUND CCTP V2!")
                                            return url, response_json
                            except Exception as e:
                                print(f"   📊 JSON Parse Error: {e}")
                        else:
                            response_text = await response.text()
                            print(f"   📊 Response: {response_text}")
                
                except Exception as e:
                    print(f"   ❌ Error: {e}")
    
    except Exception as e:
        print(f"❌ Session Error: {e}")
    
    print(f"\n❌ No CCTP V2 endpoint found")
    return None, None

if __name__ == "__main__":
    asyncio.run(test_cctp_v2_endpoint())