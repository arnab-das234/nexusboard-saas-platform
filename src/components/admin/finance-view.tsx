'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  IndianRupee, TrendingUp, CheckCircle, Clock, XCircle, RotateCcw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import type { PaymentStatus } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface Transaction {
  id: string; paymentId: string; orderId: string; studentName: string;
  amount: number; status: PaymentStatus; date: string; competition: string;
}

interface CompRevenue { competition: string; total: number; success: number; pending: number; refunded: number; }

interface FinanceSummary {
  totalRevenue: number; successful: number; pending: number; failed: number; refunded: number;
}

const MOCK_SUMMARY: FinanceSummary = {
  totalRevenue: 71400, successful: 71400, pending: 5800, failed: 2300, refunded: 1200,
};

const MOCK_MONTHLY = [
  { month: 'Jan', revenue: 5800 },
  { month: 'Feb', revenue: 7600 },
  { month: 'Mar', revenue: 12800 },
  { month: 'Apr', revenue: 17500 },
  { month: 'May', revenue: 14100 },
  { month: 'Jun', revenue: 23600 },
];

const MOCK_TRANSACTIONS: Transaction[] = Array.from({ length: 35 }, (_, i) => ({
  id: `TXN-${String(i + 1).padStart(4, '0')}`,
  paymentId: `pay_${Date.now().toString(36)}${i}`,
  orderId: `order_${(1000 + i).toString(36)}`,
  studentName: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer'][i % 5],
  amount: [100, 50, 75, 100, 50][i % 5],
  status: (['SUCCESS', 'PENDING', 'FAILED', 'REFUNDED', 'SUCCESS', 'SUCCESS'] as PaymentStatus[])[i % 6],
  date: `2025-${String((i % 6) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  competition: ['National Essay 2025', 'State Level Essay', 'Inter-School Essay'][i % 3],
}));

const MOCK_COMP_REVENUE: CompRevenue[] = [
  { competition: 'National Essay 2025', total: 48700, success: 42300, pending: 3200, refunded: 3200 },
  { competition: 'State Level Essay', total: 11700, success: 11700, pending: 0, refunded: 0 },
  { competition: 'Inter-School Essay', total: 23400, success: 23400, pending: 2600, refunded: 0 },
  { competition: 'Creative Writing 2024', total: 56700, success: 53200, pending: 0, refunded: 3500 },
];

function fmt(n: number) {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function TableSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }).map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-14 rounded" /></CardContent></Card>))}</div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminFinanceView() {
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [monthly, setMonthly] = useState(MOCK_MONTHLY);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [compRevenue, setCompRevenue] = useState<CompRevenue[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-finance');
      const json = await res.json();
      if (json.success && json.data) {
        setSummary(json.data.summary ?? MOCK_SUMMARY);
        setMonthly(json.data.monthly ?? MOCK_MONTHLY);
        setTransactions(json.data.transactions ?? MOCK_TRANSACTIONS);
        setCompRevenue(json.data.compRevenue ?? MOCK_COMP_REVENUE);
        return;
      }
    } catch {} finally { setLoading(false); }
    setSummary(MOCK_SUMMARY); setTransactions(MOCK_TRANSACTIONS); setCompRevenue(MOCK_COMP_REVENUE);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = transactions.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (compFilter !== 'ALL' && t.competition !== compFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [statusFilter, compFilter]);

  if (loading) return <TableSkeleton />;

  const s = summary ?? MOCK_SUMMARY;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Finance</h1>
        <p className="text-sm text-slate-500">Payment tracking and revenue analytics</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Total Revenue</p><p className="text-lg font-bold text-slate-800">{fmt(s.totalRevenue)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Successful</p><p className="text-lg font-bold text-emerald-700">{fmt(s.successful)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><Clock className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Pending</p><p className="text-lg font-bold text-amber-700">{fmt(s.pending)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-rose-500 flex items-center justify-center"><XCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Failed</p><p className="text-lg font-bold text-rose-700">{fmt(s.failed)}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-400 flex items-center justify-center"><RotateCcw className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Refunded</p><p className="text-lg font-bold text-slate-600">{fmt(s.refunded)}</p></div>
        </CardContent></Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-600" />Monthly Revenue</CardTitle></CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
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

      {/* Transactions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={compFilter} onValueChange={setCompFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Competitions</SelectItem>
                <SelectItem value="National Essay 2025">National Essay 2025</SelectItem>
                <SelectItem value="State Level Essay">State Level Essay</SelectItem>
                <SelectItem value="Inter-School Essay">Inter-School Essay</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs text-slate-600">{t.paymentId.slice(0, 16)}...</TableCell>
                    <TableCell className="font-mono text-xs text-slate-500">{t.orderId}</TableCell>
                    <TableCell className="font-medium text-slate-800">{t.studentName}</TableCell>
                    <TableCell className="font-medium">₹{t.amount}</TableCell>
                    <TableCell><Badge variant="secondary" className={PAYMENT_STATUS_COLORS[t.status]}>{PAYMENT_STATUS_LABELS[t.status]}</Badge></TableCell>
                    <TableCell className="text-right text-slate-500">{t.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
              <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Competition-wise Revenue */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800">Competition-wise Revenue</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Competition</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Successful</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Refunded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compRevenue.map((c) => (
                <TableRow key={c.competition}>
                  <TableCell className="font-medium text-slate-800">{c.competition}</TableCell>
                  <TableCell className="text-right font-semibold">₹{c.total.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-emerald-600">₹{c.success.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-amber-600">₹{c.pending.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-slate-500">₹{c.refunded.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
