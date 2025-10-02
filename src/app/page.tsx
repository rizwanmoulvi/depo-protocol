"use client";

import { useState, useEffect } from "react";
import { WalletSelector } from "@/components/WalletSelector";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const USDC_ADDRESS = '0x69091fbab5f7d635ee7ac5098cf0c1efbe31d68fec0f2cd565e8d168daf52832';

function HomeContent() {
  const [connected, setConnected] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientAddress, setRecipientAddress] = useState('');
  const [txStatus, setTxStatus] = useState('');
  const [usdcBalance, setUsdcBalance] = useState('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const { account, signAndSubmitTransaction } = useWallet();

  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  // Fetch USDC balance
  const fetchUsdcBalance = async () => {
    if (!account?.address) return;
    
    setIsLoadingBalance(true);
    try {
      const balance = await aptos.getCurrentFungibleAssetBalances({
        options: {
          where: {
            owner_address: { _eq: account.address.toString() },
            asset_type: { _eq: USDC_ADDRESS }
          }
        }
      });
      
      if (balance && balance.length > 0) {
        // Convert from smallest unit to USDC (divide by 1,000,000)
        const usdcAmount = (parseInt(balance[0].amount) / 1_000_000).toFixed(6);
        setUsdcBalance(usdcAmount);
      } else {
        setUsdcBalance('0');
      }
    } catch (error) {
      console.error('Error fetching USDC balance:', error);
      setUsdcBalance('Error');
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Update the connection status when the current account changes
  useEffect(() => {
    setConnected(!!account?.address);
    if (account?.address) {
      fetchUsdcBalance();
    } else {
      setUsdcBalance('0');
    }
  }, [account]);

  const handleSendTokens = async () => {
    if (!account?.address || !amount || !recipientAddress) {
      setTxStatus('Please connect wallet and fill all fields');
      return;
    }
    try {
      setTxStatus('Sending transaction...');
      
      const transaction = {
        data: {
          function: '0x1::primary_fungible_store::transfer',
          typeArguments: ['0x1::fungible_asset::Metadata'],
          functionArguments: [
            USDC_ADDRESS,
            recipientAddress,
            Math.floor(parseFloat(amount) * 1_000_000).toString(), // Convert to string and ensure integer
          ],
        },
      };
      
      const result = await signAndSubmitTransaction(transaction);
      await aptos.waitForTransaction({ transactionHash: result.hash });

      setTxStatus(`Transaction successful. Hash: ${result.hash}`);
      // Refresh balance after successful transaction
      await fetchUsdcBalance();
      // Clear form
      setAmount('');
      setRecipientAddress('');
    } catch (error) {
      console.error('Error:', error);
      setTxStatus(
        `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold mb-8">Aptos USDC Sender (Testnet)</h1>
        <WalletSelector />
        {connected && account && (
          <div className="mt-4 text-center">
            <p>Connected: {account.address?.toString() || 'Unknown'}</p>
            <div className="mt-2 p-3 bg-gray-100 rounded-lg">
              <p className="text-lg font-semibold text-black">
                USDC Balance: {isLoadingBalance ? 'Loading...' : `${usdcBalance} USDC`}
              </p>
              <button 
                onClick={fetchUsdcBalance}
                disabled={isLoadingBalance}
                className="mt-1 text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Refresh Balance
              </button>
            </div>
          </div>
        )}
        <div className="mt-8">
          <input
            type="text"
            placeholder="Amount (in USDC)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="p-2 border rounded mr-2 text-black"
          />
          <input
            type="text"
            placeholder="Recipient Address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="p-2 border rounded mr-2 text-black"
          />
          <button
            onClick={handleSendTokens}
            disabled={!connected}
            className={`p-2 rounded ${
              connected && amount && recipientAddress
                ? 'bg-blue-200 text-black hover:bg-blue-300'
                : 'bg-gray-300 text-gray-500'
            } transition-colors duration-200`}
          >
            Send USDC
          </button>
        </div>
        {txStatus && <p className="mt-4">{txStatus}</p>}
      </div>
    </main>
  );
}

export default function App() {
  return <HomeContent />;
}
