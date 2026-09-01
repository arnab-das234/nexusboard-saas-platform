'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, CreditCard, FileText, IndianRupee, UserPlus, Users, Activity, AlertCircle, BookOpen, RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore, useNavStore } from '@/lib/store';

// ── Types ────────────────────────────────────────────────────────────────────
interface RegistrationRecord {
  id: string; registrationNo: string;
  student: { user: { name: string | null; email: string }; id: string };
  competition: { id: string; name: string };
  status: string;
  payments: { status: string }[];
  essays: { status: string }[];
  registeredAt: string;
}

interface NotificationRecord {
  id: string; title: string; message: string;
  type: string; isRead: boolean; createdAt: string;
}

interface DashboardStats {
  totalStudents: number; registered: number; paid: number;
  essaysSubmitted: number; pendingPayments: number;
}

function statusBadge(status: string) {
  const m: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700', PAID: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700', PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700', CREATED: 'bg-slate-100 text-slate-600',
    NOT_STARTED: 'bg-slate-100 text-slate-600', SUBMITTED: 'bg-emerald-100 text-emerald-700',
    UNDER_EVALUATION: 'bg-teal-100 text-teal-700', VALIDATING: 'bg-amber-100 text-amber-700',
    UPLOAD_PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
  };
  return m[status] ?? 'bg-slate-100 text-slate-600';
}

function fmtStatus(s: string) {
  const m: Record<string, string> = {
    CONFIRMED: 'Confirmed', PAID: 'Paid', PENDING: 'Pending', PAYMENT_PENDING: 'Pay Pending',
    SUCCESS: 'Paid', CREATED: 'Not Paid', NOT_STARTED: 'Not Started', SUBMITTED: 'Submitted',
    UNDER_EVALUATION: 'Evaluating', VALIDATING: 'Validating', UPLOAD_PENDING: 'Upload Pending', VERIFIED: 'Verified',
  };
  return m[s] ?? s;
}

function timeAgo(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return 'Just now'; if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return days < 7 ? `${days}d ago` : new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: number; accent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
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
    </motion.div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Card><CardContent className="p-6"><Skeleton className="h-24 w-full rounded" /></CardContent></Card>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardContent className="p-6"><Skeleton className="h-64 w-full rounded" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-64 w-full rounded" /></CardContent></Card>
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherDashboardView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const tp = (user as Record<string, unknown>)?.teacherProfile as { id: string; schoolName?: string; designation?: string; employeeId?: string } | undefined;

  const [registrations, setRegistrations] = useState<RegistrationRecord[]>([]);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!tp?.id || !user?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const [regRes, notifRes] = await Promise.all([
        fetch('/api/registrations?pageSize=50'),
        fetch(`/api/notifications?userId=${user.id}&pageSize=5`),
      ]);
      if (!regRes.ok || !notifRes.ok) throw new Error('Failed to fetch data');
      const regJson = await regRes.json();
      const notifJson = await notifRes.json();
      setRegistrations(regJson.data ?? []);
      setNotifications(notifJson.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [tp?.id, user?.id]);

  const { stats, recentStudents } = useMemo(() => {
    const myStudentIds = new Set<string>();
    const studentMap = new Map<string, { name: string; email: string }>();
    // First pass: find all student profile IDs from registrations
    const regStudentIds = registrations.map(r => r.student.id);
    regStudentIds.forEach(id => myStudentIds.add(id));

    let registered = 0, paid = 0, essaysSubmitted = 0, pendingPayments = 0;
    registrations.forEach(r => {
      if (['PAID', 'CONFIRMED', 'VERIFIED'].includes(r.status)) registered++;
      const payStatus = r.payments[0]?.status;
      if (payStatus === 'SUCCESS') paid++;
      if (payStatus === 'CREATED' || payStatus === 'PENDING') pendingPayments++;
      const essayStatus = r.essays[0]?.status;
      if (['SUBMITTED', 'UNDER_EVALUATION', 'EVALUATED', 'VALID'].includes(essayStatus ?? '')) essaysSubmitted++;
      studentMap.set(r.student.id, { name: r.student.user.name ?? r.student.user.email, email: r.student.user.email });
    });

    const recent = registrations.slice(0, 5).map(r => ({
      id: r.id, name: studentMap.get(r.student.id)?.name ?? 'Unknown', email: studentMap.get(r.student.id)?.email ?? '',
      registrationStatus: r.status,
      paymentStatus: r.payments[0]?.status ?? 'CREATED',
      essayStatus: r.essays[0]?.status ?? 'NOT_STARTED',
    }));

    return {
      stats: { totalStudents: myStudentIds.size, registered, paid, essaysSubmitted, pendingPayments },
      recentStudents: recent,
    };
  }, [registrations]);

  if (loading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={load}><RefreshCw className="h-4 w-4" /> Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name ?? 'Teacher'}!</h1>
                <p className="mt-1 text-emerald-100">{tp?.schoolName ?? 'Your school'} &middot; Track your students&apos; competition progress</p>
              </div>
              <div className="hidden sm:flex gap-3">
                <Button onClick={() => navigate('teacher-add-student')} className="gap-2 bg-white text-emerald-700 hover:bg-emerald-50">
                  <UserPlus className="h-4 w-4" /> Add Student
                </Button>
                <Button onClick={() => navigate('teacher-students')} className="gap-2 bg-white/20 text-white hover:bg-white/30">
                  <Users className="h-4 w-4" /> View All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={GraduationCap} label="Total Students" value={stats.totalStudents} accent="bg-emerald-500" />
        <StatCard icon={BookOpen} label="Registered" value={stats.registered} accent="bg-teal-500" />
        <StatCard icon={CreditCard} label="Paid" value={stats.paid} accent="bg-emerald-500" />
        <StatCard icon={FileText} label="Essays Submitted" value={stats.essaysSubmitted} accent="bg-amber-500" />
        <StatCard icon={IndianRupee} label="Pending Payments" value={stats.pendingPayments} accent="bg-rose-500" />
      </div>

      {/* Students Table + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">Recent Students</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => navigate('teacher-students')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentStudents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <GraduationCap className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No students registered yet</p>
                  <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-emerald-600 border-emerald-200" onClick={() => navigate('teacher-add-student')}>
                    <UserPlus className="h-3.5 w-3.5" /> Add Your First Student
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Registration</TableHead><TableHead>Payment</TableHead><TableHead>Essay</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {recentStudents.map(s => (
                      <TableRow key={s.id}>
                        <TableCell><div><p className="text-sm font-medium text-slate-800">{s.name}</p><p className="text-xs text-slate-400">{s.email}</p></div></TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.registrationStatus)}>{fmtStatus(s.registrationStatus)}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.paymentStatus)}>{fmtStatus(s.paymentStatus)}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.essayStatus)}>{fmtStatus(s.essayStatus)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Notifications */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Recent Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="max-h-72 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Activity className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map(n => (
                    <div key={n.id} className="flex gap-3">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${n.isRead ? 'bg-slate-300' : 'bg-emerald-400'}`} />
                      <div className="min-w-0">
                        <p className={`text-sm leading-snug truncate ${n.isRead ? 'text-slate-600' : 'font-medium text-slate-800'}`}>{n.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
