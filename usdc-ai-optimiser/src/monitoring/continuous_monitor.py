# src/monitoring/continuous_monitor.py
"""24/7 Continuous Monitoring System"""

import asyncio
import json
import os
from typing import Dict, List
from datetime import datetime, timedelta
from dataclasses import asdict

from .health_monitor import SystemHealthMonitor
from .performance_tracker import PerformanceTracker
from .alert_system import AlertSystem, AlertSeverity

class ContinuousMonitor:
    """Main continuous monitoring system"""
    
    def __init__(self):
        self.health_monitor = SystemHealthMonitor()
        self.performance_tracker = PerformanceTracker()
        self.alert_system = AlertSystem()
        
        self.monitoring_active = True
        self.check_interval = 60  # Check every 60 seconds
        self.performance_interval = 300  # Performance check every 5 minutes
        
        # State tracking
        self.last_health_check = None
        self.last_performance_check = None
        self.previous_yield = None
        self.previous_gas_cost = None
        
        print("🚀 USDC AI Optimizer - 24/7 Monitoring System")
        print("=" * 60)
        print(f"Health Check Interval: {self.check_interval}s")
        print(f"Performance Check Interval: {self.performance_interval}s")
        print(f"Alert Channels: {[k for k, v in self.alert_system.alert_channels.items() if v]}")
        print("=" * 60)
    
    async def start_monitoring(self):
        """Start the continuous monitoring loop"""
        
        print("🔄 Starting continuous monitoring...")
        
        # Start background tasks
        health_task = asyncio.create_task(self._health_monitoring_loop())
        performance_task = asyncio.create_task(self._performance_monitoring_loop())
        alert_task = asyncio.create_task(self._alert_monitoring_loop())
        
        try:
            # Run all tasks concurrently
            await asyncio.gather(health_task, performance_task, alert_task)
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped by user")
            self.monitoring_active = False
        except Exception as e:
            print(f"\n❌ Monitoring error: {e}")
            self.monitoring_active = False
    
    async def _health_monitoring_loop(self):
        """Health monitoring loop"""
        
        while self.monitoring_active:
            try:
                print(f"\n🔍 Health Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Perform health check
                components = await self.health_monitor.check_all_components()
                
                # Generate health report
                health_report = self.health_monitor.generate_health_report(components)
                
                # Check for alerts
                self.alert_system.check_health_alerts(health_report['components'])
                
                # Print status
                overall_health = health_report['overall_health']
                status_emoji = {
                    'healthy': '✅',
                    'degraded': '⚠️',
                    'unhealthy': '🚨'
                }
                
                print(f"{status_emoji.get(overall_health, '❓')} Overall Health: {overall_health.upper()}")
                print(f"   Components: {health_report['summary']['healthy']} healthy, "
                      f"{health_report['summary']['degraded']} degraded, "
                      f"{health_report['summary']['unhealthy']} unhealthy")
                
                # Store health check time
                self.last_health_check = datetime.now()
                
                # Record health metrics
                self.performance_tracker.record_metric(
                    "health_score",
                    health_report['summary']['healthy'] / health_report['summary']['total_components'],
                    {"overall_health": overall_health}
                )
                
                # Wait for next check
                await asyncio.sleep(self.check_interval)
                
            except Exception as e:
                print(f"❌ Health monitoring error: {e}")
                await asyncio.sleep(30)  # Wait 30 seconds before retry
    
    async def _performance_monitoring_loop(self):
        """Performance monitoring loop"""
        
        while self.monitoring_active:
            try:
                print(f"\n📊 Performance Check - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
                
                # Generate performance report
                performance_report = self.performance_tracker.generate_performance_report("24h")
                
                # Check for performance alerts
                await self._check_performance_alerts(performance_report)
                
                # Print key metrics
                self._print_performance_summary(performance_report)
                
                # Store performance check time
                self.last_performance_check = datetime.now()
                
                # Wait for next check
                await asyncio.sleep(self.performance_interval)
                
            except Exception as e:
                print(f"❌ Performance monitoring error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def _alert_monitoring_loop(self):
        """Alert monitoring loop"""
        
        while self.monitoring_active:
            try:
                # Check for unresolved critical alerts
                critical_alerts = self.alert_system.get_active_alerts(AlertSeverity.CRITICAL)
                
                if critical_alerts:
                    print(f"\n🚨 CRITICAL ALERTS ACTIVE: {len(critical_alerts)}")
                    for alert in critical_alerts:
                        print(f"   - {alert.title} ({alert.component})")
                
                # Check alert summary
                alert_summary = self.alert_system.get_alert_summary()
                
                if alert_summary['active_alerts'] > 0:
                    print(f"\n📢 Active Alerts: {alert_summary['active_alerts']}")
                    print(f"   Critical: {alert_summary['by_severity']['critical']}")
                    print(f"   High: {alert_summary['by_severity']['high']}")
                    print(f"   Medium: {alert_summary['by_severity']['medium']}")
                    print(f"   Low: {alert_summary['by_severity']['low']}")
                
                # Wait for next check
                await asyncio.sleep(300)  # Check alerts every 5 minutes
                
            except Exception as e:
                print(f"❌ Alert monitoring error: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retry
    
    async def _check_performance_alerts(self, performance_report: Dict):
        """Check for performance-related alerts"""
        
        try:
            # Check yield performance
            yield_data = performance_report.get('yield_performance', {})
            if 'error' not in yield_data:
                current_yield = yield_data.get('latest_yield', 0)
                
                if self.previous_yield is not None:
                    self.alert_system.check_yield_alerts(current_yield, self.previous_yield)
                
                self.previous_yield = current_yield
            
            # Check gas cost performance
            gas_data = performance_report.get('gas_cost_analysis', {})
            if 'error' not in gas_data:
                current_cost = gas_data.get('average_cost', 0)
                average_cost = gas_data.get('average_cost', 0)
                
                if self.previous_gas_cost is not None:
                    self.alert_system.check_gas_cost_alerts(current_cost, self.previous_gas_cost)
                
                self.previous_gas_cost = current_cost
            
            # Check rebalancing performance
            rebalance_data = performance_report.get('rebalance_performance', {})
            if 'error' not in rebalance_data:
                success_rate = rebalance_data.get('average_success_rate', 1.0)
                failure_count = rebalance_data.get('total_rebalances', 0) * (1 - success_rate)
                
                self.alert_system.check_rebalance_alerts(success_rate, int(failure_count))
                
        except Exception as e:
            print(f"⚠️ Performance alert check error: {e}")
    
    def _print_performance_summary(self, performance_report: Dict):
        """Print performance summary"""
        
        print("📈 Performance Summary:")
        
        # Yield performance
        yield_data = performance_report.get('yield_performance', {})
        if 'error' not in yield_data:
            print(f"   Yield: {yield_data.get('average_yield', 0):.2f}% "
                  f"(Latest: {yield_data.get('latest_yield', 0):.2f}%)")
        
        # Gas cost analysis
        gas_data = performance_report.get('gas_cost_analysis', {})
        if 'error' not in gas_data:
            print(f"   Gas Costs: ${gas_data.get('average_cost', 0):.2f} "
                  f"(Total: ${gas_data.get('total_cost', 0):.2f})")
        
        # Rebalancing performance
        rebalance_data = performance_report.get('rebalance_performance', {})
        if 'error' not in rebalance_data:
            print(f"   Rebalances: {rebalance_data.get('total_rebalances', 0)} "
                  f"(Success: {rebalance_data.get('average_success_rate', 0):.1%})")
        
        # Execution performance
        execution_data = performance_report.get('execution_performance', {})
        if 'error' not in execution_data:
            print(f"   Execution Time: {execution_data.get('average_execution_time', 0):.2f}s")
    
    async def get_system_status(self) -> Dict:
        """Get comprehensive system status"""
        
        status = {
            "timestamp": datetime.now().isoformat(),
            "monitoring_active": self.monitoring_active,
            "last_health_check": self.last_health_check.isoformat() if self.last_health_check else None,
            "last_performance_check": self.last_performance_check.isoformat() if self.last_performance_check else None,
            "alert_summary": self.alert_system.get_alert_summary()
        }
        
        return status
    
    async def stop_monitoring(self):
        """Stop the monitoring system"""
        
        print("\n🛑 Stopping monitoring system...")
        self.monitoring_active = False
        
        # Export final performance data
        export_result = self.performance_tracker.export_performance_data()
        print(f"📊 Performance data exported: {export_result}")
        
        print("✅ Monitoring system stopped")

# Main monitoring function
async def start_24_7_monitoring():
    """Start 24/7 monitoring system"""
    
    monitor = ContinuousMonitor()
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\n🛑 Received interrupt signal")
    finally:
        await monitor.stop_monitoring()

# Quick status check
async def quick_status_check():
    """Perform a quick system status check"""
    
    print("🔍 Quick System Status Check")
    print("=" * 40)
    
    health_monitor = SystemHealthMonitor()
    performance_tracker = PerformanceTracker()
    alert_system = AlertSystem()
    
    # Health check
    print("Checking system health...")
    components = await health_monitor.check_all_components()
    health_report = health_monitor.generate_health_report(components)
    
    print(f"Overall Health: {health_report['overall_health'].upper()}")
    print(f"Components: {health_report['summary']['healthy']} healthy, "
          f"{health_report['summary']['degraded']} degraded, "
          f"{health_report['summary']['unhealthy']} unhealthy")
    
    # Performance check
    print("\nChecking performance...")
    performance_report = performance_tracker.generate_performance_report("24h")
    
    yield_data = performance_report.get('yield_performance', {})
    if 'error' not in yield_data:
        print(f"Average Yield: {yield_data.get('average_yield', 0):.2f}%")
    
    # Alert check
    print("\nChecking alerts...")
    alert_summary = alert_system.get_alert_summary()
    print(f"Active Alerts: {alert_summary['active_alerts']}")
    
    if alert_summary['active_alerts'] > 0:
        print("🚨 Active alerts detected!")
        for severity, count in alert_summary['by_severity'].items():
            if count > 0:
                print(f"   {severity.title()}: {count}")
    
    print("\n✅ Status check complete!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        asyncio.run(quick_status_check())
    else:
        asyncio.run(start_24_7_monitoring())