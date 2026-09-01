'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, FileText, PenTool, CheckCircle2, Clock,
  ZoomIn, ZoomOut, Maximize2, Download, ChevronLeft, ChevronRight,
  Copy, X, Save, Send, Loader2,
  AlertTriangle, ClipboardList, MessageSquare, BookOpen, ShieldCheck,
  Eye, List, FileSearch, ArrowLeft, RefreshCw, CircleAlert, Filter,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import type { EvaluationStatus } from '@/lib/types';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────
interface Assignment {
  id: string;
  essayId: string;
  examinerId: string;
  status: EvaluationStatus;
  assignedAt: string;
  deadline: string | null;
  essay?: {
    id: string;
    fileName: string | null;
    originalName: string | null;
    fileSize: number | null;
    fileUrl: string | null;
    status: string;
    submittedAt: string | null;
    competition: { id: string; name: string; blindEvaluation?: boolean };
    registration?: { category?: { name: string } | null };
  };
  evaluation?: {
    id: string;
    totalMarks: number | null;
    justification: string | null;
    comments: string | null;
    ocrReferences: string | null;
    status: string;
    scores?: {
      id: string;
      criterionId: string;
      marks: number;
      comments: string | null;
      criterion: { id: string; name: string; maxMarks: number; description: string | null };
    }[];
  };
}

interface Criterion {
  id: string;
  name: string;
  maxMarks: number;
  description?: string;
}

interface ScoreEntry {
  marks: number;
  comments: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function statusBadgeClass(status: EvaluationStatus) {
  switch (status) {
    case 'ASSIGNED': return 'bg-slate-100 text-slate-700';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700';
    case 'SUBMITTED': return 'bg-emerald-100 text-emerald-700';
    case 'LOCKED': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function statusLabel(status: string) {
  return EVALUATION_STATUS_LABELS[status as EvaluationStatus] || status;
}

function generatePageLines(page: number) {
  const title = page === 1;
  const lines: { w: number; h: number; mt: boolean }[] = [];
  const seed = page * 7;
  if (title) {
    lines.push({ w: 65, h: 12, mt: true });
    lines.push({ w: 40, h: 8, mt: true });
    lines.push({ w: 0, h: 16, mt: false });
  }
  const lineCount = title ? 20 : 24;
  for (let i = 0; i < lineCount; i++) {
    const variance = ((seed + i * 13) % 30) - 10;
    lines.push({ w: Math.max(50, Math.min(95, 80 + variance)), h: 5, mt: i === 0 && !title });
  }
  return lines;
}

// ── Loading Skeleton ─────────────────────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* Left skeleton */}
      <div className="w-72 shrink-0 border-r border-slate-200 bg-white flex flex-col">
        <div className="p-3 border-b border-slate-200 space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-7 w-full" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
          ))}
        </div>
      </div>
      {/* Middle skeleton */}
      <div className="flex-1 bg-slate-100/60">
        <Skeleton className="h-full w-full" />
      </div>
      {/* Right skeleton */}
      <div className="w-96 shrink-0 border-l border-slate-200 bg-white flex flex-col">
        <Skeleton className="h-12 w-full" />
        <div className="p-4 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────────────────────
function WorkspaceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-120px)] px-6">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 mb-4">
          <AlertTriangle className="h-8 w-8 text-rose-500" />
        </div>
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-700">Failed to Load Workspace</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md text-center">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4 gap-2">
        <RefreshCw className="h-4 w-4" /> Retry
      </Button>
    </div>
  );
}

// ── Empty Essays State ───────────────────────────────────────────────────────
function EmptyEssays() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-50 mb-4">
        <ClipboardList className="h-10 w-10 text-slate-300" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No Essays Assigned</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        You don&apos;t have any essays assigned for evaluation yet.
        When essays are assigned, they will appear here.
      </p>
    </div>
  );
}

// ── No Essay Selected State ──────────────────────────────────────────────────
function NoEssaySelected() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 mb-4">
          <PenTool className="h-10 w-10 text-emerald-400" />
        </div>
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-700">Select an Essay</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        Choose an essay from the list on the left to begin your evaluation.
        The PDF viewer and evaluation form will appear here.
      </p>
    </div>
  );
}

// ── Essay Detail Empty ───────────────────────────────────────────────────────
function NoEssayDetail() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm font-medium text-slate-500">Evaluation Form</p>
      <p className="text-xs text-slate-400 mt-1">Select an essay to see the evaluation criteria</p>
    </div>
  );
}

// ── Left Panel: Essay List ───────────────────────────────────────────────────
function EssayListPanel({
  assignments, selectedId, onSelect, search, setSearch, statusFilter, setStatusFilter, loading,
}: {
  assignments: Assignment[]; selectedId: string | null; onSelect: (id: string) => void;
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  loading: boolean;
}) {
  const filtered = assignments.filter((a) => {
    const label = a.essay?.originalName || a.essay?.fileName || a.essayId;
    const comp = a.essay?.competition?.name || '';
    const matchSearch = label.toLowerCase().includes(search.toLowerCase()) ||
      comp.toLowerCase().includes(search.toLowerCase()) ||
      a.essayId.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-slate-200 space-y-2.5 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search essays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {['all', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs px-2.5 whitespace-nowrap shrink-0 ${statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-500'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? `All (${assignments.length})` : statusLabel(s)}
            </Button>
          ))}
        </div>
      </div>

      {/* Essay List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1.5">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
            ))
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Search className="h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">No essays found</p>
              <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filter</p>
            </div>
          ) : (
            filtered.map((assignment) => {
              const isActive = selectedId === assignment.id;
              const isSubmitted = assignment.status === 'SUBMITTED';
              const essayLabel = assignment.essay?.originalName || assignment.essay?.fileName || `Essay ${assignment.essayId.slice(0, 8)}`;
              const compName = assignment.essay?.competition?.name || '';
              const category = assignment.essay?.registration?.category?.name || '';
              const isBlind = assignment.essay?.competition?.blindEvaluation !== false;

              return (
                <motion.button
                  key={assignment.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(assignment.id)}
                  className={`
                    w-full text-left rounded-lg border p-3 transition-all
                    ${isActive
                      ? 'border-emerald-400 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {isBlind && <ShieldCheck className="h-3 w-3 text-teal-500 shrink-0" />}
                        <p className={`text-sm font-mono font-semibold truncate ${isActive ? 'text-emerald-800' : 'text-slate-700'}`}>
                          {isBlind ? `ANON-${assignment.essayId.slice(0, 6).toUpperCase()}` : essayLabel}
                        </p>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{compName}</p>
                    </div>
                    <Badge variant="secondary" className={`${statusBadgeClass(assignment.status)} text-xs shrink-0`}>
                      {statusLabel(assignment.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {category && (
                      <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                        {category}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400 ml-auto">{timeAgo(assignment.assignedAt)}</span>
                  </div>
                  {assignment.deadline && assignment.status !== 'SUBMITTED' && assignment.status !== 'LOCKED' && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>Due: {new Date(assignment.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  )}
                  {isSubmitted && assignment.evaluation?.totalMarks != null && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-emerald-600 font-medium">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Scored: {assignment.evaluation.totalMarks}/100</span>
                    </div>
                  )}
                </motion.button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Middle Panel: PDF Viewer ─────────────────────────────────────────────────
function PdfViewerPanel({
  assignment, zoom, setZoom, currentPage, setCurrentPage,
  isBlind, onTextSelect, totalPages,
}: {
  assignment: Assignment; zoom: number; setZoom: (z: number) => void;
  currentPage: number; setCurrentPage: (p: number) => void;
  isBlind: boolean; onTextSelect: (text: string) => void;
  totalPages: number;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [copyPos, setCopyPos] = useState({ x: 0, y: 0 });

  const lines = useMemo(() => generatePageLines(currentPage), [currentPage]);
  const essay = assignment.essay;
  const fileName = essay?.originalName || essay?.fileName || 'essay.pdf';

  function handleMouseUp() {
    const sel = window.getSelection();
    if (sel && sel.toString().trim().length > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const viewerRect = viewerRef.current?.getBoundingClientRect();
      if (viewerRect) {
        setCopyPos({
          x: rect.left - viewerRect.left + rect.width / 2,
          y: rect.top - viewerRect.top - 10,
        });
      }
      setSelectedText(sel.toString().trim());
      setShowCopy(true);
    } else {
      setShowCopy(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(selectedText);
    onTextSelect(selectedText);
    setShowCopy(false);
    toast.success('Text copied to clipboard');
    window.getSelection()?.removeAllRanges();
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{fileName}</span>
          {isBlind && (
            <Badge className="bg-teal-100 text-teal-700 text-xs border-teal-200 gap-1 shrink-0">
              <ShieldCheck className="h-3 w-3" /> Blind Eval
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 25))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-xs font-mono text-slate-500 w-10 text-center">{zoom}%</span>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono text-slate-500">{currentPage} / {totalPages}</span>
          <Button
            variant="ghost" size="icon" className="h-7 w-7"
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('Fullscreen coming soon')}>
                  <Maximize2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fullscreen</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('Download not available in dev mode')}>
                  <Download className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download PDF</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Essay Details Bar */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-slate-100 text-xs text-slate-500 shrink-0 flex-wrap">
        <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{fileName}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{essay?.competition?.name || 'Competition'}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{essay?.registration?.category?.name || 'Category'}</span>
        <Separator orientation="vertical" className="h-3" />
        <span>{formatFileSize(essay?.fileSize ?? null)}</span>
        {essay?.submittedAt && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <span>Submitted: {new Date(essay.submittedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </>
        )}
      </div>

      {/* PDF Content Area */}
      <div
        ref={viewerRef}
        className="flex-1 overflow-auto bg-slate-200/60 relative"
        onMouseUp={handleMouseUp}
      >
        <div className="mx-auto my-4" style={{ width: `${Math.min(100, zoom)}%`, maxWidth: '680px' }}>
          <div
            className="bg-white shadow-lg rounded-sm mx-auto"
            style={{
              padding: `${Math.round(zoom * 0.6)}px ${Math.round(zoom * 0.8)}px`,
              minHeight: '900px',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
            }}
          >
            <div className="space-y-2.5 select-text">
              {lines.map((line, i) => (
                <div key={i} style={{ marginTop: line.mt ? '12px' : undefined }}>
                  <div className="bg-slate-200 rounded-sm" style={{ width: `${line.w}%`, height: `${line.h}px` }} />
                </div>
              ))}
            </div>
            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-400">Page {currentPage} of {totalPages}</span>
            </div>
          </div>
        </div>
        <AnimatePresence>
          {showCopy && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 4 }}
              className="absolute z-50"
              style={{ left: copyPos.x, top: copyPos.y, transform: 'translateX(-50%)' }}
            >
              <Button
                size="sm"
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-xs h-7 px-3"
                onClick={handleCopy}
              >
                <Copy className="h-3 w-3" /> Copy & Reference
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Right Panel: Evaluation Form ─────────────────────────────────────────────
function EvaluationFormPanel({
  assignment, criteria, scores, setScores, criterionComments, setCriterionComments,
  justification, setJustification, comments, setComments,
  ocrReferences, setOcrReferences, isSubmitted, onSaveDraft, onSubmit, saving,
}: {
  assignment: Assignment;
  criteria: Criterion[];
  scores: Record<string, number>;
  setScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  criterionComments: Record<string, string>;
  setCriterionComments: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  justification: string; setJustification: (v: string) => void;
  comments: string; setComments: (v: string) => void;
  ocrReferences: string; setOcrReferences: (v: string) => void;
  isSubmitted: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxMarks, 0);
  const currentTotal = Object.values(scores).reduce((sum, v) => sum + (v || 0), 0);
  const totalPct = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;
  const essay = assignment.essay;
  const isBlind = essay?.competition?.blindEvaluation !== false;
  const essayLabel = isBlind ? `ANON-${assignment.essayId.slice(0, 6).toUpperCase()}` : (essay?.originalName || essay?.fileName || 'Essay');

  const totalColorClass =
    currentTotal > maxTotal ? 'text-rose-600' : totalPct >= 90 ? 'text-amber-600' : 'text-emerald-600';

  function updateScore(id: string, value: string) {
    const num = value === '' ? 0 : Math.max(0, Number(value));
    setScores((prev) => ({ ...prev, [id]: num }));
  }

  function updateCriterionComment(id: string, value: string) {
    setCriterionComments((prev) => ({ ...prev, [id]: value }));
  }

  const allFilled = criteria.every((c) => (scores[c.id] ?? 0) > 0);
  const noOverMax = criteria.every((c) => (scores[c.id] ?? 0) <= c.maxMarks);
  const isValid = allFilled && noOverMax && justification.trim().length > 0;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Form Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{essayLabel}</p>
            <p className="text-xs text-slate-500 truncate">{essay?.competition?.name || 'Competition'}</p>
          </div>
          {isSubmitted ? (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </Badge>
          ) : (
            <Badge variant="secondary" className={`${statusBadgeClass(assignment.status)} text-xs`}>
              {statusLabel(assignment.status)}
            </Badge>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total Score:</span>
            <span className={`text-lg font-bold ${totalColorClass}`}>{currentTotal}</span>
            <span className="text-xs text-slate-400">/ {maxTotal}</span>
          </div>
        </div>
        <Progress
          value={Math.min(100, totalPct)}
          className={`h-1.5 mt-1.5 ${currentTotal > maxTotal ? '[&>div]:bg-rose-500' : ''}`}
        />
      </div>

      {/* Scrollable Form Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-5">
          {/* Criteria */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ClipboardList className="h-4 w-4 text-emerald-600" />
              <p className="text-sm font-semibold text-slate-700">Evaluation Criteria</p>
            </div>
            {criteria.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-8 text-center">
                <ClipboardList className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">No criteria defined for this competition</p>
              </div>
            ) : (
              <div className="space-y-4">
                {criteria.map((criterion, idx) => {
                  const val = scores[criterion.id] ?? 0;
                  const overMax = val > criterion.maxMarks;
                  const nearMax = val >= criterion.maxMarks * 0.9 && !overMax;
                  return (
                    <div key={criterion.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-600 shrink-0">
                              {idx + 1}
                            </span>
                            <p className="text-sm font-medium text-slate-700">{criterion.name}</p>
                          </div>
                          {criterion.description && (
                            <p className="text-xs text-slate-400 mt-0.5 ml-7">{criterion.description}</p>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 font-medium">Max: {criterion.maxMarks}</span>
                      </div>
                      <div className="ml-7 mt-2">
                        <div className="relative max-w-[120px]">
                          <Input
                            type="number"
                            min={0}
                            max={criterion.maxMarks}
                            value={val || ''}
                            onChange={(e) => updateScore(criterion.id, e.target.value)}
                            placeholder="0"
                            disabled={isSubmitted}
                            className={`h-8 text-sm pr-12 ${
                              overMax ? 'border-rose-300 focus-visible:ring-rose-400 bg-rose-50/50'
                                : nearMax ? 'border-amber-300 focus-visible:ring-amber-400 bg-amber-50/50'
                                  : ''
                            }`}
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            / {criterion.maxMarks}
                          </span>
                        </div>
                        <Textarea
                          placeholder="Comment on this criterion..."
                          value={criterionComments[criterion.id] || ''}
                          onChange={(e) => updateCriterionComment(criterion.id, e.target.value)}
                          disabled={isSubmitted}
                          rows={1}
                          className="mt-2 text-xs resize-none"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Separator />

          {/* Overall Justification */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-teal-600" />
              <p className="text-sm font-semibold text-slate-700">Overall Justification</p>
              <span className="text-xs text-rose-500 font-medium">*</span>
            </div>
            <Textarea
              placeholder="Provide a detailed justification for the scores awarded. Explain strengths and weaknesses of the essay..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={isSubmitted}
              rows={4}
              className="text-sm resize-none"
            />
            {!justification.trim() && !isSubmitted && (
              <p className="text-xs text-slate-400 mt-1">Required before submission</p>
            )}
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-slate-700">Comments</p>
              <span className="text-xs text-slate-400">(optional, shown to student)</span>
            </div>
            <Textarea
              placeholder="Any additional comments for the student that will appear in the results..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitted}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <Separator />

          {/* OCR References */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSearch className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">OCR Text References</p>
            </div>
            <p className="text-xs text-slate-400 mb-2">Paste quoted text from the essay to support your evaluation.</p>
            <Textarea
              placeholder="Paste quoted text from the essay here. You can select text in the PDF viewer and it will be added here..."
              value={ocrReferences}
              onChange={(e) => setOcrReferences(e.target.value)}
              disabled={isSubmitted}
              rows={4}
              className="text-sm resize-none font-mono"
            />
          </div>

          {/* Action Buttons */}
          {!isSubmitted && (
            <div className="flex flex-col gap-2 pt-2 pb-4">
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={onSubmit}
                disabled={!isValid || saving}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit Evaluation
              </Button>
              <Button
                variant="outline"
                className="gap-2 border-slate-300"
                onClick={onSaveDraft}
                disabled={saving}
              >
                <Save className="h-4 w-4" /> Save Draft
              </Button>
              {!isValid && (
                <div className="flex items-start gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <CircleAlert className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    {!allFilled && <p>Please score all criteria.</p>}
                    {!noOverMax && <p>Some scores exceed maximum marks.</p>}
                    {!justification.trim() && <p>Justification is required.</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {isSubmitted && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3 pb-4">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">Evaluation submitted successfully</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

// ── Mobile Layout Detector ───────────────────────────────────────────────────
function useIsMobile() {
  const getInitial = () => typeof window !== 'undefined' ? window.matchMedia('(max-width: 768px)').matches : false;
  const [isMobile, setIsMobile] = useState(getInitial);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ── Main View ────────────────────────────────────────────────────────────────
export function ExaminerWorkspaceView() {
  const user = useAuthStore((s) => s.user);
  const examinerId = (user as Record<string, unknown> | null)?.examinerProfile
    ? ((user as Record<string, unknown>).examinerProfile as { id: string }).id
    : user?.id;

  // Data state
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // PDF viewer state
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Evaluation form state
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [criterionComments, setCriterionComments] = useState<Record<string, string>>({});
  const [justification, setJustification] = useState('');
  const [comments, setComments] = useState('');
  const [ocrReferences, setOcrReferences] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);

  // Mobile state
  const isMobile = useIsMobile();
  const [mobileTab, setMobileTab] = useState<'list' | 'viewer' | 'evaluation'>('list');

  // Load assignments
  async function loadAssignments() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluations?examinerId=${examinerId}&pageSize=100`);
      if (!res.ok) throw new Error('Failed to fetch evaluations');
      const json = await res.json();
      if (json.success) {
        const evals = json.data || [];
        // Transform evaluations into assignments view
        const transformed: Assignment[] = evals.map((ev: Record<string, unknown>) => ({
          id: (ev.assignment as Record<string, unknown>)?.id || ev.id,
          essayId: ev.essayId as string,
          examinerId: ev.examinerId as string,
          status: (ev.assignment as Record<string, unknown>)?.status as EvaluationStatus || ev.status as EvaluationStatus,
          assignedAt: (ev.assignment as Record<string, unknown>)?.assignedAt || ev.createdAt as string,
          deadline: (ev.assignment as Record<string, unknown>)?.deadline as string | null || null,
          essay: ev.essay as Assignment['essay'],
          evaluation: {
            id: ev.id,
            totalMarks: ev.totalMarks as number | null,
            justification: ev.justification as string | null,
            comments: ev.comments as string | null,
            ocrReferences: ev.ocrReferences as string | null,
            status: ev.status as string,
            scores: (ev.scores || []) as Assignment['evaluation'] extends { scores?: infer S } ? NonNullable<S> : never,
          },
        }));
        setAssignments(transformed);
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspace');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAssignments(); }, [examinerId]);

  // Load criteria when essay is selected
  useEffect(() => {
    async function loadCriteria() {
      const selected = assignments.find((a) => a.id === selectedId);
      if (!selected?.essay?.competition?.id) return;
      try {
        const res = await fetch(`/api/competitions?id=${selected.essay.competition.id}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data?.criteria) {
            setCriteria(json.data.criteria.map((c: Record<string, unknown>) => ({
              id: c.id as string,
              name: c.name as string,
              maxMarks: c.maxMarks as number,
              description: (c.description as string) || undefined,
            })));
          }
        }
      } catch {
        // Fallback: try to get criteria from evaluation scores
        const selected = assignments.find((a) => a.id === selectedId);
        if (selected?.evaluation?.scores && selected.evaluation.scores.length > 0) {
          const fetchedCriteria = selected.evaluation.scores.map((s) => ({
            id: s.criterion.id,
            name: s.criterion.name,
            maxMarks: s.criterion.maxMarks,
            description: s.criterion.description || undefined,
          }));
          setCriteria(fetchedCriteria);
        }
      }
    }
    loadCriteria();
  }, [selectedId, assignments]);

  // Initialize form when selection changes
  useEffect(() => {
    const selected = assignments.find((a) => a.id === selectedId);
    if (!selected) return;

    const existingScores: Record<string, number> = {};
    const existingComments: Record<string, string> = {};

    if (selected.evaluation?.scores) {
      for (const s of selected.evaluation.scores) {
        existingScores[s.criterionId] = s.marks;
        existingComments[s.criterionId] = s.comments || '';
      }
    }

    // Initialize with 0 for any criteria not in existing scores
    for (const c of criteria) {
      if (existingScores[c.id] === undefined) {
        existingScores[c.id] = 0;
        existingComments[c.id] = '';
      }
    }

    setScores(existingScores);
    setCriterionComments(existingComments);
    setJustification(selected.evaluation?.justification || '');
    setComments(selected.evaluation?.comments || '');
    setOcrReferences(selected.evaluation?.ocrReferences || '');
    setCurrentPage(1);
    setZoom(100);
    setIsSubmitted(selected.status === 'SUBMITTED' || selected.status === 'LOCKED');
  }, [selectedId]);

  const selectedAssignment = useMemo(() => {
    return assignments.find((a) => a.id === selectedId) || null;
  }, [selectedId, assignments]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileTab('viewer');
  }, [isMobile]);

  const handleTextSelect = useCallback((text: string) => {
    if (!selectedAssignment || isSubmitted) return;
    setOcrReferences((prev) => prev ? `${prev}\n\n"${text}"` : `"${text}"`);
  }, [selectedAssignment, isSubmitted]);

  const handleSaveDraft = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    try {
      const scoreArray = Object.entries(scores).map(([criterionId, marks]) => ({
        criterionId,
        marks,
        comments: criterionComments[criterionId] || '',
      }));
      const body = {
        assignmentId: selectedAssignment.id,
        essayId: selectedAssignment.essayId,
        examinerId,
        competitionId: selectedAssignment.essay?.competition?.id,
        scores: scoreArray,
        totalMarks: Object.values(scores).reduce((sum, v) => sum + (v || 0), 0),
        justification,
        comments,
        ocrReferences,
        submit: false,
      };
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success('Draft saved successfully');
        setAssignments((prev) =>
          prev.map((a) => a.id === selectedAssignment.id ? { ...a, status: 'IN_PROGRESS' as EvaluationStatus } : a)
        );
      } else {
        toast.error(json.error || 'Failed to save draft');
      }
    } catch {
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [selectedAssignment, scores, criterionComments, justification, comments, ocrReferences, examinerId]);

  const handleSubmit = useCallback(() => {
    setSubmitDialogOpen(true);
  }, []);

  const handleConfirmSubmit = useCallback(async () => {
    if (!selectedAssignment) return;
    setSaving(true);
    setSubmitDialogOpen(false);
    try {
      const scoreArray = Object.entries(scores).map(([criterionId, marks]) => ({
        criterionId,
        marks,
        comments: criterionComments[criterionId] || '',
      }));
      const body = {
        assignmentId: selectedAssignment.id,
        essayId: selectedAssignment.essayId,
        examinerId,
        competitionId: selectedAssignment.essay?.competition?.id,
        scores: scoreArray,
        totalMarks: Object.values(scores).reduce((sum, v) => sum + (v || 0), 0),
        justification,
        comments,
        ocrReferences,
        submit: true,
      };
      const res = await fetch('/api/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setIsSubmitted(true);
        setAssignments((prev) =>
          prev.map((a) => a.id === selectedAssignment.id ? { ...a, status: 'SUBMITTED' as EvaluationStatus } : a)
        );
        toast.success('Evaluation submitted successfully!');
      } else {
        toast.error(json.error || 'Failed to submit evaluation');
      }
    } catch {
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [selectedAssignment, scores, criterionComments, justification, comments, ocrReferences, examinerId]);

  // Loading state
  if (loading) return <WorkspaceSkeleton />;

  // Error state
  if (error) return <WorkspaceError message={error} onRetry={loadAssignments} />;

  // Empty state
  if (assignments.length === 0) return <EmptyEssays />;

  const isBlind = selectedAssignment?.essay?.competition?.blindEvaluation !== false;

  // ── Mobile Layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Mobile Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          {([
            { key: 'list' as const, icon: List, label: 'Essays' },
            { key: 'viewer' as const, icon: Eye, label: 'Viewer' },
            { key: 'evaluation' as const, icon: PenTool, label: 'Evaluate' },
          ]).map((tab) => (
            <Button
              key={tab.key}
              variant={mobileTab === tab.key ? 'default' : 'ghost'}
              className={`flex-1 h-10 rounded-none text-xs gap-1.5 ${mobileTab === tab.key ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
              onClick={() => setMobileTab(tab.key)}
              disabled={tab.key !== 'list' && !selectedAssignment}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            </Button>
          ))}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'list' && (
            <EssayListPanel
              assignments={assignments} selectedId={selectedId} onSelect={handleSelect}
              search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              loading={false}
            />
          )}
          {mobileTab === 'viewer' && selectedAssignment && (
            <PdfViewerPanel
              assignment={selectedAssignment} zoom={zoom} setZoom={setZoom}
              currentPage={currentPage} setCurrentPage={setCurrentPage}
              isBlind={isBlind} onTextSelect={handleTextSelect}
              totalPages={5}
            />
          )}
          {mobileTab === 'evaluation' && selectedAssignment && (
            <EvaluationFormPanel
              assignment={selectedAssignment} criteria={criteria}
              scores={scores} setScores={setScores}
              criterionComments={criterionComments} setCriterionComments={setCriterionComments}
              justification={justification} setJustification={setJustification}
              comments={comments} setComments={setComments}
              ocrReferences={ocrReferences} setOcrReferences={setOcrReferences}
              isSubmitted={isSubmitted} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit}
              saving={saving}
            />
          )}
          {((mobileTab !== 'list') && !selectedAssignment) && <NoEssaySelected />}
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Evaluation</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your evaluation for{' '}
                <strong>{isBlind ? `ANON-${selectedAssignment?.essayId.slice(0, 6).toUpperCase()}` : selectedAssignment?.essay?.originalName}</strong>?{' '}
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-sm text-amber-800">Please review your scores and justification carefully before submitting. Once submitted, the evaluation will be locked.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmSubmit} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Confirm Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Desktop Layout: Three-Column ───────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-120px)]">
      {/* LEFT PANEL: Essay List (w-72) */}
      <div className="w-72 shrink-0 border-r border-slate-200 overflow-hidden">
        <EssayListPanel
          assignments={assignments} selectedId={selectedId} onSelect={handleSelect}
          search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
          loading={false}
        />
      </div>

      {/* MIDDLE PANEL: PDF Viewer (flex-1) */}
      <div className="flex-1 overflow-hidden border-r border-slate-200">
        {selectedAssignment ? (
          <PdfViewerPanel
            assignment={selectedAssignment} zoom={zoom} setZoom={setZoom}
            currentPage={currentPage} setCurrentPage={setCurrentPage}
            isBlind={isBlind} onTextSelect={handleTextSelect}
            totalPages={5}
          />
        ) : (
          <NoEssaySelected />
        )}
      </div>

      {/* RIGHT PANEL: Evaluation Form (w-96) */}
      <div className="w-96 shrink-0 overflow-hidden">
        {selectedAssignment && criteria.length > 0 ? (
          <EvaluationFormPanel
            assignment={selectedAssignment} criteria={criteria}
            scores={scores} setScores={setScores}
            criterionComments={criterionComments} setCriterionComments={setCriterionComments}
            justification={justification} setJustification={setJustification}
            comments={comments} setComments={setComments}
            ocrReferences={ocrReferences} setOcrReferences={setOcrReferences}
            isSubmitted={isSubmitted} onSaveDraft={handleSaveDraft} onSubmit={handleSubmit}
            saving={saving}
          />
        ) : selectedAssignment ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-3" />
            <p className="text-sm font-medium text-slate-500">Loading criteria...</p>
          </div>
        ) : (
          <NoEssayDetail />
        )}
      </div>

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Evaluation</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your evaluation for{' '}
              <strong>{isBlind ? `ANON-${selectedAssignment?.essayId.slice(0, 6).toUpperCase()}` : selectedAssignment?.essay?.originalName}</strong>?{' '}
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">Please review your scores and justification carefully before submitting. Once submitted, the evaluation will be locked.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmSubmit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
