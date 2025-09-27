# src/data/graph_enhanced_aggregator.py
"""Graph-Enhanced Data Aggregator with The Graph, MCP, and Advanced Analytics"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, timedelta
import aiohttp

from .aggregator import USDCDataAggregator
from .historical_trainer import HistoricalDataTrainer
from ..apis.graph_integration import GraphIntegration, GraphTokenData, GraphPoolData, ContractAnalysis
from ..apis.mcp_integration import MCPIntegration
from ..apis.pyth_oracle import PythOracleAPI
from ..apis.oneinch_optimizer import OneInchOptimizer
from ..config import config
from .models import USDCOpportunity

class GraphEnhancedUSDCDataAggregator(USDCDataAggregator):
    """Graph-enhanced data aggregator with The Graph, MCP, and advanced analytics"""
    
    def __init__(self):
        super().__init__()
        
        # Initialize enhanced components
        self.graph = GraphIntegration()
        self.mcp = MCPIntegration()
        self.historical_trainer = HistoricalDataTrainer()
        self.pyth_oracle = PythOracleAPI()
        self.oneinch_optimizer = OneInchOptimizer(config.ONEINCH_API_KEY)
        
        # Data caches
        self.token_data_cache = {}
        self.pool_data_cache = {}
        self.contract_analysis_cache = {}
        
        # Market intelligence
        self.market_regime = None
        self.arbitrage_opportunities = []
        
    async def fetch_graph_enhanced_opportunities(self) -> List[USDCOpportunity]:
        """Fetch opportunities with Graph, MCP, and advanced analytics"""
        
        print("🚀 Graph-Enhanced USDC opportunity analysis starting...")
        
        # Phase 1: Get live token prices from The Graph
        live_token_data = await self._get_live_token_data()
        
        # Phase 2: Get protocol pools from The Graph
        protocol_pools = await self._get_protocol_pools_data()
        
        # Phase 3: Analyze smart contracts through The Graph
        contract_analyses = await self._analyze_protocol_contracts()
        
        # Phase 4: Get cross-chain arbitrage opportunities
        arbitrage_ops = await self._find_arbitrage_opportunities()
        
        # Phase 5: Apply MCP natural language analysis
        mcp_enhanced_opportunities = await self._apply_mcp_analysis(protocol_pools)
        
        # Phase 6: Integrate with existing ML and oracle data
        ml_oracle_enhanced = await self._integrate_ml_oracle_data(mcp_enhanced_opportunities)
        
        # Phase 7: Final ranking with Graph intelligence
        final_opportunities = await self._final_graph_ranking(ml_oracle_enhanced)
        
        print(f"✅ Graph-enhanced analysis complete: {len(final_opportunities)} opportunities")
        
        return final_opportunities
    
    async def _get_live_token_data(self) -> Dict[str, GraphTokenData]:
        """Get live token data from The Graph"""
        
        print("📊 Fetching live token data from The Graph...")
        
        try:
            async with self.graph as graph:
                # Get USDC and related tokens across chains
                tokens = ["USDC", "WETH", "USDT", "DAI", "WBTC"]
                chains = ["ethereum", "base", "arbitrum"]
                
                all_token_data = {}
                
                for chain in chains:
                    token_data = await graph.get_live_token_prices(tokens, chain)
                    all_token_data.update(token_data)
                
                self.token_data_cache = all_token_data
                
                print(f"   Fetched {len(all_token_data)} token prices across {len(chains)} chains")
                
                # Show sample data
                for symbol, data in list(all_token_data.items())[:3]:
                    print(f"   {symbol}: ${data.price_usd:.2f} (24h: {data.price_change_24h:+.2%})")
                
                return all_token_data
                
        except Exception as e:
            print(f"⚠️ Graph token data fetch failed: {e}")
            return {}
    
    async def _get_protocol_pools_data(self) -> Dict[str, List[GraphPoolData]]:
        """Get protocol pools data from The Graph"""
        
        print("🏊 Fetching protocol pools from The Graph...")
        
        try:
            async with self.graph as graph:
                protocols = ["uniswap_v3", "curve", "aave"]
                chains = ["ethereum", "base", "arbitrum"]
                
                all_pools = {}
                
                for protocol in protocols:
                    protocol_pools = []
                    
                    for chain in chains:
                        pools = await graph.get_protocol_pools(protocol, chain)
                        protocol_pools.extend(pools)
                    
                    all_pools[protocol] = protocol_pools
                    print(f"   {protocol}: {len(protocol_pools)} pools across {len(chains)} chains")
                
                self.pool_data_cache = all_pools
                return all_pools
                
        except Exception as e:
            print(f"⚠️ Graph pools fetch failed: {e}")
            return {}
    
    async def _analyze_protocol_contracts(self) -> Dict[str, ContractAnalysis]:
        """Analyze protocol contracts through The Graph"""
        
        print("🔍 Analyzing protocol contracts through The Graph...")
        
        try:
            async with self.graph as graph:
                # Key protocol contracts to analyze
                contracts_to_analyze = {
                    "uniswap_v3": "0x1F98431c8aD98523631AE4a59f267346ea31F984",
                    "curve": "0xD533a949740bb3306d119CC777fa900bA034cd52",
                    "aave": "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9"
                }
                
                contract_analyses = {}
                
                for protocol, contract_address in contracts_to_analyze.items():
                    analysis = await graph.analyze_contract(contract_address, protocol, "ethereum")
                    contract_analyses[protocol] = analysis
                    
                    print(f"   {protocol}: Security {analysis.security_score:.2f}, Efficiency {analysis.efficiency_score:.2f}")
                
                self.contract_analysis_cache = contract_analyses
                return contract_analyses
                
        except Exception as e:
            print(f"⚠️ Graph contract analysis failed: {e}")
            return {}
    
    async def _find_arbitrage_opportunities(self) -> List[Dict]:
        """Find cross-chain arbitrage opportunities using Graph data"""
        
        print("🌉 Finding cross-chain arbitrage opportunities...")
        
        try:
            async with self.graph as graph:
                arbitrage_ops = await graph.get_cross_chain_arbitrage_opportunities()
                
                self.arbitrage_opportunities = arbitrage_ops
                
                print(f"   Found {len(arbitrage_ops)} arbitrage opportunities")
                
                # Show top opportunities
                for opp in arbitrage_ops[:3]:
                    print(f"   {opp['token_pair']}: {opp['profit_potential']:.2%} profit potential")
                
                return arbitrage_ops
                
        except Exception as e:
            print(f"⚠️ Arbitrage analysis failed: {e}")
            return []
    
    async def _apply_mcp_analysis(self, protocol_pools: Dict[str, List[GraphPoolData]]) -> List[Dict]:
        """Apply MCP natural language analysis to opportunities"""
        
        print("🧠 Applying MCP natural language analysis...")
        
        try:
            async with self.mcp as mcp:
                mcp_enhanced_opportunities = []
                
                for protocol, pools in protocol_pools.items():
                    for pool in pools:
                        # Apply MCP analysis to each pool
                        mcp_analysis = await mcp.execute_tool("analyze_yield_opportunity", {
                            "protocol": protocol,
                            "chain": pool.chain,
                            "apy": pool.apy,
                            "tvl": pool.tvl_usd,
                            "risk_score": self._calculate_pool_risk_score(pool),
                            "user_amount": 10000
                        })
                        
                        # Create enhanced opportunity
                        enhanced_opp = {
                            "protocol": protocol,
                            "chain": pool.chain,
                            "pool_address": pool.pool_address,
                            "apy": pool.apy,
                            "tvl_usd": pool.tvl_usd,
                            "volume_24h": pool.volume_24h,
                            "fees_24h": pool.fees_24h,
                            "liquidity_usd": pool.total_liquidity_usd,
                            "mcp_analysis": mcp_analysis,
                            "mcp_recommendation": mcp_analysis["recommendation"],
                            "mcp_opportunity_score": mcp_analysis["opportunity_score"],
                            "mcp_confidence": mcp_analysis["confidence"],
                            "last_updated": pool.last_updated
                        }
                        
                        mcp_enhanced_opportunities.append(enhanced_opp)
                
                print(f"   Applied MCP analysis to {len(mcp_enhanced_opportunities)} opportunities")
                
                # Show sample MCP analysis
                if mcp_enhanced_opportunities:
                    sample = mcp_enhanced_opportunities[0]
                    print(f"   Sample: {sample['protocol']} - {sample['mcp_recommendation']} (Score: {sample['mcp_opportunity_score']:.1f}/10)")
                
                return mcp_enhanced_opportunities
                
        except Exception as e:
            print(f"⚠️ MCP analysis failed: {e}")
            return []
    
    async def _integrate_ml_oracle_data(self, mcp_opportunities: List[Dict]) -> List[Dict]:
        """Integrate ML and oracle data with MCP opportunities"""
        
        print("🔮 Integrating ML and oracle data...")
        
        enhanced_opportunities = []
        
        for opp in mcp_opportunities:
            try:
                # Get ML predictions
                ml_predictions = self.historical_trainer.predict_future_yields({
                    'apy_base': opp['apy'] * 0.7,  # Assume 70% base APY
                    'apy_reward': opp['apy'] * 0.3,  # Assume 30% reward APY
                    'tvl_usd': opp['tvl_usd'],
                    'usdc_liquidity': opp['liquidity_usd'],
                    'risk_score': self._calculate_pool_risk_score_from_dict(opp),
                    'protocol_age_days': 365,
                    'chain_popularity': 0.8,
                    'market_volatility': 0.4,
                    'gas_price': 20,
                    'total_supply': 1_000_000_000,
                    'daily_volume': opp['volume_24h'],
                    'unique_users_7d': 1000,
                    'fee_income_30d': opp['fees_24h'] * 30
                })
                
                # Get oracle sustainability score
                oracle_sustainability = await self.pyth_oracle.get_yield_sustainability_score(
                    opp['protocol'], opp['apy']
                )
                
                # Get execution optimization
                async with self.oneinch_optimizer as optimizer:
                    execution_analysis = await optimizer.find_optimal_routes([{
                        'protocol': opp['protocol'],
                        'chain': opp['chain'],
                        'apy': opp['apy']
                    }])
                
                # Create fully enhanced opportunity
                enhanced_opp = {
                    **opp,
                    'ml_predictions': ml_predictions,
                    'ml_predicted_apy_7d': ml_predictions['yield_7d'],
                    'ml_predicted_apy_30d': ml_predictions['yield_30d'],
                    'ml_confidence': ml_predictions['confidence'],
                    'oracle_sustainability': oracle_sustainability['sustainability_score'],
                    'oracle_market_regime': oracle_sustainability['market_regime'],
                    'oracle_volatility': oracle_sustainability['volatility_level'],
                    'execution_analysis': execution_analysis,
                    'net_apy': execution_analysis.get(f"{opp['protocol']}_{opp['chain']}", {}).get('net_apy', opp['apy']),
                    'gas_efficiency': execution_analysis.get(f"{opp['protocol']}_{opp['chain']}", {}).get('gas_efficiency', 0.5)
                }
                
                enhanced_opportunities.append(enhanced_opp)
                
            except Exception as e:
                print(f"⚠️ ML/Oracle integration failed for {opp['protocol']}: {e}")
                enhanced_opportunities.append(opp)
        
        print(f"   Enhanced {len(enhanced_opportunities)} opportunities with ML and oracle data")
        
        return enhanced_opportunities
    
    async def _final_graph_ranking(self, opportunities: List[Dict]) -> List[USDCOpportunity]:
        """Final ranking with Graph intelligence"""
        
        print("🎯 Final Graph-enhanced ranking...")
        
        # Convert to USDCOpportunity objects
        usdc_opportunities = []
        
        for opp in opportunities:
            try:
                # Calculate comprehensive score
                comprehensive_score = self._calculate_comprehensive_score(opp)
                
                usdc_opp = USDCOpportunity(
                    protocol=opp['protocol'],
                    chain=opp['chain'],
                    pool_id=opp['pool_address'],
                    pool_name=f"{opp['protocol']} Pool",
                    apy=opp['apy'],
                    apy_base=opp['apy'] * 0.7,
                    apy_reward=opp['apy'] * 0.3,
                    tvl_usd=opp['tvl_usd'],
                    usdc_liquidity=opp['liquidity_usd'],
                    risk_score=self._calculate_pool_risk_score_from_dict(opp),
                    category="lp",
                    min_deposit=1.0,
                    oracle_confidence=opp.get('mcp_confidence', 0.8),
                    last_updated=opp['last_updated'],
                    oneinch_executable=True,
                    cctp_accessible=True,
                    adjusted_apy=opp.get('ml_predicted_apy_7d', opp['apy'])
                )
                
                # Add enhanced attributes
                usdc_opp.comprehensive_score = comprehensive_score
                usdc_opp.mcp_analysis = opp.get('mcp_analysis', {})
                usdc_opp.mcp_recommendation = opp.get('mcp_recommendation', 'NEUTRAL')
                usdc_opp.mcp_opportunity_score = opp.get('mcp_opportunity_score', 5.0)
                usdc_opp.ml_predictions = opp.get('ml_predictions', {})
                usdc_opp.oracle_sustainability = opp.get('oracle_sustainability', 0.5)
                usdc_opp.execution_analysis = opp.get('execution_analysis', {})
                usdc_opp.net_apy = opp.get('net_apy', opp['apy'])
                usdc_opp.gas_efficiency = opp.get('gas_efficiency', 0.5)
                
                usdc_opportunities.append(usdc_opp)
                
            except Exception as e:
                print(f"⚠️ Failed to create USDCOpportunity for {opp['protocol']}: {e}")
                continue
        
        # Sort by comprehensive score
        usdc_opportunities.sort(key=lambda x: getattr(x, 'comprehensive_score', 0), reverse=True)
        
        print(f"   Ranked {len(usdc_opportunities)} opportunities")
        
        return usdc_opportunities
    
    def _calculate_comprehensive_score(self, opp: Dict) -> float:
        """Calculate comprehensive score combining all data sources"""
        
        # Base APY score (0-10)
        apy_score = min(10, opp['apy'] / 2)
        
        # MCP opportunity score (0-10)
        mcp_score = opp.get('mcp_opportunity_score', 5)
        
        # ML prediction bonus
        ml_bonus = 1.0
        if 'ml_predicted_apy_7d' in opp:
            ml_bonus = opp['ml_predicted_apy_7d'] / opp['apy']
        
        # Oracle sustainability score (0-1)
        oracle_score = opp.get('oracle_sustainability', 0.5) * 10
        
        # Execution efficiency (0-1)
        execution_score = opp.get('gas_efficiency', 0.5) * 10
        
        # TVL security score
        tvl_score = min(10, np.log10(opp['tvl_usd']) / 6)  # Log scale
        
        # Comprehensive score
        comprehensive_score = (
            apy_score * 0.25 +
            mcp_score * 0.20 +
            oracle_score * 0.15 +
            execution_score * 0.15 +
            tvl_score * 0.15 +
            ml_bonus * 0.10
        )
        
        return comprehensive_score
    
    def _calculate_pool_risk_score(self, pool: GraphPoolData) -> float:
        """Calculate risk score for a pool"""
        
        # Base risk factors
        risk_score = 0.5
        
        # TVL risk
        if pool.tvl_usd < 1000000:
            risk_score += 0.3
        elif pool.tvl_usd > 10000000:
            risk_score -= 0.1
        
        # Volume risk
        if pool.volume_24h < 100000:
            risk_score += 0.2
        
        # Protocol risk
        protocol_risks = {
            'uniswap_v3': 0.2,
            'curve': 0.1,
            'aave': 0.1,
            'compound': 0.1
        }
        risk_score += protocol_risks.get(pool.protocol, 0.3)
        
        return max(0, min(1, risk_score))
    
    def _calculate_pool_risk_score_from_dict(self, opp: Dict) -> float:
        """Calculate risk score from opportunity dict"""
        
        risk_score = 0.5
        
        # TVL risk
        if opp['tvl_usd'] < 1000000:
            risk_score += 0.3
        elif opp['tvl_usd'] > 10000000:
            risk_score -= 0.1
        
        # Volume risk
        if opp.get('volume_24h', 0) < 100000:
            risk_score += 0.2
        
        # Protocol risk
        protocol_risks = {
            'uniswap_v3': 0.2,
            'curve': 0.1,
            'aave': 0.1,
            'compound': 0.1
        }
        risk_score += protocol_risks.get(opp['protocol'], 0.3)
        
        return max(0, min(1, risk_score))
    
    async def get_graph_enhanced_insights(self) -> Dict[str, Any]:
        """Get comprehensive insights from Graph-enhanced data"""
        
        print("📈 Generating Graph-enhanced insights...")
        
        opportunities = await self.fetch_graph_enhanced_opportunities()
        
        if not opportunities:
            return {}
        
        # Convert to DataFrame for analysis
        df = pd.DataFrame([{
            'protocol': opp.protocol,
            'chain': opp.chain,
            'apy': opp.apy,
            'adjusted_apy': opp.adjusted_apy,
            'net_apy': getattr(opp, 'net_apy', opp.apy),
            'risk_score': opp.risk_score,
            'tvl_usd': opp.tvl_usd,
            'comprehensive_score': getattr(opp, 'comprehensive_score', 0),
            'mcp_opportunity_score': getattr(opp, 'mcp_opportunity_score', 0),
            'oracle_sustainability': getattr(opp, 'oracle_sustainability', 0),
            'gas_efficiency': getattr(opp, 'gas_efficiency', 0)
        } for opp in opportunities])
        
        insights = {
            'total_opportunities': len(opportunities),
            'avg_apy': df['apy'].mean(),
            'avg_adjusted_apy': df['adjusted_apy'].mean(),
            'avg_net_apy': df['net_apy'].mean(),
            'avg_comprehensive_score': df['comprehensive_score'].mean(),
            'avg_mcp_score': df['mcp_opportunity_score'].mean(),
            'avg_oracle_sustainability': df['oracle_sustainability'].mean(),
            'avg_gas_efficiency': df['gas_efficiency'].mean(),
            'total_tvl': df['tvl_usd'].sum(),
            'chain_distribution': df['chain'].value_counts().to_dict(),
            'protocol_distribution': df['protocol'].value_counts().to_dict(),
            'top_opportunities': df.nlargest(5, 'comprehensive_score')[['protocol', 'chain', 'comprehensive_score', 'net_apy']].to_dict('records'),
            'arbitrage_opportunities': len(self.arbitrage_opportunities),
            'contract_analyses': len(self.contract_analysis_cache),
            'token_data_points': len(self.token_data_cache)
        }
        
        return insights

# Test the Graph-enhanced aggregator
async def test_graph_enhanced_aggregator():
    """Test the Graph-enhanced data aggregator"""
    
    aggregator = GraphEnhancedUSDCDataAggregator()
    
    # Test Graph-enhanced opportunity fetching
    print("🚀 Testing Graph-enhanced opportunity fetching...")
    opportunities = await aggregator.fetch_graph_enhanced_opportunities()
    
    print(f"✅ Found {len(opportunities)} Graph-enhanced opportunities")
    
    # Test comprehensive insights
    print("\n📈 Testing comprehensive insights...")
    insights = await aggregator.get_graph_enhanced_insights()
    
    print(f"Average APY: {insights.get('avg_apy', 0):.2f}%")
    print(f"Average Net APY: {insights.get('avg_net_apy', 0):.2f}%")
    print(f"Average Comprehensive Score: {insights.get('avg_comprehensive_score', 0):.2f}/10")
    print(f"Average MCP Score: {insights.get('avg_mcp_score', 0):.2f}/10")
    print(f"Total TVL: ${insights.get('total_tvl', 0):,.0f}")
    print(f"Arbitrage Opportunities: {insights.get('arbitrage_opportunities', 0)}")
    
    # Show top opportunities
    print(f"\n🏆 Top Graph-Enhanced Opportunities:")
    for opp in insights.get('top_opportunities', [])[:3]:
        print(f"   {opp['protocol']} ({opp['chain']}): Score {opp['comprehensive_score']:.2f}, Net APY {opp['net_apy']:.2f}%")

if __name__ == "__main__":
    asyncio.run(test_graph_enhanced_aggregator())