#!/bin/bash

# Test script for Aave Integration Demo
# Tests the vault → Aave supply flow

echo "🧪 Testing Aave Integration..."
echo ""

# Configuration
API_URL="http://localhost:3000/api/vault-aave-supply"
AMOUNT=10  # Test with 10 USDC

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if server is running
echo "📡 Checking if Next.js server is running..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Server not running. Start it with: npm run dev${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Confirm
echo -e "${YELLOW}Testing with:${NC}"
echo "  Amount: $AMOUNT USDC"
echo "  API: $API_URL"
echo "  Auth: Using admin key from .env.local"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Make API request
echo "🚀 Sending request..."
echo ""

RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"amount\": $AMOUNT
  }")

# Check if response contains success
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✅ SUCCESS!${NC}"
    echo ""
    echo "📋 Response:"
    echo "$RESPONSE" | jq .
    echo ""

    # Extract transaction hashes
    VAULT_TX=$(echo "$RESPONSE" | jq -r '.step1_vaultTracking.txHash')
    AAVE_TX=$(echo "$RESPONSE" | jq -r '.step2_aaveDeposit.txHash')

    echo -e "${GREEN}🎉 Demo Complete!${NC}"
    echo ""
    echo "Step 1 - Vault Contract Tracking:"
    echo "  TX Hash: $VAULT_TX"
    echo "  Explorer: https://explorer.aptoslabs.com/txn/$VAULT_TX?network=testnet"
    echo ""
    echo "Step 2 - Aave Deposit via SDK:"
    echo "  TX Hash: $AAVE_TX"
    echo "  Explorer: https://explorer.aptoslabs.com/txn/$AAVE_TX?network=testnet"
    echo ""
else
    echo -e "${RED}❌ FAILED${NC}"
    echo ""
    echo "Error Response:"
    echo "$RESPONSE" | jq .
    exit 1
fi
