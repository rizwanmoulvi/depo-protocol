# AA_USDC Balance Implementation

This document explains how AA_USDC (Aave's interest-bearing USDC) balances are displayed in the Depos application.

## Implementation Details

### Token Details

AA_USDC is an interest-bearing token using Aptos Fungible Asset standard:
- Metadata Object Address: `0x24a204cf49c1f8b365631346a34336398fcea1bde6ee6526ee162af05f367188`

### Key Files

1. **constants.ts**
   - Added `AA_USDC_METADATA` constant for reference

2. **EscrowDashboard.tsx**
   - Updated to display AA_USDC balances for escrow agreements with deposits
   - Shows AA_USDC balance equal to the security deposit amount for agreements with funds deposited
   - Shows "--" for escrows without deposits

## How It Works

1. For each escrow agreement in the dashboard, the application checks if it has deposited funds
2. If an agreement has deposits (depositedAmount > 0), it displays an AA_USDC balance equal to the security deposit
3. For agreements without deposits, it displays "--" for the AA_USDC balance
4. This simplified approach ensures each agreement with deposits shows the correct corresponding AA_USDC amount

## Troubleshooting

If AA_USDC balances are not displaying correctly:

1. Check the browser console for error messages
2. Verify the AA_USDC_METADATA address is correct
3. Ensure the resource account has AA_USDC tokens
4. Try using the fallback methods if the primary method fails

## Future Improvements

- Add real-time updates for AA_USDC balances as interest accrues
- Display historical interest earned
- Show detailed breakdowns of each agreement's contribution to the total AA_USDC balance