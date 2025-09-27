#!/usr/bin/env python3
"""Test the fixed CCTP burn transaction with proper nonce management"""

import os
from web3 import Web3
from eth_account import Account
import sys
import time

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def test_fixed_cctp_burn():
    """Test CCTP burn with the corrected 7-parameter function"""

    print("🔍 TESTING FIXED CCTP BURN (7-PARAMETER)")
    print("=" * 60)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    source_chain = "base_sepolia"
    config = cctp.chain_configs[source_chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔑 Wallet: {account.address}")
    print(f"🔗 Chain: {source_chain}")
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

    # Test parameters
    amount = 0.1
    amount_wei = int(amount * 10**6)
    dest_domain = cctp._get_domain("arbitrum_sepolia")
    recipient_bytes32 = "0x" + "0" * 24 + account.address[2:].lower()

    print(f"🧪 TEST PARAMETERS:")
    print(f"   Amount: {amount} USDC ({amount_wei} wei)")
    print(f"   Destination Domain: {dest_domain}")
    print(f"   Recipient: {recipient_bytes32}")

    # Ensure adequate allowance
    if allowance_usdc < amount:
        print(f"📝 Need to approve {amount} USDC...")

        # Wait a bit to avoid nonce conflicts
        time.sleep(2)

        approve_tx = usdc_contract.functions.approve(
            token_messenger_address,
            amount_wei * 10  # Approve 10x
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
            return

        print(f"   ✅ Approval confirmed in block {approve_receipt.blockNumber}")

    # Wait before burn transaction
    time.sleep(3)

    # Circle CCTP V2 parameters (from official implementation)
    hook_data = "0x" + "0" * 64  # Empty bytes32
    max_fee = amount_wei - 1  # Slightly less than burn amount
    finality_threshold = 2000  # Standard transfer

    print(f"\n🔥 TESTING CORRECTED BURN TRANSACTION:")
    print(f"   Function: depositForBurn (7 parameters)")
    print(f"   Hook Data: {hook_data}")
    print(f"   Max Fee: {max_fee} wei ({(max_fee / 10**6):.6f} USDC)")
    print(f"   Finality Threshold: {finality_threshold}")

    try:
        # Test simulation first
        print(f"   🧪 Simulating...")
        nonce = token_messenger.functions.depositForBurn(
            amount_wei,
            dest_domain,
            recipient_bytes32,
            usdc_address,
            hook_data,
            max_fee,
            finality_threshold
        ).call({'from': account.address})
        print(f"   ✅ Simulation successful! Expected nonce: {nonce}")

        # Execute real transaction
        print(f"   🚀 Executing...")

        current_nonce = w3.eth.get_transaction_count(account.address)
        gas_price = w3.eth.gas_price * 2  # Double gas price to avoid underpriced

        burn_tx = token_messenger.functions.depositForBurn(
            amount_wei,
            dest_domain,
            recipient_bytes32,
            usdc_address,
            hook_data,
            max_fee,
            finality_threshold
        ).build_transaction({
            'from': account.address,
            'gas': 300000,  # Increased gas limit
            'gasPrice': gas_price,
            'nonce': current_nonce
        })

        print(f"   📊 Transaction details:")
        print(f"      Nonce: {current_nonce}")
        print(f"      Gas Price: {gas_price / 10**9:.2f} Gwei")
        print(f"      Gas Limit: {burn_tx['gas']:,}")

        signed_burn = account.sign_transaction(burn_tx)
        burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)
        print(f"   🔥 Burn TX submitted: {burn_tx_hash.hex()}")

        # Wait for confirmation
        burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

        if burn_receipt.status == 1:
            print(f"   🎉 SUCCESS! Transaction confirmed in block {burn_receipt.blockNumber}")
            print(f"   ⛽ Gas used: {burn_receipt.gasUsed:,}")
            print(f"   📋 Logs: {len(burn_receipt.logs)}")

            # Verify balance change
            new_balance_wei = usdc_contract.functions.balanceOf(account.address).call()
            new_balance_usdc = new_balance_wei / 10**6
            burned_amount = balance_usdc - new_balance_usdc

            print(f"   💰 Balance: {balance_usdc:.6f} → {new_balance_usdc:.6f} USDC")
            print(f"   🔥 Burned: {burned_amount:.6f} USDC")

            if abs(burned_amount - amount) < 0.001:
                print(f"   🎯 PERFECT! CCTP burn successful!")
                print(f"   📝 Burn TX for attestation: {burn_tx_hash.hex()}")
                return burn_tx_hash.hex()
            else:
                print(f"   ⚠️ Unexpected burn amount")
        else:
            print(f"   ❌ Transaction failed")

    except Exception as e:
        print(f"   ❌ Error: {e}")

    return None

if __name__ == "__main__":
    result = test_fixed_cctp_burn()
    if result:
        print(f"\n🎉 SUCCESS! CCTP V2 burn works with Circle's official parameters!")
        print(f"🔥 Burn TX: {result}")
        print(f"⏳ Wait 10-20 minutes for Circle attestation")
        print(f"🔄 Then run mint on destination chain")
    else:
        print(f"\n😞 Still having issues with burn transaction")