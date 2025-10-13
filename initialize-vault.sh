#!/bin/bash

# Initialize Vault Contract
# This creates the resource account that will hold user deposits

echo "🔧 Initializing Vault Contract..."
echo ""

VAULT_ADDRESS="0x7e8e802870fe28b31e6dc7c72a96806d2a62a03efdd488d4f2a2cf866cbe072b"
MODULE="yieldflow_v3"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔑 Enter your admin private key:"
read -s ADMIN_KEY
echo ""

echo -e "${YELLOW}Initializing vault...${NC}"
echo ""

# Initialize vault
aptos move run \
  --function-id "${VAULT_ADDRESS}::${MODULE}::initialize" \
  --private-key "$ADMIN_KEY" \
  --url https://api.testnet.aptoslabs.com/v1 \
  --assume-yes

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Vault initialized successfully!${NC}"
    echo ""

    # Get resource account address
    echo "🔍 Getting vault resource account address..."
    RESOURCE_ADDR=$(aptos move view \
      --function-id "${VAULT_ADDRESS}::${MODULE}::vault_resource_addr" \
      --args address:$VAULT_ADDRESS \
      --url https://api.testnet.aptoslabs.com/v1 | jq -r '.Result[0]')

    echo ""
    echo -e "${GREEN}📋 Vault Resource Account:${NC}"
    echo "   $RESOURCE_ADDR"
    echo ""
    echo "⚠️  IMPORTANT: You need the PRIVATE KEY for this resource account to use Aave SDK"
    echo ""
    echo "The resource account is created with seed: b\"ai_YieldFlow_usdc_vault\""
    echo "You can derive the private key using Aptos SDK or check your local keys."
    echo ""
else
    echo ""
    echo -e "${RED}❌ Initialization failed${NC}"
    echo "This might mean the vault is already initialized or there's an error."
    exit 1
fi
