# src/agents/base_agent.py
"""Abstract base class for all AI agents"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any
from src.data.models import USDCOpportunity, UserProfile

class BaseAgent(ABC):
    """Abstract base class for all AI agents"""
    
    def __init__(self, name: str):
        self.name = name
        self.confidence = 0.8
        
    @abstractmethod
    async def analyze(self, opportunities: List[USDCOpportunity], 
                     user_profile: UserProfile) -> Dict[str, Any]:
        """Analyze opportunities and return recommendation"""
        pass
    
    def calculate_risk_adjusted_return(self, opportunity: USDCOpportunity) -> float:
        """Calculate risk-adjusted return for opportunity"""
        return opportunity.apy / (1 + opportunity.risk_score)
    
    def filter_by_chains(self, opportunities: List[USDCOpportunity], 
                        preferred_chains: List[str]) -> List[USDCOpportunity]:
        """Filter opportunities by preferred chains"""
        if not preferred_chains:
            return opportunities
            
        return [opp for opp in opportunities if opp.chain in preferred_chains]
    
    def filter_by_risk_tolerance(self, opportunities: List[USDCOpportunity], 
                               risk_tolerance: str) -> List[USDCOpportunity]:
        """Filter opportunities by risk tolerance"""
        
        risk_thresholds = {
            "conservative": 0.3,
            "moderate": 0.6,
            "aggressive": 1.0
        }
        
        max_risk = risk_thresholds.get(risk_tolerance, 0.6)
        return [opp for opp in opportunities if opp.risk_score <= max_risk]
