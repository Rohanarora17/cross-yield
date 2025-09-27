#!/usr/bin/env python3
"""Complete CCTP Integration Test - Cross-Chain USDC Transfers"""

import asyncio
import sys
import os
from web3 import Web3
from eth_account import Account

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration, CCTPTransfer

async def check_balances(cctp: CCTPIntegration, address: str):
    """Check USDC balances across all testnet chains"""

    print(f"💰 USDC Balances for {address}")
    print("=" * 60)

    testnet_chains = ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]
    total_balance = 0

    for chain in testnet_chains:
        try:
            config = cctp.chain_configs[chain]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))

            # USDC contract
            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config.usdc_address),
                abi=cctp.usdc_abi
            )

            # Get balance
            balance_wei = usdc_contract.functions.balanceOf(address).call()
            balance_usdc = balance_wei / 10**6  # USDC has 6 decimals
            total_balance += balance_usdc

            print(f"   {chain:20}: {balance_usdc:8.2f} USDC")

        except Exception as e:
            print(f"   {chain:20}: Error - {e}")

    print(f"   {'Total':20}: {total_balance:8.2f} USDC")
    print()

    return total_balance

async def test_cross_chain_transfer():
    """Test complete cross-chain transfer flow"""

    print("🌉 CCTP CROSS-CHAIN TRANSFER TEST")
    print("=" * 70)

    # Get private key from environment
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment variables")
        return

    # Get account from private key
    account = Account.from_key(private_key)
    print(f"📧 Testing with address: {account.address}")

    # Initialize CCTP
    cctp = CCTPIntegration()

    # Check initial balances
    print("\\n1️⃣ INITIAL BALANCE CHECK")
    initial_balance = await check_balances(cctp, account.address)

    if initial_balance < 1.0:
        print("❌ Insufficient USDC balance for testing (need at least 1 USDC)")
        print("💡 Please fund your account with testnet USDC from Circle's faucet:")
        print("   https://faucet.circle.com/")
        return

    # Test transfer scenarios
    test_scenarios = [
        {
            "name": "Base → Arbitrum",
            "source": "base_sepolia",
            "destination": "arbitrum_sepolia",
            "amount": 0.1
        },
        {
            "name": "Arbitrum → Ethereum",
            "source": "arbitrum_sepolia",
            "destination": "ethereum_sepolia",
            "amount": 0.1
        },
        {
            "name": "Ethereum → Base",
            "source": "ethereum_sepolia",
            "destination": "base_sepolia",
            "amount": 0.1
        }
    ]

    successful_transfers = []

    for i, scenario in enumerate(test_scenarios, 1):
        print(f"\\n{i+1}️⃣ TESTING TRANSFER: {scenario['name']}")
        print("-" * 50)

        try:
            # Initiate transfer
            print(f"🚀 Initiating {scenario['amount']} USDC transfer...")
            transfer = await cctp.initiate_cross_chain_transfer(
                source_chain=scenario["source"],
                destination_chain=scenario["destination"],
                amount=scenario["amount"],
                recipient=account.address,
                private_key=private_key
            )

            print(f"✅ Transfer initiated successfully!")
            print(f"   🔥 Burn Transaction: {transfer.burn_tx_hash}")
            print(f"   📊 Nonce: {transfer.nonce}")

            successful_transfers.append(transfer)

        except Exception as e:
            print(f"❌ Transfer failed: {e}")
            continue

    if not successful_transfers:
        print("\\n❌ No successful transfers to complete")
        return

    print(f"\\n3️⃣ WAITING FOR ATTESTATIONS AND COMPLETING TRANSFERS")
    print("-" * 50)

    completed_transfers = []

    for i, transfer in enumerate(successful_transfers, 1):
        print(f"\\n🔄 Completing transfer {i}/{len(successful_transfers)}")
        print(f"   From: {transfer.source_chain}")
        print(f"   To: {transfer.destination_chain}")
        print(f"   Amount: {transfer.amount} USDC")

        try:
            # Complete the transfer (includes waiting for attestation)
            completed_transfer = await cctp.complete_cross_chain_transfer(
                transfer=transfer,
                private_key=private_key
            )

            print(f"✅ Transfer completed!")
            print(f"   🪙 Mint Transaction: {completed_transfer.mint_tx_hash}")

            completed_transfers.append(completed_transfer)

        except Exception as e:
            print(f"❌ Transfer completion failed: {e}")
            print(f"   This may be due to attestation delays - try completing manually later")

    print(f"\\n4️⃣ FINAL BALANCE CHECK")
    print("-" * 50)
    final_balance = await check_balances(cctp, account.address)

    # Summary
    print(f"\\n📊 TEST SUMMARY")
    print("=" * 50)
    print(f"   Initial Balance: {initial_balance:.2f} USDC")
    print(f"   Final Balance: {final_balance:.2f} USDC")
    print(f"   Transfers Initiated: {len(successful_transfers)}")
    print(f"   Transfers Completed: {len(completed_transfers)}")

    if len(completed_transfers) > 0:
        print("\\n🎉 CCTP INTEGRATION IS WORKING!")
        print("   ✅ Cross-chain transfers successful")
        print("   ✅ Attestation API working")
        print("   ✅ Contract interactions successful")
    else:
        print("\\n⚠️ PARTIAL SUCCESS")
        print("   ✅ Burn transactions successful")
        print("   ⚠️ Mint transactions may need manual completion")
        print("   💡 Check Circle's attestation API for delays")

async def test_cctp_configuration():
    """Test CCTP configuration and connectivity"""

    print("\\n🔧 CCTP CONFIGURATION TEST")
    print("=" * 50)

    cctp = CCTPIntegration()

    testnet_chains = ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]

    for chain in testnet_chains:
        print(f"\\n🔗 Testing {chain}:")

        try:
            config = cctp.chain_configs[chain]
            print(f"   Chain ID: {config.chain_id}")
            print(f"   USDC Address: {config.usdc_address}")
            print(f"   TokenMessenger: {config.token_messenger_address}")
            print(f"   MessageTransmitter: {config.message_transmitter_address}")
            print(f"   Domain: {cctp._get_domain(chain)}")

            # Test RPC connectivity
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))
            block_number = w3.eth.block_number
            print(f"   ✅ RPC Connected - Block: {block_number}")

        except Exception as e:
            print(f"   ❌ Error: {e}")

async def main():
    """Main test function"""

    print("🚀 COMPLETE CCTP INTEGRATION TEST")
    print("=" * 70)
    print("This test will:")
    print("   1. Check USDC balances on all testnet chains")
    print("   2. Test cross-chain transfers between chains")
    print("   3. Wait for attestations and complete transfers")
    print("   4. Verify final balances")
    print()

    # Test configuration first
    await test_cctp_configuration()

    # Test cross-chain transfers
    await test_cross_chain_transfer()

if __name__ == "__main__":
    asyncio.run(main())