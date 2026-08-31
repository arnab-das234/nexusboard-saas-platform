'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, FileUp, Eye, ChevronLeft, ChevronRight, FileText,
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
import { ESSAY_STATUS_LABELS } from '@/lib/constants';
import type { EssayStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Essay {
  id: string; studentName: string; competitionName: string;
  fileName: string; fileSize: string; status: EssayStatus; submittedAt: string;
}

const PAGE_SIZE = 10;

const MOCK: Essay[] = Array.from({ length: 38 }, (_, i) => ({
  id: `ESS-${String(i + 1).padStart(4, '0')}`,
  studentName: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer'][i % 5],
  competitionName: ['National Essay 2025', 'State Level Essay', 'Inter-School Essay'][i % 3],
  fileName: `essay_submission_${i + 1}.pdf`,
  fileSize: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`,
  status: (['SUBMITTED', 'VALIDATING', 'VALID', 'INVALID', 'UNDER_EVALUATION', 'EVALUATED', 'LOCKED'] as EssayStatus[])[i % 7],
  submittedAt: `2025-07-${String((i % 28) + 1).padStart(2, '0')} ${String(9 + (i % 10))}:${String((i * 7) % 60).padStart(2, '0')}`,
}));

function essayColor(s: EssayStatus) {
  const m: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-700', UPLOAD_PENDING: 'bg-amber-100 text-amber-700',
    UPLOADING: 'bg-amber-100 text-amber-700', VALIDATING: 'bg-amber-100 text-amber-700',
    VALID: 'bg-teal-100 text-teal-700', INVALID: 'bg-rose-100 text-rose-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700', LOCKED: 'bg-slate-100 text-slate-700',
    UNDER_EVALUATION: 'bg-teal-100 text-teal-700', EVALUATED: 'bg-emerald-100 text-emerald-700',
    RESULT_PUBLISHED: 'bg-emerald-100 text-emerald-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[450px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminEssaysView() {
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [previewEssay, setPreviewEssay] = useState<Essay | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-essays');
      const json = await res.json();
      if (json.success && json.data) { setEssays(json.data); return; }
    } catch {} finally { setLoading(false); }
    setEssays(MOCK);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = essays.filter((e) => {
    if (search && !e.id.toLowerCase().includes(search.toLowerCase()) && !e.studentName.toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (compFilter !== 'ALL' && e.competitionName !== compFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter, compFilter]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Essay Submissions</h1>
          <p className="text-sm text-slate-500">Monitor and manage essay uploads</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search essay ID or student..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(ESSAY_STATUS_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={compFilter} onValueChange={setCompFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Competition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Competitions</SelectItem>
            <SelectItem value="National Essay 2025">National Essay 2025</SelectItem>
            <SelectItem value="State Level Essay">State Level Essay</SelectItem>
            <SelectItem value="Inter-School Essay">Inter-School Essay</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileUp className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No essays found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead>Essay ID</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Competition</TableHead>
                <TableHead>File</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs font-medium text-slate-700">{e.id}</TableCell>
                  <TableCell className="font-medium text-slate-800">{e.studentName}</TableCell>
                  <TableCell className="text-slate-600">{e.competitionName}</TableCell>
                  <TableCell className="text-slate-500 max-w-[180px] truncate" title={e.fileName}>{e.fileName}</TableCell>
                  <TableCell className="text-slate-500">{e.fileSize}</TableCell>
                  <TableCell><Badge variant="secondary" className={essayColor(e.status)}>{ESSAY_STATUS_LABELS[e.status]}</Badge></TableCell>
                  <TableCell className="text-slate-500 text-xs">{e.submittedAt}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreviewEssay(e)} title="Preview">
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
            return <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setPage(p)}>{p}</Button>;
          })}
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewEssay} onOpenChange={() => setPreviewEssay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Essay Preview</DialogTitle>
            <DialogDescription>{previewEssay?.id}</DialogDescription>
          </DialogHeader>
          {previewEssay && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-slate-50">
                <FileText className="h-10 w-10 text-rose-500" />
                <div>
                  <p className="font-medium text-slate-800">{previewEssay.fileName}</p>
                  <p className="text-slate-500">{previewEssay.fileSize} • PDF</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Student</span><p className="font-medium text-slate-800">{previewEssay.studentName}</p></div>
                <div><span className="text-slate-500">Competition</span><p className="font-medium text-slate-800">{previewEssay.competitionName}</p></div>
                <div><span className="text-slate-500">Status</span><p><Badge variant="secondary" className={essayColor(previewEssay.status)}>{ESSAY_STATUS_LABELS[previewEssay.status]}</Badge></p></div>
                <div><span className="text-slate-500">Submitted</span><p className="font-medium text-slate-800">{previewEssay.submittedAt}</p></div>
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => toast.info('Download will be available once connected to Cloudinary')}>
                <FileUp className="h-4 w-4 mr-1.5" /> Download File
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
