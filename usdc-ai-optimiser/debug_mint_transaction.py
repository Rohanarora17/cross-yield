#!/usr/bin/env python3
"""Debug the mint transaction"""

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

def debug_mint_transaction():
    """Debug the mint transaction"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Debugging mint for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING MINT TRANSACTION")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # The mint transaction hash
    mint_tx_hash = "7967bb9b3fd0c7703016b229b437df4c0de4eee297f561c9974537e3bdbf54cb"
    
    print(f"📊 Mint Transaction: {mint_tx_hash}")
    
    try:
        # Get transaction details
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        # Get transaction
        tx = w3.eth.get_transaction(mint_tx_hash)
        print(f"\n📊 Transaction Details:")
        print(f"   From: {tx['from']}")
        print(f"   To: {tx['to']}")
        print(f"   Value: {w3.from_wei(tx['value'], 'ether')} ETH")
        print(f"   Gas: {tx['gas']}")
        print(f"   Gas Price: {w3.from_wei(tx['gasPrice'], 'gwei')} Gwei")
        print(f"   Nonce: {tx.nonce}")
        
        # Get transaction receipt
        receipt = w3.eth.get_transaction_receipt(mint_tx_hash)
        print(f"\n📊 Transaction Receipt:")
        print(f"   Status: {receipt.status}")
        print(f"   Gas Used: {receipt.gasUsed}")
        print(f"   Block Number: {receipt.blockNumber}")
        print(f"   Logs Count: {len(receipt.logs)}")
        
        # Check logs for USDC mint events
        print(f"\n📊 Transaction Logs:")
        for i, log in enumerate(receipt.logs):
            print(f"   Log {i}:")
            print(f"     Address: {log.address}")
            print(f"     Topics: {log.topics}")
            print(f"     Data: {log.data}")
            
            # Check if this is a USDC transfer event
            if log.address.lower() == config.usdc_address.lower():
                print(f"     🎯 USDC Contract Event!")
        
        # Check current balances
        print(f"\n💰 Current Balances:")
        print("-" * 30)
        
        chains = ["base_sepolia", "arbitrum_sepolia"]
        
        for chain in chains:
            try:
                config = cctp.chain_configs[chain]
                w3 = Web3(Web3.HTTPProvider(config.rpc_url))
                
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
                
                print(f"   📊 {config.name}: {balance_usdc:.2f} USDC")
                
            except Exception as e:
                print(f"   ❌ {chain}: Error - {e}")
        
        # Check ETH balance on Arbitrum Sepolia
        print(f"\n💰 ETH Balance on Arbitrum Sepolia:")
        print("-" * 40)
        
        try:
            config = cctp.chain_configs["arbitrum_sepolia"]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))
            
            eth_balance_wei = w3.eth.get_balance(account.address)
            eth_balance = w3.from_wei(eth_balance_wei, 'ether')
            
            print(f"   📊 ETH Balance: {eth_balance:.4f} ETH")
            
        except Exception as e:
            print(f"   ❌ Error checking ETH balance: {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_mint_transaction()