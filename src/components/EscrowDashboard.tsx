"use client";

import React, { useEffect, useState } from 'react';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  getEscrowsByLandlord, 
  getEscrowsByTenant, 
  getEscrow,
  createEscrow,
  signEscrow,
  initializeContract,
  depositToAave,
  verifyAaveDeposit,
  getEscrowDepositStatus,
  settleEscrow,
  formatUsdcAmount,
  formatDate,
  toUsdcAmount,
  isEscrowTermEnded,
  EscrowAgreement
} from '@/utils/rentEscrowContract';
import { USDC_ADDRESS } from '@/constants';

interface EscrowFormData {
  tenant: string;
  propertyName: string;
  propertyAddress: string;
  securityDeposit: string;
  monthlyRent: string;
  startDate: string;
  endDate: string;
}

const EscrowDashboard: React.FC = () => {
  const { account, signAndSubmitTransaction } = useWallet();
  const { toast } = useToast();
  
  const [userEscrows, setUserEscrows] = useState<EscrowAgreement[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState<EscrowFormData>(() => {
    const now = new Date();
    const startTime = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const endTime = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    
    return {
      tenant: '',
      propertyName: '',
      propertyAddress: '',
      securityDeposit: '',
      monthlyRent: '',
      startDate: startTime.toISOString().slice(0, 16), // Format for datetime-local
      endDate: endTime.toISOString().slice(0, 16)
    };
  });

  useEffect(() => {
    if (account?.address) {
      loadUserEscrows();
    }
  }, [account?.address]);

  const loadUserEscrows = async () => {
    if (!account?.address) return;

    setIsLoading(true);
    try {
      // Get escrows where user is landlord
      const landlordEscrowIds = await getEscrowsByLandlord(account.address.toString());
      // Get escrows where user is tenant
      const tenantEscrowIds = await getEscrowsByTenant(account.address.toString());
      
      // Combine and deduplicate
      const allEscrowIds = [...new Set([...landlordEscrowIds, ...tenantEscrowIds])];
      
      // Fetch detailed escrow data
      const escrows = await Promise.all(
        allEscrowIds.map(id => getEscrow(id))
      );
      
      console.log("Fetched escrows from contract:", escrows);
      
      // Filter out null results
      const validEscrows = escrows.filter(escrow => escrow !== null) as EscrowAgreement[];
      console.log("Valid escrows after filtering:", validEscrows);
      setUserEscrows(validEscrows);
    } catch (error) {
      console.error('Error loading escrows:', error);
      toast({
        title: "Error",
        description: "Failed to load escrows",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInitializeContract = async () => {
    if (!account?.address || !signAndSubmitTransaction) return;

    setIsLoading(true);
    try {
      await initializeContract({ signAndSubmitTransaction });
      
      toast({
        title: "Success",
        description: "Contract initialized successfully!",
      });
    } catch (error) {
      console.error('Error initializing contract:', error);
      toast({
        title: "Error", 
        description: "Failed to initialize contract",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEscrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address || !signAndSubmitTransaction) return;

    setIsLoading(true);
    try {
      const startTimestamp = Math.floor(new Date(formData.startDate).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(formData.endDate).getTime() / 1000);
      
      await createEscrow(
        { signAndSubmitTransaction },
        formData.tenant,
        formData.propertyName,
        formData.propertyAddress,
        toUsdcAmount(parseFloat(formData.securityDeposit)),
        toUsdcAmount(parseFloat(formData.monthlyRent)),
        startTimestamp,
        endTimestamp
      );

      toast({
        title: "Success",
        description: "Escrow created successfully!",
      });

      // Reset form and refresh escrows
      setFormData({
        tenant: '',
        propertyName: '',
        propertyAddress: '',
        securityDeposit: '',
        monthlyRent: '',
        startDate: '',
        endDate: ''
      });
      setShowCreateForm(false);
      await loadUserEscrows();
    } catch (error) {
      console.error('Error creating escrow:', error);
      toast({
        title: "Error",
        description: "Failed to create escrow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignEscrow = async (escrowId: string) => {
    if (!signAndSubmitTransaction) return;

    setIsLoading(true);
    try {
      await signEscrow(
        { signAndSubmitTransaction },
        parseInt(escrowId)
      );

      toast({
        title: "Success",
        description: "Escrow signed successfully!",
      });

      await loadUserEscrows();
    } catch (error) {
      console.error('Error signing escrow:', error);
      toast({
        title: "Error",
        description: "Failed to sign escrow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

const handleDepositToAave = async (escrowId: string) => {
  if (!signAndSubmitTransaction) return;

  setIsLoading(true);
  try {
    const escrow = userEscrows.find(e => e.id === escrowId);
    if (!escrow) throw new Error("Escrow not found");

    // Calculate required deposit amount (security deposit + monthly rent)
    const securityDeposit = parseInt(escrow.securityDeposit);
    const monthlyRent = parseInt(escrow.monthlyRent);
    const totalAmount = securityDeposit + monthlyRent;

    await depositToAave(
      { signAndSubmitTransaction },
      parseInt(escrowId),
      totalAmount,
      USDC_ADDRESS
    );
    
    // After successful deposit to Aave, verify it in the contract
    await verifyAaveDeposit(
      { signAndSubmitTransaction },
      parseInt(escrowId),
      securityDeposit
    );

    toast({
      title: "Success",
      description: "Funds deposited successfully!",
    });

    await loadUserEscrows();
  } catch (error) {
    console.error("Error depositing funds:", error);
    toast({
      title: "Error",
      description: "Failed to deposit funds",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  const handleSettleEscrow = async (escrowId: string) => {
    if (!signAndSubmitTransaction) return;

    setIsLoading(true);
    try {
      await settleEscrow(
        { signAndSubmitTransaction },
        parseInt(escrowId)
      );

      toast({
        title: "Success",
        description: "Escrow settled successfully!",
      });

      await loadUserEscrows();
    } catch (error) {
      console.error('Error settling escrow:', error);
      toast({
        title: "Error",
        description: "Failed to settle escrow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getUserRole = (escrow: EscrowAgreement): 'landlord' | 'tenant' | null => {
    if (!account?.address) return null;
    if (escrow.landlord === account.address.toString()) return 'landlord';
    if (escrow.tenant === account.address.toString()) return 'tenant';
    return null;
  };

  const getEscrowStatus = (escrow: EscrowAgreement): string => {
    if (escrow.settled) return 'Settled';
    if (!escrow.landlordSigned || !escrow.tenantSigned) return 'Pending Signatures';
    if (parseInt(escrow.depositedAmount) === 0) return 'Pending Deposit';
    if (isEscrowTermEnded(escrow.endDate)) return 'Ready to Settle';
    return 'Active';
  };

  const getAvailableActions = (escrow: EscrowAgreement, userRole: 'landlord' | 'tenant' | null) => {
    const actions: Array<{ label: string; action: () => void; variant: string }> = [];
    
    if (!userRole || escrow.settled) return actions;

    // Signing actions
    if (userRole === 'landlord' && !escrow.landlordSigned) {
      actions.push({ label: 'Sign Agreement', action: () => handleSignEscrow(escrow.id), variant: 'default' });
    }
    if (userRole === 'tenant' && !escrow.tenantSigned) {
      actions.push({ label: 'Sign Agreement', action: () => handleSignEscrow(escrow.id), variant: 'default' });
    }

    // Deposit action (only for tenant)
    if (userRole === 'tenant' && escrow.landlordSigned && escrow.tenantSigned && parseInt(escrow.depositedAmount) === 0) {
      actions.push({ label: 'Deposit to Aave', action: () => handleDepositToAave(escrow.id), variant: 'default' });
    }

    // Settle action (available to both after term ends)
    if (parseInt(escrow.depositedAmount) > 0 && isEscrowTermEnded(escrow.endDate)) {
      actions.push({ label: 'Settle Escrow', action: () => handleSettleEscrow(escrow.id), variant: 'destructive' });
    }

    return actions;
  };

  if (!account?.address) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Rent Escrow Dashboard</h2>
        <p>Please connect your wallet to view and manage escrows.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Rent Escrow Dashboard (Aave-Integrated)</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={handleInitializeContract}
            disabled={isLoading}
          >
            {isLoading ? 'Initializing...' : 'Initialize Contract'}
          </Button>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            {showCreateForm ? 'Cancel' : 'Create New Escrow'}
          </Button>
        </div>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Create New Escrow Agreement</h3>
          <form onSubmit={handleCreateEscrow} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="tenant">Tenant Address</Label>
                <Input
                  id="tenant"
                  value={formData.tenant}
                  onChange={(e) => setFormData({ ...formData, tenant: e.target.value })}
                  placeholder="0x..."
                  required
                />
              </div>
              <div>
                <Label htmlFor="propertyName">Property Name</Label>
                <Input
                  id="propertyName"
                  value={formData.propertyName}
                  onChange={(e) => setFormData({ ...formData, propertyName: e.target.value })}
                  placeholder="e.g., Downtown Apartment"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="propertyAddress">Property Address</Label>
                <Input
                  id="propertyAddress"
                  value={formData.propertyAddress}
                  onChange={(e) => setFormData({ ...formData, propertyAddress: e.target.value })}
                  placeholder="123 Main St, City, State"
                  required
                />
              </div>
              <div>
                <Label htmlFor="securityDeposit">Security Deposit (USDC)</Label>
                <Input
                  id="securityDeposit"
                  type="number"
                  step="0.01"
                  value={formData.securityDeposit}
                  onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                  placeholder="1000.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="monthlyRent">Monthly Rent (USDC)</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  step="0.01"
                  value={formData.monthlyRent}
                  onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                  placeholder="2000.00"
                  required
                />
              </div>
              <div>
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create Escrow'}
            </Button>
          </form>
        </Card>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Escrows</h3>
        {isLoading ? (
          <div className="text-center py-8">Loading escrows...</div>
        ) : userEscrows.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No escrows found</div>
        ) : (
          userEscrows.map((escrow) => {
            const userRole = getUserRole(escrow);
            const status = getEscrowStatus(escrow);
            const actions = getAvailableActions(escrow, userRole);
            
            return (
              <Card key={escrow.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-semibold">{escrow.propertyName}</h4>
                    <p className="text-gray-600">{escrow.propertyAddress}</p>
                    <p className="text-sm text-gray-500">Role: {userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Unknown'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">Status: {status}</p>
                    <p className="text-sm text-gray-500">ID: {escrow.id}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">Security Deposit</p>
                    <p className="text-lg">${formatUsdcAmount(escrow.securityDeposit)} USDC</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Monthly Rent</p>
                    <p className="text-lg">${formatUsdcAmount(escrow.monthlyRent)} USDC</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p>{formatDate(escrow.startDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p>{formatDate(escrow.endDate)}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                  <div>
                    <p className="font-medium">Landlord Signed</p>
                    <p className={escrow.landlordSigned ? 'text-green-600' : 'text-red-600'}>
                      {escrow.landlordSigned ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Tenant Signed</p>
                    <p className={escrow.tenantSigned ? 'text-green-600' : 'text-red-600'}>
                      {escrow.tenantSigned ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Funds Deposited</p>
                    <p className={parseInt(escrow.depositedAmount) > 0 ? 'text-green-600' : 'text-red-600'}>
                      {parseInt(escrow.depositedAmount) > 0 ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium">Settled</p>
                    <p className={escrow.settled ? 'text-green-600' : 'text-red-600'}>
                      {escrow.settled ? '✓ Yes' : '✗ No'}
                    </p>
                  </div>
                </div>

                {/* Aave Integration Info */}
                {parseInt(escrow.aaveSuppliedAmount) > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-sm mb-2 text-blue-600">🏦 Aave Yield Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="font-medium">Supplied to Aave</p>
                        <p className="text-green-600">${formatUsdcAmount(escrow.aaveSuppliedAmount)} USDC</p>
                      </div>
                      <div>
                        <p className="font-medium">Supply Date</p>
                        <p>{formatDate(escrow.aaveSupplyTimestamp)}</p>
                      </div>
                      <div>
                        <p className="font-medium">Earning Yield</p>
                        <p className="text-green-600">✓ Active</p>
                      </div>
                    </div>
                  </div>
                )}

                {actions.length > 0 && (
                  <div className="flex gap-2">
                    {actions.map((action, index) => (
                      <Button
                        key={index}
                        onClick={action.action}
                        variant={action.variant as any}
                        disabled={isLoading}
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};

export default EscrowDashboard;