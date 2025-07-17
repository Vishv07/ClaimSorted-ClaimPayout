import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Calculator, CheckCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from "react-router-dom";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { useEffect } from 'react';

interface ClaimItem {
  id: string;
  category: 'Medical' | 'Electronics' | 'Baggage' | '';
  amount: number;
}

interface CategoryLimits {
  Medical: number;
  Electronics: number;
  Baggage: number;
}

const CATEGORY_LIMITS: CategoryLimits = {
  Medical: 750,
  Electronics: 500,
  Baggage: 400,
};

const POLICY_LIMIT = 1000;
const EXCESS = 100;
const CO_PAY_PERCENTAGE = 20;

export function ClaimCalculator() {
  const { toast } = useToast();
  const [claimItems, setClaimItems] = useState<ClaimItem[]>([
    { id: '1', category: '', amount: 0 }
  ]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [claimsHistory, setClaimsHistory] = useState<any[]>([]);

  const addClaimItem = () => {
    const newItem: ClaimItem = {
      id: Date.now().toString(),
      category: '',
      amount: 0,
    };
    setClaimItems([...claimItems, newItem]);
  };

  const removeClaimItem = (id: string) => {
    if (claimItems.length > 1) {
      setClaimItems(claimItems.filter(item => item.id !== id));
    }
  };

  const updateClaimItem = (id: string, field: keyof ClaimItem, value: any) => {
    setClaimItems(claimItems.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const calculation = useMemo(() => {
    // Group claims by category and sum amounts
    const categoryTotals: { [key: string]: number } = {};
    
    claimItems
      .filter(item => item.category && item.amount > 0)
      .forEach(item => {
        categoryTotals[item.category] = (categoryTotals[item.category] || 0) + item.amount;
      });

    // Apply category limits
    const adjustedAmounts: { [key: string]: { original: number; adjusted: number; limit: number } } = {};
    let subtotal = 0;

    Object.entries(categoryTotals).forEach(([category, amount]) => {
      const limit = CATEGORY_LIMITS[category as keyof CategoryLimits];
      const adjustedAmount = Math.min(amount, limit);
      adjustedAmounts[category] = {
        original: amount,
        adjusted: adjustedAmount,
        limit,
      };
      subtotal += adjustedAmount;
    });

    // Apply excess
    const afterExcess = Math.max(0, subtotal - EXCESS);
    
    // Apply co-pay
    const coPayAmount = afterExcess * (CO_PAY_PERCENTAGE / 100);
    const afterCoPay = afterExcess - coPayAmount;
    
    // Apply policy limit
    const finalPayout = Math.min(afterCoPay, POLICY_LIMIT);

    return {
      categoryTotals,
      adjustedAmounts,
      subtotal,
      excessDeduction: Math.min(subtotal, EXCESS),
      afterExcess,
      coPayAmount,
      afterCoPay,
      finalPayout,
      isValid: claimItems.some(item => item.category && item.amount > 0),
    };
  }, [claimItems]);

  const handleSaveCalculation = async () => {
    if (!calculation.isValid) {
      toast({
        title: "Invalid Calculation",
        description: "Please add at least one valid claim item.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const apiBody = {
        claimItems: claimItems
          .filter(item => item.category && item.amount > 0)
          .map(item => ({
            category: item.category,
            claimedAmount: item.amount,
          })),
        policyLimit: POLICY_LIMIT,
        excess: EXCESS,
        coPayRate: CO_PAY_PERCENTAGE / 100,
      };
      const response = await fetch(
        'https://claimsorted-payout-d2cmbha9h8d8fpdp.eastus-01.azurewebsites.net/api/claim-calc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(apiBody),
          credentials: "omit"
        }
      );
      if (response.ok) {
        toast({
          title: 'Claim processed successfully',
          description: '',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to process claim. Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to process claim. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClaimsHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('https://claimsorted-payout-d2cmbha9h8d8fpdp.eastus-01.azurewebsites.net/api/claim-calc');
      if (res.ok) {
        const data = await res.json();
        setClaimsHistory(data);
      } else {
        setClaimsHistory([]);
      }
    } catch {
      setClaimsHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (drawerOpen) fetchClaimsHistory();
  }, [drawerOpen]);

  return (
    <div className="min-h-screen bg-background p-2 text-sm relative">
      {/* History Button */}
      <Button
        variant="outline"
        size="sm"
        className="absolute top-2 right-2 z-20"
        onClick={() => setDrawerOpen(true)}
      >
        <Clock className="w-4 h-4 mr-1" />
        Claims History
      </Button>
      {/* Drawer for Claims History */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} direction="right">
        <DrawerContent className="max-w-md ml-auto h-full overflow-y-auto overflow-x-hidden w-full">
          <DrawerHeader>
            <DrawerTitle>Previous Claims</DrawerTitle>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm" className="absolute top-2 right-2">Close</Button>
            </DrawerClose>
          </DrawerHeader>
          <div className="p-4 space-y-4 w-full overflow-x-hidden">
            {historyLoading ? (
              <div className="text-center text-muted-foreground">Loading...</div>
            ) : claimsHistory.length === 0 ? (
              <div className="text-center text-muted-foreground">No previous claims found.</div>
            ) : (
              claimsHistory.map((claim) => (
                <div key={claim.Id} className="border rounded-lg p-3 bg-muted/30 w-full overflow-x-hidden">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-primary">Claim #{claim.Id}</span>
                    <span className="text-xs text-muted-foreground">{new Date(claim.CreatedAt).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>Policy Limit: <span className="font-medium">£{claim.PolicyLimit}</span></div>
                    <div>Excess: <span className="font-medium">£{claim.Excess}</span></div>
                    <div>CoPay Rate: <span className="font-medium">{(claim.CoPayRate * 100).toFixed(0)}%</span></div>
                    <div>Subtotal: <span className="font-medium">£{claim.Subtotal}</span></div>
                    <div>Excess Deduction: <span className="font-medium">£{claim.ExcessDeduction}</span></div>
                    <div>After Excess: <span className="font-medium">£{claim.AmountAfterExcess}</span></div>
                    <div>CoPay Deduction: <span className="font-medium">£{claim.CoPayDeduction}</span></div>
                    <div>Final Payout: <span className="font-bold text-green-700">£{claim.FinalPayout}</span></div>
                  </div>
                  <div className="mt-2">
                    <div className="font-semibold mb-1">Items:</div>
                    <ul className="list-disc pl-5 space-y-1">
                      {claim.ClaimItems.map((item: any, idx: number) => (
                        <li key={idx} className="text-xs">
                          <span className="font-medium">{item.Category}</span>: Claimed £{item.ClaimedAmount}, Adjusted £{item.AdjustedAmount} (Limit £{item.InnerLimit})
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))
            )}
          </div>
        </DrawerContent>
      </Drawer>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link to="/">
            <img src="/csblacklogo.jpg" alt="Logo" className="logo" style={{ height: '48px', display: 'inline-block', verticalAlign: 'middle' }} />
          </Link>
          <h1 className="text-3xl font-bold text-foreground m-0">Claim Payout Calculator</h1>
        </div>
        <p className="text-muted-foreground text-center">Calculate your insurance claim payout with itemized breakdown</p>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Claim Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-primary" />
                  Policy Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">Policy Limit</p>
                    <p className="text-xl font-bold text-foreground">£{POLICY_LIMIT.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">Excess</p>
                    <p className="text-xl font-bold text-foreground">£{EXCESS}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">Co-pay Rate</p>
                    <p className="text-xl font-bold text-foreground">{CO_PAY_PERCENTAGE}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Claim Items */}
            <Card>
              <CardHeader>
                <CardTitle>Claim Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {claimItems.map((item, index) => (
                  <div key={item.id} className="p-4 border rounded-lg bg-muted/30">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {claimItems.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeClaimItem(item.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={`category-${item.id}`}>Claim Category</Label>
                        <Select
                          value={item.category}
                          onValueChange={(value) => updateClaimItem(item.id, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Medical">Medical (£{CATEGORY_LIMITS.Medical} limit)</SelectItem>
                            <SelectItem value="Electronics">Electronics (£{CATEGORY_LIMITS.Electronics} limit)</SelectItem>
                            <SelectItem value="Baggage">Baggage (£{CATEGORY_LIMITS.Baggage} limit)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`amount-${item.id}`}>Claim Amount (£)</Label>
                        <Input
                          id={`amount-${item.id}`}
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.amount || ''}
                          onChange={(e) => updateClaimItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  variant="outline"
                  onClick={addClaimItem}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Another Item
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calculation Breakdown */}
          <div className="space-y-6">
            <Card className="border-primary/20 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b p-3">
                <CardTitle className="text-center flex items-center justify-center gap-2 text-lg">
                  <Calculator className="h-5 w-5 text-primary" />
                  Payout Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 p-3">
                {/* Claim Items Summary */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wide">Claim Items</h4>
                  </div>
                  <div className="space-y-1">
                    {Object.entries(calculation.categoryTotals).map(([category, amount]) => (
                      <div key={category} className="flex justify-between items-center p-1 rounded bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary/60"></div>
                          <span className="text-xs font-medium">{category}</span>
                        </div>
                        <span className="font-semibold text-foreground text-sm">£{amount.toFixed(2)}</span>
                      </div>
                    ))}
                    {Object.keys(calculation.categoryTotals).length === 0 && (
                      <div className="text-center py-2">
                        <p className="text-xs text-muted-foreground italic">No valid items added</p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Breakdown */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <h4 className="font-semibold text-xs text-foreground uppercase tracking-wide">Calculation Steps</h4>
                  </div>
                  <div className="space-y-2">
                    {/* Category Adjustments */}
                    {Object.entries(calculation.adjustedAmounts).map(([category, data]) => {
                      if (data.original > data.limit) {
                        return (
                          <div key={category} className="p-2 rounded-lg border border-warning/20 bg-warning/5">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-warning"></div>
                                <span className="text-xs font-medium text-warning">{category} (limit applied)</span>
                              </div>
                              <span className="font-semibold text-warning text-sm">£{data.adjusted.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}

                    <div className="p-2 rounded-lg bg-accent/30 border border-accent/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>
                          <span className="text-xs font-medium">Subtotal (after sub-limits)</span>
                        </div>
                        <span className="font-semibold text-sm">£{calculation.subtotal.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                          <span className="text-xs font-medium text-destructive">Excess Deduction</span>
                        </div>
                        <span className="font-semibold text-destructive text-sm">-£{calculation.excessDeduction.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-muted/30 border border-border/50">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                          <span className="text-xs font-medium">Amount after Excess</span>
                        </div>
                        <span className="font-semibold text-sm">£{calculation.afterExcess.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/20">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 rounded-full bg-destructive"></div>
                          <span className="text-xs font-medium text-destructive">Co-pay Deduction ({CO_PAY_PERCENTAGE}%)</span>
                        </div>
                        <span className="font-semibold text-destructive text-sm">-£{calculation.coPayAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator className="my-2" />

                {/* Final Result */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 left-0 top-0 right-0 bottom-0 m-[2px] bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-xl z-0 pointer-events-none"></div>
                  <div className="relative p-3 min-w-[200px] flex flex-col items-center justify-center z-10">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1 rounded-full bg-primary/10">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <span className="font-bold text-base text-foreground whitespace-nowrap">Final Payout</span>
                    </div>
                    <span className="font-bold text-2xl bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent whitespace-nowrap break-keep text-center">
                      £{calculation.finalPayout.toFixed(2)}
                    </span>
                  </div>
                </div>

                <Button
                  variant="financial"
                  size="lg"
                  onClick={handleSaveCalculation}
                  disabled={!calculation.isValid || loading}
                  className="w-full mt-6 shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {loading ? (
                    <span className="animate-spin mr-2"><CheckCircle className="h-4 w-4" /></span>
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  {loading ? 'Processing...' : 'Save Calculation'}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}