#!/usr/bin/env python3
"""Check if attestation is ready and complete the mint"""

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

async def check_attestation_and_mint():
    """Check if attestation is ready and complete the mint"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Checking attestation for wallet: {account.address}")
    
    print("\n🔍 Checking Circle Attestation Status")
    print("=" * 50)
    
    # The latest burn transaction hash
    burn_tx_hash = "63efd5552a7a0a2e368d276465371521276ac069d75a507c059a80a5ec974a65"
    source_domain = 6  # Base Sepolia domain
    
    url = f"https://iris-api-sandbox.circle.com/v2/messages/{source_domain}?transactionHash={burn_tx_hash}"
    
    print(f"🌐 URL: {url}")
    print(f"📊 Transaction: {burn_tx_hash}")
    print(f"🌐 Domain: {source_domain} (Base Sepolia)")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                print(f"\n📊 Response Status: {response.status}")
                
                if response.status == 200:
                    data = await response.json()
                    print(f"📊 Response Data: {data}")
                    
                    messages = data.get('messages', [])
                    if messages:
                        message = messages[0]
                        print(f"\n📝 Message Status: {message.get('status')}")
                        print(f"📝 Message Hash: {message.get('messageHash')}")
                        print(f"📝 Attestation: {message.get('attestation', 'Not ready')}")
                        
                        if message.get('status') == 'complete':
                            print("✅ Attestation is ready!")
                            
                            # Now complete the mint
                            print(f"\n🪙 Completing CCTP Transfer...")
                            print("-" * 40)
                            
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
                            
                            try:
                                # Complete the transfer
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
                                
                                return True
                                
                            except Exception as e:
                                print(f"❌ Mint completion failed: {e}")
                                import traceback
                                traceback.print_exc()
                                return False
                        else:
                            print("⏳ Attestation still processing...")
                            return False
                    else:
                        print("❌ No messages found")
                        return False
                        
                elif response.status == 404:
                    print("⏳ Transaction not found yet - still processing")
                    return False
                else:
                    print(f"❌ Error: {response.status}")
                    text = await response.text()
                    print(f"📊 Error text: {text}")
                    return False
                    
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(check_attestation_and_mint())