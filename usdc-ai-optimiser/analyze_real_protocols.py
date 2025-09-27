#!/usr/bin/env python3
"""Analyze real protocols from DeFiLlama to find optimal integration list"""

import asyncio
import aiohttp
import json
from typing import Dict, List

async def get_real_protocol_data():
    """Get real protocol data from DeFiLlama"""
    
    print("🔍 FETCHING REAL PROTOCOL DATA FROM DEFILLAMA")
    print("=" * 60)
    
    try:
        async with aiohttp.ClientSession() as session:
            # Get all protocols
            async with session.get("https://api.llama.fi/protocols") as response:
                if response.status != 200:
                    raise ValueError(f"DeFiLlama API error: {response.status}")
                
                protocols_data = await response.json()
            
            print(f"✅ Retrieved {len(protocols_data)} protocols from DeFiLlama")
            
            # Filter for USDC-related protocols
            usdc_protocols = []
            
            for protocol in protocols_data:
                protocol_name = protocol.get('name', '').lower()
                protocol_symbol = protocol.get('symbol', '').lower()
                
                # Check if protocol has USDC
                if ('usdc' in protocol_name or 
                    'usdc' in protocol_symbol or
                    'usd' in protocol_name or
                    'stable' in protocol_name):
                    
                    usdc_protocols.append({
                        'name': protocol.get('name', 'Unknown'),
                        'symbol': protocol.get('symbol', ''),
                        'tvl': protocol.get('tvl', 0),
                        'chains': protocol.get('chains', []),
                        'category': protocol.get('category', ''),
                        'url': protocol.get('url', ''),
                        'description': protocol.get('description', '')
                    })
            
            print(f"✅ Found {len(usdc_protocols)} USDC-related protocols")
            
            # Sort by TVL
            usdc_protocols.sort(key=lambda x: x['tvl'], reverse=True)
            
            # Show top protocols
            print(f"\n🏆 TOP USDC PROTOCOLS BY TVL:")
            print("-" * 50)
            
            for i, protocol in enumerate(usdc_protocols[:20], 1):
                tvl_formatted = f"${protocol['tvl']:,.0f}" if protocol['tvl'] > 0 else "N/A"
                chains_str = ", ".join(protocol['chains'][:3]) if protocol['chains'] else "Unknown"
                print(f"   {i:2d}. {protocol['name']}")
                print(f"       TVL: {tvl_formatted}")
                print(f"       Chains: {chains_str}")
                print(f"       Category: {protocol['category']}")
                print()
            
            # Check specifically for Fluid Finance
            print(f"\n🔍 SEARCHING FOR FLUID FINANCE:")
            print("-" * 40)
            
            fluid_found = False
            for protocol in usdc_protocols:
                if 'fluid' in protocol['name'].lower():
                    print(f"✅ FOUND: {protocol['name']}")
                    print(f"   TVL: ${protocol['tvl']:,.0f}")
                    print(f"   Chains: {', '.join(protocol['chains'])}")
                    print(f"   Category: {protocol['category']}")
                    print(f"   URL: {protocol['url']}")
                    fluid_found = True
            
            if not fluid_found:
                print("❌ Fluid Finance not found in DeFiLlama data")
                print("Searching for similar protocols...")
                
                # Search for similar names
                similar_protocols = []
                for protocol in protocols_data:
                    name = protocol.get('name', '').lower()
                    if any(keyword in name for keyword in ['fluid', 'liquid', 'stream', 'flow']):
                        similar_protocols.append(protocol)
                
                if similar_protocols:
                    print("Found similar protocols:")
                    for protocol in similar_protocols:
                        print(f"   - {protocol.get('name', 'Unknown')}: {protocol.get('category', 'Unknown')}")
                else:
                    print("No similar protocols found")
            
            # Analyze by category
            print(f"\n📊 PROTOCOL CATEGORIES:")
            print("-" * 30)
            
            categories = {}
            for protocol in usdc_protocols:
                category = protocol['category']
                if category not in categories:
                    categories[category] = []
                categories[category].append(protocol)
            
            for category, protocols in categories.items():
                total_tvl = sum(p['tvl'] for p in protocols)
                print(f"   {category}: {len(protocols)} protocols, ${total_tvl:,.0f} TVL")
            
            # Create integration recommendations
            print(f"\n🎯 INTEGRATION RECOMMENDATIONS:")
            print("-" * 40)
            
            # Top protocols by TVL and category diversity
            top_protocols = []
            seen_categories = set()
            
            for protocol in usdc_protocols:
                if (protocol['tvl'] > 100_000_000 and  # > $100M TVL
                    protocol['category'] not in seen_categories and
                    len(top_protocols) < 10):
                    
                    top_protocols.append(protocol)
                    seen_categories.add(protocol['category'])
            
            print("Top protocols for integration:")
            for i, protocol in enumerate(top_protocols, 1):
                print(f"   {i:2d}. {protocol['name']} ({protocol['category']})")
                print(f"       TVL: ${protocol['tvl']:,.0f}")
                print(f"       Chains: {', '.join(protocol['chains'][:2])}")
            
            return {
                'total_protocols': len(protocols_data),
                'usdc_protocols': len(usdc_protocols),
                'top_protocols': top_protocols,
                'fluid_found': fluid_found
            }
            
    except Exception as e:
        print(f"❌ Error fetching data: {e}")
        import traceback
        traceback.print_exc()
        return None

async def search_fluid_finance_alternatives():
    """Search for Fluid Finance alternatives or similar protocols"""
    
    print(f"\n🔍 SEARCHING FOR FLUID FINANCE ALTERNATIVES")
    print("=" * 50)
    
    try:
        async with aiohttp.ClientSession() as session:
            # Search for protocols with "fluid" in name
            async with session.get("https://api.llama.fi/protocols") as response:
                protocols_data = await response.json()
            
            # Search for fluid-related protocols
            fluid_keywords = ['fluid', 'liquid', 'stream', 'flow', 'water', 'aqua']
            fluid_protocols = []
            
            for protocol in protocols_data:
                name = protocol.get('name', '').lower()
                symbol = protocol.get('symbol', '').lower()
                
                if any(keyword in name or keyword in symbol for keyword in fluid_keywords):
                    fluid_protocols.append({
                        'name': protocol.get('name', 'Unknown'),
                        'symbol': protocol.get('symbol', ''),
                        'tvl': protocol.get('tvl', 0),
                        'chains': protocol.get('chains', []),
                        'category': protocol.get('category', ''),
                        'url': protocol.get('url', '')
                    })
            
            if fluid_protocols:
                print(f"Found {len(fluid_protocols)} fluid-related protocols:")
                for protocol in fluid_protocols:
                    print(f"   - {protocol['name']} ({protocol['category']})")
                    print(f"     TVL: ${protocol['tvl']:,.0f}")
                    print(f"     URL: {protocol['url']}")
            else:
                print("No fluid-related protocols found")
            
            # Check if Fluid Finance might be under a different name
            print(f"\n🔍 CHECKING FOR ALTERNATIVE NAMES:")
            print("-" * 40)
            
            # Common alternative names for Fluid Finance
            alternative_names = [
                'fluid', 'fluidfi', 'fluid-finance', 'fluidfinance',
                'liquid', 'liquidfi', 'stream', 'streamfi'
            ]
            
            for alt_name in alternative_names:
                found = any(alt_name in protocol.get('name', '').lower() 
                          for protocol in protocols_data)
                status = "✅ FOUND" if found else "❌ NOT FOUND"
                print(f"   {alt_name}: {status}")
            
    except Exception as e:
        print(f"❌ Error searching alternatives: {e}")

if __name__ == "__main__":
    asyncio.run(get_real_protocol_data())
    asyncio.run(search_fluid_finance_alternatives())