// Aave Integration Utilities for Frontend
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// For now, using placeholder contract address - update after deployment
const CONTRACT_ADDRESS = "0x123"; // Replace with actual deployed contract address
const MODULE_NAME = "rent_escrow";

export interface AavePosition {
  principalSupplied: number;
  atokenBalance: number;
  lastUpdated: number;
}

export interface EscrowYieldInfo {
  escrowId: string;
  estimatedYield: number;
  currentApy: number;
  timeElapsed: number;
}

/**
 * Get current Aave position for the escrow contract
 */
export const getAavePosition = async (): Promise<AavePosition> => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_aave_position`,
      functionArguments: [],
    },
  });

  return {
    principalSupplied: parseInt(resource[0] as string),
    atokenBalance: parseInt(resource[1] as string),
    lastUpdated: parseInt(resource[2] as string),
  };
};

/**
 * Get current yield earned from Aave
 */
export const getAaveYield = async (): Promise<number> => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_aave_yield`,
      functionArguments: [],
    },
  });

  return parseInt(resource[0] as string);
};

/**
 * Get current Aave APY for USDC
 */
export const getCurrentAaveApy = async (): Promise<number> => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_current_aave_apy`,
      functionArguments: [],
    },
  });

  // Convert from basis points to percentage
  return parseInt(resource[0] as string) / 100;
};

/**
 * Get total value locked in Aave
 */
export const getTotalAaveValue = async (): Promise<number> => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_total_aave_value`,
      functionArguments: [],
    },
  });

  return parseInt(resource[0] as string);
};

/**
 * Get estimated yield for a specific escrow
 */
export const getEstimatedEscrowYield = async (escrowId: string): Promise<number> => {
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const resource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_estimated_escrow_yield`,
      functionArguments: [escrowId],
    },
  });

  return parseInt(resource[0] as string);
};

/**
 * Calculate projected yield for a given amount and time period
 */
export const calculateProjectedYield = async (
  amount: number,
  daysLocked: number
): Promise<number> => {
  const currentApy = await getCurrentAaveApy();
  const dailyRate = currentApy / 365 / 100; // Convert APY to daily rate
  return amount * dailyRate * daysLocked;
};

/**
 * Get comprehensive yield information for an escrow
 */
export const getEscrowYieldInfo = async (escrowId: string): Promise<EscrowYieldInfo> => {
  const [estimatedYield, currentApy] = await Promise.all([
    getEstimatedEscrowYield(escrowId),
    getCurrentAaveApy(),
  ]);

  // Get escrow details to calculate time elapsed
  const aptosConfig = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(aptosConfig);

  const escrowResource = await aptos.view({
    payload: {
      function: `${CONTRACT_ADDRESS}::rent_escrow::get_escrow`,
      functionArguments: [escrowId],
    },
  });

  const createdAt = parseInt(escrowResource[16] as string); // created_at field
  const currentTime = Math.floor(Date.now() / 1000);
  const timeElapsed = Math.max(0, currentTime - createdAt);

  return {
    escrowId,
    estimatedYield,
    currentApy,
    timeElapsed,
  };
};

/**
 * Format USDC amount for display (6 decimals)
 */
export const formatUsdcAmount = (amount: number): string => {
  return (amount / 1_000_000).toFixed(2);
};

/**
 * Format APY for display
 */
export const formatApy = (apy: number): string => {
  return apy.toFixed(2) + "%";
};

/**
 * Format time duration for display
 */
export const formatTimeDuration = (seconds: number): string => {
  const days = Math.floor(seconds / (24 * 3600));
  const hours = Math.floor((seconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

/**
 * Calculate platform fee from yield amount
 */
export const calculatePlatformFee = (yieldAmount: number): number => {
  const PLATFORM_FEE_BASIS_POINTS = 500; // 5%
  return (yieldAmount * PLATFORM_FEE_BASIS_POINTS) / 10000;
};

/**
 * Calculate landlord yield after platform fee
 */
export const calculateLandlordYield = (totalYield: number): number => {
  const platformFee = calculatePlatformFee(totalYield);
  return totalYield - platformFee;
};

/**
 * Get Aave-related statistics for dashboard
 */
export const getAaveStats = async () => {
  try {
    const [position, totalValue, currentApy, currentYield] = await Promise.all([
      getAavePosition(),
      getTotalAaveValue(),
      getCurrentAaveApy(),
      getAaveYield(),
    ]);

    return {
      position,
      totalValue,
      currentApy,
      currentYield,
      formattedTotalValue: formatUsdcAmount(totalValue),
      formattedCurrentYield: formatUsdcAmount(currentYield),
      formattedApy: formatApy(currentApy),
    };
  } catch (error) {
    console.error("Error fetching Aave stats:", error);
    return null;
  }
};

/**
 * Monitor yield generation for a specific escrow
 */
export const monitorEscrowYield = (
  escrowId: string,
  onUpdate: (yieldInfo: EscrowYieldInfo) => void,
  intervalMs: number = 30000 // 30 seconds
): () => void => {
  const interval = setInterval(async () => {
    try {
      const yieldInfo = await getEscrowYieldInfo(escrowId);
      onUpdate(yieldInfo);
    } catch (error) {
      console.error("Error monitoring escrow yield:", error);
    }
  }, intervalMs);

  // Return cleanup function
  return () => clearInterval(interval);
};