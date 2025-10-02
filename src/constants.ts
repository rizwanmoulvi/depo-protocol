import type { Network } from "@aptos-labs/wallet-adapter-react";

export const NETWORK: Network = (process.env.NEXT_PUBLIC_APP_NETWORK as Network) ?? "testnet";
export const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS ?? "0xd4263e7234e7e2c768b6e33b34a8a275de1cb8b41f395bf344d38f05ea6bbc82";
export const APTOS_API_KEY = process.env.NEXT_PUBLIC_APTOS_API_KEY;

// Rent Escrow Contract Constants
export const RENT_ESCROW_MODULE = "rent_escrow_v3";
export const RENT_ESCROW_ADDRESS = "0xd4263e7234e7e2c768b6e33b34a8a275de1cb8b41f395bf344d38f05ea6bbc82";

// USDC Token Address on Testnet
export const USDC_ADDRESS = "0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832";

// Platform constants
export const PLATFORM_FEE_BASIS_POINTS = 500; // 5%
