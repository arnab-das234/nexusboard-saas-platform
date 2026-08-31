'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {  Award, Eye, ChevronLeft, ChevronRight, AlertTriangle,} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Result {
  rank: number; studentName: string; anonymousName: string;
  categoryName: string; avgScore: number; finalScore: number;
  published: boolean;
}

interface CompetitionOption { id: string; name: string; hasResults: boolean; isPublished: boolean; }

const PAGE_SIZE = 10;

const MOCK_COMPS: CompetitionOption[] = [
  { id: 'CMP-001', name: 'National Essay 2025', hasResults: true, isPublished: false },
  { id: 'CMP-002', name: 'State Level Essay', hasResults: true, isPublished: true },
  { id: 'CMP-003', name: 'Inter-School Essay', hasResults: true, isPublished: false },
];

const MOCK_RESULTS: Record<string, Result[]> = {
  'CMP-001': Array.from({ length: 25 }, (_, i) => ({
    rank: i + 1,
    studentName: ['Aarav Sharma', 'Priya Nair', 'Rohit Patel', 'Ananya Gupta', 'Karthik Iyer'][i % 5],
    anonymousName: `Participant #${String(i + 1).padStart(3, '0')}`,
    categoryName: ['Junior (10-13)', 'Senior (14-17)', 'Open (18+)'][i % 3],
    avgScore: Math.round((95 - i * 2.5 + Math.random() * 5) * 10) / 10,
    finalScore: Math.round((95 - i * 2.5 + Math.random() * 5) * 10) / 10,
    published: false,
  })),
  'CMP-002': Array.from({ length: 20 }, (_, i) => ({
    rank: i + 1,
    studentName: ['Meera Joshi', 'Arjun Reddy', 'Sneha Kulkarni', 'Vikram Singh', 'Diya Menon'][i % 5],
    anonymousName: `Participant #${String(i + 1).padStart(3, '0')}`,
    categoryName: ['Category A (12-14)', 'Category B (15-18)'][i % 2],
    avgScore: Math.round((92 - i * 2 + Math.random() * 4) * 10) / 10,
    finalScore: Math.round((92 - i * 2 + Math.random() * 4) * 10) / 10,
    published: true,
  })),
  'CMP-003': Array.from({ length: 18 }, (_, i) => ({
    rank: i + 1,
    studentName: ['Aditya Rao', 'Ishita Verma', 'Nikhil Das', 'Pooja Srinivasan', 'Rahul Mehta'][i % 5],
    anonymousName: `Participant #${String(i + 1).padStart(3, '0')}`,
    categoryName: ['Sub-Junior (8-11)', 'Junior (12-14)'][i % 2],
    avgScore: Math.round((90 - i * 3 + Math.random() * 5) * 10) / 10,
    finalScore: Math.round((90 - i * 3 + Math.random() * 5) * 10) / 10,
    published: false,
  })),
};

function rankBadge(rank: number) {
  if (rank === 1) return 'bg-amber-100 text-amber-800';
  if (rank === 2) return 'bg-slate-200 text-slate-700';
  if (rank === 3) return 'bg-orange-100 text-orange-700';
  return '';
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[450px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminResultsView() {
  const [competitions, setCompetitions] = useState<CompetitionOption[]>([]);
  const [selectedComp, setSelectedComp] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [anonymous, setAnonymous] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [page, setPage] = useState(1);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-results');
      const json = await res.json();
      if (json.success && json.data) {
        setCompetitions(json.data.competitions ?? MOCK_COMPS);
        return;
      }
    } catch {} finally { setLoading(false); }
    setCompetitions(MOCK_COMPS);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (selectedComp) {
      setResults(MOCK_RESULTS[selectedComp] ?? []);
      setPage(1);
    } else {
      setResults([]);
    }
  }, [selectedComp]);

  const totalPages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const pageData = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const currentComp = competitions.find((c) => c.id === selectedComp);

  const handlePublish = () => {
    toast.success(`Results for ${currentComp?.name} published successfully`);
    setPublishOpen(false);
    setCompetitions((prev) => prev.map((c) => c.id === selectedComp ? { ...c, isPublished: true } : c));
  };

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Results</h1>
          <p className="text-sm text-slate-500">Review and publish competition results</p>
        </div>
        {currentComp && !currentComp.isPublished && results.length > 0 && (
          <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setPublishOpen(true)}>
            <Award className="h-4 w-4 mr-1.5" /> Publish Results
          </Button>
        )}
        {currentComp?.isPublished && (
          <Badge className="bg-teal-100 text-teal-700 border-teal-200 border">Results Published</Badge>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={selectedComp} onValueChange={setSelectedComp}>
          <SelectTrigger className="w-[300px]"><SelectValue placeholder="Select competition..." /></SelectTrigger>
          <SelectContent>
            {competitions.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} {c.isPublished && '✓'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {results.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            Anonymous mode
          </label>
        )}
      </div>

      {!selectedComp ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Award className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">Select a competition</p>
          <p className="text-sm text-slate-400 mt-1">Choose a competition to view its results</p>
        </div>
      ) : results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Award className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No results available</p>
          <p className="text-sm text-slate-400 mt-1">Results will appear once evaluations are complete</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="w-16">Rank</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Avg Score</TableHead>
                <TableHead className="text-right">Final Score</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((r) => (
                <TableRow key={r.rank}>
                  <TableCell>
                    <Badge variant={r.rank <= 3 ? 'secondary' : 'outline'} className={`font-bold ${rankBadge(r.rank)}`}>
                      {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : `#${r.rank}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-slate-800">
                    {anonymous ? r.anonymousName : r.studentName}
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{r.categoryName}</TableCell>
                  <TableCell className="text-right font-mono text-slate-700">{r.avgScore}</TableCell>
                  <TableCell className="text-right font-mono font-semibold text-slate-800">{r.finalScore}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className={r.published ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                      {r.published ? 'Published' : 'Draft'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, results.length)} of {results.length}</p>
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
      )}

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishOpen} onOpenChange={setPublishOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /> Publish Results</DialogTitle>
            <DialogDescription>This action cannot be undone. All participants will be notified.</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-medium">You are about to publish results for:</p>
            <p className="mt-1 font-semibold">{currentComp?.name}</p>
            <p className="mt-2">Total participants: <strong>{results.length}</strong></p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishOpen(false)}>Cancel</Button>
            <Button className="bg-rose-600 hover:bg-rose-700" onClick={handlePublish}>Publish Now</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
