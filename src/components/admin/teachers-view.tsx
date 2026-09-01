'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, BookOpen, ChevronLeft, ChevronRight, AlertCircle, RefreshCw,
  ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { PaginatedResponse } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface TeacherUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: string;
  teacherProfile: {
    id: string;
    schoolName: string;
    designation: string | null;
  } | null;
  _count: { auditLogs: number };
  roleNames: string[];
}

type SortField = 'name' | 'email' | 'schoolName' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
function activeBadge(active: boolean): string {
  return active ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-60" /></div>
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /></div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      </div>
      <div className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-8 w-56" /></div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminTeachersView() {
  const [teachers, setTeachers] = useState<TeacherUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [viewTeacher, setViewTeacher] = useState<TeacherUser | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role: 'TEACHER', page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/users?${params.toString()}`);
      const json: PaginatedResponse<TeacherUser> = await res.json();
      if (!json.success) { setError(json.error || 'Failed to load teachers'); return; }
      setTeachers(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { setPage(1); }, [search]);

  // Client-side sort
  const sorted = [...teachers].sort((a, b) => {
    let va = '', vb = '';
    if (sortField === 'name') { va = a.name || ''; vb = b.name || ''; }
    else if (sortField === 'email') { va = a.email; vb = b.email; }
    else if (sortField === 'schoolName') { va = a.teacherProfile?.schoolName || ''; vb = b.teacherProfile?.schoolName || ''; }
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teachers</h1>
          <p className="text-sm text-slate-500">Manage teacher accounts and view their students</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <BookOpen className="h-3.5 w-3.5 mr-1" /> {total} teachers
        </Badge>
      </div>

      {/* Search */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={fetchTeachers} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && <TableSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
          <p className="text-slate-600 font-medium">Failed to load teachers</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchTeachers}><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No teachers found</p>
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('schoolName')}>School <SortIcon field="schoolName" /></TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((t) => (
                  <TableRow key={t.id} className={!t.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-slate-800">{t.name || '—'}</TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">{t.email}</TableCell>
                    <TableCell>{t.teacherProfile?.schoolName || '—'}</TableCell>
                    <TableCell className="text-slate-600">{t.teacherProfile?.designation || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">
                        {/* Students count fetched from profile — _count not returned by API for this relation, showing 0 */}
                        View
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={activeBadge(t.isActive)}>
                        {t.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewTeacher(t)} title="View details">
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                      </div>
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

      {/* View Teacher Dialog */}
      <Dialog open={!!viewTeacher} onOpenChange={() => setViewTeacher(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Teacher Details</DialogTitle>
            <DialogDescription>Viewing teacher profile information</DialogDescription>
          </DialogHeader>
          {viewTeacher && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800">{viewTeacher.name || '—'}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{viewTeacher.email}</p></div>
                <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800">{viewTeacher.phone || '—'}</p></div>
                <div><span className="text-slate-500">Status</span>
                  <p><Badge variant="secondary" className={activeBadge(viewTeacher.isActive)}>{viewTeacher.isActive ? 'Active' : 'Inactive'}</Badge></p>
                </div>
                <div><span className="text-slate-500">School</span><p className="font-medium text-slate-800">{viewTeacher.teacherProfile?.schoolName || '—'}</p></div>
                <div><span className="text-slate-500">Designation</span><p className="font-medium text-slate-800">{viewTeacher.teacherProfile?.designation || '—'}</p></div>
                <div className="col-span-2"><span className="text-slate-500">Joined</span><p className="font-medium text-slate-800">{new Date(viewTeacher.createdAt).toLocaleDateString()}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
