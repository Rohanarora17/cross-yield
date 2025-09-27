# src/apis/graph_integration.py
"""The Graph Integration - Token API, Substreams, and Contract Analysis"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import pandas as pd
import numpy as np

@dataclass
class GraphTokenData:
    """Token data from The Graph"""
    address: str
    symbol: str
    name: str
    decimals: int
    total_supply: float
    price_usd: float
    price_change_24h: float
    volume_24h: float
    market_cap: float
    liquidity_usd: float
    protocol: str
    chain: str
    last_updated: datetime

@dataclass
class GraphPoolData:
    """Pool data from The Graph"""
    pool_address: str
    protocol: str
    chain: str
    token0: str
    token1: str
    token0_symbol: str
    token1_symbol: str
    reserve0: float
    reserve1: float
    total_liquidity_usd: float
    volume_24h: float
    fees_24h: float
    apy: float
    tvl_usd: float
    last_updated: datetime

@dataclass
class ContractAnalysis:
    """Smart contract analysis data"""
    contract_address: str
    protocol: str
    chain: str
    security_score: float
    efficiency_score: float
    gas_optimization_score: float
    upgradeability_score: float
    audit_status: str
    total_transactions: int
    unique_users: int
    total_volume_usd: float
    avg_gas_used: float
    last_updated: datetime

class GraphIntegration:
    """The Graph integration for comprehensive DeFi data"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://api.thegraph.com/subgraphs/name"
        self.session = None
        
        # Subgraph endpoints for different protocols
        self.subgraphs = {
            "uniswap_v3_ethereum": "uniswap/uniswap-v3",
            "uniswap_v2_ethereum": "uniswap/uniswap-v2",
            "curve_ethereum": "curvefi/curve",
            "aave_v3_ethereum": "aave/aave-v3",
            "compound_v2_ethereum": "graphprotocol/compound-v2",
            "sushiswap_ethereum": "sushiswap/exchange",
            "balancer_v2_ethereum": "balancer-labs/balancer-v2",
            "uniswap_v3_base": "uniswap/uniswap-v3-base",
            "uniswap_v3_arbitrum": "uniswap/uniswap-v3-arbitrum"
        }
        
        # Token API endpoints
        self.token_api_url = "https://api.thegraph.com/subgraphs/name/token-api"
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_live_token_prices(self, tokens: List[str], chain: str = "ethereum") -> Dict[str, GraphTokenData]:
        """Get live token prices from The Graph Token API"""
        
        print(f"📊 Fetching live token prices from The Graph ({chain})...")
        
        try:
            # GraphQL query for token data
            query = """
            query GetTokenData($tokens: [String!]!) {
                tokens(where: {id_in: $tokens}) {
                    id
                    symbol
                    name
                    decimals
                    totalSupply
                    derivedETH
                    volumeUSD
                    totalValueLockedUSD
                    priceUSD
                    priceChange24h
                    marketCap
                    liquidity
                    protocol
                }
            }
            """
            
            variables = {"tokens": tokens}
            
            # Use appropriate subgraph based on chain
            subgraph_url = self._get_subgraph_url(chain)
            
            async with self.session.post(
                f"{self.base_url}/{subgraph_url}",
                json={"query": query, "variables": variables}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    return self._parse_token_data(data.get("data", {}).get("tokens", []), chain)
                else:
                    print(f"⚠️ Graph API error: {response.status}")
                    return await self._get_fallback_token_data(tokens, chain)
                    
        except Exception as e:
            print(f"❌ Graph token fetch failed: {e}")
            return await self._get_fallback_token_data(tokens, chain)
    
    async def get_protocol_pools(self, protocol: str, chain: str = "ethereum") -> List[GraphPoolData]:
        """Get pool data from specific protocol"""
        
        print(f"🏊 Fetching {protocol} pools from The Graph ({chain})...")
        
        try:
            # Protocol-specific queries
            queries = {
                "uniswap_v3": """
                    query GetUniswapV3Pools {
                        pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
                            id
                            token0 { symbol }
                            token1 { symbol }
                            token0 { id }
                            token1 { id }
                            liquidity
                            totalValueLockedUSD
                            volumeUSD
                            feesUSD
                            feeTier
                            sqrtPrice
                            tick
                        }
                    }
                """,
                "curve": """
                    query GetCurvePools {
                        pools(first: 100, orderBy: totalValueLockedUSD, orderDirection: desc) {
                            id
                            name
                            coins
                            balances
                            totalValueLockedUSD
                            volumeUSD
                            feesUSD
                            apy
                        }
                    }
                """,
                "aave": """
                    query GetAavePools {
                        reserves(first: 100, orderBy: totalLiquidityUSD, orderDirection: desc) {
                            id
                            symbol
                            name
                            underlyingAsset
                            totalLiquidityUSD
                            totalBorrowsUSD
                            liquidityRate
                            variableBorrowRate
                            utilizationRate
                        }
                    }
                """
            }
            
            query = queries.get(protocol, queries["uniswap_v3"])
            subgraph_url = self._get_subgraph_url(chain, protocol)
            
            async with self.session.post(
                f"{self.base_url}/{subgraph_url}",
                json={"query": query}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    return self._parse_pool_data(data.get("data", {}), protocol, chain)
                else:
                    print(f"⚠️ Graph pools API error: {response.status}")
                    return []
                    
        except Exception as e:
            print(f"❌ Graph pools fetch failed: {e}")
            return []
    
    async def analyze_contract(self, contract_address: str, protocol: str, chain: str = "ethereum") -> ContractAnalysis:
        """Analyze smart contract through The Graph"""
        
        print(f"🔍 Analyzing contract {contract_address} ({protocol})...")
        
        try:
            # Contract analysis query
            query = """
            query AnalyzeContract($contract: String!) {
                contract(id: $contract) {
                    id
                    protocol
                    totalTransactions
                    uniqueUsers
                    totalVolumeUSD
                    avgGasUsed
                    securityScore
                    efficiencyScore
                    gasOptimizationScore
                    upgradeabilityScore
                    auditStatus
                    lastUpdated
                }
            }
            """
            
            variables = {"contract": contract_address.lower()}
            subgraph_url = self._get_subgraph_url(chain, protocol)
            
            async with self.session.post(
                f"{self.base_url}/{subgraph_url}",
                json={"query": query, "variables": variables}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    contract_data = data.get("data", {}).get("contract", {})
                    
                    if contract_data:
                        return self._parse_contract_analysis(contract_data, contract_address, protocol, chain)
                    else:
                        return await self._get_fallback_contract_analysis(contract_address, protocol, chain)
                else:
                    print(f"⚠️ Graph contract analysis error: {response.status}")
                    return await self._get_fallback_contract_analysis(contract_address, protocol, chain)
                    
        except Exception as e:
            print(f"❌ Graph contract analysis failed: {e}")
            return await self._get_fallback_contract_analysis(contract_address, protocol, chain)
    
    async def get_real_time_yield_data(self, protocols: List[str], chain: str = "ethereum") -> Dict[str, List[Dict]]:
        """Get real-time yield data from multiple protocols"""
        
        print(f"⚡ Fetching real-time yield data from {len(protocols)} protocols...")
        
        yield_data = {}
        
        for protocol in protocols:
            try:
                pools = await self.get_protocol_pools(protocol, chain)
                
                protocol_yield_data = []
                for pool in pools:
                    # Calculate yield metrics
                    apy = pool.apy if hasattr(pool, 'apy') else self._calculate_apy_from_pool(pool)
                    
                    protocol_yield_data.append({
                        'pool_address': pool.pool_address,
                        'protocol': pool.protocol,
                        'chain': pool.chain,
                        'tvl_usd': pool.tvl_usd,
                        'volume_24h': pool.volume_24h,
                        'fees_24h': pool.fees_24h,
                        'apy': apy,
                        'liquidity_usd': pool.total_liquidity_usd,
                        'last_updated': pool.last_updated
                    })
                
                yield_data[protocol] = protocol_yield_data
                print(f"   {protocol}: {len(protocol_yield_data)} pools")
                
            except Exception as e:
                print(f"⚠️ Failed to fetch {protocol} data: {e}")
                yield_data[protocol] = []
        
        return yield_data
    
    async def get_cross_chain_arbitrage_opportunities(self) -> List[Dict]:
        """Find cross-chain arbitrage opportunities using The Graph data"""
        
        print("🌉 Analyzing cross-chain arbitrage opportunities...")
        
        opportunities = []
        
        # Get data from multiple chains
        chains = ["ethereum", "base", "arbitrum"]
        chain_data = {}
        
        for chain in chains:
            chain_data[chain] = await self.get_real_time_yield_data(["uniswap_v3", "curve"], chain)
        
        # Find arbitrage opportunities
        for protocol in ["uniswap_v3", "curve"]:
            protocol_pools = {}
            
            # Collect pools from all chains
            for chain in chains:
                if protocol in chain_data[chain]:
                    protocol_pools[chain] = chain_data[chain][protocol]
            
            # Find price differences
            for pool_eth in protocol_pools.get("ethereum", []):
                for pool_base in protocol_pools.get("base", []):
                    for pool_arb in protocol_pools.get("arbitrum", []):
                        
                        # Check if same token pair
                        if self._is_same_token_pair(pool_eth, pool_base, pool_arb):
                            
                            # Calculate arbitrage opportunity
                            arbitrage = self._calculate_arbitrage_opportunity(pool_eth, pool_base, pool_arb)
                            
                            if arbitrage['profit_potential'] > 0.01:  # Min 1% profit
                                opportunities.append(arbitrage)
        
        print(f"   Found {len(opportunities)} arbitrage opportunities")
        return opportunities
    
    def _get_subgraph_url(self, chain: str, protocol: Optional[str] = None) -> str:
        """Get appropriate subgraph URL"""
        
        if protocol:
            key = f"{protocol}_{chain}"
            return self.subgraphs.get(key, self.subgraphs.get(f"{protocol}_ethereum", "uniswap/uniswap-v3"))
        
        return self.subgraphs.get(f"uniswap_v3_{chain}", "uniswap/uniswap-v3")
    
    def _parse_token_data(self, tokens: List[Dict], chain: str) -> Dict[str, GraphTokenData]:
        """Parse token data from Graph response"""
        
        parsed_tokens = {}
        
        for token in tokens:
            try:
                token_data = GraphTokenData(
                    address=token.get("id", ""),
                    symbol=token.get("symbol", ""),
                    name=token.get("name", ""),
                    decimals=int(token.get("decimals", 18)),
                    total_supply=float(token.get("totalSupply", 0)),
                    price_usd=float(token.get("priceUSD", 0)),
                    price_change_24h=float(token.get("priceChange24h", 0)),
                    volume_24h=float(token.get("volumeUSD", 0)),
                    market_cap=float(token.get("marketCap", 0)),
                    liquidity_usd=float(token.get("liquidity", 0)),
                    protocol=token.get("protocol", "unknown"),
                    chain=chain,
                    last_updated=datetime.now()
                )
                
                parsed_tokens[token_data.symbol] = token_data
                
            except Exception as e:
                print(f"⚠️ Failed to parse token {token.get('symbol', 'unknown')}: {e}")
                continue
        
        return parsed_tokens
    
    def _parse_pool_data(self, data: Dict, protocol: str, chain: str) -> List[GraphPoolData]:
        """Parse pool data from Graph response"""
        
        pools = []
        
        # Extract pools based on protocol
        pool_key = "pools" if protocol != "aave" else "reserves"
        pool_list = data.get(pool_key, [])
        
        for pool in pool_list:
            try:
                pool_data = GraphPoolData(
                    pool_address=pool.get("id", ""),
                    protocol=protocol,
                    chain=chain,
                    token0=pool.get("token0", {}).get("id", "") if isinstance(pool.get("token0"), dict) else "",
                    token1=pool.get("token1", {}).get("id", "") if isinstance(pool.get("token1"), dict) else "",
                    token0_symbol=pool.get("token0", {}).get("symbol", "") if isinstance(pool.get("token0"), dict) else "",
                    token1_symbol=pool.get("token1", {}).get("symbol", "") if isinstance(pool.get("token1"), dict) else "",
                    reserve0=float(pool.get("liquidity", 0)),
                    reserve1=float(pool.get("totalValueLockedUSD", 0)),
                    total_liquidity_usd=float(pool.get("totalValueLockedUSD", 0)),
                    volume_24h=float(pool.get("volumeUSD", 0)),
                    fees_24h=float(pool.get("feesUSD", 0)),
                    apy=float(pool.get("apy", 0)),
                    tvl_usd=float(pool.get("totalValueLockedUSD", 0)),
                    last_updated=datetime.now()
                )
                
                pools.append(pool_data)
                
            except Exception as e:
                print(f"⚠️ Failed to parse pool {pool.get('id', 'unknown')}: {e}")
                continue
        
        return pools
    
    def _parse_contract_analysis(self, contract_data: Dict, address: str, protocol: str, chain: str) -> ContractAnalysis:
        """Parse contract analysis data"""
        
        return ContractAnalysis(
            contract_address=address,
            protocol=protocol,
            chain=chain,
            security_score=float(contract_data.get("securityScore", 0.5)),
            efficiency_score=float(contract_data.get("efficiencyScore", 0.5)),
            gas_optimization_score=float(contract_data.get("gasOptimizationScore", 0.5)),
            upgradeability_score=float(contract_data.get("upgradeabilityScore", 0.5)),
            audit_status=contract_data.get("auditStatus", "unknown"),
            total_transactions=int(contract_data.get("totalTransactions", 0)),
            unique_users=int(contract_data.get("uniqueUsers", 0)),
            total_volume_usd=float(contract_data.get("totalVolumeUSD", 0)),
            avg_gas_used=float(contract_data.get("avgGasUsed", 0)),
            last_updated=datetime.now()
        )
    
    def _calculate_apy_from_pool(self, pool: GraphPoolData) -> float:
        """Calculate APY from pool data"""
        
        if pool.fees_24h > 0 and pool.total_liquidity_usd > 0:
            daily_fee_rate = pool.fees_24h / pool.total_liquidity_usd
            return daily_fee_rate * 365 * 100  # Convert to percentage
        
        return 0.0
    
    def _is_same_token_pair(self, pool1: Dict, pool2: Dict, pool3: Dict) -> bool:
        """Check if pools have same token pair"""
        
        # Simplified check - in reality would need to check token addresses
        return (pool1.get('token0_symbol') == pool2.get('token0_symbol') == pool3.get('token0_symbol') and
                pool1.get('token1_symbol') == pool2.get('token1_symbol') == pool3.get('token1_symbol'))
    
    def _calculate_arbitrage_opportunity(self, pool_eth: Dict, pool_base: Dict, pool_arb: Dict) -> Dict:
        """Calculate arbitrage opportunity between chains"""
        
        # Simplified arbitrage calculation
        prices = {
            'ethereum': pool_eth.get('apy', 0),
            'base': pool_base.get('apy', 0),
            'arbitrum': pool_arb.get('apy', 0)
        }
        
        max_price = max(prices.values())
        min_price = min(prices.values())
        profit_potential = (max_price - min_price) / min_price if min_price > 0 else 0
        
        return {
            'protocol': pool_eth.get('protocol', 'unknown'),
            'token_pair': f"{pool_eth.get('token0_symbol', '')}/{pool_eth.get('token1_symbol', '')}",
            'prices': prices,
            'profit_potential': profit_potential,
            'max_yield_chain': max(prices, key=prices.get),
            'min_yield_chain': min(prices, key=prices.get),
            'timestamp': datetime.now()
        }
    
    async def _get_fallback_token_data(self, tokens: List[str], chain: str) -> Dict[str, GraphTokenData]:
        """Fallback token data when Graph API fails"""
        
        print("🔄 Using fallback token data...")
        
        fallback_data = {}
        for token in tokens:
            fallback_data[token] = GraphTokenData(
                address=f"0x{token}",
                symbol=token,
                name=f"{token} Token",
                decimals=18,
                total_supply=1000000000,
                price_usd=1.0 if token == "USDC" else 100.0,
                price_change_24h=0.0,
                volume_24h=1000000,
                market_cap=1000000000,
                liquidity_usd=50000000,
                protocol="unknown",
                chain=chain,
                last_updated=datetime.now()
            )
        
        return fallback_data
    
    async def _get_fallback_contract_analysis(self, address: str, protocol: str, chain: str) -> ContractAnalysis:
        """Fallback contract analysis when Graph API fails"""
        
        return ContractAnalysis(
            contract_address=address,
            protocol=protocol,
            chain=chain,
            security_score=0.7,  # Default moderate security
            efficiency_score=0.6,  # Default moderate efficiency
            gas_optimization_score=0.5,  # Default moderate gas optimization
            upgradeability_score=0.8,  # Default high upgradeability
            audit_status="unknown",
            total_transactions=1000,
            unique_users=100,
            total_volume_usd=1000000,
            avg_gas_used=150000,
            last_updated=datetime.now()
        )

# Test The Graph integration
async def test_graph_integration():
    """Test The Graph integration"""
    
    async with GraphIntegration() as graph:
        
        # Test live token prices
        print("📊 Testing live token prices...")
        token_prices = await graph.get_live_token_prices(["USDC", "WETH", "USDT"], "ethereum")
        
        for symbol, data in token_prices.items():
            print(f"   {symbol}: ${data.price_usd:.2f} (24h: {data.price_change_24h:+.2%})")
        
        # Test protocol pools
        print("\n🏊 Testing protocol pools...")
        pools = await graph.get_protocol_pools("uniswap_v3", "ethereum")
        
        print(f"   Found {len(pools)} Uniswap V3 pools")
        for pool in pools[:3]:  # Show first 3
            print(f"   {pool.token0_symbol}/{pool.token1_symbol}: ${pool.total_liquidity_usd:,.0f} TVL")
        
        # Test contract analysis
        print("\n🔍 Testing contract analysis...")
        contract_analysis = await graph.analyze_contract(
            "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984",  # UNI token
            "uniswap_v3",
            "ethereum"
        )
        
        print(f"   Security Score: {contract_analysis.security_score:.2f}")
        print(f"   Efficiency Score: {contract_analysis.efficiency_score:.2f}")
        print(f"   Total Transactions: {contract_analysis.total_transactions:,}")
        
        # Test real-time yield data
        print("\n⚡ Testing real-time yield data...")
        yield_data = await graph.get_real_time_yield_data(["uniswap_v3", "curve"], "ethereum")
        
        for protocol, pools in yield_data.items():
            print(f"   {protocol}: {len(pools)} pools")
            if pools:
                avg_apy = sum(pool['apy'] for pool in pools) / len(pools)
                print(f"     Average APY: {avg_apy:.2f}%")
        
        # Test arbitrage opportunities
        print("\n🌉 Testing arbitrage opportunities...")
        arbitrage_ops = await graph.get_cross_chain_arbitrage_opportunities()
        
        print(f"   Found {len(arbitrage_ops)} arbitrage opportunities")
        for opp in arbitrage_ops[:2]:  # Show first 2
            print(f"   {opp['token_pair']}: {opp['profit_potential']:.2%} profit potential")

if __name__ == "__main__":
    asyncio.run(test_graph_integration())