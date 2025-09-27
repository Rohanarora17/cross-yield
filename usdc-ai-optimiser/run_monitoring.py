#!/usr/bin/env python3
"""Run 24/7 monitoring system for USDC AI Optimizer"""

import asyncio
import sys
import os

# Add src to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.monitoring.continuous_monitor import start_24_7_monitoring, quick_status_check

def main():
    """Main function"""
    
    print("🚀 USDC AI Optimizer - Monitoring System")
    print("=" * 50)
    
    if len(sys.argv) > 1:
        command = sys.argv[1].lower()
        
        if command == "status":
            print("🔍 Running quick status check...")
            asyncio.run(quick_status_check())
        elif command == "start":
            print("🔄 Starting 24/7 monitoring...")
            asyncio.run(start_24_7_monitoring())
        elif command == "help":
            print("Usage:")
            print("  python run_monitoring.py start    - Start 24/7 monitoring")
            print("  python run_monitoring.py status   - Quick status check")
            print("  python run_monitoring.py help     - Show this help")
        else:
            print(f"Unknown command: {command}")
            print("Use 'help' to see available commands")
    else:
        print("🔄 Starting 24/7 monitoring...")
        asyncio.run(start_24_7_monitoring())

if __name__ == "__main__":
    main()