#!/usr/bin/env python3
"""Test testnet attestation service"""

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

async def test_testnet_attestation():
    """Test testnet attestation service"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Testing testnet attestation for wallet: {account.address}")
    
    print("\n🔍 TESTING TESTNET ATTESTATION SERVICE")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    # Try different testnet endpoints
    testnet_endpoints = [
        # Sandbox endpoints
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}",
        
        # Testnet specific endpoints
        f"https://iris-api-testnet.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        f"https://iris-api-testnet.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}",
        
        # Alternative testnet endpoints
        f"https://testnet-iris-api.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        f"https://testnet-iris-api.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}",
        
        # Sepolia specific endpoints
        f"https://iris-api-sepolia.circle.com/v2/messages/{source_domain}?nonce={nonce}",
        f"https://iris-api-sepolia.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}",
    ]
    
    try:
        async with aiohttp.ClientSession() as session:
            for i, url in enumerate(testnet_endpoints, 1):
                print(f"\n🌐 TEST {i}: {url}")
                
                try:
                    async with session.get(url) as response:
                        print(f"   📊 Status: {response.status}")
                        
                        if response.status == 200:
                            response_text = await response.text()
                            print(f"   📊 Response: {response_text[:200]}...")
                            
                            try:
                                response_json = await response.json()
                                messages = response_json.get('messages', [])
                                
                                if messages:
                                    message = messages[0]
                                    attestation_hex = message.get('attestation')
                                    status = message.get('status')
                                    cctp_version = message.get('cctpVersion')
                                    
                                    print(f"   📊 Status: {status}")
                                    print(f"   📊 CCTP Version: {cctp_version}")
                                    print(f"   📊 Attestation: {attestation_hex[:50]}...")
                                    
                                    # Test this attestation
                                    success = await test_attestation_call(attestation_hex, burn_tx_hash)
                                    if success:
                                        print(f"   ✅ FOUND WORKING TESTNET ENDPOINT!")
                                        return url, response_json
                                else:
                                    print(f"   📊 No messages found")
                            except Exception as e:
                                print(f"   📊 JSON Parse Error: {e}")
                        else:
                            response_text = await response.text()
                            print(f"   📊 Response: {response_text}")
                
                except Exception as e:
                    print(f"   ❌ Error: {e}")
    
    except Exception as e:
        print(f"❌ Session Error: {e}")
    
    print(f"\n❌ No working testnet endpoint found")
    return None, None

async def test_attestation_call(attestation_hex, burn_tx_hash):
    """Test if attestation works with receiveMessage call"""
    
    try:
        # Initialize CCTP
        cctp = CCTPIntegration()
        
        # Get message from source chain
        message = await cctp._get_message("base_sepolia", burn_tx_hash)
        if not message:
            print(f"   ❌ Failed to get message")
            return False
        
        # Convert attestation
        attestation = bytes.fromhex(attestation_hex[2:])  # Remove 0x prefix
        
        # Test receiveMessage call
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        # Message Transmitter ABI
        message_transmitter_abi = [
            {
                "inputs": [
                    {"name": "message", "type": "bytes"},
                    {"name": "attestation", "type": "bytes"}
                ],
                "name": "receiveMessage",
                "outputs": [{"name": "success", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        message_transmitter = w3.eth.contract(
            address=w3.to_checksum_address(config.message_transmitter_address),
            abi=message_transmitter_abi
        )
        
        # Try to call receiveMessage
        try:
            result = message_transmitter.functions.receiveMessage(message, attestation).call()
            print(f"   ✅ receiveMessage call successful: {result}")
            return True
        except Exception as e:
            print(f"   ❌ receiveMessage call failed: {e}")
            return False
        
    except Exception as e:
        print(f"   ❌ Error testing attestation: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_testnet_attestation())