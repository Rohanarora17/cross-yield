#!/usr/bin/env python3
"""Test receiveMessage function directly"""

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

async def test_receive_message():
    """Test receiveMessage function directly"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Testing receiveMessage for wallet: {account.address}")
    
    print("\n🔍 TESTING RECEIVE MESSAGE DIRECTLY")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    
    try:
        # Get attestation from Circle
        print("🔍 Getting attestation from Circle...")
        source_domain = cctp._get_domain("base_sepolia")
        attestation_data = await cctp._get_attestation(burn_tx_hash, source_domain)
        
        if not attestation_data:
            print("❌ Failed to get attestation")
            return
        
        attestation_hex = attestation_data.get('attestation')
        attestation = bytes.fromhex(attestation_hex[2:])  # Remove 0x prefix
        
        print(f"✅ Attestation retrieved: {len(attestation)} bytes")
        
        # Get message from source chain
        print("🔍 Getting message from source chain...")
        message = await cctp._get_message("base_sepolia", burn_tx_hash)
        
        if not message:
            print("❌ Failed to get message")
            return
        
        print(f"✅ Message retrieved: {len(message)} bytes")
        
        # Test receiveMessage call
        print("🔍 Testing receiveMessage call...")
        
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
            
            # If successful, try the actual transaction
            print(f"\n🚀 Attempting actual mint transaction...")
            
            # Build transaction
            mint_tx = message_transmitter.functions.receiveMessage(message, attestation).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
            print(f"📊 Transaction details:")
            print(f"   Gas: {mint_tx['gas']}")
            print(f"   Gas Price: {w3.from_wei(mint_tx['gasPrice'], 'gwei')} Gwei")
            print(f"   Nonce: {mint_tx['nonce']}")
            
            # Sign and send transaction
            account = Account.from_key(private_key)
            signed_mint = account.sign_transaction(mint_tx)
            mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)
            
            print(f"✅ Mint transaction sent: {mint_tx_hash.hex()}")
            
            # Wait for confirmation
            receipt = w3.eth.wait_for_transaction_receipt(mint_tx_hash)
            
            if receipt.status == 1:
                print(f"✅ Mint transaction successful!")
                print(f"📊 Gas used: {receipt.gasUsed}")
                print(f"📊 Block: {receipt.blockNumber}")
                print(f"📊 Logs: {len(receipt.logs)}")
                
                # Check for USDC mint events
                for log in receipt.logs:
                    if log.address.lower() == config.usdc_address.lower():
                        print(f"🎯 USDC Event: {log.topics}")
                        if len(log.topics) >= 3:
                            from_addr = log.topics[1].hex()
                            if from_addr == "0x0000000000000000000000000000000000000000000000000000000000000000":
                                print(f"🎉 MINT EVENT!")
                                amount_wei = int(log.data.hex(), 16)
                                amount_usdc = amount_wei / 10**6
                                print(f"💰 Amount: {amount_usdc:.2f} USDC")
                
                return True
            else:
                print(f"❌ Mint transaction failed")
                return False
            
        except Exception as e:
            print(f"❌ receiveMessage call failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_receive_message())