#!/usr/bin/env python3
"""Debug transaction logs to find the correct message"""

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

def debug_transaction_logs():
    """Debug transaction logs to find the correct message"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Debugging transaction logs for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING TRANSACTION LOGS")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    
    print(f"📊 Burn Transaction: {burn_tx_hash}")
    
    try:
        # Get transaction receipt
        config = cctp.chain_configs["base_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        receipt = w3.eth.get_transaction_receipt(burn_tx_hash)
        
        print(f"\n📊 Transaction Receipt:")
        print(f"   Status: {receipt.status}")
        print(f"   Gas Used: {receipt.gasUsed}")
        print(f"   Block Number: {receipt.blockNumber}")
        print(f"   Logs Count: {len(receipt.logs)}")
        
        # Check each log
        print(f"\n📊 Transaction Logs:")
        for i, log in enumerate(receipt.logs):
            print(f"\n   Log {i}:")
            print(f"     Address: {log.address}")
            print(f"     Topics: {log.topics}")
            print(f"     Data: {log.data}")
            print(f"     Data Length: {len(log.data)} bytes")
            
            # Check if this is from the Token Messenger contract
            if log.address.lower() == config.token_messenger_address.lower():
                print(f"     🎯 TOKEN MESSENGER LOG!")
                
                # Check if this looks like a message
                if len(log.data) > 0:
                    print(f"     📝 Potential message data: {log.data.hex()}")
                    
                    # Try to decode as message
                    try:
                        # The message might be in the data field
                        message_data = log.data
                        print(f"     📝 Message data length: {len(message_data)} bytes")
                        print(f"     📝 Message data hex: {message_data.hex()}")
                        
                        # Check if this is the right format
                        if len(message_data) > 32:  # Messages are usually longer than 32 bytes
                            print(f"     ✅ This looks like a message!")
                            return message_data
                    except Exception as e:
                        print(f"     ❌ Error decoding message: {e}")
        
        print(f"\n❌ No message found in transaction logs")
        return None
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    debug_transaction_logs()