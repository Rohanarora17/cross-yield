"""
Aptos Vault Integration Service
Handles interactions with the Aptos native USDC vault contract
"""

import os
import asyncio
from typing import Dict, Optional, Tuple
from aptos_sdk.async_client import RestClient
from aptos_sdk.account import Account
from aptos_sdk.transactions import EntryFunction


class VaultIntegrationService:
    """Service for interacting with Aptos native USDC vault contract"""
    
    def __init__(self):
        # Initialize Aptos client for testnet
        self.client = RestClient("https://fullnode.testnet.aptoslabs.com/v1")
        
        # Contract address for the native USDC vault
        self.contract_address = "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b"
        
        # Initialize admin account if private key is provided
        self.vault_admin = None
        if os.getenv("APTOS_VAULT_ADMIN_KEY"):
            try:
                private_key = Ed25519PrivateKey.from_hex(os.getenv("APTOS_VAULT_ADMIN_KEY"))
                self.vault_admin = Account(private_key)
                print(f"✅ Vault admin initialized: {self.vault_admin.address()}")
            except Exception as e:
                print(f"⚠️ Failed to initialize vault admin: {e}")
    
    async def get_vault_stats(self, admin_address: str) -> Dict[str, int]:
        """
        Get vault statistics (total deposits, total yield, user count)
        For demo purposes, returns mock data since view function calls are complex
        """
        try:
            # In a real implementation, this would call the view function
            # payload = {
            #     "function": f"{self.contract_address}::native_usdc_vault_fa::get_vault_stats",
            #     "function_arguments": [admin_address]
            # }
            # result = await self.client.view(payload)
            
            # For demo, return mock data
            return {
                "total_deposits": 12500,  # $12.5K deposited
                "total_yield": 245,       # $245 yield earned
                "user_count": 8           # 8 users
            }
        except Exception as e:
            print(f"❌ Error getting vault stats: {e}")
            return {"total_deposits": 0, "total_yield": 0, "user_count": 0}
    
    async def get_user_position(self, user_address: str) -> Dict[str, float]:
        """
        Get user position in vault (principal, yield earned, total balance)
        For demo purposes, returns mock data
        """
        try:
            # In a real implementation, this would call the view function
            # payload = {
            #     "function": f"{self.contract_address}::native_usdc_vault_fa::get_user_position",
            #     "function_arguments": [user_address]
            # }
            # result = await self.client.view(payload)
            
            # For demo, return mock data
            return {
                "principal": 1000.0,       # $1K deposited
                "yield_earned": 23.45,     # $23.45 yield
                "total_balance": 1023.45, # $1,023.45 total
                "last_deposit_time": 1700000000,  # Mock timestamp
                "last_withdraw_time": 0
            }
        except Exception as e:
            print(f"❌ Error getting user position: {e}")
            return {"principal": 0.0, "yield_earned": 0.0, "total_balance": 0.0, "last_deposit_time": 0, "last_withdraw_time": 0}
    
    async def initialize_vault(self) -> Dict[str, any]:
        """
        Initialize the vault (admin only)
        Returns success status and transaction hash
        """
        if not self.vault_admin:
            return {"success": False, "error": "Vault admin not configured"}
        
        try:
            # Build initialization transaction
            payload = EntryFunction.natural(
                f"{self.contract_address}::native_usdc_vault_fa",
                "initialize",
                [],
                []
            )
            
            transaction = TransactionBuilder.build_simple_transaction(
                sender=self.vault_admin.address(),
                payload=payload
            )
            
            # Sign and submit transaction
            signed_transaction = self.client.sign_transaction(self.vault_admin, transaction)
            tx_hash = self.client.submit_transaction(signed_transaction)
            
            # Wait for transaction confirmation
            await self.client.wait_for_transaction(tx_hash)
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "message": "Vault initialized successfully"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def add_yield_to_user(self, user_address: str, yield_amount: float) -> Dict[str, any]:
        """
        Add yield to user position (admin only)
        Returns success status and transaction hash
        """
        if not self.vault_admin:
            return {"success": False, "error": "Vault admin not configured"}
        
        try:
            # Convert yield amount to micro USDC (6 decimals)
            yield_amount_micro = int(yield_amount * 1_000_000)
            
            # Build add yield transaction
            payload = EntryFunction.natural(
                f"{self.contract_address}::native_usdc_vault_fa",
                "add_yield",
                [],
                [user_address, yield_amount_micro]
            )
            
            transaction = TransactionBuilder.build_simple_transaction(
                sender=self.vault_admin.address(),
                payload=payload
            )
            
            # Sign and submit transaction
            signed_transaction = self.client.sign_transaction(self.vault_admin, transaction)
            tx_hash = self.client.submit_transaction(signed_transaction)
            
            # Wait for transaction confirmation
            await self.client.wait_for_transaction(tx_hash)
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "message": f"Added ${yield_amount} yield to user {user_address}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def generate_deposit_transaction(self, user_address: str, amount: float, admin_address: str) -> Dict[str, any]:
        """
        Generate deposit transaction for user (to be signed by user)
        Returns transaction payload that user can sign
        """
        try:
            # Convert amount to micro USDC (6 decimals)
            amount_micro = int(amount * 1_000_000)
            
            # Build deposit transaction payload
            payload = EntryFunction.natural(
                f"{self.contract_address}::native_usdc_vault_fa",
                "deposit",
                [],
                [amount_micro, admin_address]
            )
            
            return {
                "success": True,
                "payload": payload,
                "message": f"Generated deposit transaction for ${amount} USDC",
                "note": "User must sign this transaction themselves"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def generate_withdraw_transaction(self, user_address: str, amount: float) -> Dict[str, any]:
        """
        Generate withdraw transaction (admin signs)
        Returns transaction payload
        """
        if not self.vault_admin:
            return {"success": False, "error": "Vault admin not configured"}
        
        try:
            # Convert amount to micro USDC (6 decimals)
            amount_micro = int(amount * 1_000_000)
            
            # Build withdraw transaction
            payload = EntryFunction.natural(
                f"{self.contract_address}::native_usdc_vault_fa",
                "withdraw",
                [],
                [user_address, amount_micro]
            )
            
            transaction = TransactionBuilder.build_simple_transaction(
                sender=self.vault_admin.address(),
                payload=payload
            )
            
            return {
                "success": True,
                "transaction": transaction,
                "message": f"Generated withdraw transaction for ${amount} USDC"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def execute_withdraw(self, user_address: str, amount: float) -> Dict[str, any]:
        """
        Execute withdraw transaction (admin signs and submits)
        Returns success status and transaction hash
        """
        if not self.vault_admin:
            return {"success": False, "error": "Vault admin not configured"}
        
        try:
            # Generate withdraw transaction
            tx_result = await self.generate_withdraw_transaction(user_address, amount)
            if not tx_result["success"]:
                return tx_result
            
            transaction = tx_result["transaction"]
            
            # Sign and submit transaction
            signed_transaction = self.client.sign_transaction(self.vault_admin, transaction)
            tx_hash = self.client.submit_transaction(signed_transaction)
            
            # Wait for transaction confirmation
            await self.client.wait_for_transaction(tx_hash)
            
            return {
                "success": True,
                "tx_hash": tx_hash,
                "message": f"Withdrew ${amount} USDC for user {user_address}"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def get_vault_resource_address(self, admin_address: str) -> str:
        """
        Get vault resource address for deposits
        For demo purposes, returns a mock resource address
        """
        # In a real implementation, this would query the vault contract
        # For demo, return a mock resource address
        return f"{admin_address}_resource_vault"


# Example usage and testing
async def test_vault_integration():
    """Test the vault integration service"""
    vault_service = VaultIntegrationService()
    
    # Test getting vault stats
    stats = await vault_service.get_vault_stats("0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b")
    print(f"Vault stats: {stats}")
    
    # Test getting user position
    user_pos = await vault_service.get_user_position("0x1234567890abcdef")
    print(f"User position: {user_pos}")
    
    # Test generating deposit transaction
    deposit_tx = vault_service.generate_deposit_transaction(
        "0x1234567890abcdef", 
        100.0, 
        "0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b"
    )
    print(f"Deposit transaction: {deposit_tx}")


if __name__ == "__main__":
    asyncio.run(test_vault_integration())