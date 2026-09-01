'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { IndianRupee, CheckCircle, Clock, XCircle, RotateCcw, Download, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import type { PaymentStatus, PaginatedResponse } from '@/lib/types';
import { toast } from 'sonner';

interface PaymentItem {
  id: string;
  razorpayOrderId: string;
  razorpayPaymentId: string | null;
  amount: number;
  status: PaymentStatus;
  currency: string;
  createdAt: string;
  registration: {
    registrationNo: string;
    student: { user: { name: string | null; email: string } };
    competition: { id: string; name: string };
  };
}

interface CompOption { id: string; name: string; }

const PAGE_SIZE = 10;

function fmt(n: number) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 rounded" /></CardContent></Card>)}</div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load finance data</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminFinanceView() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [competitions, setCompetitions] = useState<CompOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (compFilter !== 'ALL') params.set('competitionId', compFilter);
      const res = await fetch(`/api/payments?${params}`);
      const json: PaginatedResponse<PaymentItem> = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setPayments(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setLoading(false); }
  }, [page, statusFilter, compFilter]);

  const fetchCompetitions = useCallback(async () => {
    try {
      const res = await fetch('/api/competitions');
      const json = await res.json();
      if (json.success) setCompetitions((json.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);
  useEffect(() => { setPage(1); }, [statusFilter, compFilter]);
  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = search
    ? payments.filter(p => p.razorpayOrderId.toLowerCase().includes(search.toLowerCase()) || p.registration.registrationNo.toLowerCase().includes(search.toLowerCase()))
    : payments;

  // Summary computed from all payments (use current page — for full summary would need separate endpoint)
  const allStatuses = Object.values(payments.reduce((acc, p) => { acc[p.status] = (acc[p.status] || 0) + p.amount; return acc; }, {} as Record<string, number>));
  const totalRevenue = payments.reduce((s, p) => s + p.amount, 0);
  const successAmt = payments.filter(p => p.status === 'SUCCESS').reduce((s, p) => s + p.amount, 0);
  const pendingAmt = payments.filter(p => p.status === 'PENDING' || p.status === 'CREATED').reduce((s, p) => s + p.amount, 0);
  const failedAmt = payments.filter(p => p.status === 'FAILED').reduce((s, p) => s + p.amount, 0);
  const refundedAmt = payments.filter(p => p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED').reduce((s, p) => s + p.amount, 0);

  // Monthly revenue for chart
  const monthlyMap: Record<string, number> = {};
  payments.filter(p => p.status === 'SUCCESS').forEach(p => {
    const d = new Date(p.createdAt);
    const key = d.toLocaleString('default', { month: 'short' });
    monthlyMap[key] = (monthlyMap[key] || 0) + p.amount;
  });
  const monthly = Object.entries(monthlyMap).map(([month, revenue]) => ({ month, revenue }));

  const exportCSV = () => {
    const header = 'Payment ID,Order ID,Student,Competition,Amount,Status,Date\n';
    const rows = filtered.map(p => `${p.id},${p.razorpayOrderId},${p.registration.student.user.name || ''},${p.registration.competition.name},₹${p.amount},${PAYMENT_STATUS_LABELS[p.status]},${p.createdAt}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'payments.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchPayments} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Finance</h1>
          <p className="text-sm text-slate-500">Payment tracking and revenue analytics</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Total Revenue</p><p className="text-lg font-bold text-slate-800">{fmt(totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Successful</p><p className="text-lg font-bold text-emerald-700">{fmt(successAmt)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><Clock className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Pending</p><p className="text-lg font-bold text-amber-700">{fmt(pendingAmt)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Failed</p><p className="text-lg font-bold text-rose-700">{fmt(failedAmt)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-400 flex items-center justify-center"><RotateCcw className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Refunded</p><p className="text-lg font-bold text-slate-600">{fmt(refundedAmt)}</p></div>
        </CardContent></Card>
      </div>

      {monthly.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800">Monthly Revenue</CardTitle></CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={monthly} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `₹${v / 1000}K`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} formatter={(v: number) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800">Transactions ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search order ID or reg no..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={compFilter} onValueChange={setCompFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Competitions</SelectItem>
                {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <IndianRupee className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium">No payments found</p>
            </div>
          ) : (
            <div className="rounded-lg border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
                  <TableHead>Payment ID</TableHead><TableHead>Order ID</TableHead><TableHead>Student</TableHead>
                  <TableHead>Competition</TableHead><TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead><TableHead className="text-right">Date</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs text-slate-600 max-w-[120px] truncate" title={p.id}>{p.id.slice(0, 12)}...</TableCell>
                      <TableCell className="font-mono text-xs text-slate-500 max-w-[120px] truncate" title={p.razorpayOrderId}>{p.razorpayOrderId.slice(0, 20)}</TableCell>
                      <TableCell className="font-medium text-slate-800">{p.registration.student.user.name || '—'}</TableCell>
                      <TableCell className="text-slate-600">{p.registration.competition.name}</TableCell>
                      <TableCell className="text-right font-medium">₹{p.amount}</TableCell>
                      <TableCell><Badge variant="secondary" className={PAYMENT_STATUS_COLORS[p.status]}>{PAYMENT_STATUS_LABELS[p.status]}</Badge></TableCell>
                      <TableCell className="text-right text-slate-500 text-xs">{new Date(p.createdAt).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>‹</Button>
              <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>›</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
