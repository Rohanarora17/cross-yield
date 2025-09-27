# src/agents/coordinator_agent.py
"""LLM Coordinator Agent - uses Claude AI for strategic coordination"""

import asyncio
from typing import Dict, List, Any, Optional
from src.agents.base_agent import BaseAgent
from src.data.models import USDCOpportunity, UserProfile

# Optional Claude import (graceful fallback if not available)
try:
    import anthropic
    CLAUDE_AVAILABLE = True
except ImportError:
    CLAUDE_AVAILABLE = False
    print("⚠️ Claude not available, using fallback coordination")

class LLMCoordinatorAgent(BaseAgent):
    """Agent that uses LLM reasoning for strategic coordination"""
    
    def __init__(self, claude_api_key: Optional[str] = None):
        super().__init__("LLMCoordinator")
        self.confidence = 0.92
        
        # Initialize Claude if available and API key provided
        if CLAUDE_AVAILABLE and claude_api_key:
            self.claude = anthropic.Anthropic(api_key=claude_api_key)
            self.llm_available = True
        else:
            self.claude = None
            self.llm_available = False
            
    async def analyze(self, opportunities: List[USDCOpportunity], 
                     user_profile: UserProfile) -> Dict[str, Any]:
        """Coordinate strategy using LLM reasoning"""
        
        print(f"🧠 {self.name}: Coordinating strategy using {'Claude AI' if self.llm_available else 'fallback logic'}...")
        
        if self.llm_available:
            return await self._llm_coordination(opportunities, user_profile)
        else:
            return await self._fallback_coordination(opportunities, user_profile)
    
    async def coordinate_agent_strategies(self, yield_result: Dict, risk_result: Dict, 
                                        opportunities: List[USDCOpportunity],
                                        user_profile: UserProfile) -> Dict[str, Any]:
        """Coordinate between yield and risk agent recommendations"""
        
        print(f"🤝 {self.name}: Coordinating yield and risk strategies...")
        
        if self.llm_available:
            return await self._llm_agent_coordination(yield_result, risk_result, user_profile)
        else:
            return await self._fallback_agent_coordination(yield_result, risk_result)
    
    async def _llm_coordination(self, opportunities: List[USDCOpportunity], 
                              user_profile: UserProfile) -> Dict[str, Any]:
        """Use Claude AI for strategic coordination"""
        
        # Prepare data for LLM
        top_opportunities = sorted(opportunities, key=lambda x: x.apy, reverse=True)[:10]
        
        prompt = self._build_coordination_prompt(top_opportunities, user_profile)
        
        try:
            response = await self._call_claude(prompt)
            result = await self._parse_llm_response(response, top_opportunities)
            
            result.update({
                "agent_name": self.name,
                "strategy_type": "llm_coordination",
                "confidence": self.confidence,
                "llm_powered": True
            })
            
            return result
            
        except Exception as e:
            print(f"⚠️ LLM coordination failed: {e}, using fallback")
            return await self._fallback_coordination(opportunities, user_profile)
    
    async def _llm_agent_coordination(self, yield_result: Dict, risk_result: Dict, 
                                    user_profile: UserProfile) -> Dict[str, Any]:
        """Use Claude AI to coordinate between agents"""
        
        prompt = f"""
        I need to coordinate between two AI agent recommendations for USDC yield optimization:

        YIELD MAXIMIZER AGENT:
        - Strategy: {yield_result['strategy_type']}
        - Expected APY: {yield_result['expected_apy']:.2f}%
        - Top recommendation: {yield_result.get('reasoning', '')}
        - Allocation: {yield_result['allocation']}

        RISK ASSESSMENT AGENT:
        - Strategy: {risk_result['strategy_type']}
        - Expected APY: {risk_result['expected_apy']:.2f}%
        - Risk focus: {risk_result.get('reasoning', '')}
        - Allocation: {risk_result['allocation']}

        USER PROFILE:
        - Amount: ${user_profile.amount:,.0f}
        - Risk tolerance: {user_profile.risk_tolerance}
        - Time horizon: {user_profile.time_horizon}

        Please provide a coordinated strategy that balances yield optimization with risk management:

        1. Optimal allocation percentages
        2. Expected APY for the combined strategy
        3. Risk assessment of the combined approach
        4. Reasoning for the coordination decisions
        5. Any cross-chain advantages identified

        Focus on creating a strategy that maximizes risk-adjusted returns while respecting the user's risk tolerance.
        """
        
        try:
            response = await self._call_claude(prompt)
            return await self._parse_agent_coordination_response(response, yield_result, risk_result)
            
        except Exception as e:
            print(f"⚠️ LLM agent coordination failed: {e}, using fallback")
            return await self._fallback_agent_coordination(yield_result, risk_result)
    
    def _build_coordination_prompt(self, opportunities: List[USDCOpportunity], 
                                 user_profile: UserProfile) -> str:
        """Build prompt for Claude AI coordination"""
        
        opp_data = []
        for opp in opportunities:
            opp_data.append({
                "protocol": opp.protocol,
                "chain": opp.chain,
                "apy": round(opp.apy, 2),
                "tvl_usd": opp.tvl_usd,
                "risk_score": round(opp.risk_score, 2),
                "category": opp.category
            })
        
        prompt = f"""
        Analyze these USDC yield opportunities and create an optimal allocation strategy:

        USER PROFILE:
        - Amount: ${user_profile.amount:,.0f}
        - Risk Tolerance: {user_profile.risk_tolerance}
        - Time Horizon: {user_profile.time_horizon}
        - Preferred Chains: {', '.join(user_profile.preferred_chains)}

        TOP OPPORTUNITIES:
        {opp_data}

        Please provide:
        1. Recommended allocation strategy (specific percentages)
        2. Expected APY for the strategy
        3. Risk analysis and mitigation
        4. Cross-chain diversification benefits
        5. Reasoning for each allocation decision

        Focus on USDC-specific considerations and cross-chain efficiency.
        Ensure total allocation equals 100%.
        """
        
        return prompt
    
    async def _call_claude(self, prompt: str) -> str:
        """Call Claude API with error handling"""
        
        if not self.claude:
            raise Exception("Claude client not initialized")
        
        response = await asyncio.to_thread(
            self.claude.messages.create,
            model="claude-3-5-sonnet-20241022",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )
        
        return response.content[0].text if response.content else ""
    
    async def _parse_llm_response(self, response: str, 
                                opportunities: List[USDCOpportunity]) -> Dict[str, Any]:
        """Parse Claude response into structured recommendation"""
        
        # Simple parsing - in production would use more sophisticated parsing
        # For now, create a reasonable allocation based on top opportunities
        
        allocation = {}
        top_5 = opportunities[:5]
        
        # Equal weight allocation for demo
        for i, opp in enumerate(top_5):
            weight = 0.2  # 20% each for 5 positions
            allocation[f"{opp.protocol}_{opp.chain}"] = weight
        
        expected_apy = sum(opp.apy * 0.2 for opp in top_5)
        
        return {
            "allocation": allocation,
            "expected_apy": expected_apy,
            "reasoning": f"LLM Analysis: {response[:200]}..." if len(response) > 200 else response,
            "llm_full_response": response,
            "coordination_method": "claude_ai"
        }
    
    async def _parse_agent_coordination_response(self, response: str, 
                                               yield_result: Dict, 
                                               risk_result: Dict) -> Dict[str, Any]:
        """Parse Claude agent coordination response"""
        
        # Hybrid allocation: 60% yield-focused, 40% risk-focused
        coordinated_allocation = {}
        
        for position, yield_weight in yield_result["allocation"].items():
            risk_weight = risk_result["allocation"].get(position, 0)
            
            # Weighted combination
            combined_weight = (yield_weight * 0.6 + risk_weight * 0.4)
            if combined_weight > 0.01:  # Only include positions > 1%
                coordinated_allocation[position] = combined_weight
        
        # Add positions that are only in risk allocation
        for position, risk_weight in risk_result["allocation"].items():
            if position not in coordinated_allocation and risk_weight > 0.01:
                coordinated_allocation[position] = risk_weight * 0.4
        
        # Normalize to 100%
        total_weight = sum(coordinated_allocation.values())
        if total_weight > 0:
            coordinated_allocation = {
                k: v / total_weight 
                for k, v in coordinated_allocation.items()
            }
        
        # Calculate expected APY
        expected_apy = (yield_result["expected_apy"] * 0.6 + 
                       risk_result["expected_apy"] * 0.4)
        
        return {
            "agent_name": self.name,
            "strategy_type": "agent_coordination",
            "allocation": coordinated_allocation,
            "expected_apy": expected_apy,
            "confidence": self.confidence,
            "coordination_method": "llm_synthesis",
            "yield_weight": 0.6,
            "risk_weight": 0.4,
            "llm_reasoning": response,
            "reasoning": f"Coordinated strategy balancing yield ({yield_result['expected_apy']:.2f}%) and risk management"
        }
    
    async def _fallback_coordination(self, opportunities: List[USDCOpportunity], 
                                   user_profile: UserProfile) -> Dict[str, Any]:
        """Fallback coordination without LLM"""
        
        # Filter and select top opportunities
        filtered_opportunities = self.filter_by_risk_tolerance(opportunities, user_profile.risk_tolerance)
        chain_filtered = self.filter_by_chains(filtered_opportunities, user_profile.preferred_chains)
        
        # Sort by risk-adjusted return
        sorted_opportunities = sorted(
            chain_filtered, 
            key=lambda x: self.calculate_risk_adjusted_return(x), 
            reverse=True
        )
        
        # Take top 4 opportunities for diversification
        top_opportunities = sorted_opportunities[:4]
        
        # Create balanced allocation
        allocation = {}
        weight = 1.0 / len(top_opportunities) if top_opportunities else 0
        
        for opp in top_opportunities:
            key = f"{opp.protocol}_{opp.chain}"
            allocation[key] = weight
        
        expected_apy = sum(opp.apy * weight for opp in top_opportunities)
        
        return {
            "allocation": allocation,
            "expected_apy": expected_apy,
            "reasoning": f"Balanced allocation across {len(top_opportunities)} top risk-adjusted opportunities",
            "coordination_method": "fallback_logic",
            "diversification": len(set(opp.chain for opp in top_opportunities))
        }
    
    async def _fallback_agent_coordination(self, yield_result: Dict, 
                                         risk_result: Dict) -> Dict[str, Any]:
        """Fallback coordination between agents without LLM"""
        
        # Simple weighted average: 70% yield, 30% risk
        coordinated_allocation = {}
        
        # Combine allocations with weights
        all_positions = set(yield_result["allocation"].keys()) | set(risk_result["allocation"].keys())
        
        for position in all_positions:
            yield_weight = yield_result["allocation"].get(position, 0)
            risk_weight = risk_result["allocation"].get(position, 0)
            
            combined_weight = yield_weight * 0.7 + risk_weight * 0.3
            if combined_weight > 0.01:  # Only include meaningful positions
                coordinated_allocation[position] = combined_weight
        
        # Normalize
        total_weight = sum(coordinated_allocation.values())
        if total_weight > 0:
            coordinated_allocation = {
                k: v / total_weight 
                for k, v in coordinated_allocation.items()
            }
        
        expected_apy = yield_result["expected_apy"] * 0.7 + risk_result["expected_apy"] * 0.3
        
        return {
            "agent_name": self.name,
            "strategy_type": "fallback_coordination",
            "allocation": coordinated_allocation,
            "expected_apy": expected_apy,
            "confidence": 0.8,
            "coordination_method": "weighted_average",
            "yield_weight": 0.7,
            "risk_weight": 0.3,
            "reasoning": "Coordinated strategy using weighted average of agent recommendations"
        }
