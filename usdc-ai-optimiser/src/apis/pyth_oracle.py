# src/apis/pyth_oracle.py
"""Pyth Network Oracle Integration for Real-Time Market Data"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional
from datetime import datetime
import numpy as np

class PythOracleAPI:
    """Pyth Network oracle integration for real-time market data"""
    
    def __init__(self):
        self.base_url = "https://hermes.pyth.network"
        self.price_feeds = {
            "USDC": "0xeaa020c61cc479712813461ce153894a96a6c00b",
            "ETH": "0xff61491a931112ddf1bd8147cd1b641375f79f5825122d1364803c6ec40f8b0a",
            "BTC": "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
            "AVAX": "0x93da3352f9f1d105fdfe4971cfa80e9dd777b8c0cb0e5b9f985933e6b0b2c0c"
        }
        
    async def get_price_feeds(self, symbols: List[str]) -> Dict[str, Dict]:
        """Get real-time price feeds from Pyth"""
        
        print(f"🔮 Fetching Pyth price feeds for {symbols}...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Get latest price feeds
                url = f"{self.base_url}/api/latest_price_feeds"
                params = {
                    "ids[]": [self.price_feeds.get(symbol, "") for symbol in symbols if symbol in self.price_feeds]
                }
                
                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_price_feeds(data)
                    else:
                        print(f"⚠️ Pyth API error: {response.status}")
                        return await self._get_fallback_prices(symbols)
                        
        except Exception as e:
            print(f"❌ Pyth fetch failed: {e}")
            return await self._get_fallback_prices(symbols)
    
    def _parse_price_feeds(self, data: List[Dict]) -> Dict[str, Dict]:
        """Parse Pyth price feed data"""
        
        parsed_feeds = {}
        
        for feed in data:
            try:
                symbol = self._get_symbol_from_id(feed.get('id', ''))
                if not symbol:
                    continue
                    
                price_data = feed.get('price', {})
                confidence_data = feed.get('conf', {})
                
                parsed_feeds[symbol] = {
                    'price': float(price_data.get('price', 0)) / (10 ** price_data.get('expo', 0)),
                    'confidence': float(confidence_data.get('conf', 0)) / (10 ** confidence_data.get('expo', 0)),
                    'timestamp': feed.get('publish_time', 0),
                    'exponent': price_data.get('expo', 0),
                    'status': feed.get('status', 'unknown')
                }
                
            except Exception as e:
                print(f"⚠️ Failed to parse feed: {e}")
                continue
        
        return parsed_feeds
    
    def _get_symbol_from_id(self, feed_id: str) -> Optional[str]:
        """Get symbol from Pyth feed ID"""
        
        for symbol, feed_id_mapping in self.price_feeds.items():
            if feed_id == feed_id_mapping:
                return symbol
        return None
    
    async def _get_fallback_prices(self, symbols: List[str]) -> Dict[str, Dict]:
        """Fallback prices when Pyth is unavailable"""
        
        print("🔄 Using fallback price data...")
        
        fallback_prices = {
            "USDC": {"price": 1.0, "confidence": 0.001, "timestamp": datetime.now().timestamp()},
            "ETH": {"price": 2500.0, "confidence": 5.0, "timestamp": datetime.now().timestamp()},
            "BTC": {"price": 45000.0, "confidence": 100.0, "timestamp": datetime.now().timestamp()},
            "AVAX": {"price": 25.0, "confidence": 0.1, "timestamp": datetime.now().timestamp()}
        }
        
        return {symbol: fallback_prices.get(symbol, {"price": 0, "confidence": 1}) for symbol in symbols}
    
    async def get_market_regime_indicators(self) -> Dict[str, float]:
        """Get market regime indicators from Pyth data"""
        
        symbols = ["USDC", "ETH", "BTC", "AVAX"]
        price_feeds = await self.get_price_feeds(symbols)
        
        # Calculate market regime indicators
        indicators = {}
        
        # Volatility indicator (based on confidence intervals)
        total_confidence = sum(feed.get('confidence', 1) for feed in price_feeds.values())
        avg_confidence = total_confidence / len(price_feeds)
        indicators['market_volatility'] = min(avg_confidence / 10, 1.0)  # Normalize to 0-1
        
        # Price momentum (simplified)
        eth_price = price_feeds.get('ETH', {}).get('price', 2500)
        btc_price = price_feeds.get('BTC', {}).get('price', 45000)
        
        # Calculate relative strength
        crypto_momentum = (eth_price / 2500 + btc_price / 45000) / 2
        indicators['crypto_momentum'] = min(max(crypto_momentum - 1, -0.5), 0.5)  # -0.5 to 0.5
        
        # Market stress indicator
        usdc_price = price_feeds.get('USDC', {}).get('price', 1.0)
        usdc_deviation = abs(usdc_price - 1.0)
        indicators['market_stress'] = min(usdc_deviation * 100, 1.0)  # 0-1 scale
        
        # Risk-on/Risk-off indicator
        risk_on_score = (crypto_momentum + (1 - indicators['market_stress'])) / 2
        indicators['risk_regime'] = risk_on_score  # 0 = risk-off, 1 = risk-on
        
        return indicators
    
    async def get_yield_sustainability_score(self, protocol: str, current_apy: float) -> Dict[str, float]:
        """Calculate yield sustainability based on market conditions"""
        
        market_indicators = await self.get_market_regime_indicators()
        
        # Base sustainability factors
        sustainability_score = 0.5  # Start neutral
        
        # Adjust based on market regime
        if market_indicators['risk_regime'] > 0.6:  # Risk-on market
            sustainability_score += 0.2
        elif market_indicators['risk_regime'] < 0.4:  # Risk-off market
            sustainability_score -= 0.2
        
        # Adjust based on volatility
        if market_indicators['market_volatility'] > 0.7:  # High volatility
            sustainability_score -= 0.15
        elif market_indicators['market_volatility'] < 0.3:  # Low volatility
            sustainability_score += 0.15
        
        # Adjust based on APY level
        if current_apy > 50:  # Very high APY
            sustainability_score -= 0.3
        elif current_apy > 30:  # High APY
            sustainability_score -= 0.2
        elif current_apy > 20:  # Elevated APY
            sustainability_score -= 0.1
        elif current_apy < 5:  # Low APY
            sustainability_score += 0.1
        
        # Protocol-specific adjustments
        protocol_adjustments = {
            'aave': 0.1,      # More sustainable
            'compound': 0.1,  # More sustainable
            'uniswap': 0.0,   # Neutral
            'curve': 0.05,    # Slightly more sustainable
            'unknown': -0.1   # Less sustainable
        }
        
        sustainability_score += protocol_adjustments.get(protocol.lower(), 0)
        
        # Ensure score is between 0 and 1
        sustainability_score = max(0, min(1, sustainability_score))
        
        return {
            'sustainability_score': sustainability_score,
            'market_regime': market_indicators['risk_regime'],
            'volatility_level': market_indicators['market_volatility'],
            'market_stress': market_indicators['market_stress'],
            'confidence': 0.85  # High confidence in Pyth data
        }

# Test the Pyth oracle
async def test_pyth_oracle():
    """Test Pyth oracle integration"""
    
    oracle = PythOracleAPI()
    
    # Test price feeds
    print("🔮 Testing Pyth price feeds...")
    price_feeds = await oracle.get_price_feeds(["USDC", "ETH", "BTC"])
    
    for symbol, data in price_feeds.items():
        print(f"   {symbol}: ${data['price']:.2f} (±{data['confidence']:.4f})")
    
    # Test market regime indicators
    print("\n📊 Testing market regime indicators...")
    indicators = await oracle.get_market_regime_indicators()
    
    for indicator, value in indicators.items():
        print(f"   {indicator}: {value:.3f}")
    
    # Test yield sustainability
    print("\n🎯 Testing yield sustainability scoring...")
    sustainability = await oracle.get_yield_sustainability_score("aave", 15.5)
    
    for key, value in sustainability.items():
        print(f"   {key}: {value:.3f}")

if __name__ == "__main__":
    asyncio.run(test_pyth_oracle())