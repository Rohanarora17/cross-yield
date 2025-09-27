#!/usr/bin/env python3
"""Check what functions are actually available on the TokenMessenger contract"""

import os
from web3 import Web3
import sys
import json

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def get_contract_abi_from_explorer():
    """Try to get the actual contract ABI from Base Sepolia explorer"""

    print("🔍 CHECKING TOKENMESSENGER CONTRACT FUNCTIONS")
    print("=" * 60)

    cctp = CCTPIntegration()
    config = cctp.chain_configs['base_sepolia']
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    token_messenger_address = config.token_messenger_address
    print(f"📍 TokenMessenger: {token_messenger_address}")

    # Check if contract exists
    code = w3.eth.get_code(token_messenger_address)
    print(f"📊 Contract size: {len(code)} bytes")

    if len(code) == 0:
        print("❌ No contract found at this address!")
        return

    # List current ABI functions
    print(f"\n📋 CURRENT ABI FUNCTIONS:")
    for func in cctp.token_messenger_abi:
        if func.get('type') == 'function':
            name = func.get('name')
            inputs = [f"{inp['name']}:{inp['type']}" for inp in func.get('inputs', [])]
            print(f"   {name}({', '.join(inputs)})")

    # Try to call some read functions to see what works
    print(f"\n🧪 TESTING CONTRACT INTERFACE:")

    # Create contract with current ABI
    contract = w3.eth.contract(
        address=w3.to_checksum_address(token_messenger_address),
        abi=cctp.token_messenger_abi
    )

    # Test functions that should exist
    test_functions = [
        'depositForBurn',
        'depositForBurnWithCaller',
        'replaceDepositForBurn'
    ]

    for func_name in test_functions:
        try:
            if hasattr(contract.functions, func_name):
                func = getattr(contract.functions, func_name)
                print(f"   ✅ {func_name} - exists")

                # Try to get function info
                try:
                    # This won't work for non-view functions, but worth trying
                    pass
                except:
                    pass
            else:
                print(f"   ❌ {func_name} - not found")
        except Exception as e:
            print(f"   ⚠️ {func_name} - error: {e}")

    # Let's try a more comprehensive ABI that might include V2 functions
    cctp_v2_abi = [
        {
            "inputs": [
                {"name": "amount", "type": "uint256"},
                {"name": "destinationDomain", "type": "uint32"},
                {"name": "mintRecipient", "type": "bytes32"},
                {"name": "burnToken", "type": "address"}
            ],
            "name": "depositForBurn",
            "outputs": [{"name": "_nonce", "type": "uint64"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "amount", "type": "uint256"},
                {"name": "destinationDomain", "type": "uint32"},
                {"name": "mintRecipient", "type": "bytes32"},
                {"name": "burnToken", "type": "address"},
                {"name": "destinationCaller", "type": "bytes32"}
            ],
            "name": "depositForBurnWithCaller",
            "outputs": [{"name": "_nonce", "type": "uint64"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [
                {"name": "amount", "type": "uint256"},
                {"name": "destinationDomain", "type": "uint32"},
                {"name": "mintRecipient", "type": "bytes32"},
                {"name": "burnToken", "type": "address"},
                {"name": "destinationCaller", "type": "bytes32"},
                {"name": "maxFee", "type": "uint256"}
            ],
            "name": "depositForBurnV2",
            "outputs": [{"name": "_nonce", "type": "uint64"}],
            "stateMutability": "nonpayable",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "paused",
            "outputs": [{"type": "bool"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [],
            "name": "owner",
            "outputs": [{"type": "address"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    print(f"\n🧪 TESTING WITH EXPANDED ABI:")

    # Test with more comprehensive ABI
    contract_v2 = w3.eth.contract(
        address=w3.to_checksum_address(token_messenger_address),
        abi=cctp_v2_abi
    )

    # Test view functions first
    try:
        paused = contract_v2.functions.paused().call()
        print(f"   📊 Contract paused: {paused}")
    except Exception as e:
        print(f"   ⚠️ paused() error: {e}")

    try:
        owner = contract_v2.functions.owner().call()
        print(f"   👤 Contract owner: {owner}")
    except Exception as e:
        print(f"   ⚠️ owner() error: {e}")

    # Test if different function names exist
    v2_functions = ['depositForBurn', 'depositForBurnWithCaller', 'depositForBurnV2']

    for func_name in v2_functions:
        try:
            func = getattr(contract_v2.functions, func_name)
            print(f"   ✅ {func_name} - available in expanded ABI")
        except Exception as e:
            print(f"   ❌ {func_name} - not available: {e}")

if __name__ == "__main__":
    get_contract_abi_from_explorer()