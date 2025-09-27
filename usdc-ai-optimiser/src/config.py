# src/config.py
"""Configuration management for USDC AI Optimizer"""

import os
from typing import Dict, List
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Central configuration"""
    
    # API Keys
    CLAUDE_API_KEY = os.getenv("CLAUDE_API_KEY", "")
    ALCHEMY_API_KEY = os.getenv("ALCHEMY_API_KEY", "")
    
    # Chain Configuration
    SUPPORTED_CHAINS = {
        "ethereum": {
            "chain_id": 1,
            "rpc_url": f"https://eth-mainnet.g.alchemy.com/v2/{ALCHEMY_API_KEY}",
            "usdc_address": "0xA0b86a33E6677fC7D5e1234a1CC3b97f8B3ad8A5"
        },
        "base": {
            "chain_id": 8453,
            "rpc_url": "https://mainnet.base.org",
            "usdc_address": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
        },
        "arbitrum": {
            "chain_id": 42161,
            "rpc_url": "https://arb1.arbitrum.io/rpc",
            "usdc_address": "0xaf88d065e77c8cc2239327c5edb3a432268e5831"
        }
    }
    
    # Protocol Addresses
    PROTOCOLS = {
        "aave_v3": {
            "ethereum": "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2",
            "base": "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
            "arbitrum": "0x794a61358D6845594F94dc1DB02A252b5b4814aD"
        },
        "moonwell": {
            "base": "0x628ff693426583D9a7FB391E54366292F509D457"
        }
    }
    
    # CCTP Contracts
    CCTP_CONTRACTS = {
        "ethereum": {
            "token_messenger": "0xBd3fa81B58Ba92a82136038B25aDec7066af3155"
        },
        "base": {
            "token_messenger": "0x1682Ae6375C4E4A97e4B583BC394c861A46D8962"
        },
        "arbitrum": {
            "token_messenger": "0x19330d10D9Cc8751218eaf51E8885D058642E08A"
        }
    }
    
    # API URLs
    DEFILLAMA_URL = "https://yields.llama.fi"
    PYTH_URL = "https://hermes.pyth.network"
    ONEINCH_URL = "https://api.1inch.io/v5.0"
    
    # Demo Settings
    DEMO_MODE = True
    FALLBACK_DATA_ENABLED = True

config = Config()

