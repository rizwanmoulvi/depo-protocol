#!/bin/bash

# Set the contract address
CONTRACT_ADDRESS="0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a"

# Initialize the contract using the default profile
echo "Initializing RentEscrowV4 contract..."
aptos move run \
  --function-id $CONTRACT_ADDRESS::rent_escrow_v4::initialize \
  --profile default \
  --assume-yes

echo "Done!"