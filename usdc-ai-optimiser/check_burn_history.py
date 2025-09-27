#!/usr/bin/env python3
"""Check Base Sepolia burn transaction history"""

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

def check_burn_history():
    """Check Base Sepolia burn transaction history"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Checking burn history for wallet: {account.address}")
    
    print("\n🔍 CHECKING BURN TRANSACTION HISTORY")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    try:
        # Check Base Sepolia
        config = cctp.chain_configs["base_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"📊 Base Sepolia:")
        print(f"   Token Messenger: {config.token_messenger_address}")
        print(f"   USDC: {config.usdc_address}")
        
        # Get recent blocks and look for our transactions
        latest_block = w3.eth.block_number
        print(f"   Latest block: {latest_block}")
        
        # Check last 100 blocks for transactions involving our address
        our_transactions = []
        for block_num in range(latest_block - 100, latest_block + 1):
            try:
                block = w3.eth.get_block(block_num, full_transactions=True)
                for tx in block.transactions:
                    if tx['from'] and tx['from'].lower() == account.address.lower():
                        our_transactions.append({
                            'hash': tx['hash'].hex(),
                            'block': block_num,
                            'to': tx['to'],
                            'value': tx['value'],
                            'gas': tx['gas'],
                            'gasPrice': tx['gasPrice']
                        })
            except Exception as e:
                continue
        
        print(f"   Found {len(our_transactions)} transactions from our address")
        
        for tx in our_transactions:
            print(f"\n📝 Transaction: {tx['hash']}")
            print(f"   Block: {tx['block']}")
            print(f"   To: {tx['to']}")
            print(f"   Value: {tx['value']} wei")
            print(f"   Gas: {tx['gas']}")
            
            # Check if this is a CCTP transaction
            if tx['to'] and tx['to'].lower() == config.token_messenger_address.lower():
                print(f"   🎯 This is a CCTP Token Messenger transaction!")
                
                # Get transaction receipt
                try:
                    receipt = w3.eth.get_transaction_receipt(tx['hash'])
                    print(f"   Status: {receipt.status}")
                    print(f"   Gas Used: {receipt.gasUsed}")
                    print(f"   Logs Count: {len(receipt.logs)}")
                    
                    if receipt.status == 1:
                        print(f"   ✅ Transaction SUCCEEDED!")
                        
                        # Check for burn events
                        for i, log in enumerate(receipt.logs):
                            print(f"   Log {i}: {log.address}")
                            print(f"      Data: {log.data.hex()}")
                            print(f"      Topics: {[topic.hex() for topic in log.topics]}")
                            
                            # Check if this is a burn event
                            if log.address.lower() == config.usdc_address.lower():
                                print(f"      🪙 USDC event!")
                            elif log.address.lower() == config.token_messenger_address.lower():
                                print(f"      🔥 Token Messenger event!")
                    else:
                        print(f"   ❌ Transaction FAILED")
                        
                except Exception as e:
                    print(f"   Error getting receipt: {e}")
            
            print()
        
        # Check if we have any successful burns
        successful_burns = []
        for tx in our_transactions:
            if tx['to'] and tx['to'].lower() == config.token_messenger_address.lower():
                try:
                    receipt = w3.eth.get_transaction_receipt(tx['hash'])
                    if receipt.status == 1:
                        successful_burns.append(tx['hash'])
                except:
                    continue
        
        print(f"\n🔥 Successful Burns: {len(successful_burns)}")
        for burn_hash in successful_burns:
            print(f"   {burn_hash}")
        
        if successful_burns:
            print(f"\n🎯 We have successful burns! The issue is with the mint, not the burn.")
        else:
            print(f"\n❌ No successful burns found. The burn transactions may have failed.")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_burn_history()