'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Trophy, Calendar, ChevronLeft, ChevronRight, Eye, Pencil, Trash2, PlusCircle, X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { CompetitionStatus, CompetitionFormData } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface Competition {
  id: string; name: string; description: string; academicYear: string;
  status: CompetitionStatus;
  registrationOpenDate: string; registrationCloseDate: string;
  submissionOpenDate: string; submissionCloseDate: string;
  competitionDate: string; resultDeclarationDate: string;
  registrationFee: number; totalRegistrations: number;
  categories: { name: string; minAge: number; maxAge: number }[];
}

const PAGE_SIZE = 10;

const MOCK_COMPETITIONS: Competition[] = [
  {
    id: 'CMP-001', name: 'National Essay Writing Competition 2025',
    description: 'Annual national-level essay writing competition for school students across India.',
    academicYear: '2025-26', status: 'REGISTRATION_OPEN',
    registrationOpenDate: '2025-06-01', registrationCloseDate: '2025-07-31',
    submissionOpenDate: '2025-08-01', submissionCloseDate: '2025-08-31',
    competitionDate: '2025-09-15', resultDeclarationDate: '2025-10-15',
    registrationFee: 100, totalRegistrations: 487,
    categories: [{ name: 'Junior (10-13)', minAge: 10, maxAge: 13 }, { name: 'Senior (14-17)', minAge: 14, maxAge: 17 }, { name: 'Open (18+)', minAge: 18, maxAge: 25 }],
  },
  {
    id: 'CMP-002', name: 'State Level Essay Contest',
    description: 'State-level essay competition focusing on environmental themes.',
    academicYear: '2025-26', status: 'SUBMISSION_OPEN',
    registrationOpenDate: '2025-05-01', registrationCloseDate: '2025-06-15',
    submissionOpenDate: '2025-07-01', submissionCloseDate: '2025-07-31',
    competitionDate: '2025-08-20', resultDeclarationDate: '2025-09-20',
    registrationFee: 50, totalRegistrations: 234,
    categories: [{ name: 'Category A (12-14)', minAge: 12, maxAge: 14 }, { name: 'Category B (15-18)', minAge: 15, maxAge: 18 }],
  },
  {
    id: 'CMP-003', name: 'Inter-School Essay Challenge',
    description: 'An inter-school competition promoting creative writing skills.',
    academicYear: '2025-26', status: 'EVALUATION_IN_PROGRESS',
    registrationOpenDate: '2025-03-01', registrationCloseDate: '2025-04-15',
    submissionOpenDate: '2025-04-16', submissionCloseDate: '2025-05-15',
    competitionDate: '2025-06-10', resultDeclarationDate: '2025-07-10',
    registrationFee: 75, totalRegistrations: 312,
    categories: [{ name: 'Sub-Junior (8-11)', minAge: 8, maxAge: 11 }, { name: 'Junior (12-14)', minAge: 12, maxAge: 14 }],
  },
  {
    id: 'CMP-004', name: 'Creative Writing Marathon 2024',
    description: 'A marathon creative writing event for young writers.',
    academicYear: '2024-25', status: 'RESULT_PUBLISHED',
    registrationOpenDate: '2024-06-01', registrationCloseDate: '2024-07-15',
    submissionOpenDate: '2024-07-16', submissionCloseDate: '2024-08-15',
    competitionDate: '2024-09-01', resultDeclarationDate: '2024-10-01',
    registrationFee: 100, totalRegistrations: 567,
    categories: [{ name: 'Junior', minAge: 10, maxAge: 13 }, { name: 'Senior', minAge: 14, maxAge: 17 }],
  },
  {
    id: 'CMP-005', name: 'Environmental Awareness Essay',
    description: 'Essay competition on environmental sustainability.',
    academicYear: '2025-26', status: 'DRAFT',
    registrationOpenDate: '2025-09-01', registrationCloseDate: '2025-10-15',
    submissionOpenDate: '2025-10-16', submissionCloseDate: '2025-11-15',
    competitionDate: '2025-12-01', resultDeclarationDate: '2026-01-15',
    registrationFee: 0, totalRegistrations: 0,
    categories: [{ name: 'Open', minAge: 10, maxAge: 18 }],
  },
  {
    id: 'CMP-006', name: 'Science & Technology Essay 2025',
    description: 'Exploring the future of technology through essays.',
    academicYear: '2025-26', status: 'CANCELLED',
    registrationOpenDate: '2025-04-01', registrationCloseDate: '2025-05-15',
    submissionOpenDate: '2025-05-16', submissionCloseDate: '2025-06-15',
    competitionDate: '2025-07-01', resultDeclarationDate: '2025-08-01',
    registrationFee: 80, totalRegistrations: 45,
    categories: [{ name: 'Group A', minAge: 12, maxAge: 15 }, { name: 'Group B', minAge: 16, maxAge: 19 }],
  },
];

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

const emptyForm: CompetitionFormData = {
  name: '', description: '', academicYear: '2025-26',
  registrationOpenDate: '', registrationCloseDate: '',
  submissionOpenDate: '', submissionCloseDate: '',
  competitionDate: '', resultDeclarationDate: '',
  minAge: 10, maxAge: 18, ageCalculationDate: '',
  registrationFee: 100, maxEssayFileSize: 5,
  rules: '', categories: [{ name: '', minAge: 10, maxAge: 14 }],
  criteria: [{ name: 'Content', maxMarks: 40 }, { name: 'Language', maxMarks: 30 }, { name: 'Creativity', maxMarks: 30 }],
};

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-48 rounded-lg" /><Skeleton className="h-48 rounded-lg" /></div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminCompetitionsView() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'cards'>('cards');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CompetitionFormData>(emptyForm);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailComp, setDetailComp] = useState<Competition | null>(null);

  const fetchCompetitions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-competitions');
      const json = await res.json();
      if (json.success && json.data) { setCompetitions(json.data); return; }
    } catch {} finally { setLoading(false); }
    setCompetitions(MOCK_COMPETITIONS);
  }, []);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);

  const filtered = competitions.filter((c) => {
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEdit = (c: Competition) => {
    setEditingId(c.id);
    setForm({
      name: c.name, description: c.description, academicYear: c.academicYear,
      registrationOpenDate: c.registrationOpenDate, registrationCloseDate: c.registrationCloseDate,
      submissionOpenDate: c.submissionOpenDate, submissionCloseDate: c.submissionCloseDate,
      competitionDate: c.competitionDate, resultDeclarationDate: c.resultDeclarationDate,
      minAge: 10, maxAge: 18, ageCalculationDate: c.registrationOpenDate,
      registrationFee: c.registrationFee, maxEssayFileSize: 5,
      rules: '', categories: c.categories.map((x) => ({ name: x.name, minAge: x.minAge, maxAge: x.maxAge })),
      criteria: [{ name: 'Content', maxMarks: 40 }, { name: 'Language', maxMarks: 30 }, { name: 'Creativity', maxMarks: 30 }],
    });
    setFormOpen(true);
  };

  const saveForm = () => {
    toast.success(editingId ? 'Competition updated' : 'Competition created');
    setFormOpen(false);
  };

  const changeStatus = (c: Competition, newStatus: CompetitionStatus) => {
    setCompetitions((prev) => prev.map((x) => x.id === c.id ? { ...x, status: newStatus } : x));
    toast.success(`${c.name} → ${COMPETITION_STATUS_LABELS[newStatus]}`);
  };

  const addCategory = () => setForm((f) => ({ ...f, categories: [...f.categories, { name: '', minAge: 0, maxAge: 0 }] }));
  const removeCategory = (i: number) => setForm((f) => ({ ...f, categories: f.categories.filter((_, idx) => idx !== i) }));
  const updateCategory = (i: number, key: string, value: string | number) =>
    setForm((f) => ({ ...f, categories: f.categories.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  const addCriterion = () => setForm((f) => ({ ...f, criteria: [...f.criteria, { name: '', maxMarks: 0 }] }));
  const removeCriterion = (i: number) => setForm((f) => ({ ...f, criteria: f.criteria.filter((_, idx) => idx !== i) }));
  const updateCriterion = (i: number, key: string, value: string | number) =>
    setForm((f) => ({ ...f, criteria: f.criteria.map((c, idx) => idx === i ? { ...c, [key]: value } : c) }));

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Competitions</h1>
          <p className="text-sm text-slate-500">Create and manage essay competitions</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Competition
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Input placeholder="Search competitions..." className="max-w-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="All Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(COMPETITION_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex rounded-md border overflow-hidden">
          <Button variant={view === 'cards' ? 'default' : 'ghost'} size="sm" onClick={() => setView('cards')} className="rounded-none">Cards</Button>
          <Button variant={view === 'table' ? 'default' : 'ghost'} size="sm" onClick={() => setView('table')} className="rounded-none">Table</Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Trophy className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No competitions found</p>
          <p className="text-sm text-slate-400 mt-1">Create a new competition to get started</p>
        </div>
      ) : view === 'cards' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => (
            <Card key={c.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-800 leading-tight line-clamp-2">{c.name}</h3>
                  <Badge variant="secondary" className={`shrink-0 ${COMPETITION_STATUS_COLORS[c.status]}`}>
                    {COMPETITION_STATUS_LABELS[c.status]}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 line-clamp-2">{c.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>📅 {c.registrationOpenDate}</span>
                  <span>👥 {c.totalRegistrations} registrations</span>
                  <span>💰 ₹{c.registrationFee}</span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => { setDetailComp(c); setDetailOpen(true); }}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  {STATUS_TRANSITIONS[c.status]?.length > 0 && (
                    <Select onValueChange={(v) => changeStatus(c, v as CompetitionStatus)}>
                      <SelectTrigger size="sm" className="w-[130px] h-8 text-xs"><SelectValue placeholder="Change Status" /></SelectTrigger>
                      <SelectContent>
                        {STATUS_TRANSITIONS[c.status].map((s) => (
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
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Name</TableHead>
                <TableHead>Academic Year</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Registrations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium text-slate-800 max-w-[250px] truncate">{c.name}</TableCell>
                  <TableCell>{c.academicYear}</TableCell>
                  <TableCell>₹{c.registrationFee}</TableCell>
                  <TableCell>{c.totalRegistrations}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={COMPETITION_STATUS_COLORS[c.status]}>{COMPETITION_STATUS_LABELS[c.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setDetailComp(c); setDetailOpen(true); }}><Eye className="h-4 w-4 text-slate-500" /></Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(c)}><Pencil className="h-4 w-4 text-slate-500" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailComp?.name}</DialogTitle>
            <DialogDescription>{detailComp?.description}</DialogDescription>
          </DialogHeader>
          {detailComp && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Status</span><p><Badge variant="secondary" className={COMPETITION_STATUS_COLORS[detailComp.status]}>{COMPETITION_STATUS_LABELS[detailComp.status]}</Badge></p></div>
                <div><span className="text-slate-500">Academic Year</span><p className="font-medium text-slate-800">{detailComp.academicYear}</p></div>
                <div><span className="text-slate-500">Registration</span><p className="font-medium text-slate-800">{detailComp.registrationOpenDate} → {detailComp.registrationCloseDate}</p></div>
                <div><span className="text-slate-500">Submission</span><p className="font-medium text-slate-800">{detailComp.submissionOpenDate} → {detailComp.submissionCloseDate}</p></div>
                <div><span className="text-slate-500">Competition Date</span><p className="font-medium text-slate-800">{detailComp.competitionDate}</p></div>
                <div><span className="text-slate-500">Result Date</span><p className="font-medium text-slate-800">{detailComp.resultDeclarationDate}</p></div>
                <div><span className="text-slate-500">Fee</span><p className="font-medium text-slate-800">₹{detailComp.registrationFee}</p></div>
                <div><span className="text-slate-500">Total Registrations</span><p className="font-medium text-slate-800">{detailComp.totalRegistrations}</p></div>
              </div>
              <div>
                <span className="text-slate-500">Categories</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {detailComp.categories.map((cat, i) => (
                    <Badge key={i} variant="outline" className="text-teal-600 border-teal-200">{cat.name} ({cat.minAge}-{cat.maxAge} yrs)</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Competition' : 'Create Competition'}</DialogTitle>
            <DialogDescription>{editingId ? 'Update competition details' : 'Fill in the competition details below'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Basic Information</h4>
              <div><Label>Name</Label><Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea className="mt-1" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Academic Year</Label><Input className="mt-1" value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} /></div>
                <div><Label>Registration Fee (₹)</Label><Input type="number" className="mt-1" value={form.registrationFee} onChange={(e) => setForm({ ...form, registrationFee: Number(e.target.value) })} /></div>
              </div>
            </div>

            {/* Dates */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Important Dates</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Registration Open</Label><Input type="date" className="mt-1" value={form.registrationOpenDate} onChange={(e) => setForm({ ...form, registrationOpenDate: e.target.value })} /></div>
                <div><Label>Registration Close</Label><Input type="date" className="mt-1" value={form.registrationCloseDate} onChange={(e) => setForm({ ...form, registrationCloseDate: e.target.value })} /></div>
                <div><Label>Submission Open</Label><Input type="date" className="mt-1" value={form.submissionOpenDate} onChange={(e) => setForm({ ...form, submissionOpenDate: e.target.value })} /></div>
                <div><Label>Submission Close</Label><Input type="date" className="mt-1" value={form.submissionCloseDate} onChange={(e) => setForm({ ...form, submissionCloseDate: e.target.value })} /></div>
                <div><Label>Competition Date</Label><Input type="date" className="mt-1" value={form.competitionDate} onChange={(e) => setForm({ ...form, competitionDate: e.target.value })} /></div>
                <div><Label>Result Date</Label><Input type="date" className="mt-1" value={form.resultDeclarationDate} onChange={(e) => setForm({ ...form, resultDeclarationDate: e.target.value })} /></div>
              </div>
            </div>

            {/* Age & File */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 border-b pb-1">Eligibility & Rules</h4>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Min Age</Label><Input type="number" className="mt-1" value={form.minAge} onChange={(e) => setForm({ ...form, minAge: Number(e.target.value) })} /></div>
                <div><Label>Max Age</Label><Input type="number" className="mt-1" value={form.maxAge} onChange={(e) => setForm({ ...form, maxAge: Number(e.target.value) })} /></div>
                <div><Label>Age Calc Date</Label><Input type="date" className="mt-1" value={form.ageCalculationDate} onChange={(e) => setForm({ ...form, ageCalculationDate: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Max File Size (MB)</Label><Input type="number" className="mt-1" value={form.maxEssayFileSize} onChange={(e) => setForm({ ...form, maxEssayFileSize: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Rules</Label><Textarea className="mt-1" rows={3} value={form.rules} onChange={(e) => setForm({ ...form, rules: e.target.value })} placeholder="Enter competition rules..." /></div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-slate-700">Categories</h4>
                <Button type="button" size="sm" variant="outline" onClick={addCategory}><PlusCircle className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              {form.categories.map((cat, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs">Name</Label><Input className="mt-0.5 h-8 text-sm" value={cat.name} onChange={(e) => updateCategory(i, 'name', e.target.value)} /></div>
                  <div className="w-20"><Label className="text-xs">Min Age</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cat.minAge} onChange={(e) => updateCategory(i, 'minAge', Number(e.target.value))} /></div>
                  <div className="w-20"><Label className="text-xs">Max Age</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cat.maxAge} onChange={(e) => updateCategory(i, 'maxAge', Number(e.target.value))} /></div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeCategory(i)}><X className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
            </div>

            {/* Criteria */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-1">
                <h4 className="text-sm font-semibold text-slate-700">Evaluation Criteria</h4>
                <Button type="button" size="sm" variant="outline" onClick={addCriterion}><PlusCircle className="h-3.5 w-3.5 mr-1" /> Add</Button>
              </div>
              {form.criteria.map((cr, i) => (
                <div key={i} className="flex items-end gap-2">
                  <div className="flex-1"><Label className="text-xs">Criterion Name</Label><Input className="mt-0.5 h-8 text-sm" value={cr.name} onChange={(e) => updateCriterion(i, 'name', e.target.value)} /></div>
                  <div className="w-24"><Label className="text-xs">Max Marks</Label><Input type="number" className="mt-0.5 h-8 text-sm" value={cr.maxMarks} onChange={(e) => updateCriterion(i, 'maxMarks', Number(e.target.value))} /></div>
                  <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => removeCriterion(i)}><X className="h-4 w-4 text-rose-500" /></Button>
                </div>
              ))}
              <p className="text-xs text-slate-500">Total marks: {form.criteria.reduce((a, c) => a + c.maxMarks, 0)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={saveForm}>{editingId ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
