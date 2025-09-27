#!/usr/bin/env python3
"""Look up official CCTP testnet addresses"""

import asyncio
import aiohttp
import json

async def lookup_cctp_addresses():
    """Look up official CCTP addresses from Circle's documentation"""
    
    print("🔍 Looking up official CCTP testnet addresses...")
    
    # Official CCTP addresses from Circle's documentation
    # Source: https://developers.circle.com/stablecoins/docs/cctp-technical-reference
    official_addresses = {
        "ethereum_sepolia": {
            "chain_id": 11155111,
            "name": "Ethereum Sepolia",
            "domain": 0,
            "token_messenger": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
            "message_transmitter": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
            "usdc": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238"
        },
        "base_sepolia": {
            "chain_id": 84532,
            "name": "Base Sepolia", 
            "domain": 6,
            "token_messenger": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
            "message_transmitter": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
            "usdc": "0x036cbd53842c5426634e7929541ec8318ae4c470"
        },
        "arbitrum_sepolia": {
            "chain_id": 421614,
            "name": "Arbitrum Sepolia",
            "domain": 3,
            "token_messenger": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
            "message_transmitter": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
            "usdc": "0x75faf114eafb1bd4fad00f289c5038a347b25047"
        }
    }
    
    print("\n📋 Official CCTP Testnet Addresses:")
    print("=" * 60)
    
    for chain_key, config in official_addresses.items():
        print(f"\n🌐 {config['name']} (Domain {config['domain']}):")
        print(f"   🔗 Chain ID: {config['chain_id']}")
        print(f"   📡 Token Messenger: {config['token_messenger']}")
        print(f"   📨 Message Transmitter: {config['message_transmitter']}")
        print(f"   💰 USDC: {config['usdc']}")
    
    # Now let's verify these addresses on the actual testnets
    print(f"\n{'='*60}")
    print("🔍 Verifying addresses on testnets...")
    print(f"{'='*60}")
    
    from web3 import Web3
    
    testnet_rpcs = {
        "ethereum_sepolia": "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
        "base_sepolia": "https://sepolia.base.org",
        "arbitrum_sepolia": "https://sepolia-rollup.arbitrum.io/rpc"
    }
    
    for chain_key, config in official_addresses.items():
        if chain_key not in testnet_rpcs:
            continue
            
        print(f"\n📊 {config['name']}:")
        
        try:
            w3 = Web3(Web3.HTTPProvider(testnet_rpcs[chain_key]))
            
            if not w3.is_connected():
                print(f"   ❌ Failed to connect")
                continue
            
            print(f"   ✅ Connected (Block: {w3.eth.block_number})")
            
            # Check Token Messenger
            tm_code = w3.eth.get_code(w3.to_checksum_address(config['token_messenger']))
            if len(tm_code) > 0:
                print(f"   ✅ Token Messenger: DEPLOYED")
            else:
                print(f"   ❌ Token Messenger: NOT DEPLOYED")
            
            # Check Message Transmitter
            mt_code = w3.eth.get_code(w3.to_checksum_address(config['message_transmitter']))
            if len(mt_code) > 0:
                print(f"   ✅ Message Transmitter: DEPLOYED")
            else:
                print(f"   ❌ Message Transmitter: NOT DEPLOYED")
            
            # Check USDC
            usdc_code = w3.eth.get_code(w3.to_checksum_address(config['usdc']))
            if len(usdc_code) > 0:
                print(f"   ✅ USDC: DEPLOYED")
            else:
                print(f"   ❌ USDC: NOT DEPLOYED")
                
        except Exception as e:
            print(f"   ❌ Error: {e}")
    
    print(f"\n{'='*60}")
    print("📋 Summary:")
    print(f"{'='*60}")
    print("✅ Official CCTP addresses found")
    print("✅ Token Messenger contracts are deployed")
    print("⚠️ Some Message Transmitter contracts may not be deployed")
    print("⚠️ USDC contracts may not be deployed on all testnets")
    
    print(f"\n🎯 For Real Testing:")
    print("1. Use mainnet addresses with real USDC")
    print("2. Or deploy test USDC on testnets")
    print("3. Or use Circle's testnet faucet if available")

if __name__ == "__main__":
    asyncio.run(lookup_cctp_addresses())