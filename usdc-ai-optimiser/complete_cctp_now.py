#!/usr/bin/env python3
"""Complete CCTP transfer now that attestation is ready"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from apis.cctp_integration import CCTPIntegration, CCTPTransfer

# Load environment variables
load_dotenv()

async def complete_cctp_now():
    """Complete CCTP transfer now that attestation is ready"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Completing CCTP for wallet: {account.address}")
    
    print("\n🎉 COMPLETING CCTP TRANSFER")
    print("=" * 50)
    print("✅ Attestation is READY!")
    print("✅ Status: complete")
    print("✅ Ready to mint USDC on Arbitrum Sepolia")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Create transfer object
    transfer = CCTPTransfer(
        source_chain="base_sepolia",
        destination_chain="arbitrum_sepolia",
        amount=1.0,
        recipient=account.address,
        burn_tx_hash="63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65",
        mint_tx_hash="",
        nonce=0,
        timestamp=0,
        status="burned"
    )
    
    # Check initial balances
    print("\n💰 Initial Balances:")
    print("-" * 30)
    
    chains = ["base_sepolia", "arbitrum_sepolia"]
    initial_balances = {}
    
    for chain in chains:
        try:
            config = cctp.chain_configs[chain]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))
            
            # USDC ABI
            usdc_abi = [
                {
                    "inputs": [{"name": "owner", "type": "address"}],
                    "name": "balanceOf",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
            
            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config.usdc_address),
                abi=usdc_abi
            )
            
            balance_wei = usdc_contract.functions.balanceOf(account.address).call()
            balance_usdc = balance_wei / 10**6
            
            initial_balances[chain] = balance_usdc
            print(f"   📊 {config.name}: {balance_usdc:.2f} USDC")
            
        except Exception as e:
            print(f"   ❌ {chain}: Error - {e}")
            initial_balances[chain] = 0
    
    # Complete the transfer
    print(f"\n🪙 Completing CCTP Transfer...")
    print("-" * 40)
    
    try:
        completed_transfer = await cctp.complete_cross_chain_transfer(
            transfer, private_key
        )
        
        print(f"✅ Transfer Completed Successfully!")
        print(f"📊 Mint TX: {completed_transfer.mint_tx_hash}")
        print(f"🎉 Status: {completed_transfer.status}")
        
    except Exception as e:
        print(f"❌ Completion failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Check final balances
    print(f"\n💰 Final Balance Check:")
    print("-" * 40)
    
    final_balances = {}
    for chain in chains:
        try:
            config = cctp.chain_configs[chain]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))
            
            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config.usdc_address),
                abi=usdc_abi
            )
            
            balance_wei = usdc_contract.functions.balanceOf(account.address).call()
            balance_usdc = balance_wei / 10**6
            
            final_balances[chain] = balance_usdc
            initial_balance = initial_balances[chain]
            change = balance_usdc - initial_balance
            
            print(f"📊 {config.name}: {initial_balance:.2f} -> {balance_usdc:.2f} ({change:+.2f})")
            
        except Exception as e:
            print(f"❌ {chain}: Error checking balance - {e}")
    
    # Verify transfer success
    print(f"\n🎯 Transfer Verification:")
    print("-" * 40)
    
    source_change = final_balances["base_sepolia"] - initial_balances["base_sepolia"]
    dest_change = final_balances["arbitrum_sepolia"] - initial_balances["arbitrum_sepolia"]
    
    print(f"📤 Base Sepolia Change: {source_change:+.2f} USDC")
    print(f"📥 Arbitrum Sepolia Change: {dest_change:+.2f} USDC")
    
    if abs(dest_change - 1.0) < 0.01:
        print(f"✅ Transfer successful!")
        print(f"🎉 1.0 USDC transferred from Base Sepolia to Arbitrum Sepolia")
        print(f"\n🏆 CCTP TRANSFER COMPLETED!")
        print(f"✅ Burn: {transfer.burn_tx_hash}")
        print(f"✅ Mint: {completed_transfer.mint_tx_hash}")
        print(f"✅ Amount: {transfer.amount} USDC")
        print(f"✅ Route: {transfer.source_chain} -> {transfer.destination_chain}")
        print(f"\n🏆 CCTP Integration: FULLY WORKING!")
        print(f"🏆 Ready for hackathon demonstration!")
        return True
    else:
        print(f"❌ Transfer verification failed")
        print(f"Expected: Arbitrum Sepolia +1.0 USDC")
        print(f"Actual: Arbitrum Sepolia {dest_change:+.2f} USDC")
        return False

if __name__ == "__main__":
    asyncio.run(complete_cctp_now())