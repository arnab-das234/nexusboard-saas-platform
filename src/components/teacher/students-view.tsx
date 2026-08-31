'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, Search, Filter, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Student {
  id: string; name: string; email: string; school: string; classGrade: string; section: string;
  registrationStatus: string; paymentStatus: string; essayStatus: string;
  competitions: Array<{ name: string; status: string }>;
  phone?: string; guardianName?: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_STUDENTS: Student[] = [
  { id: 's1', name: 'Aarav Sharma', email: 'aarav@school.edu', school: 'DPS Jaipur', classGrade: '10', section: 'A', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }], phone: '+91 98765 43210', guardianName: 'Rajesh Sharma' },
  { id: 's2', name: 'Priya Patel', email: 'priya@school.edu', school: 'DPS Jaipur', classGrade: '10', section: 'B', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'UNDER_EVALUATION', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }], phone: '+91 98765 12345', guardianName: 'Amit Patel' },
  { id: 's3', name: 'Rohan Mehta', email: 'rohan@school.edu', school: 'DPS Jaipur', classGrade: '11', section: 'A', registrationStatus: 'PAYMENT_PENDING', paymentStatus: 'PENDING', essayStatus: 'NOT_STARTED', competitions: [{ name: 'National Essay Competition 2025', status: 'PAYMENT_PENDING' }], phone: '+91 91234 56789', guardianName: 'Suresh Mehta' },
  { id: 's4', name: 'Ananya Gupta', email: 'ananya@school.edu', school: 'DPS Jaipur', classGrade: '10', section: 'A', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }], phone: '+91 99887 76655', guardianName: 'Vikram Gupta' },
  { id: 's5', name: 'Vikram Singh', email: 'vikram@school.edu', school: 'DPS Jaipur', classGrade: '12', section: 'A', registrationStatus: 'PAID', paymentStatus: 'SUCCESS', essayStatus: 'UPLOAD_PENDING', competitions: [{ name: 'National Essay Competition 2025', status: 'PAID' }], phone: '+91 87654 32109', guardianName: 'Manpreet Singh' },
  { id: 's6', name: 'Meera Joshi', email: 'meera@school.edu', school: 'DPS Jaipur', classGrade: '9', section: 'C', registrationStatus: 'PENDING', paymentStatus: 'CREATED', essayStatus: 'NOT_STARTED', competitions: [], phone: '+91 76543 21098', guardianName: 'Sunil Joshi' },
  { id: 's7', name: 'Arjun Reddy', email: 'arjun@school.edu', school: 'DPS Jaipur', classGrade: '11', section: 'B', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'VALIDATING', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }], phone: '+91 65432 10987', guardianName: 'Ramesh Reddy' },
  { id: 's8', name: 'Kavya Nair', email: 'kavya@school.edu', school: 'DPS Jaipur', classGrade: '10', section: 'A', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }, { name: 'State-Level Essay Challenge', status: 'CONFIRMED' }], phone: '+91 54321 09876', guardianName: 'Rajeev Nair' },
  { id: 's9', name: 'Aditya Kumar', email: 'aditya@school.edu', school: 'DPS Jaipur', classGrade: '12', section: 'B', registrationStatus: 'CANCELLED', paymentStatus: 'REFUNDED', essayStatus: 'NOT_STARTED', competitions: [], phone: '+91 43210 98765', guardianName: 'Pradeep Kumar' },
  { id: 's10', name: 'Ishita Roy', email: 'ishita@school.edu', school: 'DPS Jaipur', classGrade: '9', section: 'A', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'LOCKED', competitions: [{ name: 'Inter-School Debate & Essay', status: 'CONFIRMED' }], phone: '+91 32109 87654', guardianName: 'Debashis Roy' },
  { id: 's11', name: 'Rahul Verma', email: 'rahul.v@school.edu', school: 'DPS Jaipur', classGrade: '11', section: 'A', registrationStatus: 'PAYMENT_PENDING', paymentStatus: 'PENDING', essayStatus: 'NOT_STARTED', competitions: [{ name: 'State-Level Essay Challenge', status: 'PAYMENT_PENDING' }], phone: '+91 21098 76543', guardianName: 'Arun Verma' },
  { id: 's12', name: 'Sneha Das', email: 'sneha@school.edu', school: 'DPS Jaipur', classGrade: '10', section: 'B', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED', competitions: [{ name: 'National Essay Competition 2025', status: 'CONFIRMED' }], phone: '+91 10987 65432', guardianName: 'Bipin Das' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PENDING: 'bg-amber-100 text-amber-700', PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-rose-100 text-rose-700',
    CREATED: 'bg-slate-100 text-slate-700', REFUNDED: 'bg-orange-100 text-orange-700',
    NOT_STARTED: 'bg-slate-100 text-slate-600', UPLOAD_PENDING: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700', UNDER_EVALUATION: 'bg-teal-100 text-teal-700',
    VALIDATING: 'bg-amber-100 text-amber-700', LOCKED: 'bg-slate-100 text-slate-600',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

function fmtLabel(s: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'Confirmed', VERIFIED: 'Verified', PENDING: 'Pending', PAYMENT_PENDING: 'Pay Pending',
    PAID: 'Paid', CANCELLED: 'Cancelled', SUCCESS: 'Paid', FAILED: 'Failed', CREATED: 'Not Paid',
    REFUNDED: 'Refunded', NOT_STARTED: 'Not Started', UPLOAD_PENDING: 'Upload Pending',
    SUBMITTED: 'Submitted', UNDER_EVALUATION: 'Evaluating', VALIDATING: 'Validating', LOCKED: 'Locked',
  };
  return map[s] ?? s;
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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [regFilter, setRegFilter] = useState('all');
  const [payFilter, setPayFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const PAGE_SIZE = 8;

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=teacher-students');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setStudents(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setStudents(MOCK_STUDENTS);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = students.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
    const matchReg = regFilter === 'all' || s.registrationStatus === regFilter;
    const matchPay = payFilter === 'all' || s.paymentStatus === payFilter;
    return matchSearch && matchReg && matchPay;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, regFilter, payFilter]);

  if (loading) return <StudentsSkeleton />;

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
            <SelectItem value="all">All Registration</SelectItem>
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
            <SelectItem value="PENDING">Pending</SelectItem>
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
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Registration</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Essay</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400">{s.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">{s.school}</TableCell>
                    <TableCell className="text-sm text-slate-600">{s.classGrade}-{s.section}</TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(s.registrationStatus)}>{fmtLabel(s.registrationStatus)}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(s.paymentStatus)}>{fmtLabel(s.paymentStatus)}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={statusBadge(s.essayStatus)}>{fmtLabel(s.essayStatus)}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-emerald-600" onClick={() => setSelectedStudent(s)}>
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
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className={`h-8 w-8 ${p === page ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setPage(p)}>
                {p}
              </Button>
            ))}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Student Detail Dialog */}
      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Overview of student&apos;s registration and progress</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800">{selectedStudent.name}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{selectedStudent.email}</p></div>
                <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800">{selectedStudent.phone ?? 'N/A'}</p></div>
                <div><span className="text-slate-500">Class</span><p className="font-medium text-slate-800">{selectedStudent.classGrade}-{selectedStudent.section}</p></div>
                <div><span className="text-slate-500">School</span><p className="font-medium text-slate-800">{selectedStudent.school}</p></div>
                <div><span className="text-slate-500">Guardian</span><p className="font-medium text-slate-800">{selectedStudent.guardianName ?? 'N/A'}</p></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Registration</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selectedStudent.registrationStatus)}`}>{fmtLabel(selectedStudent.registrationStatus)}</Badge>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Payment</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selectedStudent.paymentStatus)}`}>{fmtLabel(selectedStudent.paymentStatus)}</Badge>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">Essay</p>
                  <Badge variant="outline" className={`mt-1 ${statusBadge(selectedStudent.essayStatus)}`}>{fmtLabel(selectedStudent.essayStatus)}</Badge>
                </div>
              </div>
              {selectedStudent.competitions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-slate-600 mb-2">Competitions Registered</p>
                  <div className="space-y-2">
                    {selectedStudent.competitions.map((c, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg border p-2.5">
                        <span className="text-sm text-slate-700">{c.name}</span>
                        <Badge variant="outline" className={statusBadge(c.status)}>{fmtLabel(c.status)}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
