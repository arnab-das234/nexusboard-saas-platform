'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileUp, CheckCircle2, UploadCloud, Lock, AlertCircle, FileText, Loader2, Trash2, Clock, AlertTriangle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ESSAY_STATUS_LABELS } from '@/lib/constants';
import type { EssayStatus } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Registration {
  id: string; competitionId: string; status: string;
  competition?: { name: string; submissionCloseDate?: string; maxEssayFileSize?: number };
}

interface Essay {
  id: string; registrationId: string; fileName?: string; originalName?: string;
  fileSize?: number; mimeType?: string; status: string; submittedAt?: string;
  validationNotes?: string;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function fmtDate(d?: string) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function essayStatusColor(status: string) {
  const map: Record<string, string> = {
    NOT_STARTED: 'bg-slate-100 text-slate-600', UPLOAD_PENDING: 'bg-amber-100 text-amber-700',
    UPLOADING: 'bg-amber-100 text-amber-700', VALIDATING: 'bg-amber-100 text-amber-700',
    VALID: 'bg-teal-100 text-teal-700', INVALID: 'bg-rose-100 text-rose-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700', LOCKED: 'bg-slate-100 text-slate-600',
    UNDER_EVALUATION: 'bg-teal-100 text-teal-700', EVALUATED: 'bg-emerald-100 text-emerald-700',
    RESULT_PUBLISHED: 'bg-emerald-100 text-emerald-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-600';
}

function EssaySkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full rounded" /></CardContent></Card>
    </div>
  );
}

export function StudentEssayView() {
  const user = useAuthStore((s) => s.user);
  const sp = (user as Record<string, unknown>)?.studentProfile as { id: string } | undefined;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [essays, setEssays] = useState<Essay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [dragOver, setDragOver] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sp?.id) { if (!cancelled) setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const [regRes, essayRes] = await Promise.all([
          fetch(`/api/registrations?studentId=${sp.id}`),
          fetch(`/api/essays?studentId=${sp.id}`),
        ]);
        if (cancelled) return;
        if (regRes.ok) { const j = await regRes.json(); setRegistrations((j.data ?? []).filter((r: Registration) => ['PAID', 'CONFIRMED'].includes(r.status))); }
        if (essayRes.ok) { const j = await essayRes.json(); setEssays(j.data ?? []); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load data');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sp?.id, reloadKey]);

  const essayByReg = (regId: string) => essays.find(e => e.registrationId === regId);

  function validateFile(file: File, maxSizeMB: number = 5): string | null {
    if (file.type !== 'application/pdf') return 'Only PDF files are accepted.';
    if (file.size > maxSizeMB * 1024 * 1024) return `File size (${fmtSize(file.size)}) exceeds ${maxSizeMB} MB limit.`;
    return null;
  }

  const handleFile = useCallback((regId: string, file: File) => {
    const maxSize = registrations.find(r => r.id === regId)?.competition?.maxEssayFileSize ?? 5 * 1024 * 1024;
    const maxSizeMB = Math.round(maxSize / 1024 / 1024);
    const err = validateFile(file, maxSizeMB);
    setFileErrors(prev => { const n = { ...prev }; delete n[regId]; return n; });
    if (err) { setFileErrors(prev => ({ ...prev, [regId]: err })); return; }
    setSelectedFiles(prev => ({ ...prev, [regId]: file }));
  }, [registrations]);

  function handleDrop(e: React.DragEvent, regId: string) {
    e.preventDefault(); setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(regId, file);
  }

  async function handleUpload(regId: string) {
    const file = selectedFiles[regId];
    if (!file || !sp?.id) return;
    setUploading(prev => ({ ...prev, [regId]: true }));
    setUploadProgress(prev => ({ ...prev, [regId]: 0 }));

    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const cur = prev[regId] ?? 0;
        if (cur >= 90) { clearInterval(interval); return { ...prev, [regId]: 90 }; }
        return { ...prev, [regId]: cur + Math.random() * 20 };
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('registrationId', regId);
      formData.append('studentId', sp.id);
      await fetch('/api/essays', { method: 'POST', body: formData });
    } catch { /* mock */ }

    clearInterval(interval);
    setUploadProgress(prev => ({ ...prev, [regId]: 100 }));
    await new Promise(r => setTimeout(r, 500));
    setEssays(prev => [...prev, {
      id: `essay-${Date.now()}`, registrationId: regId, fileName: file.name, originalName: file.name,
      fileSize: file.size, mimeType: file.type, status: 'SUBMITTED', submittedAt: new Date().toISOString(),
    }]);
    setSelectedFiles(prev => { const n = { ...prev }; delete n[regId]; return n; });
    setUploading(prev => { const n = { ...prev }; delete n[regId]; return n; });
    setUploadProgress(prev => { const n = { ...prev }; delete n[regId]; return n; });
    toast.success('Essay uploaded successfully!');
  }

  if (loading) return <EssaySkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => setReloadKey(k => k + 1)}>Try Again</Button>
      </div>
    );
  }

  if (registrations.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-bold text-slate-800">My Essay</h1>
          <p className="text-sm text-slate-500">Upload and track your essay submissions</p>
        </motion.div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No eligible competitions</p>
            <p className="text-sm text-slate-400 mt-1">Complete registration and payment to upload essays</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">My Essay</h1>
        <p className="text-sm text-slate-500">Upload and track your essay submissions</p>
      </motion.div>

      {registrations.map(reg => {
        const essay = essayByReg(reg.id);
        const canUpload = essay && ['NOT_STARTED', 'UPLOAD_PENDING', 'INVALID'].includes(essay.status);
        const isUploading = uploading[reg.id];
        const progress = uploadProgress[reg.id] ?? 0;
        const selectedFile = selectedFiles[reg.id];
        const fileError = fileErrors[reg.id];
        const deadline = reg.competition?.submissionCloseDate;
        const isPast = deadline && new Date(deadline) < new Date();

        return (
          <motion.div key={reg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{reg.competition?.name ?? 'Competition'}</CardTitle>
                    <CardDescription>{deadline ? `Deadline: ${new Date(deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}</CardDescription>
                  </div>
                  <Badge variant="outline" className={essayStatusColor(essay?.status ?? 'NOT_STARTED')}>
                    {ESSAY_STATUS_LABELS[essay?.status as EssayStatus] ?? essay?.status ?? 'Not Started'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isPast && !essay?.fileName && (
                  <Alert className="border-rose-200 bg-rose-50">
                    <Clock className="h-4 w-4 text-rose-600" />
                    <AlertDescription className="text-rose-800">The submission deadline has passed.</AlertDescription>
                  </Alert>
                )}
                {essay?.status === 'LOCKED' && (
                  <Alert className="border-slate-200 bg-slate-50">
                    <Lock className="h-4 w-4 text-slate-600" />
                    <AlertDescription className="text-slate-800">This submission is locked and under evaluation.</AlertDescription>
                  </Alert>
                )}

                {essay?.fileName && !canUpload ? (
                  <div className="flex items-center gap-4 rounded-lg border bg-slate-50 p-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                      <FileText className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{essay.originalName ?? essay.fileName}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        {essay.fileSize && <span>Size: {fmtSize(essay.fileSize)}</span>}
                        {essay.submittedAt && <span>Uploaded: {fmtDate(essay.submittedAt)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">Submitted</span>
                    </div>
                  </div>
                ) : canUpload && !isPast ? (
                  <>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(reg.id); }}
                      onDragLeave={() => setDragOver(null)}
                      onDrop={(e) => handleDrop(e, reg.id)}
                      onClick={() => fileInputRefs.current[reg.id]?.click()}
                      className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${dragOver === reg.id ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
                    >
                      <input ref={(el) => { fileInputRefs.current[reg.id] = el; }} type="file" accept=".pdf" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(reg.id, f); }} />
                      <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 ${dragOver === reg.id ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                        <UploadCloud className={`h-7 w-7 ${dragOver === reg.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <p className="text-sm font-medium text-slate-700">Drag & drop your PDF here, or click to browse</p>
                      <p className="text-xs text-slate-400 mt-1">PDF only, max 5 MB</p>
                    </div>
                    {fileError && (
                      <Alert variant="destructive" className="border-rose-200 bg-rose-50">
                        <AlertCircle className="h-4 w-4" /><AlertDescription className="text-rose-800">{fileError}</AlertDescription>
                      </Alert>
                    )}
                    {selectedFile && (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                            <FileText className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                            <p className="text-xs text-slate-500">{fmtSize(selectedFile.size)}</p>
                          </div>
                        </div>
                        {!isUploading && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600"
                            onClick={() => { setSelectedFiles(prev => { const n = { ...prev }; delete n[reg.id]; return n; }); setFileErrors(prev => { const n = { ...prev }; delete n[reg.id]; return n; }); }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600">Uploading...</span>
                          <span className="font-medium text-emerald-600">{Math.round(progress)}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    )}
                    {selectedFile && !isUploading && (
                      <Button onClick={() => handleUpload(reg.id)} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                        <FileUp className="h-4 w-4" /> Upload Essay
                      </Button>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-slate-500 justify-center py-4">
                    {essay?.status === 'UNDER_EVALUATION' && <Loader2 className="h-4 w-4 animate-spin" />}
                    {essay?.status === 'EVALUATED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                    <span>{essay ? ESSAY_STATUS_LABELS[essay.status as EssayStatus] : 'Not started'}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
