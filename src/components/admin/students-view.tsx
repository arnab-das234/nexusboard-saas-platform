'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, Pencil, Ban, ChevronLeft, ChevronRight, Users, GraduationCap, Filter,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Student {
  id: string; name: string; email: string; phone?: string; schoolName: string;
  dateOfBirth: string; status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  classGrade?: string; section?: string; guardianName?: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_STUDENTS: Student[] = Array.from({ length: 47 }, (_, i) => ({
  id: `STU-${String(i + 1).padStart(4, '0')}`,
  name: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer',
    'Meera Joshi', 'Arjun Reddy', 'Sneha Kulkarni', 'Vikram Singh', 'Diya Menon',
    'Aditya Rao', 'Ishita Verma', 'Nikhil Das', 'Pooja Srinivasan', 'Rahul Mehta',
    'Kavya Nambiar', 'Siddharth Banerjee', 'Tanvi Deshmukh', 'Varun Kapoor', 'Neha Pillai',
    'Akash Choudhary', 'Riya Saxena', 'Harsh Agarwal', 'Divya Krishnan', 'Manish Tiwari',
    'Shruti Mishra', 'Deepak Jha', 'Anjali Rao', 'Prateek Sharma', 'Sanjana Hegde',
    'Yash Pandey', 'Lakshmi Iyer', 'Rajesh Kumar', 'Swati Dubey', 'Amit Singhania',
    'Pallavi Reddy', 'Nitin Joshi', 'Geeta Nair', 'Suresh Pillai', 'Rekha Menon',
    'Vijay Hegde', 'Sunita Sharma', 'Ashok Patel', 'Kamala Devi', 'Ramesh Iyer', 'Lalita Gupta',
    'Ganesh Kumar'][i] ?? `Student ${i + 1}`,
  email: `student${i + 1}@school.com`,
  phone: `98765${String(43210 + i).padStart(5, '0')}`,
  schoolName: ['Delhi Public School', 'Kendriya Vidyalaya', 'St. Mary\'s High School', 'DPS Noida', 'Birla Vidya Niketan'][i % 5],
  dateOfBirth: `200${8 + (i % 3)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  status: i < 40 ? 'ACTIVE' : i < 45 ? 'INACTIVE' : 'SUSPENDED',
  classGrade: `${8 + (i % 5)}`,
  section: ['A', 'B', 'C', 'D'][i % 4],
  guardianName: `Guardian of Student ${i + 1}`,
  createdAt: `2025-0${(i % 6) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
}));

function statusBadge(s: string) {
  const m: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    INACTIVE: 'bg-amber-100 text-amber-700',
    SUSPENDED: 'bg-rose-100 text-rose-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminStudentsView() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [competitionFilter, setCompetitionFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const [viewStudent, setViewStudent] = useState<Student | null>(null);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [editName, setEditName] = useState('');

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-students');
      const json = await res.json();
      if (json.success && json.data) { setStudents(json.data); return; }
    } catch {} finally { setLoading(false); }
    setStudents(MOCK_STUDENTS);
  }, []);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  // Filter
  const filtered = students.filter((s) => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, competitionFilter]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Students</h1>
          <p className="text-sm text-slate-500">Manage student accounts</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <Users className="h-3.5 w-3.5 mr-1" /> {filtered.length} students
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={competitionFilter} onValueChange={setCompetitionFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Competition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Competitions</SelectItem>
            <SelectItem value="national-2025">National Essay 2025</SelectItem>
            <SelectItem value="state-level">State Level Essay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GraduationCap className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No students found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Date of Birth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium text-slate-800">{s.name}</TableCell>
                  <TableCell className="text-slate-500">{s.email}</TableCell>
                  <TableCell>{s.schoolName}</TableCell>
                  <TableCell className="text-slate-500">{s.dateOfBirth}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusBadge(s.status)}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewStudent(s)} title="View details">
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditStudent(s); setEditName(s.name); }} title="Edit">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { toast.success(`Student ${s.name} deactivated`); }} title="Deactivate">
                        <Ban className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let p = i + 1;
            if (totalPages > 5 && page > 3) p = page - 2 + i;
            if (p > totalPages) p = totalPages - (4 - i);
            if (p < 1) p = i + 1;
            return (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>
            );
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* View Dialog */}
      <Dialog open={!!viewStudent} onOpenChange={() => setViewStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>Viewing student profile information</DialogDescription>
          </DialogHeader>
          {viewStudent && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Name</span><p className="font-medium text-slate-800">{viewStudent.name}</p></div>
                <div><span className="text-slate-500">ID</span><p className="font-medium text-slate-800">{viewStudent.id}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{viewStudent.email}</p></div>
                <div><span className="text-slate-500">Phone</span><p className="font-medium text-slate-800">{viewStudent.phone ?? '—'}</p></div>
                <div><span className="text-slate-500">School</span><p className="font-medium text-slate-800">{viewStudent.schoolName}</p></div>
                <div><span className="text-slate-500">Class</span><p className="font-medium text-slate-800">{viewStudent.classGrade ?? '—'} - {viewStudent.section ?? '—'}</p></div>
                <div><span className="text-slate-500">DOB</span><p className="font-medium text-slate-800">{viewStudent.dateOfBirth}</p></div>
                <div><span className="text-slate-500">Guardian</span><p className="font-medium text-slate-800">{viewStudent.guardianName ?? '—'}</p></div>
                <div><span className="text-slate-500">Status</span><p><Badge variant="secondary" className={statusBadge(viewStudent.status)}>{viewStudent.status}</Badge></p></div>
                <div><span className="text-slate-500">Joined</span><p className="font-medium text-slate-800">{viewStudent.createdAt}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editStudent} onOpenChange={() => setEditStudent(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditStudent(null)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => { toast.success('Student updated'); setEditStudent(null); }}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
