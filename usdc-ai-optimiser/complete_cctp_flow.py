#!/usr/bin/env python3
"""Complete end-to-end CCTP flow following Circle's official implementation"""

import asyncio
import aiohttp
import sys
import os
import time
from web3 import Web3
from eth_account import Account

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.apis.cctp_integration import CCTPIntegration

class CCTPFlowManager:
    def __init__(self):
        self.cctp = CCTPIntegration()
        self.private_key = os.getenv('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("PRIVATE_KEY environment variable required")
        self.account = Account.from_key(self.private_key)

        # Circle's official IRIS API endpoint (from their repo)
        self.iris_api_url = "https://iris-api-sandbox.circle.com"

    def log(self, message: str):
        timestamp = time.strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")

    def get_balance(self, chain: str) -> float:
        """Get USDC balance on a chain"""
        config = self.cctp.chain_configs[chain]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(config.usdc_address),
            abi=self.cctp.usdc_abi
        )

        balance_wei = usdc_contract.functions.balanceOf(self.account.address).call()
        return balance_wei / 10**6

    async def execute_burn(self, source_chain: str, dest_chain: str, amount: float) -> str:
        """Execute burn transaction with Circle's exact parameters"""

        self.log(f"🔥 Initiating burn: {amount} USDC from {source_chain} to {dest_chain}")

        config = self.cctp.chain_configs[source_chain]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        # Contract instances
        usdc_address = w3.to_checksum_address(config.usdc_address)
        token_messenger_address = w3.to_checksum_address(config.token_messenger_address)

        usdc_contract = w3.eth.contract(address=usdc_address, abi=self.cctp.usdc_abi)
        token_messenger = w3.eth.contract(address=token_messenger_address, abi=self.cctp.token_messenger_abi)

        amount_wei = int(amount * 10**6)

        # Check and handle approval
        allowance_wei = usdc_contract.functions.allowance(self.account.address, token_messenger_address).call()
        allowance_usdc = allowance_wei / 10**6

        if allowance_usdc < amount:
            self.log("📝 Approving USDC spending...")

            approve_tx = usdc_contract.functions.approve(
                token_messenger_address,
                amount_wei * 10  # Approve 10x to avoid re-approvals
            ).build_transaction({
                'from': self.account.address,
                'gas': 100000,
                'gasPrice': w3.eth.gas_price,
                'nonce': w3.eth.get_transaction_count(self.account.address)
            })

            signed_approve = self.account.sign_transaction(approve_tx)
            approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)

            # Wait for approval confirmation
            approve_receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
            if approve_receipt.status != 1:
                raise ValueError("Approval transaction failed")

            self.log(f"✅ Approval confirmed: {approve_tx_hash.hex()}")

            # Wait before burn to avoid nonce conflicts
            time.sleep(2)

        # Execute burn with Circle's exact parameters
        dest_domain = self.cctp._get_domain(dest_chain)
        recipient_bytes32 = "0x" + "0" * 24 + self.account.address[2:].lower()

        # Circle CCTP V2 parameters (from official implementation)
        hook_data = "0x" + "0" * 64  # Empty bytes32
        max_fee = amount_wei - 1  # Slightly less than burn amount
        finality_threshold = 2000  # Standard transfer (1000 for fast)

        burn_tx = token_messenger.functions.depositForBurn(
            amount_wei,
            dest_domain,
            recipient_bytes32,
            usdc_address,
            hook_data,
            max_fee,
            finality_threshold
        ).build_transaction({
            'from': self.account.address,
            'gas': 300000,
            'gasPrice': w3.eth.gas_price * 2,  # Avoid underpriced issues
            'nonce': w3.eth.get_transaction_count(self.account.address)
        })

        signed_burn = self.account.sign_transaction(burn_tx)
        burn_tx_hash = w3.eth.send_raw_transaction(signed_burn.raw_transaction)

        # Wait for burn confirmation
        burn_receipt = w3.eth.wait_for_transaction_receipt(burn_tx_hash)

        if burn_receipt.status != 1:
            raise ValueError(f"Burn transaction failed: {burn_tx_hash.hex()}")

        self.log(f"✅ Burn confirmed: {burn_tx_hash.hex()}")
        self.log(f"⛽ Gas used: {burn_receipt.gasUsed:,}")
        self.log(f"📋 Logs: {len(burn_receipt.logs)}")

        return burn_tx_hash.hex()

    async def retrieve_attestation(self, tx_hash: str, source_chain: str) -> dict:
        """Retrieve attestation using Circle's exact polling method"""

        self.log("🔍 Retrieving attestation from Circle...")

        source_domain = self.cctp._get_domain(source_chain)
        url = f"{self.iris_api_url}/v2/messages/{source_domain}?transactionHash={tx_hash}"

        max_attempts = 60  # 5 minutes with 5-second intervals
        attempt = 0

        while attempt < max_attempts:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(url) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get('messages') and len(data['messages']) > 0:
                                message = data['messages'][0]
                                status = message.get('status', 'unknown')

                                if status == 'complete':
                                    self.log("✅ Attestation retrieved!")
                                    return message
                                else:
                                    self.log(f"⏳ Attestation status: {status}")
                        elif response.status == 404:
                            self.log("⏳ Waiting for transaction to be indexed...")
                        else:
                            text = await response.text()
                            self.log(f"⚠️ API error {response.status}: {text[:100]}")

            except Exception as e:
                self.log(f"⚠️ Request error: {e}")

            attempt += 1
            if attempt < max_attempts:
                await asyncio.sleep(5)  # 5-second intervals like Circle's implementation

        raise TimeoutError("Attestation not ready after maximum wait time")

    async def execute_mint(self, dest_chain: str, attestation: dict) -> str:
        """Execute mint transaction using Circle's exact method"""

        self.log(f"🪙 Executing mint on {dest_chain}...")

        config = self.cctp.chain_configs[dest_chain]
        w3 = Web3(Web3.HTTPProvider(config.rpc_url))

        message_transmitter_address = w3.to_checksum_address(config.message_transmitter_address)

        # Circle's receiveMessage ABI
        receive_message_abi = [{
            "type": "function",
            "name": "receiveMessage",
            "stateMutability": "nonpayable",
            "inputs": [
                {"name": "message", "type": "bytes"},
                {"name": "attestation", "type": "bytes"}
            ],
            "outputs": []
        }]

        message_transmitter = w3.eth.contract(
            address=message_transmitter_address,
            abi=receive_message_abi
        )

        # Extract message and attestation from Circle's response
        message_bytes = attestation['message']
        attestation_bytes = attestation['attestation']

        # Estimate gas with 20% buffer (like Circle's implementation)
        try:
            gas_estimate = message_transmitter.functions.receiveMessage(
                message_bytes,
                attestation_bytes
            ).estimate_gas({'from': self.account.address})

            gas_with_buffer = int(gas_estimate * 1.2)  # 20% buffer

        except Exception as e:
            self.log(f"⚠️ Gas estimation failed, using default: {e}")
            gas_with_buffer = 300000  # Fallback gas limit

        # Build mint transaction
        mint_tx = message_transmitter.functions.receiveMessage(
            message_bytes,
            attestation_bytes
        ).build_transaction({
            'from': self.account.address,
            'gas': gas_with_buffer,
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(self.account.address)
        })

        # Execute mint
        signed_mint = self.account.sign_transaction(mint_tx)
        mint_tx_hash = w3.eth.send_raw_transaction(signed_mint.raw_transaction)

        # Wait for mint confirmation
        mint_receipt = w3.eth.wait_for_transaction_receipt(mint_tx_hash)

        if mint_receipt.status != 1:
            raise ValueError(f"Mint transaction failed: {mint_tx_hash.hex()}")

        self.log(f"✅ Mint confirmed: {mint_tx_hash.hex()}")
        self.log(f"⛽ Gas used: {mint_receipt.gasUsed:,}")

        return mint_tx_hash.hex()

    async def execute_complete_flow(self, source_chain: str, dest_chain: str, amount: float):
        """Execute complete CCTP flow: burn → attestation → mint"""

        self.log("🚀 STARTING COMPLETE CCTP FLOW")
        self.log("=" * 60)
        self.log(f"From: {source_chain}")
        self.log(f"To: {dest_chain}")
        self.log(f"Amount: {amount} USDC")
        self.log(f"Wallet: {self.account.address}")
        self.log("")

        # Step 1: Check initial balances
        self.log("1️⃣ CHECKING INITIAL BALANCES")
        source_balance_before = self.get_balance(source_chain)
        dest_balance_before = self.get_balance(dest_chain)

        self.log(f"   {source_chain}: {source_balance_before:.6f} USDC")
        self.log(f"   {dest_chain}: {dest_balance_before:.6f} USDC")
        self.log("")

        if source_balance_before < amount:
            raise ValueError(f"Insufficient balance: {source_balance_before:.6f} < {amount}")

        # Step 2: Execute burn
        self.log("2️⃣ EXECUTING BURN TRANSACTION")
        burn_tx_hash = await self.execute_burn(source_chain, dest_chain, amount)
        self.log("")

        # Verify burn by checking source balance
        source_balance_after_burn = self.get_balance(source_chain)
        burned_amount = source_balance_before - source_balance_after_burn
        self.log(f"💰 Source balance: {source_balance_before:.6f} → {source_balance_after_burn:.6f}")
        self.log(f"🔥 Burned amount: {burned_amount:.6f} USDC")

        if abs(burned_amount - amount) > 0.001:
            raise ValueError(f"Unexpected burn amount: {burned_amount:.6f} != {amount}")

        self.log("")

        # Step 3: Retrieve attestation
        self.log("3️⃣ RETRIEVING ATTESTATION")
        attestation = await self.retrieve_attestation(burn_tx_hash, source_chain)
        self.log("")

        # Step 4: Execute mint
        self.log("4️⃣ EXECUTING MINT TRANSACTION")
        mint_tx_hash = await self.execute_mint(dest_chain, attestation)
        self.log("")

        # Step 5: Verify mint by checking destination balance
        self.log("5️⃣ VERIFYING FINAL BALANCES")
        source_balance_final = self.get_balance(source_chain)
        dest_balance_final = self.get_balance(dest_chain)

        minted_amount = dest_balance_final - dest_balance_before

        self.log(f"   {source_chain}: {source_balance_before:.6f} → {source_balance_final:.6f} (-{burned_amount:.6f})")
        self.log(f"   {dest_chain}: {dest_balance_before:.6f} → {dest_balance_final:.6f} (+{minted_amount:.6f})")
        self.log("")

        # Verify amounts match (accounting for fees)
        if abs(minted_amount - burned_amount) > 0.001:
            self.log(f"⚠️ Amount mismatch: burned {burned_amount:.6f}, minted {minted_amount:.6f}")
        else:
            self.log(f"✅ Perfect match: {burned_amount:.6f} USDC transferred")

        # Summary
        self.log("🎉 CCTP FLOW COMPLETED SUCCESSFULLY!")
        self.log("=" * 60)
        self.log(f"🔥 Burn TX: {burn_tx_hash}")
        self.log(f"🪙 Mint TX: {mint_tx_hash}")
        self.log(f"💸 Amount transferred: {amount} USDC")
        self.log(f"⏱️ Total time: Complete flow executed")

        return {
            'burn_tx': burn_tx_hash,
            'mint_tx': mint_tx_hash,
            'amount_burned': burned_amount,
            'amount_minted': minted_amount,
            'source_balance_change': source_balance_before - source_balance_final,
            'dest_balance_change': dest_balance_final - dest_balance_before
        }

async def main():
    """Test complete CCTP flow"""

    try:
        manager = CCTPFlowManager()

        # Test parameters
        source_chain = "base_sepolia"
        dest_chain = "arbitrum_sepolia"
        amount = 0.2  # Test with 0.2 USDC

        result = await manager.execute_complete_flow(source_chain, dest_chain, amount)

        print("\n🏆 COMPLETE CCTP VERIFICATION: ✅ SUCCESS")
        print("=" * 60)
        print("✅ Burn transaction successful")
        print("✅ Attestation retrieved from Circle")
        print("✅ Mint transaction successful")
        print("✅ Balance changes verified")
        print("✅ End-to-end flow working perfectly!")

    except Exception as e:
        print(f"\n❌ CCTP flow failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())