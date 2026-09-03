'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Award, Clock, Trophy, AlertCircle, BarChart3, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Registration {
  id: string; competitionId: string; status: string;
  competition?: { name: string; status: string };
  result?: {
    id: string; rank?: number; finalScore?: number; averageScore?: number;
    category?: { name: string } | null; status: string; publishedAt?: string;
  };
}

function getMedal(rank: number) {
  if (rank === 1) return { icon: '🥇', label: 'Gold', cls: 'from-amber-400 to-yellow-300 text-amber-900' };
  if (rank === 2) return { icon: '🥈', label: 'Silver', cls: 'from-slate-300 to-slate-200 text-slate-700' };
  if (rank === 3) return { icon: '🥉', label: 'Bronze', cls: 'from-orange-400 to-amber-300 text-orange-900' };
  return null;
}

function ResultsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <Card><CardContent className="p-8"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
    </div>
  );
}

export function StudentResultsView() {
  const user = useAuthStore((s) => s.user);
  const sp = (user as unknown as Record<string, unknown>)?.studentProfile as { id: string } | undefined;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!sp?.id) { if (!cancelled) setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const res = await fetch(`/api/registrations?studentId=${sp.id}`);
        if (cancelled) return;
        if (res.ok) { const j = await res.json(); setRegistrations(j.data ?? []); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load results');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sp?.id, reloadKey]);

  const publishedResults = registrations.filter(r => r.result?.status === 'PUBLISHED');
  const pendingResults = registrations.filter(r =>
    r.competition?.status === 'RESULT_PUBLISHED' || ['EVALUATED', 'UNDER_EVALUATION'].includes(r.result?.status ?? '')
  );
  const otherRegs = registrations.filter(r =>
    !publishedResults.includes(r) && !pendingResults.includes(r) &&
    !['CANCELLED'].includes(r.status)
  );

  if (loading) return <ResultsSkeleton />;
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

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Results</h1>
        <p className="text-sm text-slate-500">View your competition results and scores</p>
      </motion.div>

      {registrations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-12 w-12 text-slate-300 mb-3" />
            <p className="text-slate-600 font-medium">No registrations yet</p>
            <p className="text-sm text-slate-400 mt-1">Register for competitions to see results here</p>
          </CardContent>
        </Card>
      ) : publishedResults.length === 0 && pendingResults.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Clock className="h-12 w-12 text-amber-400 mb-3" />
            <h2 className="text-lg font-semibold text-slate-700">Results Will Be Published Soon</h2>
            <p className="text-sm text-slate-500 mt-1 max-w-md">
              Your essays are being evaluated. Results will be published once the evaluation is complete.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Published Results */}
          {publishedResults.map(reg => {
            const result = reg.result!;
            const rank = result.rank ?? 0;
            const score = result.finalScore ?? result.averageScore ?? 0;
            const medal = getMedal(rank);

            return (
              <motion.div key={reg.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                <Card className="overflow-hidden">
                  <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white">
                    <p className="text-sm font-medium">{reg.competition?.name ?? 'Competition'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {result.category?.name && <Badge className="bg-white/20 text-white border-0 text-xs">{result.category.name}</Badge>}
                      {result.publishedAt && <span className="text-xs text-emerald-200">Published {new Date(result.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                    </div>
                  </div>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="flex flex-col items-center">
                        {medal ? (
                          <div className={`flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b ${medal.cls} p-6 min-w-[120px]`}>
                            <span className="text-4xl mb-1">{medal.icon}</span>
                            <span className="text-2xl font-black">#{rank}</span>
                            <span className="text-xs font-medium uppercase tracking-wider opacity-80">{medal.label}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 p-6 min-w-[120px]">
                            <Trophy className="h-10 w-10 text-slate-400 mb-1" />
                            <span className="text-2xl font-black text-slate-700">#{rank}</span>
                            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Rank</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 w-full">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-center rounded-lg bg-emerald-50 p-4">
                            <p className="text-3xl font-black text-emerald-700">{score}</p>
                            <p className="text-xs text-emerald-600 font-medium mt-0.5">Score</p>
                          </div>
                          <div className="text-center rounded-lg bg-teal-50 p-4">
                            <p className="text-3xl font-black text-teal-700">{rank}</p>
                            <p className="text-xs text-teal-600 font-medium mt-0.5">Rank</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {/* Pending Results */}
          {pendingResults.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base">Evaluation In Progress</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                {pendingResults.map(reg => (
                  <div key={reg.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100">
                        <Clock className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{reg.competition?.name ?? 'Competition'}</p>
                        <p className="text-xs text-slate-500">{reg.result?.status === 'UNDER_EVALUATION' ? 'Your essay is being evaluated' : 'Evaluation completed, results pending'}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-amber-50 text-amber-700">In Progress</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Other registrations info */}
          {otherRegs.length > 0 && publishedResults.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Star className="h-4 w-4" />
                  <span>{otherRegs.length} other competition{otherRegs.length > 1 ? 's' : ''} with results not yet available</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
