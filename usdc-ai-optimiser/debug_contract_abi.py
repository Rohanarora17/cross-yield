#!/usr/bin/env python3
"""Debug contract ABI and available functions"""

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

def debug_contract_abi():
    """Debug contract ABI and available functions"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔍 Debugging contract ABI for wallet: {account.address}")
    
    print("\n🔍 DEBUGGING CONTRACT ABI")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    try:
        # Check Arbitrum Sepolia Message Transmitter
        config = cctp.chain_configs["arbitrum_sepolia"]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))
        
        print(f"📊 Arbitrum Sepolia Message Transmitter:")
        print(f"   Address: {config.message_transmitter_address}")
        
        # Try to get contract code to see what's deployed
        code = w3.eth.get_code(w3.to_checksum_address(config.message_transmitter_address))
        print(f"   Code length: {len(code)} bytes")
        
        if len(code) > 0:
            print(f"   ✅ Contract is deployed")
        else:
            print(f"   ❌ Contract not deployed")
            return
        
        # Test basic functions that should exist
        print(f"\n🔍 Testing Basic Functions:")
        
        # Try different function signatures
        test_functions = [
            # Basic view functions
            ("localDomain()", "uint32"),
            ("owner()", "address"),
            ("paused()", "bool"),
            ("maxMessageBodySize()", "uint256"),
            
            # Attester functions (try different names)
            ("isAttester(address)", "bool"),
            ("attester(address)", "bool"),
            ("isValidAttester(address)", "bool"),
            ("getAttester(address)", "bool"),
            
            # Version functions
            ("version()", "string"),
            ("VERSION()", "string"),
            ("getVersion()", "string"),
        ]
        
        for func_sig, return_type in test_functions:
            try:
                # Create a simple contract with just this function
                test_abi = [
                    {
                        "inputs": [{"name": "attester", "type": "address"}] if "address" in func_sig else [],
                        "name": func_sig.split("(")[0],
                        "outputs": [{"name": "", "type": return_type}],
                        "stateMutability": "view",
                        "type": "function"
                    }
                ]
                
                test_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.message_transmitter_address),
                    abi=test_abi
                )
                
                # Try to call the function
                if "address" in func_sig:
                    # Test with a dummy address
                    result = test_contract.functions[func_sig.split("(")[0]]("0x0000000000000000000000000000000000000000").call()
                else:
                    result = test_contract.functions[func_sig.split("(")[0]]().call()
                
                print(f"   ✅ {func_sig}: {result}")
                
            except Exception as e:
                print(f"   ❌ {func_sig}: {e}")
        
        # Try to find the correct receiveMessage function
        print(f"\n🔍 Testing receiveMessage Function:")
        
        receive_message_abis = [
            # Standard receiveMessage
            {
                "inputs": [
                    {"name": "message", "type": "bytes"},
                    {"name": "attestation", "type": "bytes"}
                ],
                "name": "receiveMessage",
                "outputs": [{"name": "success", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            # Alternative signature
            {
                "inputs": [
                    {"name": "message", "type": "bytes"},
                    {"name": "attestation", "type": "bytes"}
                ],
                "name": "receiveMessage",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            # V2 signature
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
        
        for i, abi in enumerate(receive_message_abis):
            try:
                test_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.message_transmitter_address),
                    abi=[abi]
                )
                
                # Try to call receiveMessage (this will fail but tell us about the function)
                try:
                    result = test_contract.functions.receiveMessage(b"", b"").call()
                    print(f"   ✅ receiveMessage ABI {i+1}: {result}")
                except Exception as e:
                    print(f"   ⚠️ receiveMessage ABI {i+1}: {e}")
                    
            except Exception as e:
                print(f"   ❌ receiveMessage ABI {i+1}: {e}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_contract_abi()