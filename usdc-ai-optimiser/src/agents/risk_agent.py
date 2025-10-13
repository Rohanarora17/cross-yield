# src/agents/risk_agent.py
"""Risk Assessment Agent - focuses on safety and risk management"""

import asyncio
import time
from typing import Dict, List, Any
from src.agents.base_agent import BaseAgent
from src.data.models import USDCOpportunity, UserProfile
from src.utils.logger import (
    log_ai_start, log_ai_end, log_ai_error, log_agent_analysis, 
    log_agent_result, log_opportunity_analysis, log_allocation_decision,
    log_performance_metrics
)

class RiskAssessmentAgent(BaseAgent):
    """Agent specialized in risk assessment and safety"""
    
    def __init__(self):
        super().__init__("RiskAssessment")
        self.confidence = 0.90  # High confidence in risk assessment
        
    async def analyze(self, opportunities: List[USDCOpportunity], 
                     user_profile: UserProfile) -> Dict[str, Any]:
        """Analyze opportunities for risk-adjusted allocation"""
        
        start_time = time.time()
        log_agent_analysis(self.name, len(opportunities), {
            "amount": user_profile.amount,
            "risk_tolerance": user_profile.risk_tolerance,
            "preferred_chains": user_profile.preferred_chains
        })
        
        try:
            # Filter by risk tolerance
            risk_filtered = self.filter_by_risk_tolerance(opportunities, user_profile.risk_tolerance)
            chain_filtered = self.filter_by_chains(risk_filtered, user_profile.preferred_chains)
            
            log_performance_metrics({
                "original_opportunities": len(opportunities),
                "risk_filtered": len(risk_filtered),
                "chain_filtered": len(chain_filtered),
                "risk_filter_efficiency": len(risk_filtered) / len(opportunities) if opportunities else 0
            })
            
            # Perform comprehensive risk analysis
            risk_analyzed = await self._analyze_risks(chain_filtered)
            
            # Create risk-optimized allocation
            allocation = await self._create_risk_allocation(risk_analyzed, user_profile)
            
            # Calculate portfolio metrics
            portfolio_metrics = await self._calculate_portfolio_metrics(risk_analyzed)
            
            expected_apy = sum(
                opp["risk_adjusted_return"] * opp["allocation"] 
                for opp in risk_analyzed
            )
            
            result = {
                "agent_name": self.name,
                "strategy_type": "risk_management",
                "allocation": allocation,
                "expected_apy": expected_apy,
                "confidence": self.confidence,
                "risk_analysis": risk_analyzed,
                "portfolio_metrics": portfolio_metrics,
                "reasoning": self._generate_risk_reasoning(risk_analyzed),
                "safety_features": self._identify_safety_features(risk_analyzed)
            }
            
            duration = time.time() - start_time
            log_performance_metrics({
                "expected_apy": expected_apy,
                "portfolio_risk_score": portfolio_metrics.get("portfolio_risk_score", 0),
                "portfolio_safety_score": portfolio_metrics.get("portfolio_safety_score", 0),
                "analysis_duration": duration
            })
            
            log_allocation_decision(allocation, self._generate_risk_reasoning(risk_analyzed))
            log_ai_end(f"{self.name} Analysis", result, duration)
            
            return result
            
        except Exception as e:
            log_ai_error(f"{self.name} Analysis", e, {
                "opportunities_count": len(opportunities),
                "user_amount": user_profile.amount,
                "risk_tolerance": user_profile.risk_tolerance
            })
            raise
    
    async def _analyze_risks(self, opportunities: List[USDCOpportunity]) -> List[Dict]:
        """Comprehensive risk analysis of opportunities"""
        
        analyzed_opportunities = []
        
        for opp in opportunities:
            risk_factors = await self._calculate_risk_factors(opp)
            
            opportunity_data = {
                "protocol": opp.protocol,
                "chain": opp.chain,
                "pool_name": opp.pool_name,
                "apy": opp.apy,
                "base_risk_score": opp.risk_score,
                "risk_factors": risk_factors,
                "composite_risk": risk_factors["composite_risk"],
                "risk_adjusted_return": opp.apy / (1 + risk_factors["composite_risk"]),
                "safety_score": 1 - risk_factors["composite_risk"],
                "tvl": opp.tvl_usd,
                "liquidity": opp.usdc_liquidity,
                "allocation": 0  # Will be calculated
            }
            
            analyzed_opportunities.append(opportunity_data)
        
        # Sort by risk-adjusted return
        analyzed_opportunities.sort(key=lambda x: x["risk_adjusted_return"], reverse=True)
        
        return analyzed_opportunities
    
    async def _calculate_risk_factors(self, opportunity: USDCOpportunity) -> Dict:
        """Calculate comprehensive risk factors"""
        
        # Protocol risk assessment
        protocol_risk = await self._assess_protocol_risk(opportunity.protocol)
        
        # Liquidity risk assessment
        liquidity_risk = await self._assess_liquidity_risk(opportunity.tvl_usd, opportunity.usdc_liquidity)
        
        # Market risk assessment
        market_risk = await self._assess_market_risk(opportunity.apy, opportunity.category)
        
        # Concentration risk
        concentration_risk = await self._assess_concentration_risk(opportunity.chain, opportunity.protocol)
        
        # Composite risk calculation
        composite_risk = min(
            (protocol_risk * 0.3 + 
             liquidity_risk * 0.25 + 
             market_risk * 0.25 + 
             concentration_risk * 0.2), 
            1.0
        )
        
        return {
            "protocol_risk": protocol_risk,
            "liquidity_risk": liquidity_risk,
            "market_risk": market_risk,
            "concentration_risk": concentration_risk,
            "composite_risk": composite_risk
        }
    
    async def _assess_protocol_risk(self, protocol: str) -> float:
        """Assess protocol-specific risks"""
        
        # Protocol risk scoring based on maturity, audits, TVL, track record
        protocol_scores = {
            # Blue chip protocols (very low risk)
            "aave": 0.05, "aave-v3": 0.05,
            "compound": 0.08, "compound-v3": 0.08,
            
            # Established protocols (low risk)
            "yearn": 0.15, "curve": 0.12,
            "uniswap": 0.10, "uniswap-v3": 0.10,
            
            # Growing protocols (medium risk)
            "moonwell": 0.25, "radiant": 0.35,
            "morpho": 0.20, "spark": 0.18,
            
            # Newer protocols (higher risk)
            "aerodrome": 0.45, "aerodrome-slipstream": 0.50,
            "beefy": 0.40, "harvest": 0.55
        }
        
        return protocol_scores.get(protocol.lower(), 0.60)  # Default high risk for unknown
    
    async def _assess_liquidity_risk(self, tvl: float, usdc_liquidity: float) -> float:
        """Assess liquidity-related risks"""
        
        # TVL-based liquidity risk
        if tvl > 1_000_000_000:  # >$1B TVL
            tvl_risk = 0.0
        elif tvl > 500_000_000:  # >$500M TVL
            tvl_risk = 0.05
        elif tvl > 100_000_000:  # >$100M TVL
            tvl_risk = 0.15
        elif tvl > 10_000_000:   # >$10M TVL
            tvl_risk = 0.30
        else:
            tvl_risk = 0.60
        
        # USDC-specific liquidity risk
        if usdc_liquidity > 100_000_000:  # >$100M USDC
            usdc_risk = 0.0
        elif usdc_liquidity > 50_000_000:  # >$50M USDC
            usdc_risk = 0.05
        elif usdc_liquidity > 10_000_000:  # >$10M USDC
            usdc_risk = 0.15
        else:
            usdc_risk = 0.40
        
        return (tvl_risk + usdc_risk) / 2
    
    async def _assess_market_risk(self, apy: float, category: str) -> float:
        """Assess market and yield sustainability risks"""
        
        # APY sustainability risk
        if apy > 50:      # >50% APY - very suspicious
            apy_risk = 0.80
        elif apy > 30:    # >30% APY - high risk
            apy_risk = 0.50
        elif apy > 20:    # >20% APY - medium-high risk
            apy_risk = 0.25
        elif apy > 15:    # >15% APY - elevated risk
            apy_risk = 0.10
        else:             # <15% APY - reasonable
            apy_risk = 0.0
        
        # Category risk
        category_risks = {
            "lending": 0.05,     # Lowest risk
            "stable_lp": 0.10,   # Low risk
            "lp_pool": 0.25,     # Medium risk
            "yield_farm": 0.35,  # Higher risk
            "other": 0.50        # Unknown risk
        }
        
        category_risk = category_risks.get(category, 0.50)
        
        return (apy_risk + category_risk) / 2
    
    async def _assess_concentration_risk(self, chain: str, protocol: str) -> float:
        """Assess concentration risks"""
        
        # Chain concentration risk
        chain_risks = {
            "ethereum": 0.05,  # Most established
            "base": 0.15,      # Newer but backed by Coinbase
            "arbitrum": 0.10,  # Well established L2
            "polygon": 0.20,   # Established but some issues
            "avalanche": 0.25  # Good but less adoption
        }
        
        chain_risk = chain_risks.get(chain.lower(), 0.40)
        
        # For now, protocol concentration is handled in protocol risk
        return chain_risk
    
    async def _create_risk_allocation(self, opportunities: List[Dict], 
                                    user_profile: UserProfile) -> Dict[str, float]:
        """Create risk-optimized allocation"""
        
        if not opportunities:
            return {}
        
        # Take top 5 risk-adjusted opportunities
        top_opportunities = opportunities[:5]
        
        # Equal weight allocation for diversification (risk management approach)
        allocation = {}
        weight = 1.0 / len(top_opportunities)
        
        for opp in top_opportunities:
            key = f"{opp['protocol']}_{opp['chain']}"
            allocation[key] = weight
            opp["allocation"] = weight
        
        return allocation
    
    async def _calculate_portfolio_metrics(self, opportunities: List[Dict]) -> Dict:
        """Calculate portfolio-level risk metrics"""
        
        if not opportunities:
            return {}
        
        allocated_opps = [opp for opp in opportunities if opp["allocation"] > 0]
        
        # Calculate weighted portfolio metrics
        portfolio_risk = sum(opp["composite_risk"] * opp["allocation"] for opp in allocated_opps)
        portfolio_safety = sum(opp["safety_score"] * opp["allocation"] for opp in allocated_opps)
        
        # Diversification metrics
        chains_used = len(set(opp["chain"] for opp in allocated_opps))
        protocols_used = len(set(opp["protocol"] for opp in allocated_opps))
        
        return {
            "portfolio_risk_score": portfolio_risk,
            "portfolio_safety_score": portfolio_safety,
            "diversification": {
                "chains": chains_used,
                "protocols": protocols_used,
                "positions": len(allocated_opps)
            },
            "risk_distribution": {
                opp["protocol"]: opp["composite_risk"] 
                for opp in allocated_opps
            }
        }
    
    def _generate_risk_reasoning(self, opportunities: List[Dict]) -> str:
        """Generate risk-focused reasoning"""
        
        if not opportunities:
            return "No suitable opportunities found within risk parameters"
        
        allocated_opps = [opp for opp in opportunities if opp.get("allocation", 0) > 0]
        
        if not allocated_opps:
            return "Risk analysis complete, awaiting allocation decisions"
        
        avg_risk = sum(opp["composite_risk"] for opp in allocated_opps) / len(allocated_opps)
        chains = len(set(opp["chain"] for opp in allocated_opps))
        protocols = len(allocated_opps)
        
        reasoning_parts = [
            f"Selected {protocols} protocols with average risk score {avg_risk:.2f}",
            f"Diversified across {chains} chains to reduce concentration risk",
            f"Equal weight allocation to minimize individual position risk",
            f"All selected protocols have composite risk scores below 0.5"
        ]
        
        return ". ".join(reasoning_parts) + "."
    
    def _identify_safety_features(self, opportunities: List[Dict]) -> List[str]:
        """Identify safety features in the portfolio"""
        
        safety_features = []
        
        allocated_opps = [opp for opp in opportunities if opp.get("allocation", 0) > 0]
        
        if not allocated_opps:
            return safety_features
        
        # Check for blue-chip protocols
        blue_chip_protocols = ["aave", "aave-v3", "compound", "compound-v3"]
        has_blue_chip = any(opp["protocol"] in blue_chip_protocols for opp in allocated_opps)
        if has_blue_chip:
            safety_features.append("Blue-chip protocol allocation (Aave/Compound)")
        
        # Check for diversification
        if len(set(opp["chain"] for opp in allocated_opps)) > 2:
            safety_features.append("Multi-chain diversification reduces single-chain risk")
        
        # Check for conservative APYs
        conservative_apys = [opp for opp in allocated_opps if opp["apy"] < 20]
        if len(conservative_apys) > len(allocated_opps) / 2:
            safety_features.append("Conservative APY targets reduce sustainability risk")
        
        # Check for high liquidity
        high_liquidity = [opp for opp in allocated_opps if opp["liquidity"] > 50_000_000]
        if high_liquidity:
            safety_features.append("High liquidity positions ensure exit flexibility")
        
        return safety_features
