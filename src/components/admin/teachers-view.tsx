'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, Pencil, BookOpen, ChevronLeft, ChevronRight, Users,
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

// ── Types ────────────────────────────────────────────────────────────────────
interface Teacher {
  id: string; name: string; email: string; phone?: string;
  schoolName: string; designation: string; studentsCount: number;
  status: 'ACTIVE' | 'INACTIVE'; createdAt: string;
}

interface StudentRef { id: string; name: string; classGrade: string; status: string; }

const PAGE_SIZE = 10;

const MOCK_TEACHERS: Teacher[] = Array.from({ length: 23 }, (_, i) => ({
  id: `TCH-${String(i + 1).padStart(4, '0')}`,
  name: ['Dr. Ramesh Gupta', 'Mrs. Sunita Sharma', 'Mr. Arvind Kumar', 'Ms. Priya Nair', 'Dr. Venkat Rao',
    'Mrs. Kavitha Iyer', 'Mr. Sanjay Patel', 'Ms. Anjali Deshmukh', 'Dr. Rajesh Menon', 'Mrs. Meera Joshi',
    'Mr. Amit Verma', 'Ms. Deepa Reddy', 'Dr. Suresh Hegde', 'Mrs. Lalita Saxena', 'Mr. Nikhil Banerjee',
    'Ms. Pooja Srinivasan', 'Dr. Manish Tiwari', 'Mrs. Shruti Mishra', 'Mr. Ashok Choudhary', 'Ms. Kavya Nambiar',
    'Dr. Prateek Sharma', 'Mrs. Sanjana Hegde', 'Mr. Yash Pandey'][i] ?? `Teacher ${i + 1}`,
  email: `teacher${i + 1}@school.com`,
  phone: `99887${String(65432 + i).padStart(5, '0')}`,
  schoolName: ['Delhi Public School', 'Kendriya Vidyalaya', "St. Mary's High School", 'DPS Noida', 'Birla Vidya Niketan'][i % 5],
  designation: ['HOD English', 'Senior Teacher', 'Vice Principal', 'English Faculty', 'Academic Coordinator'][i % 5],
  studentsCount: Math.floor(Math.random() * 45) + 5,
  status: i < 18 ? 'ACTIVE' : 'INACTIVE',
  createdAt: `2025-0${(i % 6) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
}));

const MOCK_STUDENTS_BY_TEACHER: Record<string, StudentRef[]> = {};
MOCK_TEACHERS.forEach((t) => {
  MOCK_STUDENTS_BY_TEACHER[t.id] = Array.from({ length: Math.min(t.studentsCount, 8) }, (_, j) => ({
    id: `STU-${(t.studentsCount * 10 + j).toString().padStart(4, '0')}`,
    name: `Student ${t.studentsCount * 10 + j + 1}`,
    classGrade: `${8 + (j % 5)}`,
    status: j < 6 ? 'Active' : 'Inactive',
  }));
});

function statusBadge(s: string) {
  return s === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700';
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminTeachersView() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [viewTeacher, setViewTeacher] = useState<Teacher | null>(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-teachers');
      const json = await res.json();
      if (json.success && json.data) { setTeachers(json.data); return; }
    } catch {} finally { setLoading(false); }
    setTeachers(MOCK_TEACHERS);
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);

  const filtered = teachers.filter((t) => {
    if (search && !t.name.toLowerCase().includes(search.toLowerCase()) && !t.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Teachers</h1>
          <p className="text-sm text-slate-500">Manage teacher accounts and their students</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <BookOpen className="h-3.5 w-3.5 mr-1" /> {filtered.length} teachers
        </Badge>
      </div>

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
          </SelectContent>
        </Select>
      </div>

      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No teachers found</p>
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
                <TableHead>Designation</TableHead>
                <TableHead>Students</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium text-slate-800">{t.name}</TableCell>
                  <TableCell className="text-slate-500">{t.email}</TableCell>
                  <TableCell>{t.schoolName}</TableCell>
                  <TableCell className="text-slate-600">{t.designation}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-teal-600 border-teal-200 bg-teal-50">
                      {t.studentsCount} students
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusBadge(t.status)}>{t.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewTeacher(t)} title="View students">
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => toast.info('Edit functionality coming soon')} title="Edit">
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                    </div>
                  </TableCell>
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
            return (
              <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>
            );
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* View Teacher's Students Dialog */}
      <Dialog open={!!viewTeacher} onOpenChange={() => setViewTeacher(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewTeacher?.name}</DialogTitle>
            <DialogDescription>{viewTeacher?.schoolName} — {viewTeacher?.designation}</DialogDescription>
          </DialogHeader>
          {viewTeacher && (
            <div className="space-y-1 text-sm mb-2">
              <p className="text-slate-500">Email: {viewTeacher.email}</p>
              <p className="text-slate-500">Phone: {viewTeacher.phone ?? '—'}</p>
            </div>
          )}
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(viewTeacher ? MOCK_STUDENTS_BY_TEACHER[viewTeacher.id] ?? [] : []).map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium text-slate-800">{s.name}</TableCell>
                    <TableCell>Class {s.classGrade}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>{s.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
