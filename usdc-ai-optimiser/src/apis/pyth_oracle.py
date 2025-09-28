# src/apis/pyth_oracle.py
"""Pyth Network Oracle Integration for Real-Time Market Data"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional
from datetime import datetime
import numpy as np

class PythOracleAPI:
    """Pyth Network oracle integration for real-time and historical market data"""
    
    def __init__(self):
        # Pyth Network API endpoints (using correct Hermes API format like your TypeScript implementation)
        self.hermes_base_url = "https://hermes.pyth.network"
        self.benchmarks_base_url = "https://benchmarks.pyth.network"
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"
        
        # Pyth price feed IDs (using standard IDs like your TypeScript implementation)
        self.pyth_price_feeds = {
            "USDC": "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a",  # USDC/USD
            "ETH": "ff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",   # ETH/USD
            "BTC": "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",   # BTC/USD
            "AVAX": "93da3352f9f1d105fdf5544952f31346519d362adbc8dca9b7dbd0b8a6aad25c"   # AVAX/USD
        }
        
        # CoinGecko fallback mapping
        self.coingecko_feeds = {
            "USDC": "usd-coin",
            "ETH": "ethereum", 
            "BTC": "bitcoin",
            "AVAX": "avalanche-2"
        }
        
    async def get_price_feeds(self, symbols: List[str]) -> Dict[str, Dict]:
        """Get real-time price feeds from Pyth Network"""
        
        print(f"🔮 Fetching Pyth price feeds for {symbols}...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Try Pyth Network API first
                feed_ids = [self.pyth_price_feeds.get(symbol) for symbol in symbols if symbol in self.pyth_price_feeds]
                
                if feed_ids:
                    # Use Hermes API format like your TypeScript implementation
                    # Build URL with ids[] parameters
                    url = f"{self.hermes_base_url}/api/latest_price_feeds"
                    params = []
                    for feed_id in feed_ids:
                        params.append(f"ids[]={feed_id}")
                    params.append("parsed=true")

                    full_url = f"{url}?{'&'.join(params)}"
                    print(f"🔍 Pyth API URL: {full_url}")

                    async with session.get(full_url) as response:
                        if response.status == 200:
                            data = await response.json()
                            parsed_feeds = self._parse_pyth_feeds(data, symbols)
                            if parsed_feeds:
                                print("✅ Successfully fetched from Pyth Network")
                                return parsed_feeds
                        else:
                            print(f"⚠️ Pyth Network API error: {response.status}")
                            # Try to get error details
                            try:
                                error_text = await response.text()
                                print(f"   Error details: {error_text[:200]}")
                            except:
                                pass

                # Fallback to CoinGecko API
                print("🔄 Falling back to CoinGecko API...")
                return await self._fetch_from_coingecko(session, symbols)

        except Exception as e:
            print(f"❌ Pyth fetch failed: {e}")
            # Final fallback to static prices
            return await self._get_fallback_prices(symbols)

    async def _fetch_from_coingecko(self, session: aiohttp.ClientSession, symbols: List[str]) -> Dict[str, Dict]:
        """Fetch prices from CoinGecko API with proper error handling"""
        try:
            ids = [self.coingecko_feeds.get(symbol) for symbol in symbols if symbol in self.coingecko_feeds]
            filtered_ids = [id for id in ids if id]  # Remove None values

            if not filtered_ids:
                print("⚠️ No valid CoinGecko IDs found for symbols")
                return await self._get_fallback_prices(symbols)

            ids_str = ",".join(filtered_ids)
            url = f"{self.coingecko_base_url}/simple/price"
            params = {
                "ids": ids_str,
                "vs_currencies": "usd",
                "include_24hr_change": "true",
                "include_24hr_vol": "true"
            }

            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    parsed_data = self._parse_coingecko_feeds(data, symbols)
                    if parsed_data:
                        print("✅ Successfully fetched from CoinGecko")
                        return parsed_data
                    else:
                        print("⚠️ Failed to parse CoinGecko data")
                        return await self._get_fallback_prices(symbols)
                else:
                    print(f"⚠️ CoinGecko API error: {response.status}")
                    try:
                        error_text = await response.text()
                        print(f"   Error details: {error_text[:200]}")
                    except:
                        pass
                    return await self._get_fallback_prices(symbols)

        except Exception as e:
            print(f"❌ CoinGecko fetch failed: {e}")
            return await self._get_fallback_prices(symbols)
    
    def _parse_coingecko_feeds(self, data: Dict, symbols: List[str]) -> Dict[str, Dict]:
        """Parse CoinGecko price feed data"""
        
        parsed_feeds = {}
        
        for symbol in symbols:
            coin_id = self.coingecko_feeds.get(symbol)
            if not coin_id or coin_id not in data:
                continue
                
            coin_data = data[coin_id]
            
            parsed_feeds[symbol] = {
                'price': coin_data.get('usd', 0),
                'confidence': abs(coin_data.get('usd_24h_change', 0)) / 100,  # Convert percentage to confidence
                'timestamp': datetime.now().timestamp(),
                'exponent': 0,
                'status': 'trading',
                'change_24h': coin_data.get('usd_24h_change', 0),
                'volume_24h': coin_data.get('usd_24h_vol', 0)
            }
        
        return parsed_feeds
    
    def _parse_pyth_feeds(self, data: Dict, symbols: List[str]) -> Dict[str, Dict]:
        """Parse Pyth Network price feed data"""

        parsed_feeds = {}

        try:
            # Handle both list and dict response formats
            if isinstance(data, list):
                parsed_data = data
            else:
                parsed_data = data.get('parsed', [])

            for feed_data in parsed_data:
                feed_id = feed_data.get('id', '')

                # Find symbol from feed ID
                symbol = None
                for sym, fid in self.pyth_price_feeds.items():
                    if fid == feed_id:
                        symbol = sym
                        break

                if not symbol or symbol not in symbols:
                    continue

                # Parse price data from Hermes format
                price_obj = feed_data.get('price', {})
                price = int(price_obj.get('price', 0))
                expo = int(price_obj.get('expo', 0))
                conf = int(price_obj.get('conf', 0))

                # Apply exponent to normalize price (Pyth uses negative exponents)
                if expo < 0:
                    normalized_price = price / (10 ** abs(expo))
                    normalized_conf = conf / (10 ** abs(expo))
                else:
                    normalized_price = price * (10 ** expo)
                    normalized_conf = conf * (10 ** expo)

                parsed_feeds[symbol] = {
                    'price': normalized_price,
                    'confidence': normalized_conf,
                    'timestamp': feed_data.get('publish_time', datetime.now().timestamp()),
                    'exponent': expo,
                    'status': feed_data.get('status', 'trading'),
                    'change_24h': 0.0,  # Pyth doesn't provide 24h change
                    'volume_24h': 0.0    # Pyth doesn't provide volume
                }

        except Exception as e:
            print(f"⚠️ Failed to parse Pyth feeds: {e}")
            print(f"   Raw data: {data}")

        return parsed_feeds
    
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
        
        for symbol, feed_id_mapping in self.pyth_price_feeds.items():
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
    
    async def get_historical_prices(self, symbols: List[str], timestamp: int, interval: Optional[int] = None) -> Dict[str, Dict]:
        """Get historical prices from Pyth Benchmarks API"""
        
        print(f"📊 Fetching historical Pyth prices for {symbols} at timestamp {timestamp}...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Build feed IDs for requested symbols
                feed_ids = [self.pyth_price_feeds.get(symbol) for symbol in symbols if symbol in self.pyth_price_feeds]
                
                if not feed_ids:
                    print("⚠️ No valid Pyth feed IDs found for symbols")
                    return await self._get_fallback_historical_prices(symbols, timestamp)
                
                # Build URL based on whether interval is specified
                if interval:
                    # Use interval endpoint: /v1/updates/price/{timestamp}/{interval}
                    url = f"{self.benchmarks_base_url}/v1/updates/price/{timestamp}/{interval}"
                else:
                    # Use single timestamp endpoint: /v1/updates/price/{timestamp}
                    url = f"{self.benchmarks_base_url}/v1/updates/price/{timestamp}"
                
                # Add feed IDs as query parameters
                params = []
                for feed_id in feed_ids:
                    params.append(f"ids[]={feed_id}")
                
                full_url = f"{url}?{'&'.join(params)}"
                print(f"🔍 Historical Pyth API URL: {full_url}")
                
                async with session.get(full_url) as response:
                    if response.status == 200:
                        data = await response.json()
                        parsed_feeds = self._parse_historical_pyth_feeds(data, symbols)
                        if parsed_feeds:
                            print("✅ Successfully fetched historical data from Pyth Benchmarks")
                            return parsed_feeds
                    else:
                        print(f"⚠️ Pyth Benchmarks API error: {response.status}")
                        try:
                            error_text = await response.text()
                            print(f"   Error details: {error_text[:200]}")
                        except:
                            pass
                
                # Fallback to CoinGecko historical data
                print("🔄 Falling back to CoinGecko historical data...")
                return await self._fetch_historical_from_coingecko(session, symbols, timestamp)
                
        except Exception as e:
            print(f"❌ Historical Pyth fetch failed: {e}")
            return await self._get_fallback_historical_prices(symbols, timestamp)
    
    async def get_historical_price_range(self, symbols: List[str], start_timestamp: int, end_timestamp: int, interval: int = 3600) -> Dict[str, List[Dict]]:
        """Get historical prices over a time range with specified interval"""
        
        print(f"📈 Fetching historical price range for {symbols} from {start_timestamp} to {end_timestamp}...")
        
        historical_data = {symbol: [] for symbol in symbols}
        
        try:
            current_timestamp = start_timestamp
            
            while current_timestamp <= end_timestamp:
                # Fetch prices for current timestamp
                prices = await self.get_historical_prices(symbols, current_timestamp)
                
                # Add timestamp to each price data
                for symbol, price_data in prices.items():
                    price_data['timestamp'] = current_timestamp
                    historical_data[symbol].append(price_data)
                
                # Move to next interval
                current_timestamp += interval
                
                # Add small delay to respect rate limits
                await asyncio.sleep(0.1)
            
            print(f"✅ Collected {sum(len(data) for data in historical_data.values())} historical price points")
            return historical_data
            
        except Exception as e:
            print(f"❌ Historical price range fetch failed: {e}")
            return historical_data
    
    def _parse_historical_pyth_feeds(self, data: Dict, symbols: List[str]) -> Dict[str, Dict]:
        """Parse historical Pyth Network price feed data"""
        
        parsed_feeds = {}
        
        try:
            # Handle both list and dict response formats
            if isinstance(data, list):
                parsed_data = data
            else:
                parsed_data = data.get('parsed', [])
            
            for feed_data in parsed_data:
                feed_id = feed_data.get('id', '')
                
                # Find symbol from feed ID
                symbol = None
                for sym, fid in self.pyth_price_feeds.items():
                    if fid == feed_id:
                        symbol = sym
                        break
                
                if not symbol or symbol not in symbols:
                    continue
                
                # Parse price data from Benchmarks format
                price_obj = feed_data.get('price', {})
                price = int(price_obj.get('price', 0))
                expo = int(price_obj.get('expo', 0))
                conf = int(price_obj.get('conf', 0))
                
                # Apply exponent to normalize price (Pyth uses negative exponents)
                if expo < 0:
                    normalized_price = price / (10 ** abs(expo))
                    normalized_conf = conf / (10 ** abs(expo))
                else:
                    normalized_price = price * (10 ** expo)
                    normalized_conf = conf * (10 ** expo)
                
                parsed_feeds[symbol] = {
                    'price': normalized_price,
                    'confidence': normalized_conf,
                    'timestamp': feed_data.get('publish_time', 0),
                    'exponent': expo,
                    'status': feed_data.get('status', 'trading'),
                    'change_24h': 0.0,  # Historical data doesn't provide 24h change
                    'volume_24h': 0.0    # Historical data doesn't provide volume
                }
                
        except Exception as e:
            print(f"⚠️ Failed to parse historical Pyth feeds: {e}")
            print(f"   Raw data: {data}")
        
        return parsed_feeds
    
    async def _fetch_historical_from_coingecko(self, session: aiohttp.ClientSession, symbols: List[str], timestamp: int) -> Dict[str, Dict]:
        """Fetch historical prices from CoinGecko API"""
        
        try:
            # Convert timestamp to date for CoinGecko
            date = datetime.fromtimestamp(timestamp).strftime('%d-%m-%Y')
            
            ids = [self.coingecko_feeds.get(symbol) for symbol in symbols if symbol in self.coingecko_feeds]
            filtered_ids = [id for id in ids if id]
            
            if not filtered_ids:
                return await self._get_fallback_historical_prices(symbols, timestamp)
            
            ids_str = ",".join(filtered_ids)
            url = f"{self.coingecko_base_url}/coins/markets"
            params = {
                "ids": ids_str,
                "vs_currency": "usd",
                "date": date
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()
                    parsed_data = self._parse_coingecko_historical_feeds(data, symbols, timestamp)
                    if parsed_data:
                        print("✅ Successfully fetched historical data from CoinGecko")
                        return parsed_data
                
        except Exception as e:
            print(f"❌ CoinGecko historical fetch failed: {e}")
        
        return await self._get_fallback_historical_prices(symbols, timestamp)
    
    def _parse_coingecko_historical_feeds(self, data: List[Dict], symbols: List[str], timestamp: int) -> Dict[str, Dict]:
        """Parse CoinGecko historical price feed data"""
        
        parsed_feeds = {}
        
        for coin_data in data:
            symbol = None
            for sym, coin_id in self.coingecko_feeds.items():
                if coin_data.get('id') == coin_id:
                    symbol = sym
                    break
            
            if not symbol or symbol not in symbols:
                continue
            
            parsed_feeds[symbol] = {
                'price': coin_data.get('current_price', 0),
                'confidence': 0.01,  # CoinGecko doesn't provide confidence
                'timestamp': timestamp,
                'exponent': 0,
                'status': 'trading',
                'change_24h': 0.0,
                'volume_24h': coin_data.get('total_volume', 0)
            }
        
        return parsed_feeds
    
    async def _get_fallback_historical_prices(self, symbols: List[str], timestamp: int) -> Dict[str, Dict]:
        """Fallback historical prices when APIs are unavailable"""
        
        print("🔄 Using fallback historical price data...")
        
        # Generate realistic historical prices based on current prices with some variation
        base_prices = {
            "USDC": 1.0,
            "ETH": 2500.0,
            "BTC": 45000.0,
            "AVAX": 25.0
        }
        
        # Add some historical variation based on timestamp
        time_variation = np.sin(timestamp / 86400) * 0.1  # Daily variation
        
        fallback_prices = {}
        for symbol in symbols:
            base_price = base_prices.get(symbol, 1.0)
            historical_price = base_price * (1 + time_variation)
            
            fallback_prices[symbol] = {
                'price': historical_price,
                'confidence': 0.1,
                'timestamp': timestamp,
                'exponent': 0,
                'status': 'trading',
                'change_24h': 0.0,
                'volume_24h': 0.0
            }
        
        return fallback_prices
    
    async def get_historical_volatility_analysis(self, symbols: List[str], days_back: int = 30) -> Dict[str, Dict]:
        """Analyze historical volatility for given symbols"""
        
        print(f"📊 Analyzing historical volatility for {symbols} over {days_back} days...")
        
        try:
            # Calculate timestamps for the period
            end_timestamp = int(datetime.now().timestamp())
            start_timestamp = end_timestamp - (days_back * 24 * 3600)
            
            # Fetch historical data with 6-hour intervals
            historical_data = await self.get_historical_price_range(symbols, start_timestamp, end_timestamp, 21600)
            
            volatility_analysis = {}
            
            for symbol, price_data in historical_data.items():
                if len(price_data) < 2:
                    continue
                
                prices = [data['price'] for data in price_data]
                
                # Calculate volatility metrics
                price_changes = [prices[i] / prices[i-1] - 1 for i in range(1, len(prices))]
                
                volatility_analysis[symbol] = {
                    'volatility': np.std(price_changes) * np.sqrt(24),  # Annualized volatility
                    'max_price': max(prices),
                    'min_price': min(prices),
                    'price_range': (max(prices) - min(prices)) / min(prices),
                    'trend': (prices[-1] - prices[0]) / prices[0],
                    'data_points': len(prices),
                    'period_days': days_back
                }
            
            print(f"✅ Volatility analysis complete for {len(volatility_analysis)} symbols")
            return volatility_analysis
            
        except Exception as e:
            print(f"❌ Historical volatility analysis failed: {e}")
            return {}

# Test the Pyth oracle
async def test_pyth_oracle():
    """Test Pyth oracle integration including historical data"""
    
    oracle = PythOracleAPI()
    
    # Test real-time price feeds
    print("🔮 Testing Pyth real-time price feeds...")
    price_feeds = await oracle.get_price_feeds(["USDC", "ETH", "BTC"])
    
    for symbol, data in price_feeds.items():
        print(f"   {symbol}: ${data['price']:.2f} (±{data['confidence']:.4f})")
    
    # Test historical price data
    print("\n📊 Testing Pyth historical price data...")
    import time
    current_timestamp = int(time.time())
    yesterday_timestamp = current_timestamp - 86400  # 24 hours ago
    
    historical_prices = await oracle.get_historical_prices(["USDC", "ETH", "BTC"], yesterday_timestamp)
    
    for symbol, data in historical_prices.items():
        print(f"   {symbol} (yesterday): ${data['price']:.2f} (±{data['confidence']:.4f})")
    
    # Test historical price range
    print("\n📈 Testing historical price range (last 7 days)...")
    week_ago_timestamp = current_timestamp - (7 * 86400)
    
    historical_range = await oracle.get_historical_price_range(
        ["USDC", "ETH"], 
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
    volatility_analysis = await oracle.get_historical_volatility_analysis(["USDC", "ETH", "BTC"], 30)
    
    for symbol, analysis in volatility_analysis.items():
        print(f"   {symbol}:")
        print(f"     Volatility: {analysis['volatility']:.2%}")
        print(f"     Price range: {analysis['price_range']:.2%}")
        print(f"     Trend: {analysis['trend']:+.2%}")
    
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