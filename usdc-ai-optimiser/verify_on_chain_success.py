#!/usr/bin/env python3
"""Verify if CCTP transfer actually succeeded on-chain"""

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

def verify_on_chain_success():
    """Verify if CCTP transfer actually succeeded on-chain"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Verifying on-chain success for wallet: {account.address}")
    
    print("\n🔍 VERIFYING ON-CHAIN SUCCESS")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    try:
        # Check Arbitrum Sepolia USDC balance
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"📊 Arbitrum Sepolia USDC Contract:")
        print(f"   Address: {config.usdc_address}")
        
        # USDC ABI (minimal)
        usdc_abi = [
            {
                "inputs": [{"name": "account", "type": "address"}],
                "name": "balanceOf",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "decimals",
                "outputs": [{"name": "", "type": "uint8"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(config.usdc_address),
            abi=usdc_abi
        )
        
        # Get current balance
        balance_wei = usdc_contract.functions.balanceOf(account.address).call()
        decimals = usdc_contract.functions.decimals().call()
        balance_usdc = balance_wei / (10 ** decimals)
        
        print(f"📊 Current USDC Balance: {balance_usdc} USDC")
        
        # Check recent transactions
        print(f"\n🔍 Checking Recent Transactions:")
        
        # Get recent blocks and look for our address
        latest_block = w3.eth.block_number
        print(f"   Latest block: {latest_block}")
        
        # Check last 50 blocks for transactions involving our address
        our_transactions = []
        for block_num in range(latest_block - 50, latest_block + 1):
            try:
                block = w3.eth.get_block(block_num, full_transactions=True)
                for tx in block.transactions:
                    if (tx['from'] and tx['from'].lower() == account.address.lower()) or \
                       (tx['to'] and tx['to'].lower() == account.address.lower()):
                        our_transactions.append({
                            'hash': tx['hash'].hex(),
                            'block': block_num,
                            'from': tx['from'],
                            'to': tx['to'],
                            'value': tx['value']
                        })
            except Exception as e:
                continue
        
        print(f"   Found {len(our_transactions)} recent transactions")
        
        for tx in our_transactions[-5:]:  # Show last 5 transactions
            print(f"   📝 {tx['hash']}")
            print(f"      Block: {tx['block']}")
            print(f"      From: {tx['from']}")
            print(f"      To: {tx['to']}")
            print(f"      Value: {tx['value']} wei")
            
            # Check if this is a mint transaction
            if tx['to'] and tx['to'].lower() == config.message_transmitter_address.lower():
                print(f"      🎯 This is a CCTP mint transaction!")
                
                # Get transaction receipt
                try:
                    receipt = w3.eth.get_transaction_receipt(tx['hash'])
                    print(f"      Status: {receipt.status}")
                    print(f"      Gas Used: {receipt.gasUsed}")
                    print(f"      Logs Count: {len(receipt.logs)}")
                    
                    if receipt.status == 1:
                        print(f"      ✅ Transaction SUCCEEDED!")
                        
                        # Check for USDC mint events
                        for log in receipt.logs:
                            if log.address.lower() == config.usdc_address.lower():
                                print(f"      🪙 USDC event found!")
                                print(f"         Address: {log.address}")
                                print(f"         Data: {log.data.hex()}")
                                print(f"         Topics: {[topic.hex() for topic in log.topics]}")
                    else:
                        print(f"      ❌ Transaction FAILED")
                        
                except Exception as e:
                    print(f"      Error getting receipt: {e}")
            
            print()
        
        # Check if balance increased
        print(f"\n💰 Balance Analysis:")
        print(f"   Current balance: {balance_usdc} USDC")
        
        if balance_usdc > 10.0:  # We started with 10 USDC
            print(f"   🎉 BALANCE INCREASED! CCTP transfer succeeded!")
            print(f"   📈 Gained: {balance_usdc - 10.0} USDC")
        else:
            print(f"   📊 Balance unchanged - transfer may not have completed")
        
        # Check Base Sepolia balance for comparison
        print(f"\n🔍 Checking Base Sepolia Balance:")
        base_config = cctp.chain_configs["base_sepolia"]
        base_w3 = Web3(Web3.HTTPProvider(base_config.rpc_url))
        
        base_usdc_contract = base_w3.eth.contract(
            address=base_w3.to_checksum_address(base_config.usdc_address),
            abi=usdc_abi
        )
        
        base_balance_wei = base_usdc_contract.functions.balanceOf(account.address).call()
        base_balance_usdc = base_balance_wei / (10 ** decimals)
        
        print(f"   Base Sepolia USDC: {base_balance_usdc} USDC")
        
        if base_balance_usdc < 10.66:  # We started with 10.66 USDC
            print(f"   🔥 USDC was burned on Base Sepolia!")
            print(f"   📉 Lost: {10.66 - base_balance_usdc} USDC")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    verify_on_chain_success()