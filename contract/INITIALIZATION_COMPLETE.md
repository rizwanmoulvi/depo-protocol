# RentEscrowV4 Contract Initialization

## Summary
The RentEscrowV4 contract has been successfully initialized on the Aptos testnet. This document provides an overview of the initialization process and the key resources created.

## Contract Address
- Contract Address: `0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a`

## Initialization Transaction
- Transaction Hash: `0xf0462b04941c641150a39fb1281bcfa586b7b3382eb401c288f9f290c9e429e8`
- Transaction Explorer: [View on Aptos Explorer](https://explorer.aptoslabs.com/txn/0xf0462b04941c641150a39fb1281bcfa586b7b3382eb401c288f9f290c9e429e8?network=testnet)

## Created Resources

### EscrowRegistry
- Type: `0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a::rent_escrow_v4::EscrowRegistry`
- Empty escrow list (ready for new escrows)
- Next ID: 1
- Platform Treasury: `0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a`
- Resource Account Address: `0x1ca1be5d42981635e48a8446d82a1b11acb5bed5309f148039baf7aefa96f570`

### ResourceAccountCap
- Type: `0x4b8ac7a06a42d43fc3c3858a001dede0c91b8a3ea78297eea2bb26b26bc3cf3a::rent_escrow_v4::ResourceAccountCap`
- Signer Cap for Resource Account: `0x1ca1be5d42981635e48a8446d82a1b11acb5bed5309f148039baf7aefa96f570`

## Note
The v3 and v4 versions of the contract now co-exist on the same address. The v3 contract has existing escrow agreements, while the v4 contract starts fresh with no escrows.

## Usage
The RentEscrowV4 contract is now ready for use. New escrows should be created using the v4 contract's functions.