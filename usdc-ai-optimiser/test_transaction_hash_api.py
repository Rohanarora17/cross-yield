#!/usr/bin/env python3
"""Test API with transactionHash parameter"""

import asyncio
import aiohttp
import json

async def test_transaction_hash_api():
    """Test API with transactionHash parameter"""
    
    print("🔍 TESTING API WITH TRANSACTION HASH")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    # Test with transactionHash
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
    print(f"🌐 URL: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"📊 Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"📊 Response: {json.dumps(data, indent=2)}")
                    
                    messages = data.get('messages', [])
                    if messages:
                        message = messages[0]
                        print(f"\n📝 Message Details:")
                        print(f"   Status: {message.get('status')}")
                        print(f"   Message: {message.get('message')}")
                        print(f"   Attestation: {message.get('attestation', 'None')[:50]}...")
                        
                        if message.get('message'):
                            print(f"   ✅ Message is available!")
                        else:
                            print(f"   ❌ Message is null")
                else:
                    response_text = await response.text()
                    print(f"📊 Response: {response_text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_transaction_hash_api())