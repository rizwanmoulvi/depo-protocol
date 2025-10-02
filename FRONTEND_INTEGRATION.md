# Frontend Integration Guide - COMPLETED ✅

## Status: Successfully Deployed and Integrated!

The rent escrow system has been successfully deployed to Aptos testnet and integrated with the React frontend.

## Contract Details
- **Contract Address**: `0xd4263e7234e7e2c768b6e33b34a8a275de1cb8b41f395bf344d38f05ea6bbc82`
- **Network**: Aptos Testnet
- **USDC Address**: `0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832`
- **Resource Account**: `0x939039a896418a471bbbf0ccede4018ea1c81aed96afabda7602f688cf25d8f1`

## Overview

The rent escrow system consists of:
- **Smart Contract**: `rent_escrow.move` deployed with resource account for secure fund management
- **Frontend**: React/Next.js UI with complete escrow dashboard
- **Integration**: TypeScript utilities for seamless contract interaction

## Contract Address Setup

After deployment, update your constants file with the contract address:

```typescript
// src/constants.ts
export const CONTRACT_ADDRESS = "0xYOUR_DEPLOYED_CONTRACT_ADDRESS";
export const MODULE_NAME = "rent_escrow";
```

## Contract Functions

### 1. Create Escrow (Landlord)

```typescript
// utils/escrowContract.ts
import { Aptos, AptosConfig, Network, Account } from "@aptos-labs/ts-sdk";
import { CONTRACT_ADDRESS, MODULE_NAME } from "../constants";

export const createEscrow = async (
  wallet: any,
  tenantAddress: string,
  depositAmount: number,
  rentAmount: number,
  leaseTermMonths: number,
  propertyInfo: string
) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const transaction = await aptos.transaction.build.simple({
    sender: wallet.account.address,
    data: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::create_escrow`,
      functionArguments: [
        tenantAddress,
        depositAmount,
        rentAmount,
        leaseTermMonths,
        propertyInfo
      ],
    },
  });

  const pendingTransaction = await wallet.signAndSubmitTransaction(transaction);
  return await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
};
```

### 2. Sign Escrow (Tenant)

```typescript
export const signEscrow = async (
  wallet: any,
  escrowId: string
) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const transaction = await aptos.transaction.build.simple({
    sender: wallet.account.address,
    data: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::sign_escrow`,
      functionArguments: [escrowId],
    },
  });

  const pendingTransaction = await wallet.signAndSubmitTransaction(transaction);
  return await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
};
```

### 3. Deposit Funds (Tenant)

```typescript
export const depositFunds = async (
  wallet: any,
  escrowId: string,
  amount: number
) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const transaction = await aptos.transaction.build.simple({
    sender: wallet.account.address,
    data: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::deposit_and_supply_to_aave`,
      functionArguments: [escrowId, amount],
    },
  });

  const pendingTransaction = await wallet.signAndSubmitTransaction(transaction);
  return await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
};
```

### 4. Settle Escrow

```typescript
export const settleEscrow = async (
  wallet: any,
  escrowId: string,
  tenantRefundAmount: number,
  landlordAmount: number
) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const transaction = await aptos.transaction.build.simple({
    sender: wallet.account.address,
    data: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::settle_escrow`,
      functionArguments: [escrowId, tenantRefundAmount, landlordAmount],
    },
  });

  const pendingTransaction = await wallet.signAndSubmitTransaction(transaction);
  return await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
};
```

## View Functions

### 1. Get Escrow Details

```typescript
export const getEscrow = async (escrowId: string) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_escrow`,
      functionArguments: [escrowId],
    },
  });

  return resource[0];
};
```

### 2. Get Resource Account Address

```typescript
export const getResourceAccountAddress = async () => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_resource_account_address`,
      functionArguments: [],
    },
  });

  return resource[0];
};
```

### 3. Get Escrows by User

```typescript
export const getEscrowsByLandlord = async (landlordAddress: string) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_escrows_by_landlord`,
      functionArguments: [landlordAddress],
    },
  });

  return resource[0];
};

export const getEscrowsByTenant = async (tenantAddress: string) => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::${MODULE_NAME}::get_escrows_by_tenant`,
      functionArguments: [tenantAddress],
    },
  });

  return resource[0];
};
```

## React Components

### 1. Create Escrow Component (Landlord)

```tsx
// components/CreateEscrow.tsx
import React, { useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { createEscrow } from '../utils/escrowContract';

export const CreateEscrow: React.FC = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const [formData, setFormData] = useState({
    tenantAddress: '',
    depositAmount: '',
    rentAmount: '',
    leaseTermMonths: '',
    propertyInfo: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;

    try {
      const result = await createEscrow(
        { account, signAndSubmitTransaction },
        formData.tenantAddress,
        parseInt(formData.depositAmount),
        parseInt(formData.rentAmount),
        parseInt(formData.leaseTermMonths),
        formData.propertyInfo
      );
      
      console.log('Escrow created:', result);
      // Handle success
    } catch (error) {
      console.error('Error creating escrow:', error);
      // Handle error
    }
  };

  // Form JSX...
};
```

### 2. Escrow Dashboard Component

```tsx
// components/EscrowDashboard.tsx
import React, { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { getEscrowsByLandlord, getEscrowsByTenant } from '../utils/escrowContract';

export const EscrowDashboard: React.FC = () => {
  const { account } = useWallet();
  const [escrows, setEscrows] = useState([]);
  const [userType, setUserType] = useState<'landlord' | 'tenant'>('landlord');

  useEffect(() => {
    if (!account) return;

    const fetchEscrows = async () => {
      try {
        const userEscrows = userType === 'landlord' 
          ? await getEscrowsByLandlord(account.address)
          : await getEscrowsByTenant(account.address);
        
        setEscrows(userEscrows);
      } catch (error) {
        console.error('Error fetching escrows:', error);
      }
    };

    fetchEscrows();
  }, [account, userType]);

  // Dashboard JSX...
};
```

## Error Handling

```typescript
// utils/errorHandler.ts
export const handleContractError = (error: any) => {
  if (error.message.includes('EESCROW_NOT_FOUND')) {
    return 'Escrow not found';
  } else if (error.message.includes('EUNAUTHORIZED')) {
    return 'You are not authorized to perform this action';
  } else if (error.message.includes('EINVALID_STATE')) {
    return 'Invalid escrow state for this operation';
  }
  
  return 'An unexpected error occurred';
};
```

## Testing Integration

1. **Deploy Contract**: Use the deployment script
2. **Update Constants**: Set contract address in constants.ts
3. **Test Functions**: Start with view functions to verify connection
4. **Test Transactions**: Create a test escrow with small amounts
5. **Monitor Events**: Check transaction results and contract state

## Security Considerations

1. **Input Validation**: Always validate user inputs before sending to contract
2. **Amount Handling**: Use proper decimal handling for USDC amounts
3. **Error Messages**: Don't expose sensitive contract details to users
4. **Rate Limiting**: Implement reasonable rate limiting for contract calls
5. **Resource Account**: The contract uses a resource account for maximum security

## Next Steps

1. Implement the contract functions in your frontend
2. Create user-friendly forms for each operation
3. Add proper error handling and user feedback
4. Test thoroughly on testnet before mainnet deployment
5. Consider adding Aave integration for yield generation