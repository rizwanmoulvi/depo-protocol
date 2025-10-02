#!/bin/bash

# Rent Escrow Smart Contract Deployment Script
# This script deploys the rent escrow contract with resource account setup

echo "🏠 Deploying Rent Escrow Smart Contract with Resource Account..."

# Check if aptos CLI is installed
if ! command -v aptos &> /dev/null; then
    echo "❌ Aptos CLI not found. Please install it first."
    echo "Visit: https://aptos.dev/tools/install-cli/"
    exit 1
fi

# Set default profile if not specified
PROFILE=${1:-default}
NETWORK=${2:-testnet}

echo "📋 Deployment Configuration:"
echo "   Profile: $PROFILE"
echo "   Network: $NETWORK"
echo ""

# Compile the contract
echo "🔨 Compiling contract..."
aptos move compile --profile $PROFILE

if [ $? -ne 0 ]; then
    echo "❌ Compilation failed!"
    exit 1
fi

echo "✅ Compilation successful!"
echo ""

# Publish the contract
echo "🚀 Publishing contract..."
aptos move publish --profile $PROFILE

if [ $? -ne 0 ]; then
    echo "❌ Publication failed!"
    exit 1
fi

echo "✅ Contract published successfully!"
echo ""

# Get the account address
ACCOUNT_ADDRESS=$(aptos config show-profiles --profile $PROFILE | grep "account" | awk '{print $2}')

echo "📝 Deployment Summary:"
echo "   Contract Address: $ACCOUNT_ADDRESS"
echo "   Module: ${ACCOUNT_ADDRESS}::rent_escrow"
echo ""

echo "🔧 Resource Account Setup:"
echo "   Resource account will be automatically created during first transaction"
echo "   Seed: RENT_ESCROW_RESOURCE_ACCOUNT"
echo "   Platform Treasury: $ACCOUNT_ADDRESS"
echo ""

echo "🎯 Next Steps:"
echo "   1. Note down the contract address: $ACCOUNT_ADDRESS"
echo "   2. Update your frontend configuration with this address"
echo "   3. The resource account will be created on first contract interaction"
echo "   4. Test with a small escrow creation first"
echo ""

echo "📚 View Functions Available:"
echo "   - get_resource_account_address()"
echo "   - get_platform_treasury()"
echo "   - get_escrow(id)"
echo "   - get_escrows_by_landlord(address)"
echo "   - get_escrows_by_tenant(address)"
echo ""

echo "✨ Deployment completed successfully!"
echo "📖 See RESOURCE_ACCOUNT.md for detailed implementation docs"