'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, ChevronLeft, ChevronRight, AlertCircle, RefreshCw,
  ClipboardCheck, ArrowUpDown, ArrowUp, ArrowDown, Loader2,
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
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface ExaminerUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  examinerProfile: {
    id: string;
    specialization: string | null;
    qualification: string | null;
    isActive: boolean;
  } | null;
  _count: { auditLogs: number };
  roleNames: string[];
}

type SortField = 'name' | 'email' | 'specialization' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-60" /></div>
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-44" /></div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
      <div className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-8 w-56" /></div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminExaminersView() {
  const [examiners, setExaminers] = useState<ExaminerUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchExaminers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role: 'EXAMINER', page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/users?${params.toString()}`);
      const json: PaginatedResponse<ExaminerUser> = await res.json();
      if (!json.success) { setError(json.error || 'Failed to load examiners'); return; }
      setExaminers(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchExaminers(); }, [fetchExaminers]);
  useEffect(() => { setPage(1); }, [search, activeFilter]);

  // Client-side active filter
  const filtered = activeFilter === 'ALL'
    ? examiners
    : examiners.filter((e) => activeFilter === 'ACTIVE' ? e.isActive : !e.isActive);

  // Client-side sort
  const sorted = [...filtered].sort((a, b) => {
    let va = '', vb = '';
    if (sortField === 'name') { va = a.name || ''; vb = b.name || ''; }
    else if (sortField === 'email') { va = a.email; vb = b.email; }
    else if (sortField === 'specialization') { va = a.examinerProfile?.specialization || ''; vb = b.examinerProfile?.specialization || ''; }
    else if (sortField === 'createdAt') { va = a.createdAt; vb = b.createdAt; }
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400" />;
    return sortDir === 'asc' ? <ArrowUp className="ml-1 h-3 w-3 text-emerald-600" /> : <ArrowDown className="ml-1 h-3 w-3 text-emerald-600" />;
  };

  const handleToggleActive = async (examiner: ExaminerUser) => {
    const newActive = !examiner.isActive;
    setTogglingId(examiner.id);
    try {
      const res = await fetch('/api/users?action=toggle-active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: examiner.id, isActive: newActive }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to update status'); return; }
      toast.success(json.message || `Examiner ${newActive ? 'activated' : 'deactivated'}`);
      fetchExaminers();
    } catch {
      toast.error('Network error');
    } finally {
      setTogglingId(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Examiners</h1>
          <p className="text-sm text-slate-500">Manage examiners, their profiles, and activation status</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {total} examiners
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchExaminers} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && <TableSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
          <p className="text-slate-600 font-medium">Failed to load examiners</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchExaminers}><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No examiners found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && sorted.length > 0 && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('name')}>Name <SortIcon field="name" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('email')}>Email <SortIcon field="email" /></TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('specialization')}>Specialization <SortIcon field="specialization" /></TableHead>
                  <TableHead>Qualification</TableHead>
                  <TableHead>Active Status</TableHead>
                  <TableHead>Assignments</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((e) => (
                  <TableRow key={e.id} className={!e.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-slate-800">{e.name || '—'}</TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">{e.email}</TableCell>
                    <TableCell>{e.examinerProfile?.specialization || '—'}</TableCell>
                    <TableCell className="text-slate-600">{e.examinerProfile?.qualification || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={e.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}>
                        {e.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-slate-600 border-slate-200">
                        {e._count?.auditLogs ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm" variant={e.isActive ? 'outline' : 'default'}
                        className={`h-8 text-xs ${e.isActive ? 'text-amber-600 hover:text-amber-700 hover:bg-amber-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                        disabled={togglingId === e.id}
                        onClick={() => handleToggleActive(e)}
                      >
                        {togglingId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                        {togglingId === e.id ? 'Updating…' : e.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && page > 3) p = page - 2 + i;
              if (p > totalPages) p = totalPages - (4 - i);
              if (p < 1) p = i + 1;
              return (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>
              );
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
