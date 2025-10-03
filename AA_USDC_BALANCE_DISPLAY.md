# AA_USDC Balance Display Integration

## Overview

This document explains the changes made to display the AA_USDC balance from the resource account on the escrow agreement cards. The AA_USDC balance represents the Aave interest-bearing tokens that are received when USDC is deposited into Aave.

## Changes Made

1. **Added `getResourceAccountAAUsdcBalance` Function**:
   - Created a new utility function in `rentEscrowContract.ts` to fetch the AA_USDC balance of the resource account.
   - The function queries the Aptos blockchain for the AA_USDC token balance using the standard coin module.

2. **Updated EscrowDashboard Component**:
   - Added state tracking for the AA_USDC balance
   - Modified `loadUserEscrows` to fetch the AA_USDC balance when loading escrow data
   - Updated the escrow cards to display the AA_USDC balance in the Aave Integration Info section

3. **Fixed Aave Integration Display**:
   - Changed the condition to display Aave integration info based on the `depositedAmount` field
   - Added proper handling for cases where no AA_USDC balance is available (displays "--")
   - Displays the security deposit amount as the amount supplied to Aave

## Resource Account

The resource account address for the rent escrow contract is:
```
0x7f561777e5d6e4d83ce439b1aadca568ccb060b3462adcae934f4dc11ddf4c7c
```

## Testing

To test this integration:
1. Create a new escrow agreement
2. Sign the agreement as both landlord and tenant
3. Deposit funds to Aave
4. Verify the deposit through the contract
5. The escrow card should now display the AA_USDC balance from the resource account

Note: If an agreement doesn't show an AA_USDC balance (displays "--"), it may be because the funds were sent to the wrong resource account during an earlier deployment.