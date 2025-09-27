#!/usr/bin/env python3
"""Test CCTP with exact parameters from Circle documentation"""

import os
from web3 import Web3
from eth_account import Account
import sys

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def test_cctp_burn():
    """Test CCTP burn with exact Circle parameters"""

    print("🔍 TESTING CCTP WITH EXACT CIRCLE PARAMETERS")
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
    print(f"🔗 Chain: base_sepolia")
    print(f"📊 Block: {w3.eth.block_number}")
    print()

    # Contract instances
    usdc_address = w3.to_checksum_address(config.usdc_address)
    token_messenger_address = w3.to_checksum_address(config.token_messenger_address)

    usdc_contract = w3.eth.contract(address=usdc_address, abi=cctp.usdc_abi)
    token_messenger = w3.eth.contract(address=token_messenger_address, abi=cctp.token_messenger_abi)

    # Check current state
    balance_wei = usdc_contract.functions.balanceOf(account.address).call()
    balance_usdc = balance_wei / 10**6

    allowance_wei = usdc_contract.functions.allowance(account.address, token_messenger_address).call()
    allowance_usdc = allowance_wei / 10**6

    print(f"💰 Current Balance: {balance_usdc:.6f} USDC")
    print(f"📝 Current Allowance: {allowance_usdc:.6f} USDC")
    print()

    # Test parameters - try different amounts and destinations
    test_scenarios = [
        # amount, dest_chain, dest_domain
        (1.0, "arbitrum_sepolia", 3),
        (5.0, "ethereum_sepolia", 0),
        (0.1, "arbitrum_sepolia", 3),
    ]

    for amount, dest_chain, dest_domain in test_scenarios:
        print(f"🧪 TESTING: {amount} USDC to {dest_chain} (domain {dest_domain})")
        print("-" * 50)

        amount_wei = int(amount * 10**6)

        # Check we have enough balance and allowance
        if balance_usdc < amount:
            print(f"   ❌ Insufficient balance: {balance_usdc:.2f} < {amount}")
            continue

        if allowance_usdc < amount:
            print(f"   📝 Need to approve {amount} USDC...")
            try:
                approve_tx = usdc_contract.functions.approve(
                    token_messenger_address,
                    amount_wei * 10  # Approve 10x to avoid re-approvals
                ).build_transaction({
                    'from': account.address,
                    'gas': 100000,
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(account.address)
                })

                signed_approve = account.sign_transaction(approve_tx)
                approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
                print(f"   ✅ Approval TX: {approve_tx_hash.hex()}")

                # Wait for confirmation
                approve_receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
                if approve_receipt.status != 1:
                    print(f"   ❌ Approval failed")
                    continue

                # Update allowance
                allowance_wei = usdc_contract.functions.allowance(account.address, token_messenger_address).call()
                allowance_usdc = allowance_wei / 10**6
                print(f"   ✅ New allowance: {allowance_usdc:.6f} USDC")

            except Exception as e:
                print(f"   ❌ Approval error: {e}")
                continue

        # Try the burn with exact Circle format
        recipient_bytes32 = "0x" + "0" * 24 + account.address[2:].lower()

        print(f"   💫 Parameters:")
        print(f"      Amount: {amount} USDC ({amount_wei} wei)")
        print(f"      Destination Domain: {dest_domain}")
        print(f"      Recipient: {account.address}")
        print(f"      Recipient (bytes32): {recipient_bytes32}")
        print(f"      Burn Token: {usdc_address}")

        # First try simulation
        try:
            print(f"   🧪 Simulating...")
            result = token_messenger.functions.depositForBurn(
                amount_wei,
                dest_domain,
                recipient_bytes32,
                usdc_address
            ).call({'from': account.address})
            print(f"   ✅ Simulation successful! Nonce would be: {result}")

            # If simulation works, try real transaction
            print(f"   🚀 Executing transaction...")
            burn_tx = token_messenger.functions.depositForBurn(
                amount_wei,
                dest_domain,
                recipient_bytes32,
                usdc_address
            ).build_transaction({
                'from': account.address,
                'gas': 300000,  # Increase gas limit
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            signed_burn = account.sign_transaction(burn_tx)
            burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)
            print(f"   🔥 Burn TX submitted: {burn_tx_hash.hex()}")

            # Wait for confirmation
            burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

            if burn_receipt.status == 1:
                print(f"   ✅ SUCCESS! Transaction confirmed in block {burn_receipt.blockNumber}")
                print(f"   ⛽ Gas used: {burn_receipt.gasUsed:,}")
                print(f"   📋 Logs: {len(burn_receipt.logs)}")

                # Check balance change
                new_balance_wei = usdc_contract.functions.balanceOf(account.address).call()
                new_balance_usdc = new_balance_wei / 10**6
                burned_amount = balance_usdc - new_balance_usdc

                print(f"   💰 Balance change: {balance_usdc:.6f} → {new_balance_usdc:.6f} USDC")
                print(f"   🔥 Burned: {burned_amount:.6f} USDC")

                if abs(burned_amount - amount) < 0.001:
                    print(f"   🎉 PERFECT! CCTP burn successful!")
                    return burn_tx_hash.hex()
                else:
                    print(f"   ⚠️ Unexpected burn amount")

            else:
                print(f"   ❌ Transaction failed")

        except Exception as e:
            print(f"   ❌ Transaction error: {e}")

        print()

    print("🔚 All test scenarios completed")
    return None

if __name__ == "__main__":
    result = test_cctp_burn()
    if result:
        print(f"🎉 SUCCESS! Burn TX: {result}")
    else:
        print("😞 No successful burns")