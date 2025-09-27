#!/usr/bin/env python3
"""Simple balance check for testnets"""

import asyncio
import os
import sys
from dotenv import load_dotenv
from web3 import Web3
from eth_account import Account

# Load environment variables
load_dotenv()

async def check_testnet_balances():
    """Check USDC balances on testnets"""
    
    private_key = os.getenv('PRIVATE_KEY')
    if not private_key:
        print("❌ PRIVATE_KEY not found in environment")
        return
    
    account = Account.from_key(private_key)
    print(f"🔑 Checking balances for wallet: {account.address}")
    
    # Testnet configurations
    testnets = {
        "Ethereum Sepolia": {
            "rpc_url": "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
            "usdc_address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
        },
        "Base Sepolia": {
            "rpc_url": "https://sepolia.base.org",
            "usdc_address": "0x036cbd53842c5426634e7929541ec8318ae4c470"
        },
        "Arbitrum Sepolia": {
            "rpc_url": "https://sepolia-rollup.arbitrum.io/rpc",
            "usdc_address": "0x75faf114eafb1bd4fad00f289c5038a347b25047"
        }
    }
    
    # USDC ABI for balance check
    usdc_abi = [
        {
            "inputs": [{"name": "owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "stateMutability": "view",
            "type": "function"
        }
    ]
    
    print("\n💰 Checking USDC balances on testnets...")
    
    for chain_name, config in testnets.items():
        try:
            print(f"\n📊 {chain_name}:")
            
            # Connect to testnet
            w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
            
            # Check connection
            if not w3.is_connected():
                print(f"   ❌ Failed to connect to {chain_name}")
                continue
            
            print(f"   ✅ Connected to {chain_name}")
            
            # Get latest block
            latest_block = w3.eth.block_number
            print(f"   📦 Latest block: {latest_block}")
            
            # Check USDC balance
            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config["usdc_address"]),
                abi=usdc_abi
            )
            
            balance_wei = usdc_contract.functions.balanceOf(account.address).call()
            balance_usdc = balance_wei / 10**6  # USDC has 6 decimals
            
            print(f"   💰 USDC Balance: {balance_usdc:.2f} USDC")
            
            # Check ETH balance for gas
            eth_balance_wei = w3.eth.get_balance(account.address)
            eth_balance = eth_balance_wei / 10**18
            
            print(f"   ⛽ ETH Balance: {eth_balance:.4f} ETH")
            
        except Exception as e:
            print(f"   ❌ Error checking {chain_name}: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_testnet_balances())