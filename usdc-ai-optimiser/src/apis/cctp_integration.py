# src/apis/cctp_integration.py
"""Circle's Cross-Chain Transfer Protocol (CCTP) Integration"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from web3 import Web3
from eth_account import Account
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

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
        # Official CCTP contract addresses from Circle documentation
        self.chain_configs = {
            # Mainnet addresses
            "ethereum": CCTPChainConfig(
                chain_id=1,
                name="Ethereum",
                rpc_url=f"https://eth-mainnet.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY', 'demo')}",
                token_messenger_address="0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
                message_transmitter_address="0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
                usdc_address="0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # Official Ethereum USDC
                gas_limit=200000,
                gas_price_gwei=20.0
            ),
            "base": CCTPChainConfig(
                chain_id=8453,
                name="Base",
                rpc_url="https://mainnet.base.org",
                token_messenger_address="0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
                message_transmitter_address="0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
                usdc_address="0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                gas_limit=200000,
                gas_price_gwei=0.001
            ),
            "arbitrum": CCTPChainConfig(
                chain_id=42161,
                name="Arbitrum",
                rpc_url="https://arb1.arbitrum.io/rpc",
                token_messenger_address="0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
                message_transmitter_address="0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
                usdc_address="0xaf88d065e77c8cC2239327C5EDb3A432268e5831",  # Official Arbitrum USDC
                gas_limit=200000,
                gas_price_gwei=0.1
            ),
            "polygon": CCTPChainConfig(
                chain_id=137,
                name="Polygon",
                rpc_url="https://polygon-rpc.com",
                token_messenger_address="0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
                message_transmitter_address="0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
                usdc_address="0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",  # Official Polygon USDC
                gas_limit=200000,
                gas_price_gwei=30.0
            ),
            "avalanche": CCTPChainConfig(
                chain_id=43114,
                name="Avalanche",
                rpc_url="https://api.avax.network/ext/bc/C/rpc",
                token_messenger_address="0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d",
                message_transmitter_address="0x81D40F21F12A8F0E3252Bccb954D722d4c464B64",
                usdc_address="0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",  # Official Avalanche USDC
                gas_limit=200000,
                gas_price_gwei=25.0
            ),
            # Testnet addresses (official Circle addresses)
            "ethereum_sepolia": CCTPChainConfig(
                chain_id=11155111,
                name="Ethereum Sepolia",
                rpc_url=f"https://eth-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY', 'demo')}",
                token_messenger_address="0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
                message_transmitter_address="0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
                usdc_address="0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
                gas_limit=200000,
                gas_price_gwei=0.1
            ),
            "base_sepolia": CCTPChainConfig(
                chain_id=84532,
                name="Base Sepolia",
                rpc_url="https://sepolia.base.org",
                token_messenger_address="0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
                message_transmitter_address="0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
                usdc_address="0x036CbD53842c5426634e7929541eC2318f3dCF7e",  # Official Base Sepolia USDC
                gas_limit=200000,
                gas_price_gwei=0.001
            ),
            "arbitrum_sepolia": CCTPChainConfig(
                chain_id=421614,
                name="Arbitrum Sepolia",
                rpc_url=f"https://arb-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY', 'demo')}",
                token_messenger_address="0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
                message_transmitter_address="0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
                usdc_address="0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",  # Official Arbitrum Sepolia USDC
                gas_limit=200000,
                gas_price_gwei=0.1
            ),
            "avalanche_fuji": CCTPChainConfig(
                chain_id=43113,
                name="Avalanche Fuji",
                rpc_url="https://api.avax-test.network/ext/bc/C/rpc",
                token_messenger_address="0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
                message_transmitter_address="0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",
                usdc_address="0x5425890298aed601595a70AB815c96711a31Bc65",
                gas_limit=200000,
                gas_price_gwei=25.0
            )
        }
        
        # CCTP V2 ABI fragments - Official from Circle
        self.token_messenger_abi = [
            {
                "inputs": [
                    {"name": "amount", "type": "uint256"},
                    {"name": "destinationDomain", "type": "uint32"},
                    {"name": "mintRecipient", "type": "bytes32"},
                    {"name": "burnToken", "type": "address"},
                    {"name": "hookData", "type": "bytes32"},
                    {"name": "maxFee", "type": "uint256"},
                    {"name": "finalityThreshold", "type": "uint32"}
                ],
                "name": "depositForBurn",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "amount", "type": "uint256"},
                    {"name": "destinationDomain", "type": "uint32"},
                    {"name": "mintRecipient", "type": "bytes32"},
                    {"name": "burnToken", "type": "address"},
                    {"name": "destinationCaller", "type": "bytes32"}
                ],
                "name": "depositForBurnWithCaller",
                "outputs": [{"name": "_nonce", "type": "uint64"}],
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
            },
            {
                "inputs": [
                    {"name": "owner", "type": "address"},
                    {"name": "spender", "type": "address"}
                ],
                "name": "allowance",
                "outputs": [{"name": "remaining", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            },
            {
                "inputs": [],
                "name": "totalSupply",
                "outputs": [{"name": "supply", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]
        
        # Domain mappings for CCTP V2
        self.domain_mappings = {
            # Mainnet domains
            "ethereum": 0,
            "avalanche": 1,
            "base": 6,
            "arbitrum": 3,
            "polygon": 7,
            # Testnet domains
            "ethereum_sepolia": 0,
            "avalanche_fuji": 1,
            "base_sepolia": 6,
            "arbitrum_sepolia": 3
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
                address=w3.to_checksum_address(config.usdc_address),
                abi=self.usdc_abi
            )
            
            balance = usdc_contract.functions.balanceOf(account.address).call()
            if balance < amount_wei:
                raise ValueError(f"Insufficient USDC balance: {balance/10**6} < {amount}")
            
            # Approve USDC spending
            print("   📝 Approving USDC spending...")
            approve_tx = usdc_contract.functions.approve(
                w3.to_checksum_address(config.token_messenger_address),
                amount_wei
            ).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': w3.to_wei(config.gas_price_gwei, 'gwei'),
                'nonce': w3.eth.get_transaction_count(account.address)
            })
            
            signed_approve = account.sign_transaction(approve_tx)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
            print(f"   ✅ Approval tx: {approve_tx_hash.hex()}")

            # Wait for approval confirmation
            receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
            print(f"   ✅ Approval confirmed in block {receipt.blockNumber}")
            
            # Initiate burn
            print("   🔥 Initiating USDC burn...")
            token_messenger = w3.eth.contract(
                address=w3.to_checksum_address(config.token_messenger_address),
                abi=self.token_messenger_abi
            )
            
            destination_domain = self._get_domain(destination_chain)
            # Convert recipient address to bytes32 format (pad with zeros)
            recipient_bytes32 = "0x" + "0" * 24 + recipient[2:]  # Remove 0x and pad with 24 zeros
            
            # Get current gas price and increase nonce
            current_nonce = w3.eth.get_transaction_count(account.address)
            gas_price = max(w3.eth.gas_price, w3.to_wei(config.gas_price_gwei, 'gwei'))

            # Circle CCTP V2 parameters (from official implementation)
            hook_data = "0x" + "0" * 64  # Empty bytes32
            max_fee = amount_wei - 1  # Slightly less than burn amount
            finality_threshold = 2000  # Standard transfer (1000 for fast)

            burn_tx = token_messenger.functions.depositForBurn(
                amount_wei,
                destination_domain,
                recipient_bytes32,
                w3.to_checksum_address(config.usdc_address),
                hook_data,
                max_fee,
                finality_threshold
            ).build_transaction({
                'from': account.address,
                'gas': config.gas_limit,
                'gasPrice': gas_price,
                'nonce': current_nonce
            })
            
            signed_burn = account.sign_transaction(burn_tx)
            burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)
            
            # Wait for transaction confirmation
            receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

            # Check if transaction succeeded
            if receipt.status != 1:
                raise ValueError(f"Burn transaction failed. TX: {burn_tx_hash.hex()}, Gas used: {receipt.gasUsed}")

            print(f"   ✅ Burn tx: {burn_tx_hash.hex()}")
            print(f"   ⛽ Gas used: {receipt.gasUsed}")
            print(f"   📋 Logs: {len(receipt.logs)}")
            
            # Extract nonce from logs - MessageSent event signature
            # MessageSent event: keccak256("MessageSent(bytes)")
            message_sent_signature = "0x8c5261668696ce22758910d05bab8f186d6eb247ceac2af2e82c7dc17669b036"
            nonce = 0

            if receipt.logs:
                for log in receipt.logs:
                    # Look for MessageSent event
                    if len(log.topics) > 0 and log.topics[0].hex() == message_sent_signature:
                        # Nonce is in the message data - extract from topics
                        if len(log.topics) >= 2:
                            try:
                                nonce = int(log.topics[1].hex(), 16)
                                print(f"   📝 Extracted nonce from MessageSent event: {nonce}")
                                break
                            except:
                                pass

                # Fallback: try other logs if MessageSent not found
                if nonce == 0:
                    for log in receipt.logs:
                        if len(log.topics) >= 2:
                            try:
                                potential_nonce = int(log.topics[1].hex(), 16)
                                if 0 < potential_nonce < 2**32:  # Reasonable nonce range
                                    nonce = potential_nonce
                                    print(f"   📝 Extracted nonce from log: {nonce}")
                                    break
                            except:
                                continue

            # Create transfer record
            transfer = CCTPTransfer(
                source_chain=source_chain,
                destination_chain=destination_chain,
                amount=amount,
                recipient=recipient,
                nonce=nonce,
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
            source_domain = self._get_domain(transfer.source_chain)
            attestation_data = await self._get_attestation(transfer.burn_tx_hash, source_domain)
            if not attestation_data:
                raise ValueError("Failed to get attestation from Circle")
            
            # Extract attestation from Circle's response
            attestation_hex = attestation_data.get('attestation')
            
            if not attestation_hex:
                raise ValueError("Invalid attestation data from Circle")
            
            attestation = bytes.fromhex(attestation_hex[2:])  # Remove 0x prefix
            
            # Get message from source chain transaction logs (API returns message: null)
            message = await self._get_message(transfer.source_chain, transfer.burn_tx_hash)
            if not message:
                raise ValueError("Failed to get message from source chain")
            
            # Mint USDC on destination chain
            print("   🪙 Minting USDC on destination chain...")
            message_transmitter = w3.eth.contract(
                address=w3.to_checksum_address(config.message_transmitter_address),
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
            mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)
            
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
    
    
    async def _get_attestation(self, burn_tx_hash: str, source_domain: int) -> Optional[dict]:
        """Get attestation from Circle's CCTP V2 API"""
        
        print("   🔍 Getting attestation from Circle...")
        
        try:
            # Get transaction receipt to extract nonce from logs
            source_config = next(cfg for cfg in self.chain_configs.values()
                                if self._get_domain(cfg.name.lower().replace(' ', '_')) == source_domain)
            w3 = Web3(Web3.HTTPProvider(source_config.rpc_url))
            receipt = w3.eth.get_transaction_receipt(burn_tx_hash)

            # Extract nonce from transaction logs
            nonce = 0
            if receipt.logs:
                for log in receipt.logs:
                    if len(log.topics) >= 2:
                        try:
                            nonce = int(log.topics[1].hex(), 16)
                            break
                        except:
                            continue

            # Circle's CCTP attestation API for testnet
            url = f"https://iris-api-sandbox.circle.com/attestations/{burn_tx_hash}"
            
            max_attempts = 30  # Wait up to 5 minutes
            attempt = 0
            
            while attempt < max_attempts:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()

                            # Check if attestation is ready
                            if data.get('status') == 'complete':
                                print(f"   ✅ Attestation ready!")
                                return data
                            else:
                                status = data.get('status', 'pending')
                                print(f"   ⏳ Attestation status: {status}, waiting...")
                        elif response.status == 404:
                            print(f"   ⏳ Transaction not found yet, attempt {attempt + 1}/{max_attempts}")
                        else:
                            print(f"   ⚠️ API error: {response.status}")
                            text = await response.text()
                            print(f"      Error details: {text}")

                attempt += 1
                if attempt < max_attempts:
                    print(f"   ⏳ Waiting 10 seconds before retry...")
                    await asyncio.sleep(10)
            
            print(f"   ❌ Attestation not ready after {max_attempts} attempts")
            return None
            
        except Exception as e:
            print(f"   ❌ Error getting attestation: {e}")
            return None

    async def calculate_transfer_cost(
        self,
        source_chain: str,
        destination_chain: str,
        amount: float
    ) -> Dict[str, float]:
        """Calculate total cost of CCTP transfer"""

        source_config = self.chain_configs[source_chain]
        dest_config = self.chain_configs[destination_chain]

        # Gas costs (estimated)
        source_gas_cost = source_config.gas_limit * source_config.gas_price_gwei * 1e-9  # Convert to ETH
        dest_gas_cost = dest_config.gas_limit * dest_config.gas_price_gwei * 1e-9

        # Get current ETH prices (simplified - in production use real price feeds)
        eth_prices = {
            "ethereum": 3000,
            "ethereum_sepolia": 3000,
            "base": 3000,
            "base_sepolia": 3000,
            "arbitrum": 3000,
            "arbitrum_sepolia": 3000,
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
        config = self.chain_configs[transfer.destination_chain]
        
        # Get attestation from Circle's API
        source_domain = self._get_domain(transfer.source_chain)
        attestation_data = await self._get_attestation(transfer.burn_tx_hash, source_domain)
        
        if not attestation_data:
            raise ValueError("Failed to get attestation from Circle")
        
        # Extract message and attestation from API response
        message_hex = attestation_data.get('message')
        attestation_hex = attestation_data.get('attestation')
        
        if not message_hex or not attestation_hex:
            raise ValueError("Invalid attestation data - missing message or attestation")
        
        # Convert to bytes
        message = bytes.fromhex(message_hex[2:])  # Remove 0x prefix
        attestation = bytes.fromhex(attestation_hex[2:])  # Remove 0x prefix
        
        print(f"   📝 Message length: {len(message)} bytes")
        print(f"   ✍️ Attestation length: {len(attestation)} bytes")
        
        # Mint USDC on destination chain
        print("   🪙 Minting USDC on destination chain...")
        message_transmitter = w3.eth.contract(
            address=w3.to_checksum_address(config.message_transmitter_address),
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
        mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)
        
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

    
    async def get_transfer_status(self, transfer: CCTPTransfer) -> str:
        """Get current status of a CCTP transfer"""
        
        try:
            if transfer.status == "burned":
                # Check if attestation is available
                source_domain = self._get_domain(transfer.source_chain)
                attestation_data = await self._get_attestation(transfer.burn_tx_hash, source_domain)
                if attestation_data:
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