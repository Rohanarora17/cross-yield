#!/usr/bin/env python3
"""Test CCTP from Ethereum Sepolia to see if it works better"""

import os
from web3 import Web3
from eth_account import Account
import sys

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def test_ethereum_sepolia_cctp():
    """Test CCTP from Ethereum Sepolia to Base Sepolia"""

    print("🔍 TESTING CCTP FROM ETHEREUM SEPOLIA")
    print("=" * 60)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    # Use Ethereum Sepolia as source
    source_chain = "ethereum_sepolia"
    config = cctp.chain_configs[source_chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔑 Wallet: {account.address}")
    print(f"🔗 Source Chain: {source_chain}")
    print(f"📊 Block: {w3.eth.block_number}")
    print()

    # Check balance on Ethereum Sepolia
    usdc_address = w3.to_checksum_address(config.usdc_address)
    usdc_contract = w3.eth.contract(address=usdc_address, abi=cctp.usdc_abi)

    try:
        balance_wei = usdc_contract.functions.balanceOf(account.address).call()
        balance_usdc = balance_wei / 10**6
        print(f"💰 USDC Balance on {source_chain}: {balance_usdc:.6f} USDC")

        if balance_usdc < 0.1:
            print("❌ Insufficient balance for test")
            return

        # Try a small transfer from Ethereum Sepolia to Base Sepolia
        token_messenger_address = w3.to_checksum_address(config.token_messenger_address)
        token_messenger = w3.eth.contract(
            address=token_messenger_address,
            abi=cctp.token_messenger_abi
        )

        # Check allowance
        allowance_wei = usdc_contract.functions.allowance(account.address, token_messenger_address).call()
        allowance_usdc = allowance_wei / 10**6
        print(f"📝 Current Allowance: {allowance_usdc:.6f} USDC")

        amount = 0.5  # 0.5 USDC
        amount_wei = int(amount * 10**6)

        if allowance_usdc < amount:
            print(f"📝 Approving {amount * 2} USDC...")
            approve_tx = usdc_contract.functions.approve(
                token_messenger_address,
                amount_wei * 2
            ).build_transaction({
                'from': account.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            signed_approve = account.sign_transaction(approve_tx)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            print(f"✅ Approval TX: {approve_tx_hash.hex()}")

            # Wait for confirmation
            approve_receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
            if approve_receipt.status != 1:
                print("❌ Approval failed")
                return

        # Test burn from Ethereum Sepolia to Base Sepolia
        dest_domain = cctp._get_domain("base_sepolia")  # Base Sepolia domain
        recipient_bytes32 = "0x" + "0" * 24 + account.address[2:].lower()

        print(f"\n🧪 TESTING BURN TRANSACTION:")
        print(f"   From: {source_chain} (domain 0)")
        print(f"   To: base_sepolia (domain {dest_domain})")
        print(f"   Amount: {amount} USDC")
        print(f"   Recipient: {recipient_bytes32}")

        # Try the burn
        try:
            print(f"   🧪 Simulating...")
            result = token_messenger.functions.depositForBurn(
                amount_wei,
                dest_domain,
                recipient_bytes32,
                usdc_address
            ).call({'from': account.address})
            print(f"   ✅ Simulation successful! Nonce: {result}")

            # Execute actual transaction
            print(f"   🚀 Executing...")
            burn_tx = token_messenger.functions.depositForBurn(
                amount_wei,
                dest_domain,
                recipient_bytes32,
                usdc_address
            ).build_transaction({
                'from': account.address,
                'gas': 300000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(account.address)
            })

            signed_burn = account.sign_transaction(burn_tx)
            burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)
            print(f"   🔥 Burn TX: {burn_tx_hash.hex()}")

            # Wait for confirmation
            burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

            if burn_receipt.status == 1:
                print(f"   🎉 SUCCESS! Burn confirmed in block {burn_receipt.blockNumber}")
                print(f"   ⛽ Gas used: {burn_receipt.gasUsed:,}")
                print(f"   📋 Logs: {len(burn_receipt.logs)}")

                # Check balance change
                new_balance_wei = usdc_contract.functions.balanceOf(account.address).call()
                new_balance_usdc = new_balance_wei / 10**6
                burned = balance_usdc - new_balance_usdc

                print(f"   💰 Balance: {balance_usdc:.6f} → {new_balance_usdc:.6f}")
                print(f"   🔥 Burned: {burned:.6f} USDC")

                if abs(burned - amount) < 0.001:
                    print(f"   🎯 Perfect burn amount!")
                    return burn_tx_hash.hex()

            else:
                print(f"   ❌ Burn transaction failed")

        except Exception as e:
            print(f"   ❌ Burn error: {e}")

    except Exception as e:
        print(f"❌ Setup error: {e}")

    return None

if __name__ == "__main__":
    result = test_ethereum_sepolia_cctp()
    if result:
        print(f"\n🎉 SUCCESS! Ethereum Sepolia burn works: {result}")
        print("💡 Issue might be specific to Base Sepolia as source chain")
    else:
        print(f"\n😞 Ethereum Sepolia burn also failed")
        print("💡 Issue might be with our setup or CCTP testnet status")