# Rent Payment Feature

This document describes the rent payment feature added to the Depos application, which allows tenants to pay rent directly to landlords.

## Overview

The rent payment feature enables tenants to pay their monthly rent in USDC directly to the landlord's address. This feature is available to tenants for active escrow agreements (agreements that are fully signed, have deposits made, and are not yet settled or expired).

## Implementation

### Key Files

1. **rentEscrowContract.ts**
   - Added `payRentToLandlord()` function to handle USDC transfers from tenant to landlord
   - Uses the Aptos coin module for direct transfers

2. **EscrowDashboard.tsx**
   - Added `handlePayRent()` function to process rent payments
   - Updated the `getAvailableActions()` function to include a "Pay Rent" button for tenants
   - The button shows the rent amount to be paid

## How It Works

1. When a tenant views an active escrow agreement where they are the tenant:
   - A "Pay Rent" button appears showing the rent amount
   - This button is only available for active agreements that have deposits and are not expired

2. When the tenant clicks the "Pay Rent" button:
   - The application first approves the USDC transfer
   - It then transfers the USDC directly to the landlord's address
   - A success notification is shown when the payment completes

3. The payment goes directly to the landlord and is not stored in the escrow contract.

## Technical Details

The implementation uses the Aptos Fungible Asset standard for USDC transfers, following Circle's official documentation:

```
0x1::primary_fungible_store::transfer
```

With the following parameters:
- Type Arguments: `['0x1::fungible_asset::Metadata']`
- Function Arguments: `[USDC_ADDRESS, recipientAddress, amountInMicroUnits]`

Unlike Ethereum-based blockchains, Aptos doesn't require separate approve and transfer steps for token transfers.

> **Note**: For testing purposes on Aptos testnet, we use AptosCoin (APT) as a substitute for USDC since the testnet USDC token may not be widely available or have a consistent interface across all environments. In a production environment, this would be updated to use the actual USDC token.

The amount transferred is equal to the monthly rent specified in the escrow agreement.

## Future Improvements

Potential future improvements to this feature include:

1. Payment tracking - Record rent payments in the contract for history and receipt purposes
2. Automatic payments - Set up recurring rent payments
3. Partial payments - Allow tenants to make partial payments
4. Late payment notifications - Alert tenants when rent is due/late