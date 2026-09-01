'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, ChevronLeft, ChevronRight, Eye, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface StudentRow {
  id: string; name: string; email: string; school: string;
  classGrade: string; section: string; phone?: string;
  registrationStatus: string; paymentStatus: string; essayStatus: string;
}

function statusBadge(s: string) {
  const m: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PENDING: 'bg-amber-100 text-amber-700', PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-rose-100 text-rose-700',
    CREATED: 'bg-slate-100 text-slate-600', REFUNDED: 'bg-orange-100 text-orange-700',
    NOT_STARTED: 'bg-slate-100 text-slate-600', UPLOAD_PENDING: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700', UNDER_EVALUATION: 'bg-teal-100 text-teal-700',
    VALIDATING: 'bg-amber-100 text-amber-700', LOCKED: 'bg-slate-100 text-slate-600',
  };
  return m[s] ?? 'bg-slate-100 text-slate-600';
}

function fmtStatus(s: string) {
  const m: Record<string, string> = {
    CONFIRMED: 'Confirmed', VERIFIED: 'Verified', PENDING: 'Pending', PAYMENT_PENDING: 'Pay Pending',
    PAID: 'Paid', CANCELLED: 'Cancelled', SUCCESS: 'Paid', FAILED: 'Failed', CREATED: 'Not Paid',
    REFUNDED: 'Refunded', NOT_STARTED: 'Not Started', UPLOAD_PENDING: 'Upload Pending',
    SUBMITTED: 'Submitted', UNDER_EVALUATION: 'Evaluating', VALIDATING: 'Validating', LOCKED: 'Locked',
  };
  return m[s] ?? s;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function StudentsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between gap-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-64" /></div>
      <Card><CardContent className="p-4"><Skeleton className="h-96 w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherStudentsView() {
  const user = useAuthStore((s) => s.user);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [regFilter, setRegFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const PAGE_SIZE = 8;

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/registrations?pageSize=100');
      if (!res.ok) throw new Error('Failed to fetch students');
      const j = await res.json();
      const regs = j.data ?? [];
      // Build student rows from registrations
      const map = new Map<string, StudentRow>();
      regs.forEach((r: Record<string, unknown>) => {
        const student = r.student as Record<string, unknown> | undefined;
        const u = student?.user as Record<string, unknown> | undefined;
        const payments = (r.payments as Record<string, unknown>[]) ?? [];
        const essays = (r.essays as Record<string, unknown>[]) ?? [];
        if (!student?.id || !u) return;
        const existing = map.get(student.id as string);
        // Prefer latest status
        const regStatus = r.status as string;
        const payStatus = (payments[0]?.status as string) ?? 'CREATED';
        const essayStatus = (essays[0]?.status as string) ?? 'NOT_STARTED';
        const row: StudentRow = {
          id: student.id as string,
          name: (u.name as string) ?? u.email as string,
          email: u.email as string,
          school: (student.schoolName as string) ?? '',
          classGrade: (student.classGrade as string) ?? '',
          section: (student.section as string) ?? '',
          registrationStatus: regStatus,
          paymentStatus: payStatus,
          essayStatus,
        };
        map.set(student.id as string, row);
      });
      setStudents(Array.from(map.values()));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load students');
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter(s => {
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchReg = regFilter === 'all' || s.registrationStatus === regFilter;
      const matchPay = payFilter === 'all' || s.paymentStatus === payFilter;
      return matchSearch && matchReg && matchPay;
    });
  }, [students, search, regFilter, payFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, regFilter, payFilter]);

  if (loading) return <StudentsSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Failed to load students</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={load}><RefreshCw className="h-4 w-4" /> Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Students</h1>
          <p className="text-sm text-slate-500">{filtered.length} student{filtered.length !== 1 ? 's' : ''} found</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9" />
        </div>
        <Select value={regFilter} onValueChange={setRegFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Registration" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="PAYMENT_PENDING">Pay Pending</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={payFilter} onValueChange={setPayFilter}>
          <SelectTrigger className="w-40 h-9"><SelectValue placeholder="Payment" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payment</SelectItem>
            <SelectItem value="SUCCESS">Paid</SelectItem>
            <SelectItem value="CREATED">Not Paid</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-0">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <GraduationCap className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No students found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>School</TableHead><TableHead>Class</TableHead>
                    <TableHead>Registration</TableHead><TableHead>Payment</TableHead><TableHead>Essay</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated.map(s => (
                    <TableRow key={s.id}>
                      <TableCell><div><p className="text-sm font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div></TableCell>
                      <TableCell className="text-sm text-slate-600">{s.school}</TableCell>
                      <TableCell className="text-sm text-slate-600">{s.classGrade}{s.section ? `-${s.section}` : ''}</TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(s.registrationStatus)}>{fmtStatus(s.registrationStatus)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(s.paymentStatus)}>{fmtStatus(s.paymentStatus)}</Badge></TableCell>
                      <TableCell><Badge variant="outline" className={statusBadge(s.essayStatus)}>{fmtStatus(s.essayStatus)}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => setSelected(s)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {page} of {totalPages} ({filtered.length} students)</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className={`h-8 w-8 ${p === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Overview of student registration and progress</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800">{selected.name}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{selected.email}</p></div>
                <div><span className="text-slate-500">School</span><p className="font-medium text-slate-800">{selected.school}</p></div>
                <div><span className="text-slate-500">Class</span><p className="font-medium text-slate-800">{selected.classGrade}{selected.section ? `-${selected.section}` : ''}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Registration</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selected.registrationStatus)}`}>{fmtStatus(selected.registrationStatus)}</Badge>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Payment</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selected.paymentStatus)}`}>{fmtStatus(selected.paymentStatus)}</Badge>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Essay</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selected.essayStatus)}`}>{fmtStatus(selected.essayStatus)}</Badge>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
