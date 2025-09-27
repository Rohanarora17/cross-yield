#!/usr/bin/env python3
"""Find correct testnet contract addresses"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from web3 import Web3

# Load environment variables
load_dotenv()

async def find_testnet_contracts():
    """Find correct testnet contract addresses"""
    
    # Testnet configurations
    testnets = {
        "Base Sepolia": {
            "rpc_url": "https://sepolia.base.org",
            "chain_id": 84532
        },
        "Arbitrum Sepolia": {
            "rpc_url": "https://sepolia-rollup.arbitrum.io/rpc",
            "chain_id": 421614
        }
    }
    
    print("🔍 Searching for testnet contract addresses...")
    
    for chain_name, config in testnets.items():
        try:
            print(f"\n📊 {chain_name}:")
            
            # Connect to testnet
            w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
            
            if not w3.is_connected():
                print(f"   ❌ Failed to connect to {chain_name}")
                continue
            
            print(f"   ✅ Connected to {chain_name}")
            
            # Get latest block
            latest_block = w3.eth.block_number
            print(f"   📦 Latest block: {latest_block}")
            
            # Check if we can find any USDC-like contracts
            # Let's try some common USDC addresses
            common_usdc_addresses = [
                "0x036cbd53842c5426634e7929541ec8318ae4c470",  # Base Sepolia USDC
                "0x75faf114eafb1bd4fad00f289c5038a347b25047",  # Arbitrum Sepolia USDC
                "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",  # Sepolia USDC
                "0x07865c6e87b9f70255377e024ace6630c1eaa37f",  # Goerli USDC
            ]
            
            print(f"   🔍 Checking common USDC addresses...")
            
            for address in common_usdc_addresses:
                try:
                    # Check if contract exists
                    checksum_address = w3.to_checksum_address(address)
                    code = w3.eth.get_code(checksum_address)
                    if len(code) > 0:
                        print(f"   ✅ Contract found at {address}")
                        
                        # Try to call balanceOf function
                        usdc_abi = [
                            {
                                "inputs": [{"name": "owner", "type": "address"}],
                                "name": "balanceOf",
                                "outputs": [{"name": "balance", "type": "uint256"}],
                                "stateMutability": "view",
                                "type": "function"
                            }
                        ]
                        
                        try:
                            usdc_contract = w3.eth.contract(
                                address=checksum_address,
                                abi=usdc_abi
                            )
                            
                            # Try to call balanceOf with zero address
                            balance = usdc_contract.functions.balanceOf("0x0000000000000000000000000000000000000000").call()
                            print(f"      💰 USDC contract confirmed (balanceOf works)")
                            
                        except Exception as e:
                            print(f"      ❌ Not a USDC contract: {e}")
                    else:
                        print(f"   ❌ No contract at {address}")
                        
                except Exception as e:
                    print(f"   ❌ Error checking {address}: {e}")
            
            # Also check for CCTP contracts
            print(f"   🔍 Checking CCTP contract addresses...")
            
            cctp_addresses = [
                "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",  # Token Messenger
                "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",  # Message Transmitter
            ]
            
            for address in cctp_addresses:
                try:
                    checksum_address = w3.to_checksum_address(address)
                    code = w3.eth.get_code(checksum_address)
                    if len(code) > 0:
                        print(f"   ✅ CCTP contract found at {address}")
                    else:
                        print(f"   ❌ No CCTP contract at {address}")
                except Exception as e:
                    print(f"   ❌ Error checking CCTP {address}: {e}")
                    
        except Exception as e:
            print(f"   ❌ Error with {chain_name}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(find_testnet_contracts())