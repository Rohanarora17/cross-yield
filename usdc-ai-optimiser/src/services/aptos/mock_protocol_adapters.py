"""
Mock Protocol Adapters for Aptos DeFi Protocols
Provides realistic data for protocols not yet fully integrated
"""

import asyncio
import random
from typing import Dict, List
from datetime import datetime


class MockProtocolAdapter:
    """Base class for mock protocol adapters"""
    
    def __init__(self, protocol_name: str, base_apy: float, base_tvl: float, protocol_type: str, risk_level: str):
        self.protocol_name = protocol_name
        self.base_apy = base_apy
        self.base_tvl = base_tvl
        self.protocol_type = protocol_type
        self.risk_level = risk_level
        self.last_updated = datetime.now()
    
    async def get_apy(self) -> float:
        """Get realistic APY with variation"""
        variation = random.uniform(-0.5, 0.5)
        return max(0.1, self.base_apy + variation)
    
    async def get_tvl(self) -> float:
        """Get realistic TVL with variation"""
        variation = random.uniform(-0.1, 0.1)
        return max(1000000, self.base_tvl * (1 + variation))
    
    async def get_user_balance(self, user_address: str) -> float:
        """Get realistic user balance"""
        return random.uniform(0, 10000)
    
    async def get_user_yield(self, user_address: str) -> float:
        """Get realistic user yield"""
        return random.uniform(0, 1000)
    
    def generate_transaction(self, user_address: str, amount: float, action: str) -> Dict:
        """Generate mock transaction"""
        return {
            "success": True,
            "payload": f"mock_{action}_transaction",
            "message": f"Generated {self.protocol_name} {action} transaction for ${amount}",
            "note": "Mock transaction - real integration pending",
            "protocol": self.protocol_name,
            "action": action,
            "amount": amount,
            "integration_status": "mock"
        }
    
    async def get_protocol_info(self) -> Dict:
        """Get comprehensive protocol information"""
        apy = await self.get_apy()
        tvl = await self.get_tvl()
        
        return {
            "name": self.protocol_name,
            "type": self.protocol_type,
            "chain": "aptos",
            "apy": apy,
            "tvl": tvl,
            "risk_level": self.risk_level,
            "description": f"{self.protocol_name} on Aptos",
            "features": self._get_features(),
            "integration_status": "mock",
            "last_updated": self.last_updated.timestamp()
        }
    
    def _get_features(self) -> List[str]:
        """Get protocol-specific features"""
        if self.protocol_type == "dex":
            return ["AMM", "Liquidity provision", "Trading", "Farming"]
        elif self.protocol_type == "lending":
            return ["Lending", "Borrowing", "Interest earning", "Collateral"]
        elif self.protocol_type == "staking":
            return ["Staking", "Rewards", "Governance", "Delegation"]
        else:
            return ["DeFi", "Yield farming", "Liquidity"]


class LiquidswapAdapter(MockProtocolAdapter):
    """Mock adapter for Liquidswap DEX"""
    
    def __init__(self):
        super().__init__(
            protocol_name="Liquidswap",
            base_apy=9.5,
            base_tvl=45000000,
            protocol_type="dex",
            risk_level="medium"
        )
        self.contract_address = "0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12"
    
    async def get_protocol_info(self) -> Dict:
        info = await super().get_protocol_info()
        info.update({
            "contract_address": self.contract_address,
            "description": "Leading DEX on Aptos with AMM and farming",
            "features": ["AMM", "Liquidity provision", "Trading", "Farming", "USDC pools"]
        })
        return info


class AriesAdapter(MockProtocolAdapter):
    """Mock adapter for Aries Markets"""
    
    def __init__(self):
        super().__init__(
            protocol_name="Aries Markets",
            base_apy=8.7,
            base_tvl=28000000,
            protocol_type="lending",
            risk_level="low"
        )
        self.contract_address = "0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3"
    
    async def get_protocol_info(self) -> Dict:
        info = await super().get_protocol_info()
        info.update({
            "contract_address": self.contract_address,
            "description": "Decentralized lending protocol on Aptos",
            "features": ["Lending", "Borrowing", "Interest earning", "Collateral", "USDC markets"]
        })
        return info


class TortugaAdapter(MockProtocolAdapter):
    """Mock adapter for Tortuga Finance"""
    
    def __init__(self):
        super().__init__(
            protocol_name="Tortuga Finance",
            base_apy=7.3,
            base_tvl=52000000,
            protocol_type="staking",
            risk_level="low"
        )
        self.contract_address = "0x8f396e4246b2ba87b51c0739ef5ea4f26515a98375308c31ac2ec1e42142a57f"
    
    async def get_protocol_info(self) -> Dict:
        info = await super().get_protocol_info()
        info.update({
            "contract_address": self.contract_address,
            "description": "Liquid staking protocol on Aptos",
            "features": ["Staking", "Rewards", "Governance", "Delegation", "APT staking"]
        })
        return info


class PancakeSwapAdapter(MockProtocolAdapter):
    """Mock adapter for PancakeSwap Aptos"""
    
    def __init__(self):
        super().__init__(
            protocol_name="PancakeSwap Aptos",
            base_apy=8.1,
            base_tvl=38000000,
            protocol_type="dex",
            risk_level="low"
        )
        self.contract_address = "0xc7efb4076dbe143cbcd98cfaaa929ecfc8f299203dfff63b95ccb6bfe19850fa"
    
    async def get_protocol_info(self) -> Dict:
        info = await super().get_protocol_info()
        info.update({
            "contract_address": self.contract_address,
            "description": "PancakeSwap on Aptos with farming and trading",
            "features": ["AMM", "Liquidity provision", "Trading", "Farming", "CAKE rewards"]
        })
        return info


class AptosProtocolManager:
    """Manages all Aptos protocol adapters (real and mock)"""
    
    def __init__(self):
        # Real integration
        from .thala_protocol_adapter import ThalaProtocolAdapter
        self.thala = ThalaProtocolAdapter()
        
        # Mock integrations
        self.liquidswap = LiquidswapAdapter()
        self.aries = AriesAdapter()
        self.tortuga = TortugaAdapter()
        self.pancakeswap = PancakeSwapAdapter()
        
        self.protocols = {
            "thala": self.thala,
            "liquidswap": self.liquidswap,
            "aries": self.aries,
            "tortuga": self.tortuga,
            "pancakeswap": self.pancakeswap
        }
    
    async def get_all_protocol_info(self) -> List[Dict]:
        """Get information from all protocols"""
        results = []
        
        for protocol_id, adapter in self.protocols.items():
            try:
                info = await adapter.get_protocol_info()
                results.append(info)
            except Exception as e:
                print(f"❌ Error getting info for {protocol_id}: {e}")
                # Add fallback info
                results.append({
                    "name": protocol_id.title(),
                    "type": "unknown",
                    "chain": "aptos",
                    "apy": 0.0,
                    "tvl": 0.0,
                    "risk_level": "unknown",
                    "error": str(e),
                    "integration_status": "error"
                })
        
        return results
    
    async def get_protocol_apy(self, protocol_id: str) -> float:
        """Get APY for specific protocol"""
        if protocol_id in self.protocols:
            adapter = self.protocols[protocol_id]
            if hasattr(adapter, 'get_usdc_apy'):
                return await adapter.get_usdc_apy()
            elif hasattr(adapter, 'get_apy'):
                return await adapter.get_apy()
        
        return 0.0
    
    async def get_protocol_tvl(self, protocol_id: str) -> float:
        """Get TVL for specific protocol"""
        if protocol_id in self.protocols:
            adapter = self.protocols[protocol_id]
            if hasattr(adapter, 'get_usdc_tvl'):
                return await adapter.get_usdc_tvl()
            elif hasattr(adapter, 'get_tvl'):
                return await adapter.get_tvl()
        
        return 0.0
    
    def get_integration_status(self, protocol_id: str) -> str:
        """Get integration status for protocol"""
        if protocol_id == "thala":
            return "real"
        else:
            return "mock"


# Example usage and testing
async def test_protocol_manager():
    """Test the protocol manager"""
    manager = AptosProtocolManager()
    
    # Test getting all protocol info
    all_info = await manager.get_all_protocol_info()
    print("All Protocol Info:")
    for info in all_info:
        print(f"  {info['name']}: {info['apy']:.2f}% APY, ${info['tvl']:,.0f} TVL ({info['integration_status']})")
    
    # Test getting specific protocol APY
    thala_apy = await manager.get_protocol_apy("thala")
    print(f"\nThala APY: {thala_apy:.2f}%")
    
    liquidswap_apy = await manager.get_protocol_apy("liquidswap")
    print(f"Liquidswap APY: {liquidswap_apy:.2f}%")


if __name__ == "__main__":
    asyncio.run(test_protocol_manager())