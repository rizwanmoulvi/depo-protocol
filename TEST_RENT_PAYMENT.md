# Testing the Rent Payment Feature

This document provides instructions for testing the rent payment feature in the Depos application.

## Prerequisites

1. You need to have an Aptos-compatible wallet (like Petra Wallet) with the following:
   - A landlord account with an active escrow agreement
   - A tenant account with USDC tokens (obtained from [Circle's faucet](https://faucet.circle.com/))
   - Some APT tokens for gas fees (obtained from [Aptos Faucet](https://aptos.dev/en/network/faucet))
   - The agreement must be fully signed and have deposits made

> **Note**: We're using actual testnet USDC tokens following Circle's official implementation. Make sure you have obtained testnet USDC tokens from Circle's faucet before testing.

## Test Steps

### 1. Connect as Tenant

1. Open the Depos application
2. Connect your wallet using the tenant's account
3. Verify you can see the escrow agreement where you are the tenant
4. Confirm the agreement is active (has deposits and isn't expired)

### 2. Pay Rent

1. Locate the escrow agreement card for your rental
2. Verify you can see the "Pay Rent" button with the correct rent amount
3. Click the "Pay Rent" button
4. Approve the transaction in your wallet
5. Wait for the transaction to complete
6. Verify you receive a success notification

### 3. Verify Payment

1. Check your wallet's USDC balance to confirm the rent amount was deducted
2. Connect as the landlord
3. Verify the landlord's USDC balance increased by the rent amount
4. You can verify the transaction on [Aptos Explorer](https://explorer.aptoslabs.com/?network=testnet)

## Troubleshooting

If you encounter the following issues:

### Transaction Fails

1. Ensure your tenant wallet has enough USDC tokens from Circle's faucet
2. Make sure you have enough APT for gas fees
3. Check if the landlord address is valid
4. Verify that you're using the Aptos testnet network in your wallet

### "Pay Rent" Button Not Visible

1. Make sure you're connected with the tenant's wallet
2. Verify the agreement is fully signed
3. Confirm deposits have been made
4. Check that the agreement hasn't expired or been settled

## Expected Results

- The tenant's USDC balance should decrease by the rent amount
- The landlord's USDC balance should increase by the rent amount
- A success notification should appear after the payment is completed
- The transaction should be visible in Aptos Explorer with details of the USDC transfer

> **Important**: We're using actual testnet USDC tokens from Circle. The UI displays dollar amounts that correspond to the actual USDC amounts being transferred.