#!/usr/bin/env python3
"""Test Circle API with nonce parameter"""

import asyncio
import aiohttp
import json
import os
import sys
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from apis.cctp_integration import CCTPIntegration

# Load environment variables
load_dotenv()

async def test_nonce_api():
    """Test Circle API with nonce parameter"""
    
    print("🔍 TESTING CIRCLE API WITH NONCE")
    print("=" * 50)
    
    # The latest burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    try:
        # Get nonce from transaction
        cctp = CCTPIntegration()
        config = cctp.chain_configs["base_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        # Get transaction to find nonce
        tx = w3.eth.get_transaction(burn_tx_hash)
        print(f"📊 Transaction Nonce: {tx.nonce}")
        print(f"📊 Transaction Hash: {burn_tx_hash}")
        print(f"📊 Transaction From: {tx['from']}")
        print(f"📊 Transaction To: {tx['to']}")
        
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
                elif response.status == 404:
                    print(f"   ⏳ Still processing (404 is normal)")
                else:
                    print(f"   ⚠️ Unexpected status: {response.status}")
        
        # Also try with transactionHash but check if there's a format issue
        print(f"\n🔍 CHECKING TRANSACTION HASH FORMAT")
        print("=" * 50)
        
        # Check if transaction hash needs to be formatted differently
        tx_hash_variations = [
            burn_tx_hash,  # Original
            burn_tx_hash.lower(),  # Lowercase
            burn_tx_hash.upper(),  # Uppercase
            burn_tx_hash[2:],  # Without 0x
            f"0x{burn_tx_hash[2:].upper()}",  # Uppercase with 0x
        ]
        
        for i, tx_hash_var in enumerate(tx_hash_variations):
            url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={tx_hash_var}"
            print(f"\n🌐 Variation {i+1}: {url}")
            
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
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    print(f"\n❌ No correct API format found")
    return None, None

if __name__ == "__main__":
    asyncio.run(test_nonce_api())