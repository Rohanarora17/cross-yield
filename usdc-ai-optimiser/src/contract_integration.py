"""
CrossYield Smart Contract Integration
Handles interaction with deployed CrossYield smart contracts
"""

import json
import os
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv

load_dotenv()

# Deployed contract addresses
DEPLOYED_CONTRACTS = {
    "ethereum_sepolia": {
        "chainRegistry": "0xa9714b3C50DfAabF4c828ed62e02D6eDcf9F6CA3",
        "smartWalletFactory": "0x9c18A0863F62b141D766Ec2AC0E712FA35857D6f",
        "yieldRouter": "0x67580b8d789aAE646cC34d30794cE89b1B2963B1"
    },
    "base_sepolia": {
        "chainRegistry": "0x16eB87D9695D5502d38956703Cd3C8c861db2fd3",
        "smartWalletFactory": "0x078572F22e95021d2b0172B989553522184D89e5",
        "yieldRouter": "0x940CAAA3E0268EFDA3cAF3754Ea6123CbF3c92e4"
    },
    "arbitrum_sepolia": {
        "chainRegistry": "0xc1690B23fF7212489560D4e37DC568a5ae7877ac",
        "smartWalletFactory": "0x23F68aA80985C3765d5857be625802bf7E5F8211",
        "yieldRouter": "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11"
    }
}

# Chain configurations
CHAIN_CONFIGS = {
    "ethereum_sepolia": {
        "name": "Ethereum Sepolia",
        "chainId": 11155111,
        "rpcUrl": f"https://eth-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}",
        "usdcAddress": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        "cctpDomain": 0,
        "isTestnet": True,
        "blockExplorer": "https://sepolia.etherscan.io"
    },
    "base_sepolia": {
        "name": "Base Sepolia",
        "chainId": 84532,
        "rpcUrl": f"https://base-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}",
        "usdcAddress": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        "cctpDomain": 6,
        "isTestnet": True,
        "blockExplorer": "https://sepolia.basescan.org"
    },
    "arbitrum_sepolia": {
        "name": "Arbitrum Sepolia",
        "chainId": 421614,
        "rpcUrl": f"https://arb-sepolia.g.alchemy.com/v2/{os.getenv('ALCHEMY_API_KEY')}",
        "usdcAddress": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        "cctpDomain": 3,
        "isTestnet": True,
        "blockExplorer": "https://sepolia.arbiscan.io"
    }
}

@dataclass
class SmartWalletInfo:
    """Smart wallet information"""
    address: str
    owner: str
    chain: str
    isActive: bool
    totalDeposited: int
    backendCoordinator: str

@dataclass
class OptimizationRequest:
    """Optimization request data"""
    user: str
    amount: int
    strategy: str
    timestamp: int
    txHash: str
    chain: str

class CrossYieldContractManager:
    """Manages interactions with CrossYield smart contracts"""

    def __init__(self):
        self.web3_clients = {}
        self.contracts = {}
        self.private_key = os.getenv('PRIVATE_KEY')
        self.account = Account.from_key(self.private_key) if self.private_key else None

        # Initialize Web3 clients for each chain
        for chain_key, config in CHAIN_CONFIGS.items():
            try:
                w3 = Web3(Web3.HTTPProvider(config["rpcUrl"]))
                if w3.is_connected():
                    self.web3_clients[chain_key] = w3
                    print(f"✅ Connected to {config['name']}")
                else:
                    print(f"❌ Failed to connect to {config['name']}")
            except Exception as e:
                print(f"❌ Error connecting to {config['name']}: {e}")

    def get_contract(self, chain: str, contract_type: str):
        """Get contract instance"""
        if chain not in self.web3_clients:
            raise ValueError(f"Chain {chain} not connected")

        if (chain, contract_type) in self.contracts:
            return self.contracts[(chain, contract_type)]

        # Load contract ABI (simplified for now - in production, load from files)
        contract_address = DEPLOYED_CONTRACTS[chain][contract_type]
        w3 = self.web3_clients[chain]

        # Minimal ABI for required functions
        if contract_type == "smartWalletFactory":
            abi = [
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "createWallet",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "getWallet",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "hasWallet",
                    "outputs": [{"name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "predictWalletAddress",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        elif contract_type == "yieldRouter":
            abi = [
                {
                    "inputs": [
                        {"name": "user", "type": "address"},
                        {"name": "amount", "type": "uint256"},
                        {"name": "strategy", "type": "string"}
                    ],
                    "name": "requestOptimization",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"name": "user", "type": "address"},
                        {"name": "protocol", "type": "string"},
                        {"name": "chainId", "type": "uint256"},
                        {"name": "amount", "type": "uint256"}
                    ],
                    "name": "reportAllocation",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "getUserPortfolio",
                    "outputs": [
                        {
                            "components": [
                                {"name": "currentStrategy", "type": "string"},
                                {"name": "totalDeposited", "type": "uint256"},
                                {"name": "totalValue", "type": "uint256"},
                                {"name": "optimizationCount", "type": "uint256"},
                                {"name": "smartWallet", "type": "address"}
                            ],
                            "name": "",
                            "type": "tuple"
                        }
                    ],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        else:
            # Generic ABI for other contracts
            abi = []

        contract = w3.eth.contract(address=contract_address, abi=abi)
        self.contracts[(chain, contract_type)] = contract
        return contract

    async def create_smart_wallet(self, user_address: str, chain: str) -> str:
        """Create a smart wallet for a user"""
        try:
            factory = self.get_contract(chain, "smartWalletFactory")
            w3 = self.web3_clients[chain]

            # Check if wallet already exists
            has_wallet = factory.functions.hasWallet(user_address).call()
            if has_wallet:
                wallet_address = factory.functions.getWallet(user_address).call()
                print(f"✅ Wallet already exists: {wallet_address}")
                return wallet_address

            # Create wallet transaction
            txn = factory.functions.createWallet(user_address).build_transaction({
                'chainId': CHAIN_CONFIGS[chain]["chainId"],
                'gas': 500000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                wallet_address = factory.functions.getWallet(user_address).call()
                print(f"✅ Created smart wallet: {wallet_address}")
                return wallet_address
            else:
                raise Exception("Transaction failed")

        except Exception as e:
            print(f"❌ Error creating smart wallet: {e}")
            raise

    async def get_or_create_wallet(self, user_address: str, chain: str) -> str:
        """Get existing wallet or create new one"""
        factory = self.get_contract(chain, "smartWalletFactory")

        has_wallet = factory.functions.hasWallet(user_address).call()
        if has_wallet:
            return factory.functions.getWallet(user_address).call()
        else:
            return await self.create_smart_wallet(user_address, chain)

    def predict_wallet_address(self, user_address: str, chain: str) -> str:
        """Predict wallet address for a user"""
        factory = self.get_contract(chain, "smartWalletFactory")
        return factory.functions.predictWalletAddress(user_address).call()

    async def request_optimization(self, user_address: str, amount: int, strategy: str, chain: str) -> str:
        """Request portfolio optimization"""
        try:
            yield_router = self.get_contract(chain, "yieldRouter")
            w3 = self.web3_clients[chain]

            txn = yield_router.functions.requestOptimization(
                user_address, amount, strategy
            ).build_transaction({
                'chainId': CHAIN_CONFIGS[chain]["chainId"],
                'gas': 300000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ Optimization requested: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                raise Exception("Transaction failed")

        except Exception as e:
            print(f"❌ Error requesting optimization: {e}")
            raise

    async def report_allocation(self, user_address: str, protocol: str, chain_id: int, amount: int, chain: str) -> str:
        """Report allocation to YieldRouter"""
        try:
            yield_router = self.get_contract(chain, "yieldRouter")
            w3 = self.web3_clients[chain]

            txn = yield_router.functions.reportAllocation(
                user_address, protocol, chain_id, amount
            ).build_transaction({
                'chainId': CHAIN_CONFIGS[chain]["chainId"],
                'gas': 200000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ Allocation reported: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                raise Exception("Transaction failed")

        except Exception as e:
            print(f"❌ Error reporting allocation: {e}")
            raise

    def get_user_portfolio(self, user_address: str, chain: str) -> dict:
        """Get user portfolio information"""
        try:
            yield_router = self.get_contract(chain, "yieldRouter")
            portfolio = yield_router.functions.getUserPortfolio(user_address).call()

            return {
                "currentStrategy": portfolio[0],
                "totalDeposited": portfolio[1],
                "totalValue": portfolio[2],
                "optimizationCount": portfolio[3],
                "smartWallet": portfolio[4]
            }
        except Exception as e:
            print(f"❌ Error getting portfolio: {e}")
            return None

    def listen_for_events(self, chain: str, contract_type: str, event_name: str, callback):
        """Listen for contract events"""
        contract = self.get_contract(chain, contract_type)
        w3 = self.web3_clients[chain]

        # Create event filter
        event_filter = contract.events[event_name].create_filter(fromBlock='latest')

        def handle_event(event):
            try:
                callback(event)
            except Exception as e:
                print(f"❌ Error handling event: {e}")

        # Start event loop
        def log_loop(event_filter, poll_interval):
            while True:
                for event in event_filter.get_new_entries():
                    handle_event(event)
                time.sleep(poll_interval)

        import threading
        import time

        thread = threading.Thread(target=log_loop, args=(event_filter, 2))
        thread.daemon = True
        thread.start()

        return thread

# Global contract manager instance
contract_manager = CrossYieldContractManager()