#!/usr/bin/env python3
"""Test script for Pyth historical data integration"""

import asyncio
import sys
import os

# Add the src directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from src.apis.pyth_oracle import PythOracleAPI
from src.data.historical_trainer import HistoricalDataTrainer

async def test_pyth_historical_integration():
    """Test the complete Pyth historical data integration"""
    
    print("🚀 Testing Pyth Historical Data Integration")
    print("=" * 60)
    
    # Test 1: Pyth Oracle Historical Data
    print("\n📊 Test 1: Pyth Oracle Historical Data")
    print("-" * 40)
    
    oracle = PythOracleAPI()
    
    # Test historical price fetching
    import time
    current_timestamp = int(time.time())
    yesterday_timestamp = current_timestamp - 86400
    
    print("🔮 Fetching historical prices from Pyth Benchmarks...")
    historical_prices = await oracle.get_historical_prices(
        ["USDC", "ETH", "BTC"], 
        yesterday_timestamp
    )
    
    for symbol, data in historical_prices.items():
        print(f"   {symbol}: ${data['price']:.2f} (±{data['confidence']:.4f})")
    
    # Test historical price range
    print("\n📈 Testing historical price range (last 7 days)...")
    week_ago_timestamp = current_timestamp - (7 * 86400)
    
    historical_range = await oracle.get_historical_price_range(
        ["ETH", "BTC"], 
        week_ago_timestamp, 
        current_timestamp, 
        86400  # Daily intervals
    )
    
    for symbol, price_data in historical_range.items():
        print(f"   {symbol}: {len(price_data)} data points")
        if price_data:
            first_price = price_data[0]['price']
            last_price = price_data[-1]['price']
            change = ((last_price - first_price) / first_price) * 100
            print(f"     Price change: {change:+.2f}%")
    
    # Test historical volatility analysis
    print("\n📊 Testing historical volatility analysis...")
    volatility_analysis = await oracle.get_historical_volatility_analysis(["ETH", "BTC"], 30)
    
    for symbol, analysis in volatility_analysis.items():
        print(f"   {symbol}:")
        print(f"     Volatility: {analysis['volatility']:.2%}")
        print(f"     Price range: {analysis['price_range']:.2%}")
        print(f"     Trend: {analysis['trend']:+.2%}")
    
    # Test 2: Historical Data Trainer Integration
    print("\n🧠 Test 2: Historical Data Trainer with Real Data")
    print("-" * 50)
    
    trainer = HistoricalDataTrainer()
    
    print("📊 Fetching historical data for ML training...")
    historical_data = await trainer.fetch_historical_data(days_back=30)
    
    print(f"✅ Collected {len(historical_data)} historical data points")
    print(f"   Features: {list(historical_data.columns)}")
    print(f"   Protocols: {historical_data['protocol'].unique()}")
    print(f"   Chains: {historical_data['chain'].unique()}")
    
    # Show sample data
    print("\n📋 Sample Historical Data:")
    sample_data = historical_data.head(3)
    for _, row in sample_data.iterrows():
        print(f"   {row['protocol']} ({row['chain']}): {row['apy']:.2f}% APY")
        print(f"     ETH: ${row['eth_price']:.2f}, BTC: ${row['btc_price']:.2f}")
        print(f"     Volatility: {row['price_volatility']:.2%}, Regime: {row['market_regime']:.2f}")
    
    # Test ML model training
    print("\n🤖 Testing ML model training with historical data...")
    try:
        results = await trainer.train_yield_prediction_models(historical_data)
        print("✅ ML models trained successfully!")
        
        # Test prediction
        test_opportunity = {
            'apy_base': 5.0,
            'apy_reward': 2.0,
            'tvl_usd': 100_000_000,
            'usdc_liquidity': 50_000_000,
            'risk_score': 0.3,
            'protocol_age_days': 1000,
            'chain_popularity': 0.8,
            'market_volatility': 0.3,
            'gas_price': 25,
            'total_supply': 1_000_000_000,
            'daily_volume': 10_000_000,
            'unique_users_7d': 1000,
            'fee_income_30d': 1_000_000,
            'eth_price': 2500,
            'btc_price': 45000,
            'price_volatility': 0.3,
            'market_regime': 0.6
        }
        
        predictions = trainer.predict_future_yields(test_opportunity)
        print(f"📈 Yield Predictions:")
        print(f"   7-day: {predictions['yield_7d']:.2f}%")
        print(f"   30-day: {predictions['yield_30d']:.2f}%")
        print(f"   Confidence: {predictions['confidence']:.1%}")
        
    except Exception as e:
        print(f"⚠️ ML training failed: {e}")
    
    print("\n✅ Pyth Historical Data Integration Test Complete!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_pyth_historical_integration())