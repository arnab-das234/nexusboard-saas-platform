'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap, CreditCard, FileText, IndianRupee, UserPlus, Activity, Bell, BookOpen, PenTool,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuthStore, useNavStore } from '@/lib/store';

// ── Types ────────────────────────────────────────────────────────────────────
interface TeacherDashboardData {
  totalStudents: number;
  registeredStudents: number;
  paidStudents: number;
  essaysSubmitted: number;
  pendingPayments: number;
  students: Array<{
    id: string; name: string; email: string; school: string;
    registrationStatus: string; paymentStatus: string; essayStatus: string;
  }>;
  recentActivity: Array<{ id: string; message: string; time: string }>;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK: TeacherDashboardData = {
  totalStudents: 48,
  registeredStudents: 35,
  paidStudents: 28,
  essaysSubmitted: 22,
  pendingPayments: 7,
  students: [
    { id: 's1', name: 'Aarav Sharma', email: 'aarav@school.edu', school: 'DPS Jaipur', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED' },
    { id: 's2', name: 'Priya Patel', email: 'priya@school.edu', school: 'DPS Jaipur', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'UNDER_EVALUATION' },
    { id: 's3', name: 'Rohan Mehta', email: 'rohan@school.edu', school: 'DPS Jaipur', registrationStatus: 'PAYMENT_PENDING', paymentStatus: 'PENDING', essayStatus: 'NOT_STARTED' },
    { id: 's4', name: 'Ananya Gupta', email: 'ananya@school.edu', school: 'DPS Jaipur', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'SUBMITTED' },
    { id: 's5', name: 'Vikram Singh', email: 'vikram@school.edu', school: 'DPS Jaipur', registrationStatus: 'PAID', paymentStatus: 'SUCCESS', essayStatus: 'UPLOAD_PENDING' },
    { id: 's6', name: 'Meera Joshi', email: 'meera@school.edu', school: 'DPS Jaipur', registrationStatus: 'PENDING', paymentStatus: 'CREATED', essayStatus: 'NOT_STARTED' },
    { id: 's7', name: 'Arjun Reddy', email: 'arjun@school.edu', school: 'DPS Jaipur', registrationStatus: 'CONFIRMED', paymentStatus: 'SUCCESS', essayStatus: 'VALIDATING' },
  ],
  recentActivity: [
    { id: 'a1', message: 'Aarav Sharma submitted their essay for National Essay Competition 2025', time: '2025-07-08T14:30:00Z' },
    { id: 'a2', message: 'Priya Patel completed payment for National Essay Competition 2025', time: '2025-07-07T11:00:00Z' },
    { id: 'a3', message: 'New student Rohan Mehta registered under your school', time: '2025-07-06T09:30:00Z' },
    { id: 'a4', message: 'Ananya Gupta uploaded their essay successfully', time: '2025-07-05T16:45:00Z' },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'bg-emerald-100 text-emerald-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PENDING: 'bg-amber-100 text-amber-700', PAYMENT_PENDING: 'bg-amber-100 text-amber-700',
    PAID: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
    SUCCESS: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-rose-100 text-rose-700',
    CREATED: 'bg-slate-100 text-slate-700',
    NOT_STARTED: 'bg-slate-100 text-slate-600', UPLOAD_PENDING: 'bg-amber-100 text-amber-700',
    SUBMITTED: 'bg-emerald-100 text-emerald-700', UNDER_EVALUATION: 'bg-teal-100 text-teal-700',
    VALIDATING: 'bg-amber-100 text-amber-700', UPLOADING: 'bg-amber-100 text-amber-700',
  };
  return map[status] ?? 'bg-slate-100 text-slate-700';
}

function fmtLabel(s: string) {
  const map: Record<string, string> = {
    CONFIRMED: 'Confirmed', VERIFIED: 'Verified', PENDING: 'Pending', PAYMENT_PENDING: 'Pay Pending',
    PAID: 'Paid', CANCELLED: 'Cancelled', SUCCESS: 'Paid', FAILED: 'Failed', CREATED: 'Not Paid',
    NOT_STARTED: 'Not Started', UPLOAD_PENDING: 'Upload Pending', SUBMITTED: 'Submitted',
    UNDER_EVALUATION: 'Evaluating', VALIDATING: 'Validating', UPLOADING: 'Uploading',
  };
  return map[s] ?? s;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hrs = Math.floor(diff / 3600000);
  if (hrs < 1) return 'Just now';
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType; label: string; value: string | number; accent: string;
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
      <Card><CardContent className="p-6"><Skeleton className="h-64 w-full rounded" /></CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherDashboardView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=teacher-dashboard');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setData(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setData(MOCK);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return null;

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name ?? 'Teacher'}!</h1>
                <p className="mt-1 text-emerald-100">Manage your students and track their competition progress</p>
              </div>
              <div className="hidden sm:flex gap-3">
                <Button onClick={() => navigate('teacher-add-student')} className="gap-2 bg-white text-emerald-700 hover:bg-emerald-50">
                  <UserPlus className="h-4 w-4" /> Add Student
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard icon={GraduationCap} label="Total Students" value={data.totalStudents} accent="bg-emerald-500" />
        <StatCard icon={BookOpen} label="Registered" value={data.registeredStudents} accent="bg-teal-500" />
        <StatCard icon={CreditCard} label="Paid" value={data.paidStudents} accent="bg-emerald-500" />
        <StatCard icon={FileText} label="Essays Submitted" value={data.essaysSubmitted} accent="bg-amber-500" />
        <StatCard icon={IndianRupee} label="Pending Payments" value={data.pendingPayments} accent="bg-rose-500" />
      </div>

      {/* Students Table + Activity */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Student List */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">My Students</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => navigate('teacher-students')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <GraduationCap className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No students yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Registration</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Essay</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.students.slice(0, 7).map(s => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{s.name}</p>
                            <p className="text-xs text-slate-400">{s.email}</p>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.registrationStatus)}>{fmtLabel(s.registrationStatus)}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.paymentStatus)}>{fmtLabel(s.paymentStatus)}</Badge></TableCell>
                        <TableCell><Badge variant="outline" className={statusBadge(s.essayStatus)}>{fmtLabel(s.essayStatus)}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Recent Activity</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {data.recentActivity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Activity className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No recent activity</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.recentActivity.map(a => (
                    <div key={a.id} className="flex gap-3">
                      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
                      <div>
                        <p className="text-sm text-slate-700 leading-snug">{a.message}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{timeAgo(a.time)}</p>
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
