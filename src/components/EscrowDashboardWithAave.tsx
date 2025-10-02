"use client";

import React, { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import AaveStatsDisplay from './AaveStatsDisplay';
import { 
  getEscrowsByLandlord, 
  getEscrowsByTenant, 
  getEscrow,
  signEscrow,
  depositFunds,
  settleEscrow 
} from '@/utils/escrowContract';
import { 
  getEstimatedEscrowYield,
  calculateLandlordYield,
  formatUsdcAmount,
  formatTimeDuration 
} from '@/utils/aaveIntegration';

interface EscrowData {
  id: string;
  landlord: string;
  tenant: string;
  propertyName: string;
  propertyAddress: string;
  securityDeposit: number;
  monthlyRent: number;
  startDate: number;
  endDate: number;
  landlordSigned: boolean;
  tenantSigned: boolean;
  depositedAmount: number;
  aaveAtokenAmount: number;
  aaveSupplied: boolean;
  settled: boolean;
  createdAt: number;
  estimatedYield?: number;
}

type UserType = 'landlord' | 'tenant';

export const EscrowDashboardWithAave: React.FC = () => {
  const { account } = useWallet();
  const [escrows, setEscrows] = useState<EscrowData[]>([]);
  const [userType, setUserType] = useState<UserType>('landlord');
  const [loading, setLoading] = useState(true);
  const [selectedEscrow, setSelectedEscrow] = useState<string | null>(null);

  const fetchEscrows = async () => {
    if (!account) return;

    try {
      setLoading(true);
      
      // Fetch escrow IDs based on user type
      const escrowIds = userType === 'landlord' 
        ? await getEscrowsByLandlord(account.address)
        : await getEscrowsByTenant(account.address);

      // Fetch detailed data for each escrow
      const escrowDetails = await Promise.all(
        escrowIds.map(async (id: string) => {
          const details = await getEscrow(id);
          
          // Fetch estimated yield for active escrows
          let estimatedYield = 0;
          if (details.depositedAmount > 0 && !details.settled) {
            try {
              estimatedYield = await getEstimatedEscrowYield(id);
            } catch (error) {
              console.error(`Error fetching yield for escrow ${id}:`, error);
            }
          }

          return {
            id,
            landlord: details.landlord,
            tenant: details.tenant,
            propertyName: details.propertyName,
            propertyAddress: details.propertyAddress,
            securityDeposit: details.securityDeposit,
            monthlyRent: details.monthlyRent,
            startDate: details.startDate,
            endDate: details.endDate,
            landlordSigned: details.landlordSigned,
            tenantSigned: details.tenantSigned,
            depositedAmount: details.depositedAmount,
            aaveAtokenAmount: details.aaveAtokenAmount,
            aaveSupplied: details.aaveSupplied,
            settled: details.settled,
            createdAt: details.createdAt,
            estimatedYield
          };
        })
      );

      setEscrows(escrowDetails);
    } catch (error) {
      console.error('Error fetching escrows:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (account) {
      fetchEscrows();
    }
  }, [account, userType]);

  const getEscrowStatus = (escrow: EscrowData): string => {
    if (escrow.settled) return 'Settled';
    if (!escrow.landlordSigned || !escrow.tenantSigned) return 'Pending Signatures';
    if (escrow.depositedAmount === 0) return 'Awaiting Deposit';
    if (Date.now() / 1000 < escrow.endDate) return 'Active (Earning Yield)';
    return 'Ready for Settlement';
  };

  const getStatusColor = (escrow: EscrowData): string => {
    const status = getEscrowStatus(escrow);
    switch (status) {
      case 'Settled': return 'text-gray-600 bg-gray-100';
      case 'Pending Signatures': return 'text-orange-600 bg-orange-100';
      case 'Awaiting Deposit': return 'text-yellow-600 bg-yellow-100';
      case 'Active (Earning Yield)': return 'text-green-600 bg-green-100';
      case 'Ready for Settlement': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const handleAction = async (escrow: EscrowData, action: string) => {
    // Implementation for different actions (sign, deposit, settle)
    // This would integrate with the wallet and call the appropriate contract functions
    console.log(`Action: ${action} for escrow ${escrow.id}`);
  };

  if (!account) {
    return (
      <Card className="p-6 text-center">
        <h3 className="text-lg font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-gray-600">Please connect your wallet to view your escrows and Aave yield data.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with User Type Toggle */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Escrow Dashboard with Aave Yields</h1>
        <div className="flex gap-2">
          <Button
            variant={userType === 'landlord' ? 'default' : 'outline'}
            onClick={() => setUserType('landlord')}
          >
            As Landlord
          </Button>
          <Button
            variant={userType === 'tenant' ? 'default' : 'outline'}
            onClick={() => setUserType('tenant')}
          >
            As Tenant
          </Button>
        </div>
      </div>

      {/* Aave Statistics Overview */}
      <AaveStatsDisplay refreshInterval={30000} />

      {/* Escrows List */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">
          Your Escrows ({userType === 'landlord' ? 'as Landlord' : 'as Tenant'})
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : escrows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No escrows found.</p>
            <p className="text-sm mt-2">
              {userType === 'landlord' 
                ? 'Create your first rental escrow to get started.'
                : 'Wait for a landlord to invite you to an escrow.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {escrows.map((escrow) => (
              <div key={escrow.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-lg">{escrow.propertyName}</h3>
                    <p className="text-gray-600 text-sm">{escrow.propertyAddress}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(escrow)}`}>
                    {getEscrowStatus(escrow)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Security Deposit</div>
                    <div className="font-semibold">${formatUsdcAmount(escrow.securityDeposit)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Monthly Rent</div>
                    <div className="font-semibold">${formatUsdcAmount(escrow.monthlyRent)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Lease Duration</div>
                    <div className="font-semibold">
                      {formatTimeDuration(escrow.endDate - escrow.startDate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Estimated Yield</div>
                    <div className="font-semibold text-green-600">
                      ${formatUsdcAmount(escrow.estimatedYield || 0)}
                    </div>
                  </div>
                </div>

                {/* Aave Integration Info */}
                {escrow.depositedAmount > 0 && (
                  <div className="bg-green-50 p-3 rounded-lg mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-green-700">Earning Yield via Aave</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">aToken Balance: </span>
                        <span className="font-medium">{formatUsdcAmount(escrow.aaveAtokenAmount)}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Current Yield: </span>
                        <span className="font-medium text-green-600">
                          ${formatUsdcAmount(escrow.estimatedYield || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600">Landlord Gets: </span>
                        <span className="font-medium text-green-600">
                          ${formatUsdcAmount(calculateLandlordYield(escrow.estimatedYield || 0))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedEscrow(selectedEscrow === escrow.id ? null : escrow.id)}
                  >
                    {selectedEscrow === escrow.id ? 'Hide Details' : 'View Details'}
                  </Button>
                  
                  {/* Conditional action buttons based on escrow state and user type */}
                  {userType === 'tenant' && !escrow.tenantSigned && (
                    <Button size="sm" onClick={() => handleAction(escrow, 'sign')}>
                      Sign Escrow
                    </Button>
                  )}
                  
                  {userType === 'tenant' && escrow.tenantSigned && escrow.depositedAmount === 0 && (
                    <Button size="sm" onClick={() => handleAction(escrow, 'deposit')}>
                      Deposit Funds
                    </Button>
                  )}
                  
                  {Date.now() / 1000 >= escrow.endDate && !escrow.settled && (
                    <Button size="sm" onClick={() => handleAction(escrow, 'settle')}>
                      Settle Escrow
                    </Button>
                  )}
                </div>

                {/* Detailed Aave Stats for Selected Escrow */}
                {selectedEscrow === escrow.id && (
                  <div className="mt-4 pt-4 border-t">
                    <AaveStatsDisplay escrowId={escrow.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default EscrowDashboardWithAave;