# USDC Implementation on Aptos

## Overview

This document explains our approach for implementing USDC transfers in our application on the Aptos blockchain, based on Circle's official documentation.

## USDC on Aptos Testnet

According to Circle's official documentation, USDC on Aptos uses the Fungible Asset standard rather than the older Coin standard. This requires a specific approach for transfers:

1. **Contract Address**: `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832`
2. **Transfer Method**: `0x1::primary_fungible_store::transfer`
3. **Type Arguments**: `['0x1::fungible_asset::Metadata']`

### Implementation

Our implementation follows Circle's official documentation:

```typescript
const transferTransaction = {
  data: {
    function: '0x1::primary_fungible_store::transfer',
    typeArguments: ['0x1::fungible_asset::Metadata'],
    functionArguments: [
      USDC_ADDRESS,  // USDC contract address
      recipientAddress,  // Recipient address
      amountInMicroUnits.toString()  // Amount (USDC has 6 decimals)
    ],
  },
};
```

## USDC Token Details

- **Name**: USDC (USD Coin)
- **Decimals**: 6 (meaning 1 USDC = 1,000,000 units)
- **Testnet Contract**: [0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832](https://explorer.aptoslabs.com/fungible_asset/0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832?network=testnet)
- **Testnet Faucet**: [https://faucet.circle.com/](https://faucet.circle.com/)

## UI Representation

Our UI displays dollar amounts in USDC:
- UI shows: `$XXX.XX USDC`
- Transactions use actual USDC tokens on Aptos

## Testing Approach

When testing rent payments or other USDC transactions:

1. Obtain testnet USDC tokens from [Circle's faucet](https://faucet.circle.com/)
2. Ensure your wallet has sufficient APT tokens for gas fees
3. Test payments using the rent payment function in our application

## References

This implementation is based on Circle's official documentation:
- [Quickstart: Set up and transfer USDC on Aptos](https://developers.circle.com/stablecoins/quickstart-setup-transfer-usdc-aptos)