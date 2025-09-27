#!/usr/bin/env python3
"""Complete the pending CCTP transfer"""

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

async def complete_cctp_transfer():
    """Complete the pending CCTP transfer"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Completing transfer for wallet: {account.address}")
    
    print("\n🔄 Completing Pending CCTP Transfer")
    print("=" * 50)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Check current balances
    print("\n💰 Current USDC Balances:")
    print("-" * 30)
    
    chains = ["base_sepolia", "arbitrum_sepolia"]
    balances = {}
    
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
            
            balances[chain] = balance_usdc
            print(f"   📊 {config.name}: {balance_usdc:.2f} USDC")
            
        except Exception as e:
            print(f"   ❌ {chain}: Error - {e}")
            balances[chain] = 0
    
    # Create a mock transfer object for the burned transaction
    # We know 1 USDC was burned from Base Sepolia
    if balances["base_sepolia"] < 12.66:  # We had 12.66 before, now less
        print(f"\n🔥 Found burned USDC on Base Sepolia!")
        print(f"   Initial: 12.66 USDC")
        print(f"   Current: {balances['base_sepolia']:.2f} USDC")
        print(f"   Burned: {12.66 - balances['base_sepolia']:.2f} USDC")
        
        # Create transfer object for completion
        transfer = CCTPTransfer(
            source_chain="base_sepolia",
            destination_chain="arbitrum_sepolia",
            amount=1.0,
            recipient=account.address,
            burn_tx_hash="fac103ecaf37ab551f45b4c895e9a3e05b244c7a7e921fa483e01bf18bc4d840",  # From the logs
            mint_tx_hash="",
            nonce=0,
            timestamp=0,
            status="burned"
        )
        
        print(f"\n🔄 Attempting to complete transfer...")
        print(f"   📤 Source: {transfer.source_chain}")
        print(f"   📥 Destination: {transfer.destination_chain}")
        print(f"   💰 Amount: {transfer.amount} USDC")
        
        try:
            # Complete the transfer
            completed_transfer = await cctp.complete_cross_chain_transfer(
                transfer, private_key
            )
            
            print(f"\n✅ Transfer Completed Successfully!")
            print(f"   📊 Mint TX: {completed_transfer.mint_tx_hash}")
            print(f"   🎉 Status: {completed_transfer.status}")
            
            # Check final balances
            print(f"\n💰 Final Balance Check:")
            print("-" * 30)
            
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
                    
                    initial_balance = balances[chain]
                    change = balance_usdc - initial_balance
                    
                    print(f"   📊 {config.name}: {initial_balance:.2f} -> {balance_usdc:.2f} ({change:+.2f})")
                    
                except Exception as e:
                    print(f"   ❌ {chain}: Error checking balance - {e}")
            
            print(f"\n🎉 CCTP TRANSFER COMPLETED!")
            print(f"   ✅ Burn: {transfer.burn_tx_hash}")
            print(f"   ✅ Mint: {completed_transfer.mint_tx_hash}")
            print(f"   ✅ Amount: {transfer.amount} USDC")
            print(f"   ✅ Route: {transfer.source_chain} -> {transfer.destination_chain}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Completion failed: {e}")
            import traceback
            traceback.print_exc()
            return False
    
    else:
        print(f"\n⚠️ No burned USDC found")
        print(f"   Base Sepolia balance: {balances['base_sepolia']:.2f} USDC")
        print(f"   Expected decrease from 12.66 USDC")
        return False

async def main():
    """Main function"""
    print("🚀 Completing CCTP Transfer")
    print("=" * 50)
    
    success = await complete_cctp_transfer()
    
    print(f"\n{'='*50}")
    print("📋 COMPLETION SUMMARY")
    print(f"{'='*50}")
    
    if success:
        print("🎉 SUCCESS: CCTP transfer completed!")
        print("✅ Attestation retrieved from Circle")
        print("✅ Mint transaction executed")
        print("✅ Cross-chain USDC transfer successful")
        print("\n🏆 CCTP Integration is FULLY WORKING!")
    else:
        print("❌ FAILED: Could not complete transfer")
        print("⚠️ Check logs for specific errors")

if __name__ == "__main__":
    asyncio.run(main())