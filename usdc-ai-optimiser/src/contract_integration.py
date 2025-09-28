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

# Deployed contract addresses (updated with latest deployments)
DEPLOYED_CONTRACTS = {
    "ethereum_sepolia": {
        "chainRegistry": "0xa9714b3C50DfAabF4c828ed62e02D6eDcf9F6CA3",
        "smartWalletFactory": "0xCE2C6Cb2cc38c82920D1a860978890085aB3F1b8",
        "yieldRouter": "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11",  # Proxy address
        "yieldRouterImpl": "0x26Ee4397414A5670772c96d1a2fF52BC39bf9A11"
    },
    "base_sepolia": {
        "chainRegistry": "0x01f6A4b9E0fA914C59950F89E701E3eF032cF966",
        "smartWalletFactory": "0x3fCb812C6CAe20C254662A619096EB698ebd6ef3",
        "yieldRouter": "0x0FAE5e7b22ca43Ba521021627Fe32796882c1f2d",  # Proxy address
        "yieldRouterImpl": "0x0FAE5e7b22ca43Ba521021627Fe32796882c1f2d"
    },
    "arbitrum_sepolia": {
        "chainRegistry": "0xa767A250819a4813061DF666c1AaCF60e5b5a2D4",
        "smartWalletFactory": "0x97Ce69a3b569903B64bc49e6D91077e1ce59959b",
        "yieldRouter": "0x780BE3b0aDf2189b4fa72086A48F2a8BD19B14b8",  # Proxy address
        "yieldRouterImpl": "0x780BE3b0aDf2189b4fa72086A48F2a8BD19B14b8"
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
    totalWithdrawn: int
    totalAllocated: int
    protocolCount: int
    backendCoordinator: str
    factory: str
    usdcBalance: int

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
                    "outputs": [{"name": "wallet", "type": "address"}],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "user", "type": "address"}],
                    "name": "getWallet",
                    "outputs": [{"name": "wallet", "type": "address"}],
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
                    "outputs": [{"name": "predictedAddress", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "wallet", "type": "address"}],
                    "name": "isWalletValid",
                    "outputs": [{"name": "valid", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "wallet", "type": "address"}],
                    "name": "getWalletOwner",
                    "outputs": [{"name": "owner", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "agentWallet", "type": "address"}],
                    "name": "getUserForAgent",
                    "outputs": [{"name": "user", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "user", "type": "address"},
                        {"indexed": True, "name": "wallet", "type": "address"},
                        {"indexed": False, "name": "salt", "type": "bytes32"}
                    ],
                    "name": "WalletCreated",
                    "type": "event"
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
        elif contract_type == "userSmartWallet":
            abi = [
                {
                    "inputs": [
                        {"name": "amount", "type": "uint256"},
                        {"name": "strategy", "type": "string"}
                    ],
                    "name": "deposit",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
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
                },
                {
                    "inputs": [
                        {"name": "protocolName", "type": "string"},
                        {"name": "adapter", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                    ],
                    "name": "allocateToProtocol",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"name": "protocolNames", "type": "string[]"},
                        {"name": "adapters", "type": "address[]"},
                        {"name": "amounts", "type": "uint256[]"}
                    ],
                    "name": "batchAllocate",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getBalance",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getWalletSummary",
                    "outputs": [
                        {"name": "usdcBalance", "type": "uint256"},
                        {"name": "totalAllocated", "type": "uint256"},
                        {"name": "protocolCount", "type": "uint256"},
                        {"name": "active", "type": "bool"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getTotalValue",
                    "outputs": [{"name": "totalValue", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getActiveProtocols",
                    "outputs": [{"name": "protocols", "type": "string[]"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "protocolName", "type": "string"}],
                    "name": "getProtocolBalance",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "owner",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "isActive",
                    "outputs": [{"name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "user", "type": "address"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": False, "name": "strategy", "type": "string"},
                        {"indexed": False, "name": "timestamp", "type": "uint256"}
                    ],
                    "name": "Deposited",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": True, "name": "protocol", "type": "string"},
                        {"indexed": False, "name": "adapter", "type": "address"},
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": False, "name": "timestamp", "type": "uint256"}
                    ],
                    "name": "ProtocolAllocation",
                    "type": "event"
                },
                {
                    "anonymous": False,
                    "inputs": [
                        {"indexed": False, "name": "amount", "type": "uint256"},
                        {"indexed": False, "name": "destinationDomain", "type": "uint32"},
                        {"indexed": False, "name": "recipient", "type": "address"},
                        {"indexed": False, "name": "timestamp", "type": "uint256"}
                    ],
                    "name": "CCTPTransferInitiated",
                    "type": "event"
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

    def get_user_smart_wallet_contract(self, user_address: str, chain: str):
        """Get UserSmartWallet contract instance for a user"""
        wallet_address = self.get_or_create_wallet(user_address, chain)
        w3 = self.web3_clients[chain]

        # Get UserSmartWallet ABI
        abi = self.get_contract_abi("userSmartWallet")
        return w3.eth.contract(address=wallet_address, abi=abi)

    def get_contract_abi(self, contract_type: str) -> list:
        """Get ABI for contract type (helper method)"""
        # This duplicates the ABI logic from get_contract but returns just the ABI
        if contract_type == "userSmartWallet":
            return [
                {
                    "inputs": [
                        {"name": "amount", "type": "uint256"},
                        {"name": "strategy", "type": "string"}
                    ],
                    "name": "deposit",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
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
                },
                {
                    "inputs": [
                        {"name": "protocolName", "type": "string"},
                        {"name": "adapter", "type": "address"},
                        {"name": "amount", "type": "uint256"}
                    ],
                    "name": "allocateToProtocol",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [
                        {"name": "protocolNames", "type": "string[]"},
                        {"name": "adapters", "type": "address[]"},
                        {"name": "amounts", "type": "uint256[]"}
                    ],
                    "name": "batchAllocate",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getBalance",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getWalletSummary",
                    "outputs": [
                        {"name": "usdcBalance", "type": "uint256"},
                        {"name": "totalAllocated", "type": "uint256"},
                        {"name": "protocolCount", "type": "uint256"},
                        {"name": "active", "type": "bool"}
                    ],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getTotalValue",
                    "outputs": [{"name": "totalValue", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "getActiveProtocols",
                    "outputs": [{"name": "protocols", "type": "string[]"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "protocolName", "type": "string"}],
                    "name": "getProtocolBalance",
                    "outputs": [{"name": "balance", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "owner",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "isActive",
                    "outputs": [{"name": "", "type": "bool"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        return []

    async def execute_cctp_transfer(self, user_address: str, amount: int, destination_domain: int, recipient_address: str, source_chain: str) -> str:
        """Execute CCTP transfer through user's smart wallet"""
        try:
            wallet_address = await self.get_or_create_wallet(user_address, source_chain)
            w3 = self.web3_clients[source_chain]

            # Get smart wallet contract
            wallet_contract = w3.eth.contract(
                address=wallet_address,
                abi=self.get_contract_abi("userSmartWallet")
            )

            txn = wallet_contract.functions.executeCCTP(
                amount, destination_domain, recipient_address
            ).build_transaction({
                'chainId': CHAIN_CONFIGS[source_chain]["chainId"],
                'gas': 400000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ CCTP transfer executed: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                raise Exception("CCTP transaction failed")

        except Exception as e:
            print(f"❌ Error executing CCTP transfer: {e}")
            raise

    async def allocate_to_protocol(self, user_address: str, protocol_name: str, adapter_address: str, amount: int, chain: str) -> str:
        """Allocate funds to a DeFi protocol through user's smart wallet"""
        try:
            wallet_address = await self.get_or_create_wallet(user_address, chain)
            w3 = self.web3_clients[chain]

            # Get smart wallet contract
            wallet_contract = w3.eth.contract(
                address=wallet_address,
                abi=self.get_contract_abi("userSmartWallet")
            )

            txn = wallet_contract.functions.allocateToProtocol(
                protocol_name, adapter_address, amount
            ).build_transaction({
                'chainId': CHAIN_CONFIGS[chain]["chainId"],
                'gas': 500000,
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ Protocol allocation executed: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                raise Exception("Protocol allocation failed")

        except Exception as e:
            print(f"❌ Error allocating to protocol: {e}")
            raise

    async def batch_allocate_protocols(self, user_address: str, protocol_names: list, adapter_addresses: list, amounts: list, chain: str) -> str:
        """Batch allocate to multiple protocols"""
        try:
            wallet_address = await self.get_or_create_wallet(user_address, chain)
            w3 = self.web3_clients[chain]

            # Get smart wallet contract
            wallet_contract = w3.eth.contract(
                address=wallet_address,
                abi=self.get_contract_abi("userSmartWallet")
            )

            txn = wallet_contract.functions.batchAllocate(
                protocol_names, adapter_addresses, amounts
            ).build_transaction({
                'chainId': CHAIN_CONFIGS[chain]["chainId"],
                'gas': 800000,  # Higher gas for batch operation
                'gasPrice': w3.to_wei('2', 'gwei'),
                'nonce': w3.eth.get_transaction_count(self.account.address),
            })

            signed_txn = w3.eth.account.sign_transaction(txn, self.private_key)
            tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
            receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt.status == 1:
                print(f"✅ Batch allocation executed: {tx_hash.hex()}")
                return tx_hash.hex()
            else:
                raise Exception("Batch allocation failed")

        except Exception as e:
            print(f"❌ Error in batch allocation: {e}")
            raise

    def get_wallet_summary(self, user_address: str, chain: str) -> SmartWalletInfo:
        """Get comprehensive wallet summary"""
        try:
            wallet_address = self.get_or_create_wallet(user_address, chain)
            w3 = self.web3_clients[chain]

            # Get smart wallet contract
            wallet_contract = w3.eth.contract(
                address=wallet_address,
                abi=self.get_contract_abi("userSmartWallet")
            )

            # Get wallet summary data
            summary = wallet_contract.functions.getWalletSummary().call()
            is_active = wallet_contract.functions.isActive().call()
            owner = wallet_contract.functions.owner().call()

            # Get factory info
            factory = self.get_contract(chain, "smartWalletFactory")
            backend_coordinator = CHAIN_CONFIGS[chain].get("backendCoordinator", self.account.address)

            return SmartWalletInfo(
                address=wallet_address,
                owner=owner,
                chain=chain,
                isActive=is_active,
                totalDeposited=0,  # Would need to track this separately
                totalWithdrawn=0,  # Would need to track this separately
                totalAllocated=summary[1],  # totalAllocated from getWalletSummary
                protocolCount=summary[2],   # protocolCount from getWalletSummary
                backendCoordinator=backend_coordinator,
                factory=DEPLOYED_CONTRACTS[chain]["smartWalletFactory"],
                usdcBalance=summary[0]      # usdcBalance from getWalletSummary
            )

        except Exception as e:
            print(f"❌ Error getting wallet summary: {e}")
            return None

    def get_protocol_allocations(self, user_address: str, chain: str) -> dict:
        """Get protocol allocation details"""
        try:
            wallet_address = self.get_or_create_wallet(user_address, chain)
            w3 = self.web3_clients[chain]

            # Get smart wallet contract
            wallet_contract = w3.eth.contract(
                address=wallet_address,
                abi=self.get_contract_abi("userSmartWallet")
            )

            # Get active protocols
            active_protocols = wallet_contract.functions.getActiveProtocols().call()

            allocations = []
            for protocol in active_protocols:
                balance = wallet_contract.functions.getProtocolBalance(protocol).call()
                allocations.append({
                    "protocol": protocol,
                    "balance": balance,
                    "chain": chain
                })

            total_value = wallet_contract.functions.getTotalValue().call()

            return {
                "totalValue": total_value,
                "allocations": allocations,
                "activeProtocolCount": len(active_protocols)
            }

        except Exception as e:
            print(f"❌ Error getting protocol allocations: {e}")
            return None

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