#!/usr/bin/env python3
"""Check Circle API directly"""

import asyncio
import aiohttp

async def check_circle_api():
    """Check Circle API directly"""
    
    print("🔍 Checking Circle API Directly")
    print("=" * 40)
    
    # The transaction hash from our burn
    burn_tx_hash = "fac103ecaf37ab551f45b4c895e9a3e05b244c7a7e921fa483e01bf18bc4d840"
    source_domain = 6  # Base Sepolia domain
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
    
    print(f"🌐 URL: {url}")
    print(f"📊 Transaction: {burn_tx_hash}")
    print(f"🌐 Domain: {source_domain} (Base Sepolia)")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"\n📊 Response Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"📊 Response Data: {data}")
                    
                    messages = data.get('messages', [])
                    if messages:
                        message = messages[0]
                        print(f"\n📝 Message Status: {message.get('status')}")
                        print(f"📝 Message Hash: {message.get('messageHash')}")
                        print(f"📝 Attestation: {message.get('attestation', 'Not ready')}")
                        
                        if message.get('status') == 'complete':
                            print("✅ Attestation is ready!")
                        else:
                            print("⏳ Attestation still processing...")
                    else:
                        print("❌ No messages found")
                        
                elif response.status == 404:
                    print("⏳ Transaction not found yet - still processing")
                else:
                    print(f"❌ Error: {response.status}")
                    text = await response.text()
                    print(f"📊 Error text: {text}")
                    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_circle_api())