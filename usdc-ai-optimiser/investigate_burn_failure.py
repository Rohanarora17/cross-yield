#!/usr/bin/env python3
"""Investigate why burn transaction failed"""

import asyncio
import sys
import os
from web3 import Web3
from eth_account import Account

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def investigate_failed_burn():
    """Investigate why the burn transaction failed"""

    print("🔍 INVESTIGATING BURN TRANSACTION FAILURE")
    print("=" * 50)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    # Check the failed transaction
    failed_tx = "0xd7308a271c4a11c1a5121bba6f5337162b8fe19b2d41b0163185912b6d01a3b3"
    chain = "base_sepolia"

    config = cctp.chain_configs[chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔑 Wallet: {account.address}")
    print(f"🔗 Chain: {chain}")
    print(f"💸 Failed TX: {failed_tx}")
    print()

    try:
        # Get transaction details
        tx = w3.eth.get_transaction(failed_tx)
        receipt = w3.eth.get_transaction_receipt(failed_tx)

        print("📊 TRANSACTION ANALYSIS")
        print("=" * 30)
        print(f"   Status: {'Success' if receipt.status == 1 else 'FAILED'}")
        print(f"   Gas Limit: {tx['gas']:,}")
        print(f"   Gas Used: {receipt.gasUsed:,}")
        print(f"   Gas Price: {tx['gasPrice'] / 10**9:.2f} Gwei")
        print(f"   Block: {receipt.blockNumber}")
        print()

        # Check current USDC balance and allowance
        print("💰 CHECKING CURRENT STATE")
        print("=" * 30)

        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(config.usdc_address),
            abi=cctp.usdc_abi
        )

        # Check balance
        balance_wei = usdc_contract.functions.balanceOf(account.address).call()
        balance_usdc = balance_wei / 10**6
        print(f"   USDC Balance: {balance_usdc:.6f} USDC")

        # Check allowance to TokenMessenger
        allowance_wei = usdc_contract.functions.allowance(
            account.address,
            w3.to_checksum_address(config.token_messenger_address)
        ).call()
        allowance_usdc = allowance_wei / 10**6
        print(f"   Allowance to TokenMessenger: {allowance_usdc:.6f} USDC")

        # Try to simulate the transaction to see what would happen
        print()
        print("🧪 SIMULATING CORRECTED TRANSACTION")
        print("=" * 30)

        # Check if we need to approve first
        amount = 0.1
        amount_wei = int(amount * 10**6)

        if allowance_wei < amount_wei:
            print(f"⚠️ Insufficient allowance for transfer")
            print(f"   Required: {amount} USDC")
            print(f"   Current allowance: {allowance_usdc:.6f} USDC")
            print(f"   Need to approve: {amount - allowance_usdc:.6f} USDC")

            # Try to approve
            print("   🔄 Attempting approval...")
            try:
                approve_tx = usdc_contract.functions.approve(
                    w3.to_checksum_address(config.token_messenger_address),
                    amount_wei * 2  # Approve double to avoid rounding issues
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
                print(f"   ✅ Approval confirmed in block {approve_receipt.blockNumber}")

                # Check new allowance
                new_allowance_wei = usdc_contract.functions.allowance(
                    account.address,
                    w3.to_checksum_address(config.token_messenger_address)
                ).call()
                new_allowance_usdc = new_allowance_wei / 10**6
                print(f"   ✅ New allowance: {new_allowance_usdc:.6f} USDC")

            except Exception as e:
                print(f"   ❌ Approval failed: {e}")
                return

        # Now try the burn transaction
        print()
        print("🔥 ATTEMPTING CORRECTED BURN TRANSACTION")
        print("=" * 30)

        try:
            # Use the correct method parameters
            token_messenger = w3.eth.contract(
                address=w3.to_checksum_address(config.token_messenger_address),
                abi=cctp.token_messenger_abi
            )

            destination_domain = cctp._get_domain("arbitrum_sepolia")
            recipient_bytes32 = "0x" + "0" * 24 + account.address[2:]  # Pad to 32 bytes

            print(f"   Amount: {amount} USDC ({amount_wei} wei)")
            print(f"   Destination domain: {destination_domain}")
            print(f"   Recipient: {account.address}")
            print(f"   Recipient (bytes32): {recipient_bytes32}")

            # Build transaction
            burn_tx = token_messenger.functions.depositForBurn(
                amount_wei,
                destination_domain,
                recipient_bytes32,
                w3.to_checksum_address(config.usdc_address)
            ).build_transaction({
                'from': account.address,
                'gas': 200000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            print(f"   Gas limit: {burn_tx['gas']:,}")
            print(f"   Gas price: {burn_tx['gasPrice'] / 10**9:.2f} Gwei")

            # Send transaction
            signed_burn = account.sign_transaction(burn_tx)
            burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)

            print(f"   ✅ Burn transaction submitted: {burn_tx_hash.hex()}")

            # Wait for confirmation
            burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

            if burn_receipt.status == 1:
                print(f"   ✅ Burn transaction confirmed in block {burn_receipt.blockNumber}")
                print(f"   ⛽ Gas used: {burn_receipt.gasUsed:,}")

                # Check balance after burn
                new_balance_wei = usdc_contract.functions.balanceOf(account.address).call()
                new_balance_usdc = new_balance_wei / 10**6
                burned_amount = balance_usdc - new_balance_usdc

                print(f"   💰 Balance before: {balance_usdc:.6f} USDC")
                print(f"   💰 Balance after: {new_balance_usdc:.6f} USDC")
                print(f"   🔥 Amount burned: {burned_amount:.6f} USDC")

                if abs(burned_amount - amount) < 0.001:
                    print(f"   🎉 SUCCESS! USDC burned correctly")
                    return burn_tx_hash.hex()
                else:
                    print(f"   ⚠️ Unexpected burn amount")

            else:
                print(f"   ❌ Burn transaction failed")

        except Exception as e:
            print(f"   ❌ Burn transaction error: {e}")

    except Exception as e:
        print(f"❌ Investigation failed: {e}")

    return None

async def main():
    """Main investigation function"""

    result = await investigate_failed_burn()

    if result:
        print(f"\n🎉 FIXED! New burn transaction: {result}")
        print("\n⏳ Now wait 10-20 minutes for Circle attestation")
        print("🔄 Then run the completion script to mint on destination chain")
    else:
        print(f"\n🔧 Investigation complete - check the issues above")

if __name__ == "__main__":
    asyncio.run(main())