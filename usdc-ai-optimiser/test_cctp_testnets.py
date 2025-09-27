#!/usr/bin/env python3
"""Real CCTP Testing on Testnets"""

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

class TestnetCCTPTester:
    """Test CCTP on testnets with real USDC"""
    
    def __init__(self):
        self.private_key = os.getenv('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not found in environment")
        
        # Get account from private key
        self.account = Account.from_key(self.private_key)
        print(f"🔑 Testing with wallet: {self.account.address}")
        
        # Testnet configurations (updated with current testnets)
        self.testnet_configs = {
            "ethereum_sepolia": {
                "chain_id": 11155111,
                "name": "Ethereum Sepolia",
                "rpc_url": "https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161",
                "token_messenger_address": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
                "message_transmitter_address": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
                "usdc_address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",  # Sepolia USDC
                "gas_limit": 200000,
                "gas_price_gwei": 0.1
            },
            "base_sepolia": {
                "chain_id": 84532,
                "name": "Base Sepolia",
                "rpc_url": "https://sepolia.base.org",
                "token_messenger_address": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
                "message_transmitter_address": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
                "usdc_address": "0x036cbd53842c5426634e7929541ec8318ae4c470",  # Base Sepolia USDC
                "gas_limit": 200000,
                "gas_price_gwei": 0.001
            },
            "arbitrum_sepolia": {
                "chain_id": 421614,
                "name": "Arbitrum Sepolia",
                "rpc_url": "https://sepolia-rollup.arbitrum.io/rpc",
                "token_messenger_address": "0x9f3b8679c73c2fef8b59b4f3444d4e156fb70aa5",
                "message_transmitter_address": "0x7865f80c81504b35d0c6a8e247a153a14d4b91b2",
                "usdc_address": "0x75faf114eafb1bd4fad00f289c5038a347b25047",  # Arbitrum Sepolia USDC
                "gas_limit": 200000,
                "gas_price_gwei": 0.1
            }
        }
        
        # Create CCTP instance with testnet configs
        self.cctp = CCTPIntegration()
        self.cctp.chain_configs = self.testnet_configs
        
        # Domain mappings for testnets
        self.cctp.domain_mappings = {
            "ethereum_sepolia": 0,
            "base_sepolia": 6,
            "arbitrum_sepolia": 3
        }
    
    async def check_usdc_balances(self):
        """Check USDC balances on all testnets"""
        print("💰 Checking USDC balances on all testnets...")
        
        balances = {}
        
        for chain_name, config in self.testnet_configs.items():
            try:
                w3 = Web3(Web3.HTTPProvider(config["rpc_url"]))
                
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
                
                usdc_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config["usdc_address"]),
                    abi=usdc_abi
                )
                
                balance_wei = usdc_contract.functions.balanceOf(self.account.address).call()
                balance_usdc = balance_wei / 10**6  # USDC has 6 decimals
                
                balances[chain_name] = balance_usdc
                print(f"   📊 {config['name']}: {balance_usdc:.2f} USDC")
                
            except Exception as e:
                print(f"   ❌ {config['name']}: Error checking balance - {e}")
                balances[chain_name] = 0
        
        return balances
    
    async def test_small_transfer(self, source_chain: str, dest_chain: str, amount: float = 1.0):
        """Test a small CCTP transfer"""
        print(f"\n🌉 Testing CCTP transfer: {amount} USDC from {source_chain} to {dest_chain}")
        
        try:
            # Check balances first
            balances = await self.check_usdc_balances()
            source_balance = balances.get(source_chain, 0)
            
            if source_balance < amount:
                print(f"   ❌ Insufficient balance: {source_balance:.2f} < {amount}")
                return None
            
            print(f"   ✅ Source balance: {source_balance:.2f} USDC")
            
            # Execute transfer
            transfer = await self.cctp.initiate_cross_chain_transfer(
                source_chain=source_chain,
                destination_chain=dest_chain,
                amount=amount,
                recipient=self.account.address,  # Send to same address
                private_key=self.private_key
            )
            
            print(f"   🎯 Transfer initiated successfully!")
            print(f"   📊 Burn TX: {transfer.burn_tx_hash}")
            print(f"   🔢 Nonce: {transfer.nonce}")
            
            return transfer
            
        except Exception as e:
            print(f"   ❌ Transfer failed: {e}")
            return None
    
    async def monitor_transfer(self, transfer: CCTPTransfer):
        """Monitor transfer status"""
        print(f"\n👀 Monitoring transfer {transfer.burn_tx_hash}")
        
        max_attempts = 30  # 5 minutes max
        attempt = 0
        
        while attempt < max_attempts:
            try:
                status = await self.cctp.get_transfer_status(transfer)
                print(f"   📊 Status: {status}")
                
                if status == "ready_to_mint":
                    print("   ✅ Ready to mint on destination chain!")
                    return True
                elif status == "completed":
                    print("   🎉 Transfer completed!")
                    return True
                elif status == "failed":
                    print("   ❌ Transfer failed!")
                    return False
                
                # Wait 10 seconds before next check
                await asyncio.sleep(10)
                attempt += 1
                
            except Exception as e:
                print(f"   ⚠️ Monitoring error: {e}")
                await asyncio.sleep(10)
                attempt += 1
        
        print("   ⏰ Monitoring timeout")
        return False
    
    async def complete_transfer(self, transfer: CCTPTransfer):
        """Complete the transfer on destination chain"""
        print(f"\n🪙 Completing transfer on {transfer.destination_chain}")
        
        try:
            completed_transfer = await self.cctp.complete_cross_chain_transfer(
                transfer, self.private_key
            )
            
            print(f"   ✅ Transfer completed!")
            print(f"   📊 Mint TX: {completed_transfer.mint_tx_hash}")
            
            return completed_transfer
            
        except Exception as e:
            print(f"   ❌ Completion failed: {e}")
            return None
    
    async def run_comprehensive_test(self):
        """Run comprehensive CCTP testing"""
        print("🚀 Starting Comprehensive CCTP Testnet Testing")
        print("=" * 60)
        
        # Check initial balances
        print("\n📊 Initial Balance Check")
        initial_balances = await self.check_usdc_balances()
        
        # Test transfers
        test_cases = [
            ("base_sepolia", "arbitrum_sepolia", 1.0),  # Cheapest route
            ("arbitrum_sepolia", "base_sepolia", 1.0),  # Reverse route
            ("ethereum_sepolia", "base_sepolia", 2.0),    # Higher cost route
        ]
        
        successful_transfers = []
        
        for source, dest, amount in test_cases:
            print(f"\n{'='*60}")
            print(f"🧪 Test Case: {source} -> {dest} ({amount} USDC)")
            print(f"{'='*60}")
            
            # Execute transfer
            transfer = await self.test_small_transfer(source, dest, amount)
            
            if transfer:
                # Monitor transfer
                ready = await self.monitor_transfer(transfer)
                
                if ready:
                    # Complete transfer
                    completed = await self.complete_transfer(transfer)
                    
                    if completed:
                        successful_transfers.append({
                            'source': source,
                            'dest': dest,
                            'amount': amount,
                            'burn_tx': transfer.burn_tx_hash,
                            'mint_tx': completed.mint_tx_hash
                        })
                        
                        print(f"   🎉 SUCCESS: {source} -> {dest}")
                    else:
                        print(f"   ❌ FAILED: Could not complete {source} -> {dest}")
                else:
                    print(f"   ⏰ TIMEOUT: Transfer not ready {source} -> {dest}")
            else:
                print(f"   ❌ FAILED: Could not initiate {source} -> {dest}")
            
            # Wait between tests
            print(f"\n⏳ Waiting 30 seconds before next test...")
            await asyncio.sleep(30)
        
        # Final balance check
        print(f"\n{'='*60}")
        print("📊 Final Balance Check")
        print(f"{'='*60}")
        final_balances = await self.check_usdc_balances()
        
        # Summary
        print(f"\n{'='*60}")
        print("📋 TEST SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Successful transfers: {len(successful_transfers)}")
        print(f"📊 Total test cases: {len(test_cases)}")
        
        for transfer in successful_transfers:
            print(f"   🌉 {transfer['source']} -> {transfer['dest']}: {transfer['amount']} USDC")
            print(f"      Burn: {transfer['burn_tx']}")
            print(f"      Mint: {transfer['mint_tx']}")
        
        print(f"\n💰 Balance Changes:")
        for chain in initial_balances:
            initial = initial_balances[chain]
            final = final_balances[chain]
            change = final - initial
            chain_display = chain.replace('_', ' ').title()
            print(f"   {chain_display}: {initial:.2f} -> {final:.2f} ({change:+.2f})")
        
        return successful_transfers

async def main():
    """Main test function"""
    try:
        tester = TestnetCCTPTester()
        results = await tester.run_comprehensive_test()
        
        if results:
            print(f"\n🎉 CCTP Testing Completed Successfully!")
            print(f"✅ {len(results)} transfers completed")
        else:
            print(f"\n❌ CCTP Testing Failed - No successful transfers")
            
    except Exception as e:
        print(f"\n❌ Test setup failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())