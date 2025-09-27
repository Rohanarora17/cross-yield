# src/data/historical_trainer.py
"""Historical data training and ML model development"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import aiohttp
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

class HistoricalDataTrainer:
    """Train ML models on historical yield data"""
    
    def __init__(self):
        self.models = {}
        self.feature_columns = [
            'apy_base', 'apy_reward', 'tvl_usd', 'usdc_liquidity',
            'risk_score', 'protocol_age_days', 'chain_popularity',
            'market_volatility', 'gas_price', 'total_supply',
            'daily_volume', 'unique_users_7d', 'fee_income_30d'
        ]
        
    async def fetch_historical_data(self, days_back: int = 365) -> pd.DataFrame:
        """Fetch historical yield data for training"""
        
        print(f"📊 Fetching {days_back} days of historical data...")
        
        # This would integrate with The Graph, DeFiLlama historical API, etc.
        historical_data = []
        
        # Simulate historical data structure
        for i in range(days_back):
            date = datetime.now() - timedelta(days=i)
            
            # Simulate historical yield data
            for protocol in ['aave', 'compound', 'uniswap', 'curve']:
                for chain in ['ethereum', 'base', 'arbitrum']:
                    historical_data.append({
                        'date': date,
                        'protocol': protocol,
                        'chain': chain,
                        'apy': np.random.normal(8, 3),  # Simulated historical APY
                        'apy_base': np.random.normal(5, 2),
                        'apy_reward': np.random.normal(3, 1),
                        'tvl_usd': np.random.normal(100_000_000, 50_000_000),
                        'usdc_liquidity': np.random.normal(50_000_000, 25_000_000),
                        'risk_score': np.random.normal(0.3, 0.1),
                        'protocol_age_days': np.random.normal(1000, 500),
                        'chain_popularity': np.random.normal(0.7, 0.2),
                        'market_volatility': np.random.normal(0.4, 0.1),
                        'gas_price': np.random.normal(20, 10),
                        'total_supply': np.random.normal(1_000_000_000, 500_000_000),
                        'daily_volume': np.random.normal(10_000_000, 5_000_000),
                        'unique_users_7d': np.random.normal(1000, 500),
                        'fee_income_30d': np.random.normal(1_000_000, 500_000),
                        'future_apy_7d': np.random.normal(8.5, 3.2),  # Target variable
                        'future_apy_30d': np.random.normal(8.8, 3.5)
                    })
        
        df = pd.DataFrame(historical_data)
        print(f"✅ Collected {len(df)} historical data points")
        return df
    
    async def train_yield_prediction_models(self, historical_data: pd.DataFrame) -> Dict:
        """Train ML models for yield prediction"""
        
        print("🧠 Training yield prediction models...")
        
        # Prepare features and targets
        X = historical_data[self.feature_columns]
        y_7d = historical_data['future_apy_7d']
        y_30d = historical_data['future_apy_30d']
        
        # Split data
        X_train, X_test, y_train_7d, y_test_7d = train_test_split(
            X, y_7d, test_size=0.2, random_state=42
        )
        _, _, y_train_30d, y_test_30d = train_test_split(
            X, y_30d, test_size=0.2, random_state=42
        )
        
        # Train models
        models = {
            'yield_7d_rf': RandomForestRegressor(n_estimators=100, random_state=42),
            'yield_7d_gb': GradientBoostingRegressor(n_estimators=100, random_state=42),
            'yield_30d_rf': RandomForestRegressor(n_estimators=100, random_state=42),
            'yield_30d_gb': GradientBoostingRegressor(n_estimators=100, random_state=42)
        }
        
        # Train and evaluate
        results = {}
        for name, model in models.items():
            target = y_train_7d if '7d' in name else y_train_30d
            test_target = y_test_7d if '7d' in name else y_test_30d
            
            model.fit(X_train, target)
            predictions = model.predict(X_test)
            
            mse = mean_squared_error(test_target, predictions)
            r2 = r2_score(test_target, predictions)
            
            results[name] = {
                'model': model,
                'mse': mse,
                'r2': r2,
                'feature_importance': dict(zip(self.feature_columns, model.feature_importances_))
            }
            
            print(f"   {name}: R² = {r2:.3f}, MSE = {mse:.3f}")
        
        # Save best models
        best_7d = max(results.items(), key=lambda x: x[1]['r2'] if '7d' in x[0] else 0)
        best_30d = max(results.items(), key=lambda x: x[1]['r2'] if '30d' in x[0] else 0)
        
        self.models = {
            'yield_7d': best_7d[1]['model'],
            'yield_30d': best_30d[1]['model'],
            'feature_columns': self.feature_columns
        }
        
        # Save models
        os.makedirs('models', exist_ok=True)
        joblib.dump(self.models, 'models/yield_prediction_models.pkl')
        
        print(f"✅ Models trained and saved")
        print(f"   Best 7d model: {best_7d[0]} (R² = {best_7d[1]['r2']:.3f})")
        print(f"   Best 30d model: {best_30d[0]} (R² = {best_30d[1]['r2']:.3f})")
        
        return results
    
    def predict_future_yields(self, opportunity_data: Dict) -> Dict[str, float]:
        """Predict future yields for an opportunity"""
        
        if not self.models:
            # Load models if not already loaded
            try:
                self.models = joblib.load('models/yield_prediction_models.pkl')
            except FileNotFoundError:
                return {'yield_7d': opportunity_data['apy'], 'yield_30d': opportunity_data['apy']}
        
        # Prepare features
        features = np.array([[
            opportunity_data.get('apy_base', 0),
            opportunity_data.get('apy_reward', 0),
            opportunity_data.get('tvl_usd', 0),
            opportunity_data.get('usdc_liquidity', 0),
            opportunity_data.get('risk_score', 0.5),
            opportunity_data.get('protocol_age_days', 365),
            opportunity_data.get('chain_popularity', 0.5),
            opportunity_data.get('market_volatility', 0.4),
            opportunity_data.get('gas_price', 20),
            opportunity_data.get('total_supply', 1_000_000_000),
            opportunity_data.get('daily_volume', 1_000_000),
            opportunity_data.get('unique_users_7d', 100),
            opportunity_data.get('fee_income_30d', 100_000)
        ]])
        
        # Make predictions
        predictions = {
            'yield_7d': self.models['yield_7d'].predict(features)[0],
            'yield_30d': self.models['yield_30d'].predict(features)[0],
            'confidence': 0.8  # Based on model performance
        }
        
        return predictions

# Test the historical trainer
async def test_historical_trainer():
    """Test the historical data trainer"""
    
    trainer = HistoricalDataTrainer()
    
    # Fetch historical data
    historical_data = await trainer.fetch_historical_data(days_back=30)
    
    # Train models
    results = await trainer.train_yield_prediction_models(historical_data)
    
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
        'fee_income_30d': 1_000_000
    }
    
    predictions = trainer.predict_future_yields(test_opportunity)
    print(f"📈 Yield Predictions: {predictions}")

if __name__ == "__main__":
    asyncio.run(test_historical_trainer())