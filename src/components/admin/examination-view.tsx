'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileCheck, Clock, CheckCircle, Users, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';
import type { PaginatedResponse } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface EssayItem {
  id: string;
  status: string;
  fileName: string | null;
  student: { user: { name: string | null; email: string } };
  competition: { id: string; name: string };
  registration: { registrationNo: string };
  assignments: AssignmentItem[];
}

interface AssignmentItem {
  id: string;
  examinerId: string;
  status: string;
  assignedAt: string;
  deadline: string | null;
  examiner: { id: string; user: { name: string | null; email: string } };
  evaluation: { status: string; totalMarks: number | null } | null;
}

interface ExaminerItem {
  id: string;
  isActive: boolean;
  user: { id: string; name: string | null; email: string };
  _count: { assignments: number; evaluations: number };
}

interface EvalItem {
  id: string;
  essayId: string;
  status: string;
  totalMarks: number | null;
  essay: { student: { user: { name: string | null } }; competition: { name: string } };
  examiner: { user: { name: string | null } };
}

const PAGE_SIZE = 10;

function evalStatusColor(s: string) {
  const m: Record<string, string> = {
    ASSIGNED: 'bg-amber-100 text-amber-700', IN_PROGRESS: 'bg-emerald-100 text-emerald-700',
    SUBMITTED: 'bg-teal-100 text-teal-700', LOCKED: 'bg-slate-100 text-slate-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-4"><Skeleton className="h-14 rounded" /></CardContent></Card>)}</div>
      <Skeleton className="h-[400px] w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load examination data</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminExaminationView() {
  const user = useAuthStore(s => s.user);
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [examiners, setExaminers] = useState<ExaminerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compFilter, setCompFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Assign dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<EssayItem | null>(null);
  const [selectedExaminers, setSelectedExaminers] = useState<string[]>([]);
  const [assignDeadline, setAssignDeadline] = useState('');
  const [assigning, setAssigning] = useState(false);

  const fetchEssays = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), status: 'VALID' });
      if (compFilter !== 'ALL') params.set('competitionId', compFilter);
      const res = await fetch(`/api/essays?${params}`);
      const json: PaginatedResponse<EssayItem> = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setEssays(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setLoading(false); }
  }, [page, compFilter]);

  const fetchExaminers = useCallback(async () => {
    try {
      const res = await fetch('/api/examiners?isActive=true&pageSize=100');
      const json = await res.json();
      if (json.success) setExaminers(json.data || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchExaminers(); }, [fetchExaminers]);
  useEffect(() => { setPage(1); }, [compFilter]);
  useEffect(() => { fetchEssays(); }, [fetchEssays]);

  // Computed overview
  const totalEssays = essays.length;
  const assignedCount = essays.filter(e => e.assignments.length > 0).length;
  const inProgressCount = essays.filter(e => e.assignments.some(a => a.status === 'IN_PROGRESS')).length;
  const completedCount = essays.filter(e => e.assignments.length > 0 && e.assignments.every(a => a.status === 'SUBMITTED')).length;

  const openAssignDialog = (essay: EssayItem) => {
    setAssignTarget(essay);
    setSelectedExaminers([]);
    setAssignDeadline('');
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!assignTarget || selectedExaminers.length === 0) { toast.error('Select at least one examiner'); return; }
    setAssigning(true);
    try {
      const res = await fetch('/api/examiners?action=assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          essayIds: [assignTarget.id],
          examinerIds: selectedExaminers,
          assignedBy: user?.id,
          deadline: assignDeadline || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to assign'); return; }
      toast.success(`Assigned ${selectedExaminers.length} examiner(s) to essay`);
      setAssignOpen(false);
      fetchEssays();
    } catch { toast.error('Network error'); }
    finally { setAssigning(false); }
  };

  const toggleExaminer = (id: string) => {
    setSelectedExaminers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchEssays} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Examination</h1>
          <p className="text-sm text-slate-500">Assign examiners and track evaluation progress</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-500 flex items-center justify-center"><FileCheck className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Validated Essays</p><p className="text-xl font-bold text-slate-800">{total}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-teal-500 flex items-center justify-center"><CheckCircle className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Assigned</p><p className="text-xl font-bold text-teal-700">{assignedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center"><Clock className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">In Progress</p><p className="text-xl font-bold text-amber-700">{inProgressCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-emerald-600 flex items-center justify-center"><Users className="h-5 w-5 text-white" /></div>
          <div><p className="text-xs text-slate-500">Completed</p><p className="text-xl font-bold text-emerald-800">{completedCount}</p></div>
        </CardContent></Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold text-slate-800">Essay Assignment</CardTitle>
            <Select value={compFilter} onValueChange={setCompFilter}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Competition" /></SelectTrigger>
              <SelectContent><SelectItem value="ALL">All Competitions</SelectItem></SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {essays.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-10 w-10 text-slate-300 mb-2" />
              <p className="text-slate-500 font-medium">No validated essays</p>
              <p className="text-sm text-slate-400 mt-1">Essays that pass validation will appear here</p>
            </div>
          ) : (
            <>
              <div className="rounded-lg border max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
                    <TableHead>Student</TableHead><TableHead>Competition</TableHead><TableHead>Reg No</TableHead>
                    <TableHead>Assigned Examiners</TableHead><TableHead>Progress</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {essays.map(e => {
                      const done = e.assignments.filter(a => a.status === 'SUBMITTED').length;
                      const totalA = e.assignments.length;
                      return (
                        <TableRow key={e.id}>
                          <TableCell className="font-medium text-slate-800">{e.student.user.name || '—'}</TableCell>
                          <TableCell className="text-slate-600">{e.competition.name}</TableCell>
                          <TableCell className="font-mono text-xs text-slate-500">{e.registration.registrationNo}</TableCell>
                          <TableCell>
                            {totalA === 0 ? <span className="text-slate-400">None</span> : (
                              <div className="flex flex-col gap-0.5">
                                {e.assignments.map(a => (
                                  <div key={a.id} className="flex items-center gap-1.5 text-xs">
                                    <Badge variant="secondary" className={`${evalStatusColor(a.status)} text-[10px] px-1.5 py-0`}>
                                      {a.examiner.user.name || 'Unknown'}
                                    </Badge>
                                    {a.evaluation?.totalMarks != null && <span className="text-slate-500">{a.evaluation.totalMarks}pts</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {totalA > 0 ? (
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(done / totalA) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{done}/{totalA}</span>
                              </div>
                            ) : <span className="text-slate-400 text-xs">—</span>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" className="h-7" onClick={() => openAssignDialog(e)}>
                              <UserPlus className="h-3.5 w-3.5 mr-1" /> Assign
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-slate-500">{(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}</p>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Assign Dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Examiners</DialogTitle>
            <DialogDescription>{assignTarget?.student.user.name} — {assignTarget?.registration.registrationNo}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Select Examiners ({selectedExaminers.length} selected)</p>
              <div className="max-h-[200px] overflow-y-auto rounded-lg border p-2 space-y-1">
                {examiners.length === 0 ? <p className="text-sm text-slate-400 p-2">No active examiners found</p> : examiners.map(ex => (
                  <label key={ex.id} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={selectedExaminers.includes(ex.id)} onChange={() => toggleExaminer(ex.id)} className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                    <span className="text-slate-700">{ex.user.name || 'Unknown'}</span>
                    <span className="text-slate-400 text-xs">{ex.user.email}</span>
                    <Badge variant="outline" className="ml-auto text-[10px]">{ex._count.evaluations} done</Badge>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Deadline (optional)</Label>
              <Input type="datetime-local" className="mt-1" value={assignDeadline} onChange={e => setAssignDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={assigning} onClick={handleAssign}>
              {assigning ? 'Assigning...' : `Assign ${selectedExaminers.length} Examiner(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
