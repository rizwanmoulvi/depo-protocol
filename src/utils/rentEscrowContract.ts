import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { RENT_ESCROW_ADDRESS, USDC_ADDRESS } from "@/constants";

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

export interface EscrowAgreement {
  id: string;
  landlord: string;
  tenant: string;
  propertyName: string;
  propertyAddress: string;
  securityDeposit: string;
  monthlyRent: string;
  startDate: string;
  endDate: string;
  landlordSigned: boolean;
  tenantSigned: boolean;
  depositedAmount: string;
  settled: boolean;
  createdAt: string;
}

export interface EscrowRegistry {
  escrows: EscrowAgreement[];
  nextId: string;
  platformTreasury: string;
  resourceAccountAddress: string;
}

/**
 * Create a new escrow agreement (called by landlord)
 */
/**
 * Initialize the Aave-integrated escrow contract
 */
export const initializeContract = async (
  { signAndSubmitTransaction }: { signAndSubmitTransaction: any }
) => {
  const transaction = {
    data: {
      function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::initialize`,
      typeArguments: [],
      functionArguments: [],
    },
  };

  return await signAndSubmitTransaction(transaction);
};

/**
 * Create a new escrow agreement
 */
export const createEscrow = async (
  landlordSigner: any,
  tenant: string,
  propertyName: string,
  propertyAddress: string,
  securityDeposit: number, // in USDC (6 decimals)
  monthlyRent: number, // in USDC (6 decimals)
  startDate: number, // timestamp
  endDate: number // timestamp
) => {
  const transaction = {
    data: {
      function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::create_escrow`,
      typeArguments: [],
      functionArguments: [
        tenant,
        propertyName,
        propertyAddress,
        securityDeposit.toString(),
        monthlyRent.toString(),
        startDate.toString(),
        endDate.toString()
      ],
    },
  };

  return await landlordSigner.signAndSubmitTransaction(transaction);
};

/**
 * Sign an escrow agreement (called by landlord or tenant)
 */
export const signEscrow = async (
  signer: any,
  escrowId: number
) => {
  const transaction = {
    data: {
      function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::sign_escrow`,
      typeArguments: [],
      functionArguments: [escrowId.toString()],
    },
  };

  return await signer.signAndSubmitTransaction(transaction);
};

/**
 * Deposit funds (called by tenant)
 */
// ...existing code...

/**
 * Make a direct deposit to Aave
 * This function calls Aave's supply function to deposit aa_USDC to the resource account
 */
export const depositToAave = async (
  tenantSigner: any,
  escrowId: number,
  amount: number,
  usdcMetadata: string = USDC_ADDRESS
) => {
  // Add debugging logs
  console.log("depositToAave called with:", {
    tenantSigner: !!tenantSigner,
    escrowId,
    amount,
    amountType: typeof amount,
    usdcMetadata
  });

  // Validate inputs
  if (!tenantSigner) {
    throw new Error("Tenant signer is required");
  }
  
  if (typeof escrowId !== 'number' || escrowId < 0) {
    throw new Error("Valid escrow ID is required");
  }
  
  if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
    console.error("Amount validation failed:", { amount, type: typeof amount, isNaN: isNaN(amount) });
    throw new Error(`Valid amount is required. Received: ${amount} (type: ${typeof amount})`);
  }

  // Get escrow details to extract security deposit amount
  const escrowData = await getEscrow(escrowId);
  if (!escrowData) {
    throw new Error("Escrow not found");
  }

  // Extract only the security deposit amount (not rent)
  const securityDepositAmount = parseInt(escrowData.securityDeposit);
  
  console.log("Security deposit amount:", securityDepositAmount);
  console.log("Total amount provided:", amount);

  // Call Aave's supply function
  const transaction = {
    data: {
      function: `0xbd7912c555a06809c2e385eab635ff0ef52b1fa062ce865c785c67694a12bb12::supply_logic::supply`,
      typeArguments: [],
      functionArguments: [
        usdcMetadata, // asset address (USDC)
        securityDepositAmount.toString(), // only security deposit amount
        "0x7f561777e5d6e4d83ce439b1aadca568ccb060b3462adcae934f4dc11ddf4c7c", // on_behalf_of (your contract address)
        "0" // referral_code
      ],
    },
  };

  return await tenantSigner.signAndSubmitTransaction(transaction);
};

/**
 * Verify that an Aave deposit has been made (called by tenant after depositing to Aave)
 */
export const verifyAaveDeposit = async (
  tenantSigner: any,
  escrowId: number,
  depositAmount: number
) => {
  console.log("verifyAaveDeposit called with:", {
    tenantSigner: !!tenantSigner,
    escrowId,
    depositAmount
  });

  // Validate inputs
  if (!tenantSigner) {
    throw new Error("Tenant signer is required");
  }
  
  if (typeof escrowId !== 'number' || escrowId < 0) {
    throw new Error("Valid escrow ID is required");
  }
  
  if (typeof depositAmount !== 'number' || depositAmount <= 0 || isNaN(depositAmount)) {
    console.error("Amount validation failed:", { depositAmount, type: typeof depositAmount, isNaN: isNaN(depositAmount) });
    throw new Error(`Valid deposit amount is required. Received: ${depositAmount} (type: ${typeof depositAmount})`);
  }

  // Get escrow details to extract security deposit amount
  const escrowData = await getEscrow(escrowId);
  if (!escrowData) {
    throw new Error("Escrow not found");
  }

  const transaction = {
    data: {
      function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::verify_aave_deposit`,
      typeArguments: [],
      functionArguments: [
        escrowId.toString(),
        depositAmount.toString(),
      ],
    },
  };

  return await tenantSigner.signAndSubmitTransaction(transaction);
};
// ...existing code...

/**
 * Settle escrow (called by landlord or tenant after term ends)
 */
export const settleEscrow = async (
  signer: any,
  escrowId: number,
  usdcMetadata: string = USDC_ADDRESS
) => {
  const transaction = {
    data: {
      function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::settle_escrow`,
      typeArguments: [],
      functionArguments: [escrowId.toString(), usdcMetadata],
    },
  };

  return await signer.signAndSubmitTransaction(transaction);
};

/**
 * Get escrow details by ID
 */
export const getEscrow = async (escrowId: number): Promise<EscrowAgreement | null> => {
  try {
    console.log("Fetching escrow details for ID:", escrowId);
    
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_escrow`,
        typeArguments: [],
        functionArguments: [escrowId.toString()],
      },
    });

    console.log("Raw escrow result:", result);
    console.log("Result length:", result?.length);

    if (result && result.length >= 14) {
      // The contract returns a tuple, map it to our interface
      const escrowData = {
        id: (result[0] as string),
        landlord: (result[1] as string),
        tenant: (result[2] as string),
        propertyName: (result[3] as string),
        propertyAddress: (result[4] as string),
        securityDeposit: (result[5] as string),
        monthlyRent: (result[6] as string),
        startDate: (result[7] as string),
        endDate: (result[8] as string),
        landlordSigned: (result[9] as boolean),
        tenantSigned: (result[10] as boolean),
        depositedAmount: (result[11] as string),
        settled: (result[12] as boolean),
        createdAt: (result[13] as string),
      };
      console.log("Parsed escrow data:", escrowData);
      return escrowData;
    }
    console.log("Invalid result format or insufficient data");
    return null;
  } catch (error) {
    console.error("Error fetching escrow:", error);
    return null;
  }
};

/**
 * Get the deposit status for an escrow agreement
 * @param escrowId ID of the escrow agreement
 * @returns Object containing isDeposited status and deposit amount
 */
export const getEscrowDepositStatus = async (escrowId: number): Promise<{isDeposited: boolean, depositAmount: string}> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_escrow_deposit_status`,
        typeArguments: [],
        functionArguments: [escrowId.toString()]
      },
    });
    
    if (!result || !Array.isArray(result) || result.length < 2) {
      throw new Error("Invalid response format from get_escrow_deposit_status");
    }
    
    return {
      isDeposited: result[0] as boolean,
      depositAmount: result[1].toString()
    };
  } catch (error) {
    console.error("Error getting escrow deposit status:", error);
    return {
      isDeposited: false,
      depositAmount: "0"
    };
  }
};

/**
 * Get escrows by landlord
 */
export const getEscrowsByLandlord = async (landlord: string): Promise<number[]> => {
  try {
    console.log("Fetching escrows for landlord:", landlord);
    console.log("Contract address:", RENT_ESCROW_ADDRESS);
    
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_landlord_escrows`,
        typeArguments: [],
        functionArguments: [landlord],
      },
    });

    console.log("Raw result from view function:", result);
    const escrowIds = (result[0] as string[]).map(id => parseInt(id));
    console.log("Parsed escrow IDs:", escrowIds);
    return escrowIds;
  } catch (error) {
    console.error("Error fetching landlord escrows:", error);
    return [];
  }
};

/**
 * Get escrows by tenant
 */
export const getEscrowsByTenant = async (tenant: string): Promise<number[]> => {
  try {
    console.log("Fetching escrows for tenant:", tenant);
    console.log("Contract address:", RENT_ESCROW_ADDRESS);
    
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_tenant_escrows`,
        typeArguments: [],
        functionArguments: [tenant],
      },
    });

    console.log("Raw result from view function:", result);
    const escrowIds = (result[0] as string[]).map(id => parseInt(id));
    console.log("Parsed escrow IDs:", escrowIds);
    return escrowIds;
  } catch (error) {
    console.error("Error fetching tenant escrows:", error);
    return [];
  }
};

/**
 * Get resource account address
 */
export const getResourceAccountAddress = async (): Promise<string> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_resource_account_address`,
        typeArguments: [],
        functionArguments: [],
      },
    });

    return result[0] as string;
  } catch (error) {
    console.error("Error fetching resource account address:", error);
    return "";
  }
};

/**
 * Get contract USDC balance
 */
export const getContractUsdcBalance = async (): Promise<number> => {
  try {
    const result = await aptos.view({
      payload: {
        function: `${RENT_ESCROW_ADDRESS}::rent_escrow_v3::get_contract_usdc_balance`,
        typeArguments: [],
        functionArguments: [USDC_ADDRESS],
      },
    });

    return parseInt(result[0] as string);
  } catch (error) {
    console.error("Error fetching contract USDC balance:", error);
    return 0;
  }
};

/**
 * Helper function to format USDC amount (6 decimals)
 */
export const formatUsdcAmount = (amount: string | number): string => {
  const amountNum = typeof amount === 'string' ? parseInt(amount) : amount;
  return (amountNum / 1_000_000).toFixed(2);
};

/**
 * Helper function to convert USDC to contract format
 */
export const toUsdcAmount = (amount: number): number => {
  return Math.floor(amount * 1_000_000);
};

/**
 * Helper function to format timestamp to date
 */
export const formatDate = (timestamp: string | number): string => {
  const timestampNum = typeof timestamp === 'string' ? parseInt(timestamp) : timestamp;
  return new Date(timestampNum * 1000).toLocaleDateString();
};

/**
 * Helper function to check if escrow term has ended
 */
export const isEscrowTermEnded = (endDate: string | number): boolean => {
  const endTimestamp = typeof endDate === 'string' ? parseInt(endDate) : endDate;
  return Date.now() > endTimestamp * 1000;
};