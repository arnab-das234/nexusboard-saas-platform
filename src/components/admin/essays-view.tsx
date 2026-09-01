'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { FileUp, Eye, ChevronLeft, ChevronRight, AlertCircle, RefreshCw, Search, Lock, CheckCircle, XCircle, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ESSAY_STATUS_LABELS } from '@/lib/constants';
import type { EssayStatus, PaginatedResponse } from '@/lib/types';
import { toast } from 'sonner';

interface EssayItem {
  id: string;
  fileName: string | null;
  originalName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  status: EssayStatus;
  submittedAt: string | null;
  validatedAt: string | null;
  validationNotes: string | null;
  student: { user: { name: string | null; email: string } };
  competition: { id: string; name: string; status: string };
  registration: { registrationNo: string; category: { name: string } | null };
}

interface CompOption { id: string; name: string; }

const PAGE_SIZE = 10;

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

function formatSize(bytes: number | null) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[460px] w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load essays</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminEssaysView() {
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [competitions, setCompetitions] = useState<CompOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [compFilter, setCompFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [previewEssay, setPreviewEssay] = useState<EssayItem | null>(null);
  const [validateOpen, setValidateOpen] = useState(false);
  const [validateTarget, setValidateTarget] = useState<EssayItem | null>(null);
  const [validateAction, setValidateAction] = useState<'approve' | 'reject'>('approve');
  const [validateNotes, setValidateNotes] = useState('');
  const [validating, setValidating] = useState(false);

  const fetchEssays = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (compFilter !== 'ALL') params.set('competitionId', compFilter);
      const res = await fetch(`/api/essays?${params}`);
      const json: PaginatedResponse<EssayItem> = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setEssays(json.data || []);
      setTotal(json.total || 0);
      setTotalPages(json.totalPages || 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setLoading(false); }
  }, [page, statusFilter, compFilter]);

  const fetchCompetitions = useCallback(async () => {
    try {
      const res = await fetch('/api/competitions');
      const json = await res.json();
      if (json.success) setCompetitions((json.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);
  useEffect(() => { setPage(1); }, [statusFilter, compFilter]);
  useEffect(() => { fetchEssays(); }, [fetchEssays]);

  const filtered = search
    ? essays.filter(e => e.registration.registrationNo.toLowerCase().includes(search.toLowerCase()) || e.student.user.name?.toLowerCase().includes(search.toLowerCase()))
    : essays;

  const openValidate = (essay: EssayItem, action: 'approve' | 'reject') => {
    setValidateTarget(essay);
    setValidateAction(action);
    setValidateNotes('');
    setValidateOpen(true);
  };

  const handleValidate = async () => {
    if (!validateTarget) return;
    setValidating(true);
    try {
      const res = await fetch('/api/essays?action=validate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: validateTarget.id, isValid: validateAction === 'approve', notes: validateNotes || undefined }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed'); return; }
      toast.success(`Essay ${validateAction === 'approve' ? 'approved' : 'rejected'}`);
      setValidateOpen(false);
      fetchEssays();
    } catch { toast.error('Network error'); }
    finally { setValidating(false); }
  };

  const canValidate = (s: EssayStatus) => s === 'SUBMITTED' || s === 'VALIDATING';
  const canLock = (s: EssayStatus) => s === 'VALID' || s === 'SUBMITTED';

  if (error && !loading) return <ErrorState message={error} onRetry={fetchEssays} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Essay Submissions</h1>
          <p className="text-sm text-slate-500">Monitor and validate essay uploads · {total} total</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search reg no or student name..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[170px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {Object.entries(ESSAY_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={compFilter} onValueChange={setCompFilter}>
          <SelectTrigger className="w-[220px]"><SelectValue placeholder="Competition" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Competitions</SelectItem>
            {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileUp className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No essays found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white max-h-[500px] overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
              <TableHead>Student</TableHead><TableHead>Competition</TableHead><TableHead>Reg No</TableHead>
              <TableHead>File Name</TableHead><TableHead>Size</TableHead><TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead><TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium text-slate-800">{e.student.user.name || '—'}</TableCell>
                  <TableCell className="text-slate-600">{e.competition.name}</TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">{e.registration.registrationNo}</TableCell>
                  <TableCell className="text-slate-500 max-w-[160px] truncate" title={e.originalName || e.fileName || ''}>{e.originalName || e.fileName || '—'}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{formatSize(e.fileSize)}</TableCell>
                  <TableCell><Badge variant="secondary" className={essayColor(e.status)}>{ESSAY_STATUS_LABELS[e.status]}</Badge></TableCell>
                  <TableCell className="text-slate-500 text-xs">{e.submittedAt ? new Date(e.submittedAt).toLocaleDateString() : '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setPreviewEssay(e)} title="View details"><Eye className="h-3.5 w-3.5 text-slate-500" /></Button>
                      {canValidate(e.status) && (
                        <>
                          <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 px-2" onClick={() => openValidate(e, 'approve')}><CheckCircle className="h-3.5 w-3.5 mr-1" />Approve</Button>
                          <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2" onClick={() => openValidate(e, 'reject')}><XCircle className="h-3.5 w-3.5 mr-1" />Reject</Button>
                        </>
                      )}
                      {canLock(e.status) && (
                        <Button size="sm" variant="ghost" className="text-slate-600 hover:bg-slate-100 h-7 px-2" title="Lock essay"><Lock className="h-3.5 w-3.5 mr-1" />Lock</Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {search ? filtered.length : `${(page - 1) * PAGE_SIZE + 1}–${Math.min(page * PAGE_SIZE, total)}`} of {total}</p>
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

      {/* Details Dialog */}
      <Dialog open={!!previewEssay} onOpenChange={() => setPreviewEssay(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Essay Details</DialogTitle>
            <DialogDescription>{previewEssay?.registration.registrationNo}</DialogDescription>
          </DialogHeader>
          {previewEssay && (
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 p-4 rounded-lg border bg-slate-50">
                <FileText className="h-10 w-10 text-rose-500" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">{previewEssay.originalName || previewEssay.fileName || 'No file'}</p>
                  <p className="text-slate-500">{formatSize(previewEssay.fileSize)} • {previewEssay.mimeType || 'PDF'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500">Student</span><p className="font-medium text-slate-800">{previewEssay.student.user.name || '—'}</p></div>
                <div><span className="text-slate-500">Email</span><p className="font-medium text-slate-800">{previewEssay.student.user.email}</p></div>
                <div><span className="text-slate-500">Competition</span><p className="font-medium text-slate-800">{previewEssay.competition.name}</p></div>
                <div><span className="text-slate-500">Status</span><p><Badge variant="secondary" className={essayColor(previewEssay.status)}>{ESSAY_STATUS_LABELS[previewEssay.status]}</Badge></p></div>
                <div><span className="text-slate-500">Submitted</span><p className="font-medium text-slate-800">{previewEssay.submittedAt ? new Date(previewEssay.submittedAt).toLocaleString() : '—'}</p></div>
                <div><span className="text-slate-500">Validated</span><p className="font-medium text-slate-800">{previewEssay.validatedAt ? new Date(previewEssay.validatedAt).toLocaleString() : '—'}</p></div>
              </div>
              {previewEssay.validationNotes && (
                <div className="rounded-lg border bg-amber-50 p-3"><span className="text-slate-500">Validation Notes</span><p className="mt-1 text-slate-700">{previewEssay.validationNotes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Validate Dialog */}
      <Dialog open={validateOpen} onOpenChange={setValidateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className={validateAction === 'approve' ? 'text-emerald-700' : 'text-rose-700'}>
              {validateAction === 'approve' ? 'Approve' : 'Reject'} Essay
            </DialogTitle>
            <DialogDescription>{validateTarget?.registration.registrationNo} — {validateTarget?.student.user.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Label>Notes {validateAction === 'reject' && <span className="text-rose-500">*</span>}</Label>
            <Textarea rows={3} placeholder={validateAction === 'reject' ? 'Reason for rejection...' : 'Optional notes...'} value={validateNotes} onChange={e => setValidateNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setValidateOpen(false)}>Cancel</Button>
            <Button className={validateAction === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled={validating} onClick={handleValidate}>
              {validating ? 'Processing...' : validateAction === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
