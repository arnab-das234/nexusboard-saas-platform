'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, FileText, Download, ChevronLeft, ChevronRight,
} from 'lucide-react';
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
import { REGISTRATION_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import type { RegistrationStatus, PaymentStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Registration {
  id: string; regNo: string; studentName: string; studentEmail: string;
  competitionName: string; categoryName: string;
  status: RegistrationStatus; paymentStatus: PaymentStatus;
  amount: number; date: string;
}

const PAGE_SIZE = 10;

const MOCK: Registration[] = Array.from({ length: 56 }, (_, i) => ({
  id: `REG-${String(i + 1).padStart(4, '0')}`,
  regNo: `REG-2025-${String(i + 1).padStart(4, '0')}`,
  studentName: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer',
    'Meera Joshi', 'Arjun Reddy', 'Sneha Kulkarni', 'Vikram Singh', 'Diya Menon'][i % 10],
  studentEmail: `student${i + 1}@school.com`,
  competitionName: ['National Essay 2025', 'State Level Essay', 'Inter-School Essay'][i % 3],
  categoryName: ['Junior (10-13)', 'Senior (14-17)', 'Open (18+)'][i % 3],
  status: (['PENDING', 'VERIFIED', 'PAYMENT_PENDING', 'PAID', 'CONFIRMED', 'CANCELLED'] as RegistrationStatus[])[i % 6],
  paymentStatus: (['CREATED', 'PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'] as PaymentStatus[])[i % 5],
  amount: [100, 50, 75][i % 3],
  date: `2025-07-${String((i % 28) + 1).padStart(2, '0')}`,
}));

function regStatusColor(s: RegistrationStatus) {
  const m: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700', PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[450px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminRegistrationsView() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [payFilter, setPayFilter] = useState('ALL');
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-registrations');
      const json = await res.json();
      if (json.success && json.data) { setRegistrations(json.data); return; }
    } catch {} finally { setLoading(false); }
    setRegistrations(MOCK);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = registrations.filter((r) => {
    if (search && !r.regNo.toLowerCase().includes(search.toLowerCase()) && !r.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (compFilter !== 'ALL' && r.competitionName !== compFilter) return false;
    if (payFilter !== 'ALL' && r.paymentStatus !== payFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, compFilter, payFilter]);

  const exportCSV = () => {
    const header = 'Reg No,Student,Competition,Category,Status,Payment Status,Amount,Date\n';
    const rows = filtered.map((r) => `${r.regNo},${r.studentName},${r.competitionName},${r.categoryName},${REGISTRATION_STATUS_LABELS[r.status]},${PAYMENT_STATUS_LABELS[r.paymentStatus]},${r.amount},${r.date}`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'registrations.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registrations</h1>
          <p className="text-sm text-slate-500">Manage competition registrations</p>
        </div>
        <Button variant="outline" onClick={exportCSV}>
          <Download className="h-4 w-4 mr-1.5" /> Export CSV
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search reg no or student name..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Reg Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(REGISTRATION_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
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
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Payments</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No registrations found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Reg No</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs font-medium text-slate-700">{r.regNo}</TableCell>
                  <TableCell className="font-medium text-slate-800">{r.studentName}</TableCell>
                  <TableCell className="text-slate-600">{r.competitionName}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{r.categoryName}</TableCell>
                  <TableCell><Badge variant="secondary" className={regStatusColor(r.status)}>{REGISTRATION_STATUS_LABELS[r.status]}</Badge></TableCell>
                  <TableCell><Badge variant="secondary" className={PAYMENT_STATUS_COLORS[r.paymentStatus]}>{PAYMENT_STATUS_LABELS[r.paymentStatus]}</Badge></TableCell>
                  <TableCell className="text-right text-slate-500">{r.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) p = page - 2 + i;
            if (p > totalPages) p = totalPages - (4 - i);
            if (p < 1) p = i + 1;
            return <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>;
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </div>
  );
}
