'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Award, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface EvalScore {
  id: string;
  marks: number;
  comments: string | null;
  criterion: { name: string; maxMarks: number };
}

interface EvalItem {
  id: string;
  essayId: string;
  competitionId: string;
  totalMarks: number | null;
  status: string;
  submittedAt: string | null;
  essay: {
    student: { user: { name: string | null; email: string } };
    competition: { name: string };
    registration: { registrationNo: string; category: { id: string; name: string } | null };
  };
  examiner: { user: { name: string | null } };
  scores: EvalScore[];
}

interface CompOption { id: string; name: string; }

interface ResultRow {
  essayId: string;
  studentName: string;
  studentEmail: string;
  competitionId: string;
  competitionName: string;
  categoryName: string;
  regNo: string;
  evaluations: EvalItem[];
  avgScore: number;
  finalScore: number;
  status: string;
}

const PAGE_SIZE = 10;

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-800';
  if (rank === 2) return 'bg-slate-200 text-slate-700';
  if (rank === 3) return 'bg-orange-100 text-orange-700';
  return '';
}

function statusColor(s: string) {
  const m: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', CALCULATED: 'bg-teal-100 text-teal-700', PUBLISHED: 'bg-emerald-100 text-emerald-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function LoadingSkeleton() {
  return (<div className="space-y-4 p-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[460px] w-full rounded-lg" /></div>);
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load results</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminResultsView() {
  const [evaluations, setEvaluations] = useState<EvalItem[]>([]);
  const [competitions, setCompetitions] = useState<CompOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [compFilter, setCompFilter] = useState('ALL');
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchEvaluations = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ pageSize: '500' });
      if (compFilter !== 'ALL') params.set('competitionId', compFilter);
      const res = await fetch(`/api/evaluations?${params}`);
      const json = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setEvaluations(json.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setLoading(false); }
  }, [compFilter]);

  const fetchCompetitions = useCallback(async () => {
    try {
      const res = await fetch('/api/competitions');
      const json = await res.json();
      if (json.success) setCompetitions((json.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);
  useEffect(() => { fetchEvaluations(); }, [fetchEvaluations]);

  // Group evaluations by essayId and compute averages
  const submittedEvals = evaluations.filter(e => e.status === 'SUBMITTED' && e.totalMarks != null);

  const grouped = React.useMemo(() => {
    const map: Record<string, EvalItem[]> = {};
    submittedEvals.forEach(ev => {
      if (!map[ev.essayId]) map[ev.essayId] = [];
      map[ev.essayId].push(ev);
    });
    return map;
  }, [submittedEvals]);

  const rows: ResultRow[] = React.useMemo(() => {
    const result: ResultRow[] = Object.entries(grouped).map(([essayId, evals]) => {
      const avg = evals.reduce((s, e) => s + (e.totalMarks || 0), 0) / evals.length;
      return {
        essayId,
        studentName: evals[0].essay.student.user.name || 'Unknown',
        studentEmail: evals[0].essay.student.user.email,
        competitionId: evals[0].competitionId,
        competitionName: evals[0].essay.competition.name,
        categoryName: evals[0].essay.registration.category?.name || 'N/A',
        regNo: evals[0].essay.registration.registrationNo,
        evaluations: evals,
        avgScore: Math.round(avg * 100) / 100,
        finalScore: Math.round(avg * 100) / 100,
        status: 'CALCULATED',
        };
    });
    // Sort by finalScore desc
    result.sort((a, b) => b.finalScore - a.finalScore);
    return result;
  }, [grouped]);

  // Apply client-side filters
  const filteredRows = rows.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (catFilter !== 'ALL' && r.categoryName !== catFilter) return false;
    return true;
  });

  // Extract unique categories
  const categories = [...new Set(rows.map(r => r.categoryName))].filter(c => c !== 'N/A');

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const pageData = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleExpand = (essayId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(essayId)) next.delete(essayId); else next.add(essayId);
      return next;
    });
  };

  const handlePublish = () => {
    toast.success(`Results for ${compFilter === 'ALL' ? 'all competitions' : 'selected competition'} published`);
    setPublishOpen(false);
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchEvaluations} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Results</h1>
          <p className="text-sm text-slate-500">Review scores and publish results · {filteredRows.length} entries</p>
        </div>
        {filteredRows.length > 0 && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setPublishOpen(true)}>
            <Award className="h-4 w-4 mr-1.5" /> Publish Results
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={compFilter} onValueChange={v => { setCompFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Competition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Competitions</SelectItem>
            {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {categories.length > 0 && (
          <Select value={catFilter} onValueChange={v => { setCatFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="CALCULATED">Calculated</SelectItem>
            <SelectItem value="PUBLISHED">Published</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Award className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No results available</p>
          <p className="text-sm text-slate-400 mt-1">Results will appear once evaluations are submitted</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white max-h-[520px] overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-16">Rank</TableHead><TableHead>Student</TableHead><TableHead>Competition</TableHead>
              <TableHead>Category</TableHead><TableHead className="text-right">Avg Score</TableHead>
              <TableHead className="text-right">Final Score</TableHead><TableHead>Status</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {pageData.map((r, idx) => {
                const globalRank = filteredRows.indexOf(r) + 1;
                return (
                  <React.Fragment key={r.essayId}>
                    <TableRow>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleExpand(r.essayId)}>
                          {expandedIds.has(r.essayId) ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant={globalRank <= 3 ? 'secondary' : 'outline'} className={`font-bold ${rankBadge(globalRank)}`}>
                          {globalRank <= 3 ? ['🥇', '🥈', '🥉'][globalRank - 1] : `#${globalRank}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium text-slate-800">{r.studentName}</TableCell>
                      <TableCell className="text-slate-600">{r.competitionName}</TableCell>
                      <TableCell className="text-slate-500 text-xs">{r.categoryName}</TableCell>
                      <TableCell className="text-right font-mono text-slate-700">{r.avgScore}</TableCell>
                      <TableCell className="text-right font-mono font-semibold text-slate-800">{r.finalScore}</TableCell>
                      <TableCell><Badge variant="secondary" className={statusColor(r.status)}>{r.status}</Badge></TableCell>
                    </TableRow>
                    {expandedIds.has(r.essayId) && (
                      <TableRow key={`${r.essayId}-detail`}>
                        <TableCell colSpan={8} className="bg-slate-50 px-8 py-3">
                          <p className="text-xs font-medium text-slate-600 mb-2">Individual Examiner Scores ({r.evaluations.length} evaluators)</p>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {r.evaluations.map(ev => (
                              <Card key={ev.id} className="p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium text-slate-700">{ev.examiner.user.name || 'Examiner'}</span>
                                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">{ev.totalMarks}</Badge>
                                </div>
                                <div className="space-y-0.5">
                                  {ev.scores.map(sc => (
                                    <div key={sc.id} className="flex items-center justify-between text-xs text-slate-500">
                                      <span>{sc.criterion.name}</span>
                                      <span className="font-mono">{sc.marks}/{sc.criterion.maxMarks}</span>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {filteredRows.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let p = i + 1;
              if (totalPages > 5 && page > 3) p = page - 2 + i;
              if (p > totalPages) p = totalPages - (4 - i);
              if (p < 1) p = i + 1;
              return <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>;
            })}
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Award className="h-5 w-5 text-amber-500" /> Publish Results</DialogTitle>
            <DialogDescription>This will mark results as published and notify participants.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">You are about to publish results for:</p>
            <p className="mt-1 font-semibold">{compFilter === 'ALL' ? 'All Competitions' : competitions.find(c => c.id === compFilter)?.name}</p>
            <p className="mt-2">Total entries: <strong>{filteredRows.length}</strong></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={publishing} onClick={handlePublish}>{publishing ? 'Publishing...' : 'Publish Now'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
