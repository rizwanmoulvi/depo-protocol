# Rent Security Deposit Escrow Smart Contract

## Overview

This is a **Move smart contract** for the Aptos blockchain that implements a trustless rent security deposit escrow system. The contract enables landlords and tenants to create secure rental agreements where:

- **Landlord**: Creates rental agreement with property details and deposit requirements
- **Tenant**: Signs agreement and deposits USDC into escrow
- **Platform**: Facilitates yield generation through Aave integration (planned)
- **Settlement**: Returns principal to tenant and yield to landlord after term ends

## Smart Contract Features

### Core Functionality

1. **Escrow Creation** (`create_escrow`)
   - Landlord creates agreement with property details
   - Defines security deposit, monthly rent, start/end dates
   - Automatically signs as landlord

2. **Tenant Signing** (`sign_escrow`)
   - Tenant reviews and signs the agreement
   - Both parties must sign before deposit

3. **USDC Deposit** (`deposit_and_supply_to_aave`)
   - Tenant deposits USDC security deposit
   - Funds are stored in contract (Aave integration planned)
   - Marks deposit as complete

4. **Settlement** (`settle_escrow`)
   - Callable by anyone after term expires
   - Returns principal to tenant
   - Distributes yield to landlord (simulated 5% for now)
   - Takes platform fee from yield (5%)

### View Functions

- `get_escrow(id)`: Get complete escrow details
- `get_escrows_by_landlord(address)`: Get all escrows for a landlord
- `get_escrows_by_tenant(address)`: Get all escrows for a tenant

### Data Structure

```move
struct EscrowAgreement {
    id: u64,
    landlord: address,
    tenant: address,
    property_name: String,
    property_address: String,
    security_deposit: u64,      // USDC amount (6 decimals)
    monthly_rent: u64,          // USDC amount (6 decimals)
    start_date: u64,            // Unix timestamp
    end_date: u64,              // Unix timestamp
    landlord_signed: bool,
    tenant_signed: bool,
    deposited_amount: u64,
    aave_supplied: bool,        // For future Aave integration
    settled: bool,
    created_at: u64,
}
```

## Security Features

- **Access Control**: Only authorized parties can perform specific actions
- **State Validation**: Comprehensive checks for agreement state
- **Amount Validation**: Ensures deposit amounts match agreement
- **Time Validation**: Enforces start/end date constraints
- **Settlement Protection**: Prevents double settlement

## Future Aave Integration

The contract is designed for easy Aave integration:

1. **Supply to Aave**: When tenant deposits, automatically supply USDC to Aave
2. **Receive aTokens**: Contract holds interest-bearing aTokens
3. **Withdraw at Settlement**: Redeem aTokens for USDC + yield
4. **Yield Distribution**: Split yield between landlord and platform

### Planned Aave Functions

```move
// Future integration points
fun supply_to_aave(usdc_amount: u64): u64;  // Returns aToken amount
fun withdraw_from_aave(atoken_amount: u64): u64;  // Returns USDC amount
fun get_aave_balance(): (u64, u64);  // Returns (principal, yield)
```

## Error Codes

- `E_NOT_AUTHORIZED`: Caller not authorized for action
- `E_INVALID_AMOUNT`: Invalid deposit or rent amount
- `E_ESCROW_NOT_FOUND`: Escrow ID doesn't exist
- `E_ALREADY_SIGNED`: Party already signed agreement
- `E_NOT_BOTH_SIGNED`: Both parties must sign before deposit
- `E_ALREADY_DEPOSITED`: Deposit already made
- `E_NOT_DEPOSITED`: No deposit found
- `E_TERM_NOT_ENDED`: Rental term hasn't expired
- `E_ALREADY_SETTLED`: Escrow already settled
- `E_INVALID_DATES`: Invalid start/end dates

## Testing

The contract includes comprehensive unit tests:

```bash
aptos move test --dev
```

Tests cover:
- Escrow creation
- Tenant signing
- Basic validation logic
- State transitions

## Deployment

1. **Compile**: `aptos move compile --dev`
2. **Test**: `aptos move test --dev`
3. **Publish**: `aptos move publish --profile <profile>`

## Usage Example

```typescript
// 1. Landlord creates escrow
await signAndSubmitTransaction({
  function: `${MODULE_ADDRESS}::rent_escrow::create_escrow`,
  arguments: [
    tenantAddress,
    "Beautiful Apartment",
    "123 Main St, City, State",
    2000000000, // 2000 USDC
    1500000000, // 1500 USDC/month
    startTimestamp,
    endTimestamp
  ]
});

// 2. Tenant signs agreement
await signAndSubmitTransaction({
  function: `${MODULE_ADDRESS}::rent_escrow::sign_escrow`,
  arguments: [escrowId]
});

// 3. Tenant deposits USDC
await signAndSubmitTransaction({
  function: `${MODULE_ADDRESS}::rent_escrow::deposit_and_supply_to_aave`,
  arguments: [escrowId, usdcMetadataObject]
});

// 4. Anyone can settle after term ends
await signAndSubmitTransaction({
  function: `${MODULE_ADDRESS}::rent_escrow::settle_escrow`,
  arguments: [escrowId, usdcMetadataObject]
});
```

## Next Steps

1. **Frontend Integration**: Build React interface for landlord/tenant interactions
2. **Aave Integration**: Implement actual Aave protocol calls
3. **Event System**: Add proper event emission for UI updates
4. **Resource Account**: Use proper resource account for fund management
5. **Dispute Resolution**: Add mechanisms for handling disputes
6. **Multi-token Support**: Support other stablecoins beyond USDC