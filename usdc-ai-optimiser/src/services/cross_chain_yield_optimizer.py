# src/services/cross_chain_yield_optimizer.py
"""Cross-Chain Yield Optimizer with CCTP Integration"""

import asyncio
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass
import numpy as np

from ..apis.cctp_integration import CCTPIntegration, CCTPTransfer
from ..apis.graph_integration import GraphIntegration, GraphPoolData
from ..apis.pyth_oracle import PythOracleAPI

@dataclass
class CrossChainOpportunity:
    """Cross-chain yield opportunity"""
    source_chain: str
    destination_chain: str
    source_protocol: str
    destination_protocol: str
    source_apy: float
    destination_apy: float
    transfer_cost: float
    net_apy_improvement: float
    tvl_source: float
    tvl_destination: float
    risk_score: float
    estimated_gas_cost: float
    transfer_time_minutes: int
    confidence_score: float

@dataclass
class OptimizedStrategy:
    """Optimized cross-chain yield strategy"""
    opportunities: List[CrossChainOpportunity]
    total_amount: float
    expected_annual_return: float
    total_transfer_costs: float
    net_annual_return: float
    risk_level: str
    execution_time_hours: int
    recommended_allocation: Dict[str, float]

class CrossChainYieldOptimizer:
    """Cross-chain yield optimization with CCTP integration"""
    
    def __init__(self):
        self.cctp = CCTPIntegration()
        self.graph = GraphIntegration()
        self.oracle = PythOracleAPI()
        
        # Supported chains and protocols
        self.supported_chains = ["ethereum", "base", "arbitrum", "polygon", "avalanche"]
        self.supported_protocols = ["uniswap_v3", "curve", "aave"]
        
        # Risk weights for different protocols
        self.protocol_risk_weights = {
            "uniswap_v3": 0.3,
            "curve": 0.2,
            "aave": 0.1
        }
        
        # Chain risk weights
        self.chain_risk_weights = {
            "ethereum": 0.1,
            "base": 0.2,
            "arbitrum": 0.15,
            "polygon": 0.25,
            "avalanche": 0.3
        }
    
    async def find_cross_chain_opportunities(
        self,
        amount: float,
        risk_tolerance: str = "medium"
    ) -> List[CrossChainOpportunity]:
        """Find cross-chain yield opportunities"""
        
        print(f"🔍 Finding cross-chain opportunities for {amount} USDC...")
        
        opportunities = []
        
        # Get yield data from all chains
        all_yield_data = {}
        for chain in self.supported_chains:
            try:
                yield_data = await self.graph.get_real_time_yield_data(
                    self.supported_protocols, chain
                )
                all_yield_data[chain] = yield_data
                print(f"   📊 {chain}: {sum(len(pools) for pools in yield_data.values())} pools")
            except Exception as e:
                print(f"   ⚠️ Failed to get {chain} data: {e}")
                all_yield_data[chain] = {}
        
        # Find arbitrage opportunities
        for source_chain in self.supported_chains:
            for dest_chain in self.supported_chains:
                if source_chain == dest_chain:
                    continue
                
                for protocol in self.supported_protocols:
                    try:
                        opportunity = await self._analyze_cross_chain_opportunity(
                            source_chain, dest_chain, protocol, amount
                        )
                        if opportunity and self._meets_risk_criteria(opportunity, risk_tolerance):
                            opportunities.append(opportunity)
                    except Exception as e:
                        print(f"   ⚠️ Failed to analyze {source_chain}->{dest_chain} {protocol}: {e}")
        
        # Sort by net APY improvement
        opportunities.sort(key=lambda x: x.net_apy_improvement, reverse=True)
        
        print(f"   🎯 Found {len(opportunities)} opportunities")
        return opportunities
    
    async def _analyze_cross_chain_opportunity(
        self,
        source_chain: str,
        dest_chain: str,
        protocol: str,
        amount: float
    ) -> Optional[CrossChainOpportunity]:
        """Analyze a specific cross-chain opportunity"""
        
        try:
            # Get yield data for both chains
            source_yield_data = await self.graph.get_real_time_yield_data([protocol], source_chain)
            dest_yield_data = await self.graph.get_real_time_yield_data([protocol], dest_chain)
            
            source_pools = source_yield_data.get(protocol, [])
            dest_pools = dest_yield_data.get(protocol, [])
            
            if not source_pools or not dest_pools:
                return None
            
            # Find best pools on each chain
            best_source_pool = max(source_pools, key=lambda x: x.get('apy', 0))
            best_dest_pool = max(dest_pools, key=lambda x: x.get('apy', 0))
            
            source_apy = best_source_pool.get('apy', 0)
            dest_apy = best_dest_pool.get('apy', 0)
            
            # Calculate transfer cost
            cost_info = await self.cctp.calculate_transfer_cost(source_chain, dest_chain, amount)
            transfer_cost = cost_info['total_cost_usd']
            
            # Calculate net APY improvement
            apy_difference = dest_apy - source_apy
            transfer_cost_apy = (transfer_cost / amount) * 100 * 365  # Convert to annual percentage
            net_apy_improvement = apy_difference - transfer_cost_apy
            
            # Calculate risk score
            risk_score = self._calculate_risk_score(source_chain, dest_chain, protocol)
            
            # Estimate transfer time
            transfer_time = self._estimate_transfer_time(source_chain, dest_chain)
            
            # Calculate confidence score
            confidence_score = self._calculate_confidence_score(
                best_source_pool, best_dest_pool, risk_score
            )
            
            return CrossChainOpportunity(
                source_chain=source_chain,
                destination_chain=dest_chain,
                source_protocol=protocol,
                destination_protocol=protocol,
                source_apy=source_apy,
                destination_apy=dest_apy,
                transfer_cost=transfer_cost,
                net_apy_improvement=net_apy_improvement,
                tvl_source=best_source_pool.get('tvl_usd', 0),
                tvl_destination=best_dest_pool.get('tvl_usd', 0),
                risk_score=risk_score,
                estimated_gas_cost=transfer_cost,
                transfer_time_minutes=transfer_time,
                confidence_score=confidence_score
            )
            
        except Exception as e:
            print(f"   ⚠️ Error analyzing opportunity: {e}")
            return None
    
    def _calculate_risk_score(self, source_chain: str, dest_chain: str, protocol: str) -> float:
        """Calculate risk score for cross-chain opportunity"""
        
        protocol_risk = self.protocol_risk_weights.get(protocol, 0.5)
        source_risk = self.chain_risk_weights.get(source_chain, 0.5)
        dest_risk = self.chain_risk_weights.get(dest_chain, 0.5)
        
        # Cross-chain adds additional risk
        cross_chain_risk = 0.1
        
        total_risk = (protocol_risk + source_risk + dest_risk + cross_chain_risk) / 4
        return min(total_risk, 1.0)
    
    def _estimate_transfer_time(self, source_chain: str, dest_chain: str) -> int:
        """Estimate transfer time in minutes"""
        
        # Base times for different chains
        chain_times = {
            "ethereum": 15,  # minutes
            "base": 2,
            "arbitrum": 1,
            "polygon": 3,
            "avalanche": 1
        }
        
        source_time = chain_times.get(source_chain, 5)
        dest_time = chain_times.get(dest_chain, 5)
        
        # CCTP typically takes 10-30 minutes for attestation
        cctp_time = 20
        
        return source_time + dest_time + cctp_time
    
    def _calculate_confidence_score(
        self,
        source_pool: Dict,
        dest_pool: Dict,
        risk_score: float
    ) -> float:
        """Calculate confidence score for opportunity"""
        
        # Base confidence from TVL
        source_tvl = source_pool.get('tvl_usd', 0)
        dest_tvl = dest_pool.get('tvl_usd', 0)
        
        tvl_confidence = min(1.0, (source_tvl + dest_tvl) / 100000000)  # Normalize to $100M
        
        # Adjust for risk
        risk_adjustment = 1.0 - risk_score
        
        # Volume confidence
        source_volume = source_pool.get('volume_24h', 0)
        dest_volume = dest_pool.get('volume_24h', 0)
        volume_confidence = min(1.0, (source_volume + dest_volume) / 10000000)  # Normalize to $10M
        
        confidence = (tvl_confidence * 0.4 + risk_adjustment * 0.3 + volume_confidence * 0.3)
        return min(confidence, 1.0)
    
    def _meets_risk_criteria(self, opportunity: CrossChainOpportunity, risk_tolerance: str) -> bool:
        """Check if opportunity meets risk criteria"""
        
        risk_thresholds = {
            "low": 0.3,
            "medium": 0.5,
            "high": 0.7
        }
        
        threshold = risk_thresholds.get(risk_tolerance, 0.5)
        return opportunity.risk_score <= threshold
    
    async def optimize_cross_chain_strategy(
        self,
        total_amount: float,
        risk_tolerance: str = "medium",
        max_opportunities: int = 5
    ) -> OptimizedStrategy:
        """Optimize cross-chain yield strategy"""
        
        print(f"🚀 Optimizing cross-chain strategy for {total_amount} USDC...")
        
        # Find opportunities
        opportunities = await self.find_cross_chain_opportunities(total_amount, risk_tolerance)
        
        if not opportunities:
            print("   ⚠️ No suitable opportunities found")
            return OptimizedStrategy(
                opportunities=[],
                total_amount=total_amount,
                expected_annual_return=0,
                total_transfer_costs=0,
                net_annual_return=0,
                risk_level=risk_tolerance,
                execution_time_hours=0,
                recommended_allocation={}
            )
        
        # Select top opportunities
        selected_opportunities = opportunities[:max_opportunities]
        
        # Calculate allocation
        allocation = self._calculate_optimal_allocation(selected_opportunities, total_amount)
        
        # Calculate returns
        expected_return = sum(
            opp.destination_apy * allocation.get(f"{opp.source_chain}_{opp.destination_chain}", 0) / 100
            for opp in selected_opportunities
        )
        
        total_costs = sum(
            opp.transfer_cost * allocation.get(f"{opp.source_chain}_{opp.destination_chain}", 0) / total_amount
            for opp in selected_opportunities
        )
        
        net_return = expected_return - (total_costs / total_amount * 365 * 100)
        
        # Calculate execution time
        max_transfer_time = max(opp.transfer_time_minutes for opp in selected_opportunities)
        execution_hours = max_transfer_time / 60
        
        # Determine risk level
        avg_risk = sum(opp.risk_score for opp in selected_opportunities) / len(selected_opportunities)
        if avg_risk < 0.3:
            risk_level = "low"
        elif avg_risk < 0.5:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        strategy = OptimizedStrategy(
            opportunities=selected_opportunities,
            total_amount=total_amount,
            expected_annual_return=expected_return,
            total_transfer_costs=total_costs,
            net_annual_return=net_return,
            risk_level=risk_level,
            execution_time_hours=execution_hours,
            recommended_allocation=allocation
        )
        
        print(f"   📊 Strategy Summary:")
        print(f"   💰 Expected Annual Return: {expected_return:.2f}%")
        print(f"   💸 Total Transfer Costs: ${total_costs:.2f}")
        print(f"   🎯 Net Annual Return: {net_return:.2f}%")
        print(f"   ⚠️ Risk Level: {risk_level}")
        print(f"   ⏱️ Execution Time: {execution_hours:.1f} hours")
        
        return strategy
    
    def _calculate_optimal_allocation(
        self,
        opportunities: List[CrossChainOpportunity],
        total_amount: float
    ) -> Dict[str, float]:
        """Calculate optimal allocation across opportunities"""
        
        # Simple allocation based on net APY improvement
        total_improvement = sum(max(0, opp.net_apy_improvement) for opp in opportunities)
        
        if total_improvement == 0:
            # Equal allocation if no positive improvements
            amount_per_opp = total_amount / len(opportunities)
            return {
                f"{opp.source_chain}_{opp.destination_chain}": amount_per_opp
                for opp in opportunities
            }
        
        allocation = {}
        for opp in opportunities:
            if opp.net_apy_improvement > 0:
                weight = opp.net_apy_improvement / total_improvement
                amount = total_amount * weight
                allocation[f"{opp.source_chain}_{opp.destination_chain}"] = amount
        
        return allocation
    
    async def execute_cross_chain_strategy(
        self,
        strategy: OptimizedStrategy,
        private_key: str
    ) -> List[CCTPTransfer]:
        """Execute cross-chain strategy"""
        
        print(f"🎯 Executing cross-chain strategy...")
        
        transfers = []
        
        for opportunity in strategy.opportunities:
            try:
                amount = strategy.recommended_allocation.get(
                    f"{opportunity.source_chain}_{opportunity.destination_chain}", 0
                )
                
                if amount > 0:
                    print(f"   🌉 Executing {amount} USDC: {opportunity.source_chain} -> {opportunity.destination_chain}")
                    
                    transfer = await self.cctp.initiate_cross_chain_transfer(
                        opportunity.source_chain,
                        opportunity.destination_chain,
                        amount,
                        "0x1234567890123456789012345678901234567890",  # Placeholder recipient
                        private_key
                    )
                    
                    transfers.append(transfer)
                    
            except Exception as e:
                print(f"   ❌ Failed to execute {opportunity.source_chain} -> {opportunity.destination_chain}: {e}")
        
        print(f"   ✅ Initiated {len(transfers)} transfers")
        return transfers
    
    async def monitor_strategy_execution(
        self,
        transfers: List[CCTPTransfer]
    ) -> Dict[str, str]:
        """Monitor strategy execution"""
        
        print(f"👀 Monitoring {len(transfers)} transfers...")
        
        statuses = {}
        
        for transfer in transfers:
            try:
                status = await self.cctp.get_transfer_status(transfer)
                statuses[transfer.burn_tx_hash] = status
                
                print(f"   📊 {transfer.source_chain} -> {transfer.destination_chain}: {status}")
                
            except Exception as e:
                print(f"   ⚠️ Failed to monitor transfer: {e}")
                statuses[transfer.burn_tx_hash] = "unknown"
        
        return statuses

# Test cross-chain yield optimizer
async def test_cross_chain_optimizer():
    """Test cross-chain yield optimizer"""
    
    optimizer = CrossChainYieldOptimizer()
    
    # Test opportunity finding
    print("🔍 Testing opportunity finding...")
    opportunities = await optimizer.find_cross_chain_opportunities(10000.0, "medium")
    
    print(f"   Found {len(opportunities)} opportunities")
    for i, opp in enumerate(opportunities[:3]):
        print(f"   {i+1}. {opp.source_chain} -> {opp.destination_chain}: {opp.net_apy_improvement:.2f}% improvement")
    
    # Test strategy optimization
    print("\n🚀 Testing strategy optimization...")
    strategy = await optimizer.optimize_cross_chain_strategy(50000.0, "medium", 3)
    
    print(f"   Strategy includes {len(strategy.opportunities)} opportunities")
    print(f"   Expected return: {strategy.expected_annual_return:.2f}%")
    print(f"   Net return: {strategy.net_annual_return:.2f}%")

if __name__ == "__main__":
    asyncio.run(test_cross_chain_optimizer())