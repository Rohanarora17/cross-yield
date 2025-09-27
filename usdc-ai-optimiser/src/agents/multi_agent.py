# src/agents/multi_agent.py
"""Multi-Agent Orchestrator - coordinates all agents"""

import asyncio
import sys
import os
from typing import Dict, List, Any, Optional

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.agents.yield_agent import YieldMaximizerAgent
from src.agents.risk_agent import RiskAssessmentAgent
from src.agents.coordinator_agent import LLMCoordinatorAgent
from src.data.models import USDCOpportunity, UserProfile
from src.config import config

class MultiAgentOrchestrator:
    """Orchestrates multiple AI agents for yield optimization"""
    
    def __init__(self, claude_api_key: Optional[str] = None):
        print("🚀 Initializing Multi-Agent AI System...")
        
        # Load API key from config if not provided
        if claude_api_key is None:
            claude_api_key = config.CLAUDE_API_KEY
        
        # Initialize the three core agents
        self.yield_agent = YieldMaximizerAgent()
        self.risk_agent = RiskAssessmentAgent()
        self.coordinator_agent = LLMCoordinatorAgent(claude_api_key)
        
        # System configuration
        self.agents_active = True
        self.consensus_threshold = 0.8
        
        print("✅ Multi-Agent system initialized successfully")
        print(f"   🎯 Yield Maximizer Agent: Ready")
        print(f"   ⚠️ Risk Assessment Agent: Ready") 
        print(f"   🧠 LLM Coordinator Agent: {'Claude AI' if self.coordinator_agent.llm_available else 'Fallback Logic'}")
    
    async def coordinate_optimization(self, opportunities: List[USDCOpportunity], 
                                    user_profile: UserProfile) -> Dict[str, Any]:
        """Main coordination method - runs all agents and synthesizes results"""
        
        print("\n🤖 MULTI-AGENT COORDINATION STARTING...")
        print("=" * 50)
        
        try:
            # Phase 1: Run agents in parallel
            print("📊 Phase 1: Running AI agents in parallel...")
            agent_results = await self._run_agents_parallel(opportunities, user_profile)
            
            # Phase 2: Agent coordination and debate
            print("🤝 Phase 2: Agent coordination and synthesis...")
            final_strategy = await self._coordinate_agents(agent_results, opportunities, user_profile)
            
            # Phase 3: Consensus validation
            print("✅ Phase 3: Validating consensus...")
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
            
            print("🏆 MULTI-AGENT COORDINATION COMPLETE")
            self._print_coordination_summary(complete_result)
            
            return complete_result
            
        except Exception as e:
            print(f"❌ Multi-agent coordination failed: {e}")
            return await self._emergency_fallback(opportunities, user_profile)
    
    async def _run_agents_parallel(self, opportunities: List[USDCOpportunity], 
                                 user_profile: UserProfile) -> Dict[str, Any]:
        """Run all agents in parallel for efficiency"""
        
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
            print(f"   ✅ Yield Agent: {results[0]['expected_apy']:.2f}% APY")
        else:
            print(f"   ❌ Yield Agent failed: {results[0]}")
            
        if isinstance(results[1], dict):
            agent_results["risk_assessor"] = results[1]
            print(f"   ✅ Risk Agent: {results[1]['expected_apy']:.2f}% APY")
        else:
            print(f"   ❌ Risk Agent failed: {results[1]}")
        
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
