# src/monitoring/performance_tracker.py
"""Performance tracking and analytics for USDC AI Optimizer"""

import asyncio
import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
import pandas as pd
import numpy as np

@dataclass
class PerformanceMetric:
    """Performance metric data point"""
    timestamp: datetime
    metric_type: str  # "yield", "gas_cost", "rebalance", "execution"
    value: float
    metadata: Optional[Dict] = None

@dataclass
class RebalanceEvent:
    """Rebalancing event data"""
    timestamp: datetime
    strategy: str
    actions_count: int
    total_cost: float
    value_change: float
    execution_time: float
    success_rate: float

class PerformanceTracker:
    """Track and analyze system performance"""
    
    def __init__(self):
        self.metrics_db = []  # In production, use proper database
        self.rebalance_events = []
        self.performance_file = "performance_data.json"
        
        # Load existing data
        self.load_performance_data()
    
    def load_performance_data(self):
        """Load performance data from file"""
        try:
            if os.path.exists(self.performance_file):
                with open(self.performance_file, 'r') as f:
                    data = json.load(f)
                    self.metrics_db = data.get('metrics', [])
                    self.rebalance_events = data.get('rebalance_events', [])
        except Exception as e:
            print(f"Warning: Could not load performance data: {e}")
    
    def save_performance_data(self):
        """Save performance data to file"""
        try:
            data = {
                'metrics': self.metrics_db,
                'rebalance_events': self.rebalance_events,
                'last_updated': datetime.now().isoformat()
            }
            with open(self.performance_file, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Warning: Could not save performance data: {e}")
    
    def record_metric(self, metric_type: str, value: float, metadata: Optional[Dict] = None):
        """Record a performance metric"""
        
        metric = PerformanceMetric(
            timestamp=datetime.now(),
            metric_type=metric_type,
            value=value,
            metadata=metadata
        )
        
        self.metrics_db.append(asdict(metric))
        
        # Keep only last 1000 metrics
        if len(self.metrics_db) > 1000:
            self.metrics_db = self.metrics_db[-1000:]
        
        self.save_performance_data()
    
    def record_rebalance_event(self, event: RebalanceEvent):
        """Record a rebalancing event"""
        
        self.rebalance_events.append(asdict(event))
        
        # Keep only last 100 events
        if len(self.rebalance_events) > 100:
            self.rebalance_events = self.rebalance_events[-100:]
        
        self.save_performance_data()
    
    def get_yield_performance(self, time_period: str = "24h") -> Dict:
        """Get yield performance metrics"""
        
        cutoff_time = self._get_cutoff_time(time_period)
        
        yield_metrics = [
            m for m in self.metrics_db 
            if m['metric_type'] == 'yield' and 
            (datetime.fromisoformat(m['timestamp']) if isinstance(m['timestamp'], str) else m['timestamp']) >= cutoff_time
        ]
        
        if not yield_metrics:
            return {"error": "No yield data available"}
        
        values = [m['value'] for m in yield_metrics]
        
        return {
            "period": time_period,
            "data_points": len(values),
            "average_yield": np.mean(values),
            "max_yield": np.max(values),
            "min_yield": np.min(values),
            "std_deviation": np.std(values),
            "latest_yield": values[-1] if values else 0
        }
    
    def get_gas_cost_analysis(self, time_period: str = "24h") -> Dict:
        """Get gas cost analysis"""
        
        cutoff_time = self._get_cutoff_time(time_period)
        
        gas_metrics = [
            m for m in self.metrics_db 
            if m['metric_type'] == 'gas_cost' and 
            (datetime.fromisoformat(m['timestamp']) if isinstance(m['timestamp'], str) else m['timestamp']) >= cutoff_time
        ]
        
        if not gas_metrics:
            return {"error": "No gas cost data available"}
        
        values = [m['value'] for m in gas_metrics]
        
        return {
            "period": time_period,
            "data_points": len(values),
            "average_cost": np.mean(values),
            "total_cost": np.sum(values),
            "max_cost": np.max(values),
            "min_cost": np.min(values),
            "cost_trend": self._calculate_trend(values)
        }
    
    def get_rebalance_performance(self, time_period: str = "24h") -> Dict:
        """Get rebalancing performance metrics"""
        
        cutoff_time = self._get_cutoff_time(time_period)
        
        recent_events = [
            e for e in self.rebalance_events 
            if (datetime.fromisoformat(e['timestamp']) if isinstance(e['timestamp'], str) else e['timestamp']) >= cutoff_time
        ]
        
        if not recent_events:
            return {"error": "No rebalancing data available"}
        
        return {
            "period": time_period,
            "total_rebalances": len(recent_events),
            "average_actions": np.mean([e['actions_count'] for e in recent_events]),
            "average_cost": np.mean([e['total_cost'] for e in recent_events]),
            "total_cost": np.sum([e['total_cost'] for e in recent_events]),
            "average_value_change": np.mean([e['value_change'] for e in recent_events]),
            "average_execution_time": np.mean([e['execution_time'] for e in recent_events]),
            "average_success_rate": np.mean([e['success_rate'] for e in recent_events]),
            "strategy_distribution": self._get_strategy_distribution(recent_events)
        }
    
    def get_execution_performance(self, time_period: str = "24h") -> Dict:
        """Get execution performance metrics"""
        
        cutoff_time = self._get_cutoff_time(time_period)
        
        execution_metrics = [
            m for m in self.metrics_db 
            if m['metric_type'] == 'execution' and 
            (datetime.fromisoformat(m['timestamp']) if isinstance(m['timestamp'], str) else m['timestamp']) >= cutoff_time
        ]
        
        if not execution_metrics:
            return {"error": "No execution data available"}
        
        values = [m['value'] for m in execution_metrics]
        
        return {
            "period": time_period,
            "data_points": len(values),
            "average_execution_time": np.mean(values),
            "max_execution_time": np.max(values),
            "min_execution_time": np.min(values),
            "execution_trend": self._calculate_trend(values)
        }
    
    def generate_performance_report(self, time_period: str = "24h") -> Dict:
        """Generate comprehensive performance report"""
        
        print(f"📊 Generating Performance Report for {time_period}")
        print("=" * 50)
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "period": time_period,
            "yield_performance": self.get_yield_performance(time_period),
            "gas_cost_analysis": self.get_gas_cost_analysis(time_period),
            "rebalance_performance": self.get_rebalance_performance(time_period),
            "execution_performance": self.get_execution_performance(time_period)
        }
        
        return report
    
    def _get_cutoff_time(self, time_period: str) -> datetime:
        """Get cutoff time for time period"""
        
        now = datetime.now()
        
        if time_period == "1h":
            return now - timedelta(hours=1)
        elif time_period == "24h":
            return now - timedelta(hours=24)
        elif time_period == "7d":
            return now - timedelta(days=7)
        elif time_period == "30d":
            return now - timedelta(days=30)
        else:
            return now - timedelta(hours=24)  # Default to 24h
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction"""
        
        if len(values) < 2:
            return "insufficient_data"
        
        # Simple linear trend calculation
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]
        
        if slope > 0.01:
            return "increasing"
        elif slope < -0.01:
            return "decreasing"
        else:
            return "stable"
    
    def _get_strategy_distribution(self, events: List[Dict]) -> Dict[str, int]:
        """Get strategy distribution from rebalance events"""
        
        distribution = {}
        for event in events:
            strategy = event.get('strategy', 'unknown')
            distribution[strategy] = distribution.get(strategy, 0) + 1
        
        return distribution
    
    def get_top_performing_strategies(self, time_period: str = "7d") -> List[Dict]:
        """Get top performing strategies"""
        
        cutoff_time = self._get_cutoff_time(time_period)
        
        recent_events = [
            e for e in self.rebalance_events 
            if (datetime.fromisoformat(e['timestamp']) if isinstance(e['timestamp'], str) else e['timestamp']) >= cutoff_time
        ]
        
        if not recent_events:
            return []
        
        # Group by strategy and calculate performance
        strategy_performance = {}
        
        for event in recent_events:
            strategy = event.get('strategy', 'unknown')
            
            if strategy not in strategy_performance:
                strategy_performance[strategy] = {
                    'total_value_change': 0,
                    'total_cost': 0,
                    'event_count': 0,
                    'success_rate': 0
                }
            
            strategy_performance[strategy]['total_value_change'] += event.get('value_change', 0)
            strategy_performance[strategy]['total_cost'] += event.get('total_cost', 0)
            strategy_performance[strategy]['event_count'] += 1
            strategy_performance[strategy]['success_rate'] += event.get('success_rate', 0)
        
        # Calculate net performance (value change - costs)
        top_strategies = []
        
        for strategy, data in strategy_performance.items():
            net_performance = data['total_value_change'] - data['total_cost']
            avg_success_rate = data['success_rate'] / data['event_count'] if data['event_count'] > 0 else 0
            
            top_strategies.append({
                'strategy': strategy,
                'net_performance': net_performance,
                'total_value_change': data['total_value_change'],
                'total_cost': data['total_cost'],
                'event_count': data['event_count'],
                'average_success_rate': avg_success_rate
            })
        
        # Sort by net performance
        top_strategies.sort(key=lambda x: x['net_performance'], reverse=True)
        
        return top_strategies[:5]  # Top 5 strategies
    
    def export_performance_data(self, filename: Optional[str] = None) -> str:
        """Export performance data to CSV"""
        
        if not filename:
            filename = f"performance_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        try:
            # Convert metrics to DataFrame
            df_metrics = pd.DataFrame(self.metrics_db)
            df_rebalances = pd.DataFrame(self.rebalance_events)
            
            # Export to CSV
            df_metrics.to_csv(f"metrics_{filename}", index=False)
            df_rebalances.to_csv(f"rebalances_{filename}", index=False)
            
            return f"Data exported to metrics_{filename} and rebalances_{filename}"
            
        except Exception as e:
            return f"Export failed: {e}"

# Performance monitoring loop
async def performance_monitoring():
    """Run continuous performance monitoring"""
    
    tracker = PerformanceTracker()
    
    print("📈 Starting Performance Monitoring")
    print("=" * 50)
    
    while True:
        try:
            # Generate performance report
            report = tracker.generate_performance_report("24h")
            
            # Print key metrics
            print(f"\n📊 PERFORMANCE SUMMARY - {report['timestamp']}")
            
            if 'error' not in report['yield_performance']:
                yield_data = report['yield_performance']
                print(f"Yield: {yield_data['average_yield']:.2f}% "
                      f"(Latest: {yield_data['latest_yield']:.2f}%)")
            
            if 'error' not in report['gas_cost_analysis']:
                gas_data = report['gas_cost_analysis']
                print(f"Gas Costs: ${gas_data['average_cost']:.2f} "
                      f"(Total: ${gas_data['total_cost']:.2f})")
            
            if 'error' not in report['rebalance_performance']:
                rebalance_data = report['rebalance_performance']
                print(f"Rebalances: {rebalance_data['total_rebalances']} "
                      f"(Success Rate: {rebalance_data['average_success_rate']:.1%})")
            
            # Get top strategies
            top_strategies = tracker.get_top_performing_strategies("7d")
            if top_strategies:
                print(f"Top Strategy: {top_strategies[0]['strategy']} "
                      f"(Net: ${top_strategies[0]['net_performance']:.2f})")
            
            # Wait for next check (every 5 minutes)
            await asyncio.sleep(300)
            
        except Exception as e:
            print(f"❌ Performance monitoring error: {e}")
            await asyncio.sleep(60)  # Wait 1 minute before retry

if __name__ == "__main__":
    asyncio.run(performance_monitoring())