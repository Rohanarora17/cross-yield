# src/data/enhanced_aggregator.py
"""Enhanced Data Aggregator with ML, Oracles, and Advanced Analytics"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
import aiohttp

from .aggregator import USDCDataAggregator
from .historical_trainer import HistoricalDataTrainer
from ..apis.pyth_oracle import PythOracleAPI
from ..apis.oneinch_optimizer import OneInchOptimizer
from .models import USDCOpportunity

class EnhancedUSDCDataAggregator(USDCDataAggregator):
    """Enhanced data aggregator with ML, oracles, and advanced analytics"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize enhanced components
        self.historical_trainer = HistoricalDataTrainer()
        self.pyth_oracle = PythOracleAPI()
        self.oneinch_optimizer = OneInchOptimizer()
        
        # ML models
        self.yield_prediction_model = None
        self.risk_prediction_model = None
        
        # Market regime detection
        self.current_market_regime = None
        self.regime_confidence = 0.0
        
    async def fetch_enhanced_opportunities(self) -> List[USDCOpportunity]:
        """Fetch opportunities with enhanced data and ML predictions"""
        
        print("🚀 Enhanced USDC opportunity analysis starting...")
        
        # Phase 1: Get base opportunities
        base_opportunities = await self.fetch_all_opportunities()
        
        # Phase 2: Get market regime data
        market_data = await self._get_market_regime_data()
        
        # Phase 3: Get oracle data
        oracle_data = await self._get_oracle_data()
        
        # Phase 4: Enhance with ML predictions
        enhanced_opportunities = await self._enhance_with_ml_predictions(base_opportunities)
        
        # Phase 5: Add execution optimization
        execution_optimized = await self._add_execution_optimization(enhanced_opportunities)
        
        # Phase 6: Final ranking and filtering
        final_opportunities = await self._final_ranking_and_filtering(execution_optimized)
        
        print(f"✅ Enhanced analysis complete: {len(final_opportunities)} opportunities")
        
        return final_opportunities
    
    async def _get_market_regime_data(self) -> Dict:
        """Get current market regime indicators"""
        
        print("📊 Analyzing market regime...")
        
        try:
            market_indicators = await self.pyth_oracle.get_market_regime_indicators()
            
            # Determine market regime
            if market_indicators['risk_regime'] > 0.6:
                regime = "risk_on"
                confidence = market_indicators['risk_regime']
            elif market_indicators['risk_regime'] < 0.4:
                regime = "risk_off"
                confidence = 1 - market_indicators['risk_regime']
            else:
                regime = "neutral"
                confidence = 0.5
            
            self.current_market_regime = regime
            self.regime_confidence = confidence
            
            print(f"   Market Regime: {regime.upper()} (Confidence: {confidence:.1%})")
            print(f"   Volatility: {market_indicators['market_volatility']:.1%}")
            print(f"   Market Stress: {market_indicators['market_stress']:.1%}")
            
            return {
                'regime': regime,
                'confidence': confidence,
                'indicators': market_indicators,
                'timestamp': datetime.now()
            }
            
        except Exception as e:
            print(f"⚠️ Market regime analysis failed: {e}")
            return {
                'regime': 'neutral',
                'confidence': 0.5,
                'indicators': {},
                'timestamp': datetime.now()
            }
    
    async def _get_oracle_data(self) -> Dict:
        """Get real-time oracle data"""
        
        print("🔮 Fetching oracle data...")
        
        try:
            # Get price feeds
            price_feeds = await self.pyth_oracle.get_price_feeds(["USDC", "ETH", "BTC", "AVAX"])
            
            # Get yield sustainability scores for major protocols
            sustainability_scores = {}
            protocols = ['aave', 'compound', 'uniswap', 'curve', 'moonwell']
            
            for protocol in protocols:
                score = await self.pyth_oracle.get_yield_sustainability_score(protocol, 15.0)
                sustainability_scores[protocol] = score
            
            print(f"   Price feeds: {len(price_feeds)} tokens")
            print(f"   Sustainability scores: {len(sustainability_scores)} protocols")
            
            return {
                'price_feeds': price_feeds,
                'sustainability_scores': sustainability_scores,
                'timestamp': datetime.now()
            }
            
        except Exception as e:
            print(f"⚠️ Oracle data fetch failed: {e}")
            return {
                'price_feeds': {},
                'sustainability_scores': {},
                'timestamp': datetime.now()
            }
    
    async def _enhance_with_ml_predictions(self, opportunities: List[USDCOpportunity]) -> List[USDCOpportunity]:
        """Enhance opportunities with ML predictions"""
        
        print("🧠 Applying ML predictions...")
        
        enhanced_opportunities = []
        
        for opp in opportunities:
            try:
                # Prepare data for ML prediction
                opportunity_data = {
                    'apy_base': opp.apy_base,
                    'apy_reward': opp.apy_reward,
                    'tvl_usd': opp.tvl_usd,
                    'usdc_liquidity': opp.usdc_liquidity,
                    'risk_score': opp.risk_score,
                    'protocol_age_days': 365,  # Simplified
                    'chain_popularity': 0.7,   # Simplified
                    'market_volatility': 0.4,   # Simplified
                    'gas_price': 20,           # Simplified
                    'total_supply': 1_000_000_000,  # Simplified
                    'daily_volume': 10_000_000,     # Simplified
                    'unique_users_7d': 1000,       # Simplified
                    'fee_income_30d': 1_000_000    # Simplified
                }
                
                # Get ML predictions
                predictions = self.historical_trainer.predict_future_yields(opportunity_data)
                
                # Create enhanced opportunity
                enhanced_opp = USDCOpportunity(
                    protocol=opp.protocol,
                    chain=opp.chain,
                    pool_id=opp.pool_id,
                    pool_name=opp.pool_name,
                    apy=opp.apy,
                    apy_base=opp.apy_base,
                    apy_reward=opp.apy_reward,
                    tvl_usd=opp.tvl_usd,
                    usdc_liquidity=opp.usdc_liquidity,
                    risk_score=opp.risk_score,
                    category=opp.category,
                    min_deposit=opp.min_deposit,
                    oracle_confidence=opp.oracle_confidence,
                    last_updated=opp.last_updated,
                    oneinch_executable=opp.oneinch_executable,
                    cctp_accessible=opp.cctp_accessible,
                    adjusted_apy=predictions['yield_7d']  # Use 7-day prediction
                )
                
                # Add ML predictions as additional attributes
                enhanced_opp.ml_predictions = predictions
                enhanced_opp.prediction_confidence = predictions['confidence']
                
                enhanced_opportunities.append(enhanced_opp)
                
            except Exception as e:
                print(f"⚠️ ML enhancement failed for {opp.protocol}: {e}")
                enhanced_opportunities.append(opp)
        
        print(f"   Enhanced {len(enhanced_opportunities)} opportunities with ML predictions")
        
        return enhanced_opportunities
    
    async def _add_execution_optimization(self, opportunities: List[USDCOpportunity]) -> List[USDCOpportunity]:
        """Add execution optimization data"""
        
        print("💱 Adding execution optimization...")
        
        optimized_opportunities = []
        
        async with self.oneinch_optimizer as optimizer:
            for opp in opportunities:
                try:
                    # Analyze execution routes
                    route_analysis = await optimizer.find_optimal_routes([{
                        'protocol': opp.protocol,
                        'chain': opp.chain,
                        'apy': opp.apy
                    }])
                    
                    route_key = f"{opp.protocol}_{opp.chain}"
                    if route_key in route_analysis:
                        analysis = route_analysis[route_key]
                        
                        # Create optimized opportunity
                        optimized_opp = USDCOpportunity(
                            protocol=opp.protocol,
                            chain=opp.chain,
                            pool_id=opp.pool_id,
                            pool_name=opp.pool_name,
                            apy=opp.apy,
                            apy_base=opp.apy_base,
                            apy_reward=opp.apy_reward,
                            tvl_usd=opp.tvl_usd,
                            usdc_liquidity=opp.usdc_liquidity,
                            risk_score=opp.risk_score,
                            category=opp.category,
                            min_deposit=opp.min_deposit,
                            oracle_confidence=opp.oracle_confidence,
                            last_updated=opp.last_updated,
                            oneinch_executable=opp.oneinch_executable,
                            cctp_accessible=opp.cctp_accessible,
                            adjusted_apy=analysis['net_apy']  # Use net APY after gas costs
                        )
                        
                        # Add execution optimization data
                        optimized_opp.execution_analysis = analysis
                        optimized_opp.net_apy = analysis['net_apy']
                        optimized_opp.gas_efficiency = analysis['gas_efficiency']
                        
                        optimized_opportunities.append(optimized_opp)
                    else:
                        optimized_opportunities.append(opp)
                        
                except Exception as e:
                    print(f"⚠️ Execution optimization failed for {opp.protocol}: {e}")
                    optimized_opportunities.append(opp)
        
        print(f"   Optimized {len(optimized_opportunities)} opportunities for execution")
        
        return optimized_opportunities
    
    async def _final_ranking_and_filtering(self, opportunities: List[USDCOpportunity]) -> List[USDCOpportunity]:
        """Final ranking and filtering with enhanced criteria"""
        
        print("🎯 Final ranking and filtering...")
        
        # Enhanced filtering criteria
        filtered_opportunities = []
        
        for opp in opportunities:
            # Base filters
            if not (opp.tvl_usd >= 1000000 and opp.apy >= 1.0 and opp.usdc_liquidity >= 500000):
                continue
            
            # Enhanced filters
            
            # ML prediction confidence filter
            if hasattr(opp, 'prediction_confidence') and opp.prediction_confidence < 0.6:
                continue
            
            # Gas efficiency filter
            if hasattr(opp, 'gas_efficiency') and opp.gas_efficiency < 0.3:
                continue
            
            # Market regime alignment filter
            if self.current_market_regime == "risk_off" and opp.apy > 30:
                continue  # Skip high-yield in risk-off markets
            
            # Oracle confidence filter
            if opp.oracle_confidence < 0.7:
                continue
            
            filtered_opportunities.append(opp)
        
        # Enhanced ranking: ML-adjusted APY + execution efficiency + market regime alignment
        def enhanced_ranking_score(opp):
            base_score = opp.apy / (1 + opp.risk_score)
            
            # ML prediction bonus
            if hasattr(opp, 'ml_predictions'):
                ml_bonus = opp.ml_predictions.get('yield_7d', opp.apy) / opp.apy
                base_score *= ml_bonus
            
            # Execution efficiency bonus
            if hasattr(opp, 'gas_efficiency'):
                base_score *= (1 + opp.gas_efficiency * 0.1)
            
            # Market regime alignment bonus
            if self.current_market_regime == "risk_on" and opp.apy > 15:
                base_score *= 1.1
            elif self.current_market_regime == "risk_off" and opp.apy < 15:
                base_score *= 1.1
            
            return base_score
        
        # Sort by enhanced ranking score
        ranked_opportunities = sorted(filtered_opportunities, key=enhanced_ranking_score, reverse=True)
        
        print(f"   Filtered to {len(ranked_opportunities)} high-quality opportunities")
        
        return ranked_opportunities
    
    async def get_market_insights(self) -> Dict:
        """Get comprehensive market insights"""
        
        print("📈 Generating market insights...")
        
        opportunities = await self.fetch_enhanced_opportunities()
        
        if not opportunities:
            return {}
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame([{
            'protocol': opp.protocol,
            'chain': opp.chain,
            'apy': opp.apy,
            'adjusted_apy': getattr(opp, 'adjusted_apy', opp.apy),
            'net_apy': getattr(opp, 'net_apy', opp.apy),
            'risk_score': opp.risk_score,
            'tvl_usd': opp.tvl_usd,
            'category': opp.category,
            'gas_efficiency': getattr(opp, 'gas_efficiency', 0.5),
            'prediction_confidence': getattr(opp, 'prediction_confidence', 0.8)
        } for opp in opportunities])
        
        insights = {
            'total_opportunities': len(opportunities),
            'market_regime': self.current_market_regime,
            'regime_confidence': self.regime_confidence,
            'avg_apy': df['apy'].mean(),
            'avg_adjusted_apy': df['adjusted_apy'].mean(),
            'avg_net_apy': df['net_apy'].mean(),
            'avg_risk_score': df['risk_score'].mean(),
            'total_tvl': df['tvl_usd'].sum(),
            'chain_distribution': df['chain'].value_counts().to_dict(),
            'protocol_distribution': df['protocol'].value_counts().head(10).to_dict(),
            'category_distribution': df['category'].value_counts().to_dict(),
            'avg_gas_efficiency': df['gas_efficiency'].mean(),
            'avg_prediction_confidence': df['prediction_confidence'].mean(),
            'top_opportunities': df.nlargest(5, 'net_apy')[['protocol', 'chain', 'net_apy', 'risk_score']].to_dict('records')
        }
        
        return insights

# Test the enhanced aggregator
async def test_enhanced_aggregator():
    """Test the enhanced data aggregator"""
    
    aggregator = EnhancedUSDCDataAggregator()
    
    # Test enhanced opportunity fetching
    print("🚀 Testing enhanced opportunity fetching...")
    opportunities = await aggregator.fetch_enhanced_opportunities()
    
    print(f"✅ Found {len(opportunities)} enhanced opportunities")
    
    # Test market insights
    print("\n📈 Testing market insights...")
    insights = await aggregator.get_market_insights()
    
    print(f"Market Regime: {insights.get('market_regime', 'unknown')}")
    print(f"Average APY: {insights.get('avg_apy', 0):.2f}%")
    print(f"Average Net APY: {insights.get('avg_net_apy', 0):.2f}%")
    print(f"Total TVL: ${insights.get('total_tvl', 0):,.0f}")
    
    # Show top opportunities
    print(f"\n🏆 Top Opportunities:")
    for opp in insights.get('top_opportunities', [])[:3]:
        print(f"   {opp['protocol']} ({opp['chain']}): {opp['net_apy']:.2f}% APY, Risk: {opp['risk_score']:.2f}")

if __name__ == "__main__":
    asyncio.run(test_enhanced_aggregator())