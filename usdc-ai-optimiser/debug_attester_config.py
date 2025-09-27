#!/usr/bin/env python3
"""Debug attester configuration in Message Transmitter contract"""

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

def debug_attester_config():
    """Debug attester configuration"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Debugging attester config for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING ATTESTER CONFIGURATION")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    try:
        # Check Arbitrum Sepolia Message Transmitter
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"📊 Arbitrum Sepolia Message Transmitter:")
        print(f"   Address: {config.message_transmitter_address}")
        
        # Message Transmitter ABI with attester functions
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
                "name": "owner",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "pauser",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "paused",
                "outputs": [{"name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [{"name": "attester", "type": "address"}],
                "name": "isAttester",
                "outputs": [{"name": "", "type": "bool"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "maxMessageBodySize",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "version",
                "outputs": [{"name": "", "type": "string"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        message_transmitter = w3.eth.contract(
            address=w3.to_checksum_address(config.message_transmitter_address),
            abi=message_transmitter_abi
        )
        
        print(f"\n📊 Contract State:")
        
        try:
            local_domain = message_transmitter.functions.localDomain().call()
            print(f"   Local Domain: {local_domain}")
        except Exception as e:
            print(f"   Local Domain: Error - {e}")
        
        try:
            owner = message_transmitter.functions.owner().call()
            print(f"   Owner: {owner}")
        except Exception as e:
            print(f"   Owner: Error - {e}")
        
        try:
            paused = message_transmitter.functions.paused().call()
            print(f"   Paused: {paused}")
        except Exception as e:
            print(f"   Paused: Error - {e}")
        
        try:
            version = message_transmitter.functions.version().call()
            print(f"   Version: {version}")
        except Exception as e:
            print(f"   Version: Error - {e}")
        
        try:
            max_message_body_size = message_transmitter.functions.maxMessageBodySize().call()
            print(f"   Max Message Body Size: {max_message_body_size}")
        except Exception as e:
            print(f"   Max Message Body Size: Error - {e}")
        
        # Check some common attester addresses
        print(f"\n🔍 Checking Common Attester Addresses:")
        
        # Common Circle attester addresses (these are examples, not real ones)
        common_attesters = [
            "0x0000000000000000000000000000000000000000",  # Zero address
            "0x0000000000000000000000000000000000000001",  # Test address
            "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",  # Token Messenger
            "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",  # Message Transmitter
        ]
        
        for attester in common_attesters:
            try:
                is_attester = message_transmitter.functions.isAttester(attester).call()
                print(f"   {attester}: {'✅ Attester' if is_attester else '❌ Not Attester'}")
            except Exception as e:
                print(f"   {attester}: Error - {e}")
        
        # Check if we can get attester list (if there's a function for it)
        print(f"\n🔍 Looking for Attester List Function:")
        
        # Try to find attester-related events or functions
        try:
            # Get recent events to see if there are attester-related events
            latest_block = w3.eth.block_number
            print(f"   Latest block: {latest_block}")
            
            # Check last 100 blocks for attester events
            for block_num in range(latest_block - 100, latest_block + 1):
                try:
                    block = w3.eth.get_block(block_num, full_transactions=True)
                    for tx in block.transactions:
                        if tx['to'] and tx['to'].lower() == config.message_transmitter_address.lower():
                            receipt = w3.eth.get_transaction_receipt(tx['hash'])
                            for log in receipt.logs:
                                if len(log.topics) > 0:
                                    topic0 = log.topics[0].hex()
                                    print(f"   Event topic: {topic0}")
                                    if 'attester' in topic0.lower() or 'attest' in topic0.lower():
                                        print(f"   🎯 Found attester-related event: {log}")
                except Exception as e:
                    continue
        except Exception as e:
            print(f"   Error checking events: {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_attester_config()