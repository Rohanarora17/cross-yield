# src/monitoring/alert_system.py
"""Alert system for USDC AI Optimizer"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
from enum import Enum

class AlertSeverity(Enum):
    """Alert severity levels"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class Alert:
    """Alert data structure"""
    id: str
    severity: AlertSeverity
    title: str
    message: str
    timestamp: datetime
    component: str
    resolved: bool = False
    metadata: Optional[Dict] = None

class AlertSystem:
    """Comprehensive alert system"""
    
    def __init__(self):
        self.alerts_db = []
        self.alert_channels = {
            "console": True,
            "discord": False,
            "email": False,
            "telegram": False
        }
        
        # Alert thresholds
        self.thresholds = {
            "response_time": 10.0,  # 10 seconds
            "error_rate": 0.2,     # 20%
            "yield_drop": 0.1,     # 10% yield drop
            "gas_cost_spike": 2.0,  # 2x normal gas cost
            "rebalance_failure": 0.5,  # 50% failure rate
            "api_down_time": 300    # 5 minutes
        }
        
        # Load webhook URLs from environment
        self.discord_webhook = os.getenv('DISCORD_WEBHOOK')
        self.telegram_token = os.getenv('TELEGRAM_BOT_TOKEN')
        self.telegram_chat_id = os.getenv('TELEGRAM_CHAT_ID')
        self.email_smtp_server = os.getenv('EMAIL_SMTP_SERVER')
        self.email_username = os.getenv('EMAIL_USERNAME')
        self.email_password = os.getenv('EMAIL_PASSWORD')
        self.email_to = os.getenv('EMAIL_TO')
        
        # Enable channels if configured
        if self.discord_webhook:
            self.alert_channels["discord"] = True
        if self.telegram_token and self.telegram_chat_id:
            self.alert_channels["telegram"] = True
        if self.email_smtp_server and self.email_username:
            self.alert_channels["email"] = True
    
    def create_alert(
        self,
        severity: AlertSeverity,
        title: str,
        message: str,
        component: str,
        metadata: Optional[Dict] = None
    ) -> Alert:
        """Create a new alert"""
        
        alert_id = f"{component}_{int(datetime.now().timestamp())}"
        
        alert = Alert(
            id=alert_id,
            severity=severity,
            title=title,
            message=message,
            timestamp=datetime.now(),
            component=component,
            metadata=metadata
        )
        
        self.alerts_db.append(alert)
        
        # Keep only last 1000 alerts
        if len(self.alerts_db) > 1000:
            self.alerts_db = self.alerts_db[-1000:]
        
        return alert
    
    async def send_alert(self, alert: Alert):
        """Send alert through all configured channels"""
        
        print(f"🚨 ALERT [{alert.severity.value.upper()}] {alert.title}")
        print(f"   Component: {alert.component}")
        print(f"   Message: {alert.message}")
        print(f"   Time: {alert.timestamp}")
        
        # Send to console (always enabled)
        if self.alert_channels["console"]:
            await self._send_to_console(alert)
        
        # Send to Discord
        if self.alert_channels["discord"] and self.discord_webhook:
            await self._send_to_discord(alert)
        
        # Send to Telegram
        if self.alert_channels["telegram"] and self.telegram_token:
            await self._send_to_telegram(alert)
        
        # Send to Email
        if self.alert_channels["email"] and self.email_smtp_server:
            await self._send_to_email(alert)
    
    async def _send_to_console(self, alert: Alert):
        """Send alert to console"""
        
        severity_emoji = {
            AlertSeverity.LOW: "ℹ️",
            AlertSeverity.MEDIUM: "⚠️",
            AlertSeverity.HIGH: "🚨",
            AlertSeverity.CRITICAL: "🔥"
        }
        
        emoji = severity_emoji.get(alert.severity, "📢")
        
        print(f"\n{emoji} ALERT: {alert.title}")
        print(f"   Severity: {alert.severity.value.upper()}")
        print(f"   Component: {alert.component}")
        print(f"   Message: {alert.message}")
        print(f"   Time: {alert.timestamp}")
        if alert.metadata:
            print(f"   Metadata: {alert.metadata}")
        print("-" * 50)
    
    async def _send_to_discord(self, alert: Alert):
        """Send alert to Discord webhook"""
        
        try:
            severity_colors = {
                AlertSeverity.LOW: 0x00ff00,      # Green
                AlertSeverity.MEDIUM: 0xffff00,    # Yellow
                AlertSeverity.HIGH: 0xff8800,      # Orange
                AlertSeverity.CRITICAL: 0xff0000   # Red
            }
            
            embed = {
                "title": f"🚨 {alert.title}",
                "description": alert.message,
                "color": severity_colors.get(alert.severity, 0x0099ff),
                "fields": [
                    {
                        "name": "Severity",
                        "value": alert.severity.value.upper(),
                        "inline": True
                    },
                    {
                        "name": "Component",
                        "value": alert.component,
                        "inline": True
                    },
                    {
                        "name": "Time",
                        "value": alert.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
                        "inline": True
                    }
                ],
                "timestamp": alert.timestamp.isoformat()
            }
            
            if alert.metadata:
                embed["fields"].append({
                    "name": "Details",
                    "value": json.dumps(alert.metadata, indent=2),
                    "inline": False
                })
            
            payload = {
                "embeds": [embed]
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.discord_webhook,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status != 204:
                        print(f"Discord webhook failed: {response.status}")
                        
        except Exception as e:
            print(f"Failed to send Discord alert: {e}")
    
    async def _send_to_telegram(self, alert: Alert):
        """Send alert to Telegram"""
        
        try:
            severity_emoji = {
                AlertSeverity.LOW: "ℹ️",
                AlertSeverity.MEDIUM: "⚠️",
                AlertSeverity.HIGH: "🚨",
                AlertSeverity.CRITICAL: "🔥"
            }
            
            emoji = severity_emoji.get(alert.severity, "📢")
            
            message = f"{emoji} *{alert.title}*\n\n"
            message += f"*Severity:* {alert.severity.value.upper()}\n"
            message += f"*Component:* {alert.component}\n"
            message += f"*Message:* {alert.message}\n"
            message += f"*Time:* {alert.timestamp.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
            
            if alert.metadata:
                message += f"*Details:*\n```json\n{json.dumps(alert.metadata, indent=2)}\n```"
            
            url = f"https://api.telegram.org/bot{self.telegram_token}/sendMessage"
            
            payload = {
                "chat_id": self.telegram_chat_id,
                "text": message,
                "parse_mode": "Markdown"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    url,
                    json=payload,
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status != 200:
                        print(f"Telegram API failed: {response.status}")
                        
        except Exception as e:
            print(f"Failed to send Telegram alert: {e}")
    
    async def _send_to_email(self, alert: Alert):
        """Send alert to email"""
        
        try:
            import smtplib
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            msg = MIMEMultipart()
            msg['From'] = self.email_username
            msg['To'] = self.email_to
            msg['Subject'] = f"[{alert.severity.value.upper()}] {alert.title}"
            
            body = f"""
Alert Details:
- Severity: {alert.severity.value.upper()}
- Component: {alert.component}
- Message: {alert.message}
- Time: {alert.timestamp}

Metadata:
{json.dumps(alert.metadata, indent=2) if alert.metadata else 'None'}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            server = smtplib.SMTP(self.email_smtp_server, 587)
            server.starttls()
            server.login(self.email_username, self.email_password)
            text = msg.as_string()
            server.sendmail(self.email_username, self.email_to, text)
            server.quit()
            
        except Exception as e:
            print(f"Failed to send email alert: {e}")
    
    def check_health_alerts(self, health_components: Dict):
        """Check for health-related alerts"""
        
        for component_name, component_data in health_components.items():
            # Check for unhealthy components
            if component_data.get('status') == 'unhealthy':
                alert = self.create_alert(
                    severity=AlertSeverity.HIGH,
                    title=f"Component Unhealthy: {component_name}",
                    message=f"Component {component_name} is reporting unhealthy status",
                    component=component_name,
                    metadata=component_data
                )
                asyncio.create_task(self.send_alert(alert))
            
            # Check for degraded components
            elif component_data.get('status') == 'degraded':
                alert = self.create_alert(
                    severity=AlertSeverity.MEDIUM,
                    title=f"Component Degraded: {component_name}",
                    message=f"Component {component_name} is reporting degraded status",
                    component=component_name,
                    metadata=component_data
                )
                asyncio.create_task(self.send_alert(alert))
            
            # Check response times
            response_time = component_data.get('response_time', 0)
            if response_time > self.thresholds['response_time']:
                alert = self.create_alert(
                    severity=AlertSeverity.MEDIUM,
                    title=f"High Response Time: {component_name}",
                    message=f"Component {component_name} has high response time: {response_time:.2f}s",
                    component=component_name,
                    metadata=component_data
                )
                asyncio.create_task(self.send_alert(alert))
    
    def check_yield_alerts(self, current_yield: float, previous_yield: float):
        """Check for yield-related alerts"""
        
        if previous_yield > 0:
            yield_change = (current_yield - previous_yield) / previous_yield
            
            if yield_change < -self.thresholds['yield_drop']:
                severity = AlertSeverity.HIGH if yield_change < -0.2 else AlertSeverity.MEDIUM
                
                alert = self.create_alert(
                    severity=severity,
                    title="Significant Yield Drop Detected",
                    message=f"Yield dropped by {yield_change:.1%} ({previous_yield:.2f}% → {current_yield:.2f}%)",
                    component="yield_monitor",
                    metadata={
                        "current_yield": current_yield,
                        "previous_yield": previous_yield,
                        "yield_change": yield_change
                    }
                )
                asyncio.create_task(self.send_alert(alert))
    
    def check_gas_cost_alerts(self, current_cost: float, average_cost: float):
        """Check for gas cost alerts"""
        
        if average_cost > 0:
            cost_ratio = current_cost / average_cost
            
            if cost_ratio > self.thresholds['gas_cost_spike']:
                alert = self.create_alert(
                    severity=AlertSeverity.MEDIUM,
                    title="Gas Cost Spike Detected",
                    message=f"Gas cost is {cost_ratio:.1f}x higher than average (${current_cost:.2f} vs ${average_cost:.2f})",
                    component="gas_monitor",
                    metadata={
                        "current_cost": current_cost,
                        "average_cost": average_cost,
                        "cost_ratio": cost_ratio
                    }
                )
                asyncio.create_task(self.send_alert(alert))
    
    def check_rebalance_alerts(self, success_rate: float, failure_count: int):
        """Check for rebalancing alerts"""
        
        if success_rate < (1 - self.thresholds['rebalance_failure']):
            alert = self.create_alert(
                severity=AlertSeverity.HIGH,
                title="High Rebalancing Failure Rate",
                message=f"Rebalancing success rate is only {success_rate:.1%} ({failure_count} failures)",
                component="rebalancer",
                metadata={
                    "success_rate": success_rate,
                    "failure_count": failure_count
                }
            )
            asyncio.create_task(self.send_alert(alert))
    
    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts, optionally filtered by severity"""
        
        alerts = [alert for alert in self.alerts_db if not alert.resolved]
        
        if severity:
            alerts = [alert for alert in alerts if alert.severity == severity]
        
        return alerts
    
    def resolve_alert(self, alert_id: str):
        """Mark an alert as resolved"""
        
        for alert in self.alerts_db:
            if alert.id == alert_id:
                alert.resolved = True
                break
    
    def get_alert_summary(self) -> Dict:
        """Get alert summary statistics"""
        
        active_alerts = [alert for alert in self.alerts_db if not alert.resolved]
        
        summary = {
            "total_alerts": len(self.alerts_db),
            "active_alerts": len(active_alerts),
            "resolved_alerts": len(self.alerts_db) - len(active_alerts),
            "by_severity": {
                "critical": len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
                "high": len([a for a in active_alerts if a.severity == AlertSeverity.HIGH]),
                "medium": len([a for a in active_alerts if a.severity == AlertSeverity.MEDIUM]),
                "low": len([a for a in active_alerts if a.severity == AlertSeverity.LOW])
            },
            "by_component": {}
        }
        
        # Count by component
        for alert in active_alerts:
            component = alert.component
            summary["by_component"][component] = summary["by_component"].get(component, 0) + 1
        
        return summary

# Test alert system
async def test_alert_system():
    """Test the alert system"""
    
    print("🧪 Testing Alert System")
    print("=" * 40)
    
    alert_system = AlertSystem()
    
    # Test different severity levels
    test_alerts = [
        AlertSeverity.LOW,
        AlertSeverity.MEDIUM,
        AlertSeverity.HIGH,
        AlertSeverity.CRITICAL
    ]
    
    for severity in test_alerts:
        alert = alert_system.create_alert(
            severity=severity,
            title=f"Test Alert - {severity.value.title()}",
            message=f"This is a test alert with {severity.value} severity",
            component="test_system",
            metadata={"test": True, "severity": severity.value}
        )
        
        await alert_system.send_alert(alert)
        await asyncio.sleep(1)  # Small delay between alerts
    
    # Test alert summary
    summary = alert_system.get_alert_summary()
    print(f"\n📊 Alert Summary:")
    print(f"   Total Alerts: {summary['total_alerts']}")
    print(f"   Active Alerts: {summary['active_alerts']}")
    print(f"   By Severity: {summary['by_severity']}")
    
    print("\n✅ Alert system test complete!")

if __name__ == "__main__":
    asyncio.run(test_alert_system())