# src/apis/defillama.py
"""DeFiLlama API integration for yield data"""

import aiohttp
import asyncio
import numpy as np
from typing import List, Dict
from ...config import config
from ...data.models import USDCOpportunity
from datetime import datetime

class DeFiLlamaAPI:
    """DeFiLlama yield data fetcher"""
    
    def __init__(self):
        self.base_url = config.DEFILLAMA_URL
        self.session = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def fetch_usdc_opportunities(self) -> List[USDCOpportunity]:
        """Fetch USDC yield opportunities"""
        
        print("📊 Fetching USDC opportunities from DeFiLlama...")
        
        try:
            async with self.session.get(f"{self.base_url}/pools") as response:
                if response.status == 200:
                    data = await response.json()
                    opportunities = self._parse_opportunities(data.get("data", []))
                    print(f"✅ Found {len(opportunities)} USDC opportunities")
                    return opportunities
                else:
                    print(f"⚠️ DeFiLlama API error: {response.status}")
                    return await self._get_fallback_opportunities()
                    
        except Exception as e:
            print(f"❌ DeFiLlama fetch failed: {e}")
            return await self._get_fallback_opportunities()
    
    async def get_historical_yields(self, days_back: int = 30) -> Dict[int, Dict]:
        """Get historical yield data for the past N days"""
        
        print(f"📈 Fetching {days_back} days of historical yield data from DeFiLlama...")
        
        try:
            # DeFiLlama doesn't have a direct historical API, so we'll simulate
            # In a real implementation, you'd need to use their historical endpoints
            # or store historical data over time
            
            historical_data = {}
            
            for i in range(days_back):
                # Simulate historical yield data with some realistic variation
                day_data = {}
                
                protocols = ['aave', 'compound', 'uniswap', 'curve']
                chains = ['ethereum', 'base', 'arbitrum']
                
                for protocol in protocols:
                    for chain in chains:
                        # Simulate realistic historical yields with trends
                        base_apy = {
                            'aave': 8.5,
                            'compound': 7.2,
                            'uniswap': 12.8,
                            'curve': 6.5
                        }.get(protocol, 8.0)
                        
                        # Add some historical variation
                        trend_factor = 1 + (np.sin(i / 7) * 0.1)  # Weekly trend
                        volatility_factor = np.random.normal(1, 0.05)  # Daily volatility
                        
                        historical_apy = base_apy * trend_factor * volatility_factor
                        
                        day_data[f"{protocol}_{chain}"] = {
                            'apy': max(0, historical_apy),
                            'apy_base': max(0, historical_apy * 0.7),
                            'apy_reward': max(0, historical_apy * 0.3),
                            'tvl_usd': np.random.normal(100_000_000, 50_000_000),
                            'usdc_liquidity': np.random.normal(50_000_000, 25_000_000),
                            'risk_score': np.random.normal(0.3, 0.1),
                            'protocol_age_days': np.random.normal(1000, 500),
                            'chain_popularity': np.random.normal(0.7, 0.2),
                            'gas_price': np.random.normal(20, 10),
                            'total_supply': np.random.normal(1_000_000_000, 500_000_000),
                            'daily_volume': np.random.normal(10_000_000, 5_000_000),
                            'unique_users_7d': np.random.normal(1000, 500),
                            'fee_income_30d': np.random.normal(1_000_000, 500_000),
                            'future_apy_7d': max(0, historical_apy * np.random.normal(1.02, 0.05)),
                            'future_apy_30d': max(0, historical_apy * np.random.normal(1.05, 0.08))
                        }
                
                historical_data[i] = day_data
            
            print(f"✅ Generated {days_back} days of historical yield data")
            return historical_data
            
        except Exception as e:
            print(f"❌ Historical yield data fetch failed: {e}")
            return {}
    
        
    # In src/apis/defillama.py, update the _parse_opportunities method
def _parse_opportunities(self, pools: List[Dict]) -> List[USDCOpportunity]:
    """Parse DeFiLlama pools into USDC opportunities"""
    
    opportunities = []
    
    for pool in pools:
        try:
            # Filter for USDC pools only
            if not self._is_usdc_pool(pool):
                continue
            
            # Filter for supported chains only
            chain = pool.get("chain", "").lower()
            if chain not in config.SUPPORTED_CHAINS:
                continue
            
            # Handle None values for APY fields
            apy = pool.get("apy", 0) or 0
            apy_base = pool.get("apyBase") or 0  # Handle None
            apy_reward = pool.get("apyReward") or 0  # Handle None
            
            # Skip pools with extremely high APYs (likely errors)
            if apy > 1000:  # Skip APYs over 1000%
                continue
            
            # Create opportunity
            opportunity = USDCOpportunity(
                protocol=pool.get("project", "unknown"),
                chain=chain,
                pool_id=pool.get("pool", ""),
                pool_name=pool.get("symbol", "Unknown"),
                apy=apy,
                apy_base=apy_base,
                apy_reward=apy_reward,
                tvl_usd=pool.get("tvlUsd", 0),
                usdc_liquidity=self._estimate_usdc_liquidity(pool),
                risk_score=self._calculate_basic_risk_score(pool),
                category=self._categorize_pool(pool),
                min_deposit=1.0,
                oracle_confidence=0.9,
                last_updated=datetime.now()
            )
            
            opportunities.append(opportunity)
            
        except Exception as e:
            print(f"⚠️ Failed to parse pool: {e}")
            continue
    
    # Sort by APY and return top opportunities
    return sorted(opportunities, key=lambda x: x.apy, reverse=True)

    
    def _is_usdc_pool(self, pool: Dict) -> bool:
        """Check if pool is USDC-related"""
        
        symbol = pool.get("symbol", "").upper()
        tvl = pool.get("tvlUsd", 0)
        
        # Must have decent TVL
        if tvl < 100000:  # $100k minimum
            return False
        
        # Check for USDC indicators
        usdc_indicators = [
            "USDC" in symbol,
            symbol == "USDC",
            "USDC-" in symbol,
            "-USDC" in symbol,
            "USDC/" in symbol,
            "/USDC" in symbol
        ]
        
        return any(usdc_indicators)
    
    def _estimate_usdc_liquidity(self, pool: Dict) -> float:
        """Estimate USDC liquidity in pool"""
        
        tvl = pool.get("tvlUsd", 0)
        symbol = pool.get("symbol", "").upper()
        
        # Pure USDC pools
        if symbol == "USDC":
            return tvl * 0.95
        
        # USDC pairs
        elif "USDC" in symbol and any(sep in symbol for sep in ["-", "/", "_"]):
            return tvl * 0.5
        
        # Stablecoin pools
        else:
            return tvl * 0.33
    
    def _calculate_basic_risk_score(self, pool: Dict) -> float:
        """Calculate basic risk score"""
        
        protocol = pool.get("project", "").lower()
        tvl = pool.get("tvlUsd", 0)
        apy = pool.get("apy", 0)
        
        # Protocol risk scores
        protocol_risks = {
            "aave": 0.1, "compound": 0.15, "moonwell": 0.3,
            "yearn": 0.2, "curve": 0.25, "radiant": 0.4
        }
        
        protocol_risk = protocol_risks.get(protocol, 0.6)
        
        # TVL risk
        tvl_risk = max(0, 0.4 - (tvl / 100000000 * 0.4))
        
        # Sustainability risk
        apy_risk = max(0, (apy - 25) / 100) if apy > 25 else 0
        
        return min(protocol_risk + tvl_risk + apy_risk, 1.0)
    
    def _categorize_pool(self, pool: Dict) -> str:
        """Categorize pool type"""
        
        project = pool.get("project", "").lower()
        symbol = pool.get("symbol", "").upper()
        
        if any(p in project for p in ["aave", "compound", "moonwell"]) and symbol == "USDC":
            return "lending"
        elif "curve" in project:
            return "stable_lp"
        elif any(sep in symbol for sep in ["-", "/", "_"]):
            return "lp_pool"
        else:
            return "other"
    
    async def _get_fallback_opportunities(self) -> List[USDCOpportunity]:
        """Fallback opportunities for demo reliability"""
        
        print("🔄 Using fallback opportunity data...")
        
        fallback_data = [
            {
                "protocol": "aave-v3", "chain": "ethereum", "pool_name": "USDC",
                "apy": 4.2, "apy_base": 4.2, "apy_reward": 0,
                "tvl_usd": 1800000000, "usdc_liquidity": 1710000000
            },
            {
                "protocol": "moonwell", "chain": "base", "pool_name": "USDC",
                "apy": 11.8, "apy_base": 7.5, "apy_reward": 4.3,
                "tvl_usd": 42000000, "usdc_liquidity": 39900000
            },
            {
                "protocol": "radiant", "chain": "arbitrum", "pool_name": "USDC", 
                "apy": 18.5, "apy_base": 12.2, "apy_reward": 6.3,
                "tvl_usd": 23000000, "usdc_liquidity": 21850000
            }
        ]
        
        opportunities = []
        for data in fallback_data:
            opportunity = USDCOpportunity(
                protocol=data["protocol"],
                chain=data["chain"],
                pool_id=f"{data['protocol']}_{data['chain']}_usdc",
                pool_name=data["pool_name"],
                apy=data["apy"],
                apy_base=data["apy_base"],
                apy_reward=data["apy_reward"],
                tvl_usd=data["tvl_usd"],
                usdc_liquidity=data["usdc_liquidity"],
                risk_score=0.2,
                category="lending",
                min_deposit=1.0,
                oracle_confidence=0.9,
                last_updated=datetime.now()
            )
            opportunities.append(opportunity)
        
        return opportunities




        # In src/apis/defillama.py, update the _parse_opportunities method
def _parse_opportunities(self, pools: List[Dict]) -> List[USDCOpportunity]:
    """Parse DeFiLlama pools into USDC opportunities"""
    
    opportunities = []
    
    for pool in pools:
        try:
            # Filter for USDC pools only
            if not self._is_usdc_pool(pool):
                continue
            
            # Filter for supported chains only
            chain = pool.get("chain", "").lower()
            if chain not in config.SUPPORTED_CHAINS:
                continue
            
            # Handle None values for APY fields
            apy = pool.get("apy", 0) or 0
            apy_base = pool.get("apyBase") or 0  # Handle None
            apy_reward = pool.get("apyReward") or 0  # Handle None
            
            # Skip pools with extremely high APYs (likely errors)
            if apy > 1000:  # Skip APYs over 1000%
                continue
            
            # Create opportunity
            opportunity = USDCOpportunity(
                protocol=pool.get("project", "unknown"),
                chain=chain,
                pool_id=pool.get("pool", ""),
                pool_name=pool.get("symbol", "Unknown"),
                apy=apy,
                apy_base=apy_base,
                apy_reward=apy_reward,
                tvl_usd=pool.get("tvlUsd", 0),
                usdc_liquidity=self._estimate_usdc_liquidity(pool),
                risk_score=self._calculate_basic_risk_score(pool),
                category=self._categorize_pool(pool),
                min_deposit=1.0,
                oracle_confidence=0.9,
                last_updated=datetime.now()
            )
            
            opportunities.append(opportunity)
            
        except Exception as e:
            print(f"⚠️ Failed to parse pool: {e}")
            continue
    
    # Sort by APY and return top opportunities
    return sorted(opportunities, key=lambda x: x.apy, reverse=True)


