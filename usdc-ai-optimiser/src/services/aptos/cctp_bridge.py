"""
CCTP Bridge Service for EVM to Aptos transfers
Handles Circle Cross-Chain Transfer Protocol integration
"""

import os
import asyncio
import time
import requests
from typing import Dict, Optional, List
from web3 import Web3
from aptos import AptosClient, Account, Ed25519PrivateKey
from aptos.transaction import TransactionBuilder
from aptos.transaction.payload import EntryFunction


class CCTPBridgeService:
    """Service for handling CCTP bridge transfers from EVM to Aptos"""
    
    def __init__(self):
        # Initialize Aptos client for testnet
        self.aptos_client = AptosClient("https://fullnode.testnet.aptoslabs.com/v1")
        
        # Initialize admin account for Aptos operations
        self.aptos_admin = None
        if os.getenv("APTOS_PRIVATE_KEY"):
            try:
                private_key = Ed25519PrivateKey.from_hex(os.getenv("APTOS_PRIVATE_KEY"))
                self.aptos_admin = Account(private_key)
                print(f"✅ Aptos admin initialized: {self.aptos_admin.address()}")
            except Exception as e:
                print(f"⚠️ Failed to initialize Aptos admin: {e}")
        
        # CCTP Configuration
        self.circle_iris_api = "https://iris-api.circle.com"
        self.vault_admin_addr = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b"
        
        # Chain configurations
        self.chain_configs = {
            "baseSepolia": {
                "domain": 6,
                "token_messenger": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
                "message_transmitter": "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
                "usdc_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
            },
            "aptos": {
                "domain": 1,
                "token_messenger": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832",
                "message_transmitter": "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832"
            }
        }
    
    def generate_bridge_id(self) -> str:
        """Generate unique bridge transaction ID"""
        return f"bridge_{int(time.time())}_{os.urandom(4).hex()}"
    
    async def ensure_vault_initialized(self) -> bool:
        """
        Check if vault is initialized and initialize if needed
        Returns True if vault is ready, False otherwise
        """
        try:
            # Try to get vault stats to check if initialized
            payload = {
                "function": f"{self.vault_admin_addr}::native_usdc_vault_fa::get_vault_stats",
                "function_arguments": [self.vault_admin_addr]
            }
            
            await self.aptos_client.view(payload)
            print("✅ Vault is already initialized")
            return True
            
        except Exception as e:
            print(f"🏗️ Vault not initialized, initializing now...")
            
            if not self.aptos_admin:
                print("❌ Cannot initialize vault: Aptos admin not configured")
                return False
            
            try:
                # Build initialization transaction
                payload = EntryFunction.natural(
                    f"{self.vault_admin_addr}::native_usdc_vault_fa",
                    "initialize",
                    [],
                    []
                )
                
                transaction = TransactionBuilder.build_simple_transaction(
                    sender=self.aptos_admin.address(),
                    payload=payload
                )
                
                # Sign and submit transaction
                signed_transaction = self.aptos_client.sign_transaction(self.aptos_admin, transaction)
                tx_hash = self.aptos_client.submit_transaction(signed_transaction)
                
                # Wait for transaction confirmation
                await self.aptos_client.wait_for_transaction(tx_hash)
                
                print(f"✅ Vault initialized successfully! TX: {tx_hash}")
                return True
                
            except Exception as init_error:
                print(f"❌ Failed to initialize vault: {init_error}")
                return False
    
    def aptos_address_to_bytes32(self, aptos_address: str) -> str:
        """
        Convert Aptos address to bytes32 format for EVM
        """
        clean_address = aptos_address.replace('0x', '')
        
        # Aptos addresses can be longer than 32 bytes, so we need to truncate or hash them
        # For CCTP, we need exactly 32 bytes (64 hex characters)
        if len(clean_address) > 64:
            # Hash the address to get 32 bytes
            import hashlib
            hash_obj = hashlib.sha256(clean_address.encode())
            return "0x" + hash_obj.hexdigest()
        else:
            # Pad with zeros to 64 characters
            padded = clean_address.ljust(64, '0')
            return "0x" + padded
    
    async def initiate_cctp_transfer(
        self, 
        from_chain: str, 
        to_chain: str, 
        amount: float, 
        recipient_address: str,
        web3_provider: Web3
    ) -> Dict[str, any]:
        """
        Initiate CCTP transfer from EVM chain to Aptos
        Returns transaction hash and bridge ID
        """
        try:
            # Ensure vault is initialized
            vault_ready = await self.ensure_vault_initialized()
            if not vault_ready:
                return {"success": False, "error": "Vault not initialized"}
            
            # Generate unique bridge ID
            bridge_id = self.generate_bridge_id()
            
            # Convert amount to micro USDC (6 decimals)
            amount_micro = int(amount * 1_000_000)
            
            # Convert Aptos address to bytes32 format
            recipient_bytes32 = self.aptos_address_to_bytes32(recipient_address)
            
            # Get chain configuration
            from_config = self.chain_configs.get(from_chain)
            to_config = self.chain_configs.get(to_chain)
            
            if not from_config or not to_config:
                return {"success": False, "error": f"Unsupported chain: {from_chain} -> {to_chain}"}
            
            # Build CCTP depositForBurn transaction
            # This would typically be done through the EVM smart wallet
            # For demo purposes, we'll simulate the transaction
            
            print(f"🌉 Initiating CCTP transfer:")
            print(f"   From: {from_chain}")
            print(f"   To: {to_chain}")
            print(f"   Amount: ${amount} ({amount_micro} micro USDC)")
            print(f"   Recipient: {recipient_address}")
            print(f"   Bridge ID: {bridge_id}")
            
            # Simulate transaction hash (in real implementation, this would be the actual tx hash)
            mock_tx_hash = f"0x{os.urandom(32).hex()}"
            
            return {
                "success": True,
                "bridge_id": bridge_id,
                "tx_hash": mock_tx_hash,
                "amount": amount,
                "recipient": recipient_address,
                "message": f"CCTP transfer initiated: ${amount} from {from_chain} to {to_chain}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_attestation(self, message_hash: str) -> Optional[Dict[str, any]]:
        """
        Get attestation from Circle's Iris API
        """
        try:
            url = f"{self.circle_iris_api}/attestations/{message_hash}"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                return response.json()
            else:
                return None
                
        except Exception as e:
            print(f"❌ Error getting attestation: {e}")
            return None
    
    async def wait_for_attestation(self, message_hash: str, max_wait_time: int = 300) -> Optional[str]:
        """
        Wait for attestation from Circle's Iris API
        Returns attestation signature if successful
        """
        start_time = time.time()
        
        while time.time() - start_time < max_wait_time:
            attestation = await self.get_attestation(message_hash)
            
            if attestation and attestation.get("status") == "complete":
                return attestation.get("attestation")
            
            print(f"⏳ Waiting for attestation... ({int(time.time() - start_time)}s)")
            await asyncio.sleep(10)
        
        return None
    
    async def complete_cctp_transfer(
        self, 
        message_hash: str, 
        attestation: str, 
        recipient_address: str
    ) -> Dict[str, any]:
        """
        Complete CCTP transfer by minting USDC on Aptos
        """
        if not self.aptos_admin:
            return {"success": False, "error": "Aptos admin not configured"}
        
        try:
            # This would typically involve calling the CCTP message transmitter
            # For demo purposes, we'll simulate the completion
            
            print(f"🎯 Completing CCTP transfer:")
            print(f"   Message hash: {message_hash}")
            print(f"   Recipient: {recipient_address}")
            print(f"   Attestation: {attestation[:20]}...")
            
            # Simulate transaction hash
            mock_tx_hash = f"0x{os.urandom(32).hex()}"
            
            return {
                "success": True,
                "tx_hash": mock_tx_hash,
                "message": "CCTP transfer completed successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def execute_full_cctp_flow(
        self, 
        from_chain: str, 
        to_chain: str, 
        amount: float, 
        recipient_address: str,
        web3_provider: Web3
    ) -> Dict[str, any]:
        """
        Execute complete CCTP flow: initiate transfer, wait for attestation, complete transfer
        """
        try:
            # Step 1: Initiate CCTP transfer
            initiate_result = await self.initiate_cctp_transfer(
                from_chain, to_chain, amount, recipient_address, web3_provider
            )
            
            if not initiate_result["success"]:
                return initiate_result
            
            bridge_id = initiate_result["bridge_id"]
            tx_hash = initiate_result["tx_hash"]
            
            print(f"✅ Step 1 Complete: CCTP transfer initiated")
            print(f"   Bridge ID: {bridge_id}")
            print(f"   TX Hash: {tx_hash}")
            
            # Step 2: Wait for attestation (simulate)
            print("⏳ Step 2: Waiting for attestation...")
            await asyncio.sleep(5)  # Simulate waiting
            
            # Step 3: Complete transfer
            print("🎯 Step 3: Completing transfer...")
            complete_result = await self.complete_cctp_transfer(
                tx_hash, "mock_attestation", recipient_address
            )
            
            if not complete_result["success"]:
                return complete_result
            
            return {
                "success": True,
                "bridge_id": bridge_id,
                "initiate_tx": tx_hash,
                "complete_tx": complete_result["tx_hash"],
                "message": f"Complete CCTP flow executed: ${amount} from {from_chain} to {to_chain}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


# Example usage and testing
async def test_cctp_bridge():
    """Test the CCTP bridge service"""
    bridge_service = CCTPBridgeService()
    
    # Test vault initialization
    vault_ready = await bridge_service.ensure_vault_initialized()
    print(f"Vault ready: {vault_ready}")
    
    # Test CCTP flow (simulated)
    result = await bridge_service.execute_full_cctp_flow(
        from_chain="baseSepolia",
        to_chain="aptos",
        amount=100.0,
        recipient_address="0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b",
        web3_provider=None  # Would be actual Web3 provider
    )
    print(f"CCTP flow result: {result}")


if __name__ == "__main__":
    asyncio.run(test_cctp_bridge())