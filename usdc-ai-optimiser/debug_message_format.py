#!/usr/bin/env python3
"""Debug message format mismatch"""

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

async def debug_message_format():
    """Debug message format mismatch"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Debugging message format for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING MESSAGE FORMAT")
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
                    
                    if messages:
                        message_data = messages[0]
                        attestation_hex = message_data.get('attestation')
                        
                        if attestation_hex:
                            attestation = bytes.fromhex(attestation_hex[2:])
                            print(f"✅ Attestation: {len(attestation)} bytes")
                            
                            # Get message from source chain
                            message = await cctp._get_message("base_sepolia", burn_tx_hash)
                            if message:
                                print(f"✅ Message from logs: {len(message)} bytes")
                                print(f"   Message hex: {message.hex()}")
                                
                                # Try to decode the message to see its structure
                                await decode_message_structure(message)
                                
                                # Test with the attestation
                                await test_message_attestation_combination(message, attestation)
                            else:
                                print("❌ Failed to get message from logs")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def decode_message_structure(message):
    """Decode message structure"""
    
    print(f"\n🔍 Decoding Message Structure:")
    print(f"   Message length: {len(message)} bytes")
    
    try:
        # Try to decode the message structure
        # CCTP messages typically contain:
        # - Source domain (4 bytes)
        # - Destination domain (4 bytes)  
        # - Nonce (8 bytes)
        # - Source token messenger (32 bytes)
        # - Destination token messenger (32 bytes)
        # - Amount (32 bytes)
        # - Recipient (32 bytes)
        
        if len(message) >= 32:
            # Try to extract fields
            offset = 0
            
            # First 32 bytes might be source domain + destination domain + nonce
            first_32 = message[offset:offset+32]
            print(f"   First 32 bytes: {first_32.hex()}")
            
            # Next 32 bytes
            if len(message) >= 64:
                second_32 = message[offset+32:offset+64]
                print(f"   Next 32 bytes: {second_32.hex()}")
            
            # Check if this looks like a CCTP message
            # Look for domain values (3 for Arbitrum Sepolia, 6 for Base Sepolia)
            if b'\x00\x00\x00\x06' in message:  # Base Sepolia domain
                print(f"   ✅ Contains Base Sepolia domain (6)")
            if b'\x00\x00\x00\x03' in message:  # Arbitrum Sepolia domain
                print(f"   ✅ Contains Arbitrum Sepolia domain (3)")
            
            # Look for amount (should be 1 USDC = 1000000 = 0x0F4240)
            if b'\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x0f\x42\x40' in message:
                print(f"   ✅ Contains 1 USDC amount (0x0F4240)")
            
            # Look for our address
            if b'\xceT\xcfZ\r\xe3\x840\x11\xcf 8\x9c\x1bjJ\xacD-j' in message:
                print(f"   ✅ Contains our address")
        
    except Exception as e:
        print(f"   ❌ Error decoding message: {e}")

async def test_message_attestation_combination(message, attestation):
    """Test message and attestation combination"""
    
    print(f"\n🧪 Testing Message + Attestation Combination:")
    
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
        
        # Test with original message and attestation
        try:
            result = message_transmitter.functions.receiveMessage(message, attestation).call()
            print(f"   ✅ Original combination: SUCCESS! {result}")
            return True
        except Exception as e:
            error_msg = str(e)
            print(f"   ❌ Original combination: {error_msg}")
            
            if "Invalid signature" in error_msg:
                print(f"   🔍 Signature validation failed - this is the core issue")
                
                # Try to understand what's wrong with the signature
                print(f"   📊 Message hash: {message.hex()[:64]}...")
                print(f"   📊 Attestation: {attestation.hex()[:64]}...")
                
                # The issue might be that the attestation was signed for a different message
                # or the signature format is wrong
                
                return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(debug_message_format())