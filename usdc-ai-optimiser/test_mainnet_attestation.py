#!/usr/bin/env python3
"""Test mainnet attestation"""

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

async def test_mainnet_attestation():
    """Test mainnet attestation"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Testing mainnet attestation for wallet: {account.address}")
    
    print("\n🔍 TESTING MAINNET ATTESTATION")
    print("=" * 50)
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    nonce = 191
    
    # Get mainnet attestation
    mainnet_url = f"https://iris-api.circle.com/v2/messages/{source_domain}?nonce={nonce}"
    print(f"🌐 Mainnet URL: {mainnet_url}")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(mainnet_url) as response:
                if response.status == 200:
                    data = await response.json()
                    messages = data.get('messages', [])
                    
                    if messages:
                        message = messages[0]
                        attestation_hex = message.get('attestation')
                        
                        print(f"✅ Mainnet attestation retrieved!")
                        print(f"📊 Status: {message.get('status')}")
                        print(f"📊 CCTP Version: {message.get('cctpVersion')}")
                        print(f"📊 Attestation: {attestation_hex[:100]}...")
                        
                        # Test this attestation
                        await test_attestation_with_mainnet(attestation_hex, burn_tx_hash)
                    else:
                        print(f"❌ No messages found")
                else:
                    print(f"❌ Mainnet API error: {response.status}")
                    response_text = await response.text()
                    print(f"📊 Response: {response_text}")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

async def test_attestation_with_mainnet(attestation_hex, burn_tx_hash):
    """Test attestation with mainnet data"""
    
    print(f"\n🧪 Testing mainnet attestation...")
    
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
            
            # If successful, try the actual transaction
            print(f"\n🚀 Attempting actual mint transaction...")
            
            # Build transaction
            mint_tx = message_transmitter.functions.receiveMessage(message, attestation).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
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
                
                # Check balances
                print(f"\n💰 Checking final balances...")
                
                # USDC ABI
                usdc_abi = [
                    {
                        "inputs": [{"name": "owner", "type": "address"}],
                        "name": "balanceOf",
                        "outputs": [{"name": "balance", "type": "uint256"}],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ]
                
                usdc_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.usdc_address),
                    abi=usdc_abi
                )
                
                balance_wei = usdc_contract.functions.balanceOf(account.address).call()
                balance_usdc = balance_wei / 10**6
                
                print(f"📊 Arbitrum Sepolia USDC: {balance_usdc:.2f} USDC")
                
                if balance_usdc > 10.0:
                    print(f"🎉 SUCCESS! USDC minted successfully!")
                    print(f"🏆 CCTP Transfer completed!")
                    return True
                else:
                    print(f"⚠️ USDC balance unchanged")
                    return False
            else:
                print(f"❌ Mint transaction failed")
                return False
            
        except Exception as e:
            print(f"❌ receiveMessage call failed: {e}")
            return False
        
    except Exception as e:
        print(f"❌ Error testing attestation: {e}")
        return False

if __name__ == "__main__":
    asyncio.run(test_mainnet_attestation())