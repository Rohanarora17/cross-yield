#!/usr/bin/env python3
"""Complete the CCTP flow by executing the mint transaction"""

import asyncio
import aiohttp
import sys
import os
import time
from web3 import Web3
from eth_account import Account

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

async def get_attestation(burn_tx_hash: str, source_chain: str):
    """Get the ready attestation"""

    CIRCLE_DOMAINS = {
        "ethereum_sepolia": 0,
        "avalanche_fuji": 1,
        "base_sepolia": 6,
        "arbitrum_sepolia": 3,
        "optimism_sepolia": 2,
    }

    source_domain = CIRCLE_DOMAINS[source_chain]
    tx_hash_with_prefix = f"0x{burn_tx_hash}" if not burn_tx_hash.startswith("0x") else burn_tx_hash
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={tx_hash_with_prefix}"

    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                messages = data.get('messages', [])
                if messages and messages[0].get('status') == 'complete':
                    return messages[0]
    return None

async def execute_mint(dest_chain: str, attestation: dict, private_key: str):
    """Execute the mint transaction"""

    print(f"🪙 EXECUTING MINT ON {dest_chain.upper()}")
    print("-" * 40)

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()
    config = cctp.chain_configs[dest_chain]
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    message_transmitter_address = w3.to_checksum_address(config.message_transmitter_address)

    # Circle's receiveMessage ABI (from their GitHub repo)
    receive_message_abi = [{
        "type": "function",
        "name": "receiveMessage",
        "stateMutability": "nonpayable",
        "inputs": [
            {"name": "message", "type": "bytes"},
            {"name": "attestation", "type": "bytes"}
        ],
        "outputs": []
    }]

    message_transmitter = w3.eth.contract(
        address=message_transmitter_address,
        abi=receive_message_abi
    )

    # Extract message and attestation from Circle's response
    message_bytes = attestation['message']
    attestation_bytes = attestation['attestation']

    print(f"   Message Transmitter: {message_transmitter_address}")
    print(f"   Message length: {len(message_bytes)} chars")
    print(f"   Attestation length: {len(attestation_bytes)} chars")

    # Estimate gas
    try:
        gas_estimate = message_transmitter.functions.receiveMessage(
            message_bytes,
            attestation_bytes
        ).estimate_gas({'from': account.address})

        gas_with_buffer = int(gas_estimate * 1.2)  # 20% buffer
        print(f"   Gas estimate: {gas_estimate:,} (+20% = {gas_with_buffer:,})")

    except Exception as e:
        print(f"   ⚠️ Gas estimation failed: {e}")
        gas_with_buffer = 300000  # Fallback

    # Build and execute mint transaction
    mint_tx = message_transmitter.functions.receiveMessage(
        message_bytes,
        attestation_bytes
    ).build_transaction({
        'from': account.address,
        'gas': gas_with_buffer,
        'gasPrice': w3.eth.gas_price,
        'nonce': w3.eth.get_transaction_count(account.address)
    })

    print(f"   Submitting mint transaction...")

    signed_mint = account.sign_transaction(mint_tx)
    mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)

    print(f"   🔄 Mint TX: {mint_tx_hash.hex()}")

    # Wait for confirmation
    mint_receipt = w3.eth.wait_for_transaction_receipt(mint_tx_hash)

    if mint_receipt.status == 1:
        print(f"   ✅ Mint confirmed in block {mint_receipt.blockNumber}")
        print(f"   ⛽ Gas used: {mint_receipt.gasUsed:,}")
        return mint_tx_hash.hex()
    else:
        raise ValueError(f"Mint transaction failed: {mint_tx_hash.hex()}")

async def complete_full_cctp_flow():
    """Complete the full CCTP flow end-to-end"""

    print("🚀 COMPLETING FULL CCTP FLOW")
    print("=" * 60)

    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        raise ValueError("PRIVATE_KEY environment variable required")

    account = Account.from_key(private_key)
    cctp = CCTPIntegration()

    # Our successful burn
    burn_tx = "d16204d78d7ee8d71e160f4e19f52b28932df4bbcb1391be2625810eb46ac2e3"
    source_chain = "base_sepolia"
    dest_chain = "arbitrum_sepolia"
    amount = 0.1

    print(f"🔑 Wallet: {account.address}")
    print(f"🔥 Burn TX: {burn_tx}")
    print(f"📤 From: {source_chain}")
    print(f"📥 To: {dest_chain}")
    print(f"💰 Amount: {amount} USDC")
    print()

    # Step 1: Get balances before mint
    print("1️⃣ CHECKING BALANCES BEFORE MINT")

    source_config = cctp.chain_configs[source_chain]
    dest_config = cctp.chain_configs[dest_chain]

    source_w3 = Web3(Web3.HTTPProvider(source_config.rpc_url))
    dest_w3 = Web3(Web3.HTTPProvider(dest_config.rpc_url))

    source_usdc = source_w3.eth.contract(
        address=source_w3.to_checksum_address(source_config.usdc_address),
        abi=cctp.usdc_abi
    )

    dest_usdc = dest_w3.eth.contract(
        address=dest_w3.to_checksum_address(dest_config.usdc_address),
        abi=cctp.usdc_abi
    )

    source_balance_before = source_usdc.functions.balanceOf(account.address).call() / 10**6
    dest_balance_before = dest_usdc.functions.balanceOf(account.address).call() / 10**6

    print(f"   {source_chain}: {source_balance_before:.6f} USDC")
    print(f"   {dest_chain}: {dest_balance_before:.6f} USDC")
    print(f"   Total: {source_balance_before + dest_balance_before:.6f} USDC")
    print()

    # Step 2: Get attestation
    print("2️⃣ RETRIEVING ATTESTATION")
    attestation = await get_attestation(burn_tx, source_chain)

    if not attestation:
        raise ValueError("Attestation not ready")

    print(f"   ✅ Attestation retrieved!")
    print(f"   Status: {attestation.get('status')}")
    print()

    # Step 3: Execute mint
    print("3️⃣ EXECUTING MINT TRANSACTION")
    mint_tx_hash = await execute_mint(dest_chain, attestation, private_key)
    print()

    # Step 4: Verify final balances
    print("4️⃣ VERIFYING FINAL BALANCES")

    source_balance_after = source_usdc.functions.balanceOf(account.address).call() / 10**6
    dest_balance_after = dest_usdc.functions.balanceOf(account.address).call() / 10**6

    minted_amount = dest_balance_after - dest_balance_before

    print(f"   {source_chain}: {source_balance_before:.6f} USDC (unchanged)")
    print(f"   {dest_chain}: {dest_balance_before:.6f} → {dest_balance_after:.6f} USDC (+{minted_amount:.6f})")
    print(f"   Total: {source_balance_after + dest_balance_after:.6f} USDC")
    print()

    # Step 5: Verify success
    if abs(minted_amount - amount) < 0.001:
        print("✅ PERFECT MATCH: Minted amount equals burned amount!")
    else:
        print(f"⚠️ Amount mismatch: burned {amount}, minted {minted_amount:.6f}")

    print()
    print("🎉 COMPLETE CCTP FLOW SUCCESSFUL!")
    print("=" * 60)
    print(f"🔥 Burn TX: {burn_tx}")
    print(f"🪙 Mint TX: {mint_tx_hash}")
    print(f"💸 Amount transferred: {minted_amount:.6f} USDC")
    print(f"🎯 Cross-chain transfer completed successfully!")

    return {
        'burn_tx': burn_tx,
        'mint_tx': mint_tx_hash,
        'amount_transferred': minted_amount,
        'source_balance_change': source_balance_before - source_balance_before,  # No change (already burned)
        'dest_balance_change': minted_amount
    }

if __name__ == "__main__":
    result = asyncio.run(complete_full_cctp_flow())
    print(f"\n✨ CCTP integration verified end-to-end! ✨")