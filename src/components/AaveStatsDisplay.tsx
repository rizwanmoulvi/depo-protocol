"use client";

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { 
  getAaveStats, 
  getEscrowYieldInfo, 
  formatUsdcAmount, 
  formatApy, 
  formatTimeDuration,
  calculateLandlordYield,
  calculatePlatformFee,
  type EscrowYieldInfo 
} from '@/utils/aaveIntegration';

interface AaveStatsDisplayProps {
  escrowId?: string;
  refreshInterval?: number;
}

interface AaveStats {
  position: {
    principalSupplied: number;
    atokenBalance: number;
    lastUpdated: number;
  };
  totalValue: number;
  currentApy: number;
  currentYield: number;
  formattedTotalValue: string;
  formattedCurrentYield: string;
  formattedApy: string;
}

export const AaveStatsDisplay: React.FC<AaveStatsDisplayProps> = ({ 
  escrowId, 
  refreshInterval = 30000 
}) => {
  const [aaveStats, setAaveStats] = useState<AaveStats | null>(null);
  const [escrowYield, setEscrowYield] = useState<EscrowYieldInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAaveData = async () => {
    try {
      setError(null);
      
      // Fetch general Aave stats
      const stats = await getAaveStats();
      setAaveStats(stats);

      // Fetch escrow-specific yield info if escrowId is provided
      if (escrowId) {
        const yieldInfo = await getEscrowYieldInfo(escrowId);
        setEscrowYield(yieldInfo);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Aave data');
      console.error('Error fetching Aave data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAaveData();

    // Set up periodic refresh
    const interval = setInterval(fetchAaveData, refreshInterval);
    
    return () => clearInterval(interval);
  }, [escrowId, refreshInterval]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-6 border-red-200">
        <div className="text-red-600">
          <h3 className="font-semibold mb-2">Error Loading Aave Data</h3>
          <p className="text-sm">{error}</p>
          <button 
            onClick={fetchAaveData}
            className="mt-2 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* General Aave Statistics */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 text-green-600">🏦 Aave Yield Generation</h3>
        
        {aaveStats ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Current APY</div>
              <div className="text-xl font-bold text-blue-600">{aaveStats.formattedApy}</div>
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Total Value Locked</div>
              <div className="text-xl font-bold text-green-600">${aaveStats.formattedTotalValue}</div>
            </div>
            
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Current Yield</div>
              <div className="text-xl font-bold text-purple-600">${aaveStats.formattedCurrentYield}</div>
            </div>
            
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">aToken Balance</div>
              <div className="text-xl font-bold text-orange-600">
                {formatUsdcAmount(aaveStats.position.atokenBalance)}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center py-4">
            No Aave data available
          </div>
        )}
      </Card>

      {/* Escrow-Specific Yield Information */}
      {escrowId && escrowYield && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 text-indigo-600">📈 Escrow #{escrowId} Yield</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Estimated Yield</div>
              <div className="text-xl font-bold text-indigo-600">
                ${formatUsdcAmount(escrowYield.estimatedYield)}
              </div>
            </div>
            
            <div className="bg-teal-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Time Locked</div>
              <div className="text-xl font-bold text-teal-600">
                {formatTimeDuration(escrowYield.timeElapsed)}
              </div>
            </div>
            
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600">Current APY</div>
              <div className="text-xl font-bold text-yellow-600">
                {formatApy(escrowYield.currentApy)}
              </div>
            </div>
          </div>

          {/* Yield Distribution */}
          {escrowYield.estimatedYield > 0 && (
            <div className="border-t pt-4">
              <h4 className="font-medium mb-3 text-gray-700">Yield Distribution</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Landlord Receives</div>
                  <div className="text-lg font-semibold text-green-600">
                    ${formatUsdcAmount(calculateLandlordYield(escrowYield.estimatedYield))}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({(95).toFixed(1)}% of yield)
                  </div>
                </div>
                
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Platform Fee</div>
                  <div className="text-lg font-semibold text-gray-600">
                    ${formatUsdcAmount(calculatePlatformFee(escrowYield.estimatedYield))}
                  </div>
                  <div className="text-xs text-gray-500">
                    ({(5).toFixed(1)}% of yield)
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Aave Integration Status */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-blue-50">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h4 className="font-medium text-gray-800">Aave Integration Active</h4>
            <p className="text-sm text-gray-600">
              Funds are automatically supplied to Aave for yield generation. 
              Yields are calculated in real-time and distributed upon escrow settlement.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AaveStatsDisplay;