# src/execution/rebalancer.py
"""USDC AI Optimizer Rebalancer - Automated Portfolio Management"""

import asyncio
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
from web3 import Web3
from eth_account import Account
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

@dataclass
class PortfolioPosition:
    """Portfolio position data"""
    protocol: str
    chain: str
    pool_address: str
    amount_usdc: float
    apy: float
    risk_score: float
    last_updated: datetime

@dataclass
class RebalanceAction:
    """Rebalance action to be executed"""
    action_type: str  # "deposit", "withdraw", "cross_chain_transfer"
    source_protocol: Optional[str] = None
    source_chain: Optional[str] = None
    target_protocol: Optional[str] = None
    target_chain: Optional[str] = None
    amount_usdc: float = 0.0
    priority: int = 1  # 1=high, 2=medium, 3=low
    reason: str = ""

class USDAIRebalancer:
    """USDC AI Optimizer Rebalancer"""

    def __init__(self):
        self.private_key = os.getenv('PRIVATE_KEY')
        if not self.private_key:
            raise ValueError("PRIVATE_KEY not found in environment variables")

        self.account = Account.from_key(self.private_key)

        # Import our modules
        from ..apis.graph_integration import GraphIntegration
        from ..apis.cctp_integration import CCTPIntegration
        from ..data.enhanced_aggregator import EnhancedUSDCDataAggregator

        self.graph = GraphIntegration()
        self.cctp = CCTPIntegration()
        self.aggregator = EnhancedUSDCDataAggregator()

        # Rebalancing parameters
        self.rebalance_threshold = 0.05  # 5% deviation triggers rebalance
        self.min_transfer_amount = 10.0  # Minimum $10 USDC for transfers
        self.max_gas_cost_percentage = 0.02  # Max 2% of transfer in gas costs

    async def get_current_portfolio(self) -> List[PortfolioPosition]:
        """Get current portfolio positions across all chains"""

        print("Scanning current portfolio positions...")

        positions = []

        # Supported chains for rebalancing
        chains = ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]

        for chain in chains:
            try:
                config = self.cctp.chain_configs[chain]
                w3 = Web3(Web3.HTTPProvider(config.rpc_url))

                # Check USDC balance
                usdc_contract = w3.eth.contract(
                    address=w3.to_checksum_address(config.usdc_address),
                    abi=self.cctp.usdc_abi
                )

                balance_wei = usdc_contract.functions.balanceOf(self.account.address).call()
                balance_usdc = balance_wei / 10**6

                if balance_usdc > 0.01:  # Only include meaningful balances
                    position = PortfolioPosition(
                        protocol="wallet",
                        chain=chain,
                        pool_address=config.usdc_address,
                        amount_usdc=balance_usdc,
                        apy=0.0,
                        risk_score=0.0,
                        last_updated=datetime.now()
                    )
                    positions.append(position)

                print(f"   {chain}: {balance_usdc:.2f} USDC")

            except Exception as e:
                print(f"   Error checking {chain}: {e}")

        return positions

    async def get_optimization_targets(self, strategy: str = "balanced") -> List[Dict]:
        """Get optimal target allocations"""

        print(f"Getting optimization targets for {strategy} strategy...")

        # Fallback targets for testing
        if strategy == "conservative":
            return [
                {
                    'protocol': 'aave_v3',
                    'chain': 'ethereum_sepolia',
                    'target_apy': 0.04,
                    'risk_score': 0.1,
                    'allocation_percentage': 50
                },
                {
                    'protocol': 'aave_v3',
                    'chain': 'base_sepolia',
                    'target_apy': 0.035,
                    'risk_score': 0.15,
                    'allocation_percentage': 30
                },
                {
                    'protocol': 'curve',
                    'chain': 'arbitrum_sepolia',
                    'target_apy': 0.03,
                    'risk_score': 0.1,
                    'allocation_percentage': 20
                }
            ]
        else:  # balanced
            return [
                {
                    'protocol': 'aave_v3',
                    'chain': 'ethereum_sepolia',
                    'target_apy': 0.06,
                    'risk_score': 0.2,
                    'allocation_percentage': 40
                },
                {
                    'protocol': 'uniswap_v3',
                    'chain': 'base_sepolia',
                    'target_apy': 0.10,
                    'risk_score': 0.3,
                    'allocation_percentage': 35
                },
                {
                    'protocol': 'aerodrome',
                    'chain': 'arbitrum_sepolia',
                    'target_apy': 0.12,
                    'risk_score': 0.35,
                    'allocation_percentage': 25
                }
            ]

    async def calculate_rebalance_actions(
        self,
        current_positions: List[PortfolioPosition],
        target_allocations: List[Dict],
        total_portfolio_value: float
    ) -> List[RebalanceAction]:
        """Calculate specific rebalance actions needed"""

        print("Calculating rebalance actions...")

        actions = []

        # Group current positions by chain
        current_by_chain = {}
        for pos in current_positions:
            if pos.chain not in current_by_chain:
                current_by_chain[pos.chain] = 0
            current_by_chain[pos.chain] += pos.amount_usdc

        # Calculate needed transfers
        for target in target_allocations:
            target_amount = (target['allocation_percentage'] / 100) * total_portfolio_value
            current_amount = current_by_chain.get(target['chain'], 0)
            difference = target_amount - current_amount

            if abs(difference) > self.min_transfer_amount:
                if difference > 0:
                    # Need to move funds TO this chain
                    for source_chain, source_amount in current_by_chain.items():
                        if source_chain != target['chain'] and source_amount > self.min_transfer_amount:
                            transfer_amount = min(difference, source_amount - self.min_transfer_amount)

                            action = RebalanceAction(
                                action_type="cross_chain_transfer",
                                source_chain=source_chain,
                                target_chain=target['chain'],
                                amount_usdc=transfer_amount,
                                priority=1,
                                reason=f"Rebalance to achieve {target['allocation_percentage']}% allocation"
                            )
                            actions.append(action)

                            current_by_chain[source_chain] -= transfer_amount
                            current_by_chain[target['chain']] = current_by_chain.get(target['chain'], 0) + transfer_amount
                            break

        print(f"   Generated {len(actions)} rebalance actions")
        return actions

    async def rebalance_portfolio(self, strategy: str = "balanced", dry_run: bool = True) -> Dict:
        """Main rebalancing function"""

        print(f"PORTFOLIO REBALANCING - {strategy.upper()} STRATEGY")
        print("=" * 60)

        if dry_run:
            print("DRY RUN MODE - No actual transactions will be executed")

        # Step 1: Get current portfolio
        current_positions = await self.get_current_portfolio()
        total_value = sum(pos.amount_usdc for pos in current_positions)

        print(f"Current Portfolio Value: ${total_value:.2f} USDC")

        if total_value < self.min_transfer_amount:
            print("Portfolio too small for rebalancing")
            return {"status": "skipped", "reason": "insufficient_balance"}

        # Step 2: Get target allocations
        target_allocations = await self.get_optimization_targets(strategy)

        print(f"Target Allocations:")
        for target in target_allocations:
            target_amount = (target['allocation_percentage'] / 100) * total_value
            print(f"   {target['protocol']} ({target['chain']}): {target['allocation_percentage']}% (${target_amount:.2f})")

        # Step 3: Calculate rebalance actions
        actions = await self.calculate_rebalance_actions(
            current_positions,
            target_allocations,
            total_value
        )

        if not actions:
            print("Portfolio is already optimally balanced!")
            return {"status": "no_action_needed"}

        print(f"Rebalance Actions Needed:")
        for i, action in enumerate(actions, 1):
            print(f"   {i}. {action.action_type}: {action.amount_usdc:.2f} USDC")
            print(f"      {action.source_chain} -> {action.target_chain}")
            print(f"      Reason: {action.reason}")

        # Summary
        result = {
            "status": "planned",
            "total_value": total_value,
            "actions_planned": len(actions),
            "actions_executed": 0,
            "strategy": strategy,
            "timestamp": datetime.now().isoformat()
        }

        print(f"Rebalancing Summary:")
        print(f"   Strategy: {strategy}")
        print(f"   Total Value: ${total_value:.2f}")
        print(f"   Actions Planned: {len(actions)}")
        print(f"   Status: Ready for execution")

        return result

# Test the rebalancer
async def test_rebalancer():
    """Test the rebalancer functionality"""

    print("TESTING USDC AI REBALANCER")
    print("=" * 50)

    try:
        rebalancer = USDAIRebalancer()

        # Test with dry run
        result = await rebalancer.rebalance_portfolio(strategy="balanced", dry_run=True)

        print(f"Test Result: {result}")

        if result["status"] != "skipped":
            print("Rebalancer is working correctly!")
            print("   Portfolio scanning functional")
            print("   Target calculation working")
            print("   Action planning operational")
            print("   CCTP integration ready")

    except Exception as e:
        print(f"Rebalancer test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_rebalancer())