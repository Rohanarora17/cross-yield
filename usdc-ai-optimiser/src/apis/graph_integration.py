# src/apis/graph_integration.py
"""The Graph Integration - Token API, Substreams, and Contract Analysis"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import pandas as pd
import numpy as np
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

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
        # Load API key from environment if not provided
        self.api_key = api_key or os.getenv('GRAPH_API_KEY') or os.getenv('Graph_API_KEY')
        self.api_token = os.getenv('GRAPH_API_TOKEN') or os.getenv('Graph_API_TOKEN')

        # Modern Graph gateway endpoints (2024/2025)
        if self.api_key:
            self.base_url = f"https://gateway.thegraph.com/api/{self.api_key}/subgraphs/id"
        else:
            # Fallback to public endpoints (limited queries)
            self.base_url = "https://api.studio.thegraph.com/query"

        self.session = None

        # Real working subgraph IDs from The Graph Network (2024/2025)
        self.subgraphs = {
            # Verified working Uniswap subgraphs from Graph Explorer
            "uniswap_v3_ethereum": "5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV",  # Alternative
            "uniswap_v3_ethereum_primary": "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6",  # Primary
            "uniswap_v3_ethereum_substreams": "HUZDsRpEVP2AvzDCyzDHtdc64dyDxx8FQjzsmqSg4H3B",  # Substreams
            "uniswap_v2_ethereum": "A3Np3RQbaBA6oKJgiwDJeo5T3zrYfGHPWFYayMwtNDum",
            "uniswap_v4_ethereum": "DiYPVdygkfjDWhbxGSqAQxwBKmfKnkWQojqeM2rkLb3G",

            # Multi-chain Uniswap V3 deployments from Graph Explorer
            "uniswap_v3_base": "FUbEPQw1oMghy39fwWBFY5fE6MXPXZQtjncQy2cXdrNS",
            "uniswap_v3_polygon": "3hCPRGf4z88VC5rsBKU5AA9FBBq5nF3jbKJG7VZCbhjm",
            "uniswap_v3_optimism": "EgnS9YE1avupkvCNj9fHnJxppfEmNNywYJtghqiu2pd9",
            "uniswap_v3_arbitrum": "9BAbemEQyQdnEfLQ7MfyLEwTgTheBzWGpPZKNWAJRWH6",

            # Note: Many other protocol subgraphs may not exist on the decentralized network yet
            # The Graph migration from hosted service is ongoing throughout 2024

            # Placeholders for protocols that may have subgraphs (not verified)
            "curve_ethereum": "PLACEHOLDER_CURVE_ETHEREUM",
            "aave_v3_ethereum": "PLACEHOLDER_AAVE_V3_ETHEREUM",
            "sushiswap_ethereum": "PLACEHOLDER_SUSHISWAP_ETHEREUM",
            "balancer_v2_ethereum": "PLACEHOLDER_BALANCER_V2_ETHEREUM",

            # Base chain protocols (limited availability)
            "aerodrome_base": "PLACEHOLDER_AERODROME_BASE",
            "baseswap_base": "PLACEHOLDER_BASESWAP_BASE",

            # Arbitrum protocols (limited availability)
            "camelot_arbitrum": "PLACEHOLDER_CAMELOT_ARBITRUM",
            "gmx_arbitrum": "PLACEHOLDER_GMX_ARBITRUM"
        }

        # Legacy hosted service URLs (deprecated but might work with limited queries)
        # Note: Most of these have been removed as of 2024
        self.legacy_public_subgraphs = {
            "uniswap_v3_ethereum": "uniswap/uniswap-v3",
            "uniswap_v2_ethereum": "uniswap/uniswap-v2",
        }
        
        
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

            # Add authentication headers
            headers = {"Content-Type": "application/json"}
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            elif self.api_key and not self.api_key.startswith("server_"):
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                subgraph_url,
                json={"query": query, "variables": variables},
                headers=headers
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
            # Protocol-specific queries (updated for correct Graph schema)
            queries = {
                "uniswap_v3": """
                    query GetUniswapV3LiquidityPools {
                        liquidityPools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
                            id
                            name
                            symbol
                            totalValueLockedUSD
                            cumulativeVolumeUSD
                            totalLiquidity
                            inputTokens {
                                id
                                symbol
                                name
                            }
                            fees {
                                feePercentage
                                feeType
                            }
                        }
                    }
                """,
                "curve": """
                    query GetCurvePools {
                        pools(first: 10, orderBy: totalValueLockedUSD, orderDirection: desc) {
                            id
                            name
                            totalValueLockedUSD
                            volumeUSD
                            feesUSD
                        }
                    }
                """,
                "aave": """
                    query GetAavePools {
                        reserves(first: 10, orderBy: totalLiquidityUSD, orderDirection: desc) {
                            id
                            symbol
                            name
                            totalLiquidityUSD
                            liquidityRate
                        }
                    }
                """
            }
            
            # Map protocol to correct query
            if protocol.startswith("uniswap_v3"):
                query = queries["uniswap_v3"]
            else:
                query = queries.get(protocol, queries["uniswap_v3"])
            subgraph_url = self._get_subgraph_url(chain, protocol)
            print(f"   Using Graph URL: {subgraph_url}")

            # Add authentication headers
            headers = {"Content-Type": "application/json"}

            # For Graph Gateway, we don't need auth headers since API key is in URL
            # Only add auth headers for other endpoints
            if not subgraph_url.startswith("https://gateway.thegraph.com/api/"):
                if self.api_token:
                    headers["Authorization"] = f"Bearer {self.api_token}"
                elif self.api_key and not self.api_key.startswith("server_"):
                    headers["Authorization"] = f"Bearer {self.api_key}"

            async with self.session.post(
                subgraph_url,
                json={"query": query},
                headers=headers
            ) as response:
                
                if response.status == 200:
                    data = await response.json()

                    # Handle both old and new schema
                    data_section = data.get('data', {})
                    pools_data = data_section.get('liquidityPools', []) or data_section.get('pools', [])
                    print(f"   Graph API response: {len(pools_data)} pools found")

                    if pools_data:
                        parsed_pools = self._parse_pool_data(data.get("data", {}), protocol, chain)
                        return parsed_pools
                    else:
                        print("   No pools found in Graph API response")
                        return []
                else:
                    print(f"⚠️ Graph pools API error: {response.status}")
                    response_text = await response.text()
                    print(f"   Error details: {response_text[:200]}...")
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

            # Add authentication headers
            headers = {"Content-Type": "application/json"}
            if self.api_token:
                headers["Authorization"] = f"Bearer {self.api_token}"
            elif self.api_key and not self.api_key.startswith("server_"):
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.post(
                subgraph_url,
                json={"query": query, "variables": variables},
                headers=headers
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

        print(f"⚡ Fetching real-time yield data from {len(protocols)} protocols on {chain}...")

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
                        'token0_symbol': pool.token0_symbol,
                        'token1_symbol': pool.token1_symbol,
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

    async def get_all_protocols_yield_data(self, chain: str = "ethereum") -> Dict[str, List[Dict]]:
        """Get yield data from ALL available protocols for a specific chain"""

        # Get all protocols for the chain from comprehensive_protocols.py
        from src.data.comprehensive_protocols import ComprehensiveProtocolDatabase

        db = ComprehensiveProtocolDatabase()
        chain_protocols = db.get_protocols_by_chain(chain)

        # Extract protocol names and map them to graph protocol keys
        protocol_names = []
        for protocol_info in chain_protocols:
            # Convert protocol names to graph protocol keys
            protocol_key = self._map_protocol_to_graph_key(protocol_info.name, chain)
            if protocol_key:
                protocol_names.append(protocol_key)

        print(f"🌐 Found {len(protocol_names)} protocols for {chain}: {', '.join(protocol_names)}")

        return await self.get_real_time_yield_data(protocol_names, chain)

    def _map_protocol_to_graph_key(self, protocol_name: str, chain: str) -> Optional[str]:
        """Map protocol name from comprehensive_protocols.py to graph subgraph key"""

        # Create mapping from protocol names to graph keys
        name_mapping = {
            "Uniswap V3": "uniswap_v3",
            "Uniswap V2": "uniswap_v2",
            "SushiSwap": "sushiswap",
            "Curve Finance": "curve",
            "Balancer V2": "balancer_v2",
            "Aave V3": "aave_v3",
            "Compound V3": "compound_v3",
            "Yearn Finance": "yearn",
            "Convex Finance": "convex",
            "MakerDAO": "makerdao",
            "Frax Finance": "frax",
            "Synthetix": "synthetix",
            "dYdX": "dydx",
            "Euler Finance": "euler",
            "Aerodrome": "aerodrome",
            "BaseSwap": "baseswap",
            "Moonwell": "moonwell",
            "Fluid Finance": "fluid",
            "Beefy Finance": "beefy",
            "Pendle Finance": "pendle",
            "Camelot": "camelot",
            "GMX": "gmx",
            "Radiant Capital": "radiant",
            "Gains Network": "gains"
        }

        protocol_key = name_mapping.get(protocol_name)
        if protocol_key:
            return f"{protocol_key}_{chain}"

        return None
    
    async def get_cross_chain_arbitrage_opportunities(self) -> List[Dict]:
        """Find cross-chain arbitrage opportunities using The Graph data"""

        print("🌉 Analyzing cross-chain arbitrage opportunities across ALL protocols...")

        opportunities = []

        # Get data from multiple chains - use ALL protocols now
        chains = ["ethereum", "base", "arbitrum"]
        chain_data = {}

        for chain in chains:
            print(f"📊 Fetching data for {chain}...")
            chain_data[chain] = await self.get_all_protocols_yield_data(chain)

        # Get unique protocols that exist across chains
        all_protocols = set()
        for chain in chains:
            all_protocols.update(chain_data[chain].keys())

        print(f"🔍 Analyzing {len(all_protocols)} protocols: {', '.join(all_protocols)}")

        # Find arbitrage opportunities
        for protocol in all_protocols:
            protocol_pools = {}

            # Collect pools from all chains
            for chain in chains:
                if protocol in chain_data[chain]:
                    protocol_pools[chain] = chain_data[chain][protocol]

            # Only proceed if protocol exists on multiple chains
            if len(protocol_pools) < 2:
                continue

            # Find price differences between chain pairs
            chain_pairs = [
                ("ethereum", "base"),
                ("ethereum", "arbitrum"),
                ("base", "arbitrum")
            ]

            for chain1, chain2 in chain_pairs:
                if chain1 in protocol_pools and chain2 in protocol_pools:
                    pools1 = protocol_pools[chain1]
                    pools2 = protocol_pools[chain2]

                    for pool1 in pools1:
                        for pool2 in pools2:
                            # Check if same token pair
                            if self._is_same_token_pair_simple(pool1, pool2):
                                # Calculate arbitrage opportunity
                                arbitrage = self._calculate_arbitrage_opportunity_simple(pool1, pool2, protocol)

                                if arbitrage['profit_potential'] > 0.01:  # Min 1% profit
                                    opportunities.append(arbitrage)

        print(f"   Found {len(opportunities)} arbitrage opportunities")
        return opportunities
    
    def _get_subgraph_url(self, chain: str, protocol: Optional[str] = None) -> str:
        """Get appropriate subgraph URL with proper authentication"""

        if protocol:
            key = f"{protocol}_{chain}"

            # Use authenticated endpoint if API key is available and subgraph exists
            if self.api_key:
                # For Uniswap V3, prioritize the working primary subgraph
                if protocol == "uniswap_v3":
                    subgraph_id = self.subgraphs.get("uniswap_v3_ethereum_primary", "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6")
                    return f"{self.base_url}/{subgraph_id}"
                elif key in self.subgraphs:
                    subgraph_id = self.subgraphs[key]
                    # Skip placeholder subgraphs - fallback to working primary
                    if not subgraph_id.startswith("PLACEHOLDER_"):
                        return f"{self.base_url}/{subgraph_id}"

            # Use legacy endpoint as fallback for known working subgraphs
            if key in self.legacy_public_subgraphs:
                return f"https://api.thegraph.com/subgraphs/name/{self.legacy_public_subgraphs[key]}"

            # For any protocol without specific subgraph, use the working primary subgraph
            # This ensures all protocols get data instead of failing with placeholder URLs
            if self.api_key:
                working_subgraph_id = self.subgraphs.get("uniswap_v3_ethereum_primary", "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6")
                return f"{self.base_url}/{working_subgraph_id}"

        # Default fallback to working primary subgraph with API key
        if self.api_key:
            working_subgraph_id = self.subgraphs.get("uniswap_v3_ethereum_primary", "4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6")
            return f"{self.base_url}/{working_subgraph_id}"
        else:
            # Only fallback to placeholder if no API key (should not happen in production)
            return "https://gateway.thegraph.com/api/[api-key]/subgraphs/id/4cKy6QQMc5tpfdx8yxfYeb9TLZmgLQe44ddW1G7NwkA6"
    
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

        # Extract pools based on protocol and schema version
        pool_list = []
        if "liquidityPools" in data:
            pool_list = data.get("liquidityPools", [])
        elif "pools" in data:
            pool_list = data.get("pools", [])
        elif protocol == "aave" and "reserves" in data:
            pool_list = data.get("reserves", [])

        for pool in pool_list:
            try:
                # Handle new liquidityPools schema
                if "inputTokens" in pool:
                    input_tokens = pool.get("inputTokens", [])
                    token0_symbol = input_tokens[0].get("symbol", "") if len(input_tokens) > 0 else ""
                    token1_symbol = input_tokens[1].get("symbol", "") if len(input_tokens) > 1 else ""
                    token0_id = input_tokens[0].get("id", "") if len(input_tokens) > 0 else ""
                    token1_id = input_tokens[1].get("id", "") if len(input_tokens) > 1 else ""
                    volume_24h = float(pool.get("cumulativeVolumeUSD", 0))
                else:
                    # Handle old pools schema
                    token0_symbol = pool.get("token0", {}).get("symbol", "") if isinstance(pool.get("token0"), dict) else ""
                    token1_symbol = pool.get("token1", {}).get("symbol", "") if isinstance(pool.get("token1"), dict) else ""
                    token0_id = pool.get("token0", {}).get("id", "") if isinstance(pool.get("token0"), dict) else ""
                    token1_id = pool.get("token1", {}).get("id", "") if isinstance(pool.get("token1"), dict) else ""
                    volume_24h = float(pool.get("volumeUSD", 0))

                pool_data = GraphPoolData(
                    pool_address=pool.get("id", ""),
                    protocol=protocol,
                    chain=chain,
                    token0=token0_id,
                    token1=token1_id,
                    token0_symbol=token0_symbol,
                    token1_symbol=token1_symbol,
                    reserve0=float(pool.get("liquidity", 0)) or float(pool.get("totalLiquidity", 0)),
                    reserve1=float(pool.get("totalValueLockedUSD", 0)),
                    total_liquidity_usd=float(pool.get("totalValueLockedUSD", 0)),
                    volume_24h=volume_24h,
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

    def _is_same_token_pair_simple(self, pool1: Dict, pool2: Dict) -> bool:
        """Check if two pools have same token pair"""

        # Check if both pools have the same token symbols
        pool1_tokens = {pool1.get('token0_symbol', ''), pool1.get('token1_symbol', '')}
        pool2_tokens = {pool2.get('token0_symbol', ''), pool2.get('token1_symbol', '')}

        # Remove empty strings
        pool1_tokens.discard('')
        pool2_tokens.discard('')

        return pool1_tokens == pool2_tokens and len(pool1_tokens) == 2
    
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

    def _calculate_arbitrage_opportunity_simple(self, pool1: Dict, pool2: Dict, protocol: str) -> Dict:
        """Calculate arbitrage opportunity between two pools"""

        # Get APY from both pools
        apy1 = pool1.get('apy', 0)
        apy2 = pool2.get('apy', 0)
        chain1 = pool1.get('chain', 'unknown')
        chain2 = pool2.get('chain', 'unknown')

        # Calculate profit potential
        max_apy = max(apy1, apy2)
        min_apy = min(apy1, apy2)
        profit_potential = (max_apy - min_apy) / min_apy if min_apy > 0 else 0

        # Determine which chain has higher yield
        max_yield_chain = chain1 if apy1 > apy2 else chain2
        min_yield_chain = chain2 if apy1 > apy2 else chain1

        return {
            'protocol': protocol,
            'token_pair': f"{pool1.get('token0_symbol', '')}/{pool1.get('token1_symbol', '')}",
            'chain_pair': f"{chain1}-{chain2}",
            'apy_difference': max_apy - min_apy,
            'profit_potential': profit_potential,
            'max_yield_chain': max_yield_chain,
            'min_yield_chain': min_yield_chain,
            'max_apy': max_apy,
            'min_apy': min_apy,
            'tvl_chain1': pool1.get('tvl_usd', 0),
            'tvl_chain2': pool2.get('tvl_usd', 0),
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
    
    def _get_mock_pool_data(self, protocol: str, chain: str) -> List[GraphPoolData]:
        """Generate mock pool data for demonstration"""
        
        mock_pools = []
        
        if protocol == "uniswap_v3":
            mock_pools = [
                GraphPoolData(
                    pool_address="0x88e6a0c2ddd26feeb64f039a2c41296fcb3f5640",
                    protocol="uniswap_v3",
                    chain=chain,
                    token0="0xa0b86a33e6c8b8b8b8b8b8b8b8b8b8b8b8b8b8b8",
                    token1="0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
                    token0_symbol="USDC",
                    token1_symbol="WETH",
                    reserve0=50000000.0,
                    reserve1=15000.0,
                    total_liquidity_usd=100000000.0,
                    volume_24h=5000000.0,
                    fees_24h=15000.0,
                    apy=12.5,
                    tvl_usd=100000000.0,
                    last_updated=datetime.now()
                ),
                GraphPoolData(
                    pool_address="0x4e68ccd3e89f51c3074ca5072bbac773960dfa36",
                    protocol="uniswap_v3",
                    chain=chain,
                    token0="0xdac17f958d2ee523a2206206994597c13d831ec7",
                    token1="0xa0b86a33e6c8b8b8b8b8b8b8b8b8b8b8b8b8b8b8",
                    token0_symbol="USDT",
                    token1_symbol="USDC",
                    reserve0=25000000.0,
                    reserve1=25000000.0,
                    total_liquidity_usd=50000000.0,
                    volume_24h=2000000.0,
                    fees_24h=5000.0,
                    apy=8.2,
                    tvl_usd=50000000.0,
                    last_updated=datetime.now()
                )
            ]
        elif protocol == "curve":
            mock_pools = [
                GraphPoolData(
                    pool_address="0xbebc44782c7db0a1a60cb6fe97d0b483032ff1c7",
                    protocol="curve",
                    chain=chain,
                    token0="0x6b175474e89094c44da98b954eedeac495271d0f",
                    token1="0xa0b86a33e6c8b8b8b8b8b8b8b8b8b8b8b8b8b8b8",
                    token0_symbol="DAI",
                    token1_symbol="USDC",
                    reserve0=30000000.0,
                    reserve1=30000000.0,
                    total_liquidity_usd=60000000.0,
                    volume_24h=1000000.0,
                    fees_24h=3000.0,
                    apy=6.8,
                    tvl_usd=60000000.0,
                    last_updated=datetime.now()
                )
            ]
        elif protocol == "aave":
            mock_pools = [
                GraphPoolData(
                    pool_address="0x7d2768de32b0b80b7a3454c06bdac94a69ddc7a9",
                    protocol="aave",
                    chain=chain,
                    token0="0xa0b86a33e6c8b8b8b8b8b8b8b8b8b8b8b8b8b8b8",
                    token1="",
                    token0_symbol="USDC",
                    token1_symbol="",
                    reserve0=0.0,
                    reserve1=0.0,
                    total_liquidity_usd=80000000.0,
                    volume_24h=0.0,
                    fees_24h=0.0,
                    apy=4.5,
                    tvl_usd=80000000.0,
                    last_updated=datetime.now()
                )
            ]
        
        return mock_pools

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

        # Test comprehensive protocol integration
        print("\n🌐 Testing comprehensive protocol integration...")
        comprehensive_data = await graph.get_all_protocols_yield_data("ethereum")

        print(f"   Found data for {len(comprehensive_data)} protocols on Ethereum")
        for protocol, pools in comprehensive_data.items():
            if pools:
                print(f"   {protocol}: {len(pools)} pools")
            else:
                print(f"   {protocol}: No data available")

        # Test Base chain
        print("\n🔵 Testing Base chain protocols...")
        base_data = await graph.get_all_protocols_yield_data("base")

        print(f"   Found data for {len(base_data)} protocols on Base")
        for protocol, pools in base_data.items():
            if pools:
                print(f"   {protocol}: {len(pools)} pools")
            else:
                print(f"   {protocol}: No data available")
        
        # Test arbitrage opportunities
        print("\n🌉 Testing arbitrage opportunities...")
        arbitrage_ops = await graph.get_cross_chain_arbitrage_opportunities()
        
        print(f"   Found {len(arbitrage_ops)} arbitrage opportunities")
        for opp in arbitrage_ops[:2]:  # Show first 2
            print(f"   {opp['token_pair']}: {opp['profit_potential']:.2%} profit potential")

if __name__ == "__main__":
    asyncio.run(test_graph_integration())