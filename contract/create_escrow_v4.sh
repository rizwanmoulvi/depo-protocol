#!/bin/bash

# Set the contract address
CONTRACT_ADDRESS="0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a"

# Check arguments
if [ "$#" -ne 8 ]; then
    echo "Usage: $0 <tenant_address> <property_name> <property_address> <security_deposit> <monthly_rent> <start_date> <end_date>"
    echo ""
    echo "Example:"
    echo "$0 0x77219cde2b84861dce6403b5a75deb7757c0e254e2b8371d75f247bafd42ea8f \"Downtown Condo\" \"123 Main St\" 2000000 1000000 1759999380 1761641460"
    exit 1
fi

TENANT_ADDRESS=$1
PROPERTY_NAME=$2
PROPERTY_ADDRESS=$3
SECURITY_DEPOSIT=$4
MONTHLY_RENT=$5
START_DATE=$6
END_DATE=$7

# Create a new escrow using the v4 contract
echo "Creating new escrow in RentEscrowV4 contract..."
aptos move run \
  --function-id $CONTRACT_ADDRESS::rent_escrow_v4::create_escrow \
  --args address:$TENANT_ADDRESS \
  string:"$PROPERTY_NAME" \
  string:"$PROPERTY_ADDRESS" \
  u64:$SECURITY_DEPOSIT \
  u64:$MONTHLY_RENT \
  u64:$START_DATE \
  u64:$END_DATE \
  --profile default \
  --assume-yes

echo "Done!"