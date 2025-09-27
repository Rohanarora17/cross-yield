# src/apis/oneinch_optimizer.py
"""1inch API Integration for Optimal Swap Execution"""

import asyncio
import aiohttp
import json
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

@dataclass
class SwapQuote:
    """1inch swap quote data"""
    from_token: str
    to_token: str
    from_amount: float
    to_amount: float
    estimated_gas: int
    gas_price: float
    protocol_fee: float
    price_impact: float
    route: List[Dict]
    timestamp: datetime

class OneInchOptimizer:
    """1inch API integration for optimal swap execution"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://api.1inch.io/v5.0"
        self.session = None
        
        # Chain IDs for 1inch API
        self.chain_ids = {
            "ethereum": 1,
            "base": 8453,
            "arbitrum": 42161,
            "polygon": 137,
            "avalanche": 43114
        }
        
        # Token addresses for major chains
        self.token_addresses = {
            "ethereum": {
                "USDC": "0xA0b86a33E6677fC7D5e1234a1CC3b97f8B3ad8A5",
                "USDT": "0xdAC17F958D2ee523a2206206994597C13D831ec7",
                "DAI": "0x6B175474E89094C44Da98b954EedeAC495271d0F",
                "WETH": "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"
            },
            "base": {
                "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
                "WETH": "0x4200000000000000000000000000000000000006"
            },
            "arbitrum": {
                "USDC": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
                "WETH": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"
            }
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def get_swap_quote(self, chain: str, from_token: str, to_token: str, 
                           amount: float, slippage: float = 0.5) -> Optional[SwapQuote]:
        """Get optimal swap quote from 1inch"""
        
        try:
            from_address = self.token_addresses.get(chain, {}).get(from_token)
            to_address = self.token_addresses.get(chain, {}).get(to_token)
            
            if not from_address or not to_address:
                print(f"⚠️ Token addresses not found for {chain}: {from_token} -> {to_token}")
                return None
            
            # Convert amount to wei (assuming 18 decimals for most tokens)
            amount_wei = int(amount * 10**18)
            
            # Get chain ID
            chain_id = self.chain_ids.get(chain, 1)
            
            # Build URL with proper 1inch API format
            url = f"{self.base_url}/{chain_id}/quote"
            params = {
                "fromTokenAddress": from_address,
                "toTokenAddress": to_address,
                "amount": str(amount_wei),
                "slippage": str(slippage)
            }
            
            # Add API key to headers if available
            headers = {}
            if self.api_key:
                headers["Authorization"] = f"Bearer {self.api_key}"
            
            async with self.session.get(url, params=params, headers=headers) as response:
                if response.status == 200:
                    try:
                        data = await response.json()
                        return self._parse_quote_response(data, from_token, to_token, amount)
                    except Exception as json_error:
                        print(f"⚠️ 1inch API returned HTML instead of JSON: {json_error}")
                        return self._get_fallback_quote(from_token, to_token, amount, chain)
                else:
                    error_text = await response.text()
                    print(f"⚠️ 1inch API error: {response.status} - {error_text}")
                    return self._get_fallback_quote(from_token, to_token, amount, chain)
                    
        except Exception as e:
            print(f"❌ 1inch quote failed: {e}")
            return None
    
    def _parse_quote_response(self, data: Dict, from_token: str, to_token: str, 
                            from_amount: float) -> SwapQuote:
        """Parse 1inch quote response"""
        
        return SwapQuote(
            from_token=from_token,
            to_token=to_token,
            from_amount=from_amount,
            to_amount=float(data.get('toAmount', 0)) / 10**18,
            estimated_gas=int(data.get('estimatedGas', 0)),
            gas_price=float(data.get('gasPrice', 0)) / 10**18,
            protocol_fee=float(data.get('protocolFee', 0)) / 10**18,
            price_impact=float(data.get('priceImpact', 0)) / 100,  # Convert to decimal
            route=data.get('protocols', []),
            timestamp=datetime.now()
        )
    
    def _get_chain_id(self, chain: str) -> int:
        """Get chain ID for 1inch API"""
        return self.chain_ids.get(chain, 1)
    
    def _get_fallback_quote(self, from_token: str, to_token: str, amount: float, chain: str) -> SwapQuote:
        """Get fallback quote when 1inch API is unavailable"""
        
        # Simplified fallback calculation
        if from_token == to_token:
            to_amount = amount
        elif from_token == "WETH" and to_token == "USDC":
            to_amount = amount * 2500  # Assume ETH = $2500
        elif from_token == "DAI" and to_token == "USDC":
            to_amount = amount * 0.999  # DAI ≈ USDC
        else:
            to_amount = amount * 0.95  # Default 5% slippage
        
        return SwapQuote(
            from_token=from_token,
            to_token=to_token,
            from_amount=amount,
            to_amount=to_amount,
            estimated_gas=150000,
            gas_price=0.00002,
            protocol_fee=0.0,
            price_impact=0.005,  # 0.5% price impact
            route=[{"protocol": "fallback", "path": [from_token, to_token]}],
            timestamp=datetime.now()
        )
    
    async def optimize_reward_conversion(self, rewards: List[Dict], target_token: str = "USDC") -> Dict:
        """Optimize conversion of reward tokens to USDC"""
        
        print(f"💱 Optimizing reward conversion to {target_token}...")
        
        total_usdc_value = 0
        conversion_plan = []
        
        for reward in rewards:
            token = reward['token']
            amount = reward['amount']
            chain = reward['chain']
            
            if token == target_token:
                total_usdc_value += amount
                continue
            
            # Get swap quote
            quote = await self.get_swap_quote(chain, token, target_token, amount)
            
            if quote:
                conversion_plan.append({
                    'from_token': token,
                    'to_token': target_token,
                    'from_amount': amount,
                    'to_amount': quote.to_amount,
                    'chain': chain,
                    'gas_cost': quote.estimated_gas * quote.gas_price,
                    'price_impact': quote.price_impact,
                    'route': quote.route
                })
                
                total_usdc_value += quote.to_amount
            else:
                print(f"⚠️ Could not get quote for {token} -> {target_token}")
        
        return {
            'total_usdc_value': total_usdc_value,
            'conversion_plan': conversion_plan,
            'total_gas_cost': sum(plan['gas_cost'] for plan in conversion_plan),
            'avg_price_impact': sum(plan['price_impact'] for plan in conversion_plan) / len(conversion_plan) if conversion_plan else 0
        }
    
    async def find_optimal_routes(self, opportunities: List[Dict]) -> Dict:
        """Find optimal routes for yield optimization"""
        
        print("🛣️ Finding optimal routes for yield optimization...")
        
        route_analysis = {}
        
        for opp in opportunities:
            protocol = opp['protocol']
            chain = opp['chain']
            apy = opp['apy']
            
            # Analyze entry routes (USDC -> protocol tokens)
            entry_routes = await self._analyze_entry_routes(chain, protocol)
            
            # Analyze exit routes (protocol tokens -> USDC)
            exit_routes = await self._analyze_exit_routes(chain, protocol)
            
            # Calculate net APY after gas costs
            net_apy = self._calculate_net_apy(apy, entry_routes, exit_routes)
            
            route_analysis[f"{protocol}_{chain}"] = {
                'protocol': protocol,
                'chain': chain,
                'gross_apy': apy,
                'net_apy': net_apy,
                'entry_routes': entry_routes,
                'exit_routes': exit_routes,
                'gas_efficiency': self._calculate_gas_efficiency(entry_routes, exit_routes)
            }
        
        return route_analysis
    
    async def _analyze_entry_routes(self, chain: str, protocol: str) -> List[Dict]:
        """Analyze entry routes for a protocol"""
        
        # This would analyze different entry strategies
        # For now, return simplified analysis
        
        routes = []
        
        # Direct USDC deposit (if supported)
        routes.append({
            'route_type': 'direct',
            'gas_cost': 50000,  # Estimated gas
            'price_impact': 0.0,
            'complexity': 'low'
        })
        
        # USDC -> Protocol token -> Deposit
        if protocol in ['uniswap', 'curve']:
            routes.append({
                'route_type': 'swap_then_deposit',
                'gas_cost': 150000,
                'price_impact': 0.001,
                'complexity': 'medium'
            })
        
        return routes
    
    async def _analyze_exit_routes(self, chain: str, protocol: str) -> List[Dict]:
        """Analyze exit routes for a protocol"""
        
        routes = []
        
        # Direct withdrawal to USDC
        routes.append({
            'route_type': 'direct_withdrawal',
            'gas_cost': 30000,
            'price_impact': 0.0,
            'complexity': 'low'
        })
        
        # Withdraw -> Swap rewards -> USDC
        routes.append({
            'route_type': 'withdraw_and_swap',
            'gas_cost': 200000,
            'price_impact': 0.002,
            'complexity': 'high'
        })
        
        return routes
    
    def _calculate_net_apy(self, gross_apy: float, entry_routes: List[Dict], 
                          exit_routes: List[Dict]) -> float:
        """Calculate net APY after gas costs"""
        
        # Use most efficient routes
        best_entry = min(entry_routes, key=lambda x: x['gas_cost'])
        best_exit = min(exit_routes, key=lambda x: x['gas_cost'])
        
        # Estimate gas costs (simplified)
        total_gas_cost = best_entry['gas_cost'] + best_exit['gas_cost']
        gas_cost_usd = total_gas_cost * 0.00002  # Assume $20 gas price
        
        # Adjust APY for gas costs (simplified calculation)
        gas_cost_percentage = gas_cost_usd / 1000  # Assume $1000 position
        net_apy = gross_apy - gas_cost_percentage
        
        return max(net_apy, 0)  # Ensure non-negative
    
    def _calculate_gas_efficiency(self, entry_routes: List[Dict], 
                                 exit_routes: List[Dict]) -> float:
        """Calculate gas efficiency score (0-1)"""
        
        best_entry = min(entry_routes, key=lambda x: x['gas_cost'])
        best_exit = min(exit_routes, key=lambda x: x['gas_cost'])
        
        total_gas = best_entry['gas_cost'] + best_exit['gas_cost']
        
        # Normalize to 0-1 scale (lower gas = higher efficiency)
        efficiency = max(0, 1 - (total_gas / 500000))  # 500k gas as max threshold
        
        return efficiency

# Test the 1inch optimizer
async def test_oneinch_optimizer():
    """Test 1inch optimizer integration"""
    
    async with OneInchOptimizer() as optimizer:
        
        # Test swap quote
        print("💱 Testing swap quote...")
        quote = await optimizer.get_swap_quote("ethereum", "USDC", "WETH", 1000)
        
        if quote:
            print(f"   {quote.from_amount} {quote.from_token} -> {quote.to_amount:.4f} {quote.to_token}")
            print(f"   Gas: {quote.estimated_gas}, Price Impact: {quote.price_impact:.2%}")
        
        # Test reward conversion optimization
        print("\n🎁 Testing reward conversion optimization...")
        rewards = [
            {'token': 'WETH', 'amount': 0.5, 'chain': 'ethereum'},
            {'token': 'USDC', 'amount': 100, 'chain': 'ethereum'},
            {'token': 'DAI', 'amount': 200, 'chain': 'ethereum'}
        ]
        
        conversion_result = await optimizer.optimize_reward_conversion(rewards)
        print(f"   Total USDC value: ${conversion_result['total_usdc_value']:.2f}")
        print(f"   Total gas cost: ${conversion_result['total_gas_cost']:.2f}")
        print(f"   Avg price impact: {conversion_result['avg_price_impact']:.2%}")

if __name__ == "__main__":
    asyncio.run(test_oneinch_optimizer())