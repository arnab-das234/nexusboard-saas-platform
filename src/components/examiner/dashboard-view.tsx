'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, Clock, CheckCircle2, AlertTriangle,
  ArrowRight, CalendarDays, TrendingUp, Loader2,
  PenTool, BarChart3, ClipboardList, GraduationCap,
  CalendarClock, Award, Inbox, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useAuthStore, useNavStore } from '@/lib/store';
import { toast } from 'sonner';
import type { EvaluationStatus } from '@/lib/types';
import { EVALUATION_STATUS_LABELS } from '@/lib/constants';

// ── Types ────────────────────────────────────────────────────────────────────
interface EvaluationRecord {
  id: string;
  essayId: string;
  status: string;
  totalMarks: number | null;
  submittedAt: string | null;
  createdAt: string;
  essay?: {
    id: string;
    fileName: string | null;
    competition: { name: string };
  };
  assignment?: {
    deadline: string | null;
    status: string;
  };
}

interface DashboardStats {
  totalAssigned: number;
  pending: number;
  inProgress: number;
  completed: number;
  averageScore: number;
  completionPct: number;
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

function deadlineInfo(deadline: string | null) {
  if (!deadline) return { text: 'No deadline', cls: 'text-slate-400', badgeCls: 'bg-slate-100 text-slate-500', label: 'N/A' };
  const now = Date.now();
  const dl = new Date(deadline).getTime();
  const diffHours = (dl - now) / (1000 * 60 * 60);
  if (diffHours < 0) return { text: 'Overdue', cls: 'text-rose-600', badgeCls: 'bg-rose-100 text-rose-700', label: 'Overdue' };
  if (diffHours < 48) return { text: 'Due soon', cls: 'text-amber-600', badgeCls: 'bg-amber-100 text-amber-700', label: 'Due Soon' };
  if (diffHours < 120) return { text: `${Math.ceil(diffHours / 24)}d left`, cls: 'text-orange-500', badgeCls: 'bg-orange-50 text-orange-600', label: `${Math.ceil(diffHours / 24)}d left` };
  return { text: `${Math.ceil(diffHours / 24)}d left`, cls: 'text-slate-500', badgeCls: 'bg-slate-100 text-slate-600', label: 'On Track' };
}

function statusBadgeVariant(status: string) {
  switch (status) {
    case 'ASSIGNED': return 'bg-slate-100 text-slate-700';
    case 'IN_PROGRESS': return 'bg-amber-100 text-amber-700';
    case 'SUBMITTED': return 'bg-emerald-100 text-emerald-700';
    case 'LOCKED': return 'bg-rose-100 text-rose-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function scoreColor(score: number, max: number) {
  const pct = max > 0 ? (score / max) * 100 : 0;
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-teal-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-rose-600';
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-24 rounded-xl" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Skeleton className="h-80 rounded-xl lg:col-span-2" />
        <Skeleton className="h-80 rounded-xl" />
      </div>
    </div>
  );
}

// ── Error State ──────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 mb-4"
      >
        <AlertTriangle className="h-8 w-8 text-rose-500" />
      </motion.div>
      <h3 className="text-lg font-semibold text-slate-700">Failed to Load Dashboard</h3>
      <p className="text-sm text-slate-500 mt-1 max-w-md text-center">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4 gap-2">
        <Loader2 className="h-4 w-4" /> Try Again
      </Button>
    </div>
  );
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, bg }: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; bg: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              <p className="mt-1.5 text-2xl font-bold text-slate-800">{value}</p>
              {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-5 w-5 ${color}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function ExaminerDashboardView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const [evaluations, setEvaluations] = useState<EvaluationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examinerId = (user as Record<string, unknown> | null)?.examinerProfile
    ? ((user as Record<string, unknown>).examinerProfile as { id: string }).id
    : user?.id;

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/evaluations?examinerId=${examinerId}&pageSize=100`);
      if (!res.ok) throw new Error('Failed to fetch evaluations');
      const json = await res.json();
      if (json.success) {
        setEvaluations(json.data || []);
      } else {
        throw new Error(json.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [examinerId]);

  const stats = useMemo<DashboardStats>(() => {
    const assigned = evaluations.length;
    const submitted = evaluations.filter((e) => e.status === 'SUBMITTED');
    const inProgress = evaluations.filter((e) => e.status === 'IN_PROGRESS');
    const pending = evaluations.filter((e) => e.status === 'ASSIGNED');
    const completedCount = submitted.length;
    const totalScored = submitted.reduce((sum, e) => sum + (e.totalMarks || 0), 0);
    const avg = completedCount > 0 ? Math.round((totalScored / completedCount) * 10) / 10 : 0;
    const pct = assigned > 0 ? Math.round((completedCount / assigned) * 100) : 0;
    return { totalAssigned: assigned, pending: pending.length, inProgress: inProgress.length, completed: completedCount, averageScore: avg, completionPct: pct };
  }, [evaluations]);

  const recentEvals = useMemo(() => {
    return [...evaluations]
      .sort((a, b) => new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime())
      .slice(0, 6);
  }, [evaluations]);

  const upcomingDeadlines = useMemo(() => {
    return evaluations
      .filter((e) => e.status !== 'SUBMITTED' && e.status !== 'LOCKED' && e.assignment?.deadline)
      .sort((a, b) => new Date(a.assignment!.deadline!).getTime() - new Date(b.assignment!.deadline!).getTime())
      .slice(0, 4);
  }, [evaluations]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const hasNoData = evaluations.length === 0;
  const specialization = (user as Record<string, unknown> | null)?.examinerProfile
    ? ((user as Record<string, unknown>).examinerProfile as { specialization?: string }).specialization || ''
    : '';

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white overflow-hidden relative">
          <CardContent className="p-6">
            <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-emerald-100 text-sm font-medium">Welcome back,</p>
                <h1 className="text-2xl font-bold mt-1">
                  {user?.name || 'Examiner'}
                  {specialization && (
                    <span className="text-emerald-200 text-base font-normal ml-2">· {specialization}</span>
                  )}
                </h1>
                <p className="text-emerald-100 text-sm mt-2">
                  You have <span className="font-bold text-white">{stats.pending}</span> pending and <span className="font-bold text-white">{stats.inProgress}</span> in-progress evaluations.
                </p>
              </div>
              <Button
                className="bg-white text-emerald-700 hover:bg-emerald-50 font-semibold gap-2 shadow-lg self-start sm:self-auto"
                onClick={() => navigate('examiner-workspace')}
              >
                <PenTool className="h-4 w-4" />
                Go to Workspace
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/2 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
          </CardContent>
        </Card>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={ClipboardList}
          label="Total Assigned"
          value={stats.totalAssigned}
          sub="All essays assigned to you"
          color="text-slate-600" bg="bg-slate-100"
        />
        <StatCard
          icon={Inbox}
          label="Pending Evaluation"
          value={stats.pending}
          sub="Not yet started"
          color="text-rose-600" bg="bg-rose-50"
        />
        <StatCard
          icon={Clock}
          label="In Progress"
          value={stats.inProgress}
          sub="Currently working on"
          color="text-amber-600" bg="bg-amber-50"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed"
          value={stats.completed}
          sub={`${stats.completionPct}% of assigned`}
          color="text-emerald-600" bg="bg-emerald-50"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Score Given"
          value={stats.averageScore || '—'}
          sub={stats.completed > 0 ? `Based on ${stats.completed} evals` : 'No submissions yet'}
          color="text-teal-600" bg="bg-teal-50"
        />
      </div>

      {/* Progress Bar */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                <p className="text-sm font-semibold text-slate-700">Overall Completion Progress</p>
              </div>
              <p className="text-sm font-bold text-slate-800">
                {stats.completed} / {stats.totalAssigned} essays ({stats.completionPct}%)
              </p>
            </div>
            <Progress value={stats.completionPct} className="h-3" />
            <div className="flex justify-between mt-2.5 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-slate-300" />{stats.pending} pending
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400" />{stats.inProgress} in progress
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />{stats.completed} completed
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Empty State */}
      {hasNoData ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 mb-4">
                <GraduationCap className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700">No Assignments Yet</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md">
                You haven&apos;t been assigned any essays for evaluation yet.
                When assignments are made, they will appear here.
              </p>
              <Button
                variant="outline"
                className="mt-4 gap-2"
                onClick={() => navigate('examiner-workspace')}
              >
                <PenTool className="h-4 w-4" /> Open Workspace
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Recent Evaluations */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="lg:col-span-2"
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-4 w-4 text-teal-500" />
                      Recent Evaluations
                      <Badge variant="secondary" className="bg-teal-100 text-teal-700 text-xs">
                        {stats.totalAssigned} total
                      </Badge>
                    </CardTitle>
                    <Button
                      variant="outline" size="sm"
                      className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                      onClick={() => navigate('examiner-workspace')}
                    >
                      View All <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {recentEvals.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <FileText className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No evaluations yet</p>
                      </div>
                    ) : (
                      recentEvals.map((ev, idx) => {
                        const dl = deadlineInfo(ev.assignment?.deadline ?? null);
                        return (
                          <div
                            key={ev.id}
                            className="flex items-center gap-3 rounded-lg border border-slate-200 p-3.5 transition-all hover:border-emerald-300 hover:bg-emerald-50/30 cursor-pointer"
                            onClick={() => navigate('examiner-workspace')}
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                              <FileText className="h-5 w-5 text-slate-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                  {ev.essay?.fileName || `Essay ${idx + 1}`}
                                </p>
                                <Badge variant="secondary" className={`${statusBadgeVariant(ev.status)} text-xs shrink-0`}>
                                  {EVALUATION_STATUS_LABELS[ev.status as EvaluationStatus] || ev.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-400 truncate mt-0.5">
                                {ev.essay?.competition?.name || 'Competition'}
                              </p>
                            </div>
                            <div className="text-right shrink-0">
                              {ev.status === 'SUBMITTED' && ev.totalMarks != null ? (
                                <p className={`text-lg font-bold ${scoreColor(ev.totalMarks, 100)}`}>
                                  {ev.totalMarks}
                                </p>
                              ) : (
                                <Badge variant="secondary" className={`${dl.badgeCls} text-xs`}>
                                  {dl.label}
                                </Badge>
                              )}
                              <p className="text-xs text-slate-400 mt-1">
                                {ev.submittedAt ? timeAgo(ev.submittedAt) : timeAgo(ev.createdAt)}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 shrink-0" />
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Upcoming Deadlines */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <CalendarClock className="h-4 w-4 text-amber-500" />
                    Upcoming Deadlines
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {upcomingDeadlines.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-center">
                        <CalendarDays className="h-10 w-10 text-slate-300 mb-2" />
                        <p className="text-sm text-slate-500">No upcoming deadlines</p>
                        <p className="text-xs text-slate-400 mt-0.5">All caught up!</p>
                      </div>
                    ) : (
                      upcomingDeadlines.map((ev) => {
                        const dl = deadlineInfo(ev.assignment?.deadline ?? null);
                        return (
                          <div
                            key={ev.id}
                            className="rounded-lg border border-slate-200 p-3.5 cursor-pointer transition-all hover:border-amber-300 hover:bg-amber-50/30"
                            onClick={() => navigate('examiner-workspace')}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-700 truncate">
                                  {ev.essay?.fileName || 'Essay'}
                                </p>
                                <p className="text-xs text-slate-400 truncate mt-0.5">
                                  {ev.essay?.competition?.name || 'Competition'}
                                </p>
                              </div>
                              <Badge variant="secondary" className={`${dl.badgeCls} text-xs shrink-0`}>
                                {dl.label}
                              </Badge>
                            </div>
                            {ev.assignment?.deadline && (
                              <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-400">
                                <CalendarDays className="h-3 w-3" />
                                <span>
                                  Due: {new Date(ev.assignment.deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary" className={`${statusBadgeVariant(ev.status)} text-xs`}>
                                {EVALUATION_STATUS_LABELS[ev.status as EvaluationStatus] || ev.status}
                              </Badge>
                              <span className="text-xs text-slate-400 ml-auto">{timeAgo(ev.createdAt)}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Recently Completed Scores */}
          {stats.completed > 0 && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Award className="h-4 w-4 text-emerald-500" />
                    Recently Completed Evaluations
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">
                      {stats.completed}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {evaluations
                      .filter((e) => e.status === 'SUBMITTED' && e.submittedAt)
                      .sort((a, b) => new Date(b.submittedAt!).getTime() - new Date(a.submittedAt!).getTime())
                      .slice(0, 4)
                      .map((ev) => (
                        <div key={ev.id} className="rounded-lg border border-slate-200 p-4 transition-all hover:border-emerald-200 hover:shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-mono font-semibold text-slate-600 truncate">
                              {ev.essay?.fileName || 'Essay'}
                            </p>
                            <Badge className="bg-emerald-100 text-emerald-700 text-xs">Done</Badge>
                          </div>
                          <p className="text-xs text-slate-500 truncate mb-3">
                            {ev.essay?.competition?.name || 'Competition'}
                          </p>
                          <div className="flex items-end justify-between">
                            <div>
                              <p className={`text-2xl font-bold ${scoreColor(ev.totalMarks || 0, 100)}`}>
                                {ev.totalMarks ?? 0}
                              </p>
                              <p className="text-xs text-slate-400">out of 100</p>
                            </div>
                            {ev.submittedAt && (
                              <p className="text-xs text-slate-400">{timeAgo(ev.submittedAt)}</p>
                            )}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
