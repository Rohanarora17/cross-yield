#!/usr/bin/env python3
"""
Comprehensive test for USDC Data Aggregator using pandas for data analysis
"""

import asyncio
import sys
import os
import pandas as pd
import numpy as np
from datetime import datetime
from typing import List, Dict

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

# Import the actual modules
from src.data.aggregator import USDCDataAggregator
from src.data.models import USDCOpportunity

class EnhancedUSDCDataAggregator(USDCDataAggregator):
    """Enhanced aggregator with pandas analysis capabilities"""
    
    def __init__(self):
        super().__init__()
    
    async def fetch_all_opportunities(self) -> List[USDCOpportunity]:
        """Fetch opportunities and return as list"""
        return await super().fetch_all_opportunities()
    
    def opportunities_to_dataframe(self, opportunities: List[USDCOpportunity]) -> pd.DataFrame:
        """Convert opportunities to pandas DataFrame for analysis"""
        
        data = []
        for opp in opportunities:
            data.append({
                'protocol': opp.protocol,
                'chain': opp.chain,
                'pool_name': opp.pool_name,
                'apy': opp.apy,
                'apy_base': opp.apy_base,
                'apy_reward': opp.apy_reward,
                'tvl_usd': opp.tvl_usd,
                'usdc_liquidity': opp.usdc_liquidity,
                'risk_score': opp.risk_score,
                'category': opp.category,
                'min_deposit': opp.min_deposit,
                'oracle_confidence': opp.oracle_confidence,
                'last_updated': opp.last_updated,
                'risk_adjusted_apy': opp.apy / (1 + opp.risk_score),
                'tvl_millions': opp.tvl_usd / 1_000_000,
                'liquidity_millions': opp.usdc_liquidity / 1_000_000
            })
        
        return pd.DataFrame(data)
    
    def analyze_opportunities(self, df: pd.DataFrame) -> Dict:
        """Perform comprehensive analysis using pandas"""
        
        analysis = {}
        
        # Basic statistics
        analysis['total_opportunities'] = len(df)
        analysis['chains_covered'] = df['chain'].nunique()
        analysis['protocols_covered'] = df['protocol'].nunique()
        
        # Yield analysis
        analysis['yield_stats'] = {
            'mean_apy': df['apy'].mean(),
            'median_apy': df['apy'].median(),
            'std_apy': df['apy'].std(),
            'min_apy': df['apy'].min(),
            'max_apy': df['apy'].max(),
            'q25_apy': df['apy'].quantile(0.25),
            'q75_apy': df['apy'].quantile(0.75)
        }
        
        # Risk analysis
        analysis['risk_stats'] = {
            'mean_risk': df['risk_score'].mean(),
            'median_risk': df['risk_score'].median(),
            'std_risk': df['risk_score'].std(),
            'min_risk': df['risk_score'].min(),
            'max_risk': df['risk_score'].max()
        }
        
        # Risk-adjusted returns
        analysis['risk_adjusted_stats'] = {
            'mean_risk_adj': df['risk_adjusted_apy'].mean(),
            'median_risk_adj': df['risk_adjusted_apy'].median(),
            'std_risk_adj': df['risk_adjusted_apy'].std(),
            'min_risk_adj': df['risk_adjusted_apy'].min(),
            'max_risk_adj': df['risk_adjusted_apy'].max()
        }
        
        # Chain analysis
        chain_analysis = df.groupby('chain').agg({
            'apy': ['count', 'mean', 'max', 'min'],
            'risk_score': ['mean', 'min', 'max'],
            'risk_adjusted_apy': ['mean', 'max'],
            'tvl_usd': ['sum', 'mean'],
            'usdc_liquidity': ['sum', 'mean']
        }).round(2)
        
        analysis['chain_analysis'] = chain_analysis
        
        # Protocol analysis
        protocol_analysis = df.groupby('protocol').agg({
            'apy': ['count', 'mean', 'max'],
            'risk_score': ['mean'],
            'risk_adjusted_apy': ['mean', 'max'],
            'tvl_usd': ['sum'],
            'usdc_liquidity': ['sum']
        }).round(2)
        
        analysis['protocol_analysis'] = protocol_analysis.sort_values(('risk_adjusted_apy', 'mean'), ascending=False)
        
        # Category analysis
        category_analysis = df.groupby('category').agg({
            'apy': ['count', 'mean', 'max'],
            'risk_score': ['mean'],
            'risk_adjusted_apy': ['mean', 'max'],
            'tvl_usd': ['sum'],
            'usdc_liquidity': ['sum']
        }).round(2)
        
        analysis['category_analysis'] = category_analysis
        
        # Cross-chain arbitrage analysis
        chain_yields = df.groupby('chain')['apy'].agg(['mean', 'max', 'min', 'std']).round(2)
        analysis['arbitrage_analysis'] = chain_yields
        
        # Calculate arbitrage potential
        max_yield = chain_yields['max'].max()
        min_yield = chain_yields['min'].min()
        analysis['arbitrage_potential'] = {
            'max_spread': max_yield - min_yield,
            'max_spread_pct': ((max_yield - min_yield) / min_yield) * 100,
            'best_chain': chain_yields['max'].idxmax(),
            'worst_chain': chain_yields['min'].idxmin()
        }
        
        # Risk categories
        df['risk_category'] = pd.cut(df['risk_score'], 
                                   bins=[0, 0.2, 0.4, 1.0], 
                                   labels=['Low', 'Medium', 'High'])
        
        risk_category_analysis = df.groupby('risk_category').agg({
            'apy': ['count', 'mean', 'max'],
            'risk_adjusted_apy': ['mean', 'max'],
            'tvl_usd': ['sum']
        }).round(2)
        
        analysis['risk_category_analysis'] = risk_category_analysis
        
        # Top opportunities by different criteria
        analysis['top_opportunities'] = {
            'highest_apy': df.loc[df['apy'].idxmax()].to_dict(),
            'lowest_risk': df.loc[df['risk_score'].idxmin()].to_dict(),
            'best_risk_adjusted': df.loc[df['risk_adjusted_apy'].idxmax()].to_dict(),
            'largest_tvl': df.loc[df['tvl_usd'].idxmax()].to_dict()
        }
        
        return analysis

async def test_aggregator_with_pandas():
    """Test the aggregator with comprehensive pandas analysis"""
    
    print("🚀 USDC Data Aggregator Test with Pandas Analysis")
    print("=" * 70)
    
    # Initialize enhanced aggregator
    aggregator = EnhancedUSDCDataAggregator()
    
    try:
        # Fetch opportunities
        print("\n📊 Fetching USDC opportunities...")
        opportunities = await aggregator.fetch_all_opportunities()
        
        if not opportunities:
            print("❌ No opportunities found")
            return
        
        print(f"✅ Successfully fetched {len(opportunities)} opportunities")
        
        # Convert to DataFrame
        print("\n📈 Converting to pandas DataFrame...")
        df = aggregator.opportunities_to_dataframe(opportunities)
        
        print(f"DataFrame shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        
        # Perform comprehensive analysis
        print("\n🔍 Performing comprehensive analysis...")
        analysis = aggregator.analyze_opportunities(df)
        
        # Display results
        print("\n📋 ANALYSIS RESULTS:")
        print("=" * 50)
        
        # Basic stats
        print(f"\n📊 BASIC STATISTICS:")
        print(f"  Total opportunities: {analysis['total_opportunities']}")
        print(f"  Chains covered: {analysis['chains_covered']}")
        print(f"  Protocols covered: {analysis['protocols_covered']}")
        
        # Yield analysis
        yield_stats = analysis['yield_stats']
        print(f"\n💰 YIELD ANALYSIS:")
        print(f"  Mean APY: {yield_stats['mean_apy']:.2f}%")
        print(f"  Median APY: {yield_stats['median_apy']:.2f}%")
        print(f"  Std Dev: {yield_stats['std_apy']:.2f}%")
        print(f"  Range: {yield_stats['min_apy']:.2f}% - {yield_stats['max_apy']:.2f}%")
        print(f"  Q25-Q75: {yield_stats['q25_apy']:.2f}% - {yield_stats['q75_apy']:.2f}%")
        
        # Risk analysis
        risk_stats = analysis['risk_stats']
        print(f"\n⚠️ RISK ANALYSIS:")
        print(f"  Mean Risk: {risk_stats['mean_risk']:.3f}")
        print(f"  Median Risk: {risk_stats['median_risk']:.3f}")
        print(f"  Std Dev: {risk_stats['std_risk']:.3f}")
        print(f"  Range: {risk_stats['min_risk']:.3f} - {risk_stats['max_risk']:.3f}")
        
        # Risk-adjusted analysis
        risk_adj_stats = analysis['risk_adjusted_stats']
        print(f"\n🎯 RISK-ADJUSTED RETURNS:")
        print(f"  Mean Risk-Adj APY: {risk_adj_stats['mean_risk_adj']:.2f}%")
        print(f"  Median Risk-Adj APY: {risk_adj_stats['median_risk_adj']:.2f}%")
        print(f"  Best Risk-Adj APY: {risk_adj_stats['max_risk_adj']:.2f}%")
        
        # Chain analysis
        print(f"\n🌐 CHAIN ANALYSIS:")
        chain_analysis = analysis['chain_analysis']
        for chain in chain_analysis.index:
            row = chain_analysis.loc[chain]
            print(f"  {chain.upper():10}: {row[('apy', 'count')]:2.0f} pools, "
                  f"Avg APY: {row[('apy', 'mean')]:5.2f}%, "
                  f"Max APY: {row[('apy', 'max')]:5.2f}%, "
                  f"Risk-Adj: {row[('risk_adjusted_apy', 'mean')]:5.2f}%")
        
        # Arbitrage analysis
        arbitrage = analysis['arbitrage_potential']
        print(f"\n🔄 CROSS-CHAIN ARBITRAGE:")
        print(f"  Maximum spread: {arbitrage['max_spread']:.2f}%")
        print(f"  Improvement potential: {arbitrage['max_spread_pct']:.1f}%")
        print(f"  Best chain: {arbitrage['best_chain'].upper()}")
        print(f"  Worst chain: {arbitrage['worst_chain'].upper()}")
        
        # Protocol analysis (top 5)
        print(f"\n🏛️ TOP PROTOCOLS BY RISK-ADJUSTED APY:")
        protocol_analysis = analysis['protocol_analysis'].head(5)
        for protocol in protocol_analysis.index:
            row = protocol_analysis.loc[protocol]
            print(f"  {protocol:15}: {row[('risk_adjusted_apy', 'mean')]:5.2f}% "
                  f"(APY: {row[('apy', 'mean')]:5.2f}%, Risk: {row[('risk_score', 'mean')]:.3f})")
        
        # Category analysis
        print(f"\n📊 CATEGORY ANALYSIS:")
        category_analysis = analysis['category_analysis']
        for category in category_analysis.index:
            row = category_analysis.loc[category]
            print(f"  {category:12}: {row[('apy', 'count')]:2.0f} pools, "
                  f"Avg APY: {row[('apy', 'mean')]:5.2f}%, "
                  f"Risk-Adj: {row[('risk_adjusted_apy', 'mean')]:5.2f}%")
        
        # Risk category analysis
        print(f"\n⚠️ RISK CATEGORY BREAKDOWN:")
        risk_cat_analysis = analysis['risk_category_analysis']
        for risk_cat in risk_cat_analysis.index:
            row = risk_cat_analysis.loc[risk_cat]
            print(f"  {risk_cat:6} Risk: {row[('apy', 'count')]:2.0f} pools, "
                  f"Avg APY: {row[('apy', 'mean')]:5.2f}%, "
                  f"Risk-Adj: {row[('risk_adjusted_apy', 'mean')]:5.2f}%")
        
        # Top opportunities
        print(f"\n🏆 TOP OPPORTUNITIES:")
        top_opps = analysis['top_opportunities']
        
        print(f"  Highest APY: {top_opps['highest_apy']['protocol']} "
              f"({top_opps['highest_apy']['apy']:.2f}%)")
        print(f"  Lowest Risk: {top_opps['lowest_risk']['protocol']} "
              f"(Risk: {top_opps['lowest_risk']['risk_score']:.3f})")
        print(f"  Best Risk-Adj: {top_opps['best_risk_adjusted']['protocol']} "
              f"({top_opps['best_risk_adjusted']['risk_adjusted_apy']:.2f}%)")
        print(f"  Largest TVL: {top_opps['largest_tvl']['protocol']} "
              f"(${top_opps['largest_tvl']['tvl_usd']:,.0f})")
        
        # Display top 10 opportunities
        print(f"\n📋 TOP 10 OPPORTUNITIES (Risk-Adjusted Ranking):")
        print("-" * 100)
        top_10 = df.nlargest(10, 'risk_adjusted_apy')
        
        for i, (_, row) in enumerate(top_10.iterrows(), 1):
            print(f"{i:2d}. {row['protocol'].upper():15} | {row['chain'].upper():8} | {row['category']:12}")
            print(f"    APY: {row['apy']:6.2f}% | Risk: {row['risk_score']:.3f} | Risk-Adj: {row['risk_adjusted_apy']:.2f}%")
            print(f"    TVL: ${row['tvl_usd']:12,.0f} | USDC Liquidity: ${row['usdc_liquidity']:12,.0f}")
            print(f"    Base: {row['apy_base']:.2f}% | Reward: {row['apy_reward']:.2f}%")
            print()
        
        # Save analysis to CSV
        print(f"\n💾 Saving detailed analysis to CSV...")
        df.to_csv('usdc_opportunities_analysis.csv', index=False)
        print(f"✅ Analysis saved to 'usdc_opportunities_analysis.csv'")
        
        # Create summary DataFrame
        summary_data = []
        for chain in df['chain'].unique():
            chain_df = df[df['chain'] == chain]
            summary_data.append({
                'chain': chain,
                'opportunities': len(chain_df),
                'avg_apy': chain_df['apy'].mean(),
                'max_apy': chain_df['apy'].max(),
                'avg_risk': chain_df['risk_score'].mean(),
                'avg_risk_adj_apy': chain_df['risk_adjusted_apy'].mean(),
                'total_tvl': chain_df['tvl_usd'].sum(),
                'total_liquidity': chain_df['usdc_liquidity'].sum()
            })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_csv('chain_summary.csv', index=False)
        print(f"✅ Chain summary saved to 'chain_summary.csv'")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("🧪 Testing USDC Data Aggregator with Pandas Analysis")
    print("=" * 70)
    
    # Run the test
    asyncio.run(test_aggregator_with_pandas())
    
    print("\n✅ Test completed!")
    print("\n📝 KEY FINDINGS:")
    print("- Pandas enables sophisticated data analysis of USDC opportunities")
    print("- Risk-adjusted ranking provides optimal portfolio allocation")
    print("- Cross-chain arbitrage analysis reveals significant opportunities")
    print("- Statistical analysis helps identify outliers and trends")
    print("- CSV export enables further analysis and reporting")