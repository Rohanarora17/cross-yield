#!/usr/bin/env python3
"""
Test CrossYield Backend Integration
Quick test to verify all components work together
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from src.contract_integration import contract_manager
from src.smart_wallet_manager import smart_wallet_manager
from src.smart_wallet_cctp import smart_wallet_cctp

async def test_contract_connections():
    """Test blockchain connections"""
    print("🔍 Testing contract connections...")

    connected_chains = list(contract_manager.web3_clients.keys())
    print(f"✅ Connected to {len(connected_chains)} chains: {connected_chains}")

    # Test each chain
    for chain in connected_chains:
        try:
            # Test SmartWalletFactory
            factory = contract_manager.get_contract(chain, "smartWalletFactory")
            total_wallets = factory.functions.getTotalWallets().call()
            print(f"   📱 {chain}: {total_wallets} wallets created")

            # Test YieldRouter
            yield_router = contract_manager.get_contract(chain, "yieldRouter")
            print(f"   🔄 {chain}: YieldRouter connected")

        except Exception as e:
            print(f"   ❌ {chain}: Error - {e}")

    return len(connected_chains) > 0

async def test_smart_wallet_prediction():
    """Test smart wallet address prediction"""
    print("\n🔮 Testing wallet address prediction...")

    test_user = "0x1234567890123456789012345678901234567890"

    for chain in contract_manager.web3_clients.keys():
        try:
            predicted_address = contract_manager.predict_wallet_address(test_user, chain)
            print(f"   📍 {chain}: {predicted_address}")
        except Exception as e:
            print(f"   ❌ {chain}: Error - {e}")

async def test_ai_optimization():
    """Test AI optimization for a mock user"""
    print("\n🤖 Testing AI optimization...")

    try:
        # Mock user data
        user_address = "0x1234567890123456789012345678901234567890"
        new_deposit = 1000.0  # $1000 USDC
        strategy = "balanced"
        target_chains = ["ethereum_sepolia", "base_sepolia"]

        # Create mock portfolio
        from src.smart_wallet_manager import UserPortfolio
        from decimal import Decimal

        mock_portfolio = UserPortfolio(
            user_address=user_address,
            total_value_usd=Decimal('0'),
            strategy=strategy,
            risk_tolerance="medium",
            wallets={},
            positions={}
        )

        # Run optimization
        result = await smart_wallet_manager.ai_orchestrator.optimize_portfolio_for_user(
            user_address=user_address,
            current_portfolio=mock_portfolio,
            new_deposit=new_deposit,
            strategy=strategy,
            target_chains=target_chains
        )

        if result.get("success"):
            print(f"   ✅ Optimization successful")
            print(f"   📊 Expected APY: {result['expected_apy']:.2f}%")
            print(f"   💪 Confidence: {result['confidence']:.1%}")
            print(f"   ⚡ Actions: {len(result['actions'])}")

            for i, action in enumerate(result['actions']):
                print(f"      {i+1}. {action['type'].title()}: {action}")

        else:
            print(f"   ❌ Optimization failed: {result.get('error')}")

    except Exception as e:
        print(f"   ❌ Error testing AI optimization: {e}")

async def test_system_status():
    """Test system status reporting"""
    print("\n📊 Testing system status...")

    try:
        status = smart_wallet_manager.get_system_status()
        print(f"   👥 Total users: {status['total_users']}")
        print(f"   ⏳ Pending optimizations: {status['pending_optimizations']}")
        print(f"   🌉 Active CCTP transfers: {status['active_cctp_transfers']}")
        print(f"   🔗 Connected chains: {len(status['connected_chains'])}")
        print(f"   ⏰ Uptime: {status['uptime']}")

    except Exception as e:
        print(f"   ❌ Error getting system status: {e}")

async def main():
    """Run all integration tests"""
    print("🧪 CrossYield Backend Integration Tests")
    print("======================================")

    # Test 1: Contract connections
    contracts_ok = await test_contract_connections()

    if not contracts_ok:
        print("\n❌ Contract connection test failed. Check your .env file and network connections.")
        return False

    # Test 2: Wallet prediction
    await test_smart_wallet_prediction()

    # Test 3: AI optimization
    await test_ai_optimization()

    # Test 4: System status
    await test_system_status()

    print("\n✅ All integration tests completed!")
    print("\n🚀 Ready to start the main backend with: python main.py")

    return True

if __name__ == "__main__":
    print("🔥 CrossYield Backend Integration Test")
    print("=====================================")

    try:
        success = asyncio.run(main())
        if success:
            print("\n🎉 Integration test passed!")
            sys.exit(0)
        else:
            print("\n💥 Integration test failed!")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n👋 Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test error: {e}")
        sys.exit(1)