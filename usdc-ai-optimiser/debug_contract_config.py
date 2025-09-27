#!/usr/bin/env python3
"""Debug contract configuration"""

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

def debug_contract_config():
    """Debug contract configuration"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Debugging contract config for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING CONTRACT CONFIGURATION")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Check Arbitrum Sepolia configuration
    config = cctp.chain_configs["arbitrum_sepolia"]
    print(f"\n📊 Arbitrum Sepolia Configuration:")
    print(f"   Chain ID: {config.chain_id}")
    print(f"   Name: {config.name}")
    print(f"   RPC URL: {config.rpc_url}")
    print(f"   Token Messenger: {config.token_messenger_address}")
    print(f"   Message Transmitter: {config.message_transmitter_address}")
    print(f"   USDC: {config.usdc_address}")
    
    try:
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        # Check if contracts are deployed
        print(f"\n🔍 Contract Deployment Status:")
        
        # Check Token Messenger
        tm_code = w3.eth.get_code(w3.to_checksum_address(config.token_messenger_address))
        print(f"   Token Messenger: {'✅ DEPLOYED' if len(tm_code) > 0 else '❌ NOT DEPLOYED'}")
        
        # Check Message Transmitter
        mt_code = w3.eth.get_code(w3.to_checksum_address(config.message_transmitter_address))
        print(f"   Message Transmitter: {'✅ DEPLOYED' if len(mt_code) > 0 else '❌ NOT DEPLOYED'}")
        
        # Check USDC
        usdc_code = w3.eth.get_code(w3.to_checksum_address(config.usdc_address))
        print(f"   USDC: {'✅ DEPLOYED' if len(usdc_code) > 0 else '❌ NOT DEPLOYED'}")
        
        # Check Message Transmitter configuration
        print(f"\n🔍 Message Transmitter Configuration:")
        
        # Message Transmitter ABI
        message_transmitter_abi = [
            {
                "inputs": [],
                "name": "localDomain",
                "outputs": [{"name": "", "type": "uint32"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "messageTransmitter",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "owner",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        message_transmitter = w3.eth.contract(
            address=w3.to_checksum_address(config.message_transmitter_address),
            abi=message_transmitter_abi
        )
        
        try:
            local_domain = message_transmitter.functions.localDomain().call()
            print(f"   Local Domain: {local_domain}")
            
            mt_address = message_transmitter.functions.messageTransmitter().call()
            print(f"   Message Transmitter Address: {mt_address}")
            
            owner = message_transmitter.functions.owner().call()
            print(f"   Owner: {owner}")
            
        except Exception as e:
            print(f"   ❌ Error reading contract state: {e}")
        
        # Check if this is the right contract
        print(f"\n🔍 Contract Verification:")
        print(f"   Expected Domain (Arbitrum Sepolia): 3")
        print(f"   Actual Domain: {local_domain if 'local_domain' in locals() else 'Unknown'}")
        
        if 'local_domain' in locals() and local_domain == 3:
            print(f"   ✅ Domain matches!")
        else:
            print(f"   ❌ Domain mismatch!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_contract_config()