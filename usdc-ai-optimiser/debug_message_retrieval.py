#!/usr/bin/env python3
"""Debug message retrieval from source chain"""

import asyncio
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

async def debug_message_retrieval():
    """Debug message retrieval from source chain"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Debugging message retrieval for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING MESSAGE RETRIEVAL")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    
    print(f"📊 Burn Transaction: {burn_tx_hash}")
    
    try:
        # Get message from source chain
        print(f"\n🔍 Getting message from Base Sepolia...")
        message = await cctp._get_message("base_sepolia", burn_tx_hash)
        
        if message:
            print(f"✅ Message retrieved successfully!")
            print(f"📊 Message length: {len(message)} bytes")
            print(f"📊 Message hex: {message.hex()}")
        else:
            print(f"❌ Failed to retrieve message")
            return
        
        # Get attestation from Circle
        print(f"\n🔍 Getting attestation from Circle...")
        source_domain = cctp._get_domain("base_sepolia")
        attestation_data = await cctp._get_attestation(burn_tx_hash, source_domain)
        
        if attestation_data:
            print(f"✅ Attestation retrieved successfully!")
            print(f"📊 Attestation status: {attestation_data.get('status')}")
            attestation_hex = attestation_data.get('attestation')
            if attestation_hex:
                attestation = bytes.fromhex(attestation_hex[2:])
                print(f"📊 Attestation length: {len(attestation)} bytes")
                print(f"📊 Attestation hex: {attestation.hex()}")
        else:
            print(f"❌ Failed to retrieve attestation")
            return
        
        # Check if we can call receiveMessage directly
        print(f"\n🔍 Testing receiveMessage call...")
        
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
        
        # Try to call receiveMessage (this will fail but give us better error info)
        try:
            # This is a call, not a transaction, so it won't cost gas
            result = message_transmitter.functions.receiveMessage(message, attestation).call()
            print(f"✅ receiveMessage call successful: {result}")
        except Exception as e:
            print(f"❌ receiveMessage call failed: {e}")
            print(f"   This gives us the exact error reason")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_message_retrieval())