# src/apis/cctp_integration.py
"""Circle's Cross-Chain Transfer Protocol (CCTP) Integration"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from web3 import Web3
from eth_account import Account
import numpy as np

@dataclass
class CCTPTransfer:
    """CCTP transfer data structure"""
    source_chain: str
    destination_chain: str
    amount: float
    recipient: str
    nonce: int
    burn_tx_hash: Optional[str] = None
    mint_tx_hash: Optional[str] = None
    status: str = "pending"  # pending, burned, minted, failed
    timestamp: datetime = None
    gas_used: Optional[int] = None
    gas_price: Optional[int] = None

@dataclass
class CCTPChainConfig:
    """CCTP chain configuration"""
    chain_id: int
    name: str
    rpc_url: str
    token_messenger_address: str
    message_transmitter_address: str
    usdc_address: str
    gas_limit: int
    gas_price_gwei: float

class CCTPIntegration:
    """Circle's Cross-Chain Transfer Protocol integration"""
    
    def __init__(self):
        # CCTP contract addresses for supported chains
        self.chain_configs = {
            "ethereum": CCTPChainConfig(
                chain_id=1,
                name="Ethereum",
                rpc_url="https://eth-mainnet.g.alchemy.com/v2/demo",
                token_messenger_address="0xbd3fa81b9ba4b8b8e8b8b8b8b8b8b8b8b8b8b8b8",
                message_transmitter_address="0x0a992d191deec32afe36203ad87d8d64e4e8b592",
                usdc_address="0xa0b86a33e6c8b8b8b8b8b8b8b8b8b8b8b8b8b8b8",
                gas_limit=200000,
                gas_price_gwei=20.0
            ),
            "base": CCTPChainConfig(
                chain_id=8453,
                name="Base",
                rpc_url="https://mainnet.base.org",
                token_messenger_address="0x1682aee93502c41e357175b4e272070354aa9c38",
                message_transmitter_address="0xad09780d193884d503182ad458b0e0bc9e1652af",
                usdc_address="0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
                gas_limit=200000,
                gas_price_gwei=0.001
            ),
            "arbitrum": CCTPChainConfig(
                chain_id=42161,
                name="Arbitrum",
                rpc_url="https://arb1.arbitrum.io/rpc",
                token_messenger_address="0x19330d10d9cc8751218eaf51e8885d058642e08a",
                message_transmitter_address="0xc30362373fba6eb35a1c4e8b1b7a5a5a5a5a5a5a5",
                usdc_address="0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                gas_limit=200000,
                gas_price_gwei=0.1
            ),
            "polygon": CCTPChainConfig(
                chain_id=137,
                name="Polygon",
                rpc_url="https://polygon-rpc.com",
                token_messenger_address="0x9daF8c91A1AE30e4536c6f1d1698b21cfd49723a",
                message_transmitter_address="0x4d41f22c5a0e5c74090899e5a8fb7a49bea0c906",
                usdc_address="0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
                gas_limit=200000,
                gas_price_gwei=30.0
            ),
            "avalanche": CCTPChainConfig(
                chain_id=43114,
                name="Avalanche",
                rpc_url="https://api.avax.network/ext/bc/C/rpc",
                token_messenger_address="0x6b25532e1060ce10cc3b0a99e5683b91bfde6982",
                message_transmitter_address="0x8186359af5f57fbb40c6b14a588d2a59e0d20171",
                usdc_address="0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e",
                gas_limit=200000,
                gas_price_gwei=25.0
            )
        }
        
        # CCTP ABI fragments
        self.token_messenger_abi = [
            {
                "inputs": [
                    {"name": "amount", "type": "uint256"},
                    {"name": "destinationDomain", "type": "uint32"},
                    {"name": "mintRecipient", "type": "bytes32"},
                    {"name": "burnToken", "type": "address"}
                ],
                "name": "depositForBurn",
                "outputs": [{"name": "nonce", "type": "uint64"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        self.message_transmitter_abi = [
            {
                "inputs": [
                    {"name": "message", "type": "bytes"},
                    {"name": "attestation", "type": "bytes"}
                ],
                "name": "receiveMessage",
                "outputs": [{"name": "success", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        self.usdc_abi = [
            {
                "inputs": [
                    {"name": "spender", "type": "address"},
                    {"name": "amount", "type": "uint256"}
                ],
                "name": "approve",
                "outputs": [{"name": "success", "type": "bool"}],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "owner", "type": "address"}
                ],
                "name": "balanceOf",
                "outputs": [{"name": "balance", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # Domain mappings for CCTP
        self.domain_mappings = {
            "ethereum": 0,
            "base": 6,
            "arbitrum": 3,
            "polygon": 1,
            "avalanche": 1
        }
        
        self.web3_instances = {}
        
    def _get_web3(self, chain: str) -> Web3:
        """Get Web3 instance for chain"""
        if chain not in self.web3_instances:
            config = self.chain_configs[chain]
            self.web3_instances[chain] = Web3(Web3.HTTPProvider(config.rpc_url))
        return self.web3_instances[chain]
    
    def _get_domain(self, chain: str) -> int:
        """Get CCTP domain for chain"""
        return self.domain_mappings.get(chain, 0)
    
    async def initiate_cross_chain_transfer(
        self,
        source_chain: str,
        destination_chain: str,
        amount: float,
        recipient: str,
        private_key: str
    ) -> CCTPTransfer:
        """Initiate a cross-chain USDC transfer using CCTP"""
        
        print(f"🌉 Initiating CCTP transfer: {amount} USDC from {source_chain} to {destination_chain}")
        
        try:
            # Validate chains
            if source_chain not in self.chain_configs:
                raise ValueError(f"Unsupported source chain: {source_chain}")
            if destination_chain not in self.chain_configs:
                raise ValueError(f"Unsupported destination chain: {destination_chain}")
            
            # Get Web3 instance and account
            w3 = self._get_web3(source_chain)
            account = Account.from_key(private_key)
            
            # Get chain config
            config = self.chain_configs[source_chain]
            
            # Convert amount to wei (USDC has 6 decimals)
            amount_wei = int(amount * 10**6)
            
            # Check USDC balance
            usdc_contract = w3.eth.contract(
                address=config.usdc_address,
                abi=self.usdc_abi
            )
            
            balance = usdc_contract.functions.balanceOf(account.address).call()
            if balance < amount_wei:
                raise ValueError(f"Insufficient USDC balance: {balance/10**6} < {amount}")
            
            # Approve USDC spending
            print("   📝 Approving USDC spending...")
            approve_tx = usdc_contract.functions.approve(
                config.token_messenger_address,
                amount_wei
            ).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
            signed_approve = account.sign_transaction(approve_tx)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.rawTransaction)
            print(f"   ✅ Approval tx: {approve_tx_hash.hex()}")
            
            # Wait for approval confirmation
            await asyncio.sleep(2)
            
            # Initiate burn
            print("   🔥 Initiating USDC burn...")
            token_messenger = w3.eth.contract(
                address=config.token_messenger_address,
                abi=self.token_messenger_abi
            )
            
            destination_domain = self._get_domain(destination_chain)
            recipient_bytes = w3.to_bytes(hexstr=recipient)
            
            burn_tx = token_messenger.functions.depositForBurn(
                amount_wei,
                destination_domain,
                recipient_bytes,
                config.usdc_address
            ).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
            signed_burn = account.sign_transaction(burn_tx)
            burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.rawTransaction)
            
            # Wait for transaction confirmation
            receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)
            
            print(f"   ✅ Burn tx: {burn_tx_hash.hex()}")
            print(f"   ⛽ Gas used: {receipt.gasUsed}")
            
            # Create transfer record
            transfer = CCTPTransfer(
                source_chain=source_chain,
                destination_chain=destination_chain,
                amount=amount,
                recipient=recipient,
                nonce=receipt.logs[0].topics[1].hex() if receipt.logs else 0,
                burn_tx_hash=burn_tx_hash.hex(),
                status="burned",
                timestamp=datetime.now(),
                gas_used=receipt.gasUsed,
                gas_price=w3.to_wei(config.gas_price_gwei, 'gwei')
            )
            
            print(f"   🎯 Transfer initiated successfully!")
            print(f"   📊 Nonce: {transfer.nonce}")
            print(f"   💰 Amount: {amount} USDC")
            print(f"   🎯 Recipient: {recipient}")
            
            return transfer
            
        except Exception as e:
            print(f"❌ CCTP transfer failed: {e}")
            raise
    
    async def complete_cross_chain_transfer(
        self,
        transfer: CCTPTransfer,
        private_key: str
    ) -> CCTPTransfer:
        """Complete a cross-chain transfer by minting on destination chain"""
        
        print(f"🪙 Completing CCTP transfer on {transfer.destination_chain}")
        
        try:
            # Get Web3 instance for destination chain
            w3 = self._get_web3(transfer.destination_chain)
            account = Account.from_key(private_key)
            
            # Get chain config
            config = self.chain_configs[transfer.destination_chain]
            
            # Get attestation from Circle's API
            attestation = await self._get_attestation(transfer.burn_tx_hash)
            if not attestation:
                raise ValueError("Failed to get attestation from Circle")
            
            # Get message from source chain
            message = await self._get_message(transfer.source_chain, transfer.burn_tx_hash)
            if not message:
                raise ValueError("Failed to get message from source chain")
            
            # Mint USDC on destination chain
            print("   🪙 Minting USDC on destination chain...")
            message_transmitter = w3.eth.contract(
                address=config.message_transmitter_address,
                abi=self.message_transmitter_abi
            )
            
            mint_tx = message_transmitter.functions.receiveMessage(
                message,
                attestation
            ).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
            signed_mint = account.sign_transaction(mint_tx)
            mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.rawTransaction)
            
            # Wait for transaction confirmation
            receipt = w3.eth.wait_for_transaction_receipt(mint_tx_hash)
            
            print(f"   ✅ Mint tx: {mint_tx_hash.hex()}")
            print(f"   ⛽ Gas used: {receipt.gasUsed}")
            
            # Update transfer record
            transfer.mint_tx_hash = mint_tx_hash.hex()
            transfer.status = "minted"
            transfer.gas_used = receipt.gasUsed
            
            print(f"   🎯 Transfer completed successfully!")
            
            return transfer
            
        except Exception as e:
            print(f"❌ CCTP completion failed: {e}")
            transfer.status = "failed"
            raise
    
    async def _get_attestation(self, burn_tx_hash: str) -> Optional[bytes]:
        """Get attestation from Circle's API"""
        
        print("   🔍 Getting attestation from Circle...")
        
        try:
            # Circle's attestation API
            url = f"https://iris-api.circle.com/attestations/{burn_tx_hash}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        attestation = data.get('attestation')
                        if attestation:
                            return bytes.fromhex(attestation[2:])  # Remove 0x prefix
                    else:
                        print(f"   ⚠️ Attestation API error: {response.status}")
                        return None
                        
        except Exception as e:
            print(f"   ⚠️ Failed to get attestation: {e}")
            return None
    
    async def _get_message(self, source_chain: str, burn_tx_hash: str) -> Optional[bytes]:
        """Get message from source chain transaction"""
        
        print("   🔍 Getting message from source chain...")
        
        try:
            w3 = self._get_web3(source_chain)
            
            # Get transaction receipt
            receipt = w3.eth.get_transaction_receipt(burn_tx_hash)
            
            # Extract message from logs
            for log in receipt.logs:
                if len(log.topics) > 2:
                    # Message is typically in the data field
                    message = log.data
                    if message and len(message) > 0:
                        return message
            
            return None
            
        except Exception as e:
            print(f"   ⚠️ Failed to get message: {e}")
            return None
    
    async def get_transfer_status(self, transfer: CCTPTransfer) -> str:
        """Get current status of a CCTP transfer"""
        
        try:
            if transfer.status == "burned":
                # Check if attestation is available
                attestation = await self._get_attestation(transfer.burn_tx_hash)
                if attestation:
                    return "ready_to_mint"
                else:
                    return "waiting_for_attestation"
            elif transfer.status == "minted":
                return "completed"
            else:
                return transfer.status
                
        except Exception as e:
            print(f"⚠️ Failed to get transfer status: {e}")
            return "unknown"
    
    async def calculate_transfer_cost(
        self,
        source_chain: str,
        destination_chain: str,
        amount: float
    ) -> Dict[str, float]:
        """Calculate total cost of CCTP transfer"""
        
        source_config = self.chain_configs[source_chain]
        dest_config = self.chain_configs[destination_chain]
        
        # Gas costs
        source_gas_cost = source_config.gas_limit * source_config.gas_price_gwei * 1e-9  # Convert to ETH
        dest_gas_cost = dest_config.gas_limit * dest_config.gas_price_gwei * 1e-9
        
        # Get current ETH prices (simplified)
        eth_prices = {
            "ethereum": 3000,
            "base": 3000,
            "arbitrum": 3000,
            "polygon": 3000,
            "avalanche": 3000
        }
        
        source_usd_cost = source_gas_cost * eth_prices.get(source_chain, 3000)
        dest_usd_cost = dest_gas_cost * eth_prices.get(destination_chain, 3000)
        
        total_cost = source_usd_cost + dest_usd_cost
        
        return {
            "source_gas_cost_usd": source_usd_cost,
            "destination_gas_cost_usd": dest_usd_cost,
            "total_cost_usd": total_cost,
            "cost_percentage": (total_cost / amount) * 100 if amount > 0 else 0
        }
    
    async def find_optimal_transfer_route(
        self,
        amount: float,
        recipient: str
    ) -> List[Tuple[str, str, float]]:
        """Find optimal transfer routes based on cost and speed"""
        
        print(f"🔍 Finding optimal CCTP routes for {amount} USDC...")
        
        routes = []
        chains = list(self.chain_configs.keys())
        
        for source_chain in chains:
            for dest_chain in chains:
                if source_chain != dest_chain:
                    try:
                        cost_info = await self.calculate_transfer_cost(
                            source_chain, dest_chain, amount
                        )
                        
                        routes.append((
                            source_chain,
                            dest_chain,
                            cost_info["total_cost_usd"]
                        ))
                        
                    except Exception as e:
                        print(f"   ⚠️ Failed to calculate cost for {source_chain} -> {dest_chain}: {e}")
        
        # Sort by cost
        routes.sort(key=lambda x: x[2])
        
        print(f"   📊 Found {len(routes)} possible routes")
        for i, (source, dest, cost) in enumerate(routes[:5]):  # Top 5
            print(f"   {i+1}. {source} -> {dest}: ${cost:.4f}")
        
        return routes
    
    async def monitor_transfer(self, transfer: CCTPTransfer) -> CCTPTransfer:
        """Monitor a transfer and update its status"""
        
        print(f"👀 Monitoring transfer {transfer.burn_tx_hash}")
        
        try:
            status = await self.get_transfer_status(transfer)
            transfer.status = status
            
            if status == "ready_to_mint":
                print("   ✅ Transfer ready to mint on destination chain")
            elif status == "waiting_for_attestation":
                print("   ⏳ Waiting for Circle attestation...")
            elif status == "completed":
                print("   🎉 Transfer completed successfully!")
            
            return transfer
            
        except Exception as e:
            print(f"❌ Transfer monitoring failed: {e}")
            return transfer

# Test CCTP integration
async def test_cctp_integration():
    """Test CCTP integration"""
    
    cctp = CCTPIntegration()
    
    # Test route optimization
    print("🔍 Testing route optimization...")
    routes = await cctp.find_optimal_transfer_route(1000.0, "0x1234567890123456789012345678901234567890")
    
    # Test cost calculation
    print("\n💰 Testing cost calculation...")
    cost_info = await cctp.calculate_transfer_cost("ethereum", "base", 1000.0)
    print(f"   Total cost: ${cost_info['total_cost_usd']:.4f}")
    print(f"   Cost percentage: {cost_info['cost_percentage']:.4f}%")
    
    # Test transfer initiation (without private key for demo)
    print("\n🌉 Testing transfer initiation...")
    try:
        transfer = await cctp.initiate_cross_chain_transfer(
            "ethereum",
            "base", 
            100.0,
            "0x1234567890123456789012345678901234567890",
            "0x" + "0" * 64  # Dummy private key for demo
        )
        print(f"   Transfer created: {transfer.nonce}")
    except Exception as e:
        print(f"   Expected error (no real private key): {e}")

if __name__ == "__main__":
    asyncio.run(test_cctp_integration())