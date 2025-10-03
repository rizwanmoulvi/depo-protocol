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
                Secure rental deposits and agreements powered by Aave on Aptos blockchain
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
          <div className="w-screen mx-auto py-12 px-6 bg-white rounded-xl shadow-md">
            <h2 className="text-3xl font-bold text-center mb-6 text-indigo-700">
              Welcome to Depos Protocol
            </h2>
            
            <div className="text-center mb-8">
              <p className="text-lg text-gray-700 mb-4">
                The trustless rental security deposit solution powered by Aptos blockchain and Aave
              </p>
              
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-10">
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-indigo-700">For Landlords</h3>
                <p className="text-gray-700">Create rental agreements, specify deposit requirements, and earn yield on security deposits through Aave integration.</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-indigo-700">For Tenants</h3>
                <p className="text-gray-700">Securely deposit funds into escrow with peace of mind that your security deposit will be returned when the rental term ends.</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-lg">
                <h3 className="text-xl font-semibold mb-3 text-indigo-700">Security</h3>
                <p className="text-gray-700">Smart contract enforcement ensures automatic settlement and transparent transactions for all parties.</p>
              </div>
            </div>

            <div className="bg-gray-50 p-6 rounded-lg mb-8">
              <h3 className="text-xl font-semibold mb-3 text-center">How It Works</h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700">
                <li>Landlord creates a rental agreement with property details and deposit requirements</li>
                <li>Tenant reviews and signs the agreement</li>
                <li>Tenant deposits USDC as security deposit into the escrow smart contract</li>
                <li>Deposits are supplied to Aave to generate yield during the rental period</li>
                <li>At the end of the term, the principal is returned to the tenant while yield is distributed to the landlord</li>
              </ol>
            </div>
            
            <div className="text-center text-gray-600">
              <p>Built on Aptos blockchain for security, transparency, and efficiency.</p>
              <p className="mt-2">Using Circle's USDC for stable value and Aave for yield generation.</p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
