"""
CrossYield Smart Wallet Manager
Main coordination layer for individual user portfolio management
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from decimal import Decimal

from .contract_integration import contract_manager, CHAIN_CONFIGS
from .smart_wallet_cctp import smart_wallet_cctp
from .agents.multi_agent import MultiAgentOrchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class UserPortfolio:
    """Complete user portfolio across all chains"""
    user_address: str
    total_value_usd: Decimal
    strategy: str
    risk_tolerance: str

    # Smart wallet addresses by chain
    wallets: Dict[str, str]  # chain -> wallet_address

    # Positions by chain and protocol
    positions: Dict[str, Dict[str, Decimal]]  # chain -> protocol -> amount

    # Performance metrics
    current_apy: Optional[Decimal] = None
    realized_pnl: Decimal = Decimal('0')
    unrealized_pnl: Decimal = Decimal('0')

    # Timestamps
    created_at: datetime = None
    last_optimization: Optional[datetime] = None
    last_rebalance: Optional[datetime] = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

@dataclass
class OptimizationRequest:
    """User optimization request"""
    user_address: str
    amount: Decimal
    strategy: str
    target_chains: List[str]
    max_gas_cost: Optional[Decimal] = None
    min_apy_improvement: Optional[Decimal] = None

    # Metadata
    request_id: str = None
    created_at: datetime = None
    status: str = "pending"  # pending, processing, completed, failed

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.request_id is None:
            self.request_id = f"{self.user_address}_{int(self.created_at.timestamp())}"

class SmartWalletManager:
    """Manages individual user smart wallets and portfolios"""

    def __init__(self):
        self.user_portfolios: Dict[str, UserPortfolio] = {}
        self.pending_requests: Dict[str, OptimizationRequest] = {}
        self.ai_orchestrator = MultiAgentOrchestrator()

        # Event listeners for contract events
        self.event_listeners = {}

    async def start(self):
        """Start the smart wallet manager"""
        logger.info("🚀 Starting CrossYield Smart Wallet Manager")

        # Start contract event listeners
        await self._start_event_listeners()

        # Start CCTP monitoring
        asyncio.create_task(smart_wallet_cctp.monitor_and_complete_transfers())

        # Start optimization processing
        asyncio.create_task(self._process_optimization_requests())

        logger.info("✅ Smart Wallet Manager started successfully")

    async def _start_event_listeners(self):
        """Start listening for contract events"""
        logger.info("📡 Starting contract event listeners...")

        for chain in CHAIN_CONFIGS.keys():
            try:
                # Listen for optimization requests
                contract_manager.listen_for_events(
                    chain=chain,
                    contract_type="yieldRouter",
                    event_name="OptimizationRequested",
                    callback=self._handle_optimization_request_event
                )

                # Listen for smart wallet creation
                contract_manager.listen_for_events(
                    chain=chain,
                    contract_type="smartWalletFactory",
                    event_name="WalletCreated",
                    callback=self._handle_wallet_created_event
                )

                logger.info(f"✅ Event listeners started for {chain}")

            except Exception as e:
                logger.error(f"❌ Failed to start event listeners for {chain}: {e}")

    def _handle_optimization_request_event(self, event):
        """Handle OptimizationRequested events from contracts"""
        try:
            args = event['args']
            user_address = args['user']
            amount = Decimal(str(args['amount'])) / Decimal('1e6')  # Convert from wei
            strategy = args['strategy']

            logger.info(f"📋 Optimization request: {user_address} - {amount} USDC - {strategy}")

            # Create optimization request
            request = OptimizationRequest(
                user_address=user_address,
                amount=amount,
                strategy=strategy,
                target_chains=list(CHAIN_CONFIGS.keys())
            )

            self.pending_requests[request.request_id] = request

        except Exception as e:
            logger.error(f"❌ Error handling optimization request event: {e}")

    def _handle_wallet_created_event(self, event):
        """Handle WalletCreated events"""
        try:
            args = event['args']
            user_address = args['user']
            wallet_address = args['wallet']

            logger.info(f"👛 New wallet created: {user_address} -> {wallet_address}")

            # Update user portfolio with new wallet
            if user_address in self.user_portfolios:
                portfolio = self.user_portfolios[user_address]
                # Determine which chain this wallet is on based on the event
                for chain, config in CHAIN_CONFIGS.items():
                    if event['address'] == contract_manager.get_contract(chain, 'smartWalletFactory').address:
                        portfolio.wallets[chain] = wallet_address
                        break

        except Exception as e:
            logger.error(f"❌ Error handling wallet created event: {e}")

    async def _process_optimization_requests(self):
        """Process pending optimization requests"""
        logger.info("🔄 Starting optimization request processor")

        while True:
            try:
                # Process all pending requests
                requests_to_process = list(self.pending_requests.values())

                for request in requests_to_process:
                    if request.status == "pending":
                        await self._execute_optimization(request)

                # Sleep before next iteration
                await asyncio.sleep(10)

            except Exception as e:
                logger.error(f"❌ Error in optimization processor: {e}")
                await asyncio.sleep(30)

    async def _execute_optimization(self, request: OptimizationRequest):
        """Execute an optimization request"""
        try:
            logger.info(f"🎯 Executing optimization for {request.user_address}")
            request.status = "processing"

            # Get or create user portfolio
            portfolio = await self._get_or_create_portfolio(request.user_address)

            # Run AI optimization
            optimization_result = await self.ai_orchestrator.optimize_portfolio_for_user(
                user_address=request.user_address,
                current_portfolio=portfolio,
                new_deposit=request.amount,
                strategy=request.strategy,
                target_chains=request.target_chains
            )

            if optimization_result.get('success'):
                # Execute the recommended actions
                await self._execute_optimization_actions(
                    request.user_address,
                    optimization_result['actions']
                )

                # Update portfolio
                portfolio.last_optimization = datetime.now()
                portfolio.strategy = request.strategy

                # Report completion to contract
                await self._report_optimization_completion(request, optimization_result)

                request.status = "completed"
                logger.info(f"✅ Optimization completed for {request.user_address}")

            else:
                request.status = "failed"
                logger.error(f"❌ Optimization failed for {request.user_address}: {optimization_result.get('error')}")

        except Exception as e:
            logger.error(f"❌ Error executing optimization: {e}")
            request.status = "failed"

    async def _get_or_create_portfolio(self, user_address: str) -> UserPortfolio:
        """Get existing portfolio or create new one"""
        if user_address not in self.user_portfolios:
            # Create new portfolio
            portfolio = UserPortfolio(
                user_address=user_address,
                total_value_usd=Decimal('0'),
                strategy="balanced",
                risk_tolerance="medium",
                wallets={},
                positions={}
            )

            # Create smart wallets on all chains
            for chain in CHAIN_CONFIGS.keys():
                try:
                    wallet_address = await contract_manager.get_or_create_wallet(user_address, chain)
                    portfolio.wallets[chain] = wallet_address
                    portfolio.positions[chain] = {}
                    logger.info(f"📱 Wallet created on {chain}: {wallet_address}")
                except Exception as e:
                    logger.error(f"❌ Failed to create wallet on {chain}: {e}")

            self.user_portfolios[user_address] = portfolio

        return self.user_portfolios[user_address]

    async def _execute_optimization_actions(self, user_address: str, actions: List[Dict]):
        """Execute optimization actions (allocations, transfers, etc.)"""
        logger.info(f"⚡ Executing {len(actions)} optimization actions for {user_address}")

        for action in actions:
            try:
                action_type = action.get('type')

                if action_type == 'allocate':
                    await self._execute_allocation(user_address, action)
                elif action_type == 'transfer':
                    await self._execute_cross_chain_transfer(user_address, action)
                elif action_type == 'rebalance':
                    await self._execute_rebalance(user_address, action)
                else:
                    logger.warning(f"⚠️ Unknown action type: {action_type}")

            except Exception as e:
                logger.error(f"❌ Error executing action {action}: {e}")

    async def _execute_allocation(self, user_address: str, action: Dict):
        """Execute protocol allocation"""
        try:
            chain = action['chain']
            protocol = action['protocol']
            amount = int(float(action['amount']) * 1e6)  # Convert to USDC wei

            # Report allocation to YieldRouter
            await contract_manager.report_allocation(
                user_address=user_address,
                protocol=protocol,
                chain_id=CHAIN_CONFIGS[chain]["chainId"],
                amount=amount,
                chain=chain
            )

            # Update local portfolio tracking
            portfolio = self.user_portfolios[user_address]
            if chain not in portfolio.positions:
                portfolio.positions[chain] = {}
            portfolio.positions[chain][protocol] = Decimal(str(action['amount']))

            logger.info(f"💰 Allocated {action['amount']} USDC to {protocol} on {chain}")

        except Exception as e:
            logger.error(f"❌ Error executing allocation: {e}")

    async def _execute_cross_chain_transfer(self, user_address: str, action: Dict):
        """Execute cross-chain USDC transfer via CCTP"""
        try:
            source_chain = action['source_chain']
            destination_chain = action['destination_chain']
            amount = int(float(action['amount']) * 1e6)  # Convert to USDC wei

            # Initiate CCTP transfer through smart wallets
            transfer = await smart_wallet_cctp.initiate_cctp_transfer(
                user_address=user_address,
                source_chain=source_chain,
                destination_chain=destination_chain,
                amount=amount
            )

            logger.info(f"🌉 CCTP transfer initiated: {amount/1e6} USDC from {source_chain} to {destination_chain}")

        except Exception as e:
            logger.error(f"❌ Error executing cross-chain transfer: {e}")

    async def _execute_rebalance(self, user_address: str, action: Dict):
        """Execute portfolio rebalance within a chain"""
        try:
            chain = action['chain']
            rebalances = action['rebalances']  # List of protocol changes

            for rebalance in rebalances:
                protocol = rebalance['protocol']
                new_amount = int(float(rebalance['amount']) * 1e6)

                # Report new allocation
                await contract_manager.report_allocation(
                    user_address=user_address,
                    protocol=protocol,
                    chain_id=CHAIN_CONFIGS[chain]["chainId"],
                    amount=new_amount,
                    chain=chain
                )

            logger.info(f"⚖️ Rebalanced portfolio on {chain} with {len(rebalances)} changes")

        except Exception as e:
            logger.error(f"❌ Error executing rebalance: {e}")

    async def _report_optimization_completion(self, request: OptimizationRequest, result: Dict):
        """Report optimization completion to smart contracts"""
        try:
            # Determine which chain to report to (use the chain with the largest allocation)
            report_chain = self._get_primary_chain(result['actions'])

            protocols = []
            chain_ids = []
            allocations = []

            for action in result['actions']:
                if action.get('type') == 'allocate':
                    protocols.append(action['protocol'])
                    chain_ids.append(CHAIN_CONFIGS[action['chain']]["chainId"])
                    allocations.append(int(float(action['amount']) * 1e6))

            # Report to YieldRouter
            await contract_manager.report_optimization_complete(
                user_address=request.user_address,
                expected_apy=int(result.get('expected_apy', 500)),  # Default 5%
                protocols=protocols,
                chain_ids=chain_ids,
                allocations=allocations,
                total_cost=int(result.get('total_gas_cost', 0) * 1e6),
                chain=report_chain
            )

            logger.info(f"📊 Reported optimization completion to contracts")

        except Exception as e:
            logger.error(f"❌ Error reporting optimization completion: {e}")

    def _get_primary_chain(self, actions: List[Dict]) -> str:
        """Get the chain with the largest allocation"""
        chain_totals = {}

        for action in actions:
            if action.get('type') == 'allocate':
                chain = action['chain']
                amount = float(action['amount'])
                chain_totals[chain] = chain_totals.get(chain, 0) + amount

        if chain_totals:
            return max(chain_totals.items(), key=lambda x: x[1])[0]

        # Default to first configured chain
        return list(CHAIN_CONFIGS.keys())[0]

    async def get_user_portfolio_status(self, user_address: str) -> Optional[Dict]:
        """Get complete portfolio status for a user"""
        if user_address not in self.user_portfolios:
            return None

        portfolio = self.user_portfolios[user_address]

        # Get real-time data from contracts
        contract_portfolios = {}
        for chain in portfolio.wallets.keys():
            try:
                contract_portfolio = contract_manager.get_user_portfolio(user_address, chain)
                if contract_portfolio:
                    contract_portfolios[chain] = contract_portfolio
            except Exception as e:
                logger.error(f"❌ Error getting portfolio from {chain}: {e}")

        return {
            "user_address": user_address,
            "wallets": portfolio.wallets,
            "strategy": portfolio.strategy,
            "total_value_usd": float(portfolio.total_value_usd),
            "positions": portfolio.positions,
            "contract_data": contract_portfolios,
            "cctp_transfers": smart_wallet_cctp.get_user_transfers(user_address),
            "last_optimization": portfolio.last_optimization.isoformat() if portfolio.last_optimization else None,
            "created_at": portfolio.created_at.isoformat()
        }

    def get_system_status(self) -> Dict:
        """Get overall system status"""
        return {
            "total_users": len(self.user_portfolios),
            "pending_optimizations": len([r for r in self.pending_requests.values() if r.status == "pending"]),
            "active_cctp_transfers": len([t for t in smart_wallet_cctp.active_transfers.values() if t.status != "minted"]),
            "connected_chains": list(contract_manager.web3_clients.keys()),
            "uptime": datetime.now().isoformat()
        }

# Global smart wallet manager instance
smart_wallet_manager = SmartWalletManager()