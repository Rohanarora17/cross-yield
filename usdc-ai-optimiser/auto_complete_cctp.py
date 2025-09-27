#!/usr/bin/env python3
"""Automatically complete CCTP transfer when attestation is ready"""

import asyncio
import aiohttp
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

async def auto_complete_cctp():
    """Automatically complete CCTP transfer when attestation is ready"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Auto-completing CCTP for wallet: {account.address}")
    
    print("\n🤖 Auto CCTP Completion")
    print("=" * 50)
    print("⏰ This will check every 30 seconds until attestation is ready")
    print("🎯 Will automatically complete the mint when ready")
    print("=" * 50)
    
    # The latest burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
    
    print(f"📊 Monitoring transaction: {burn_tx_hash}")
    print(f"🌐 Domain: {source_domain} (Base Sepolia)")
    print(f"🌐 API: {url}")
    
    # Initialize CCTP
    cctp = CCTPIntegration()
    
    # Create transfer object
    transfer = CCTPTransfer(
        source_chain="base_sepolia",
        destination_chain="arbitrum_sepolia",
        amount=1.0,
        recipient=account.address,
        burn_tx_hash=burn_tx_hash,
        mint_tx_hash="",
        nonce=0,
        timestamp=0,
        status="burned"
    )
    
    max_attempts = 30  # 15 minutes
    attempt = 0
    
    while attempt < max_attempts:
        try:
            print(f"\n🔍 Attempt {attempt + 1}: Checking attestation...")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    print(f"   📊 Response Status: {response.status}")
                    
                    if response.status == 200:
                        data = await response.json()
                        messages = data.get('messages', [])
                        
                        if messages:
                            message = messages[0]
                            status = message.get('status')
                            print(f"   📝 Message Status: {status}")
                            
                            if status == 'complete':
                                print(f"   ✅ Attestation is ready!")
                                print(f"   📝 Message Hash: {message.get('messageHash')}")
                                print(f"   📝 Attestation: {message.get('attestation', 'Ready')[:20]}...")
                                
                                # Complete the mint
                                print(f"\n🪙 Completing CCTP Transfer...")
                                print("-" * 40)
                                
                                try:
                                    completed_transfer = await cctp.complete_cross_chain_transfer(
                                        transfer, private_key
                                    )
                                    
                                    print(f"✅ Transfer Completed Successfully!")
                                    print(f"📊 Mint TX: {completed_transfer.mint_tx_hash}")
                                    print(f"🎉 Status: {completed_transfer.status}")
                                    
                                    # Check final balances
                                    print(f"\n💰 Final Balance Check:")
                                    print("-" * 40)
                                    
                                    chains = ["base_sepolia", "arbitrum_sepolia"]
                                    initial_balances = {"base_sepolia": 10.66, "arbitrum_sepolia": 10.00}
                                    
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
                                            
                                            initial_balance = initial_balances[chain]
                                            change = balance_usdc - initial_balance
                                            
                                            print(f"📊 {config.name}: {initial_balance:.2f} -> {balance_usdc:.2f} ({change:+.2f})")
                                            
                                        except Exception as e:
                                            print(f"❌ {chain}: Error checking balance - {e}")
                                    
                                    print(f"\n🎉 CCTP TRANSFER COMPLETED!")
                                    print(f"✅ Burn: {transfer.burn_tx_hash}")
                                    print(f"✅ Mint: {completed_transfer.mint_tx_hash}")
                                    print(f"✅ Amount: {transfer.amount} USDC")
                                    print(f"✅ Route: {transfer.source_chain} -> {transfer.destination_chain}")
                                    
                                    print(f"\n🏆 CCTP Integration: FULLY WORKING!")
                                    print(f"🏆 Ready for hackathon demonstration!")
                                    
                                    return True
                                    
                                except Exception as e:
                                    print(f"❌ Mint completion failed: {e}")
                                    import traceback
                                    traceback.print_exc()
                                    return False
                            else:
                                print(f"   ⏳ Attestation still processing...")
                        else:
                            print(f"   ⏳ No messages found yet...")
                    elif response.status == 404:
                        print(f"   ⏳ Transaction not found yet - still processing")
                    else:
                        print(f"   ⚠️ Unexpected response: {response.status}")
                        text = await response.text()
                        print(f"   📊 Response: {text}")
            
            # Wait 30 seconds before next check
            if attempt < max_attempts - 1:
                print(f"   ⏰ Waiting 30 seconds before next check...")
                await asyncio.sleep(30)
            
            attempt += 1
            
        except Exception as e:
            print(f"   ❌ Error checking attestation: {e}")
            await asyncio.sleep(30)
            attempt += 1
    
    print(f"\n⏰ Timeout after {max_attempts} attempts (15 minutes)")
    print(f"⚠️ Attestation may still be processing")
    print(f"🎯 You can run this script again later to complete the transfer")
    
    return False

if __name__ == "__main__":
    asyncio.run(auto_complete_cctp())