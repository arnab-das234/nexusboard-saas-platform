'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  PenTool, FileCheck, Clock, CheckCircle, Users, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';
import type { EvaluationStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string; essayId: string; essayStudent: string; competitionName: string;
  examinerName: string; status: EvaluationStatus; assignedDate: string; deadline: string;
}

interface CompProgress {
  competitionName: string; total: number; assigned: number; inProgress: number; completed: number;
}

const PAGE_SIZE = 10;

const MOCK_OVERVIEW = { totalEssays: 621, assigned: 540, inProgress: 93, completed: 447 };

const MOCK_PROGRESS: CompProgress[] = [
  { competitionName: 'National Essay 2025', total: 312, assigned: 280, inProgress: 48, completed: 232 },
  { competitionName: 'State Level Essay', total: 156, assigned: 140, inProgress: 25, completed: 115 },
  { competitionName: 'Inter-School Essay', total: 153, assigned: 120, inProgress: 20, completed: 100 },
];

const MOCK_ASSIGNMENTS: Assignment[] = Array.from({ length: 42 }, (_, i) => ({
  id: `ASG-${String(i + 1).padStart(4, '0')}`,
  essayId: `ESS-${String(i + 1).padStart(4, '0')}`,
  essayStudent: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer'][i % 5],
  competitionName: ['National Essay 2025', 'State Level Essay', 'Inter-School Essay'][i % 3],
  examinerName: ['Prof. Anil Kapoor', 'Dr. Sunita Rao', 'Mr. Deepak Menon', 'Ms. Kavitha Sharma', 'Dr. Rajesh Nair'][i % 5],
  status: (['ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'LOCKED'] as EvaluationStatus[])[i % 4],
  assignedDate: `2025-07-${String((i % 28) + 1).padStart(2, '0')}`,
  deadline: `2025-08-${String(Math.min((i % 28) + 14, 31)).padStart(2, '0')}`,
}));

const MOCK_EXAMINERS = ['Prof. Anil Kapoor', 'Dr. Sunita Rao', 'Mr. Deepak Menon', 'Ms. Kavitha Sharma', 'Dr. Rajesh Nair'];

function evalStatusColor(s: EvaluationStatus) {
  const m: Record<string, string> = {
    ASSIGNED: 'bg-amber-100 text-amber-700', IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
    SUBMITTED: 'bg-teal-100 text-teal-700', LOCKED: 'bg-slate-100 text-slate-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function TableSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => (<Card key={i}><CardContent className="p-4"><Skeleton className="h-14 rounded" /></CardContent></Card>))}</div>
      <Skeleton className="h-[300px] w-full rounded-lg" />
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminExaminationView() {
  const [overview, setOverview] = useState(MOCK_OVERVIEW);
  const [progress, setProgress] = useState<CompProgress[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [compFilter, setCompFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [batchOpen, setBatchOpen] = useState(false);
  const [selectedEssays, setSelectedEssays] = useState<string[]>([]);
  const [batchExaminer, setBatchExaminer] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-examination');
      const json = await res.json();
      if (json.success && json.data) {
        setOverview(json.data.overview ?? MOCK_OVERVIEW);
        setProgress(json.data.progress ?? MOCK_PROGRESS);
        setAssignments(json.data.assignments ?? MOCK_ASSIGNMENTS);
        return;
      }
    } catch {} finally { setLoading(false); }
    setProgress(MOCK_PROGRESS); setAssignments(MOCK_ASSIGNMENTS);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = assignments.filter((a) => {
    if (compFilter !== 'ALL' && a.competitionName !== compFilter) return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [compFilter, statusFilter]);

  const toggleEssay = (id: string) => {
    setSelectedEssays((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBatchAssign = () => {
    if (selectedEssays.length === 0) { toast.error('Select at least one essay'); return; }
    if (!batchExaminer) { toast.error('Select an examiner'); return; }
    toast.success(`${selectedEssays.length} essays assigned to ${batchExaminer}`);
    setBatchOpen(false); setSelectedEssays([]); setBatchExaminer('');
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Examination</h1>
          <p className="text-sm text-slate-500">Manage essay evaluations and examiner assignments</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setBatchOpen(true)}>
          <Users className="h-4 w-4 mr-1.5" /> Batch Assign
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center"><FileCheck className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Total Essays</p><p className="text-xl font-bold text-slate-800">{overview.totalEssays}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Assigned</p><p className="text-xl font-bold text-teal-700">{overview.assigned}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><Clock className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">In Progress</p><p className="text-xl font-bold text-amber-700">{overview.inProgress}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><PenTool className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Completed</p><p className="text-xl font-bold text-emerald-800">{overview.completed}</p></div>
        </CardContent></Card>
      </div>

      {/* Progress per Competition */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800">Progress by Competition</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {progress.map((c) => {
            const pct = c.total > 0 ? Math.round((c.completed / c.total) * 100) : 0;
            return (
              <div key={c.competitionName} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">{c.competitionName}</span>
                  <span className="text-slate-500">{c.completed}/{c.total} ({pct}%)</span>
                </div>
                <div className="flex gap-1.5 h-3 rounded-full overflow-hidden bg-slate-100">
                  <div className="bg-emerald-500 rounded-l-full transition-all" style={{ width: `${(c.completed / c.total) * 100}%` }} />
                  <div className="bg-amber-400 transition-all" style={{ width: `${(c.inProgress / c.total) * 100}%` }} />
                  <div className="bg-slate-200 rounded-r-full transition-all" style={{ width: `${((c.total - c.assigned) / c.total) * 100}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> In Progress</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-200" /> Unassigned</span>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Assignment Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base font-semibold text-slate-800">Assignments</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            <Select value={compFilter} onValueChange={setCompFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Competitions</SelectItem>
                <SelectItem value="National Essay 2025">National Essay 2025</SelectItem>
                <SelectItem value="State Level Essay">State Level Essay</SelectItem>
                <SelectItem value="Inter-School Essay">Inter-School Essay</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(EVALUATION_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Essay</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Examiner</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Deadline</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-medium text-slate-700">{a.essayId}</TableCell>
                    <TableCell className="font-medium text-slate-800">{a.essayStudent}</TableCell>
                    <TableCell className="text-slate-600">{a.examinerName}</TableCell>
                    <TableCell><Badge variant="secondary" className={evalStatusColor(a.status)}>{EVALUATION_STATUS_LABELS[a.status]}</Badge></TableCell>
                    <TableCell className="text-slate-500">{a.assignedDate}</TableCell>
                    <TableCell className="text-slate-500">{a.deadline}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Batch Assign Dialog */}
      <Dialog open={batchOpen} onOpenChange={setBatchOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Batch Assign Essays</DialogTitle>
            <DialogDescription>Select essays and an examiner to assign</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Select Essays ({selectedEssays.length} selected)</p>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border p-2 space-y-1">
                {assignments.filter((a) => a.status === 'ASSIGNED' || a.status === 'IN_PROGRESS').slice(0, 20).map((a) => (
                  <label key={a.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={selectedEssays.includes(a.essayId)}
                      onChange={() => toggleEssay(a.essayId)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-slate-700">{a.essayId}</span>
                    <span className="text-slate-400">— {a.essayStudent}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-1">Assign to Examiner</p>
              <Select value={batchExaminer} onValueChange={setBatchExaminer}>
                <SelectTrigger><SelectValue placeholder="Select examiner..." /></SelectTrigger>
                <SelectContent>
                  {MOCK_EXAMINERS.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleBatchAssign}>Assign</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
