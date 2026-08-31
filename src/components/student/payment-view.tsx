'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, IndianRupee, CheckCircle2, Clock, XCircle, Receipt, Download, PartyPopper, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { REGISTRATION_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import type { RegistrationStatus, PaymentStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface PaymentInfo {
  registrationId: string;
  registrationNumber: string;
  competitionName: string;
  amount: number;
  registrationStatus: RegistrationStatus;
  paymentStatus: PaymentStatus;
  paymentHistory: Array<{
    id: string; transactionId: string; amount: number;
    status: PaymentStatus; date: string; method: string;
  }>;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK: PaymentInfo = {
  registrationId: 'reg-001',
  registrationNumber: 'EC-2025-00158',
  competitionName: 'National Essay Competition 2025',
  amount: 200,
  registrationStatus: 'CONFIRMED',
  paymentStatus: 'SUCCESS',
  paymentHistory: [
    { id: 'tx1', transactionId: 'pay_RzP3xNkLmQwErtY', amount: 200, status: 'SUCCESS', date: '2025-07-05T10:30:00Z', method: 'Razorpay' },
  ],
};

const MOCK_UNPAID: PaymentInfo = {
  registrationId: 'reg-002',
  registrationNumber: 'EC-2025-00234',
  competitionName: 'State-Level Essay Challenge',
  amount: 100,
  registrationStatus: 'PAYMENT_PENDING',
  paymentStatus: 'PENDING',
  paymentHistory: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDateTime(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function regStatusColor(s: RegistrationStatus) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700', PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return map[s] ?? 'bg-slate-100 text-slate-700';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function PaymentSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />
      <Card><CardContent className="p-6"><Skeleton className="h-28 w-full rounded" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentPaymentView() {
  const [payment, setPayment] = useState<PaymentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnpaid, setShowUnpaid] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-payment');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setPayment(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setPayment(MOCK);
      setLoading(false);
    }
    load();
  }, []);

  const isPaid = payment?.paymentStatus === 'SUCCESS';
  const needsPayment = payment?.paymentStatus === 'PENDING' || payment?.paymentStatus === 'CREATED';

  async function handlePay() {
    if (!payment) return;
    toast.info('Redirecting to Razorpay payment gateway...');
    // Simulate payment
    await new Promise(r => setTimeout(r, 1500));
    setPayment({
      ...payment,
      paymentStatus: 'SUCCESS',
      registrationStatus: 'PAID',
      paymentHistory: [{
        id: `tx-${Date.now()}`, transactionId: `pay_${Math.random().toString(36).substring(2, 18)}`,
        amount: payment.amount, status: 'SUCCESS', date: new Date().toISOString(), method: 'Razorpay',
      }],
    });
    toast.success('Payment successful!');
  }

  function copyRegNumber() {
    if (payment) {
      navigator.clipboard.writeText(payment.registrationNumber);
      toast.success('Registration number copied!');
    }
  }

  if (loading) return <PaymentSkeleton />;
  if (!payment) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Payment</h1>
        <p className="text-sm text-slate-500">View payment status and transaction history</p>
      </motion.div>

      {/* Status Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${isPaid ? 'bg-emerald-100' : needsPayment ? 'bg-amber-100' : 'bg-slate-100'}`}>
                  {isPaid ? <CheckCircle2 className="h-7 w-7 text-emerald-600" /> :
                   needsPayment ? <CreditCard className="h-7 w-7 text-amber-600" /> :
                   <Clock className="h-7 w-7 text-slate-400" />}
                </div>
                <div>
                  <p className="text-lg font-semibold text-slate-800">{payment.competitionName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500">Reg: {payment.registrationNumber}</span>
                    <button onClick={copyRegNumber} className="text-slate-400 hover:text-emerald-600 transition-colors">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-2xl font-bold text-slate-800">₹{payment.amount}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="outline" className={regStatusColor(payment.registrationStatus)}>
                      {REGISTRATION_STATUS_LABELS[payment.registrationStatus]}
                    </Badge>
                    <Badge variant="outline" className={PAYMENT_STATUS_COLORS[payment.paymentStatus]}>
                      {PAYMENT_STATUS_LABELS[payment.paymentStatus]}
                    </Badge>
                  </div>
                </div>
                {needsPayment && (
                  <Button onClick={handlePay} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shrink-0">
                    <IndianRupee className="h-4 w-4" /> Pay Now
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Thank You / Confirmation */}
      {isPaid && payment.paymentHistory.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <PartyPopper className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="font-semibold text-emerald-800">Payment Successful!</p>
                  <p className="text-sm text-emerald-600">Your registration is confirmed.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Registration No.</p>
                  <p className="font-semibold text-emerald-900">{payment.registrationNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Competition</p>
                  <p className="font-semibold text-emerald-900">{payment.competitionName}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Amount Paid</p>
                  <p className="font-semibold text-emerald-900">₹{payment.amount}</p>
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-medium">Date</p>
                  <p className="font-semibold text-emerald-900">{fmtDate(payment.paymentHistory[0].date)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Payment History */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Transaction History</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {payment.paymentHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Receipt className="h-10 w-10 text-slate-300 mb-2" />
                <p className="text-sm text-slate-500">No transactions yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.paymentHistory.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-mono text-xs">{tx.transactionId}</TableCell>
                      <TableCell className="font-semibold">₹{tx.amount}</TableCell>
                      <TableCell>{tx.method}</TableCell>
                      <TableCell><Badge variant="outline" className={PAYMENT_STATUS_COLORS[tx.status]}>{PAYMENT_STATUS_LABELS[tx.status]}</Badge></TableCell>
                      <TableCell className="text-slate-500">{fmtDateTime(tx.date)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Toggle to show unpaid example (dev) */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-xs text-slate-400" onClick={() => setShowUnpaid(!showUnpaid)}>
          {showUnpaid ? 'Show Paid Example' : 'Show Unpaid Example'}
        </Button>
      </div>
    </div>
  );
}
