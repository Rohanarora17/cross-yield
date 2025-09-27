#!/usr/bin/env python3
"""Fix attestation handling"""

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

async def fix_attestation():
    """Fix attestation handling"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Fixing attestation for wallet: {account.address}")
    
    print("\n🔧 FIXING ATTESTATION HANDLING")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={nonce}"
    
    print(f"🌐 Getting attestation from: {url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = data.get('messages', [])
                    
                    print(f"📊 Found {len(messages)} messages")
                    
                    for i, message in enumerate(messages):
                        print(f"\n📝 Message {i+1}:")
                        print(f"   Status: {message.get('status')}")
                        print(f"   Event Nonce: {message.get('eventNonce')}")
                        print(f"   CCTP Version: {message.get('cctpVersion')}")
                        print(f"   Attestation: {message.get('attestation', 'None')[:50]}...")
                        print(f"   Message: {message.get('message', 'None')}")
                        print(f"   Decoded Message: {message.get('decodedMessage', 'None')}")
                        print(f"   Delay Reason: {message.get('delayReason', 'None')}")
                    
                    # Try using the first message
                    if messages:
                        first_message = messages[0]
                        attestation_hex = first_message.get('attestation')
                        
                        if attestation_hex:
                            print(f"\n🔧 Using first attestation:")
                            print(f"   Length: {len(attestation_hex)} chars")
                            print(f"   Hex: {attestation_hex[:100]}...")
                            
                            # Test the attestation
                            await test_attestation(attestation_hex, burn_tx_hash)
                        
                        # Try using the second message if available
                        if len(messages) > 1:
                            second_message = messages[1]
                            attestation_hex_2 = second_message.get('attestation')
                            
                            if attestation_hex_2:
                                print(f"\n🔧 Using second attestation:")
                                print(f"   Length: {len(attestation_hex_2)} chars")
                                print(f"   Hex: {attestation_hex_2[:100]}...")
                                
                                # Test the second attestation
                                await test_attestation(attestation_hex_2, burn_tx_hash)
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_attestation(attestation_hex, burn_tx_hash):
    """Test a specific attestation"""
    
    print(f"\n🧪 Testing attestation...")
    
    try:
        # Initialize CCTP
        cctp = CCTPIntegration()
        
        # Get message from source chain
        message = await cctp._get_message("base_sepolia", burn_tx_hash)
        if not message:
            print(f"❌ Failed to get message")
            return
        
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
            print(f"✅ receiveMessage call successful: {result}")
            return True
        except Exception as e:
            print(f"❌ receiveMessage call failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Error testing attestation: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(fix_attestation())