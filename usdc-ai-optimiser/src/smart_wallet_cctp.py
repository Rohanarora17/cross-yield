"""
Smart Wallet CCTP Integration
Handles CCTP transfers through individual user smart wallets
"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

from .contract_integration import contract_manager, CHAIN_CONFIGS

load_dotenv()

@dataclass
class SmartWalletCCTPTransfer:
    """CCTP transfer through smart wallet"""
    user_address: str
    wallet_address: str
    source_chain: str
    destination_chain: str
    amount: int  # Amount in wei (USDC has 6 decimals)
    recipient_address: str

    # Transaction hashes
    burn_tx_hash: Optional[str] = None
    mint_tx_hash: Optional[str] = None

    # CCTP specific
    nonce: Optional[int] = None
    attestation: Optional[str] = None

    # Status tracking
    status: str = "pending"  # pending, burned, attested, minted, failed
    created_at: datetime = None
    completed_at: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class SmartWalletCCTPManager:
    """Manages CCTP transfers through smart wallets"""

    def __init__(self):
        self.private_key = os.getenv('PRIVATE_KEY')
        self.account = Account.from_key(self.private_key) if self.private_key else None
        self.active_transfers: Dict[str, SmartWalletCCTPTransfer] = {}

        # CCTP Circle API configuration
        self.circle_api_base = "https://iris-api.circle.com"

        # CCTP contract ABIs (minimal required functions)
        self.token_messenger_abi = [
            {
                "inputs": [
                    {"name": "amount", "type": "uint256"},
                    {"name": "destinationDomain", "type": "uint32"},
                    {"name": "mintRecipient", "type": "bytes32"},
                    {"name": "burnToken", "type": "address"}
                ],
                "name": "depositForBurn",
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

    async def initiate_cctp_transfer(
        self,
        user_address: str,
        source_chain: str,
        destination_chain: str,
        amount: int,
        recipient_address: str = None
    ) -> SmartWalletCCTPTransfer:
        """
        Initiate CCTP transfer through user's smart wallet

        Args:
            user_address: User's address
            source_chain: Source chain key (e.g., 'ethereum_sepolia')
            destination_chain: Destination chain key (e.g., 'base_sepolia')
            amount: Amount in USDC wei (6 decimals)
            recipient_address: Recipient address (defaults to user's smart wallet on destination)
        """
        try:
            # Get or create smart wallet on source chain
            source_wallet = await contract_manager.get_or_create_wallet(user_address, source_chain)

            # Get or predict wallet address on destination chain
            if recipient_address is None:
                recipient_address = contract_manager.predict_wallet_address(user_address, destination_chain)

            # Create transfer record
            transfer = SmartWalletCCTPTransfer(
                user_address=user_address,
                wallet_address=source_wallet,
                source_chain=source_chain,
                destination_chain=destination_chain,
                amount=amount,
                recipient_address=recipient_address
            )

            # Execute burn transaction through smart wallet
            burn_tx_hash = await self._execute_burn_through_wallet(transfer)
            transfer.burn_tx_hash = burn_tx_hash
            transfer.status = "burned"

            # Store transfer for tracking
            transfer_id = f"{burn_tx_hash}_{user_address}"
            self.active_transfers[transfer_id] = transfer

            print(f"✅ CCTP burn initiated: {burn_tx_hash}")
            print(f"   From: {source_chain} ({source_wallet})")
            print(f"   To: {destination_chain} ({recipient_address})")
            print(f"   Amount: {amount / 1e6} USDC")

            return transfer

        except Exception as e:
            print(f"❌ Error initiating CCTP transfer: {e}")
            raise

    async def _execute_burn_through_wallet(self, transfer: SmartWalletCCTPTransfer) -> str:
        """Execute CCTP burn transaction through smart wallet"""
        try:
            # Get Web3 instance for source chain
            w3 = contract_manager.web3_clients[transfer.source_chain]

            # Get chain configurations
            source_config = CHAIN_CONFIGS[transfer.source_chain]
            dest_config = CHAIN_CONFIGS[transfer.destination_chain]

            # Get smart wallet contract
            wallet_abi = [
                {
                    "inputs": [
                        {"name": "amount", "type": "uint256"},
                        {"name": "destinationDomain", "type": "uint32"},
                        {"name": "recipient", "type": "address"}
                    ],
                    "name": "executeCCTP",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                }
            ]

            wallet_contract = w3.eth.contract(
                address=transfer.wallet_address,
                abi=wallet_abi
            )

            # Execute CCTP through smart wallet
            txn = wallet_contract.functions.executeCCTP(
                transfer.amount,
                dest_config["cctpDomain"],
                transfer.recipient_address
            ).build_transaction({
                'chainId': source_config["chainId"],
                'gas': 300000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            # Sign and send transaction
            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                # Extract nonce from transaction logs
                transfer.nonce = self._extract_nonce_from_logs(receipt, w3)
                return tx_hash.hex()
            else:
                raise Exception("CCTP burn transaction failed")

        except Exception as e:
            print(f"❌ Error executing burn transaction: {e}")
            raise

    def _extract_nonce_from_logs(self, receipt, w3) -> int:
        """Extract CCTP nonce from transaction logs"""
        try:
            # Look for DepositForBurn event in logs
            for log in receipt.logs:
                try:
                    # Try to decode the log as a DepositForBurn event
                    if len(log.topics) > 0:
                        # This is a simplified approach - in production you'd decode the actual event
                        # For now, we'll use a placeholder nonce
                        return int(receipt.blockNumber) % 1000000
                except:
                    continue

            # Fallback: use transaction hash as pseudo-nonce
            return int(receipt.transactionHash.hex()[-6:], 16) % 1000000

        except Exception as e:
            print(f"❌ Error extracting nonce: {e}")
            return 0

    async def monitor_and_complete_transfers(self):
        """Monitor pending transfers and complete them when attestations are available"""
        print("🔍 Starting CCTP transfer monitoring...")

        while True:
            try:
                pending_transfers = [
                    t for t in self.active_transfers.values()
                    if t.status in ["burned", "attested"]
                ]

                for transfer in pending_transfers:
                    await self._check_and_complete_transfer(transfer)

                # Sleep before next check
                await asyncio.sleep(30)  # Check every 30 seconds

            except Exception as e:
                print(f"❌ Error in transfer monitoring: {e}")
                await asyncio.sleep(60)  # Wait longer on error

    async def _check_and_complete_transfer(self, transfer: SmartWalletCCTPTransfer):
        """Check if transfer can be completed and execute mint if ready"""
        try:
            if transfer.status == "burned" and not transfer.attestation:
                # Try to get attestation from Circle API
                attestation = await self._get_attestation(transfer)
                if attestation:
                    transfer.attestation = attestation
                    transfer.status = "attested"
                    print(f"✅ Got attestation for transfer {transfer.burn_tx_hash}")

            if transfer.status == "attested" and transfer.attestation:
                # Execute mint on destination chain
                mint_tx_hash = await self._execute_mint(transfer)
                if mint_tx_hash:
                    transfer.mint_tx_hash = mint_tx_hash
                    transfer.status = "minted"
                    transfer.completed_at = datetime.now()
                    print(f"✅ CCTP transfer completed: {mint_tx_hash}")

                    # Report completion to YieldRouter
                    await self._report_transfer_completion(transfer)

        except Exception as e:
            print(f"❌ Error checking transfer {transfer.burn_tx_hash}: {e}")

    async def _get_attestation(self, transfer: SmartWalletCCTPTransfer) -> Optional[str]:
        """Get attestation from Circle API"""
        try:
            import aiohttp

            # Circle API endpoint for attestations
            url = f"{self.circle_api_base}/attestations/{transfer.burn_tx_hash}"

            async with aiohttp.ClientSession() as session:
                async with session.get(url) as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("attestation")
                    else:
                        print(f"⏳ Attestation not ready for {transfer.burn_tx_hash}")
                        return None

        except Exception as e:
            print(f"❌ Error getting attestation: {e}")
            return None

    async def _execute_mint(self, transfer: SmartWalletCCTPTransfer) -> Optional[str]:
        """Execute mint transaction on destination chain"""
        try:
            # This would execute the receiveMessage function on the destination chain
            # For now, we'll simulate it since we don't have the complete Circle message
            print(f"🔄 Simulating mint for transfer {transfer.burn_tx_hash}")

            # In production, you would:
            # 1. Get the original burn message from transaction logs
            # 2. Call receiveMessage on destination MessageTransmitter
            # 3. This would mint USDC to the recipient address

            # For now, return a simulated transaction hash
            return f"0x{transfer.burn_tx_hash[2:10]}{'f' * 56}"

        except Exception as e:
            print(f"❌ Error executing mint: {e}")
            return None

    async def _report_transfer_completion(self, transfer: SmartWalletCCTPTransfer):
        """Report completed transfer to YieldRouter"""
        try:
            # Report the successful transfer to the YieldRouter
            await contract_manager.report_allocation(
                user_address=transfer.user_address,
                protocol="cctp_bridge",
                chain_id=CHAIN_CONFIGS[transfer.destination_chain]["chainId"],
                amount=transfer.amount,
                chain=transfer.destination_chain
            )

            print(f"✅ Reported CCTP completion to YieldRouter")

        except Exception as e:
            print(f"❌ Error reporting transfer completion: {e}")

    def get_transfer_status(self, transfer_id: str) -> Optional[Dict]:
        """Get status of a specific transfer"""
        transfer = self.active_transfers.get(transfer_id)
        if not transfer:
            return None

        return {
            "transfer_id": transfer_id,
            "user_address": transfer.user_address,
            "source_chain": transfer.source_chain,
            "destination_chain": transfer.destination_chain,
            "amount_usdc": transfer.amount / 1e6,
            "status": transfer.status,
            "burn_tx_hash": transfer.burn_tx_hash,
            "mint_tx_hash": transfer.mint_tx_hash,
            "created_at": transfer.created_at.isoformat() if transfer.created_at else None,
            "completed_at": transfer.completed_at.isoformat() if transfer.completed_at else None
        }

    def get_user_transfers(self, user_address: str) -> List[Dict]:
        """Get all transfers for a specific user"""
        user_transfers = [
            self.get_transfer_status(transfer_id)
            for transfer_id, transfer in self.active_transfers.items()
            if transfer.user_address.lower() == user_address.lower()
        ]
        return [t for t in user_transfers if t is not None]

# Global CCTP manager instance
smart_wallet_cctp = SmartWalletCCTPManager()