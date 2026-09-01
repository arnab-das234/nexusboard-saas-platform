'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, Users, GraduationCap, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
  AlertCircle, RefreshCw,
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
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useNavStore } from '@/lib/store';
import type { PaginatedResponse } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface StudentUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  isActive: boolean;
  emailVerified: boolean;
  createdAt: string;
  studentProfile: {
    id: string;
    schoolName: string;
    classGrade: string | null;
    dateOfBirth: string;
  } | null;
  roleNames: string[];
}

type SortField = 'name' | 'email' | 'schoolName' | 'classGrade' | 'createdAt';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getAgeCategory(dob: string): string {
  if (!dob) return '—';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  if (age <= 11) return 'Sub-Junior (≤11)';
  if (age <= 14) return 'Junior (12-14)';
  if (age <= 17) return 'Senior (15-17)';
  return 'Open (18+)';
}

function activeBadge(active: boolean): string {
  return active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1"><Skeleton className="h-7 w-40" /><Skeleton className="h-4 w-56" /></div>
        <Skeleton className="h-7 w-28" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-44" /><Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border">
        <div className="p-4 space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <div className="flex justify-between"><Skeleton className="h-4 w-48" /><Skeleton className="h-8 w-56" /></div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminStudentsView() {
  const navigate = useNavStore((s) => s.navigate);

  const [students, setStudents] = useState<StudentUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [viewStudent, setViewStudent] = useState<StudentUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const schools = Array.from(new Set(students.map((s) => s.studentProfile?.schoolName).filter(Boolean) as string[])).sort();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ role: 'STUDENT', page: String(page), pageSize: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      const res = await fetch(`/api/users?${params.toString()}`);
      const json: PaginatedResponse<StudentUser> = await res.json();
      if (!json.success) { setError(json.error || 'Failed to load students'); return; }
      setStudents(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);
  useEffect(() => { setPage(1); }, [search, schoolFilter]);

  // Client-side school filter on current page
  const displayed = schoolFilter === 'ALL'
    ? students
    : students.filter((s) => s.studentProfile?.schoolName === schoolFilter);

  // Client-side sort
  const sorted = [...displayed].sort((a, b) => {
    let va: string = '', vb: string = '';
    if (sortField === 'name') { va = a.name || ''; vb = b.name || ''; }
    else if (sortField === 'email') { va = a.email; vb = b.email; }
    else if (sortField === 'schoolName') { va = a.studentProfile?.schoolName || ''; vb = b.studentProfile?.schoolName || ''; }
    else if (sortField === 'classGrade') { va = a.studentProfile?.classGrade || ''; vb = b.studentProfile?.classGrade || ''; }
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

  const handleToggleActive = async (student: StudentUser) => {
    setTogglingId(student.id);
    try {
      const res = await fetch('/api/users?action=toggle-active', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: student.id, isActive: !student.isActive }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to update'); return; }
      toast.success(json.message || `Student ${!student.isActive ? 'activated' : 'deactivated'}`);
      fetchStudents();
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
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500">Manage student accounts and registrations</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <Users className="h-3.5 w-3.5 mr-1" /> {total} total students
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by name or email..." className="pl-9"
            value={search} onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={schoolFilter} onValueChange={setSchoolFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Schools" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Schools</SelectItem>
            {schools.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchStudents} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Loading */}
      {loading && <TableSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
          <p className="text-slate-600 font-medium">Failed to load students</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchStudents}><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && sorted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No students found</p>
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
                  <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('classGrade')}>Class <SortIcon field="classGrade" /></TableHead>
                  <TableHead>Age Category</TableHead>
                  <TableHead>Account Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((s) => (
                  <TableRow key={s.id} className={!s.isActive ? 'opacity-60' : ''}>
                    <TableCell className="font-medium text-slate-800">{s.name || '—'}</TableCell>
                    <TableCell className="text-slate-500 max-w-[200px] truncate">{s.email}</TableCell>
                    <TableCell className="max-w-[180px] truncate">{s.studentProfile?.schoolName || '—'}</TableCell>
                    <TableCell>{s.studentProfile?.classGrade ? `Class ${s.studentProfile.classGrade}` : '—'}</TableCell>
                    <TableCell>
                      <span className="text-xs text-slate-600">
                        {getAgeCategory(s.studentProfile?.dateOfBirth || '')}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={activeBadge(s.isActive)}>
                        {s.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewStudent(s)} title="View profile">
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button
                          size="sm" variant={s.isActive ? 'outline' : 'default'}
                          className={`h-8 text-xs ${s.isActive ? 'text-rose-600 hover:text-rose-700 hover:bg-rose-50' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}
                          disabled={togglingId === s.id}
                          onClick={() => handleToggleActive(s)}
                        >
                          {togglingId === s.id ? '…' : s.isActive ? 'Deactivate' : 'Activate'}
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

      {/* View Profile Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Profile</DialogTitle>
            <DialogDescription>Viewing student details</DialogDescription>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800">{viewStudent.name || '—'}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{viewStudent.email}</p></div>
                <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800">{viewStudent.phone || '—'}</p></div>
                <div><span className="text-slate-500">Status</span>
                  <p><Badge variant="secondary" className={activeBadge(viewStudent.isActive)}>{viewStudent.isActive ? 'Active' : 'Inactive'}</Badge></p>
                </div>
                <div><span className="text-slate-500">School</span><p className="font-medium text-slate-800">{viewStudent.studentProfile?.schoolName || '—'}</p></div>
                <div><span className="text-slate-500">Class</span><p className="font-medium text-slate-800">{viewStudent.studentProfile?.classGrade ? `Class ${viewStudent.studentProfile.classGrade}` : '—'}</p></div>
                <div><span className="text-slate-500">Date of Birth</span><p className="font-medium text-slate-800">{viewStudent.studentProfile?.dateOfBirth ? new Date(viewStudent.studentProfile.dateOfBirth).toLocaleDateString() : '—'}</p></div>
                <div><span className="text-slate-500">Age Category</span><p className="font-medium text-slate-800">{getAgeCategory(viewStudent.studentProfile?.dateOfBirth || '')}</p></div>
                <div><span className="text-slate-500">Joined</span><p className="font-medium text-slate-800">{new Date(viewStudent.createdAt).toLocaleDateString()}</p></div>
                <div><span className="text-slate-500">Email Verified</span><p className="font-medium text-slate-800">{viewStudent.emailVerified ? 'Yes' : 'No'}</p></div>
              </div>
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => { navigate('admin-students'); setViewStudent(null); }}>
                  <Eye className="h-3.5 w-3.5 mr-1" /> Full Profile
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
