#!/usr/bin/env python3
"""Debug Circle API response to understand message format"""

import asyncio
import aiohttp
import json

async def debug_circle_response():
    """Debug Circle API response to understand message format"""
    
    print("🔍 DEBUGGING CIRCLE API RESPONSE")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={nonce}"
    
    print(f"🌐 URL: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = data.get('messages', [])
                    
                    print(f"📊 Found {len(messages)} messages")
                    
                    for i, message in enumerate(messages):
                        print(f"\n📝 Message {i+1} Details:")
                        print(f"   Status: {message.get('status')}")
                        print(f"   Event Nonce: {message.get('eventNonce')}")
                        print(f"   CCTP Version: {message.get('cctpVersion')}")
                        print(f"   Message: {message.get('message')}")
                        print(f"   Attestation: {message.get('attestation', 'None')[:50]}...")
                        print(f"   Decoded Message: {message.get('decodedMessage')}")
                        print(f"   Delay Reason: {message.get('delayReason')}")
                        
                        # Check if there are other fields
                        print(f"   All fields: {list(message.keys())}")
                        
                        # Look for alternative message fields
                        for key, value in message.items():
                            if 'message' in key.lower() and value is not None:
                                print(f"   Found message field '{key}': {value}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_circle_response())