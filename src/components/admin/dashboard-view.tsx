'use client';

import React, { useEffect, useState } from 'react';
import {
  Users, GraduationCap, ClipboardCheck, Trophy, CreditCard, IndianRupee, TrendingUp,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { DashboardStats } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface TrendPoint { month: string; registrations: number; payments: number; }
interface PaymentSlice { name: string; value: number; color: string; }

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  if (n >= 1_000_000) return `₹${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(1)}K`;
  return `₹${n}`;
}

function statusColor(s: string) {
  const map: Record<string, string> = {
    Confirmed: 'bg-emerald-100 text-emerald-700',
    Paid: 'bg-emerald-100 text-emerald-700',
    Pending: 'bg-amber-100 text-amber-700',
    Verified: 'bg-teal-100 text-teal-700',
    Cancelled: 'bg-rose-100 text-rose-700',
  };
  return map[s] ?? 'bg-slate-100 text-slate-700';
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${accent}`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-500 truncate">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Skeleton Dashboard ───────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4"><CardContent className="p-5"><Skeleton className="h-[280px] w-full rounded" /></CardContent></Card>
        <Card className="lg:col-span-3"><CardContent className="p-5"><Skeleton className="h-[280px] w-full rounded" /></CardContent></Card>
      </div>
      <Card><CardContent className="p-5"><Skeleton className="h-[200px] w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function AdminDashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [paymentSlices, setPaymentSlices] = useState<PaymentSlice[]>([]);
  const [recent, setRecent] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [statsRes, trendRes, recentRes] = await Promise.all([
          fetch('/api/dashboard?action=stats'),
          fetch('/api/dashboard?action=registration-trend'),
          fetch('/api/dashboard?action=recent-registrations'),
        ]);
        const [statsJson, trendJson, recentJson] = await Promise.all([
          statsRes.json(),
          trendRes.json(),
          recentRes.json(),
        ]);
        if (statsJson.success) setStats(statsJson.data ?? null);
        if (trendJson.success) setTrend(trendJson.data ?? []);
        if (recentJson.success) {
          setRecent(recentJson.data ?? []);
        }
        // Build payment slices from stats
        if (statsJson.data) {
          const d = statsJson.data;
          const total = d.paidRegistrations + d.pendingPayments;
          const failed = d.totalRegistrations - total;
          setPaymentSlices([
            { name: 'Success', value: d.paidRegistrations || 0, color: '#10b981' },
            { name: 'Pending', value: d.pendingPayments || 0, color: '#f59e0b' },
            { name: 'Failed', value: Math.max(failed, 0), color: '#f43f5e' },
          ].filter((s) => s.value > 0));
        }
      } catch {
        // fallback: empty state — do not show mock data
        setStats({
          totalStudents: 0, totalTeachers: 0, totalExaminers: 0,
          activeCompetitions: 0, totalRegistrations: 0, paidRegistrations: 0,
          pendingPayments: 0, totalRevenue: 0, essaysSubmitted: 0,
          essaysPendingEval: 0, completedEvaluations: 0, resultsPending: 0,
          resultsPublished: 0,
        });
        setTrend([]);
        setPaymentSlices([]);
        setRecent([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;

  const s = stats;
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your essay competition platform</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard icon={GraduationCap} label="Total Students" value={s?.totalStudents ?? '—'} accent="bg-emerald-500" />
        <StatCard icon={Users} label="Total Teachers" value={s?.totalTeachers ?? '—'} accent="bg-teal-500" />
        <StatCard icon={ClipboardCheck} label="Total Examiners" value={s?.totalExaminers ?? '—'} accent="bg-amber-500" />
        <StatCard icon={Trophy} label="Active Competitions" value={s?.activeCompetitions ?? '—'} accent="bg-rose-500" />
        <StatCard icon={CreditCard} label="Paid Registrations" value={s?.paidRegistrations ?? '—'} accent="bg-emerald-600" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={fmt(s?.totalRevenue ?? 0)} accent="bg-teal-600" />
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-7">
        {/* Registration Trend */}
        <Card className="lg:col-span-4">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-600" />
              Registration Trend
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorPay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                  labelStyle={{ fontWeight: 600, color: '#334155' }}
                />
                <Area type="monotone" dataKey="registrations" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorReg)" name="Registrations" />
                <Area type="monotone" dataKey="payments" stroke="#14b8a6" strokeWidth={2} fillOpacity={1} fill="url(#colorPay)" name="Payments" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Status Pie */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-slate-800">Payment Status</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 flex flex-col items-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={paymentSlices}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {paymentSlices.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-4 mt-2">
              {paymentSlices.map((s) => (
                <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name} ({s.value})
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Registrations */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-800">Recent Registrations</CardTitle>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">No registrations yet</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg No</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Competition</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.slice(0, 10).map((r: Record<string, unknown>) => (
                  <TableRow key={r.id as string}>
                    <TableCell className="font-mono text-xs text-slate-600">{r.registrationNo as string}</TableCell>
                    <TableCell className="font-medium text-slate-800">{r.studentName as string}</TableCell>
                    <TableCell>{r.competitionName as string}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={statusColor(r.status as string)}>{r.status as string}</Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-500">{r.registeredAt ? new Date(r.registeredAt as string).toLocaleDateString('en-IN') : '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
