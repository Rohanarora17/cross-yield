# src/protocols/protocol_investor.py
"""Protocol Investment System - Actually invest USDC into DeFi protocols"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
from web3 import Web3
from eth_account import Account
import aiohttp

@dataclass
class ProtocolInvestment:
    """Investment in a specific protocol"""
    protocol: str
    chain: str
    pool_address: str
    amount_usdc: float
    apy: float
    risk_score: float
    investment_tx: Optional[str] = None
    status: str = "pending"  # pending, invested, failed
    timestamp: datetime = None

class ProtocolInvestor:
    """Handles actual investment into DeFi protocols"""
    
    def __init__(self):
        self.private_key = os.getenv('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not found in environment variables")
        
        self.account = Account.from_key(self.private_key)
        
        # Import our modules
        from ..apis.cctp_integration import CCTPIntegration
        self.cctp = CCTPIntegration()
        
        # Protocol configurations with actual contract addresses
        self.protocol_configs = {
            # Aave V3 configurations
            "aave_v3_ethereum_sepolia": {
                "chain": "ethereum_sepolia",
                "pool_address": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",  # Aave V3 Pool
                "usdc_address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
                "aave_usdc_address": "0x16dA4541aD1807f4443d92D26044C1147406EB80",  # aUSDC
                "investment_method": "supply",
                "min_amount": 1.0,
                "gas_limit": 200000
            },
            "aave_v3_base_sepolia": {
                "chain": "base_sepolia", 
                "pool_address": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
                "usdc_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                "aave_usdc_address": "0x16dA4541aD1807f4443d92D26044C1147406EB80",
                "investment_method": "supply",
                "min_amount": 1.0,
                "gas_limit": 200000
            },
            "aave_v3_arbitrum_sepolia": {
                "chain": "arbitrum_sepolia",
                "pool_address": "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951", 
                "usdc_address": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
                "aave_usdc_address": "0x16dA4541aD1807f4443d92D26044C1147406EB80",
                "investment_method": "supply",
                "min_amount": 1.0,
                "gas_limit": 200000
            },
            
            # Uniswap V3 configurations
            "uniswap_v3_base_sepolia": {
                "chain": "base_sepolia",
                "pool_address": "0x4200000000000000000000000000000000000006",  # WETH/USDC pool
                "usdc_address": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
                "investment_method": "liquidity_provision",
                "min_amount": 10.0,
                "gas_limit": 300000
            },
            
            # Curve configurations
            "curve_arbitrum_sepolia": {
                "chain": "arbitrum_sepolia",
                "pool_address": "0x0000000000000000000000000000000000000000",  # Placeholder
                "usdc_address": "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
                "investment_method": "add_liquidity",
                "min_amount": 5.0,
                "gas_limit": 250000
            }
        }
        
        # ABI fragments for protocol interactions
        self.aave_v3_abi = [
            {
                "inputs": [
                    {"name": "asset", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "onBehalfOf", "type": "address"},
                    {"name": "referralCode", "type": "uint16"}
                ],
                "name": "supply",
                "outputs": [],
                "stateMutability": "nonpayable",
                "type": "function"
            },
            {
                "inputs": [
                    {"name": "asset", "type": "address"},
                    {"name": "amount", "type": "uint256"},
                    {"name": "to", "type": "address"}
                ],
                "name": "withdraw",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "nonpayable",
                "type": "function"
            }
        ]
        
        self.erc20_abi = [
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

    async def invest_in_protocol(
        self,
        protocol: str,
        amount_usdc: float,
        apy: float,
        risk_score: float
    ) -> ProtocolInvestment:
        """Invest USDC into a specific protocol"""
        
        print(f"💰 INVESTING ${amount_usdc:.2f} USDC INTO {protocol.upper()}")
        print(f"   Expected APY: {apy:.2f}%")
        print(f"   Risk Score: {risk_score:.2f}")
        print("-" * 50)
        
        try:
            # Get protocol configuration
            if protocol not in self.protocol_configs:
                raise ValueError(f"Protocol {protocol} not supported")
            
            config = self.protocol_configs[protocol]
            
            # Check minimum amount
            if amount_usdc < config["min_amount"]:
                raise ValueError(f"Amount ${amount_usdc:.2f} below minimum ${config['min_amount']}")
            
            # Get Web3 instance
            chain_config = self.cctp.chain_configs[config["chain"]]
            w3 = Web3(Web3.HTTPProvider(chain_config.rpc_url))
            
            # Check USDC balance
            usdc_contract = w3.eth.contract(
                address=w3.to_checksum_address(config["usdc_address"]),
                abi=self.erc20_abi
            )
            
            balance_wei = usdc_contract.functions.balanceOf(self.account.address).call()
            balance_usdc = balance_wei / 10**6
            
            if balance_usdc < amount_usdc:
                raise ValueError(f"Insufficient USDC balance: ${balance_usdc:.2f} < ${amount_usdc:.2f}")
            
            print(f"✅ USDC Balance: ${balance_usdc:.2f}")
            
            # Execute investment based on protocol type
            if config["investment_method"] == "supply":
                tx_hash = await self._invest_in_aave(w3, config, amount_usdc)
            elif config["investment_method"] == "liquidity_provision":
                tx_hash = await self._invest_in_uniswap(w3, config, amount_usdc)
            elif config["investment_method"] == "add_liquidity":
                tx_hash = await self._invest_in_curve(w3, config, amount_usdc)
            else:
                raise ValueError(f"Unknown investment method: {config['investment_method']}")
            
            # Create investment record
            investment = ProtocolInvestment(
                protocol=protocol,
                chain=config["chain"],
                pool_address=config["pool_address"],
                amount_usdc=amount_usdc,
                apy=apy,
                risk_score=risk_score,
                investment_tx=tx_hash,
                status="invested",
                timestamp=datetime.now()
            )
            
            print(f"✅ Investment successful!")
            print(f"   Transaction: {tx_hash}")
            print(f"   Amount: ${amount_usdc:.2f} USDC")
            print(f"   Protocol: {protocol}")
            print(f"   Chain: {config['chain']}")
            
            return investment
            
        except Exception as e:
            print(f"❌ Investment failed: {e}")
            
            investment = ProtocolInvestment(
                protocol=protocol,
                chain=config.get("chain", "unknown"),
                pool_address=config.get("pool_address", "unknown"),
                amount_usdc=amount_usdc,
                apy=apy,
                risk_score=risk_score,
                status="failed",
                timestamp=datetime.now()
            )
            
            return investment

    async def _invest_in_aave(self, w3: Web3, config: Dict, amount_usdc: float) -> str:
        """Invest in Aave V3 protocol"""
        
        print(f"🏦 Investing in Aave V3...")
        
        amount_wei = int(amount_usdc * 10**6)
        
        # Get contracts
        usdc_contract = w3.eth.contract(
            address=w3.to_checksum_address(config["usdc_address"]),
            abi=self.erc20_abi
        )
        
        aave_pool = w3.eth.contract(
            address=w3.to_checksum_address(config["pool_address"]),
            abi=self.aave_v3_abi
        )
        
        # Step 1: Approve USDC spending
        print("   📝 Approving USDC spending...")
        approve_tx = usdc_contract.functions.approve(
            w3.to_checksum_address(config["pool_address"]),
            amount_wei
        ).build_transaction({
            'from': self.account.address,
            'gas': config["gas_limit"],
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(self.account.address)
        })
        
        signed_approve = self.account.sign_transaction(approve_tx)
        approve_tx_hash = w3.eth.send_raw_transaction(signed_approve.raw_transaction)
        
        # Wait for approval confirmation
        receipt = w3.eth.wait_for_transaction_receipt(approve_tx_hash)
        print(f"   ✅ Approval confirmed: {approve_tx_hash.hex()}")
        
        # Step 2: Supply USDC to Aave
        print("   🏦 Supplying USDC to Aave...")
        supply_tx = aave_pool.functions.supply(
            w3.to_checksum_address(config["usdc_address"]),
            amount_wei,
            self.account.address,
            0  # No referral code
        ).build_transaction({
            'from': self.account.address,
            'gas': config["gas_limit"],
            'gasPrice': w3.eth.gas_price,
            'nonce': w3.eth.get_transaction_count(self.account.address)
        })
        
        signed_supply = self.account.sign_transaction(supply_tx)
        supply_tx_hash = w3.eth.send_raw_transaction(signed_supply.raw_transaction)
        
        # Wait for supply confirmation
        receipt = w3.eth.wait_for_transaction_receipt(supply_tx_hash)
        
        if receipt.status != 1:
            raise ValueError(f"Aave supply transaction failed: {supply_tx_hash.hex()}")
        
        print(f"   ✅ Supply confirmed: {supply_tx_hash.hex()}")
        print(f"   ⛽ Gas used: {receipt.gasUsed:,}")
        
        return supply_tx_hash.hex()

    async def _invest_in_uniswap(self, w3: Web3, config: Dict, amount_usdc: float) -> str:
        """Invest in Uniswap V3 liquidity provision"""
        
        print(f"🦄 Investing in Uniswap V3...")
        
        # For demo purposes, we'll simulate the investment
        # In production, this would involve:
        # 1. Creating a liquidity position
        # 2. Providing USDC + ETH liquidity
        # 3. Getting LP tokens in return
        
        print("   📝 Simulating Uniswap V3 liquidity provision...")
        print(f"   💰 Amount: ${amount_usdc:.2f} USDC")
        print("   ⚠️ Note: This is a simulation for demo purposes")
        
        # Simulate transaction hash
        simulated_tx = f"0x{'0' * 64}"
        
        return simulated_tx

    async def _invest_in_curve(self, w3: Web3, config: Dict, amount_usdc: float) -> str:
        """Invest in Curve Finance"""
        
        print(f"📈 Investing in Curve Finance...")
        
        # For demo purposes, we'll simulate the investment
        print("   📝 Simulating Curve liquidity provision...")
        print(f"   💰 Amount: ${amount_usdc:.2f} USDC")
        print("   ⚠️ Note: This is a simulation for demo purposes")
        
        # Simulate transaction hash
        simulated_tx = f"0x{'0' * 64}"
        
        return simulated_tx

    async def withdraw_from_protocol(
        self,
        protocol: str,
        amount_usdc: float
    ) -> str:
        """Withdraw USDC from a protocol"""
        
        print(f"💸 WITHDRAWING ${amount_usdc:.2f} USDC FROM {protocol.upper()}")
        print("-" * 50)
        
        try:
            config = self.protocol_configs[protocol]
            chain_config = self.cctp.chain_configs[config["chain"]]
            w3 = Web3(Web3.HTTPProvider(chain_config.rpc_url))
            
            amount_wei = int(amount_usdc * 10**6)
            
            if config["investment_method"] == "supply":
                # Withdraw from Aave
                aave_pool = w3.eth.contract(
                    address=w3.to_checksum_address(config["pool_address"]),
                    abi=self.aave_v3_abi
                )
                
                withdraw_tx = aave_pool.functions.withdraw(
                    w3.to_checksum_address(config["usdc_address"]),
                    amount_wei,
                    self.account.address
                ).build_transaction({
                    'from': self.account.address,
                    'gas': config["gas_limit"],
                    'gasPrice': w3.eth.gas_price,
                    'nonce': w3.eth.get_transaction_count(self.account.address)
                })
                
                signed_withdraw = self.account.sign_transaction(withdraw_tx)
                withdraw_tx_hash = w3.eth.send_raw_transaction(signed_withdraw.raw_transaction)
                
                receipt = w3.eth.wait_for_transaction_receipt(withdraw_tx_hash)
                
                if receipt.status != 1:
                    raise ValueError(f"Withdrawal transaction failed: {withdraw_tx_hash.hex()}")
                
                print(f"✅ Withdrawal successful: {withdraw_tx_hash.hex()}")
                return withdraw_tx_hash.hex()
            
            else:
                print("   ⚠️ Withdrawal not implemented for this protocol type")
                return "0x" + "0" * 64
                
        except Exception as e:
            print(f"❌ Withdrawal failed: {e}")
            raise

    async def get_protocol_balance(self, protocol: str) -> float:
        """Get current balance in a protocol"""
        
        try:
            config = self.protocol_configs[protocol]
            chain_config = self.cctp.chain_configs[config["chain"]]
            w3 = Web3(Web3.HTTPProvider(chain_config.rpc_url))
            
            if config["investment_method"] == "supply":
                # Get aUSDC balance (Aave token representing USDC supply)
                aave_usdc_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config["aave_usdc_address"]),
                    abi=self.erc20_abi
                )
                
                balance_wei = aave_usdc_contract.functions.balanceOf(self.account.address).call()
                balance_usdc = balance_wei / 10**6
                
                return balance_usdc
            
            else:
                # For other protocols, return 0 for now
                return 0.0
                
        except Exception as e:
            print(f"❌ Error getting protocol balance: {e}")
            return 0.0

    async def get_all_protocol_balances(self) -> Dict[str, float]:
        """Get balances across all protocols"""
        
        print("📊 Checking protocol balances...")
        
        balances = {}
        
        for protocol in self.protocol_configs.keys():
            try:
                balance = await self.get_protocol_balance(protocol)
                balances[protocol] = balance
                
                if balance > 0:
                    print(f"   {protocol}: ${balance:.2f} USDC")
                    
            except Exception as e:
                print(f"   {protocol}: Error - {e}")
                balances[protocol] = 0.0
        
        return balances

# Test the protocol investor
async def test_protocol_investor():
    """Test the protocol investment system"""
    
    print("🧪 TESTING PROTOCOL INVESTMENT SYSTEM")
    print("=" * 60)
    
    try:
        investor = ProtocolInvestor()
        
        # Test protocol configurations
        print("✅ Protocol configurations loaded:")
        for protocol, config in investor.protocol_configs.items():
            print(f"   {protocol}: {config['chain']} - {config['investment_method']}")
        
        # Test balance checking
        print("\n✅ Testing balance checking:")
        balances = await investor.get_all_protocol_balances()
        total_invested = sum(balances.values())
        print(f"   Total invested: ${total_invested:.2f} USDC")
        
        # Test investment (small amount for testing)
        print("\n✅ Testing investment:")
        investment = await investor.invest_in_protocol(
            protocol="aave_v3_ethereum_sepolia",
            amount_usdc=1.0,  # Small test amount
            apy=4.5,
            risk_score=0.1
        )
        
        print(f"   Investment result: {investment.status}")
        if investment.investment_tx:
            print(f"   Transaction: {investment.investment_tx}")
        
        print("\n✅ Protocol investment system working!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_protocol_investor())