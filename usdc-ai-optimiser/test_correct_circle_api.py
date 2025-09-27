#!/usr/bin/env python3
"""Test Circle API with correct format"""

import asyncio
import aiohttp
import json

async def test_correct_circle_api():
    """Test Circle API with correct format"""
    
    print("🔍 TESTING CORRECT CIRCLE API FORMAT")
    print("=" * 50)
    
    # The latest burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    # Try different API formats based on Circle documentation
    urls_to_test = [
        # Format 1: With transactionHash parameter
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}",
        
        # Format 2: With txHash parameter (alternative naming)
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?txHash={burn_tx_hash}",
        
        # Format 3: With hash parameter
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?hash={burn_tx_hash}",
        
        # Format 4: Direct message endpoint
        f"https://iris-api-sandbox.circle.com/v2/messages/{burn_tx_hash}",
        
        # Format 5: With different domain format
        f"https://iris-api-sandbox.circle.com/v2/messages?domain={source_domain}&transactionHash={burn_tx_hash}",
        
        # Format 6: Check if we need to use nonce instead
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}",
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            for i, url in enumerate(urls_to_test, 1):
                print(f"\n🌐 TEST {i}: {url}")
                
                try:
                    async with session.get(url) as response:
                        print(f"   📊 Status: {response.status}")
                        
                        response_text = await response.text()
                        print(f"   📊 Response: {response_text}")
                        
                        if response.status == 200:
                            try:
                                response_json = await response.json()
                                print(f"   📊 Parsed JSON:")
                                print(json.dumps(response_json, indent=2))
                                
                                # Check for expected fields
                                if 'messages' in response_json:
                                    messages = response_json['messages']
                                    if messages:
                                        message = messages[0]
                                        status = message.get('status')
                                        print(f"   🎯 MESSAGE STATUS: {status}")
                                        
                                        if status in ['pending', 'complete', 'failed']:
                                            print(f"   ✅ FOUND CORRECT API FORMAT!")
                                            return url, response_json
                            except Exception as e:
                                print(f"   📊 JSON Parse Error: {e}")
                        
                except Exception as e:
                    print(f"   ❌ Error: {e}")
    
    except Exception as e:
        print(f"❌ Session Error: {e}")
    
    print(f"\n❌ No correct API format found")
    return None, None

async def test_with_nonce():
    """Test with nonce parameter"""
    
    print(f"\n🔍 TESTING WITH NONCE PARAMETER")
    print("=" * 50)
    
    # We need to get the nonce from our burn transaction
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6
    
    # Try to get nonce from transaction
    try:
        from web3 import Web3
        from apis.cctp_integration import CCTPIntegration
        
        cctp = CCTPIntegration()
        config = cctp.chain_configs["base_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        # Get transaction receipt to find nonce
        tx_receipt = w3.eth.get_transaction_receipt(burn_tx_hash)
        print(f"📊 Transaction Receipt: {tx_receipt}")
        
        # Try to get nonce from transaction
        tx = w3.eth.get_transaction(burn_tx_hash)
        print(f"📊 Transaction Nonce: {tx.nonce}")
        
        # Try API with nonce
        url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={tx.nonce}"
        print(f"\n🌐 Testing with nonce: {url}")
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"   📊 Status: {response.status}")
                response_text = await response.text()
                print(f"   📊 Response: {response_text}")
                
                if response.status == 200:
                    try:
                        response_json = await response.json()
                        print(f"   📊 Parsed JSON:")
                        print(json.dumps(response_json, indent=2))
                        return url, response_json
                    except Exception as e:
                        print(f"   📊 JSON Parse Error: {e}")
        
    except Exception as e:
        print(f"❌ Nonce test error: {e}")
        import traceback
        traceback.print_exc()
    
    return None, None

if __name__ == "__main__":
    asyncio.run(test_correct_circle_api())
    asyncio.run(test_with_nonce())