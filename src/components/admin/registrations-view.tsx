'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Search, FileText, Download, ChevronLeft, ChevronRight, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { REGISTRATION_STATUS_LABELS, PAYMENT_STATUS_LABELS, PAYMENT_STATUS_COLORS } from '@/lib/constants';
import type { RegistrationStatus, PaymentStatus } from '@/lib/types';
import type { PaginatedResponse } from '@/lib/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';

interface RegItem {
  id: string;
  registrationNo: string;
  student: { user: { name: string | null; email: string } };
  competition: { id: string; name: string };
  category: { id: string; name: string } | null;
  status: RegistrationStatus;
  payments: { id: string; amount: number; status: PaymentStatus; createdAt: string }[];
  essays: { id: string; status: string; submittedAt: string | null }[];
  registeredAt: string;
  cancelReason: string | null;
}

interface CompOption { id: string; name: string; }

const PAGE_SIZE = 10;

function regStatusColor(s: RegistrationStatus) {
  const m: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700', PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[460px] w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load registrations</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminRegistrationsView() {
  const user = useAuthStore(s => s.user);
  const [registrations, setRegistrations] = useState<RegItem[]>([]);
  const [competitions, setCompetitions] = useState<CompOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<RegItem | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (compFilter !== 'ALL') params.set('competitionId', compFilter);
      const res = await fetch(`/api/registrations?${params}`);
      const json: PaginatedResponse<RegItem> = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setRegistrations(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally { setLoading(false); }
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
  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);

  const filteredBySearch = search
    ? registrations.filter(r =>
        r.registrationNo.toLowerCase().includes(search.toLowerCase()) ||
        r.student.user.name?.toLowerCase().includes(search.toLowerCase()) ||
        r.student.user.email.toLowerCase().includes(search.toLowerCase())
      )
    : registrations;

  const handleOpenCancel = (reg: RegItem) => {
    if (reg.payments.some(p => p.status === 'SUCCESS')) {
      toast.error('Cannot cancel: has successful payment. Contact support for refund.');
      return;
    }
    setCancelTarget(reg);
    setCancelReason('');
    setCancelOpen(true);
  };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/registrations?action=cancel', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: cancelTarget.id, reason: cancelReason || 'Cancelled by admin' }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to cancel'); return; }
      toast.success(`Registration ${cancelTarget.registrationNo} cancelled`);
      setCancelOpen(false);
      fetchRegistrations();
    } catch { toast.error('Network error'); }
    finally { setCancelling(false); }
  };

  const exportCSV = () => {
    const header = 'Reg No,Student Name,Email,Competition,Category,Status,Payment Status,Essay Status,Date\n';
    const rows = filteredBySearch.map(r => {
      const pay = r.payments[0];
      const ess = r.essays[0];
      return `${r.registrationNo},${r.student.user.name || ''},${r.student.user.email},${r.competition.name},${r.category?.name || 'N/A'},${REGISTRATION_STATUS_LABELS[r.status]},${pay ? PAYMENT_STATUS_LABELS[pay.status] : 'N/A'},${ess ? ess.status : 'N/A'},${r.registeredAt}`;
    }).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'registrations.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchRegistrations} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Registrations</h1>
          <p className="text-sm text-slate-500">Manage competition registrations · {total} total</p>
        </div>
        <Button variant="outline" onClick={exportCSV}><Download className="h-4 w-4 mr-1.5" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search reg no, name, email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(REGISTRATION_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
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

      {filteredBySearch.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No registrations found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
              <TableHead>Reg No</TableHead><TableHead>Student Name</TableHead><TableHead>Email</TableHead>
              <TableHead>Competition</TableHead><TableHead>Category</TableHead><TableHead>Status</TableHead>
              <TableHead>Payment</TableHead><TableHead>Essay</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filteredBySearch.map(r => {
                const pay = r.payments[0];
                const ess = r.essays[0];
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs font-medium text-slate-700">{r.registrationNo}</TableCell>
                    <TableCell className="font-medium text-slate-800">{r.student.user.name || '—'}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{r.student.user.email}</TableCell>
                    <TableCell className="text-slate-600">{r.competition.name}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{r.category?.name || '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className={regStatusColor(r.status)}>{REGISTRATION_STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell>{pay ? <Badge variant="secondary" className={PAYMENT_STATUS_COLORS[pay.status]}>{PAYMENT_STATUS_LABELS[pay.status]}</Badge> : <span className="text-slate-400">—</span>}</TableCell>
                    <TableCell>{ess ? <span className="text-xs text-slate-600">{ess.status}</span> : <span className="text-slate-400">—</span>}</TableCell>
                    <TableCell className="text-slate-500 text-xs">{new Date(r.registeredAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {r.status !== 'CANCELLED' && r.status !== 'CONFIRMED' && (
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2" onClick={() => handleOpenCancel(r)}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {search ? filteredBySearch.length : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`} of {total}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) p = page - 2 + i;
            if (p > totalPages) p = totalPages - (4 - i);
            if (p < 1) p = i + 1;
            return <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>;
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-rose-500" /> Cancel Registration</DialogTitle>
            <DialogDescription>Cancelling {cancelTarget?.registrationNo} for {cancelTarget?.student.user.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Reason (optional)</Label>
            <Textarea rows={3} placeholder="Provide a reason for cancellation..." value={cancelReason} onChange={e => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" disabled={cancelling} onClick={handleCancel}>{cancelling ? 'Cancelling...' : 'Cancel Registration'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
