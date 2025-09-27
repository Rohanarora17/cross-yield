#!/usr/bin/env python3
"""Find alternative testnet contract addresses"""

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

def find_alternative_contracts():
    """Find alternative testnet contract addresses"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Finding alternative contracts for wallet: {account.address}")
    
    print("\n🔍 FINDING ALTERNATIVE TESTNET CONTRACTS")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Current contract addresses
    current_config = cctp.chain_configs["arbitrum_sepolia"]
    print(f"📊 Current Arbitrum Sepolia Config:")
    print(f"   Token Messenger: {current_config.token_messenger_address}")
    print(f"   Message Transmitter: {current_config.message_transmitter_address}")
    print(f"   USDC: {current_config.usdc_address}")
    
    # Alternative contract addresses to try
    alternative_addresses = [
        # Different variations of the same addresses
        "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA".lower(),
        "0x8fe6b999dc680ccfdd5bf7eb0974218be2542daa",
        "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
        
        # Alternative Message Transmitter addresses
        "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275".lower(),
        "0xe737e5cebeeba77efe34d4aa090756590b1ce275",
        "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
        
        # Common testnet addresses
        "0x0000000000000000000000000000000000000000",
        "0x0000000000000000000000000000000000000001",
        
        # Check if there are other deployed contracts
    ]
    
    try:
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"\n🔍 Checking Contract Deployment Status:")
        
        # Check each address
        for address in alternative_addresses:
            try:
                code = w3.eth.get_code(w3.to_checksum_address(address))
                if len(code) > 0:
                    print(f"   ✅ {address}: DEPLOYED ({len(code)} bytes)")
                    
                    # Try to call basic functions
                    try:
                        # Try to call localDomain
                        test_abi = [
                            {
                                "inputs": [],
                                "name": "localDomain",
                                "outputs": [{"name": "", "type": "uint32"}],
                                "stateMutability": "view",
                                "type": "function"
                            }
                        ]
                        
                        test_contract = w3.eth.contract(
                            address=w3.to_checksum_address(address),
                            abi=test_abi
                        )
                        
                        domain = test_contract.functions.localDomain().call()
                        print(f"      Domain: {domain}")
                        
                        if domain == 3:  # Arbitrum Sepolia domain
                            print(f"      🎯 CORRECT DOMAIN!")
                            
                    except Exception as e:
                        print(f"      ❌ Error calling functions: {e}")
                else:
                    print(f"   ❌ {address}: NOT DEPLOYED")
                    
            except Exception as e:
                print(f"   ❌ {address}: Error - {e}")
        
        # Check recent blocks for CCTP-related transactions
        print(f"\n🔍 Checking Recent Blocks for CCTP Activity:")
        
        latest_block = w3.eth.block_number
        print(f"   Latest block: {latest_block}")
        
        # Check last 100 blocks for CCTP activity
        cctp_addresses = set()
        for block_num in range(latest_block - 100, latest_block + 1):
            try:
                block = w3.eth.get_block(block_num, full_transactions=True)
                for tx in block.transactions:
                    if tx['to']:
                        to_address = tx['to'].lower()
                        # Check if this looks like a CCTP transaction
                        if ('cctp' in to_address or 
                            'messenger' in to_address or 
                            'transmitter' in to_address or
                            'circle' in to_address):
                            cctp_addresses.add(to_address)
                            print(f"   🎯 Found CCTP-related address: {to_address}")
                            
            except Exception as e:
                continue
        
        if cctp_addresses:
            print(f"\n📊 Found {len(cctp_addresses)} CCTP-related addresses")
            for addr in cctp_addresses:
                print(f"   {addr}")
        else:
            print(f"\n❌ No CCTP-related addresses found in recent blocks")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    find_alternative_contracts()