# src/monitoring/health_monitor.py
"""24/7 Health Monitoring System for USDC AI Optimizer"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from web3 import Web3
import time

@dataclass
class HealthStatus:
    """Health status for a system component"""
    component: str
    status: str  # "healthy", "degraded", "unhealthy"
    response_time: float
    last_check: datetime
    error_message: Optional[str] = None
    metrics: Optional[Dict] = None

class SystemHealthMonitor:
    """Comprehensive system health monitoring"""
    
    def __init__(self):
        self.check_interval = 60  # Check every 60 seconds
        self.health_history = []
        self.alert_thresholds = {
            "response_time": 5.0,  # 5 seconds max response time
            "error_rate": 0.1,     # 10% max error rate
            "uptime": 0.99         # 99% minimum uptime
        }
        
        # Import our modules
        from ..apis.cctp_integration import CCTPIntegration
        from ..execution.rebalancer import USDAIRebalancer
        
        self.cctp = CCTPIntegration()
        self.rebalancer = USDAIRebalancer()
        
    async def check_all_components(self) -> Dict[str, HealthStatus]:
        """Check health of all system components"""
        
        print("🔍 SYSTEM HEALTH CHECK")
        print("=" * 50)
        
        components = {}
        
        # Check external APIs
        components.update(await self.check_external_apis())
        
        # Check blockchain connectivity
        components.update(await self.check_blockchain_connectivity())
        
        # Check internal systems
        components.update(await self.check_internal_systems())
        
        # Check portfolio health
        components.update(await self.check_portfolio_health())
        
        # Store health history
        self.health_history.append({
            "timestamp": datetime.now().isoformat(),
            "components": {name: {
                "status": comp.status,
                "response_time": comp.response_time,
                "error": comp.error_message
            } for name, comp in components.items()}
        })
        
        # Keep only last 100 health checks
        if len(self.health_history) > 100:
            self.health_history = self.health_history[-100:]
        
        return components
    
    async def check_external_apis(self) -> Dict[str, HealthStatus]:
        """Check health of external API services"""
        
        print("📡 Checking External APIs...")
        components = {}
        
        # Check DeFiLlama API
        components["defillama"] = await self.check_defillama_api()
        
        # Check Circle CCTP API
        components["cctp_api"] = await self.check_cctp_api()
        
        # Check 1inch API
        components["oneinch"] = await self.check_oneinch_api()
        
        # Check Pyth Oracle
        components["pyth"] = await self.check_pyth_api()
        
        return components
    
    async def check_defillama_api(self) -> HealthStatus:
        """Check DeFiLlama API health"""
        
        start_time = time.time()
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    "https://api.llama.fi/protocols",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = time.time() - start_time
                    
                    if response.status == 200:
                        data = await response.json()
                        return HealthStatus(
                            component="defillama",
                            status="healthy",
                            response_time=response_time,
                            last_check=datetime.now(),
                            metrics={"protocols_count": len(data)}
                        )
                    else:
                        return HealthStatus(
                            component="defillama",
                            status="unhealthy",
                            response_time=response_time,
                            last_check=datetime.now(),
                            error_message=f"HTTP {response.status}"
                        )
                        
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="defillama",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_cctp_api(self) -> HealthStatus:
        """Check Circle CCTP API health"""
        
        start_time = time.time()
        
        try:
            # Test with a known transaction hash
            test_tx = "d16204d78d7ee8d71e160f4e19f52b28932df4bbcb1391be2625810eb46ac2e3"
            url = f"https://iris-api-sandbox.circle.com/v2/messages/6?transactionHash=0x{test_tx}"
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = time.time() - start_time
                    
                    if response.status in [200, 404]:  # 404 is OK for test tx
                        return HealthStatus(
                            component="cctp_api",
                            status="healthy",
                            response_time=response_time,
                            last_check=datetime.now()
                        )
                    else:
                        return HealthStatus(
                            component="cctp_api",
                            status="unhealthy",
                            response_time=response_time,
                            last_check=datetime.now(),
                            error_message=f"HTTP {response.status}"
                        )
                        
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="cctp_api",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_oneinch_api(self) -> HealthStatus:
        """Check 1inch API health"""
        
        start_time = time.time()
        
        try:
            # Test with a simple quote request
            url = "https://api.1inch.io/v5.0/1/quote"
            params = {
                "fromTokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC
                "toTokenAddress": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",  # USDC (same token)
                "amount": "1000000"  # 1 USDC
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = time.time() - start_time
                    
                    if response.status == 200:
                        return HealthStatus(
                            component="oneinch",
                            status="healthy",
                            response_time=response_time,
                            last_check=datetime.now()
                        )
                    else:
                        return HealthStatus(
                            component="oneinch",
                            status="unhealthy",
                            response_time=response_time,
                            last_check=datetime.now(),
                            error_message=f"HTTP {response.status}"
                        )
                        
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="oneinch",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_pyth_api(self) -> HealthStatus:
        """Check Pyth Oracle API health"""
        
        start_time = time.time()
        
        try:
            # Test with ETH price feed
            url = "https://hermes.pyth.network/v2/updates/price/latest"
            params = {"ids[]": "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace"}
            
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    url,
                    params=params,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    response_time = time.time() - start_time
                    
                    if response.status == 200:
                        return HealthStatus(
                            component="pyth",
                            status="healthy",
                            response_time=response_time,
                            last_check=datetime.now()
                        )
                    else:
                        return HealthStatus(
                            component="pyth",
                            status="unhealthy",
                            response_time=response_time,
                            last_check=datetime.now(),
                            error_message=f"HTTP {response.status}"
                        )
                        
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="pyth",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_blockchain_connectivity(self) -> Dict[str, HealthStatus]:
        """Check blockchain RPC connectivity"""
        
        print("⛓️ Checking Blockchain Connectivity...")
        components = {}
        
        chains = ["ethereum_sepolia", "base_sepolia", "arbitrum_sepolia"]
        
        for chain in chains:
            components[chain] = await self.check_chain_connectivity(chain)
        
        return components
    
    async def check_chain_connectivity(self, chain: str) -> HealthStatus:
        """Check connectivity to a specific blockchain"""
        
        start_time = time.time()
        
        try:
            config = self.cctp.chain_configs[chain]
            w3 = Web3(Web3.HTTPProvider(config.rpc_url))
            
            # Test basic connectivity
            latest_block = w3.eth.block_number
            block_info = w3.eth.get_block(latest_block)
            
            response_time = time.time() - start_time
            
            return HealthStatus(
                component=f"blockchain_{chain}",
                status="healthy",
                response_time=response_time,
                last_check=datetime.now(),
                metrics={
                    "latest_block": latest_block,
                    "block_timestamp": block_info.timestamp,
                    "gas_price": w3.eth.gas_price
                }
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component=f"blockchain_{chain}",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_internal_systems(self) -> Dict[str, HealthStatus]:
        """Check internal system components"""
        
        print("🔧 Checking Internal Systems...")
        components = {}
        
        # Check rebalancer
        components["rebalancer"] = await self.check_rebalancer_health()
        
        # Check CCTP integration
        components["cctp_integration"] = await self.check_cctp_integration_health()
        
        return components
    
    async def check_rebalancer_health(self) -> HealthStatus:
        """Check rebalancer system health"""
        
        start_time = time.time()
        
        try:
            # Test portfolio scanning
            positions = await self.rebalancer.get_current_portfolio()
            total_value = sum(pos.amount_usdc for pos in positions)
            
            response_time = time.time() - start_time
            
            return HealthStatus(
                component="rebalancer",
                status="healthy",
                response_time=response_time,
                last_check=datetime.now(),
                metrics={
                    "positions_count": len(positions),
                    "total_value": total_value
                }
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="rebalancer",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_cctp_integration_health(self) -> HealthStatus:
        """Check CCTP integration health"""
        
        start_time = time.time()
        
        try:
            # Test chain configs
            chains = list(self.cctp.chain_configs.keys())
            domain_mappings = list(self.cctp.domain_mappings.keys())
            
            response_time = time.time() - start_time
            
            return HealthStatus(
                component="cctp_integration",
                status="healthy",
                response_time=response_time,
                last_check=datetime.now(),
                metrics={
                    "supported_chains": len(chains),
                    "domain_mappings": len(domain_mappings)
                }
            )
            
        except Exception as e:
            response_time = time.time() - start_time
            return HealthStatus(
                component="cctp_integration",
                status="unhealthy",
                response_time=response_time,
                last_check=datetime.now(),
                error_message=str(e)
            )
    
    async def check_portfolio_health(self) -> Dict[str, HealthStatus]:
        """Check portfolio health metrics"""
        
        print("💰 Checking Portfolio Health...")
        components = {}
        
        try:
            # Get portfolio performance
            performance = await self.rebalancer.get_portfolio_performance()
            
            if "error" not in performance:
                components["portfolio"] = HealthStatus(
                    component="portfolio",
                    status="healthy",
                    response_time=0.0,
                    last_check=datetime.now(),
                    metrics=performance
                )
            else:
                components["portfolio"] = HealthStatus(
                    component="portfolio",
                    status="unhealthy",
                    response_time=0.0,
                    last_check=datetime.now(),
                    error_message=performance["error"]
                )
                
        except Exception as e:
            components["portfolio"] = HealthStatus(
                component="portfolio",
                status="unhealthy",
                response_time=0.0,
                last_check=datetime.now(),
                error_message=str(e)
            )
        
        return components
    
    def get_overall_health(self, components: Dict[str, HealthStatus]) -> str:
        """Determine overall system health"""
        
        unhealthy_count = sum(1 for comp in components.values() if comp.status == "unhealthy")
        degraded_count = sum(1 for comp in components.values() if comp.status == "degraded")
        total_count = len(components)
        
        if unhealthy_count == 0 and degraded_count == 0:
            return "healthy"
        elif unhealthy_count == 0 and degraded_count <= total_count * 0.2:
            return "degraded"
        else:
            return "unhealthy"
    
    def generate_health_report(self, components: Dict[str, HealthStatus]) -> Dict:
        """Generate comprehensive health report"""
        
        overall_health = self.get_overall_health(components)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "overall_health": overall_health,
            "components": {},
            "summary": {
                "total_components": len(components),
                "healthy": sum(1 for comp in components.values() if comp.status == "healthy"),
                "degraded": sum(1 for comp in components.values() if comp.status == "degraded"),
                "unhealthy": sum(1 for comp in components.values() if comp.status == "unhealthy")
            }
        }
        
        for name, component in components.items():
            report["components"][name] = {
                "status": component.status,
                "response_time": component.response_time,
                "last_check": component.last_check.isoformat(),
                "error": component.error_message,
                "metrics": component.metrics
            }
        
        return report

# Continuous monitoring loop
async def continuous_monitoring():
    """Run continuous health monitoring"""
    
    monitor = SystemHealthMonitor()
    
    print("🚀 Starting 24/7 Health Monitoring")
    print("=" * 50)
    
    while True:
        try:
            # Perform health check
            components = await monitor.check_all_components()
            
            # Generate report
            report = monitor.generate_health_report(components)
            
            # Print status
            print(f"\n📊 HEALTH REPORT - {report['timestamp']}")
            print(f"Overall Status: {report['overall_health'].upper()}")
            print(f"Components: {report['summary']['healthy']} healthy, "
                  f"{report['summary']['degraded']} degraded, "
                  f"{report['summary']['unhealthy']} unhealthy")
            
            # Check for alerts
            if report['overall_health'] == 'unhealthy':
                print("🚨 CRITICAL: System unhealthy - immediate attention required!")
            elif report['overall_health'] == 'degraded':
                print("⚠️ WARNING: System degraded - monitoring closely")
            
            # Wait for next check
            await asyncio.sleep(monitor.check_interval)
            
        except Exception as e:
            print(f"❌ Monitoring error: {e}")
            await asyncio.sleep(30)  # Wait 30 seconds before retry

if __name__ == "__main__":
    asyncio.run(continuous_monitoring())