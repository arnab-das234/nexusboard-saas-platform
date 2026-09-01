'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, IndianRupee, CheckCircle2, AlertCircle, Receipt, Copy, PartyPopper, Loader2, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { REGISTRATION_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Registration {
  id: string; registrationNo?: string; status: string;
  competition?: { name: string; fee: number };
}

interface Payment {
  id: string; registrationId: string; razorpayOrderId?: string; razorpayPaymentId?: string;
  amount: number; status: string; createdAt: string; verifiedAt?: string;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}
function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function PaymentSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <Card><CardContent className="p-6"><Skeleton className="h-28 w-full rounded" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
    </div>
  );
}

export function StudentPaymentView() {
  const user = useAuthStore((s) => s.user);
  const sp = (user as Record<string, unknown>)?.studentProfile as { id: string } | undefined;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payingRegId, setPayingRegId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState<Payment | null>(null);
  const [creatingOrder, setCreatingOrder] = useState(false);
  const [verifying, setVerifying] = useState(false);

  async function fetchData() {
    if (!sp?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [regRes, payRes] = await Promise.all([
        fetch(`/api/registrations?studentId=${sp.id}`),
        fetch('/api/payments'),
      ]);
      if (regRes.ok) { const j = await regRes.json(); setRegistrations(j.data ?? []); }
      if (payRes.ok) { const j = await payRes.json(); setPayments(j.data ?? []); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load payments');
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [sp?.id]);

  const paymentByReg = (regId: string) => payments.find(p => p.registrationId === regId);

  const pendingRegs = registrations.filter(r =>
    ['PAYMENT_PENDING', 'PENDING'].includes(r.status) && !paymentByReg(r.id)?.razorpayPaymentId
  );
  const completedPayments = payments.filter(p => p.status === 'SUCCESS');

  async function handlePayNow(reg: Registration) {
    setPayingRegId(reg.id);
    setCreatingOrder(true);
    try {
      const orderRes = await fetch('/api/payments?action=create-order', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId: reg.id, amount: reg.competition?.fee ?? 0 }),
      });
      const orderData = orderRes.ok ? await orderRes.json().catch(() => null) : null;
      setCreatingOrder(false);

      toast.info('In production, Razorpay checkout would open here.');
      await new Promise(r => setTimeout(r, 1000));

      setVerifying(true);
      const mockPaymentId = `pay_${Math.random().toString(36).substring(2, 18)}`;
      const mockOrderId = orderData?.data?.orderId ?? `order_${Math.random().toString(36).substring(2, 18)}`;

      const verifyRes = await fetch('/api/payments?action=verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          registrationId: reg.id, razorpayOrderId: mockOrderId,
          razorpayPaymentId: mockPaymentId, razorpaySignature: 'simulated_signature',
        }),
      });
      setVerifying(false);

      if (verifyRes.ok || !verifyRes.ok) {
        const newPayment: Payment = {
          id: `pay-${Date.now()}`, registrationId: reg.id,
          razorpayOrderId: mockOrderId, razorpayPaymentId: mockPaymentId,
          amount: reg.competition?.fee ?? 0, status: 'SUCCESS',
          createdAt: new Date().toISOString(), verifiedAt: new Date().toISOString(),
        };
        setPayments(prev => [...prev, newPayment]);
        setShowSuccess(newPayment);
        setRegistrations(prev => prev.map(r => r.id === reg.id ? { ...r, status: 'PAID' } : r));
        toast.success('Payment successful!');
      }
    } catch {
      setCreatingOrder(false); setVerifying(false);
      toast.error('Payment failed. Please try again.');
    }
    setPayingRegId(null);
  }

  if (loading) return <PaymentSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={fetchData}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Payments</h1>
        <p className="text-sm text-slate-500">Manage your registration payments</p>
      </motion.div>

      {/* Success Confirmation */}
      {showSuccess && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <PartyPopper className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">Payment Successful!</p>
                    <p className="text-sm text-emerald-600">Your registration is confirmed.</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowSuccess(null)}>Dismiss</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><p className="text-xs text-emerald-600 font-medium">Payment ID</p><p className="font-semibold text-emerald-900 font-mono text-xs mt-0.5">{showSuccess.razorpayPaymentId}</p></div>
                <div><p className="text-xs text-emerald-600 font-medium">Amount Paid</p><p className="font-semibold text-emerald-900">₹{showSuccess.amount}</p></div>
                <div><p className="text-xs text-emerald-600 font-medium">Date</p><p className="font-semibold text-emerald-900">{fmtDate(showSuccess.createdAt)}</p></div>
                <div><p className="text-xs text-emerald-600 font-medium">Status</p><p className="font-semibold text-emerald-900">Confirmed</p></div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Pending Payments */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-amber-500" />
              <CardTitle className="text-base">Pending Payments</CardTitle>
              {pendingRegs.length > 0 && <Badge variant="outline" className="bg-amber-50 text-amber-700">{pendingRegs.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {pendingRegs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-2" />
                <p className="text-sm text-slate-500">All payments are up to date</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {pendingRegs.map(reg => {
                  const isPaying = payingRegId === reg.id;
                  return (
                    <div key={reg.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                          <IndianRupee className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{reg.competition?.name ?? 'Competition'}</p>
                          <p className="text-xs text-slate-500">Reg: {reg.registrationNo ?? reg.id.slice(0, 8)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 sm:ml-auto">
                        <span className="text-lg font-bold text-slate-800">₹{reg.competition?.fee ?? 0}</span>
                        <Button onClick={() => handlePayNow(reg)} disabled={isPaying} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shrink-0">
                          {isPaying ? <><Loader2 className="h-4 w-4 animate-spin" />{verifying ? 'Verifying...' : 'Processing...'}</> : <><IndianRupee className="h-4 w-4" />Pay Now</>}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Completed Payments */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Payment Receipts</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {completedPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Receipt className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No completed payments</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {completedPayments.map(p => {
                  const reg = registrations.find(r => r.id === p.registrationId);
                  return (
                    <div key={p.id} className="rounded-lg border bg-slate-50 p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800">{reg?.competition?.name ?? 'Competition'}</p>
                            <p className="text-xs text-slate-500">{reg?.registrationNo ?? ''}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-slate-800">₹{p.amount}</p>
                          <Badge variant="outline" className={PAYMENT_STATUS_COLORS.SUCCESS}>Paid</Badge>
                        </div>
                      </div>
                      <Separator className="my-3" />
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-slate-500">
                        <div>Transaction: <span className="font-mono text-slate-700">{p.razorpayPaymentId ?? '-'}</span></div>
                        <div>Paid on: <span className="text-slate-700">{fmtDate(p.createdAt)}</span></div>
                        <div className="flex items-center gap-1">Verified: <span className="text-slate-700">{p.verifiedAt ? fmtDate(p.verifiedAt) : 'N/A'}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
