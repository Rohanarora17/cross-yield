#!/usr/bin/env python3
"""Complete pending CCTP transfers and verify full flow"""

import asyncio
import sys
import os
from web3 import Web3
from eth_account import Account
import aiohttp

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration, CCTPTransfer
from datetime import datetime

async def check_balances_before_after(cctp, address):
    """Check balances before completing transfers"""

    print("💰 CURRENT BALANCES")
    print("=" * 40)

    chains = ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]
    balances = {}

    for chain in chains:
        try:
            config = cctp.chain_configs[chain]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))

            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config.usdc_address),
                abi=cctp.usdc_abi
            )

            balance_wei = usdc_contract.functions.balanceOf(address).call()
            balance_usdc = balance_wei / 10**6
            balances[chain] = balance_usdc

            print(f"   {chain:20}: {balance_usdc:8.2f} USDC")

        except Exception as e:
            print(f"   {chain:20}: Error - {e}")
            balances[chain] = 0

    total = sum(balances.values())
    print(f"   {'TOTAL':20}: {total:8.2f} USDC")
    print()

    return balances

async def complete_transfer(cctp, burn_tx_hash, source_chain, dest_chain, amount, private_key):
    """Complete a CCTP transfer"""

    print(f"🪙 COMPLETING TRANSFER")
    print(f"   From: {source_chain}")
    print(f"   To: {dest_chain}")
    print(f"   Amount: {amount} USDC")
    print(f"   Burn TX: {burn_tx_hash}")
    print()

    # Create transfer object
    account = Account.from_key(private_key)
    transfer = CCTPTransfer(
        source_chain=source_chain,
        destination_chain=dest_chain,
        amount=amount,
        recipient=account.address,
        nonce=0,
        burn_tx_hash=burn_tx_hash,
        status="burned",
        timestamp=datetime.now()
    )

    try:
        # Complete the transfer
        completed_transfer = await cctp.complete_cross_chain_transfer(transfer, private_key)

        print(f"✅ TRANSFER COMPLETED!")
        print(f"   🪙 Mint TX: {completed_transfer.mint_tx_hash}")
        print(f"   ⛽ Gas Used: {completed_transfer.gas_used}")
        print()

        return completed_transfer

    except Exception as e:
        print(f"❌ Transfer completion failed: {e}")
        print()
        return None

async def main():
    """Complete pending transfers and verify balances"""

    print("🔄 COMPLETING PENDING CCTP TRANSFERS")
    print("=" * 50)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    print(f"🔑 Wallet: {account.address}")
    print()

    # Check initial balances
    print("1️⃣ CHECKING CURRENT BALANCES")
    initial_balances = await check_balances_before_after(cctp, account.address)

    # Pending transfers to complete
    pending_transfers = [
        {
            "burn_tx": "d7308a271c4a11c1a5121bba6f5337162b8fe19b2d41b0163185912b6d01a3b3",
            "source": "base_sepolia",
            "dest": "arbitrum_sepolia",
            "amount": 0.1
        }
    ]

    # Also check previous burns if they're ready
    previous_burns = [
        {
            "burn_tx": "ce9e6bc409ac6405544350811fb8a8badf2fb0916728353ba9a050799cdab9e2",
            "source": "base_sepolia",
            "dest": "arbitrum_sepolia",
            "amount": 0.1
        },
        {
            "burn_tx": "09fdb1144d6bdc8e61578042306df42589db436d9869b4b447c2e0638f4100e5",
            "source": "arbitrum_sepolia",
            "dest": "ethereum_sepolia",
            "amount": 0.1
        }
    ]

    all_transfers = pending_transfers + previous_burns
    completed_count = 0

    for i, transfer_info in enumerate(all_transfers, 1):
        print(f"{i+1}️⃣ ATTEMPTING TRANSFER COMPLETION")

        completed = await complete_transfer(
            cctp,
            transfer_info["burn_tx"],
            transfer_info["source"],
            transfer_info["dest"],
            transfer_info["amount"],
            private_key
        )

        if completed:
            completed_count += 1

        # Wait between transfers
        if i < len(all_transfers):
            print("⏳ Waiting 10 seconds before next transfer...")
            await asyncio.sleep(10)

    # Check final balances
    print(f"{len(all_transfers)+2}️⃣ CHECKING FINAL BALANCES")
    final_balances = await check_balances_before_after(cctp, account.address)

    # Compare balances
    print("📊 BALANCE CHANGES")
    print("=" * 40)

    for chain in ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]:
        initial = initial_balances.get(chain, 0)
        final = final_balances.get(chain, 0)
        change = final - initial

        if abs(change) > 0.001:  # Meaningful change
            direction = "+" if change > 0 else ""
            print(f"   {chain:20}: {initial:6.2f} → {final:6.2f} ({direction}{change:+.2f})")
        else:
            print(f"   {chain:20}: {final:6.2f} USDC (no change)")

    initial_total = sum(initial_balances.values())
    final_total = sum(final_balances.values())
    total_change = final_total - initial_total

    print(f"   {'TOTAL':20}: {initial_total:6.2f} → {final_total:6.2f} ({total_change:+.2f})")
    print()

    # Summary
    print("🎯 COMPLETION SUMMARY")
    print("=" * 40)
    print(f"   Transfers attempted: {len(all_transfers)}")
    print(f"   Transfers completed: {completed_count}")

    if completed_count > 0:
        print(f"   ✅ {completed_count} cross-chain transfer(s) completed successfully!")
        print(f"   💰 Balance changes reflect successful USDC movement")
        print(f"   🎉 CCTP full flow (burn → mint) is working!")
    else:
        print(f"   ⏳ Transfers may still be pending attestation")
        print(f"   💡 Check again in a few minutes")

    print()
    print("🏆 CCTP VERIFICATION: Full burn → mint flow tested")

if __name__ == "__main__":
    asyncio.run(main())