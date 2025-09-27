#!/usr/bin/env python3
"""Debug attestation length and format"""

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

async def debug_attestation_length():
    """Debug attestation length and format"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Debugging attestation length for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING ATTESTATION LENGTH")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?nonce={nonce}"
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = data.get('messages', [])
                    
                    print(f"📊 Found {len(messages)} messages")
                    
                    for i, message in enumerate(messages):
                        print(f"\n📝 Message {i+1}:")
                        attestation_hex = message.get('attestation')
                        
                        if attestation_hex:
                            # Remove 0x prefix and convert to bytes
                            attestation_bytes = bytes.fromhex(attestation_hex[2:])
                            
                            print(f"   Attestation hex length: {len(attestation_hex)} chars")
                            print(f"   Attestation bytes length: {len(attestation_bytes)} bytes")
                            print(f"   Attestation hex: {attestation_hex[:100]}...")
                            
                            # Test different attestation lengths
                            await test_attestation_lengths(attestation_bytes, burn_tx_hash)
                        else:
                            print(f"   No attestation found")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_attestation_lengths(attestation_bytes, burn_tx_hash):
    """Test different attestation lengths"""
    
    print(f"\n🧪 Testing Different Attestation Lengths:")
    
    try:
        # Initialize CCTP
        cctp = CCTPIntegration()
        
        # Get message from source chain
        message = await cctp._get_message("base_sepolia", burn_tx_hash)
        if not message:
            print("❌ Failed to get message")
            return
        
        print(f"   Message length: {len(message)} bytes")
        
        # Test different attestation lengths
        test_lengths = [
            len(attestation_bytes),  # Original length
            len(attestation_bytes) // 2,  # Half length
            len(attestation_bytes) * 2,  # Double length
            65,  # Standard signature length
            64,  # Alternative signature length
            32,  # Hash length
            96,  # Common attestation length
            128, # Another common length
        ]
        
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
        
        for test_length in test_lengths:
            try:
                # Create test attestation of this length
                if test_length <= len(attestation_bytes):
                    test_attestation = attestation_bytes[:test_length]
                else:
                    # Pad with zeros
                    test_attestation = attestation_bytes + b'\x00' * (test_length - len(attestation_bytes))
                
                print(f"   Testing length {test_length}: {len(test_attestation)} bytes")
                
                # Try to call receiveMessage
                result = message_transmitter.functions.receiveMessage(message, test_attestation).call()
                print(f"   ✅ Length {test_length}: SUCCESS! {result}")
                
            except Exception as e:
                error_msg = str(e)
                if "Invalid attestation length" in error_msg:
                    print(f"   ❌ Length {test_length}: Invalid attestation length")
                elif "Invalid signature" in error_msg:
                    print(f"   ⚠️ Length {test_length}: Invalid signature (length OK)")
                else:
                    print(f"   ❌ Length {test_length}: {error_msg}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_attestation_length())