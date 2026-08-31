'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, Eye, ClipboardCheck, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight,
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
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Examiner {
  id: string; name: string; email: string; phone?: string;
  specialization: string; isActive: boolean;
  assignedEssays: number; completedEssays: number; createdAt: string;
}

interface WorkloadItem {
  essayId: string; competitionName: string; studentName: string;
  status: string; score?: number; maxMarks: number;
}

const PAGE_SIZE = 10;

const MOCK_EXAMINERS: Examiner[] = Array.from({ length: 18 }, (_, i) => ({
  id: `EXM-${String(i + 1).padStart(4, '0')}`,
  name: ['Prof. Anil Kapoor', 'Dr. Sunita Rao', 'Mr. Deepak Menon', 'Ms. Kavitha Sharma', 'Dr. Rajesh Nair',
    'Mrs. Meera Iyer', 'Mr. Arvind Joshi', 'Dr. Priya Verma', 'Mr. Suresh Hegde', 'Ms. Anjali Patel',
    'Dr. Venkat Kumar', 'Mrs. Shruti Desai', 'Mr. Nikhil Reddy', 'Dr. Pooja Banerjee', 'Mr. Manish Gupta',
    'Ms. Divya Saxena', 'Dr. Ramesh Tiwari', 'Mrs. Lalita Mishra'][i] ?? `Examiner ${i + 1}`,
  email: `examiner${i + 1}@eval.com`,
  phone: `97766${String(54321 + i).padStart(5, '0')}`,
  specialization: ['English Literature', 'Creative Writing', 'Academic Writing', 'Essay Critique', 'Poetry & Prose'][i % 5],
  isActive: i < 14,
  assignedEssays: Math.floor(Math.random() * 30) + 5,
  completedEssays: Math.floor(Math.random() * 20),
  createdAt: `2025-0${(i % 6) + 1}-${String((i % 28) + 1).padStart(2, '0')}`,
}));

const MOCK_WORKLOAD: WorkloadItem[] = [
  { essayId: 'ESS-001', competitionName: 'National Essay 2025', studentName: 'Aarav Sharma', status: 'Submitted', score: 82, maxMarks: 100 },
  { essayId: 'ESS-003', competitionName: 'National Essay 2025', studentName: 'Priya Nair', status: 'In Progress', maxMarks: 100 },
  { essayId: 'ESS-007', competitionName: 'State Level Essay', studentName: 'Rohit Patel', status: 'Submitted', score: 76, maxMarks: 100 },
  { essayId: 'ESS-012', competitionName: 'National Essay 2025', studentName: 'Ananya Gupta', status: 'Assigned', maxMarks: 100 },
  { essayId: 'ESS-015', competitionName: 'Inter-School Essay', studentName: 'Karthik Iyer', status: 'Submitted', score: 91, maxMarks: 100 },
];

function statusBadge(s: string) {
  const m: Record<string, string> = {
    Assigned: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-emerald-100 text-emerald-700',
    Submitted: 'bg-teal-100 text-teal-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
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
export function AdminExaminersView() {
  const [examiners, setExaminers] = useState<Examiner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [specFilter, setSpecFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [viewExaminer, setViewExaminer] = useState<Examiner | null>(null);

  const fetchExaminers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-examiners');
      const json = await res.json();
      if (json.success && json.data) { setExaminers(json.data); return; }
    } catch {} finally { setLoading(false); }
    setExaminers(MOCK_EXAMINERS);
  }, []);

  useEffect(() => { fetchExaminers(); }, [fetchExaminers]);

  const filtered = examiners.filter((e) => {
    if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.email.toLowerCase().includes(search.toLowerCase())) return false;
    if (specFilter !== 'ALL' && e.specialization !== specFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, specFilter]);

  const toggleActive = (e: Examiner) => {
    setExaminers((prev) => prev.map((x) => x.id === e.id ? { ...x, isActive: !x.isActive } : x));
    toast.success(`${e.name} ${e.isActive ? 'deactivated' : 'activated'}`);
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Examiners</h1>
          <p className="text-sm text-slate-500">Manage examiners and their workloads</p>
        </div>
        <Badge variant="outline" className="w-fit text-slate-600">
          <ClipboardCheck className="h-3.5 w-3.5 mr-1" /> {filtered.length} examiners
        </Badge>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={specFilter} onValueChange={setSpecFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Specialization" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Specializations</SelectItem>
            <SelectItem value="English Literature">English Literature</SelectItem>
            <SelectItem value="Creative Writing">Creative Writing</SelectItem>
            <SelectItem value="Academic Writing">Academic Writing</SelectItem>
            <SelectItem value="Essay Critique">Essay Critique</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardCheck className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No examiners found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((e) => (
                <TableRow key={e.id} className={!e.isActive ? 'opacity-60' : ''}>
                  <TableCell className="font-medium text-slate-800">{e.name}</TableCell>
                  <TableCell className="text-slate-500">{e.email}</TableCell>
                  <TableCell>{e.specialization}</TableCell>
                  <TableCell>
                    <button
                      onClick={() => toggleActive(e)}
                      className="flex items-center gap-1.5"
                    >
                      {e.isActive ? (
                        <ToggleRight className="h-5 w-5 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-slate-400" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">{e.assignedEssays}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">{e.completedEssays}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setViewExaminer(e)} title="View workload">
                      <Eye className="h-4 w-4 text-slate-500" />
                    </Button>
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

      {/* Workload Dialog */}
      <Dialog open={!!viewExaminer} onOpenChange={() => setViewExaminer(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewExaminer?.name}</DialogTitle>
            <DialogDescription>Workload — {viewExaminer?.specialization}</DialogDescription>
          </DialogHeader>
          {viewExaminer && (
            <>
              <div className="flex items-center gap-4 text-sm mb-2">
                <div className="flex-1">
                  <p className="text-slate-500">Assigned: <span className="font-semibold text-slate-800">{viewExaminer.assignedEssays}</span></p>
                </div>
                <div className="flex-1">
                  <p className="text-slate-500">Completed: <span className="font-semibold text-emerald-600">{viewExaminer.completedEssays}</span></p>
                </div>
              </div>
              <Progress value={viewExaminer.assignedEssays ? (viewExaminer.completedEssays / viewExaminer.assignedEssays) * 100 : 0} className="h-2 mb-4" />
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80">
                      <TableHead>Essay</TableHead>
                      <TableHead>Competition</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MOCK_WORKLOAD.map((w) => (
                      <TableRow key={w.essayId}>
                        <TableCell className="font-medium text-slate-700">{w.essayId}</TableCell>
                        <TableCell className="text-slate-500">{w.competitionName}</TableCell>
                        <TableCell>{w.studentName}</TableCell>
                        <TableCell><Badge variant="secondary" className={statusBadge(w.status)}>{w.status}</Badge></TableCell>
                        <TableCell>{w.score != null ? `${w.score}/${w.maxMarks}` : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
