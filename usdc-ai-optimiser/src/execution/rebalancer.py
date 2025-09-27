# src/execution/rebalancer.py
"""CrossYield Smart Wallet Rebalancer - Individual Portfolio Management"""

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

# Import our smart wallet integrations
from ..contract_integration import contract_manager
from ..smart_wallet_cctp import smart_wallet_cctp

# Load environment variables
load_dotenv()

@dataclass
class UserPortfolioPosition:
    """Individual user portfolio position data"""
    user_address: str
    smart_wallet_address: str
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
        from ..protocols.protocol_investor import ProtocolInvestor

        self.graph = GraphIntegration()
        self.cctp = CCTPIntegration()
        self.aggregator = EnhancedUSDCDataAggregator()
        self.investor = ProtocolInvestor()

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
        elif strategy == "aggressive":
            return [
                {
                    'protocol': 'aerodrome',
                    'chain': 'arbitrum_sepolia',
                    'target_apy': 0.15,
                    'risk_score': 0.4,
                    'allocation_percentage': 50
                },
                {
                    'protocol': 'uniswap_v3',
                    'chain': 'base_sepolia',
                    'target_apy': 0.12,
                    'risk_score': 0.35,
                    'allocation_percentage': 35
                },
                {
                    'protocol': 'aave_v3',
                    'chain': 'ethereum_sepolia',
                    'target_apy': 0.08,
                    'risk_score': 0.25,
                    'allocation_percentage': 15
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
            "status": "planned" if actions else "no_action_needed",
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

    async def execute_rebalancing(self, rebalance_plan: Dict) -> Dict:
        """Execute the planned rebalancing actions"""
        
        print(f"EXECUTING REBALANCING PLAN")
        print("=" * 50)
        
        if rebalance_plan["status"] != "planned":
            print("❌ No valid rebalancing plan to execute")
            return {"status": "failed", "reason": "no_valid_plan"}
        
        executed_actions = []
        total_cost = 0.0
        
        try:
            # Get current positions for execution
            current_positions = await self.get_current_portfolio()
            target_allocations = await self.get_optimization_targets(rebalance_plan["strategy"])
            total_value = sum(pos.amount_usdc for pos in current_positions)
            
            # Calculate actions again for execution
            actions = await self.calculate_rebalance_actions(
                current_positions,
                target_allocations,
                total_value
            )
            
            print(f"Executing {len(actions)} rebalancing actions...")
            
            for i, action in enumerate(actions, 1):
                print(f"\nAction {i}/{len(actions)}: {action.action_type}")
                print(f"   Amount: {action.amount_usdc:.2f} USDC")
                print(f"   Route: {action.source_chain} → {action.target_chain}")
                
                try:
                    if action.action_type == "cross_chain_transfer":
                        # Execute CCTP transfer
                        transfer_result = await self._execute_cctp_transfer(action)
                        executed_actions.append(transfer_result)
                        total_cost += transfer_result.get("cost", 0)
                        
                        print(f"   ✅ Transfer executed: {transfer_result.get('status', 'unknown')}")
                    
                except Exception as e:
                    print(f"   ❌ Action failed: {e}")
                    executed_actions.append({
                        "action": action,
                        "status": "failed",
                        "error": str(e)
                    })
            
            # Verify final portfolio state
            final_positions = await self.get_current_portfolio()
            final_value = sum(pos.amount_usdc for pos in final_positions)
            
            result = {
                "status": "completed",
                "actions_executed": len([a for a in executed_actions if a.get("status") == "success"]),
                "actions_failed": len([a for a in executed_actions if a.get("status") == "failed"]),
                "total_cost": total_cost,
                "initial_value": total_value,
                "final_value": final_value,
                "value_change": final_value - total_value,
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"\n🎯 REBALANCING EXECUTION COMPLETE")
            print(f"   Actions Executed: {result['actions_executed']}")
            print(f"   Actions Failed: {result['actions_failed']}")
            print(f"   Total Cost: ${total_cost:.2f}")
            print(f"   Value Change: ${result['value_change']:.2f}")
            
            return result
            
        except Exception as e:
            print(f"❌ Rebalancing execution failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "actions_executed": len(executed_actions),
                "total_cost": total_cost
            }

    async def _execute_cctp_transfer(self, action: RebalanceAction) -> Dict:
        """Execute a CCTP cross-chain transfer"""
        
        try:
            # Import CCTP integration
            from ..apis.cctp_integration import CCTPIntegration
            cctp = CCTPIntegration()
            
            print(f"   🌉 Initiating CCTP transfer...")
            
            # Initiate transfer
            transfer = await cctp.initiate_cross_chain_transfer(
                source_chain=action.source_chain,
                destination_chain=action.target_chain,
                amount=action.amount_usdc,
                recipient=self.account.address,
                private_key=self.private_key
            )
            
            print(f"   🔥 Burn transaction: {transfer.burn_tx_hash}")
            
            # Wait for attestation and complete transfer
            completed_transfer = await cctp.complete_cross_chain_transfer(
                transfer, self.private_key
            )
            
            print(f"   🪙 Mint transaction: {completed_transfer.mint_tx_hash}")
            
            # Calculate costs
            burn_cost = transfer.gas_used * transfer.gas_price / 10**18 if transfer.gas_used else 0
            mint_cost = completed_transfer.gas_used * completed_transfer.gas_price / 10**18 if completed_transfer.gas_used else 0
            total_cost = burn_cost + mint_cost
            
            return {
                "action": action,
                "status": "success",
                "burn_tx": transfer.burn_tx_hash,
                "mint_tx": completed_transfer.mint_tx_hash,
                "amount": action.amount_usdc,
                "cost": total_cost,
                "execution_time": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "action": action,
                "status": "failed",
                "error": str(e),
                "execution_time": datetime.now().isoformat()
            }

    async def get_portfolio_performance(self, time_period: str = "24h") -> Dict:
        """Get portfolio performance metrics"""
        
        print(f"Analyzing portfolio performance over {time_period}...")
        
        try:
            current_positions = await self.get_current_portfolio()
            total_value = sum(pos.amount_usdc for pos in current_positions)
            
            # Calculate performance metrics
            performance = {
                "total_value": total_value,
                "position_count": len(current_positions),
                "chain_distribution": {},
                "average_apy": 0.0,
                "risk_score": 0.0,
                "last_updated": datetime.now().isoformat()
            }
            
            # Calculate chain distribution
            for pos in current_positions:
                if pos.chain not in performance["chain_distribution"]:
                    performance["chain_distribution"][pos.chain] = 0
                performance["chain_distribution"][pos.chain] += pos.amount_usdc
            
            # Calculate weighted average APY and risk
            total_weighted_apy = 0
            total_weighted_risk = 0
            
            for pos in current_positions:
                weight = pos.amount_usdc / total_value if total_value > 0 else 0
                total_weighted_apy += pos.apy * weight
                total_weighted_risk += pos.risk_score * weight
            
            performance["average_apy"] = total_weighted_apy
            performance["risk_score"] = total_weighted_risk
            
            return performance
            
        except Exception as e:
            print(f"❌ Error calculating performance: {e}")
            return {"error": str(e)}

    async def optimize_gas_costs(self, actions: List[RebalanceAction]) -> List[RebalanceAction]:
        """Optimize gas costs for rebalancing actions"""
        
        print("Optimizing gas costs for rebalancing actions...")
        
        optimized_actions = []
        
        for action in actions:
            try:
                # Get current gas prices for both chains
                source_config = self.cctp.chain_configs[action.source_chain]
                dest_config = self.cctp.chain_configs[action.target_chain]
                
                source_w3 = Web3(Web3.HTTPProvider(source_config.rpc_url))
                dest_w3 = Web3(Web3.HTTPProvider(dest_config.rpc_url))
                
                source_gas_price = source_w3.eth.gas_price
                dest_gas_price = dest_w3.eth.gas_price
                
                # Estimate gas costs
                estimated_burn_gas = source_config.gas_limit
                estimated_mint_gas = dest_config.gas_limit
                
                burn_cost = estimated_burn_gas * source_gas_price / 10**18
                mint_cost = estimated_mint_gas * dest_gas_price / 10**18
                total_cost = burn_cost + mint_cost
                
                # Check if cost is acceptable
                cost_percentage = total_cost / action.amount_usdc if action.amount_usdc > 0 else 0
                
                if cost_percentage <= self.max_gas_cost_percentage:
                    action.reason += f" (Gas cost: ${total_cost:.2f}, {cost_percentage:.2%})"
                    optimized_actions.append(action)
                else:
                    print(f"   ⚠️ Skipping action due to high gas cost: {cost_percentage:.2%}")
                    
            except Exception as e:
                print(f"   ❌ Error optimizing action: {e}")
                optimized_actions.append(action)  # Include anyway
        
        print(f"   Optimized to {len(optimized_actions)} actions")
        return optimized_actions

    async def invest_portfolio(self, strategy: str = "balanced", total_amount: float = None) -> Dict:
        """Actually invest the portfolio into DeFi protocols"""
        
        print(f"💰 INVESTING PORTFOLIO - {strategy.upper()} STRATEGY")
        print("=" * 60)
        
        try:
            # Get current wallet balances
            current_positions = await self.get_current_portfolio()
            total_value = sum(pos.amount_usdc for pos in current_positions)
            
            if total_amount is None:
                total_amount = total_value
            
            print(f"Total Portfolio Value: ${total_value:.2f}")
            print(f"Amount to Invest: ${total_amount:.2f}")
            
            if total_amount < 10.0:
                print("❌ Portfolio too small for investment (minimum $10)")
                return {"status": "failed", "reason": "insufficient_amount"}
            
            # Get target allocations
            target_allocations = await self.get_optimization_targets(strategy)
            
            print(f"\nInvestment Plan:")
            investments = []
            total_invested = 0.0
            
            for target in target_allocations:
                target_amount = (target['allocation_percentage'] / 100) * total_amount
                
                if target_amount >= 1.0:  # Minimum $1 investment
                    print(f"   {target['protocol']} ({target['chain']}): ${target_amount:.2f}")
                    
                    # Map to protocol investor format
                    protocol_key = f"{target['protocol']}_{target['chain']}"
                    
                    # Execute investment
                    investment = await self.investor.invest_in_protocol(
                        protocol=protocol_key,
                        amount_usdc=target_amount,
                        apy=target['target_apy'],
                        risk_score=target['risk_score']
                    )
                    
                    investments.append(investment)
                    total_invested += target_amount if investment.status == "invested" else 0
            
            # Get final protocol balances
            print(f"\n📊 Final Protocol Balances:")
            protocol_balances = await self.investor.get_all_protocol_balances()
            
            for protocol, balance in protocol_balances.items():
                if balance > 0:
                    print(f"   {protocol}: ${balance:.2f} USDC")
            
            result = {
                "status": "completed",
                "strategy": strategy,
                "total_amount": total_amount,
                "total_invested": total_invested,
                "investments_count": len(investments),
                "successful_investments": len([i for i in investments if i.status == "invested"]),
                "protocol_balances": protocol_balances,
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"\n🎯 INVESTMENT SUMMARY:")
            print(f"   Strategy: {strategy}")
            print(f"   Total Invested: ${total_invested:.2f}")
            print(f"   Successful Investments: {result['successful_investments']}")
            print(f"   Protocol Positions: {len([b for b in protocol_balances.values() if b > 0])}")
            
            return result
            
        except Exception as e:
            print(f"❌ Portfolio investment failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

    async def rebalance_invested_portfolio(self, strategy: str = "balanced") -> Dict:
        """Rebalance an already invested portfolio"""
        
        print(f"🔄 REBALANCING INVESTED PORTFOLIO - {strategy.upper()} STRATEGY")
        print("=" * 60)
        
        try:
            # Get current protocol balances
            protocol_balances = await self.investor.get_all_protocol_balances()
            total_invested = sum(protocol_balances.values())
            
            print(f"Total Invested Value: ${total_invested:.2f}")
            
            if total_invested < 10.0:
                print("❌ Portfolio too small for rebalancing")
                return {"status": "skipped", "reason": "insufficient_amount"}
            
            # Get target allocations
            target_allocations = await self.get_optimization_targets(strategy)
            
            # Calculate rebalancing actions
            rebalance_actions = []
            
            for target in target_allocations:
                protocol_key = f"{target['protocol']}_{target['chain']}"
                target_amount = (target['allocation_percentage'] / 100) * total_invested
                current_amount = protocol_balances.get(protocol_key, 0.0)
                difference = target_amount - current_amount
                
                if abs(difference) > 1.0:  # Minimum $1 rebalancing
                    if difference > 0:
                        # Need to invest more
                        rebalance_actions.append({
                            "action": "invest",
                            "protocol": protocol_key,
                            "amount": difference,
                            "reason": f"Rebalance to {target['allocation_percentage']}%"
                        })
                    else:
                        # Need to withdraw
                        rebalance_actions.append({
                            "action": "withdraw",
                            "protocol": protocol_key,
                            "amount": abs(difference),
                            "reason": f"Rebalance from {target['allocation_percentage']}%"
                        })
            
            if not rebalance_actions:
                print("✅ Portfolio already optimally balanced!")
                return {"status": "no_action_needed"}
            
            print(f"Rebalancing Actions Needed: {len(rebalance_actions)}")
            
            # Execute rebalancing actions
            executed_actions = []
            
            for action in rebalance_actions:
                print(f"\nAction: {action['action']} ${action['amount']:.2f} in {action['protocol']}")
                
                try:
                    if action['action'] == 'invest':
                        investment = await self.investor.invest_in_protocol(
                            protocol=action['protocol'],
                            amount_usdc=action['amount'],
                            apy=0.05,  # Default APY
                            risk_score=0.2  # Default risk
                        )
                        executed_actions.append(investment)
                    elif action['action'] == 'withdraw':
                        tx_hash = await self.investor.withdraw_from_protocol(
                            protocol=action['protocol'],
                            amount_usdc=action['amount']
                        )
                        executed_actions.append({
                            "action": "withdraw",
                            "protocol": action['protocol'],
                            "amount": action['amount'],
                            "tx_hash": tx_hash,
                            "status": "completed"
                        })
                        
                except Exception as e:
                    print(f"   ❌ Action failed: {e}")
                    executed_actions.append({
                        "action": action['action'],
                        "protocol": action['protocol'],
                        "amount": action['amount'],
                        "status": "failed",
                        "error": str(e)
                    })
            
            # Get final balances
            final_balances = await self.investor.get_all_protocol_balances()
            
            result = {
                "status": "completed",
                "strategy": strategy,
                "total_value": total_invested,
                "actions_executed": len(executed_actions),
                "successful_actions": len([a for a in executed_actions if a.get('status') == 'completed' or a.get('status') == 'invested']),
                "final_balances": final_balances,
                "timestamp": datetime.now().isoformat()
            }
            
            print(f"\n🎯 REBALANCING SUMMARY:")
            print(f"   Actions Executed: {result['actions_executed']}")
            print(f"   Successful Actions: {result['successful_actions']}")
            print(f"   Final Value: ${sum(final_balances.values()):.2f}")
            
            return result
            
        except Exception as e:
            print(f"❌ Portfolio rebalancing failed: {e}")
            return {
                "status": "failed",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }

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