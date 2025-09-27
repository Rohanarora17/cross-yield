#!/usr/bin/env python3
"""
CrossYield Main Backend Entry Point
Starts the smart wallet management system
"""

import asyncio
import logging
import signal
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.smart_wallet_manager import smart_wallet_manager
from src.contract_integration import contract_manager
from src.smart_wallet_cctp import smart_wallet_cctp

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('crossyield.log'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

class CrossYieldBackend:
    """Main CrossYield backend application"""

    def __init__(self):
        self.running = False
        self.tasks = []

    async def start(self):
        """Start the CrossYield backend"""
        logger.info("🚀 Starting CrossYield Backend System")

        try:
            # Check contract connections
            await self._check_contract_connections()

            # Start smart wallet manager
            await smart_wallet_manager.start()

            # Start main event loop
            self.running = True
            await self._main_loop()

        except Exception as e:
            logger.error(f"❌ Error starting backend: {e}")
            raise

    async def _check_contract_connections(self):
        """Check that we can connect to all required chains"""
        logger.info("🔍 Checking contract connections...")

        connected_chains = list(contract_manager.web3_clients.keys())
        logger.info(f"✅ Connected to {len(connected_chains)} chains: {connected_chains}")

        if len(connected_chains) == 0:
            raise Exception("No blockchain connections available")

        # Test contract calls
        for chain in connected_chains:
            try:
                factory = contract_manager.get_contract(chain, "smartWalletFactory")
                total_wallets = factory.functions.getTotalWallets().call()
                logger.info(f"   📱 {chain}: {total_wallets} wallets created")
            except Exception as e:
                logger.warning(f"   ⚠️ {chain}: Contract call failed - {e}")

    async def _main_loop(self):
        """Main application loop"""
        logger.info("🔄 Starting main event loop")

        try:
            while self.running:
                # System status logging
                status = smart_wallet_manager.get_system_status()
                logger.info(f"📊 System Status: {status['total_users']} users, "
                          f"{status['pending_optimizations']} pending optimizations, "
                          f"{status['active_cctp_transfers']} active transfers")

                # Sleep for 60 seconds
                await asyncio.sleep(60)

        except asyncio.CancelledError:
            logger.info("🛑 Main loop cancelled")
        except Exception as e:
            logger.error(f"❌ Error in main loop: {e}")
        finally:
            await self._shutdown()

    async def _shutdown(self):
        """Graceful shutdown"""
        logger.info("🛑 Shutting down CrossYield backend...")
        self.running = False

        # Cancel all tasks
        for task in self.tasks:
            task.cancel()

        # Wait for tasks to complete
        if self.tasks:
            await asyncio.gather(*self.tasks, return_exceptions=True)

        logger.info("✅ CrossYield backend shutdown complete")

    def stop(self):
        """Stop the backend (called by signal handler)"""
        logger.info("🛑 Stop signal received")
        self.running = False

# Global backend instance
backend = CrossYieldBackend()

def signal_handler(signum, frame):
    """Handle shutdown signals"""
    logger.info(f"Received signal {signum}")
    backend.stop()

async def main():
    """Main entry point"""
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    try:
        await backend.start()
    except KeyboardInterrupt:
        logger.info("🛑 Keyboard interrupt received")
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("🔥 CrossYield Smart Wallet Backend")
    print("===================================")
    print("Multi-chain USDC yield optimization with individual smart wallets")
    print("Supported chains: Ethereum, Base, Arbitrum (Testnets)")
    print("===================================")

    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n👋 Goodbye!")
    except Exception as e:
        print(f"\n💥 Fatal error: {e}")
        sys.exit(1)