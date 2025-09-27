#!/usr/bin/env python3
"""Test different CCTP function variations including V2"""

import os
from web3 import Web3
from eth_account import Account
import sys

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def test_cctp_v2():
    """Test CCTP V2 functions"""

    print("🔍 TESTING CCTP V2 FUNCTIONS")
    print("=" * 60)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()
    config = cctp.chain_configs['base_sepolia']
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔑 Wallet: {account.address}")
    print()

    # Extended ABI with V2 functions
    extended_abi = [
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
            "inputs": [],
            "name": "localMinter",
            "outputs": [{"type": "address"}],
            "stateMutability": "view",
            "type": "function"
        },
        {
            "inputs": [{"name": "burnToken", "type": "address"}],
            "name": "burnLimitsPerMessage",
            "outputs": [{"type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]

    token_messenger_address = w3.to_checksum_address(config.token_messenger_address)
    usdc_address = w3.to_checksum_address(config.usdc_address)

    contract = w3.eth.contract(address=token_messenger_address, abi=extended_abi)

    # Check contract state
    print("📊 CONTRACT STATE:")
    try:
        local_minter = contract.functions.localMinter().call()
        print(f"   Local Minter: {local_minter}")
    except Exception as e:
        print(f"   ⚠️ localMinter() error: {e}")

    try:
        burn_limit = contract.functions.burnLimitsPerMessage(usdc_address).call()
        print(f"   Burn Limit per Message: {burn_limit / 10**6:,.0f} USDC")
    except Exception as e:
        print(f"   ⚠️ burnLimitsPerMessage() error: {e}")

    # Test parameters
    amount = 1.0  # 1 USDC
    amount_wei = int(amount * 10**6)
    dest_domain = 3  # Arbitrum Sepolia
    recipient_bytes32 = "0x" + "0" * 24 + account.address[2:].lower()
    empty_caller = "0x" + "0" * 64  # Empty bytes32

    print(f"\n🧪 TEST PARAMETERS:")
    print(f"   Amount: {amount} USDC ({amount_wei} wei)")
    print(f"   Destination Domain: {dest_domain}")
    print(f"   Recipient: {recipient_bytes32}")
    print(f"   Burn Token: {usdc_address}")

    # Test different function variations
    functions_to_test = [
        ("depositForBurn", [amount_wei, dest_domain, recipient_bytes32, usdc_address]),
        ("depositForBurnWithCaller", [amount_wei, dest_domain, recipient_bytes32, usdc_address, empty_caller]),
    ]

    for func_name, params in functions_to_test:
        print(f"\n🔧 TESTING {func_name}:")
        print("-" * 40)

        try:
            func = getattr(contract.functions, func_name)

            # Test simulation first
            print(f"   🧪 Simulating {func_name}...")
            result = func(*params).call({'from': account.address})
            print(f"   ✅ Simulation successful! Nonce: {result}")

            # If simulation works, try the actual transaction
            print(f"   🚀 Executing {func_name}...")

            tx = func(*params).build_transaction({
                'from': account.address,
                'gas': 300000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            signed_tx = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
            print(f"   📝 TX submitted: {tx_hash.hex()}")

            # Wait for receipt
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"   🎉 SUCCESS! Transaction confirmed")
                print(f"   📊 Block: {receipt.blockNumber}")
                print(f"   ⛽ Gas used: {receipt.gasUsed:,}")
                print(f"   📋 Logs: {len(receipt.logs)}")

                # This is the working function!
                return func_name, tx_hash.hex()
            else:
                print(f"   ❌ Transaction failed")

        except Exception as e:
            print(f"   ❌ {func_name} error: {e}")

    print(f"\n🔚 All function tests completed")
    return None, None

if __name__ == "__main__":
    func_name, tx_hash = test_cctp_v2()
    if tx_hash:
        print(f"\n🎉 SUCCESS! Working function: {func_name}")
        print(f"🔥 Transaction: {tx_hash}")
    else:
        print(f"\n😞 No working functions found")