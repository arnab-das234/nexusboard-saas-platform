'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trophy, Eye, AlertCircle, RefreshCw, Loader2, PlusCircle, X, CalendarDays, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { COMPETITION_STATUS_LABELS, COMPETITION_STATUS_COLORS } from '@/lib/constants';
import type { CompetitionStatus, ApiResponse } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface CategoryData { name: string; minAge: number; maxAge: number; description?: string; }
interface CriterionData { name: string; maxMarks: number; description?: string; }

interface CompetitionData {
  id: string;
  name: string;
  description: string | null;
  academicYear: string | null;
  status: string;
  registrationOpenDate: string | null;
  registrationCloseDate: string | null;
  submissionOpenDate: string | null;
  submissionCloseDate: string | null;
  competitionDate: string | null;
  resultDeclarationDate: string;
  registrationFee: number;
  minAge: number;
  maxAge: number;
  rules: string | null;
  categories: { id: string; name: string; minAge: number; maxAge: number; description: string | null }[];
  criteria: { id: string; name: string; maxMarks: number; description: string | null; sortOrder: number }[];
  scoringConfig: {
    id: string;
    examinerCount: number;
    maxMarks: number;
    averagingMethod: string;
    blindEvaluation: boolean;
  } | null;
  _count: { registrations: number; essays: number; results: number };
  createdAt: string;
}

const STATUS_TRANSITIONS: Record<string, CompetitionStatus[]> = {
  DRAFT: ['REGISTRATION_OPEN', 'CANCELLED'],
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['SUBMISSION_OPEN', 'CANCELLED'],
  SUBMISSION_OPEN: ['SUBMISSION_CLOSED', 'CANCELLED'],
  SUBMISSION_CLOSED: ['EVALUATION_IN_PROGRESS'],
  EVALUATION_IN_PROGRESS: ['RESULT_PENDING'],
  RESULT_PENDING: ['RESULT_PUBLISHED'],
  RESULT_PUBLISHED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

interface FormData {
  name: string; description: string; academicYear: string;
  registrationOpenDate: string; registrationCloseDate: string;
  submissionOpenDate: string; submissionCloseDate: string;
  competitionDate: string; resultDeclarationDate: string;
  minAge: number; maxAge: number; ageCalculationDate: string;
  registrationFee: number; rules: string;
  categories: CategoryData[]; criteria: CriterionData[];
  examinerCount: number; averagingMethod: string; blindEvaluation: boolean;
}

const emptyForm: FormData = {
  name: '', description: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1).toString().slice(2),
  registrationOpenDate: '', registrationCloseDate: '',
  submissionOpenDate: '', submissionCloseDate: '',
  competitionDate: '', resultDeclarationDate: '',
  minAge: 10, maxAge: 18, ageCalculationDate: '',
  registrationFee: 100, rules: '',
  categories: [{ name: '', minAge: 10, maxAge: 14 }],
  criteria: [{ name: 'Content', maxMarks: 40 }, { name: 'Language', maxMarks: 30 }, { name: 'Creativity', maxMarks: 30 }],
  examinerCount: 3, averagingMethod: 'MEAN', blindEvaluation: true,
};

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ListSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between"><Skeleton className="h-7 w-48" /><Skeleton className="h-9 w-40" /></div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminCompetitionsView() {
  const [competitions, setCompetitions] = useState<CompetitionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  // Create dialog
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailComp, setDetailComp] = useState<CompetitionData | null>(null);

  // Status change loading
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      const res = await fetch(`/api/competitions?${params.toString()}`);
      const json: ApiResponse<CompetitionData[]> = await res.json();
      if (!json.success) { setError(json.error || 'Failed to load competitions'); return; }
      setCompetitions(json.data || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);

  const filtered = competitions.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Create ─────────────────────────────────────────────────────────────────
  const openCreate = () => { setForm(emptyForm); setFormOpen(true); };

  const addCategory = () => setForm((f) => ({ ...f, categories: [...f.categories, { name: '', minAge: 0, maxAge: 0 }] }));
  const removeCategory = (i: number) => setForm((f) => ({ ...f, categories: f.categories.filter((_, idx) => idx !== i) }));
  const updateCategory = (i: number, key: keyof CategoryData, value: string | number) =>
    setForm((f) => ({ ...f, categories: f.categories.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  const addCriterion = () => setForm((f) => ({ ...f, criteria: [...f.criteria, { name: '', maxMarks: 0 }] }));
  const removeCriterion = (i: number) => setForm((f) => ({ ...f, criteria: f.criteria.filter((_, idx) => idx !== i) }));
  const updateCriterion = (i: number, key: keyof CriterionData, value: string | number) =>
    setForm((f) => ({ ...f, criteria: f.criteria.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { toast.error('Competition name is required'); return; }
    if (form.categories.length === 0 || !form.categories.some((c) => c.name.trim())) { toast.error('At least one category with a name is required'); return; }
    if (form.criteria.length === 0 || !form.criteria.some((c) => c.name.trim() && c.maxMarks > 0)) { toast.error('At least one criterion with name and marks is required'); return; }
    if (!form.ageCalculationDate) { toast.error('Age calculation date is required'); return; }

    setSubmitting(true);
    try {
      const res = await fetch('/api/competitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, description: form.description || undefined, academicYear: form.academicYear || undefined,
          registrationOpenDate: form.registrationOpenDate || undefined, registrationCloseDate: form.registrationCloseDate || undefined,
          submissionOpenDate: form.submissionOpenDate || undefined, submissionCloseDate: form.submissionCloseDate || undefined,
          competitionDate: form.competitionDate || undefined, resultDeclarationDate: form.resultDeclarationDate || undefined,
          minAge: form.minAge, maxAge: form.maxAge, ageCalculationDate: form.ageCalculationDate,
          registrationFee: form.registrationFee, rules: form.rules || undefined,
          categories: form.categories.filter((c) => c.name.trim()),
          criteria: form.criteria.filter((c) => c.name.trim() && c.maxMarks > 0),
          examinerCount: form.examinerCount, averagingMethod: form.averagingMethod, blindEvaluation: form.blindEvaluation,
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to create competition'); return; }
      toast.success('Competition created successfully');
      setFormOpen(false);
      fetchCompetitions();
    } catch {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Status Change ──────────────────────────────────────────────────────────
  const changeStatus = async (comp: CompetitionData, newStatus: CompetitionStatus) => {
    setStatusLoading(comp.id);
    try {
      const res = await fetch('/api/competitions?action=update-status', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: comp.id, status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to update status'); return; }
      toast.success(`${comp.name} → ${COMPETITION_STATUS_LABELS[newStatus]}`);
      fetchCompetitions();
    } catch {
      toast.error('Network error');
    } finally {
      setStatusLoading(null);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const fmtDate = (d: string | null) => (d ? new Date(d).toLocaleDateString() : '—');

  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Competitions</h1>
          <p className="text-sm text-slate-500">Create and manage essay writing competitions</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Competition
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search competitions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(COMPETITION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchCompetitions} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
        <div className="flex rounded-md border overflow-hidden">
          <Button variant={view === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setView('cards')} className="rounded-none">Cards</Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setView('table')} className="rounded-none">Table</Button>
        </div>
      </div>

      {/* Loading */}
      {loading && <ListSkeleton />}

      {/* Error */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
          <p className="text-slate-600 font-medium">Failed to load competitions</p>
          <p className="text-sm text-slate-400 mt-1 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchCompetitions}><RefreshCw className="h-4 w-4 mr-1" /> Retry</Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No competitions found</p>
          <p className="text-sm text-slate-400 mt-1">Create a new competition to get started</p>
        </div>
      )}

      {/* Cards View */}
      {!loading && !error && filtered.length > 0 && view === 'cards' && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 leading-tight line-clamp-2">{c.name}</h3>
                  <Badge variant="secondary" className={`shrink-0 ${COMPETITION_STATUS_COLORS[c.status as CompetitionStatus] || ''}` }>
                    {COMPETITION_STATUS_LABELS[c.status as CompetitionStatus] || c.status}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{c.description || 'No description'}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {fmtDate(c.registrationOpenDate)}</span>
                  <span>👥 {c._count.registrations}</span>
                  <span>💰 ₹{c.registrationFee}</span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {c.categories.map((cat) => (
                    <Badge key={cat.id} variant="outline" className="text-xs text-teal-600 border-teal-200">
                      {cat.name} ({cat.minAge}-{cat.maxAge})
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1 border-t">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDetailComp(c); setDetailOpen(true); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  {STATUS_TRANSITIONS[c.status]?.length > 0 && (
                    <Select onValueChange={(v) => changeStatus(c, v as CompetitionStatus)}>
                      <SelectTrigger size="sm" className="w-[130px] h-8 text-xs" disabled={statusLoading === c.id}>
                        {statusLoading === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue placeholder="Status" />}
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_TRANSITIONS[c.status]?.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">{COMPETITION_STATUS_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Table View */}
      {!loading && !error && filtered.length > 0 && view === 'table' && (
        <div className="rounded-lg border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>Name</TableHead>
                  <TableHead>Academic Year</TableHead>
                  <TableHead>Fee</TableHead>
                  <TableHead>Registrations</TableHead>
                  <TableHead>Essays</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium text-slate-800 max-w-[250px] truncate">{c.name}</TableCell>
                    <TableCell>{c.academicYear || '—'}</TableCell>
                    <TableCell>₹{c.registrationFee}</TableCell>
                    <TableCell>{c._count.registrations}</TableCell>
                    <TableCell>{c._count.essays}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={COMPETITION_STATUS_COLORS[c.status as CompetitionStatus] || ''}>
                        {COMPETITION_STATUS_LABELS[c.status as CompetitionStatus] || c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDetailComp(c); setDetailOpen(true); }}>
                          <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                        {STATUS_TRANSITIONS[c.status]?.length > 0 && (
                          <Select onValueChange={(v) => changeStatus(c, v as CompetitionStatus)}>
                            <SelectTrigger size="sm" className="w-[120px] h-8 text-xs" disabled={statusLoading === c.id}>
                              {statusLoading === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue placeholder="Change" />}
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_TRANSITIONS[c.status]?.map((s) => (
                                <SelectItem key={s} value={s} className="text-xs">{COMPETITION_STATUS_LABELS[s]}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailComp?.name}</DialogTitle>
            <DialogDescription>{detailComp?.description || 'No description'}</DialogDescription>
          </DialogHeader>
          {detailComp && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Status</span><p><Badge variant="secondary" className={COMPETITION_STATUS_COLORS[detailComp.status as CompetitionStatus]}>{COMPETITION_STATUS_LABELS[detailComp.status as CompetitionStatus]}</Badge></p></div>
                <div><span className="text-slate-500">Academic Year</span><p className="font-medium text-slate-800">{detailComp.academicYear || '—'}</p></div>
                <div><span className="text-slate-500">Registration</span><p className="font-medium text-slate-800">{fmtDate(detailComp.registrationOpenDate)} → {fmtDate(detailComp.registrationCloseDate)}</p></div>
                <div><span className="text-slate-500">Submission</span><p className="font-medium text-slate-800">{fmtDate(detailComp.submissionOpenDate)} → {fmtDate(detailComp.submissionCloseDate)}</p></div>
                <div><span className="text-slate-500">Competition Date</span><p className="font-medium text-slate-800">{fmtDate(detailComp.competitionDate)}</p></div>
                <div><span className="text-slate-500">Result Date</span><p className="font-medium text-slate-800">{fmtDate(detailComp.resultDeclarationDate)}</p></div>
                <div><span className="text-slate-500">Fee</span><p className="font-medium text-slate-800">₹{detailComp.registrationFee}</p></div>
                <div><span className="text-slate-500">Registrations / Essays</span><p className="font-medium text-slate-800">{detailComp._count.registrations} / {detailComp._count.essays}</p></div>
              </div>
              <div>
                <span className="text-slate-500">Categories</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailComp.categories.map((cat) => (
                    <Badge key={cat.id} variant="outline" className="text-teal-600 border-teal-200">{cat.name} ({cat.minAge}-{cat.maxAge} yrs)</Badge>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Evaluation Criteria</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailComp.criteria.map((cr) => (
                    <Badge key={cr.id} variant="outline" className="text-slate-600 border-slate-200">{cr.name}: {cr.maxMarks} marks</Badge>
                  ))}
                </div>
              </div>
              {detailComp.scoringConfig && (
                <div>
                  <span className="text-slate-500">Scoring Configuration</span>
                  <div className="grid grid-cols-3 gap-3 mt-1">
                    <p className="font-medium text-slate-800">Examiners: {detailComp.scoringConfig.examinerCount}</p>
                    <p className="font-medium text-slate-800">Method: {detailComp.scoringConfig.averagingMethod}</p>
                    <p className="font-medium text-slate-800">Blind: {detailComp.scoringConfig.blindEvaluation ? 'Yes' : 'No'}</p>
                  </div>
                </div>
              )}
              {detailComp.rules && (
                <div><span className="text-slate-500">Rules</span><p className="mt-1 text-slate-700 whitespace-pre-wrap">{detailComp.rules}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Competition Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Competition</DialogTitle>
            <DialogDescription>Fill in the competition details below</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            {/* Basic Info */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Basic Information</h4>
              <div><Label>Name *</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g., National Essay Writing Competition 2025" /></div>
              <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the competition..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Academic Year</Label><Input className="mt-1" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></div>
                <div><Label>Registration Fee (₹)</Label><Input type="number" className="mt-1" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: Number(e.target.value) })} /></div>
              </div>
            </section>

            {/* Dates */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Important Dates</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Registration Open</Label><Input type="date" className="mt-1" value={form.registrationOpenDate} onChange={(e) => setForm({ ...form, registrationOpenDate: e.target.value })} /></div>
                <div><Label>Registration Close</Label><Input type="date" className="mt-1" value={form.registrationCloseDate} onChange={(e) => setForm({ ...form, registrationCloseDate: e.target.value })} /></div>
                <div><Label>Submission Open</Label><Input type="date" className="mt-1" value={form.submissionOpenDate} onChange={(e) => setForm({ ...form, submissionOpenDate: e.target.value })} /></div>
                <div><Label>Submission Close</Label><Input type="date" className="mt-1" value={form.submissionCloseDate} onChange={(e) => setForm({ ...form, submissionCloseDate: e.target.value })} /></div>
                <div><Label>Competition Date</Label><Input type="date" className="mt-1" value={form.competitionDate} onChange={(e) => setForm({ ...form, competitionDate: e.target.value })} /></div>
                <div><Label>Result Date</Label><Input type="date" className="mt-1" value={form.resultDeclarationDate} onChange={(e) => setForm({ ...form, resultDeclarationDate: e.target.value })} /></div>
              </div>
            </section>

            {/* Age & Rules */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Eligibility & Rules</h4>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Min Age</Label><Input type="number" className="mt-1" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} /></div>
                <div><Label>Max Age</Label><Input type="number" className="mt-1" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} /></div>
                <div><Label>Age Calc Date *</Label><Input type="date" className="mt-1" value={form.ageCalculationDate} onChange={(e) => setForm({ ...form, ageCalculationDate: e.target.value })} /></div>
              </div>
              <div><Label>Rules</Label><Textarea className="mt-1" rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Enter competition rules..." /></div>
            </section>

            {/* Categories */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-slate-700">Categories *</h4>
                <Button type="button" size="sm" variant="outline" onClick={addCategory}><PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Category</Button>
              </div>
              {form.categories.map((cat, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs">Name</Label><Input className="mt-0.5 h-8 text-sm" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} placeholder="e.g., Junior" /></div>
                  <div className="w-24"><Label className="text-xs">Min Age</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cat.minAge} onChange={(e) => updateCategory(i, 'minAge', Number(e.target.value))} /></div>
                  <div className="w-24"><Label className="text-xs">Max Age</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cat.maxAge} onChange={(e) => updateCategory(i, 'maxAge', Number(e.target.value))} /></div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeCategory(i)} disabled={form.categories.length <= 1}><X className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </section>

            {/* Criteria */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-slate-700">Evaluation Criteria *</h4>
                <Button type="button" size="sm" variant="outline" onClick={addCriterion}><PlusCircle className="h-3.5 w-3.5 mr-1" /> Add Criterion</Button>
              </div>
              {form.criteria.map((cr, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs">Criterion Name</Label><Input className="mt-0.5 h-8 text-sm" value={cr.name} onChange={(e) => updateCriterion(i, 'name', e.target.value)} placeholder="e.g., Content" /></div>
                  <div className="w-24"><Label className="text-xs">Max Marks</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cr.maxMarks} onChange={(e) => updateCriterion(i, 'maxMarks', Number(e.target.value))} /></div>
                  <div className="flex-1 hidden sm:block"><Label className="text-xs">Description</Label><Input className="mt-0.5 h-8 text-sm" value={cr.description || ''} onChange={(e) => updateCriterion(i, 'description', e.target.value)} placeholder="Optional" /></div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeCriterion(i)} disabled={form.criteria.length <= 1}><X className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
              <p className="text-xs text-slate-500">Total marks: {form.criteria.reduce((a, c) => a + c.maxMarks, 0)}</p>
            </section>

            {/* Scoring Config */}
            <section className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Scoring Configuration</h4>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Examiner Count</Label><Input type="number" className="mt-1" min={1} max={10} value={form.examinerCount} onChange={(e) => setForm({ ...form, examinerCount: Number(e.target.value) })} /></div>
                <div><Label>Averaging Method</Label>
                  <Select value={form.averagingMethod} onValueChange={(v) => setForm({ ...form, averagingMethod: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="MEAN">Mean</SelectItem><SelectItem value="MEDIAN">Median</SelectItem><SelectItem value="TRIMMED_MEAN">Trimmed Mean</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <Switch checked={form.blindEvaluation} onCheckedChange={(v) => setForm({ ...form, blindEvaluation: v })} />
                  <Label className="text-sm">Blind Evaluation</Label>
                </div>
              </div>
            </section>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting} onClick={handleSubmit}>
              {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {submitting ? 'Creating...' : 'Create Competition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
