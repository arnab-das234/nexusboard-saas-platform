'use client';

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import {
  Search, Filter, FileText, PenTool, CheckCircle2, Clock,
  ZoomIn, ZoomOut, Maximize2, Download, ChevronLeft, ChevronRight,
  Copy, X, Plus, Save, Send, Eye, EyeOff, Loader2, GripVertical,
  AlertTriangle, ClipboardList, MessageSquare, BookOpen, ShieldCheck,
  Monitor, Smartphone, Menu, List, FileSearch,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { EvaluationStatus } from '@/lib/types';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────
interface EssayItem {
  id: string;
  anonymousId: string;
  competition: string;
  category: string;
  status: EvaluationStatus;
  assignedAt: string;
  deadline: string;
  fileName: string;
 totalPages: number;
}

interface Criterion {
  id: string;
  name: string;
  maxMarks: number;
  description?: string;
}

interface EssayDetail extends EssayItem {
 criteria: Criterion[];
 existingScores?: Record<string, { marks: number; comment: string }>;
  justification?: string;
  comments?: string;
  blindEvaluation: boolean;
}

interface TextQuote {
  id: string;
  text: string;
  criterionId: string;
  page: number;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_ESSAYS: EssayItem[] = [
  { id: 'e1', anonymousId: 'Essay-2024-042', competition: 'National Essay Competition 2025', category: 'Senior (16-18)', status: 'ASSIGNED', assignedAt: '2025-07-08T10:00:00Z', deadline: '2025-07-18T23:59:00Z', fileName: 'essay_042_anonymous.pdf', totalPages: 5 },
  { id: 'e2', anonymousId: 'Essay-2024-039', competition: 'National Essay Competition 2025', category: 'Junior (13-15)', status: 'IN_PROGRESS', assignedAt: '2025-07-07T14:00:00Z', deadline: '2025-07-15T23:59:00Z', fileName: 'essay_039_anonymous.pdf', totalPages: 4 },
  { id: 'e3', anonymousId: 'Essay-2024-051', competition: 'Inter-School Essay Challenge', category: 'Senior (16-18)', status: 'ASSIGNED', assignedAt: '2025-07-06T09:00:00Z', deadline: '2025-07-12T23:59:00Z', fileName: 'essay_051_anonymous.pdf', totalPages: 6 },
  { id: 'e4', anonymousId: 'Essay-2024-055', competition: 'Inter-School Essay Challenge', category: 'Junior (13-15)', status: 'IN_PROGRESS', assignedAt: '2025-07-05T11:00:00Z', deadline: '2025-07-14T23:59:00Z', fileName: 'essay_055_anonymous.pdf', totalPages: 3 },
  { id: 'e5', anonymousId: 'Essay-2024-060', competition: 'State Level Essay Writing', category: 'Senior (16-18)', status: 'ASSIGNED', assignedAt: '2025-07-04T08:00:00Z', deadline: '2025-07-10T23:59:00Z', fileName: 'essay_060_anonymous.pdf', totalPages: 4 },
  { id: 'e6', anonymousId: 'Essay-2024-018', competition: 'National Essay Competition 2025', category: 'Senior (16-18)', status: 'SUBMITTED', assignedAt: '2025-07-01T10:00:00Z', deadline: '2025-07-10T23:59:00Z', fileName: 'essay_018_anonymous.pdf', totalPages: 5 },
  { id: 'e7', anonymousId: 'Essay-2024-025', competition: 'National Essay Competition 2025', category: 'Junior (13-15)', status: 'SUBMITTED', assignedAt: '2025-06-28T14:00:00Z', deadline: '2025-07-08T23:59:00Z', fileName: 'essay_025_anonymous.pdf', totalPages: 4 },
  { id: 'e8', anonymousId: 'Essay-2024-031', competition: 'Inter-School Essay Challenge', category: 'Senior (16-18)', status: 'SUBMITTED', assignedAt: '2025-06-25T09:00:00Z', deadline: '2025-07-05T23:59:00Z', fileName: 'essay_031_anonymous.pdf', totalPages: 6 },
  { id: 'e9', anonymousId: 'Essay-2024-045', competition: 'State Level Essay Writing', category: 'Junior (13-15)', status: 'ASSIGNED', assignedAt: '2025-07-09T06:00:00Z', deadline: '2025-07-20T23:59:00Z', fileName: 'essay_045_anonymous.pdf', totalPages: 5 },
  { id: 'e10', anonymousId: 'Essay-2024-048', competition: 'National Essay Competition 2025', category: 'Senior (16-18)', status: 'IN_PROGRESS', assignedAt: '2025-07-08T15:00:00Z', deadline: '2025-07-19T23:59:00Z', fileName: 'essay_048_anonymous.pdf', totalPages: 4 },
];

const MOCK_CRITERIA: Criterion[] = [
  { id: 'c1', name: 'Content & Ideas', maxMarks: 30, description: 'Depth and originality of ideas, relevance to topic' },
  { id: 'c2', name: 'Structure & Organization', maxMarks: 20, description: 'Logical flow, paragraph structure, introduction and conclusion' },
  { id: 'c3', name: 'Language & Vocabulary', maxMarks: 20, description: 'Grammar, spelling, vocabulary range, sentence variety' },
  { id: 'c4', name: 'Critical Thinking', maxMarks: 15, description: 'Analysis, argumentation, evidence of independent thought' },
  { id: 'c5', name: 'Creativity & Style', maxMarks: 15, description: 'Original expression, engaging writing style, unique perspective' },
];

const MOCK_EXISTING_SCORES: Record<string, { marks: number; comment: string }> = {
  c1: { marks: 24, comment: 'Strong ideas with good depth' },
  c2: { marks: 16, comment: 'Well organized structure' },
};

// Simulated page content lines for the PDF placeholder
function generatePageLines(page: number) {
  const title = page === 1;
  const lines: { w: number; h: number; mt: boolean }[] = [];
  const seed = page * 7;
  if (title) {
    lines.push({ w: 65, h: 12, mt: true });
    lines.push({ w: 40, h: 8, mt: true });
    lines.push({ w: 0, h: 16, mt: false });
  }
  const lineCount = title ? 18 : 22;
  for (let i = 0; i < lineCount; i++) {
    const variance = ((seed + i * 13) % 30) - 10;
    lines.push({ w: Math.max(50, Math.min(95, 80 + variance)), h: 5, mt: i === 0 && !title });
  }
  return lines;
}

// ── Status Helpers ───────────────────────────────────────────────────────────
function statusBadge(status: EvaluationStatus) {
  const map: Record<EvaluationStatus, string> = {
    ASSIGNED: 'bg-slate-100 text-slate-700',
    IN_PROGRESS: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700',
    LOCKED: 'bg-rose-100 text-rose-700',
  };
  return map[status];
}

// ── Resize Handle ────────────────────────────────────────────────────────────
function ResizeHandle({ direction = 'vertical' }: { direction?: 'vertical' | 'horizontal' }) {
  return (
    <PanelResizeHandle className={`
      relative flex items-center justify-center group
      ${direction === 'vertical' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'}
    `}>
      <div className={`
        flex items-center justify-center rounded-full
        ${direction === 'vertical'
          ? 'w-1 h-10 gap-0.5'
          : 'h-1 w-10 flex-col gap-0.5'}
        bg-slate-200 group-hover:bg-emerald-400 group-active:bg-emerald-500 transition-colors
      `}>
        <GripVertical className={direction === 'vertical' ? 'h-3 w-3 text-slate-400 group-hover:text-white transition-colors' : 'h-3 w-3 text-slate-400 group-hover:text-white transition-colors rotate-90'} />
      </div>
    </PanelResizeHandle>
  );
}

// ── PDF Viewer Placeholder ───────────────────────────────────────────────────
function PdfViewer({
  essay, zoom, setZoom, currentPage, setCurrentPage, isBlind,
  onTextSelect, mobileTab
}: {
  essay: EssayDetail; zoom: number; setZoom: (z: number) => void;
  currentPage: number; setCurrentPage: (p: number) => void;
  isBlind: boolean; onTextSelect: (text: string) => void;
  mobileTab: string;
}) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [showCopy, setShowCopy] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [copyPos, setCopyPos] = useState({ x: 0, y: 0 });

  const lines = useMemo(() => generatePageLines(currentPage), [currentPage]);

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
    toast.success('Selection copied and added to references');
    window.getSelection()?.removeAllRanges();
  }

  if (mobileTab && mobileTab !== 'viewer') return null;

  return (
    <div className="flex flex-col h-full">
      {/* Viewer Toolbar */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="h-4 w-4 text-slate-500 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{essay.fileName}</span>
          {isBlind && (
            <Badge className="bg-teal-100 text-teal-700 text-xs border-teal-200 gap-1 shrink-0">
              <ShieldCheck className="h-3 w-3" /> Anonymous
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.max(50, zoom - 25))}>
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent>Zoom Out</TooltipContent></Tooltip></TooltipProvider>
          <span className="text-xs font-mono text-slate-500 w-10 text-center">{zoom}%</span>
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(Math.min(200, zoom + 25))}>
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent>Zoom In</TooltipContent></Tooltip></TooltipProvider>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1}>
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs font-mono text-slate-500">{currentPage} / {essay.totalPages}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentPage(Math.min(essay.totalPages, currentPage + 1))} disabled={currentPage >= essay.totalPages}>
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Separator orientation="vertical" className="h-4 mx-1" />
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('Fullscreen mode coming soon')}>
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent>Fullscreen</TooltipContent></Tooltip></TooltipProvider>
          <TooltipProvider><Tooltip><TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toast.info('Download not available in demo mode')}>
              <Download className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger><TooltipContent>Download</TooltipContent></Tooltip></TooltipProvider>
        </div>
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
            {/* Simulated text lines */}
            <div className="space-y-2.5 select-text">
              {lines.map((line, i) => (
                <div key={i} style={{ marginTop: line.mt ? '12px' : undefined }}>
                  <div
                    className="bg-slate-200 rounded-sm"
                    style={{ width: `${line.w}%`, height: `${line.h}px` }}
                  />
                </div>
              ))}
            </div>
            {/* Page number footer */}
            <div className="mt-8 pt-4 border-t border-slate-100 text-center">
              <span className="text-xs text-slate-400">Page {currentPage} of {essay.totalPages}</span>
            </div>
          </div>
        </div>

        {/* Floating Copy Button */}
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
                <Copy className="h-3 w-3" /> Copy Selection
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Evaluation Form ──────────────────────────────────────────────────────────
function EvaluationForm({
  essay, scores, setScores, justification, setJustification,
  comments, setComments, quotes, setQuotes, isSubmitted,
  onSaveDraft, onSubmit, saving, mobileTab
}: {
  essay: EssayDetail;
  scores: Record<string, number>;
  setScores: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  justification: string; setJustification: (v: string) => void;
  comments: string; setComments: (v: string) => void;
  quotes: TextQuote[]; setQuotes: React.Dispatch<React.SetStateAction<TextQuote[]>>;
  isSubmitted: boolean;
  onSaveDraft: () => void;
  onSubmit: () => void;
  saving: boolean;
  mobileTab: string;
}) {
  const maxTotal = essay.criteria.reduce((sum, c) => sum + c.maxMarks, 0);
  const currentTotal = Object.values(scores).reduce((sum, v) => sum + (v || 0), 0);
  const totalPct = maxTotal > 0 ? (currentTotal / maxTotal) * 100 : 0;

  const totalColorClass =
    currentTotal > maxTotal
      ? 'text-rose-600'
      : totalPct >= 90
        ? 'text-amber-600'
        : 'text-emerald-600';

  function updateScore(id: string, value: string) {
    const num = value === '' ? 0 : Math.max(0, Number(value));
    setScores((prev) => ({ ...prev, [id]: num }));
  }

  function removeQuote(quoteId: string) {
    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
  }

  function updateQuoteCriterion(quoteId: string, criterionId: string) {
    setQuotes((prev) => prev.map((q) => q.id === quoteId ? { ...q, criterionId } : q));
  }

  const allFilled = essay.criteria.every((c) => (scores[c.id] ?? 0) > 0);
  const noOverMax = essay.criteria.every((c) => (scores[c.id] ?? 0) <= c.maxMarks);
  const isValid = allFilled && noOverMax && justification.trim().length > 0;

  if (mobileTab && mobileTab !== 'evaluation') return null;

  return (
    <div className="flex flex-col h-full">
      {/* Form Header */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">{essay.anonymousId}</p>
            <p className="text-xs text-slate-500 truncate">{essay.competition}</p>
          </div>
          <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-xs shrink-0 ml-2">{essay.category}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Total Score:</span>
            <span className={`text-lg font-bold ${totalColorClass}`}>{currentTotal}</span>
            <span className="text-xs text-slate-400">/ {maxTotal}</span>
          </div>
          {isSubmitted && (
            <Badge className="bg-emerald-100 text-emerald-700 text-xs gap-1">
              <CheckCircle2 className="h-3 w-3" /> Submitted
            </Badge>
          )}
        </div>
        <Progress value={Math.min(100, totalPct)} className={`h-1.5 mt-1.5 ${currentTotal > maxTotal ? '[&>div]:bg-rose-500' : ''}`} />
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
            <div className="space-y-4">
              {essay.criteria.map((criterion) => {
                const val = scores[criterion.id] ?? 0;
                const overMax = val > criterion.maxMarks;
                const nearMax = val >= criterion.maxMarks * 0.9 && !overMax;
                return (
                  <div key={criterion.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700">{criterion.name}</p>
                        {criterion.description && (
                          <p className="text-xs text-slate-400 mt-0.5">{criterion.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">Max: {criterion.maxMarks}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="relative flex-1">
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
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">/ {criterion.maxMarks}</span>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Brief comment on this criterion..."
                      value={essay.existingScores?.[criterion.id]?.comment ?? ''}
                      disabled={isSubmitted}
                      rows={1}
                      className="mt-2 text-xs resize-none"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Overall Justification */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-teal-600" />
              <p className="text-sm font-semibold text-slate-700">Overall Justification</p>
              <span className="text-xs text-rose-400">*</span>
            </div>
            <Textarea
              placeholder="Provide a detailed justification for the scores awarded. Explain the strengths and weaknesses of the essay..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              disabled={isSubmitted}
              rows={4}
              className={`text-sm resize-none ${!justification.trim() && isSubmitted ? '' : ''}`}
            />
          </div>

          <Separator />

          {/* Comments */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-amber-600" />
              <p className="text-sm font-semibold text-slate-700">Comments</p>
            </div>
            <Textarea
              placeholder="Any additional comments for the student (shown in results)..."
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={isSubmitted}
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          <Separator />

          {/* OCR / Text References */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileSearch className="h-4 w-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Text References</p>
              <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-500">{quotes.length}</Badge>
            </div>
            <p className="text-xs text-slate-400 mb-3">Select text in the PDF viewer to add references linked to criteria.</p>
            {quotes.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center">
                <FileText className="h-6 w-6 text-slate-300 mx-auto mb-1" />
                <p className="text-xs text-slate-400">No text references yet</p>
                <p className="text-xs text-slate-300 mt-0.5">Select text in the viewer to add</p>
              </div>
            ) : (
              <div className="space-y-2">
                {quotes.map((quote) => (
                  <div key={quote.id} className="rounded-lg border border-slate-200 p-2.5 group">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-600 italic line-clamp-2">&ldquo;{quote.text}&rdquo;</p>
                      {!isSubmitted && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={() => removeQuote(quote.id)}>
                          <X className="h-3 w-3 text-rose-500" />
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-400">Page {quote.page}</span>
                      {!isSubmitted && (
                        <select
                          value={quote.criterionId}
                          onChange={(e) => updateQuoteCriterion(quote.id, e.target.value)}
                          className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600"
                        >
                          <option value="">Link to criterion...</option>
                          {essay.criteria.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      )}
                      {quote.criterionId && (
                        <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700">
                          {essay.criteria.find((c) => c.id === quote.criterionId)?.name}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {!allFilled ? 'Please score all criteria. ' : ''}
                  {!noOverMax ? 'Some scores exceed maximum marks. ' : ''}
                  {!justification.trim() ? 'Justification is required. ' : ''}
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

// ── Essay List Sidebar ───────────────────────────────────────────────────────
function EssaySidebar({
  essays, selectedId, onSelect, search, setSearch, statusFilter, setStatusFilter,
  mobileTab
}: {
  essays: EssayItem[]; selectedId: string | null; onSelect: (id: string) => void;
  search: string; setSearch: (v: string) => void;
  statusFilter: string; setStatusFilter: (v: string) => void;
  mobileTab: string;
}) {
  const filtered = essays.filter((e) => {
    const matchSearch = e.anonymousId.toLowerCase().includes(search.toLowerCase()) ||
      e.competition.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (mobileTab && mobileTab !== 'list') return null;

  return (
    <div className="flex flex-col h-full">
      {/* Search and Filter */}
      <div className="p-3 border-b border-slate-200 space-y-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search essays..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        <div className="flex gap-1.5">
          {['all', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED'].map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? 'default' : 'outline'}
              size="sm"
              className={`h-7 text-xs px-2 ${statusFilter === s ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'text-slate-500'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'all' ? 'All' : EVALUATION_STATUS_LABELS[s as EvaluationStatus]}
            </Button>
          ))}
        </div>
      </div>

      {/* Essay List */}
      <div className="flex-1 overflow-y-auto max-h-[calc(100vh-220px)]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Search className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">No essays found</p>
            <p className="text-xs text-slate-400 mt-0.5">Try adjusting your search or filter</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filtered.map((essay) => {
              const isActive = selectedId === essay.id;
              const isSubmitted = essay.status === 'SUBMITTED';
              return (
                <motion.button
                  key={essay.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onSelect(essay.id)}
                  className={`
                    w-full text-left rounded-lg border p-3 transition-all
                    ${isActive
                      ? 'border-emerald-400 bg-emerald-50/60 shadow-sm ring-1 ring-emerald-200'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }
                  `}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className={`text-sm font-mono font-semibold truncate ${isActive ? 'text-emerald-800' : 'text-slate-700'}`}>
                        {essay.anonymousId}
                      </p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{essay.competition}</p>
                    </div>
                    <Badge variant="secondary" className={`${statusBadge(essay.status)} text-xs shrink-0`}>
                      {EVALUATION_STATUS_LABELS[essay.status]}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs border-slate-200 text-slate-500">
                      {essay.category}
                    </Badge>
                    <span className="text-xs text-slate-400 ml-auto">{essay.totalPages}pg</span>
                  </div>
                  {isSubmitted && (
                    <div className="flex items-center gap-1 mt-1.5 text-xs text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Evaluated</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty State ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-50 mb-4"
      >
        <PenTool className="h-10 w-10 text-emerald-400" />
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-700">Select an Essay</h3>
      <p className="text-sm text-slate-400 mt-1 max-w-sm">
        Choose an essay from the list on the left to begin your evaluation.
        The PDF viewer and evaluation form will appear here.
      </p>
    </div>
  );
}

// ── Mobile Layout Detector ───────────────────────────────────────────────────
function useIsMobileCustom() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function WorkspaceSkeleton() {
  return (
    <div className="flex h-[calc(100vh-120px)] gap-4 p-4">
      <div className="w-72 shrink-0 space-y-3 p-3">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-6 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
      <div className="flex-1 bg-slate-100 rounded-lg">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
      <div className="w-80 shrink-0 space-y-3 p-3">
        <Skeleton className="h-8 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function ExaminerWorkspaceView() {
  const [essays, setEssays] = useState<EssayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // PDF viewer state
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);

  // Evaluation form state
  const [scores, setScores] = useState<Record<string, number>>({});
  const [justification, setJustification] = useState('');
  const [comments, setComments] = useState('');
  const [quotes, setQuotes] = useState<TextQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Mobile state
  const isMobile = useIsMobileCustom();
  const [mobileTab, setMobileTab] = useState('list');

  // Load essays
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=examiner-workspace');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setEssays(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setEssays(MOCK_ESSAYS);
      setLoading(false);
    }
    load();
  }, []);

  // Get selected essay detail
  const selectedEssay: EssayDetail | null = useMemo(() => {
    if (!selectedId) return null;
    const essay = essays.find((e) => e.id === selectedId);
    if (!essay) return null;
    return {
      ...essay,
      criteria: MOCK_CRITERIA,
      existingScores: essay.status === 'IN_PROGRESS' ? MOCK_EXISTING_SCORES : undefined,
      blindEvaluation: true,
    };
  }, [selectedId, essays]);

  // Initialize scores when essay changes
  useEffect(() => {
    if (selectedEssay) {
      const initial: Record<string, number> = {};
      selectedEssay.criteria.forEach((c) => {
        initial[c.id] = selectedEssay.existingScores?.[c.id]?.marks ?? 0;
      });
      setScores(initial);
      setJustification(selectedEssay.justification ?? '');
      setComments(selectedEssay.comments ?? '');
      setQuotes([]);
      setCurrentPage(1);
      setZoom(100);
      setIsSubmitted(selectedEssay.status === 'SUBMITTED');
    }
  }, [selectedEssay?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    if (isMobile) setMobileTab('viewer');
  }, [isMobile]);

  const handleTextSelect = useCallback((text: string) => {
    if (!selectedEssay || isSubmitted) return;
    const newQuote: TextQuote = {
      id: `q-${Date.now()}`,
      text,
      criterionId: '',
      page: currentPage,
    };
    setQuotes((prev) => [...prev, newQuote]);
  }, [selectedEssay, isSubmitted, currentPage]);

  const handleSaveDraft = useCallback(async () => {
    setSaving(true);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    // Update essay status to IN_PROGRESS
    if (selectedId) {
      setEssays((prev) =>
        prev.map((e) => (e.id === selectedId ? { ...e, status: 'IN_PROGRESS' as EvaluationStatus } : e))
      );
    }
    toast.success('Draft saved successfully');
  }, [selectedId]);

  const handleConfirmSubmit = useCallback(async () => {
    setSaving(true);
    setSubmitDialogOpen(false);
    // Simulate API call
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    setIsSubmitted(true);
    if (selectedId) {
      setEssays((prev) =>
        prev.map((e) => (e.id === selectedId ? { ...e, status: 'SUBMITTED' as EvaluationStatus } : e))
      );
    }
    toast.success('Evaluation submitted successfully!');
  }, [selectedId]);

  const handleSubmit = useCallback(() => {
    setSubmitDialogOpen(true);
  }, []);

  if (loading) return <WorkspaceSkeleton />;

  // ── Mobile Layout ─────────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div className="flex flex-col h-[calc(100vh-120px)]">
        {/* Mobile Tab Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
          <Button
            variant={mobileTab === 'list' ? 'default' : 'ghost'}
            className={`flex-1 h-10 rounded-none text-xs gap-1.5 ${mobileTab === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
            onClick={() => setMobileTab('list')}
          >
            <List className="h-3.5 w-3.5" /> Essays
          </Button>
          <Button
            variant={mobileTab === 'viewer' ? 'default' : 'ghost'}
            className={`flex-1 h-10 rounded-none text-xs gap-1.5 ${mobileTab === 'viewer' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
            onClick={() => setMobileTab('viewer')}
            disabled={!selectedEssay}
          >
            <Eye className="h-3.5 w-3.5" /> Viewer
          </Button>
          <Button
            variant={mobileTab === 'evaluation' ? 'default' : 'ghost'}
            className={`flex-1 h-10 rounded-none text-xs gap-1.5 ${mobileTab === 'evaluation' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}
            onClick={() => setMobileTab('evaluation')}
            disabled={!selectedEssay}
          >
            <PenTool className="h-3.5 w-3.5" /> Evaluate
          </Button>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          <EssaySidebar
            essays={essays} selectedId={selectedId} onSelect={handleSelect}
            search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
            mobileTab={mobileTab}
          />
          {selectedEssay ? (
            <>
              <PdfViewer
                essay={selectedEssay} zoom={zoom} setZoom={setZoom}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                isBlind={selectedEssay.blindEvaluation} onTextSelect={handleTextSelect}
                mobileTab={mobileTab}
              />
              <EvaluationForm
                essay={selectedEssay} scores={scores} setScores={setScores}
                justification={justification} setJustification={setJustification}
                comments={comments} setComments={setComments}
                quotes={quotes} setQuotes={setQuotes}
                isSubmitted={isSubmitted}
                onSaveDraft={handleSaveDraft} onSubmit={handleSubmit}
                saving={saving} mobileTab={mobileTab}
              />
            </>
          ) : mobileTab !== 'list' ? (
            <EmptyState />
          ) : null}
        </div>

        {/* Submit Confirmation Dialog */}
        <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Evaluation</DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your evaluation for <strong>{selectedEssay?.anonymousId}</strong>?
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

  // ── Desktop Layout (3-Column Resizable) ───────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-120px)] p-3 gap-0">
      {/* Desktop: 3-panel resizable */}
      <PanelGroup direction="horizontal" className="flex-1">
        {/* LEFT: Essay List */}
        <Panel defaultSize={25} minSize={18} maxSize={35}>
          <div className="h-full border border-slate-200 rounded-lg bg-white overflow-hidden">
            <EssaySidebar
              essays={essays} selectedId={selectedId} onSelect={handleSelect}
              search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter}
              mobileTab=""
            />
          </div>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* MIDDLE: PDF Viewer */}
        <Panel defaultSize={45} minSize={30}>
          <div className="h-full border border-slate-200 rounded-lg bg-white overflow-hidden">
            {selectedEssay ? (
              <PdfViewer
                essay={selectedEssay} zoom={zoom} setZoom={setZoom}
                currentPage={currentPage} setCurrentPage={setCurrentPage}
                isBlind={selectedEssay.blindEvaluation} onTextSelect={handleTextSelect}
                mobileTab=""
              />
            ) : (
              <EmptyState />
            )}
          </div>
        </Panel>

        <ResizeHandle direction="vertical" />

        {/* RIGHT: Evaluation Form */}
        <Panel defaultSize={30} minSize={22} maxSize={40}>
          <div className="h-full border border-slate-200 rounded-lg bg-white overflow-hidden">
            {selectedEssay ? (
              <EvaluationForm
                essay={selectedEssay} scores={scores} setScores={setScores}
                justification={justification} setJustification={setJustification}
                comments={comments} setComments={setComments}
                quotes={quotes} setQuotes={setQuotes}
                isSubmitted={isSubmitted}
                onSaveDraft={handleSaveDraft} onSubmit={handleSubmit}
                saving={saving} mobileTab=""
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-8">
                <ClipboardList className="h-10 w-10 text-slate-300 mb-3" />
                <p className="text-sm font-medium text-slate-500">Evaluation Form</p>
                <p className="text-xs text-slate-400 mt-1">Select an essay to see the evaluation criteria</p>
              </div>
            )}
          </div>
        </Panel>
      </PanelGroup>

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Evaluation</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your evaluation for <strong>{selectedEssay?.anonymousId}</strong>?
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
