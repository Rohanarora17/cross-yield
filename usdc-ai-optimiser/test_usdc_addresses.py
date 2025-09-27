#!/usr/bin/env python3
"""Test both USDC contract addresses to find the correct one"""

import os
from web3 import Web3
from eth_account import Account
import sys

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

def test_usdc_address(w3, address, name, abi):
    """Test a USDC contract address"""

    print(f"\n🧪 Testing {name}: {address}")
    print("-" * 50)

    try:
        # Check if contract exists
        code = w3.eth.get_code(address)
        if len(code) == 0:
            print("   ❌ No contract code at this address")
            return False

        print(f"   ✅ Contract exists ({len(code)} bytes)")

        # Test contract functionality
        contract = w3.eth.contract(address=w3.to_checksum_address(address), abi=abi)

        # Test basic functions
        try:
            total_supply = contract.functions.totalSupply().call()
            print(f"   ✅ Total Supply: {total_supply / 10**6:,.0f} USDC")
        except Exception as e:
            print(f"   ❌ Total Supply failed: {e}")
            return False

        # Test with our wallet
        private_key = os.getenv('PRIVATE_KEY')
        if private_key:
            account = Account.from_key(private_key)

            try:
                balance = contract.functions.balanceOf(account.address).call()
                print(f"   ✅ Our Balance: {balance / 10**6:.6f} USDC")
            except Exception as e:
                print(f"   ❌ Balance check failed: {e}")
                return False

            # Test allowance function
            try:
                # Use the official TokenMessenger address
                token_messenger = "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA"
                allowance = contract.functions.allowance(account.address, token_messenger).call()
                print(f"   ✅ Allowance to TokenMessenger: {allowance / 10**6:.6f} USDC")
            except Exception as e:
                print(f"   ❌ Allowance check failed: {e}")
                return False

        print(f"   🎯 {name} appears to be working correctly!")
        return True

    except Exception as e:
        print(f"   ❌ Contract test failed: {e}")
        return False

def main():
    """Test both USDC addresses"""

    print("🔍 TESTING USDC CONTRACT ADDRESSES")
    print("=" * 60)

    # Setup
    cctp = CCTPIntegration()
    config = cctp.chain_configs['base_sepolia']
    w3 = Web3(Web3.HTTPProvider(config.rpc_url))

    print(f"🔗 Connected to Base Sepolia (Block: {w3.eth.block_number})")

    # Test addresses found in search
    usdc_addresses = [
        ("Current Config", config.usdc_address),
        ("BaseScan Alternative", "0x8a04d904055528a69f3e4594dda308a31aeb8457"),
    ]

    results = {}

    for name, address in usdc_addresses:
        success = test_usdc_address(w3, address, name, cctp.usdc_abi)
        results[name] = (address, success)

    # Summary
    print("\n" + "=" * 60)
    print("📊 USDC ADDRESS TEST RESULTS")
    print("=" * 60)

    working_addresses = []
    for name, (address, success) in results.items():
        status = "✅ WORKING" if success else "❌ FAILED"
        print(f"   {name:20}: {status}")
        print(f"   {' ' * 20}  {address}")

        if success:
            working_addresses.append((name, address))

    if len(working_addresses) == 1:
        name, address = working_addresses[0]
        print(f"\n🎯 RECOMMENDATION: Use {name}")
        print(f"   Address: {address}")

        if address != config.usdc_address:
            print(f"\n⚠️ CONFIGURATION UPDATE NEEDED!")
            print(f"   Current config uses: {config.usdc_address}")
            print(f"   Should use: {address}")
    elif len(working_addresses) > 1:
        print(f"\n🤔 Multiple working addresses found")
        print(f"   Need to determine which is the official Circle USDC")
    else:
        print(f"\n❌ No working USDC addresses found!")
        print(f"   Check Circle documentation for correct address")

if __name__ == "__main__":
    main()