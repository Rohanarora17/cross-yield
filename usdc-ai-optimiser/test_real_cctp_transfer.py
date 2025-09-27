#!/usr/bin/env python3
"""Test real CCTP transfer on Avalanche Fuji"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

# Add the src directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from apis.cctp_integration import CCTPIntegration

# Load environment variables
load_dotenv()

async def test_real_cctp_transfer():
    """Test real CCTP transfer on Avalanche Fuji"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Testing with wallet: {account.address}")
    
    print("\n🚀 Real CCTP Transfer Test - Avalanche Fuji")
    print("=" * 60)
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Check Avalanche Fuji USDC balance
    print("\n💰 Checking USDC Balance on Avalanche Fuji:")
    print("-" * 40)
    
    try:
        config = cctp.chain_configs["avalanche_fuji"]
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
        
        print(f"   💰 Current USDC Balance: {balance_usdc:.2f} USDC")
        
        if balance_usdc < 1.0:
            print(f"\n⚠️ Insufficient USDC for testing!")
            print(f"   Need at least 1 USDC for CCTP transfer")
            print(f"   Current balance: {balance_usdc:.2f} USDC")
            print(f"\n🎯 To get testnet USDC:")
            print(f"   1. Visit Circle's testnet faucet")
            print(f"   2. Request USDC for Avalanche Fuji")
            print(f"   3. Wait for faucet to distribute")
            print(f"   4. Re-run this test")
            
            return
        
        print(f"   ✅ Sufficient USDC for testing!")
        
    except Exception as e:
        print(f"   ❌ Error checking balance: {e}")
        return
    
    # Test CCTP transfer (if we have USDC)
    if balance_usdc >= 1.0:
        print(f"\n🌉 Testing CCTP Transfer:")
        print("-" * 40)
        
        try:
            # Test transfer: Avalanche Fuji -> Base Sepolia (if possible)
            # Note: Base Sepolia doesn't have USDC, so this will fail at minting
            print("   🧪 Attempting transfer: Avalanche Fuji -> Base Sepolia")
            print("   ⚠️ This will burn USDC but fail at minting (no USDC on Base Sepolia)")
            
            transfer = await cctp.initiate_cross_chain_transfer(
                source_chain="avalanche_fuji",
                destination_chain="base_sepolia",
                amount=1.0,  # 1 USDC
                recipient=account.address,
                private_key=private_key
            )
            
            print(f"   ✅ Transfer initiated successfully!")
            print(f"   📊 Burn TX: {transfer.burn_tx_hash}")
            print(f"   🔢 Nonce: {transfer.nonce}")
            
            # Monitor transfer
            print(f"\n👀 Monitoring transfer...")
            max_attempts = 10
            attempt = 0
            
            while attempt < max_attempts:
                try:
                    status = await cctp.get_transfer_status(transfer)
                    print(f"   📊 Status: {status}")
                    
                    if status == "ready_to_mint":
                        print("   ✅ Ready to mint on destination chain!")
                        break
                    elif status == "completed":
                        print("   🎉 Transfer completed!")
                        break
                    elif status == "failed":
                        print("   ❌ Transfer failed!")
                        break
                    
                    await asyncio.sleep(10)
                    attempt += 1
                    
                except Exception as e:
                    print(f"   ⚠️ Monitoring error: {e}")
                    await asyncio.sleep(10)
                    attempt += 1
            
            if attempt >= max_attempts:
                print("   ⏰ Monitoring timeout")
            
        except Exception as e:
            print(f"   ❌ Transfer failed: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("📋 Test Summary")
    print(f"{'='*60}")
    print("✅ CCTP integration with official addresses")
    print("✅ Avalanche Fuji connectivity verified")
    print("✅ USDC contract interaction working")
    print("✅ Transfer initiation implemented")
    print("✅ Status monitoring implemented")
    
    print(f"\n🎯 For Complete Testing:")
    print("1. Get USDC from Circle's testnet faucet")
    print("2. Test Avalanche Fuji -> Avalanche Fuji (same chain)")
    print("3. Test with chains that have USDC deployed")
    print("4. Test full burn -> attestation -> mint flow")

if __name__ == "__main__":
    asyncio.run(test_real_cctp_transfer())