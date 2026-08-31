'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, CalendarDays, TrendingUp, Loader2,
  PenTool, BarChart3, ClipboardList,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useNavStore } from '@/lib/store';
import type { EvaluationStatus } from '@/lib/types';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';
import { formatDistanceToNow, parseISO, isPast, isToday, addDays } from 'date-fns';

// ── Types ────────────────────────────────────────────────────────────────────
interface ExaminerDashboardData {
  stats: {
    assigned: number;
    inProgress: number;
    completed: number;
    pending: number;
  };
  pendingEssays: PendingEssay[];
  recentCompleted: RecentCompleted[];
  workloadByCompetition: WorkloadItem[];
}

interface PendingEssay {
  id: string;
  anonymousId: string;
  competition: string;
  category: string;
  assignedAt: string;
  deadline: string;
}

interface RecentCompleted {
  id: string;
  anonymousId: string;
  competition: string;
  score: number;
  maxScore: number;
  completedAt: string;
}

interface WorkloadItem {
  competition: string;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_DATA: ExaminerDashboardData = {
  stats: { assigned: 24, inProgress: 7, completed: 14, pending: 3 },
  pendingEssays: [
    { id: 'e1', anonymousId: 'Essay-2024-042', competition: 'National Essay Competition 2025', category: 'Senior (16-18)', assignedAt: '2025-07-08T10:00:00Z', deadline: '2025-07-18T23:59:00Z' },
    { id: 'e2', anonymousId: 'Essay-2024-039', competition: 'National Essay Competition 2025', category: 'Junior (13-15)', assignedAt: '2025-07-07T14:00:00Z', deadline: '2025-07-15T23:59:00Z' },
    { id: 'e3', anonymousId: 'Essay-2024-051', competition: 'Inter-School Essay Challenge', category: 'Senior (16-18)', assignedAt: '2025-07-06T09:00:00Z', deadline: '2025-07-12T23:59:00Z' },
    { id: 'e4', anonymousId: 'Essay-2024-055', competition: 'Inter-School Essay Challenge', category: 'Junior (13-15)', assignedAt: '2025-07-05T11:00:00Z', deadline: '2025-07-14T23:59:00Z' },
    { id: 'e5', anonymousId: 'Essay-2024-060', competition: 'State Level Essay Writing', category: 'Senior (16-18)', assignedAt: '2025-07-04T08:00:00Z', deadline: '2025-07-10T23:59:00Z' },
  ],
  recentCompleted: [
    { id: 'c1', anonymousId: 'Essay-2024-018', competition: 'National Essay Competition 2025', score: 82, maxScore: 100, completedAt: '2025-07-08T16:30:00Z' },
    { id: 'c2', anonymousId: 'Essay-2024-025', competition: 'National Essay Competition 2025', score: 76, maxScore: 100, completedAt: '2025-07-08T14:15:00Z' },
    { id: 'c3', anonymousId: 'Essay-2024-031', competition: 'Inter-School Essay Challenge', score: 91, maxScore: 100, completedAt: '2025-07-07T18:45:00Z' },
    { id: 'c4', anonymousId: 'Essay-2024-015', competition: 'State Level Essay Writing', score: 68, maxScore: 100, completedAt: '2025-07-07T11:00:00Z' },
  ],
  workloadByCompetition: [
    { competition: 'National Essay Competition 2025', total: 12, completed: 7, inProgress: 3, pending: 2 },
    { competition: 'Inter-School Essay Challenge', total: 8, completed: 5, inProgress: 2, pending: 1 },
    { competition: 'State Level Essay Writing', total: 4, completed: 2, inProgress: 2, pending: 0 },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function deadlineClass(deadline: string) {
  const d = parseISO(deadline);
  if (isPast(d)) return { text: 'text-rose-600', badge: 'bg-rose-100 text-rose-700', label: 'Overdue' };
  if (isToday(d) || isPast(addDays(d, 2))) return { text: 'text-amber-600', badge: 'bg-amber-100 text-amber-700', label: 'Due Soon' };
  return { text: 'text-slate-500', badge: 'bg-slate-100 text-slate-600', label: 'On Track' };
}

function scoreColor(score: number, max: number) {
  const pct = (score / max) * 100;
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-teal-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-64 rounded-xl lg:col-span-2" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, bg }: {
  icon: React.ElementType; label: string; value: number; color: string; bg: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold text-slate-800">{value}</p>
            </div>
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function ExaminerDashboardView() {
  const [data, setData] = useState<ExaminerDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavStore((s) => s.navigate);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=examiner-dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setData(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setData(MOCK_DATA);
      setLoading(false);
    }
    load();
  }, []);

  if (loading || !data) return <DashboardSkeleton />;

  const { stats, pendingEssays, recentCompleted, workloadByCompetition } = data;
  const total = stats.assigned;
  const progressPct = total > 0 ? Math.round((stats.completed / total) * 100) : 0;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Examiner Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of your evaluation assignments and progress</p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={ClipboardList} label="Assigned Essays" value={stats.assigned} color="text-slate-600" bg="bg-slate-100" />
        <StatCard icon={PenTool} label="In Progress" value={stats.inProgress} color="text-amber-600" bg="bg-amber-50" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed} color="text-emerald-600" bg="bg-emerald-50" />
        <StatCard icon={AlertTriangle} label="Pending Start" value={stats.pending} color="text-rose-600" bg="bg-rose-50" />
      </div>

      {/* Progress Bar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-700">Overall Progress</p>
              </div>
              <p className="text-sm font-bold text-slate-800">{stats.completed} / {total} essays ({progressPct}%)</p>
            </div>
            <Progress value={progressPct} className="h-3" />
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              <span>{stats.pending} pending</span>
              <span>{stats.inProgress} in progress</span>
              <span>{stats.completed} completed</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pending Essays */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-amber-500" />
                  Pending Essays
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">{pendingEssays.length}</Badge>
                </CardTitle>
                <Button variant="outline" size="sm" className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => navigate('examiner-workspace')}>
                  View All <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {pendingEssays.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle2 className="h-10 w-10 text-emerald-300 mb-2" />
                    <p className="text-sm text-slate-500">All essays have been evaluated!</p>
                  </div>
                ) : (
                  pendingEssays.map((essay) => {
                    const dl = deadlineClass(essay.deadline);
                    return (
                      <div
                        key={essay.id}
                        className="flex items-center gap-4 rounded-lg border border-slate-200 p-3.5 cursor-pointer transition-all hover:border-emerald-300 hover:bg-emerald-50/30"
                        onClick={() => navigate('examiner-workspace')}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                          <FileText className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{essay.anonymousId}</p>
                          <p className="text-xs text-slate-500 truncate">{essay.competition} · {essay.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge variant="secondary" className={dl.badge}>{dl.label}</Badge>
                          <p className={`text-xs mt-1 ${dl.text}`}>
                            {dl.label === 'Overdue' ? 'Past due' : `Due ${formatDistanceToNow(parseISO(essay.deadline), { addSuffix: true })}`}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-300 shrink-0" />
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Workload Distribution */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-teal-500" />
                Workload Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-5">
                {workloadByCompetition.map((wl, idx) => {
                  const pct = wl.total > 0 ? Math.round((wl.completed / wl.total) * 100) : 0;
                  return (
                    <div key={idx}>
                      <div className="flex items-start justify-between mb-1.5">
                        <p className="text-sm font-medium text-slate-700 leading-tight pr-2">{wl.competition}</p>
                        <p className="text-xs text-slate-400 shrink-0">{wl.completed}/{wl.total}</p>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.3 + idx * 0.1 }}
                          className="absolute inset-y-0 left-0 rounded-full bg-emerald-500"
                        />
                        {wl.inProgress > 0 && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(wl.inProgress / wl.total) * 100}%` }}
                            transition={{ duration: 0.8, delay: 0.4 + idx * 0.1 }}
                            className="absolute inset-y-0 rounded-full bg-amber-400"
                            style={{ left: `${pct}%` }}
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{wl.completed} done</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{wl.inProgress} active</span>
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-200" />{wl.pending} pending</span>
                      </div>
                      {idx < workloadByCompetition.length - 1 && <Separator className="mt-4" />}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Completed Evaluations */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Recent Completed Evaluations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {recentCompleted.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
                  <CheckCircle2 className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No completed evaluations yet</p>
                </div>
              ) : (
                recentCompleted.map((rc) => (
                  <div key={rc.id} className="rounded-lg border border-slate-200 p-4 transition-all hover:border-emerald-200 hover:shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono font-semibold text-slate-600">{rc.anonymousId}</p>
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">Done</Badge>
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-2">{rc.competition}</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-2xl font-bold ${scoreColor(rc.score, rc.maxScore)}`}>{rc.score}</p>
                        <p className="text-xs text-slate-400">out of {rc.maxScore}</p>
                      </div>
                      <p className="text-xs text-slate-400">{formatDistanceToNow(parseISO(rc.completedAt), { addSuffix: true })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
