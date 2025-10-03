"use client";

import { WalletSelector } from "@/components/WalletSelector";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import EscrowDashboard from "@/components/EscrowDashboard";

export default function App() {
  const { account } = useWallet();

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Depos Protocol
              </h1>
              <p className="text-gray-600">
                Secure rental deposits and agreements on Aptos blockchain
              </p>
            </div>
            <WalletSelector />
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        {account ? (
          <EscrowDashboard />
        ) : (
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-4">
              Welcome to Depos Protocol
            </h2>
            <p className="text-gray-600 mb-8">
              Connect your wallet to start creating and managing rental agreements
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
