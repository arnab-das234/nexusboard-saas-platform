'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, Medal, Download, BarChart3, Clock, CheckCircle2, Star, Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface ResultData {
  published: boolean;
  competitionName: string;
  score: number;
  totalMarks: number;
  rank: number;
  totalParticipants: number;
  category: string;
  percentile: number;
  criteriaBreakdown: Array<{ name: string; marks: number; maxMarks: number }>;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_RESULT: ResultData = {
  published: true,
  competitionName: 'National Essay Competition 2025',
  score: 87,
  totalMarks: 100,
  rank: 2,
  totalParticipants: 1250,
  category: 'Senior (15-18 years)',
  percentile: 98.4,
  criteriaBreakdown: [
    { name: 'Content & Originality', marks: 22, maxMarks: 25 },
    { name: 'Structure & Organization', marks: 18, maxMarks: 20 },
    { name: 'Language & Grammar', marks: 17, maxMarks: 20 },
    { name: 'Creativity & Imagination', marks: 15, maxMarks: 20 },
    { name: 'Relevance to Topic', marks: 15, maxMarks: 15 },
  ],
};

const MOCK_UNPUBLISHED: ResultData = {
  published: false,
  competitionName: 'National Essay Competition 2025',
  score: 0, totalMarks: 100, rank: 0, totalParticipants: 0,
  category: '', percentile: 0, criteriaBreakdown: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getMedal(rank: number) {
  if (rank === 1) return { icon: '🥇', label: 'Gold', cls: 'from-amber-400 to-yellow-300 text-amber-900' };
  if (rank === 2) return { icon: '🥈', label: 'Silver', cls: 'from-slate-300 to-slate-200 text-slate-700' };
  if (rank === 3) return { icon: '🥉', label: 'Bronze', cls: 'from-orange-400 to-amber-300 text-orange-900' };
  return null;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ResultsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Card><CardContent className="p-8"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentResultsView() {
  const [result, setResult] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-results');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setResult(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setResult(MOCK_RESULT);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <ResultsSkeleton />;
  if (!result) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Results</h1>
        <p className="text-sm text-slate-500">View your competition results and scores</p>
      </motion.div>

      {!result.published ? (
        /* Not Published */
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 mb-4">
                <Clock className="h-8 w-8 text-amber-500" />
              </div>
              <h2 className="text-lg font-semibold text-slate-700">Results Not Yet Published</h2>
              <p className="text-sm text-slate-500 mt-1 max-w-md">
                The results for <span className="font-medium">{result.competitionName}</span> have not been published yet. Please check back later.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        /* Results Published */
        <>
          {/* Score Card */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                <p className="text-sm text-emerald-100">{result.competitionName}</p>
                <p className="text-xs text-emerald-200 mt-0.5">Category: {result.category}</p>
              </div>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  {/* Medal / Rank */}
                  <div className="flex flex-col items-center">
                    {getMedal(result.rank) ? (
                      <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b ${getMedal(result.rank)!.cls} p-6 min-w-[120px]`}>
                        <span className="text-4xl mb-1">{getMedal(result.rank)!.icon}</span>
                        <span className="text-2xl font-black">#{result.rank}</span>
                        <span className="text-xs font-medium uppercase tracking-wider opacity-80">{getMedal(result.rank)!.label}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 p-6 min-w-[120px]">
                        <Trophy className="h-10 w-10 text-slate-400 mb-1" />
                        <span className="text-2xl font-black text-slate-700">#{result.rank}</span>
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</span>
                      </div>
                    )}
                  </div>

                  {/* Score Details */}
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center rounded-lg bg-emerald-50 p-4">
                        <p className="text-3xl font-black text-emerald-700">{result.score}</p>
                        <p className="text-xs text-emerald-600 font-medium mt-0.5">out of {result.totalMarks}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">TOTAL SCORE</p>
                      </div>
                      <div className="text-center rounded-lg bg-teal-50 p-4">
                        <p className="text-3xl font-black text-teal-700">{result.percentile}%</p>
                        <p className="text-xs text-teal-600 font-medium mt-0.5">percentile</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">PERCENTILE</p>
                      </div>
                      <div className="text-center rounded-lg bg-slate-50 p-4">
                        <p className="text-3xl font-black text-slate-700">{result.totalParticipants.toLocaleString()}</p>
                        <p className="text-xs text-slate-600 font-medium mt-0.5">participants</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">TOTAL</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Score Breakdown */}
          {result.criteriaBreakdown.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                    <CardTitle className="text-base">Score Breakdown</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {result.criteriaBreakdown.map((c, i) => {
                    const pct = (c.marks / c.maxMarks) * 100;
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">{c.name}</span>
                          <span className="text-sm font-semibold text-slate-800">{c.marks}/{c.maxMarks}</span>
                        </div>
                        <div className="h-2.5 w-full rounded-full bg-slate-100">
                          <div
                            className={`h-2.5 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-teal-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">Total</span>
                    <span className="text-sm font-bold text-emerald-700">{result.score}/{result.totalMarks}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Download Certificate */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100">
                      <Award className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Download Certificate</p>
                      <p className="text-xs text-slate-500">Your participation certificate is ready</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => toast.info('Certificate download will be available soon.')}
                  >
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </div>
  );
}
