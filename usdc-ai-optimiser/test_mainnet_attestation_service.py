#!/usr/bin/env python3
"""Test mainnet attestation service with testnet contracts"""

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

async def test_mainnet_attestation_service():
    """Test mainnet attestation service with testnet contracts"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Testing mainnet attestation service for wallet: {account.address}")
    
    print("\n🔍 TESTING MAINNET ATTESTATION SERVICE")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    # Try mainnet attestation service
    mainnet_url = f"https://iris-api.circle.com/v2/messages/{source_domain}?nonce={nonce}"
    print(f"🌐 Mainnet URL: {mainnet_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(mainnet_url) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = data.get('messages', [])
                    
                    if messages:
                        message_data = messages[0]
                        attestation_hex = message_data.get('attestation')
                        
                        if attestation_hex:
                            attestation = bytes.fromhex(attestation_hex[2:])
                            print(f"✅ Mainnet attestation: {len(attestation)} bytes")
                            print(f"   Status: {message_data.get('status')}")
                            print(f"   CCTP Version: {message_data.get('cctpVersion')}")
                            
                            # Get message from source chain
                            message = await cctp._get_message("base_sepolia", burn_tx_hash)
                            if message:
                                print(f"✅ Message: {len(message)} bytes")
                                
                                # Test with mainnet attestation
                                success = await test_mainnet_attestation(message, attestation)
                                if success:
                                    print(f"🎉 SUCCESS! Mainnet attestation works!")
                                    return True
                                else:
                                    print(f"❌ Mainnet attestation also failed")
                            else:
                                print("❌ Failed to get message")
                        else:
                            print("❌ No attestation in mainnet response")
                    else:
                        print("❌ No messages in mainnet response")
                else:
                    print(f"❌ Mainnet API error: {response.status}")
                    response_text = await response.text()
                    print(f"📊 Response: {response_text}")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    
    return False

async def test_mainnet_attestation(message, attestation):
    """Test mainnet attestation with testnet contracts"""
    
    print(f"\n🧪 Testing Mainnet Attestation:")
    
    try:
        # Initialize CCTP
        cctp = CCTPIntegration()
        
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
        
        # Test with mainnet attestation
        try:
            result = message_transmitter.functions.receiveMessage(message, attestation).call()
            print(f"   ✅ Mainnet attestation: SUCCESS! {result}")
            return True
        except Exception as e:
            error_msg = str(e)
            print(f"   ❌ Mainnet attestation: {error_msg}")
            
            if "Invalid signature" in error_msg:
                print(f"   🔍 Mainnet attestation also has signature issues")
            elif "Invalid attestation length" in error_msg:
                print(f"   🔍 Mainnet attestation has length issues")
            
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_mainnet_attestation_service())