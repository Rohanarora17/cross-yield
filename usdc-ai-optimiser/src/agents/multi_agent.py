# src/agents/multi_agent.py
"""Multi-Agent Orchestrator - coordinates all agents"""

import asyncio
import sys
import os
import time
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.agents.yield_agent import YieldMaximizerAgent
from src.agents.risk_agent import RiskAssessmentAgent
from src.agents.coordinator_agent import LLMCoordinatorAgent
from src.data.models import USDCOpportunity, UserProfile
from src.config import config
from src.utils.logger import (
    log_ai_start, log_ai_end, log_ai_error, log_agent_analysis, 
    log_agent_result, log_coordination_phase, log_performance_metrics,
    log_allocation_decision
)

class MultiAgentOrchestrator:
    """Orchestrates multiple AI agents for yield optimization"""

    def __init__(self, claude_api_key: Optional[str] = None):
        log_ai_start("Multi-Agent System Initialization", {"claude_api_provided": claude_api_key is not None})

        # Load API key from config if not provided
        if claude_api_key is None:
            try:
                claude_api_key = config.CLAUDE_API_KEY
            except:
                claude_api_key = os.getenv('CLAUDE_API_KEY')

        # Initialize the three core agents
        self.yield_agent = YieldMaximizerAgent()
        self.risk_agent = RiskAssessmentAgent()
        self.coordinator_agent = LLMCoordinatorAgent(claude_api_key)
        
        # System configuration
        self.agents_active = True
        self.consensus_threshold = 0.8
        
        log_ai_end("Multi-Agent System Initialization", {
            "yield_agent_ready": True,
            "risk_agent_ready": True,
            "coordinator_agent_ready": True,
            "llm_available": self.coordinator_agent.llm_available,
            "consensus_threshold": self.consensus_threshold
        })
    
    async def coordinate_optimization(self, opportunities: List[USDCOpportunity], 
                                    user_profile: UserProfile) -> Dict[str, Any]:
        """Main coordination method - runs all agents and synthesizes results"""
        
        start_time = time.time()
        log_ai_start("Multi-Agent Coordination", {
            "opportunities_count": len(opportunities),
            "user_amount": user_profile.amount,
            "risk_tolerance": user_profile.risk_tolerance,
            "preferred_chains": user_profile.preferred_chains
        })
        
        try:
            # Phase 1: Run agents in parallel
            log_coordination_phase("Phase 1: Parallel Agent Execution", {
                "agents": ["YieldMaximizer", "RiskAssessment"],
                "execution_mode": "parallel"
            })
            agent_results = await self._run_agents_parallel(opportunities, user_profile)
            
            # Phase 2: Agent coordination and debate
            log_coordination_phase("Phase 2: Agent Coordination", {
                "agent_results_count": len(agent_results),
                "coordination_method": "llm_synthesis"
            })
            final_strategy = await self._coordinate_agents(agent_results, opportunities, user_profile)
            
            # Phase 3: Consensus validation
            log_coordination_phase("Phase 3: Consensus Validation", {
                "consensus_threshold": self.consensus_threshold
            })
            consensus_score = await self._calculate_consensus(agent_results, final_strategy)
            
            # Phase 4: Final results
            complete_result = {
                "agent_results": agent_results,
                "final_strategy": final_strategy,
                "consensus_score": consensus_score,
                "total_agents": len(agent_results),
                "system_confidence": self._calculate_system_confidence(agent_results, consensus_score),
                "execution_ready": True
            }
            
            total_duration = time.time() - start_time
            log_performance_metrics({
                "total_agents": len(agent_results),
                "consensus_score": consensus_score,
                "system_confidence": complete_result["system_confidence"],
                "expected_apy": final_strategy.get("expected_apy", 0),
                "coordination_duration": total_duration
            })
            
            log_ai_end("Multi-Agent Coordination", complete_result, total_duration)
            
            return complete_result
            
        except Exception as e:
            log_ai_error("Multi-Agent Coordination", e, {
                "opportunities_count": len(opportunities),
                "user_profile": {
                    "amount": user_profile.amount,
                    "risk_tolerance": user_profile.risk_tolerance
                }
            })
            return await self._emergency_fallback(opportunities, user_profile)
    
    async def _run_agents_parallel(self, opportunities: List[USDCOpportunity], 
                                 user_profile: UserProfile) -> Dict[str, Any]:
        """Run all agents in parallel for efficiency"""
        
        start_time = time.time()
        log_ai_start("Parallel Agent Execution", {
            "agents": ["YieldMaximizer", "RiskAssessment"],
            "opportunities_count": len(opportunities)
        })
        
        # Create agent tasks
        tasks = [
            self.yield_agent.analyze(opportunities, user_profile),
            self.risk_agent.analyze(opportunities, user_profile)
        ]
        
        # Run agents concurrently
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Process results
        agent_results = {}
        
        if isinstance(results[0], dict):
            agent_results["yield_maximizer"] = results[0]
            log_agent_result("YieldMaximizer", results[0])
        else:
            log_ai_error("YieldMaximizer Agent", results[0], {"agent": "YieldMaximizer"})
            
        if isinstance(results[1], dict):
            agent_results["risk_assessor"] = results[1]
            log_agent_result("RiskAssessment", results[1])
        else:
            log_ai_error("RiskAssessment Agent", results[1], {"agent": "RiskAssessment"})
        
        duration = time.time() - start_time
        log_performance_metrics({
            "successful_agents": len(agent_results),
            "failed_agents": len(tasks) - len(agent_results),
            "parallel_execution_duration": duration
        })
        
        log_ai_end("Parallel Agent Execution", {
            "successful_agents": list(agent_results.keys()),
            "total_agents": len(tasks)
        }, duration)
        
        return agent_results
    
    async def _coordinate_agents(self, agent_results: Dict[str, Any], 
                               opportunities: List[USDCOpportunity],
                               user_profile: UserProfile) -> Dict[str, Any]:
        """Coordinate between agent recommendations"""
        
        if len(agent_results) < 2:
            print("⚠️ Insufficient agent results for coordination, using fallback")
            return await self._single_agent_fallback(agent_results, opportunities, user_profile)
        
        yield_result = agent_results.get("yield_maximizer")
        risk_result = agent_results.get("risk_assessor")
        
        if yield_result and risk_result:
            # Use LLM coordinator to synthesize strategies
            coordination_result = await self.coordinator_agent.coordinate_agent_strategies(
                yield_result, risk_result, opportunities, user_profile
            )
            
            return coordination_result
        else:
            return await self._partial_agent_fallback(agent_results)
    
    async def _calculate_consensus(self, agent_results: Dict[str, Any], 
                                 final_strategy: Dict[str, Any]) -> float:
        """Calculate consensus score between agents"""
        
        if len(agent_results) < 2:
            return 0.5
        
        # Compare expected APYs for consensus measurement
        apys = []
        for agent_name, result in agent_results.items():
            if isinstance(result, dict) and "expected_apy" in result:
                apys.append(result["expected_apy"])
        
        if len(apys) < 2:
            return 0.5
        
        # Calculate consensus based on APY agreement
        mean_apy = sum(apys) / len(apys)
        variance = sum((apy - mean_apy) ** 2 for apy in apys) / len(apys)
        std_dev = variance ** 0.5
        
        # Normalize to consensus score (lower variance = higher consensus)
        if mean_apy > 0:
            consensus = max(0.0, 1.0 - (std_dev / mean_apy))
        else:
            consensus = 0.5
        
        return min(consensus, 1.0)
    
    def _calculate_system_confidence(self, agent_results: Dict[str, Any], 
                                   consensus_score: float) -> float:
        """Calculate overall system confidence"""
        
        if not agent_results:
            return 0.3
        
        # Average individual agent confidence
        confidences = []
        for result in agent_results.values():
            if isinstance(result, dict) and "confidence" in result:
                confidences.append(result["confidence"])
        
        if not confidences:
            return 0.5
        
        avg_confidence = sum(confidences) / len(confidences)
        
        # System confidence is combination of individual confidence and consensus
        system_confidence = (avg_confidence * 0.7 + consensus_score * 0.3)
        
        return min(system_confidence, 1.0)
    
    async def _single_agent_fallback(self, agent_results: Dict[str, Any],
                                   opportunities: List[USDCOpportunity],
                                   user_profile: UserProfile) -> Dict[str, Any]:
        """Fallback when only one agent succeeded"""
        
        if "yield_maximizer" in agent_results:
            result = agent_results["yield_maximizer"]
            result["coordination_method"] = "single_agent_yield"
        elif "risk_assessor" in agent_results:
            result = agent_results["risk_assessor"]
            result["coordination_method"] = "single_agent_risk"
        else:
            # Emergency fallback
            return await self._emergency_fallback(opportunities, user_profile)
        
        return result
    
    async def _partial_agent_fallback(self, agent_results: Dict[str, Any]) -> Dict[str, Any]:
        """Fallback coordination with partial results"""
        
        # Use available agent result
        available_result = list(agent_results.values())[0]
        available_result["coordination_method"] = "partial_fallback"
        
        return available_result
    
    async def _emergency_fallback(self, opportunities: List[USDCOpportunity],
                                user_profile: UserProfile) -> Dict[str, Any]:
        """Emergency fallback when all agents fail"""
        
        print("🚨 Emergency fallback activated")
        
        # Simple fallback: equal allocation to top 3 opportunities by APY
        sorted_opportunities = sorted(opportunities, key=lambda x: x.apy, reverse=True)
        top_3 = sorted_opportunities[:3]
        
        allocation = {}
        for opp in top_3:
            key = f"{opp.protocol}_{opp.chain}"
            allocation[key] = 1.0 / 3
        
        expected_apy = sum(opp.apy for opp in top_3) / 3
        
        return {
            "allocation": allocation,
            "expected_apy": expected_apy,
            "confidence": 0.6,
            "coordination_method": "emergency_fallback",
            "reasoning": "Emergency fallback: equal allocation to top 3 APY opportunities"
        }
    
    def _print_coordination_summary(self, result: Dict[str, Any]):
        """Print coordination summary"""
        
        print(f"\n📋 COORDINATION SUMMARY:")
        print(f"   🎯 Final APY: {result['final_strategy']['expected_apy']:.2f}%")
        print(f"   🤖 Agents Used: {result['total_agents']}")
        print(f"   🎲 Consensus: {result['consensus_score']:.1%}")
        print(f"   💪 Confidence: {result['system_confidence']:.1%}")
        print(f"   🔧 Method: {result['final_strategy'].get('coordination_method', 'unknown')}")
        
        # Print allocation
        allocation = result['final_strategy']['allocation']
        print(f"\n💼 FINAL ALLOCATION:")
        for position, weight in allocation.items():
            protocol, chain = position.split('_', 1)
            print(f"   {weight:.1%} → {protocol.upper()} on {chain.upper()}")

    async def optimize_portfolio_for_user(self, user_address: str, current_portfolio: Any,
                                         new_deposit: float, strategy: str,
                                         target_chains: List[str]) -> Dict[str, Any]:
        """
        Optimize portfolio for individual user with smart wallet constraints

        Args:
            user_address: User's address
            current_portfolio: Current portfolio state
            new_deposit: New deposit amount in USDC
            strategy: Investment strategy (conservative, balanced, aggressive)
            target_chains: List of chains to consider

        Returns:
            Dict containing optimization actions and expected results
        """
        try:
            print(f"🎯 Optimizing portfolio for user {user_address[:6]}...{user_address[-4:]}")
            print(f"   💰 New deposit: ${new_deposit:,.2f} USDC")
            print(f"   📊 Strategy: {strategy}")
            print(f"   🔗 Target chains: {target_chains}")

            # Create user profile based on strategy
            user_profile = self._create_user_profile(strategy, new_deposit)

            # Get current opportunities from target chains only
            opportunities = await self._get_opportunities_for_chains(target_chains)

            # Run multi-agent optimization
            optimization_result = await self.optimize_portfolio(opportunities, user_profile)

            # Convert result to actionable smart wallet operations
            actions = self._convert_to_smart_wallet_actions(
                optimization_result,
                current_portfolio,
                new_deposit,
                target_chains
            )

            return {
                "success": True,
                "actions": actions,
                "expected_apy": optimization_result['final_strategy']['expected_apy'],
                "confidence": optimization_result['system_confidence'],
                "total_gas_cost": self._estimate_gas_costs(actions),
                "reasoning": optimization_result['final_strategy'].get('reasoning', ''),
                "user_address": user_address
            }

        except Exception as e:
            print(f"❌ Error optimizing portfolio for user: {e}")
            return {
                "success": False,
                "error": str(e),
                "actions": [],
                "user_address": user_address
            }

    def _create_user_profile(self, strategy: str, deposit_amount: float) -> UserProfile:
        """Create user profile based on strategy"""

        risk_profiles = {
            "conservative": {
                "risk_tolerance": "conservative",
                "min_apy_requirement": 3.0,
            },
            "balanced": {
                "risk_tolerance": "moderate",
                "min_apy_requirement": 5.0,
            },
            "aggressive": {
                "risk_tolerance": "aggressive",
                "min_apy_requirement": 8.0,
            }
        }

        profile_config = risk_profiles.get(strategy, risk_profiles["balanced"])

        return UserProfile(
            amount=deposit_amount,
            risk_tolerance=profile_config["risk_tolerance"],
            time_horizon="6_months",
            preferred_chains=["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"],
            min_apy=profile_config["min_apy_requirement"]
        )

    async def _get_opportunities_for_chains(self, target_chains: List[str]) -> List[USDCOpportunity]:
        """Get opportunities for specific chains"""
        # Placeholder - in production this would fetch real opportunities
        # For now, return mock opportunities for the target chains
        opportunities = []

        chain_protocols = {
            "ethereum_sepolia": [
                ("aave_v3", 5.2, 15), ("compound_v3", 4.8, 18)
            ],
            "base_sepolia": [
                ("moonwell", 7.5, 25), ("uniswap_v3", 6.2, 30)
            ],
            "arbitrum_sepolia": [
                ("radiant", 8.5, 35), ("camelot", 9.2, 40)
            ]
        }

        for chain in target_chains:
            if chain in chain_protocols:
                for protocol, apy, risk_score in chain_protocols[chain]:
                    opportunities.append(USDCOpportunity(
                        protocol=protocol,
                        chain=chain,
                        pool_id=f"{protocol}_{chain}_pool",
                        pool_name=f"{protocol.title()} USDC Pool",
                        apy=apy,
                        tvl_usd=1000000.0,  # $1M TVL
                        usdc_liquidity=500000.0,  # $500K liquidity
                        risk_score=risk_score,
                        category="lending",
                        last_updated=datetime.now()
                    ))

        return opportunities

    def _convert_to_smart_wallet_actions(self, optimization_result: Dict,
                                       current_portfolio: Any, new_deposit: float,
                                       target_chains: List[str]) -> List[Dict]:
        """Convert optimization result to smart wallet actions"""
        actions = []

        allocation = optimization_result['final_strategy']['allocation']

        for position, weight in allocation.items():
            protocol, chain = position.split('_', 1)
            amount = new_deposit * weight

            if amount > 10:  # Only allocate if amount > $10
                actions.append({
                    "type": "allocate",
                    "protocol": protocol,
                    "chain": chain,
                    "amount": amount,
                    "weight": weight
                })

        # Add cross-chain transfers if needed
        # For now, assume funds start on ethereum_sepolia
        source_chain = "ethereum_sepolia"

        for action in actions:
            if action["chain"] != source_chain and action["amount"] > 50:
                # Add CCTP transfer action
                transfer_action = {
                    "type": "transfer",
                    "source_chain": source_chain,
                    "destination_chain": action["chain"],
                    "amount": action["amount"]
                }

                # Insert transfer before allocation
                transfer_index = actions.index(action)
                actions.insert(transfer_index, transfer_action)

        return actions

    def _estimate_gas_costs(self, actions: List[Dict]) -> float:
        """Estimate total gas costs for actions"""
        gas_estimates = {
            "allocate": 0.50,      # $0.50 per allocation
            "transfer": 5.00,      # $5.00 per CCTP transfer
            "rebalance": 1.00      # $1.00 per rebalance
        }

        total_cost = 0
        for action in actions:
            action_type = action.get("type", "allocate")
            total_cost += gas_estimates.get(action_type, 0.50)

        return total_cost

# Test the multi-agent system
async def test_multi_agent_system():
    """Test function for multi-agent coordination"""
    
    from src.data.aggregator import USDCDataAggregator
    from src.data.models import UserProfile
    
    print("🧪 TESTING MULTI-AGENT AI SYSTEM")
    print("=" * 40)
    
    # Get test data
    aggregator = USDCDataAggregator()
    opportunities = await aggregator.fetch_all_opportunities()
    
    # Create test user profile
    user_profile = UserProfile(
        amount=50000,
        risk_tolerance="moderate",
        time_horizon="6_months",
        preferred_chains=["ethereum", "base", "arbitrum"],
        min_apy=3.0
    )
    
    # Initialize multi-agent system
    orchestrator = MultiAgentOrchestrator()
    
    # Run coordination
    result = await orchestrator.coordinate_optimization(opportunities, user_profile)
    
    print(f"\n🏆 MULTI-AGENT TEST COMPLETE")
    print(f"Strategy APY: {result['final_strategy']['expected_apy']:.2f}%")
    print(f"System Confidence: {result['system_confidence']:.1%}")

if __name__ == "__main__":
    asyncio.run(test_multi_agent_system())
