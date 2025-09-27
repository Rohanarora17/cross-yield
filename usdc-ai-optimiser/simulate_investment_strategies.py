#!/usr/bin/env python3
"""Simulate investment strategies to find optimal protocols for different amounts and risk profiles"""

import asyncio
import aiohttp
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass

@dataclass
class ProtocolOpportunity:
    """Protocol opportunity from simulation"""
    protocol: str
    chain: str
    apy: float
    tvl: float
    risk_score: float
    min_amount: float
    max_amount: float
    investment_method: str
    pool_address: str

class InvestmentSimulator:
    """Simulate investment strategies to find optimal protocols"""
    
    def __init__(self):
        # Real DeFi protocols with actual data (simulated but realistic)
        self.protocols_data = {
            # Lending Protocols (Low Risk)
            "aave_v3_ethereum": {
                "protocol": "Aave V3",
                "chain": "ethereum",
                "apy": 4.2,
                "tvl": 8500000000,  # $8.5B
                "risk_score": 0.1,
                "min_amount": 1.0,
                "max_amount": 1000000,
                "investment_method": "lending",
                "pool_address": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"
            },
            "aave_v3_base": {
                "protocol": "Aave V3",
                "chain": "base",
                "apy": 5.8,
                "tvl": 1200000000,  # $1.2B
                "risk_score": 0.15,
                "min_amount": 1.0,
                "max_amount": 500000,
                "investment_method": "lending",
                "pool_address": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5"
            },
            "compound_v3_ethereum": {
                "protocol": "Compound V3",
                "chain": "ethereum",
                "apy": 3.8,
                "tvl": 2100000000,  # $2.1B
                "risk_score": 0.12,
                "min_amount": 1.0,
                "max_amount": 1000000,
                "investment_method": "lending",
                "pool_address": "0xc3d688B66703497DAA19211EEdff47f25384cdc3"
            },
            
            # Liquidity Protocols (Medium Risk)
            "uniswap_v3_ethereum": {
                "protocol": "Uniswap V3",
                "chain": "ethereum",
                "apy": 12.5,
                "tvl": 4500000000,  # $4.5B
                "risk_score": 0.35,
                "min_amount": 10.0,
                "max_amount": 2000000,
                "investment_method": "liquidity_provision",
                "pool_address": "0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8"
            },
            "uniswap_v3_base": {
                "protocol": "Uniswap V3",
                "chain": "base",
                "apy": 15.2,
                "tvl": 800000000,  # $800M
                "risk_score": 0.4,
                "min_amount": 5.0,
                "max_amount": 1000000,
                "investment_method": "liquidity_provision",
                "pool_address": "0x4200000000000000000000000000000000000006"
            },
            "curve_ethereum": {
                "protocol": "Curve Finance",
                "chain": "ethereum",
                "apy": 8.7,
                "tvl": 3200000000,  # $3.2B
                "risk_score": 0.25,
                "min_amount": 5.0,
                "max_amount": 1500000,
                "investment_method": "stablecoin_pool",
                "pool_address": "0xA2B47E3D5c44877cca798226B7B8118F9BF4EAbC"
            },
            "curve_arbitrum": {
                "protocol": "Curve Finance",
                "chain": "arbitrum",
                "apy": 11.3,
                "tvl": 450000000,  # $450M
                "risk_score": 0.3,
                "min_amount": 5.0,
                "max_amount": 500000,
                "investment_method": "stablecoin_pool",
                "pool_address": "0x7f90122BF0700F9E7e1F688fe926940E8839F353"
            },
            
            # Yield Farming (Medium-High Risk)
            "yearn_vaults_ethereum": {
                "protocol": "Yearn Finance",
                "chain": "ethereum",
                "apy": 18.5,
                "tvl": 1200000000,  # $1.2B
                "risk_score": 0.45,
                "min_amount": 10.0,
                "max_amount": 1000000,
                "investment_method": "vault_strategy",
                "pool_address": "0x5f18C75AbDAe578b483E5F43f12a39cF75b973a9"
            },
            "convex_finance": {
                "protocol": "Convex Finance",
                "chain": "ethereum",
                "apy": 22.1,
                "tvl": 800000000,  # $800M
                "risk_score": 0.5,
                "min_amount": 10.0,
                "max_amount": 800000,
                "investment_method": "yield_farming",
                "pool_address": "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B"
            },
            
            # High Yield Protocols (High Risk)
            "aerodrome_base": {
                "protocol": "Aerodrome",
                "chain": "base",
                "apy": 35.2,
                "tvl": 120000000,  # $120M
                "risk_score": 0.7,
                "min_amount": 5.0,
                "max_amount": 200000,
                "investment_method": "liquidity_mining",
                "pool_address": "0x4200000000000000000000000000000000000006"
            },
            "velodrome_optimism": {
                "protocol": "Velodrome",
                "chain": "optimism",
                "apy": 28.7,
                "tvl": 180000000,  # $180M
                "risk_score": 0.65,
                "min_amount": 5.0,
                "max_amount": 300000,
                "investment_method": "liquidity_mining",
                "pool_address": "0x4200000000000000000000000000000000000006"
            },
            "balancer_ethereum": {
                "protocol": "Balancer",
                "chain": "ethereum",
                "apy": 16.8,
                "tvl": 600000000,  # $600M
                "risk_score": 0.4,
                "min_amount": 10.0,
                "max_amount": 500000,
                "investment_method": "weighted_pools",
                "pool_address": "0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56"
            },
            
            # Cross-Chain Protocols
            "stargate_ethereum": {
                "protocol": "Stargate",
                "chain": "ethereum",
                "apy": 14.2,
                "tvl": 300000000,  # $300M
                "risk_score": 0.55,
                "min_amount": 10.0,
                "max_amount": 400000,
                "investment_method": "cross_chain_lp",
                "pool_address": "0xdf0770dF86a8034b3EFEf0A1Bb3c889B8312a4e6"
            },
            "layerzero_ethereum": {
                "protocol": "LayerZero",
                "chain": "ethereum",
                "apy": 19.3,
                "tvl": 150000000,  # $150M
                "risk_score": 0.6,
                "min_amount": 10.0,
                "max_amount": 200000,
                "investment_method": "cross_chain_staking",
                "pool_address": "0x66A71Dcef29A0fFBDBE3c6a460a3B5BC225Cd675"
            },
            
            # Major Missing Protocols
            "fluid_finance": {
                "protocol": "Fluid Finance",
                "chain": "ethereum",
                "apy": 12.8,
                "tvl": 450000000,  # $450M
                "risk_score": 0.35,
                "min_amount": 5.0,
                "max_amount": 500000,
                "investment_method": "lending",
                "pool_address": "0x4c9ED345b80f8a1f1731fcd806BD19b824FC6DC"
            },
            "eigenlayer": {
                "protocol": "EigenLayer",
                "chain": "ethereum",
                "apy": 15.2,
                "tvl": 800000000,  # $800M
                "risk_score": 0.4,
                "min_amount": 10.0,
                "max_amount": 1000000,
                "investment_method": "restaking",
                "pool_address": "0xbeaC0eeEeeeeEEeEeEEEEeeEEeEeeeEeeEEeEeE"
            },
            "pendle_finance": {
                "protocol": "Pendle Finance",
                "chain": "ethereum",
                "apy": 25.3,
                "tvl": 200000000,  # $200M
                "risk_score": 0.6,
                "min_amount": 10.0,
                "max_amount": 300000,
                "investment_method": "yield_trading",
                "pool_address": "0x4c9ED345b80f8a1f1731fcd806BD19b824FC6DC"
            },
            "morpho": {
                "protocol": "Morpho",
                "chain": "ethereum",
                "apy": 8.7,
                "tvl": 350000000,  # $350M
                "risk_score": 0.3,
                "min_amount": 5.0,
                "max_amount": 400000,
                "investment_method": "peer_to_peer_lending",
                "pool_address": "0x33333aea097c193e66081e930c33020272c33333"
            },
            "spark_protocol": {
                "protocol": "Spark Protocol",
                "chain": "ethereum",
                "apy": 6.2,
                "tvl": 1200000000,  # $1.2B
                "risk_score": 0.2,
                "min_amount": 1.0,
                "max_amount": 800000,
                "investment_method": "lending",
                "pool_address": "0x02C3eA4e34C0cBd694D6ad3A7DB9441d7248174B"
            },
            "compound_v2_ethereum": {
                "protocol": "Compound V2",
                "chain": "ethereum",
                "apy": 4.8,
                "tvl": 1800000000,  # $1.8B
                "risk_score": 0.18,
                "min_amount": 1.0,
                "max_amount": 1000000,
                "investment_method": "lending",
                "pool_address": "0x39AA39c021dfbaE8faC545936693aC917d5E7563"
            },
            "uniswap_v2_ethereum": {
                "protocol": "Uniswap V2",
                "chain": "ethereum",
                "apy": 8.5,
                "tvl": 2200000000,  # $2.2B
                "risk_score": 0.3,
                "min_amount": 5.0,
                "max_amount": 1500000,
                "investment_method": "liquidity_provision",
                "pool_address": "0xA478c2975Ab1Ea89e8196811F51A7B7Ade33eB11"
            },
            "sushiswap_ethereum": {
                "protocol": "SushiSwap",
                "chain": "ethereum",
                "apy": 11.2,
                "tvl": 800000000,  # $800M
                "risk_score": 0.4,
                "min_amount": 5.0,
                "max_amount": 600000,
                "investment_method": "liquidity_provision",
                "pool_address": "0x397FF1542f962076d0BFE58e045Ff2722B6e3d96"
            },
            "dydx_v4": {
                "protocol": "dYdX V4",
                "chain": "ethereum",
                "apy": 18.7,
                "tvl": 300000000,  # $300M
                "risk_score": 0.5,
                "min_amount": 10.0,
                "max_amount": 400000,
                "investment_method": "perpetual_trading",
                "pool_address": "0x1E0447b19BB6EcFdAe1e4AE1694b0C3659614e4e"
            }
        }

    async def simulate_strategy(self, amount: float, risk_tolerance: float, target_apy: float) -> Dict:
        """Simulate investment strategy for given parameters"""
        
        print(f"🎯 SIMULATING STRATEGY")
        print(f"   Amount: ${amount:.2f}")
        print(f"   Risk Tolerance: {risk_tolerance:.2f}")
        print(f"   Target APY: {target_apy:.1f}%")
        print("-" * 50)
        
        # Filter protocols based on criteria
        suitable_protocols = []
        
        for protocol_id, protocol_data in self.protocols_data.items():
            # Check risk tolerance
            if protocol_data['risk_score'] > risk_tolerance:
                continue
            
            # Check minimum amount
            if amount < protocol_data['min_amount']:
                continue
            
            # Check maximum amount
            if amount > protocol_data['max_amount']:
                continue
            
            # Check APY target
            if protocol_data['apy'] < target_apy:
                continue
            
            suitable_protocols.append(ProtocolOpportunity(
                protocol=protocol_data['protocol'],
                chain=protocol_data['chain'],
                apy=protocol_data['apy'],
                tvl=protocol_data['tvl'],
                risk_score=protocol_data['risk_score'],
                min_amount=protocol_data['min_amount'],
                max_amount=protocol_data['max_amount'],
                investment_method=protocol_data['investment_method'],
                pool_address=protocol_data['pool_address']
            ))
        
        # Sort by risk-adjusted return
        suitable_protocols.sort(
            key=lambda x: x.apy * (1 - x.risk_score), 
            reverse=True
        )
        
        # Create investment allocation
        allocation = []
        remaining_amount = amount
        
        for protocol in suitable_protocols[:5]:  # Top 5 protocols
            if remaining_amount <= 0:
                break
            
            # Calculate allocation (max 40% per protocol)
            max_allocation = min(remaining_amount, amount * 0.4)
            allocation_amount = min(max_allocation, protocol.max_amount)
            
            if allocation_amount >= protocol.min_amount:
                allocation.append({
                    'protocol': protocol.protocol,
                    'chain': protocol.chain,
                    'amount': allocation_amount,
                    'percentage': (allocation_amount / amount) * 100,
                    'apy': protocol.apy,
                    'risk_score': protocol.risk_score,
                    'tvl': protocol.tvl,
                    'investment_method': protocol.investment_method,
                    'pool_address': protocol.pool_address
                })
                
                remaining_amount -= allocation_amount
        
        # Calculate portfolio metrics
        if allocation:
            weighted_apy = sum(pos['apy'] * (pos['amount'] / amount) for pos in allocation)
            weighted_risk = sum(pos['risk_score'] * (pos['amount'] / amount) for pos in allocation)
            total_invested = sum(pos['amount'] for pos in allocation)
        else:
            weighted_apy = 0
            weighted_risk = 0
            total_invested = 0
        
        result = {
            'amount': amount,
            'risk_tolerance': risk_tolerance,
            'target_apy': target_apy,
            'suitable_protocols': len(suitable_protocols),
            'allocated_protocols': len(allocation),
            'total_invested': total_invested,
            'weighted_apy': weighted_apy,
            'weighted_risk': weighted_risk,
            'allocation': allocation,
            'timestamp': datetime.now().isoformat()
        }
        
        return result

    async def run_comprehensive_simulation(self) -> Dict:
        """Run comprehensive simulation for all amounts and risk profiles"""
        
        print("🚀 COMPREHENSIVE INVESTMENT STRATEGY SIMULATION")
        print("=" * 70)
        
        # Test amounts
        amounts = [10, 100, 1000, 10000]
        
        # Risk profiles
        risk_profiles = {
            "conservative": {"risk_tolerance": 0.2, "target_apy": 5.0},
            "balanced": {"risk_tolerance": 0.5, "target_apy": 10.0},
            "aggressive": {"risk_tolerance": 0.8, "target_apy": 20.0}
        }
        
        results = {}
        all_protocols = set()
        
        for amount in amounts:
            print(f"\n💰 TESTING AMOUNT: ${amount}")
            print("=" * 40)
            
            results[amount] = {}
            
            for profile_name, profile_config in risk_profiles.items():
                print(f"\n📊 {profile_name.upper()} PROFILE")
                print("-" * 30)
                
                result = await self.simulate_strategy(
                    amount=amount,
                    risk_tolerance=profile_config['risk_tolerance'],
                    target_apy=profile_config['target_apy']
                )
                
                results[amount][profile_name] = result
                
                # Collect all protocols
                for allocation in result['allocation']:
                    protocol_key = f"{allocation['protocol']}_{allocation['chain']}"
                    all_protocols.add(protocol_key)
                
                # Print results
                print(f"   Suitable Protocols: {result['suitable_protocols']}")
                print(f"   Allocated Protocols: {result['allocated_protocols']}")
                print(f"   Weighted APY: {result['weighted_apy']:.2f}%")
                print(f"   Weighted Risk: {result['weighted_risk']:.2f}")
                print(f"   Total Invested: ${result['total_invested']:.2f}")
                
                if result['allocation']:
                    print(f"   Top Protocols:")
                    for i, pos in enumerate(result['allocation'][:3], 1):
                        print(f"     {i}. {pos['protocol']} ({pos['chain']}): ${pos['amount']:.2f} - {pos['apy']:.1f}% APY")
        
        # Analyze results
        print(f"\n📈 SIMULATION ANALYSIS")
        print("=" * 50)
        
        # Find most common protocols
        protocol_frequency = {}
        for amount_results in results.values():
            for profile_results in amount_results.values():
                for allocation in profile_results['allocation']:
                    protocol_key = f"{allocation['protocol']}_{allocation['chain']}"
                    protocol_frequency[protocol_key] = protocol_frequency.get(protocol_key, 0) + 1
        
        # Sort by frequency
        sorted_protocols = sorted(protocol_frequency.items(), key=lambda x: x[1], reverse=True)
        
        print(f"\n🎯 TOP PROTOCOLS TO INTEGRATE (by frequency):")
        for i, (protocol, frequency) in enumerate(sorted_protocols[:15], 1):
            print(f"   {i:2d}. {protocol}: {frequency} appearances")
        
        # Create final integration list
        integration_list = []
        for protocol, frequency in sorted_protocols:
            if frequency >= 2:  # Appears in at least 2 scenarios
                integration_list.append(protocol)
        
        print(f"\n✅ PROTOCOLS TO INTEGRATE ({len(integration_list)} protocols):")
        for i, protocol in enumerate(integration_list, 1):
            print(f"   {i:2d}. {protocol}")
        
        # Save results
        final_results = {
            'simulation_results': results,
            'protocol_frequency': protocol_frequency,
            'integration_list': integration_list,
            'total_protocols_analyzed': len(self.protocols_data),
            'protocols_to_integrate': len(integration_list),
            'timestamp': datetime.now().isoformat()
        }
        
        # Save to file
        with open('investment_simulation_results.json', 'w') as f:
            json.dump(final_results, f, indent=2)
        
        print(f"\n💾 Results saved to: investment_simulation_results.json")
        
        return final_results

# Test the simulator
async def test_simulator():
    """Test the investment simulator"""
    
    print("🧪 TESTING INVESTMENT SIMULATOR")
    print("=" * 50)
    
    try:
        simulator = InvestmentSimulator()
        
        # Test single simulation
        print("\n1️⃣ Testing single simulation...")
        result = await simulator.simulate_strategy(
            amount=1000,
            risk_tolerance=0.5,
            target_apy=10.0
        )
        
        print(f"   Suitable Protocols: {result['suitable_protocols']}")
        print(f"   Allocated Protocols: {result['allocated_protocols']}")
        print(f"   Weighted APY: {result['weighted_apy']:.2f}%")
        
        # Run comprehensive simulation
        print("\n2️⃣ Running comprehensive simulation...")
        comprehensive_results = await simulator.run_comprehensive_simulation()
        
        print(f"\n✅ Simulation complete!")
        print(f"   Total protocols analyzed: {comprehensive_results['total_protocols_analyzed']}")
        print(f"   Protocols to integrate: {comprehensive_results['protocols_to_integrate']}")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_simulator())