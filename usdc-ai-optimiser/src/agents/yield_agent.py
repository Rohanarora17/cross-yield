# src/agents/yield_agent.py
"""Yield Maximizer Agent - focuses on finding highest yields"""

import asyncio
import numpy as np
from typing import Dict, List, Any
from src.agents.base_agent import BaseAgent
from src.data.models import USDCOpportunity, UserProfile

class YieldMaximizerAgent(BaseAgent):
    """Agent specialized in finding maximum yield opportunities"""
    
    def __init__(self):
        super().__init__("YieldMaximizer")
        self.confidence = 0.85
        
    async def analyze(self, opportunities: List[USDCOpportunity], 
                     user_profile: UserProfile) -> Dict[str, Any]:
        """Analyze opportunities for maximum yield potential"""
        
        print(f"🎯 {self.name}: Analyzing {len(opportunities)} opportunities for maximum yield...")
        
        # Filter opportunities by user preferences
        filtered_opportunities = self.filter_by_chains(
            opportunities, user_profile.preferred_chains
        )
        
        # Focus on highest yield opportunities
        yield_focused = await self._find_yield_opportunities(filtered_opportunities, user_profile)
        
        # Create yield-maximizing allocation
        allocation = await self._create_yield_allocation(yield_focused, user_profile)
        
        # Calculate expected performance
        expected_apy = sum(
            opp["apy"] * opp["allocation"] 
            for opp in yield_focused
        )
        
        return {
            "agent_name": self.name,
            "strategy_type": "yield_maximization",
            "allocation": allocation,
            "expected_apy": expected_apy,
            "confidence": self.confidence,
            "top_opportunities": yield_focused,
            "reasoning": self._generate_reasoning(yield_focused),
            "cross_chain_advantage": self._analyze_cross_chain_advantage(yield_focused)
        }
    
    async def _find_yield_opportunities(self, opportunities: List[USDCOpportunity], 
                                      user_profile: UserProfile) -> List[Dict]:
        """Find top yield opportunities with analysis"""
        
        # Sort by yield and take top performers
        sorted_opportunities = sorted(opportunities, key=lambda x: x.apy, reverse=True)
        
        top_opportunities = []
        total_weight = 0
        
        for i, opp in enumerate(sorted_opportunities[:8]):  # Top 8 opportunities
            # Calculate weight (exponential decay)
            weight = 0.5 ** i
            
            # Check if opportunity has sufficient liquidity
            min_liquidity = user_profile.amount * 3  # 3x user amount for safety
            if opp.usdc_liquidity < min_liquidity:
                continue
                
            opportunity_data = {
                "protocol": opp.protocol,
                "chain": opp.chain,
                "pool_name": opp.pool_name,
                "apy": opp.apy,
                "apy_base": opp.apy_base,
                "apy_reward": opp.apy_reward,
                "tvl": opp.tvl_usd,
                "liquidity": opp.usdc_liquidity,
                "risk_score": opp.risk_score,
                "weight": weight,
                "allocation": 0  # Will be calculated
            }
            
            top_opportunities.append(opportunity_data)
            total_weight += weight
            
            # Stop when we have enough good opportunities
            if len(top_opportunities) >= 5:
                break
        
        # Normalize weights to allocations
        for opp in top_opportunities:
            opp["allocation"] = opp["weight"] / total_weight if total_weight > 0 else 0
        
        return top_opportunities
    
    async def _create_yield_allocation(self, opportunities: List[Dict], 
                                     user_profile: UserProfile) -> Dict[str, float]:
        """Create allocation dictionary for execution"""
        
        allocation = {}
        
        for opp in opportunities:
            key = f"{opp['protocol']}_{opp['chain']}"
            allocation[key] = opp["allocation"]
        
        return allocation
    
    def _generate_reasoning(self, opportunities: List[Dict]) -> str:
        """Generate human-readable reasoning"""
        
        if not opportunities:
            return "No suitable yield opportunities found"
        
        best_opp = opportunities[0]
        reasoning_parts = [
            f"Identified {best_opp['protocol'].upper()} on {best_opp['chain'].upper()} as highest yield opportunity ({best_opp['apy']:.2f}% APY)",
            f"Diversified across {len(opportunities)} protocols to reduce concentration risk",
            f"Cross-chain allocation provides access to {len(set(opp['chain'] for opp in opportunities))} different networks"
        ]
        
        return ". ".join(reasoning_parts) + "."
    
    def _analyze_cross_chain_advantage(self, opportunities: List[Dict]) -> Dict:
        """Analyze cross-chain yield advantages"""
        
        chains_used = {}
        for opp in opportunities:
            chain = opp["chain"]
            if chain not in chains_used:
                chains_used[chain] = {
                    "best_apy": opp["apy"],
                    "allocation": opp["allocation"],
                    "protocols": [opp["protocol"]]
                }
            else:
                chains_used[chain]["allocation"] += opp["allocation"]
                chains_used[chain]["protocols"].append(opp["protocol"])
        
        return {
            "chains_utilized": len(chains_used),
            "chain_breakdown": chains_used,
            "cross_chain_diversification": len(chains_used) > 1
        }
