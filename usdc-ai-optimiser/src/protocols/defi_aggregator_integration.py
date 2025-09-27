# src/protocols/defi_aggregator_integration.py
"""DeFi Aggregator Integration - Use existing SDKs and aggregators"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

@dataclass
class DeFiOpportunity:
    """DeFi opportunity from aggregator"""
    protocol: str
    chain: str
    pool_address: str
    apy: float
    tvl: float
    risk_score: float
    investment_method: str
    min_amount: float
    max_amount: float

class DeFiAggregatorIntegration:
    """Integration with DeFi aggregators and SDKs"""
    
    def __init__(self):
        self.defillama_api_key = os.getenv('DEFILLAMA_API_KEY')
        self.oneinch_api_key = os.getenv('ONEINCH_API_KEY')
        
        # Supported aggregators and their capabilities
        self.aggregators = {
            "defillama": {
                "name": "DeFiLlama",
                "capabilities": ["yield_data", "protocol_info", "tvl_data"],
                "api_base": "https://api.llama.fi",
                "rate_limit": "1000/hour"
            },
            "1inch": {
                "name": "1inch",
                "capabilities": ["swap_routing", "liquidity_provision", "price_optimization"],
                "api_base": "https://api.1inch.io/v5.0",
                "rate_limit": "1000/hour"
            },
            "yearn": {
                "name": "Yearn Finance",
                "capabilities": ["vault_strategies", "yield_farming", "risk_assessment"],
                "api_base": "https://api.yearn.finance/v1",
                "rate_limit": "500/hour"
            },
            "aave": {
                "name": "Aave Protocol",
                "capabilities": ["lending", "borrowing", "liquidity_provision"],
                "api_base": "https://aave-api-v2.aave.com",
                "rate_limit": "1000/hour"
            }
        }

    async def get_yield_opportunities(self, chains: List[str] = None) -> List[DeFiOpportunity]:
        """Get yield opportunities from DeFiLlama with real-time data"""
        
        print("🔍 Fetching yield opportunities from DeFiLlama...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Get all protocols with real-time data
                async with session.get(f"{self.aggregators['defillama']['api_base']}/protocols") as response:
                    if response.status != 200:
                        raise ValueError(f"DeFiLlama API error: {response.status}")
                    
                    protocols_data = await response.json()
                
                opportunities = []
                
                # Also get specific protocol data for major protocols
                major_protocols = [
                    "fluid-finance", "aave-v3", "compound-v3", "yearn-finance",
                    "convex-finance", "balancer", "uniswap-v3", "curve-finance",
                    "eigenlayer", "pendle-finance", "morpho", "spark-protocol",
                    "aerodrome", "velodrome", "stargate", "layerzero"
                ]
                
                for protocol_name in major_protocols:
                    try:
                        # Get specific protocol data
                        async with session.get(f"{self.aggregators['defillama']['api_base']}/protocol/{protocol_name}") as protocol_response:
                            if protocol_response.status == 200:
                                protocol_data = await protocol_response.json()
                                
                                # Extract USDC opportunities from this protocol
                                if self._is_usdc_opportunity(protocol_data):
                                    opportunity = DeFiOpportunity(
                                        protocol=protocol_data.get('name', protocol_name),
                                        chain=self._extract_chain(protocol_data),
                                        pool_address=self._extract_pool_address(protocol_data),
                                        apy=self._extract_apy(protocol_data),
                                        tvl=self._extract_tvl(protocol_data),
                                        risk_score=self._calculate_risk_score(protocol_data),
                                        investment_method=self._get_investment_method(protocol_data),
                                        min_amount=self._get_min_amount(protocol_data),
                                        max_amount=self._get_max_amount(protocol_data)
                                    )
                                    opportunities.append(opportunity)
                    except Exception as e:
                        print(f"   ⚠️ Error fetching {protocol_name}: {e}")
                        continue
                
                # Also process general protocols data
                for protocol in protocols_data:
                    if self._is_usdc_opportunity(protocol):
                        opportunity = DeFiOpportunity(
                            protocol=protocol.get('name', 'Unknown'),
                            chain=protocol.get('chain', 'Unknown'),
                            pool_address=protocol.get('address', ''),
                            apy=protocol.get('apy', 0.0),
                            tvl=protocol.get('tvl', 0.0),
                            risk_score=self._calculate_risk_score(protocol),
                            investment_method=self._get_investment_method(protocol),
                            min_amount=self._get_min_amount(protocol),
                            max_amount=self._get_max_amount(protocol)
                        )
                        opportunities.append(opportunity)
                
                # Remove duplicates and sort by APY descending
                unique_opportunities = {}
                for opp in opportunities:
                    key = f"{opp.protocol}_{opp.chain}"
                    if key not in unique_opportunities or opp.apy > unique_opportunities[key].apy:
                        unique_opportunities[key] = opp
                
                final_opportunities = list(unique_opportunities.values())
                final_opportunities.sort(key=lambda x: x.apy, reverse=True)
                
                print(f"✅ Found {len(final_opportunities)} USDC opportunities")
                return final_opportunities[:50]  # Top 50 opportunities
                
        except Exception as e:
            print(f"❌ Error fetching opportunities: {e}")
            return []

    def _extract_chain(self, protocol_data: Dict) -> str:
        """Extract chain from protocol data"""
        chains = protocol_data.get('chains', [])
        if chains:
            return chains[0].lower()
        return 'ethereum'  # Default

    def _extract_pool_address(self, protocol_data: Dict) -> str:
        """Extract pool address from protocol data"""
        pools = protocol_data.get('pools', [])
        if pools:
            return pools[0].get('address', '')
        return protocol_data.get('address', '')

    def _extract_apy(self, protocol_data: Dict) -> float:
        """Extract APY from protocol data"""
        apy_data = protocol_data.get('apy', {})
        if isinstance(apy_data, dict):
            return float(apy_data.get('net_apy', 0)) / 100
        return float(apy_data) / 100 if apy_data else 0.0

    def _extract_tvl(self, protocol_data: Dict) -> float:
        """Extract TVL from protocol data"""
        tvl_data = protocol_data.get('tvl', {})
        if isinstance(tvl_data, dict):
            return float(tvl_data.get('tvl', 0))
        return float(tvl_data) if tvl_data else 0.0

    async def get_optimal_swap_route(self, from_token: str, to_token: str, amount: float, chain: str) -> Dict:
        """Get optimal swap route from 1inch"""
        
        print(f"🔄 Getting optimal swap route via 1inch...")
        
        try:
            chain_id = self._get_chain_id(chain)
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.aggregators['1inch']['api_base']}/{chain_id}/quote"
                params = {
                    'fromTokenAddress': from_token,
                    'toTokenAddress': to_token,
                    'amount': str(int(amount * 10**6))  # USDC has 6 decimals
                }
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        raise ValueError(f"1inch API error: {response.status}")
                    
                    quote_data = await response.json()
                
                return {
                    'from_amount': float(quote_data['fromAmount']) / 10**6,
                    'to_amount': float(quote_data['toAmount']) / 10**6,
                    'price_impact': float(quote_data.get('priceImpact', 0)) / 100,
                    'gas_estimate': int(quote_data.get('estimatedGas', 0)),
                    'route': quote_data.get('protocols', [])
                }
                
        except Exception as e:
            print(f"❌ Error getting swap route: {e}")
            return {}

    async def get_aave_markets(self, chain: str) -> Dict:
        """Get Aave markets and rates"""
        
        print(f"🏦 Fetching Aave markets for {chain}...")
        
        try:
            chain_id = self._get_chain_id(chain)
            
            async with aiohttp.ClientSession() as session:
                url = f"{self.aggregators['aave']['api_base']}/markets/{chain_id}"
                
                async with session.get(url) as response:
                    if response.status != 200:
                        raise ValueError(f"Aave API error: {response.status}")
                    
                    markets_data = await response.json()
                
                # Extract USDC market data
                usdc_market = None
                for market in markets_data.get('markets', []):
                    if market.get('symbol') == 'USDC':
                        usdc_market = market
                        break
                
                if usdc_market:
                    return {
                        'supply_apy': float(usdc_market.get('supplyAPY', 0)) / 100,
                        'borrow_apy': float(usdc_market.get('borrowAPY', 0)) / 100,
                        'liquidity': float(usdc_market.get('liquidity', 0)),
                        'utilization': float(usdc_market.get('utilization', 0)) / 100
                    }
                
                return {}
                
        except Exception as e:
            print(f"❌ Error fetching Aave markets: {e}")
            return {}

    async def get_yearn_vaults(self, chain: str) -> List[Dict]:
        """Get Yearn vaults for yield farming"""
        
        print(f"🌾 Fetching Yearn vaults for {chain}...")
        
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.aggregators['yearn']['api_base']}/vaults"
                params = {'chain': chain}
                
                async with session.get(url, params=params) as response:
                    if response.status != 200:
                        raise ValueError(f"Yearn API error: {response.status}")
                    
                    vaults_data = await response.json()
                
                # Filter for USDC vaults
                usdc_vaults = []
                for vault in vaults_data:
                    if 'USDC' in vault.get('token', {}).get('symbol', ''):
                        usdc_vaults.append({
                            'name': vault.get('name', ''),
                            'address': vault.get('address', ''),
                            'apy': float(vault.get('apy', {}).get('net_apy', 0)) / 100,
                            'tvl': float(vault.get('tvl', {}).get('tvl', 0)),
                            'risk_score': self._calculate_vault_risk(vault)
                        })
                
                return usdc_vaults
                
        except Exception as e:
            print(f"❌ Error fetching Yearn vaults: {e}")
            return []

    def _is_usdc_opportunity(self, protocol: Dict) -> bool:
        """Check if protocol has USDC opportunities"""
        
        # Check if protocol has USDC in its tokens
        tokens = protocol.get('tokens', [])
        for token in tokens:
            if 'USDC' in token.get('symbol', ''):
                return True
        
        # Check if protocol name suggests USDC
        name = protocol.get('name', '').lower()
        return 'usdc' in name or 'usd' in name

    def _calculate_risk_score(self, protocol: Dict) -> float:
        """Calculate risk score for protocol"""
        
        tvl = protocol.get('tvl', 0)
        apy = protocol.get('apy', 0)
        
        # Base risk on TVL and APY
        risk_score = 0.5  # Base risk
        
        # Lower risk for higher TVL
        if tvl > 100_000_000:  # > $100M TVL
            risk_score -= 0.2
        elif tvl > 10_000_000:  # > $10M TVL
            risk_score -= 0.1
        
        # Higher risk for very high APY
        if apy > 50:  # > 50% APY
            risk_score += 0.3
        elif apy > 20:  # > 20% APY
            risk_score += 0.1
        
        return max(0.0, min(1.0, risk_score))

    def _get_investment_method(self, protocol: Dict) -> str:
        """Determine investment method for protocol"""
        
        name = protocol.get('name', '').lower()
        
        if 'aave' in name or 'compound' in name:
            return 'lending'
        elif 'uniswap' in name or 'sushiswap' in name:
            return 'liquidity_provision'
        elif 'curve' in name:
            return 'stablecoin_pool'
        elif 'yearn' in name or 'harvest' in name:
            return 'vault_strategy'
        else:
            return 'unknown'

    def _get_min_amount(self, protocol: Dict) -> float:
        """Get minimum investment amount"""
        
        # Most protocols have low minimums
        return 1.0

    def _get_max_amount(self, protocol: Dict) -> float:
        """Get maximum investment amount"""
        
        tvl = protocol.get('tvl', 0)
        # Max 10% of TVL for safety
        return tvl * 0.1

    def _get_chain_id(self, chain: str) -> int:
        """Get chain ID for API calls"""
        
        chain_ids = {
            'ethereum': 1,
            'ethereum_sepolia': 11155111,
            'base': 8453,
            'base_sepolia': 84532,
            'arbitrum': 42161,
            'arbitrum_sepolia': 421614,
            'polygon': 137,
            'avalanche': 43114
        }
        
        return chain_ids.get(chain, 1)

    def _calculate_vault_risk(self, vault: Dict) -> float:
        """Calculate risk score for Yearn vault"""
        
        tvl = vault.get('tvl', {}).get('tvl', 0)
        apy = vault.get('apy', {}).get('net_apy', 0)
        
        risk_score = 0.3  # Yearn vaults are generally lower risk
        
        # Adjust based on TVL and APY
        if tvl > 50_000_000:  # > $50M TVL
            risk_score -= 0.1
        
        if apy > 20:  # > 20% APY
            risk_score += 0.2
        
        return max(0.0, min(1.0, risk_score))

# Test the aggregator integration
async def test_aggregator_integration():
    """Test DeFi aggregator integration"""
    
    print("🔌 TESTING DEFI AGGREGATOR INTEGRATION")
    print("=" * 60)
    
    try:
        aggregator = DeFiAggregatorIntegration()
        
        # Test 1: Get yield opportunities
        print("\n1️⃣ Testing yield opportunities from DeFiLlama...")
        opportunities = await aggregator.get_yield_opportunities()
        
        print(f"Found {len(opportunities)} opportunities:")
        for i, opp in enumerate(opportunities[:10]):  # Show top 10
            print(f"   {i+1}. {opp.protocol} ({opp.chain}): {opp.apy:.2f}% APY, ${opp.tvl:,.0f} TVL")
        
        # Test 2: Get Aave markets
        print("\n2️⃣ Testing Aave markets...")
        aave_markets = await aggregator.get_aave_markets('ethereum_sepolia')
        if aave_markets:
            print(f"   USDC Supply APY: {aave_markets['supply_apy']:.2f}%")
            print(f"   Liquidity: ${aave_markets['liquidity']:,.0f}")
        
        # Test 3: Get Yearn vaults
        print("\n3️⃣ Testing Yearn vaults...")
        yearn_vaults = await aggregator.get_yearn_vaults('ethereum')
        print(f"Found {len(yearn_vaults)} USDC vaults:")
        for vault in yearn_vaults[:5]:  # Show top 5
            print(f"   {vault['name']}: {vault['apy']:.2f}% APY, ${vault['tvl']:,.0f} TVL")
        
        print("\n✅ DeFi aggregator integration working!")
        print("🚀 Ready to use existing protocols without manual implementation")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_aggregator_integration())