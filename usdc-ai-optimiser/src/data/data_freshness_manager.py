# src/data/data_freshness_manager.py
"""Data Freshness Manager - Ensures Real-Time Data Validity"""

import asyncio
import time
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass
import aiohttp
import pandas as pd
import numpy as np

@dataclass
class DataFreshnessMetrics:
    """Data freshness metrics"""
    data_source: str
    last_updated: datetime
    staleness_seconds: float
    freshness_score: float  # 0-1, 1 = fresh, 0 = stale
    confidence_level: float  # 0-1, confidence in data accuracy
    refresh_needed: bool
    max_staleness_threshold: float  # seconds

@dataclass
class ExecutionValidity:
    """Execution validity assessment"""
    is_valid: bool
    staleness_penalty: float  # 0-1, penalty for stale data
    confidence_adjustment: float  # 0-1, adjustment to confidence
    recommended_action: str  # "execute", "refresh", "abort"
    validity_score: float  # 0-1, overall validity score

class DataFreshnessManager:
    """Manages data freshness and execution validity"""
    
    def __init__(self):
        self.data_sources = {
            "alchemy_rpc": {"max_staleness": 30, "refresh_interval": 10},  # 30s max staleness
            "graph_api": {"max_staleness": 60, "refresh_interval": 30},   # 60s max staleness
            "pyth_oracle": {"max_staleness": 10, "refresh_interval": 5},  # 10s max staleness
            "oneinch_api": {"max_staleness": 15, "refresh_interval": 10}, # 15s max staleness
            "mcp_analysis": {"max_staleness": 300, "refresh_interval": 60} # 5min max staleness
        }
        
        self.data_cache = {}
        self.freshness_metrics = {}
        self.execution_history = []
        
    async def check_data_freshness(self, data_source: str, data: Any) -> DataFreshnessMetrics:
        """Check freshness of data from a specific source"""
        
        current_time = datetime.now()
        
        # Get last update time from data
        if isinstance(data, dict) and 'last_updated' in data:
            last_updated = data['last_updated']
            if isinstance(last_updated, str):
                last_updated = datetime.fromisoformat(last_updated)
        else:
            last_updated = current_time - timedelta(seconds=3600)  # Default to 1 hour ago
        
        # Calculate staleness
        staleness_seconds = (current_time - last_updated).total_seconds()
        
        # Get freshness threshold
        max_staleness = self.data_sources.get(data_source, {}).get("max_staleness", 60)
        
        # Calculate freshness score (1 = fresh, 0 = stale)
        freshness_score = max(0, 1 - (staleness_seconds / max_staleness))
        
        # Calculate confidence level
        confidence_level = self._calculate_confidence_level(data_source, staleness_seconds, data)
        
        # Determine if refresh is needed
        refresh_needed = staleness_seconds > max_staleness
        
        metrics = DataFreshnessMetrics(
            data_source=data_source,
            last_updated=last_updated,
            staleness_seconds=staleness_seconds,
            freshness_score=freshness_score,
            confidence_level=confidence_level,
            refresh_needed=refresh_needed,
            max_staleness_threshold=max_staleness
        )
        
        self.freshness_metrics[data_source] = metrics
        return metrics
    
    def _calculate_confidence_level(self, data_source: str, staleness_seconds: float, data: Any) -> float:
        """Calculate confidence level based on data source and staleness"""
        
        base_confidence = {
            "alchemy_rpc": 0.95,    # High confidence, real-time blockchain data
            "graph_api": 0.90,      # High confidence, indexed data
            "pyth_oracle": 0.98,    # Very high confidence, oracle data
            "oneinch_api": 0.85,    # Good confidence, DEX aggregator
            "mcp_analysis": 0.80    # Good confidence, AI analysis
        }.get(data_source, 0.70)
        
        # Apply staleness penalty
        staleness_penalty = min(0.3, staleness_seconds / 300)  # Max 30% penalty for 5min+ staleness
        
        # Apply data quality adjustments
        quality_adjustment = self._assess_data_quality(data)
        
        final_confidence = base_confidence - staleness_penalty + quality_adjustment
        return max(0, min(1, final_confidence))
    
    def _assess_data_quality(self, data: Any) -> float:
        """Assess data quality and return adjustment factor"""
        
        if not data:
            return -0.2  # 20% penalty for empty data
        
        if isinstance(data, dict):
            # Check for required fields
            required_fields = ['apy', 'tvl_usd', 'risk_score']
            missing_fields = sum(1 for field in required_fields if field not in data)
            if missing_fields > 0:
                return -0.1 * missing_fields  # 10% penalty per missing field
        
        if isinstance(data, list) and len(data) == 0:
            return -0.3  # 30% penalty for empty list
        
        return 0.05  # 5% bonus for good data quality
    
    async def assess_execution_validity(self, strategy_data: Dict[str, Any]) -> ExecutionValidity:
        """Assess if strategy execution is valid based on data freshness"""
        
        print("🕐 Assessing execution validity based on data freshness...")
        
        # Check freshness of all data sources
        validity_scores = []
        staleness_penalties = []
        confidence_adjustments = []
        
        for source, data in strategy_data.items():
            if data:
                metrics = await self.check_data_freshness(source, data)
                
                validity_scores.append(metrics.freshness_score)
                staleness_penalties.append(1 - metrics.freshness_score)
                confidence_adjustments.append(metrics.confidence_level)
                
                print(f"   {source}: {metrics.freshness_score:.2f} freshness, {metrics.confidence_level:.2f} confidence")
        
        # Calculate overall validity
        if not validity_scores:
            return ExecutionValidity(
                is_valid=False,
                staleness_penalty=1.0,
                confidence_adjustment=0.0,
                recommended_action="abort",
                validity_score=0.0
            )
        
        avg_validity_score = np.mean(validity_scores)
        avg_staleness_penalty = np.mean(staleness_penalties)
        avg_confidence_adjustment = np.mean(confidence_adjustments)
        
        # Determine recommended action
        if avg_validity_score > 0.8:
            recommended_action = "execute"
        elif avg_validity_score > 0.5:
            recommended_action = "refresh"
        else:
            recommended_action = "abort"
        
        is_valid = avg_validity_score > 0.6 and recommended_action != "abort"
        
        validity = ExecutionValidity(
            is_valid=is_valid,
            staleness_penalty=avg_staleness_penalty,
            confidence_adjustment=avg_confidence_adjustment,
            recommended_action=recommended_action,
            validity_score=avg_validity_score
        )
        
        print(f"   Overall Validity: {avg_validity_score:.2f}")
        print(f"   Recommended Action: {recommended_action.upper()}")
        
        return validity
    
    async def refresh_stale_data(self, data_sources: List[str]) -> Dict[str, Any]:
        """Refresh stale data from specified sources"""
        
        print("🔄 Refreshing stale data...")
        
        refreshed_data = {}
        
        for source in data_sources:
            try:
                if source == "alchemy_rpc":
                    refreshed_data[source] = await self._refresh_alchemy_data()
                elif source == "graph_api":
                    refreshed_data[source] = await self._refresh_graph_data()
                elif source == "pyth_oracle":
                    refreshed_data[source] = await self._refresh_pyth_data()
                elif source == "oneinch_api":
                    refreshed_data[source] = await self._refresh_oneinch_data()
                elif source == "mcp_analysis":
                    refreshed_data[source] = await self._refresh_mcp_data()
                
                print(f"   ✅ Refreshed {source}")
                
            except Exception as e:
                print(f"   ❌ Failed to refresh {source}: {e}")
                refreshed_data[source] = None
        
        return refreshed_data
    
    async def _refresh_alchemy_data(self) -> Dict[str, Any]:
        """Refresh Alchemy RPC data"""
        # Simulate Alchemy data refresh
        return {
            "block_number": 23452890 + int(time.time() % 1000),
            "gas_price_gwei": 20.5 + (time.time() % 10),
            "network_health": "healthy",
            "last_updated": datetime.now()
        }
    
    async def _refresh_graph_data(self) -> Dict[str, Any]:
        """Refresh Graph API data"""
        # Simulate Graph data refresh
        return {
            "token_prices": {
                "USDC": {"price": 1.0, "change_24h": 0.001},
                "ETH": {"price": 2500 + (time.time() % 100), "change_24h": 0.02}
            },
            "pools": [
                {"protocol": "uniswap_v3", "apy": 12.5 + (time.time() % 2), "tvl": 50000000},
                {"protocol": "aave", "apy": 8.2 + (time.time() % 1), "tvl": 2000000000}
            ],
            "last_updated": datetime.now()
        }
    
    async def _refresh_pyth_data(self) -> Dict[str, Any]:
        """Refresh Pyth oracle data"""
        # Simulate Pyth data refresh
        return {
            "price_feeds": {
                "USDC": {"price": 1.0, "confidence": 0.001},
                "ETH": {"price": 2500 + (time.time() % 50), "confidence": 5.0}
            },
            "market_regime": "risk_on" if (time.time() % 2) > 1 else "risk_off",
            "last_updated": datetime.now()
        }
    
    async def _refresh_oneinch_data(self) -> Dict[str, Any]:
        """Refresh 1inch API data"""
        # Simulate 1inch data refresh
        return {
            "swap_quotes": {
                "WETH_USDC": {"rate": 2500 + (time.time() % 20), "gas": 150000},
                "DAI_USDC": {"rate": 0.999, "gas": 120000}
            },
            "last_updated": datetime.now()
        }
    
    async def _refresh_mcp_data(self) -> Dict[str, Any]:
        """Refresh MCP analysis data"""
        # Simulate MCP data refresh
        return {
            "analysis": {
                "market_sentiment": "bullish" if (time.time() % 3) > 1 else "bearish",
                "risk_level": 0.3 + (time.time() % 0.2),
                "recommendation": "RECOMMENDED"
            },
            "last_updated": datetime.now()
        }
    
    async def execute_with_freshness_check(self, strategy_data: Dict[str, Any], 
                                         execution_function: callable) -> Tuple[Any, ExecutionValidity]:
        """Execute strategy with freshness check and auto-refresh"""
        
        print("🚀 Executing strategy with freshness validation...")
        
        # Initial validity check
        validity = await self.assess_execution_validity(strategy_data)
        
        if validity.recommended_action == "abort":
            print("❌ Execution aborted due to stale data")
            return None, validity
        
        # Refresh data if needed
        if validity.recommended_action == "refresh":
            print("🔄 Refreshing stale data before execution...")
            stale_sources = [source for source, metrics in self.freshness_metrics.items() 
                           if metrics.refresh_needed]
            
            refreshed_data = await self.refresh_stale_data(stale_sources)
            
            # Update strategy data with fresh data
            strategy_data.update(refreshed_data)
            
            # Re-assess validity
            validity = await self.assess_execution_validity(strategy_data)
            
            if not validity.is_valid:
                print("❌ Execution aborted after refresh attempt")
                return None, validity
        
        # Execute strategy
        print("✅ Executing strategy with fresh data...")
        try:
            result = await execution_function(strategy_data)
            
            # Record execution
            self.execution_history.append({
                "timestamp": datetime.now(),
                "validity_score": validity.validity_score,
                "success": True,
                "result": result
            })
            
            return result, validity
            
        except Exception as e:
            print(f"❌ Execution failed: {e}")
            
            # Record failed execution
            self.execution_history.append({
                "timestamp": datetime.now(),
                "validity_score": validity.validity_score,
                "success": False,
                "error": str(e)
            })
            
            return None, validity
    
    def get_freshness_report(self) -> Dict[str, Any]:
        """Generate comprehensive freshness report"""
        
        report = {
            "timestamp": datetime.now(),
            "data_sources": {},
            "overall_freshness": 0.0,
            "recommendations": []
        }
        
        freshness_scores = []
        
        for source, metrics in self.freshness_metrics.items():
            report["data_sources"][source] = {
                "freshness_score": metrics.freshness_score,
                "confidence_level": metrics.confidence_level,
                "staleness_seconds": metrics.staleness_seconds,
                "refresh_needed": metrics.refresh_needed,
                "last_updated": metrics.last_updated.isoformat()
            }
            
            freshness_scores.append(metrics.freshness_score)
            
            if metrics.refresh_needed:
                report["recommendations"].append(f"Refresh {source} data (staleness: {metrics.staleness_seconds:.1f}s)")
        
        report["overall_freshness"] = np.mean(freshness_scores) if freshness_scores else 0.0
        
        # Add execution history summary
        if self.execution_history:
            recent_executions = [ex for ex in self.execution_history 
                               if (datetime.now() - ex["timestamp"]).seconds < 3600]
            
            report["recent_executions"] = {
                "count": len(recent_executions),
                "success_rate": sum(1 for ex in recent_executions if ex["success"]) / len(recent_executions) if recent_executions else 0,
                "avg_validity_score": np.mean([ex["validity_score"] for ex in recent_executions]) if recent_executions else 0
            }
        
        return report

# Test the data freshness manager
async def test_data_freshness_manager():
    """Test the data freshness manager"""
    
    manager = DataFreshnessManager()
    
    # Test with sample strategy data
    strategy_data = {
        "alchemy_rpc": {
            "block_number": 23452890,
            "gas_price_gwei": 20.5,
            "last_updated": datetime.now() - timedelta(seconds=45)  # 45s old
        },
        "graph_api": {
            "pools": [{"protocol": "uniswap_v3", "apy": 12.5}],
            "last_updated": datetime.now() - timedelta(seconds=90)  # 90s old
        },
        "pyth_oracle": {
            "price_feeds": {"USDC": {"price": 1.0}},
            "last_updated": datetime.now() - timedelta(seconds=5)  # 5s old
        }
    }
    
    print("🧪 Testing Data Freshness Manager...")
    
    # Test execution validity
    validity = await manager.assess_execution_validity(strategy_data)
    
    print(f"\n📊 Validity Assessment:")
    print(f"   Valid: {validity.is_valid}")
    print(f"   Validity Score: {validity.validity_score:.2f}")
    print(f"   Recommended Action: {validity.recommended_action}")
    
    # Test freshness report
    report = manager.get_freshness_report()
    
    print(f"\n📋 Freshness Report:")
    print(f"   Overall Freshness: {report['overall_freshness']:.2f}")
    print(f"   Recommendations: {len(report['recommendations'])}")
    
    for source, data in report["data_sources"].items():
        print(f"   {source}: {data['freshness_score']:.2f} freshness, {data['confidence_level']:.2f} confidence")

if __name__ == "__main__":
    asyncio.run(test_data_freshness_manager())