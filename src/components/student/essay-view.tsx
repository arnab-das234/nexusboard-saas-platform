'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  FileUp, CheckCircle2, XCircle, Clock, UploadCloud, Lock,
  AlertCircle, FileCheck, BarChart3, Award, Loader2, Trash2, FileText,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ESSAY_STATUS_LABELS } from '@/lib/constants';
import type { EssayStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface EssaySubmission {
  id: string;
  status: EssayStatus;
  fileName: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
  validationResult: string;
  competitionName: string;
  deadline: string;
  locked: boolean;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_ESSAY: EssaySubmission = {
  id: 'essay-001',
  status: 'SUBMITTED',
  fileName: 'my_essay_national_2025.pdf',
  fileSize: 2457600,
  fileType: 'application/pdf',
  uploadedAt: '2025-07-08T14:30:00Z',
  validationResult: 'Valid - PDF format confirmed, file size within limit.',
  competitionName: 'National Essay Competition 2025',
  deadline: '2025-09-01T23:59:59Z',
  locked: false,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(2)} MB`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const STATUS_STEPS: { key: EssayStatus; label: string; icon: React.ElementType }[] = [
  { key: 'NOT_STARTED', label: 'Not Started', icon: Clock },
  { key: 'UPLOAD_PENDING', label: 'Upload', icon: UploadCloud },
  { key: 'VALIDATING', label: 'Validating', icon: Loader2 },
  { key: 'SUBMITTED', label: 'Submitted', icon: FileCheck },
  { key: 'UNDER_EVALUATION', label: 'Evaluating', icon: BarChart3 },
  { key: 'RESULT_PUBLISHED', label: 'Result', icon: Award },
];

function getStepIndex(status: EssayStatus) {
  const idx = STATUS_STEPS.findIndex(s => s.key === status);
  if (idx >= 0) return idx;
  if (status === 'UPLOADING') return 2;
  if (status === 'VALID') return 3;
  if (status === 'INVALID') return 1;
  if (status === 'LOCKED') return 3;
  if (status === 'EVALUATED') return 5;
  return 0;
}

function statusColor(status: EssayStatus) {
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

// ── Skeleton ─────────────────────────────────────────────────────────────────
function EssaySkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Card><CardContent className="p-6"><Skeleton className="h-32 w-full rounded" /></CardContent></Card>
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentEssayView() {
  const [essay, setEssay] = useState<EssaySubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-essay');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setEssay(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setEssay(MOCK_ESSAY);
      setLoading(false);
    }
    load();
  }, []);

  const isDeadlinePassed = essay ? new Date(essay.deadline) < new Date() : false;
  const isLocked = essay?.locked ?? false;
  const canUpload = essay && !isLocked && !isDeadlinePassed &&
    ['NOT_STARTED', 'UPLOAD_PENDING', 'INVALID'].includes(essay.status);

  function validateFile(file: File): string | null {
    if (file.type !== 'application/pdf') return 'Only PDF files are accepted. Please upload a .pdf file.';
    if (file.size > 5 * 1024 * 1024) return `File size (${fmtSize(file.size)}) exceeds the 5 MB limit.`;
    return null;
  }

  function handleFile(file: File) {
    setFileError(null);
    const err = validateFile(file);
    if (err) { setFileError(err); return; }
    setSelectedFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !essay) return;
    setUploading(true);
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90; }
        return prev + Math.random() * 20;
      });
    }, 300);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('essayId', essay.id);
      await fetch('/api/seed?action=upload-essay', { method: 'POST', body: formData });
    } catch { /* mock */ }
    clearInterval(interval);
    setUploadProgress(100);
    await new Promise(r => setTimeout(r, 500));
    setEssay({
      ...essay,
      status: 'SUBMITTED',
      fileName: selectedFile.name, fileSize: selectedFile.size, fileType: selectedFile.type,
      uploadedAt: new Date().toISOString(),
      validationResult: 'Valid - PDF format confirmed, file size within limit.',
    });
    setSelectedFile(null);
    setUploading(false);
    setUploadProgress(0);
    toast.success('Essay uploaded successfully!');
  }

  if (loading) return <EssaySkeleton />;
  if (!essay) return null;

  const currentStep = getStepIndex(essay.status);

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">My Essay</h1>
        <p className="text-sm text-slate-500">Upload and track your essay submission</p>
      </motion.div>

      {/* Status Card with Stepper */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Submission Status</CardTitle>
                <CardDescription>{essay.competitionName}</CardDescription>
              </div>
              <Badge variant="outline" className={statusColor(essay.status)}>
                {ESSAY_STATUS_LABELS[essay.status]}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between mb-2">
              {STATUS_STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const active = i <= currentStep;
                const current = i === currentStep;
                return (
                  <React.Fragment key={step.key}>
                    <div className="flex flex-col items-center gap-1.5">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${active ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-200 bg-white text-slate-400'}`}>
                        {current && step.key === 'VALIDATING' ? (
                          <StepIcon className="h-4 w-4 animate-spin" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <span className={`text-[10px] text-center leading-tight ${current ? 'font-semibold text-emerald-700' : 'text-slate-400'}`}>{step.label}</span>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-1 mt-[-18px] ${i < currentStep ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Locked / Deadline Passed Warning */}
      {isLocked && (
        <Alert className="border-rose-200 bg-rose-50">
          <Lock className="h-4 w-4 text-rose-600" />
          <AlertDescription className="text-rose-800">Your essay submission is locked. No further changes can be made.</AlertDescription>
        </Alert>
      )}
      {isDeadlinePassed && !isLocked && (
        <Alert className="border-amber-200 bg-amber-50">
          <Clock className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">The submission deadline has passed. You can no longer upload your essay.</AlertDescription>
        </Alert>
      )}

      {/* Upload Section */}
      {canUpload ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upload Essay</CardTitle>
              <CardDescription>Upload your essay in PDF format (max 5 MB). Deadline: {new Date(essay.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 cursor-pointer transition-all ${dragOver ? 'border-emerald-400 bg-emerald-50' : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'}`}
              >
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleInputChange} />
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl mb-3 ${dragOver ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                  <UploadCloud className={`h-7 w-7 ${dragOver ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <p className="text-sm font-medium text-slate-700">Drag & drop your PDF here, or click to browse</p>
                <p className="text-xs text-slate-400 mt-1">PDF only, max 5 MB</p>
              </div>

              {/* File Error */}
              {fileError && (
                <Alert variant="destructive" className="border-rose-200 bg-rose-50">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-rose-800">{fileError}</AlertDescription>
                </Alert>
              )}

              {/* Selected File */}
              {selectedFile && (
                <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                      <FileText className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{selectedFile.name}</p>
                      <p className="text-xs text-slate-500">{fmtSize(selectedFile.size)} • {selectedFile.type}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600" onClick={() => { setSelectedFile(null); setFileError(null); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600">Uploading...</span>
                    <span className="font-medium text-emerald-600">{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              {/* Upload Button */}
              {selectedFile && !uploading && (
                <Button onClick={handleUpload} className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2">
                  <FileUp className="h-4 w-4" /> Upload Essay
                </Button>
              )}
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Uploaded File Info */
        essay.fileName && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Uploaded File</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 rounded-lg border bg-slate-50 p-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{essay.fileName}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                      <span>Size: {fmtSize(essay.fileSize)}</span>
                      <span>Type: {essay.fileType}</span>
                      <span>Uploaded: {fmtDate(essay.uploadedAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-xs font-medium text-emerald-700">{essay.validationResult}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      )}
    </div>
  );
}
