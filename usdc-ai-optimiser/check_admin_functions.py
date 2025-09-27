#!/usr/bin/env python3
"""Check admin functions for attester configuration"""

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

def check_admin_functions():
    """Check admin functions for attester configuration"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Checking admin functions for wallet: {account.address}")
    
    print("\n🔍 CHECKING ADMIN FUNCTIONS")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    try:
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"📊 Arbitrum Sepolia Message Transmitter:")
        print(f"   Address: {config.message_transmitter_address}")
        
        # Check if we're the owner
        owner_abi = [
            {
                "inputs": [],
                "name": "owner",
                "outputs": [{"name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        owner_contract = w3.eth.contract(
            address=w3.to_checksum_address(config.message_transmitter_address),
            abi=owner_abi
        )
        
        owner = owner_contract.functions.owner().call()
        print(f"   Owner: {owner}")
        print(f"   Our address: {account.address}")
        
        if owner.lower() == account.address.lower():
            print(f"   ✅ We are the owner!")
        else:
            print(f"   ❌ We are not the owner")
        
        # Try to find admin functions
        admin_functions = [
            # Attester management
            ("addAttester(address)", "nonpayable"),
            ("removeAttester(address)", "nonpayable"),
            ("setAttester(address,bool)", "nonpayable"),
            ("updateAttester(address,address)", "nonpayable"),
            
            # Pause functions
            ("pause()", "nonpayable"),
            ("unpause()", "nonpayable"),
            
            # Configuration functions
            ("setMaxMessageBodySize(uint256)", "nonpayable"),
            ("setLocalDomain(uint32)", "nonpayable"),
            
            # Emergency functions
            ("emergencyPause()", "nonpayable"),
            ("emergencyUnpause()", "nonpayable"),
        ]
        
        print(f"\n🔍 Testing Admin Functions:")
        
        for func_sig, state_mutability in admin_functions:
            try:
                # Create ABI for this function
                func_name = func_sig.split("(")[0]
                inputs = []
                if "address" in func_sig:
                    inputs.append({"name": "addr", "type": "address"})
                elif "uint256" in func_sig:
                    inputs.append({"name": "value", "type": "uint256"})
                elif "uint32" in func_sig:
                    inputs.append({"name": "value", "type": "uint32"})
                
                test_abi = [
                    {
                        "inputs": inputs,
                        "name": func_name,
                        "outputs": [],
                        "stateMutability": state_mutability,
                        "type": "function"
                    }
                ]
                
                test_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.message_transmitter_address),
                    abi=test_abi
                )
                
                # Try to call the function (this will fail but tell us if it exists)
                try:
                    if "address" in func_sig:
                        # Test with a dummy address
                        test_contract.functions[func_name]("0x0000000000000000000000000000000000000000").call()
                    elif "uint256" in func_sig:
                        test_contract.functions[func_name](1000).call()
                    elif "uint32" in func_sig:
                        test_contract.functions[func_name](3).call()
                    else:
                        test_contract.functions[func_name]().call()
                    
                    print(f"   ✅ {func_sig}: EXISTS")
                    
                except Exception as e:
                    error_msg = str(e)
                    if "execution reverted" in error_msg:
                        print(f"   ✅ {func_sig}: EXISTS (reverted)")
                    else:
                        print(f"   ❌ {func_sig}: {error_msg}")
                        
            except Exception as e:
                print(f"   ❌ {func_sig}: {e}")
        
        # Check if we can find the correct attester address
        print(f"\n🔍 Looking for Correct Attester Address:")
        
        # Common Circle attester addresses (these are examples)
        potential_attesters = [
            # These are example addresses, not real ones
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000001",
            "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",  # Token Messenger
            "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",  # Message Transmitter
            "0xF8d15d969C00Fc008799d69E0034E7E12aE540a5",  # Contract Owner
        ]
        
        for attester in potential_attesters:
            try:
                # Try to check if this is an attester
                attester_abi = [
                    {
                        "inputs": [{"name": "attester", "type": "address"}],
                        "name": "isAttester",
                        "outputs": [{"name": "", "type": "bool"}],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ]
                
                attester_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.message_transmitter_address),
                    abi=attester_abi
                )
                
                is_attester = attester_contract.functions.isAttester(attester).call()
                print(f"   {attester}: {'✅ Attester' if is_attester else '❌ Not Attester'}")
                
            except Exception as e:
                print(f"   {attester}: Error - {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    check_admin_functions()