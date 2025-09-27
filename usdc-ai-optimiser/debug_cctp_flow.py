#!/usr/bin/env python3
"""Debug CCTP flow - Check what happened to the USDC"""

import asyncio
import sys
import os
from web3 import Web3
from eth_account import Account
import aiohttp

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def debug_burn_transaction(cctp, tx_hash, chain):
    """Debug a burn transaction to see what actually happened"""

    print(f"🔍 DEBUGGING BURN TRANSACTION")
    print(f"   TX Hash: {tx_hash}")
    print(f"   Chain: {chain}")
    print()

    try:
        config = cctp.chain_configs[chain]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        # Get transaction details
        tx = w3.eth.get_transaction(tx_hash)
        receipt = w3.eth.get_transaction_receipt(tx_hash)

        print(f"📊 Transaction Details:")
        print(f"   Status: {'✅ Success' if receipt.status == 1 else '❌ Failed'}")
        print(f"   Block: {receipt.blockNumber}")
        print(f"   Gas Used: {receipt.gasUsed}")
        print(f"   From: {tx['from']}")
        print(f"   To: {tx['to']}")
        print(f"   Value: {w3.from_wei(tx['value'], 'ether')} ETH")
        print()

        print(f"📋 Transaction Logs ({len(receipt.logs)} total):")
        for i, log in enumerate(receipt.logs):
            print(f"   Log {i}:")
            print(f"      Address: {log.address}")
            print(f"      Topics: {len(log.topics)}")
            if len(log.topics) > 0:
                print(f"         Topic 0: {log.topics[0].hex()}")
            if len(log.topics) > 1:
                print(f"         Topic 1: {log.topics[1].hex()}")
            if len(log.topics) > 2:
                print(f"         Topic 2: {log.topics[2].hex()}")
            print(f"      Data Length: {len(log.data)} bytes")
            print()

        # Check if this looks like a CCTP burn transaction
        token_messenger_address = config.token_messenger_address.lower()
        usdc_address = config.usdc_address.lower()

        burn_found = False
        transfer_found = False

        for log in receipt.logs:
            if log.address.lower() == token_messenger_address:
                print(f"✅ Found TokenMessenger interaction")
                burn_found = True
            elif log.address.lower() == usdc_address:
                print(f"✅ Found USDC contract interaction")
                transfer_found = True

        if burn_found and transfer_found:
            print(f"🎯 This looks like a valid CCTP burn transaction")
        else:
            print(f"⚠️ This might not be a complete CCTP burn")

        return receipt

    except Exception as e:
        print(f"❌ Error debugging transaction: {e}")
        return None

async def check_balance_changes(cctp, address, expected_change_chain, expected_amount):
    """Check if balance actually changed on source chain"""

    print(f"💰 CHECKING BALANCE CHANGES")
    print()

    config = cctp.chain_configs[expected_change_chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    usdc_contract = w3.eth.contract(
        address=w3.to_checksum_address(config.usdc_address),
        abi=cctp.usdc_abi
    )

    current_balance_wei = usdc_contract.functions.balanceOf(address).call()
    current_balance = current_balance_wei / 10**6

    print(f"📊 Current balance on {expected_change_chain}: {current_balance:.6f} USDC")

    # The balance should have decreased by the burn amount
    print(f"💡 Expected: Balance should have decreased by ~{expected_amount} USDC if burn was successful")

    return current_balance

async def check_circle_api_direct(tx_hash):
    """Check Circle's API directly with different endpoints"""

    print(f"🌐 CHECKING CIRCLE API DIRECTLY")
    print()

    endpoints_to_try = [
        f"https://iris-api-sandbox.circle.com/attestations/{tx_hash}",
        f"https://iris-api.circle.com/attestations/{tx_hash}",  # Try production
    ]

    for i, url in enumerate(endpoints_to_try, 1):
        print(f"📡 Trying endpoint {i}: {url.split('/')[2]}")

        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    print(f"   Status: {response.status}")

                    if response.status == 200:
                        data = await response.json()
                        print(f"   ✅ Response received:")
                        print(f"      Status: {data.get('status', 'unknown')}")
                        if 'message' in data:
                            print(f"      Message: {data['message'][:50]}...")
                        if 'attestation' in data:
                            print(f"      Attestation: {data['attestation'][:50]}...")
                        return data
                    elif response.status == 404:
                        print(f"   ⏳ Transaction not found")
                    else:
                        text = await response.text()
                        print(f"   ⚠️ Error: {text[:100]}")

        except Exception as e:
            print(f"   ❌ Request failed: {e}")

        print()

    return None

async def main():
    """Debug the CCTP flow"""

    print("🐛 CCTP FLOW DEBUGGING")
    print("=" * 50)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found")
        return

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    print(f"🔑 Wallet: {account.address}")
    print()

    # Debug the most recent burn transaction
    recent_burn = {
        "tx_hash": "0xd7308a271c4a11c1a5121bba6f5337162b8fe19b2d41b0163185912b6d01a3b3",
        "chain": "base_sepolia",
        "expected_amount": 0.1
    }

    print("1️⃣ DEBUGGING RECENT BURN TRANSACTION")
    receipt = await debug_burn_transaction(
        cctp,
        recent_burn["tx_hash"],
        recent_burn["chain"]
    )

    print("2️⃣ CHECKING SOURCE CHAIN BALANCE")
    balance = await check_balance_changes(
        cctp,
        account.address,
        recent_burn["chain"],
        recent_burn["expected_amount"]
    )

    print("3️⃣ CHECKING CIRCLE API STATUS")
    api_response = await check_circle_api_direct(recent_burn["tx_hash"])

    print("4️⃣ ANALYSIS")
    print("=" * 30)

    if receipt and receipt.status == 1:
        print("✅ Burn transaction was successful on blockchain")
    else:
        print("❌ Burn transaction failed or not found")

    # The issue: Balance should show as 9.56 if 0.1 was burned from 9.66
    expected_balance = 9.66 - 0.1
    if abs(balance - expected_balance) < 0.01:
        print("✅ USDC was successfully burned (balance decreased)")
        print("⏳ Waiting for Circle attestation to complete mint")
    else:
        print("⚠️ Balance didn't change as expected")
        print(f"   Expected: ~{expected_balance:.2f} USDC")
        print(f"   Actual: {balance:.6f} USDC")

    if api_response:
        print("✅ Circle API found the transaction")
    else:
        print("⏳ Circle API hasn't processed transaction yet")
        print("💡 This is normal - attestations can take 10-20 minutes")

    print()
    print("🎯 NEXT STEPS:")
    if receipt and receipt.status == 1:
        print("1. ✅ Burn transaction successful")
        print("2. ⏳ Wait for Circle attestation (10-20 minutes)")
        print("3. 🔄 Retry mint transaction once attestation is ready")
        print("4. ✅ Verify balance increase on destination chain")
    else:
        print("1. ❌ Need to investigate burn transaction failure")

if __name__ == "__main__":
    asyncio.run(main())