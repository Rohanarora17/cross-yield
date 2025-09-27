#!/usr/bin/env python3
"""Debug why burn transactions are reverting"""

import asyncio
import sys
import os
from web3 import Web3
from eth_account import Account

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def debug_burn_revert():
    """Debug why burn transactions are reverting"""

    print("🔍 DEBUGGING BURN TRANSACTION REVERT")
    print("=" * 50)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    chain = "base_sepolia"
    config = cctp.chain_configs[chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔑 Wallet: {account.address}")
    print(f"🔗 Chain: {chain}")
    print()

    # Check if contracts exist
    print("📋 CONTRACT VERIFICATION")
    print("=" * 30)

    usdc_address = w3.to_checksum_address(config.usdc_address)
    token_messenger_address = w3.to_checksum_address(config.token_messenger_address)

    # Check if contracts have code
    usdc_code = w3.eth.get_code(usdc_address)
    tm_code = w3.eth.get_code(token_messenger_address)

    print(f"   USDC Contract ({usdc_address})")
    print(f"      Code Length: {len(usdc_code)} bytes")
    print(f"      Exists: {'✅' if len(usdc_code) > 0 else '❌'}")

    print(f"   TokenMessenger ({token_messenger_address})")
    print(f"      Code Length: {len(tm_code)} bytes")
    print(f"      Exists: {'✅' if len(tm_code) > 0 else '❌'}")
    print()

    if len(usdc_code) == 0 or len(tm_code) == 0:
        print("❌ One or more contracts don't exist!")
        return

    # Check USDC contract functionality
    print("💰 USDC CONTRACT CHECKS")
    print("=" * 30)

    usdc_contract = w3.eth.contract(
        address=usdc_address,
        abi=cctp.usdc_abi
    )

    try:
        balance_wei = usdc_contract.functions.balanceOf(account.address).call()
        balance_usdc = balance_wei / 10**6
        print(f"   Balance: {balance_usdc:.6f} USDC ✅")

        allowance_wei = usdc_contract.functions.allowance(
            account.address,
            token_messenger_address
        ).call()
        allowance_usdc = allowance_wei / 10**6
        print(f"   Allowance: {allowance_usdc:.6f} USDC ✅")

        total_supply = usdc_contract.functions.totalSupply().call()
        print(f"   Total Supply: {total_supply / 10**6:,.0f} USDC ✅")

    except Exception as e:
        print(f"   ❌ USDC contract error: {e}")
        return

    # Check TokenMessenger contract
    print()
    print("🔥 TOKEN MESSENGER CHECKS")
    print("=" * 30)

    token_messenger = w3.eth.contract(
        address=token_messenger_address,
        abi=cctp.token_messenger_abi
    )

    # Test amount and parameters
    amount = 0.01  # Try a smaller amount first
    amount_wei = int(amount * 10**6)
    destination_domain = cctp._get_domain("arbitrum_sepolia")
    recipient_bytes32 = "0x" + "0" * 24 + account.address[2:]

    print(f"   Amount: {amount} USDC ({amount_wei} wei)")
    print(f"   Destination Domain: {destination_domain}")
    print(f"   Recipient: {account.address}")
    print(f"   Recipient (bytes32): {recipient_bytes32}")
    print()

    # Also test with minimum amount (many bridges have minimums)
    if amount < 1.0:
        print("   💡 Trying with 1 USDC minimum amount...")
        amount = 1.0
        amount_wei = int(amount * 10**6)
        print(f"   New Amount: {amount} USDC ({amount_wei} wei)")

    # Check if we have enough balance and allowance
    if balance_usdc < amount:
        print(f"❌ Insufficient balance: {balance_usdc:.6f} < {amount}")
        return

    if allowance_usdc < amount:
        print(f"⚠️ Insufficient allowance: {allowance_usdc:.6f} < {amount}")
        print("🔄 Attempting to approve...")

        try:
            approve_tx = usdc_contract.functions.approve(
                token_messenger_address,
                amount_wei * 2  # Approve double
            ).build_transaction({
                'from': account.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            signed_approve = account.sign_transaction(approve_tx)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)

            print(f"   ✅ Approval submitted: {approve_tx_hash.hex()}")

            # Wait for confirmation
            approve_receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
            if approve_receipt.status == 1:
                print(f"   ✅ Approval confirmed")

                # Check new allowance
                new_allowance_wei = usdc_contract.functions.allowance(
                    account.address,
                    token_messenger_address
                ).call()
                new_allowance_usdc = new_allowance_wei / 10**6
                print(f"   ✅ New allowance: {new_allowance_usdc:.6f} USDC")
            else:
                print(f"   ❌ Approval failed")
                return

        except Exception as e:
            print(f"   ❌ Approval error: {e}")
            return

    # Try to simulate the burn transaction
    print("🧪 SIMULATING BURN TRANSACTION")
    print("=" * 30)

    try:
        # Try to call the function to see if it would work
        result = token_messenger.functions.depositForBurn(
            amount_wei,
            destination_domain,
            recipient_bytes32,
            usdc_address
        ).call({'from': account.address})

        print(f"   ✅ Simulation successful: {result}")

    except Exception as e:
        print(f"   ❌ Simulation failed: {e}")

        # Try to get more detailed error by building the transaction data manually
        try:
            # Build the transaction data
            burn_tx_data = token_messenger.functions.depositForBurn(
                amount_wei,
                destination_domain,
                recipient_bytes32,
                usdc_address
            ).build_transaction({
                'from': account.address,
                'gas': 200000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            # Try to call with the built transaction
            w3.eth.call({
                'to': token_messenger_address,
                'from': account.address,
                'data': burn_tx_data['data']
            })
        except Exception as detailed_error:
            print(f"   🔍 Detailed error: {detailed_error}")

        return

    # If simulation works, try actual transaction
    print()
    print("🚀 EXECUTING BURN TRANSACTION")
    print("=" * 30)

    try:
        burn_tx = token_messenger.functions.depositForBurn(
            amount_wei,
            destination_domain,
            recipient_bytes32,
            usdc_address
        ).build_transaction({
            'from': account.address,
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(account.address)
        })

        print(f"   Gas limit: {burn_tx['gas']:,}")
        print(f"   Gas price: {burn_tx['gasPrice'] / 10**9:.2f} Gwei")

        signed_burn = account.sign_transaction(burn_tx)
        burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)

        print(f"   ✅ Transaction submitted: {burn_tx_hash.hex()}")

        # Wait for confirmation
        burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

        if burn_receipt.status == 1:
            print(f"   ✅ Transaction confirmed in block {burn_receipt.blockNumber}")
            print(f"   ⛽ Gas used: {burn_receipt.gasUsed:,}")

            # Check balance change
            new_balance_wei = usdc_contract.functions.balanceOf(account.address).call()
            new_balance_usdc = new_balance_wei / 10**6
            burned_amount = balance_usdc - new_balance_usdc

            print(f"   💰 Balance before: {balance_usdc:.6f} USDC")
            print(f"   💰 Balance after: {new_balance_usdc:.6f} USDC")
            print(f"   🔥 Amount burned: {burned_amount:.6f} USDC")

            if abs(burned_amount - amount) < 0.001:
                print(f"   🎉 SUCCESS! CCTP burn completed correctly")
                return burn_tx_hash.hex()
            else:
                print(f"   ⚠️ Unexpected burn amount")
        else:
            print(f"   ❌ Transaction failed")
            print(f"   📋 Logs: {len(burn_receipt.logs)}")

    except Exception as e:
        print(f"   ❌ Transaction error: {e}")

    return None

if __name__ == "__main__":
    asyncio.run(debug_burn_revert())