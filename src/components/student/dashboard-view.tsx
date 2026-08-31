'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck, CreditCard, FileText, Award, Calendar, Bell, Upload, Trophy, BarChart3, PenTool,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, useNavStore } from '@/lib/store';

// ── Types ────────────────────────────────────────────────────────────────────
interface StudentDashboardData {
  registrationStatus: string;
  paymentStatus: string;
  essayStatus: string;
  resultStatus: string;
  importantDates: {
    registrationClose: string;
    submissionClose: string;
    resultDate: string;
  };
  notifications: Array<{
    id: string; title: string; message: string; createdAt: string; isRead: boolean;
  }>;
}

// ── Mock data ────────────────────────────────────────────────────────────────
const MOCK: StudentDashboardData = {
  registrationStatus: 'CONFIRMED',
  paymentStatus: 'SUCCESS',
  essayStatus: 'SUBMITTED',
  resultStatus: 'PENDING',
  importantDates: {
    registrationClose: '2025-08-15',
    submissionClose: '2025-09-01',
    resultDate: '2025-10-15',
  },
  notifications: [
    { id: '1', title: 'Essay Submitted Successfully', message: 'Your essay for National Essay Competition 2025 has been submitted and is pending validation.', createdAt: '2025-07-08T14:30:00Z', isRead: false },
    { id: '2', title: 'Payment Confirmed', message: 'Your payment of ₹200 for National Essay Competition 2025 has been confirmed.', createdAt: '2025-07-05T10:00:00Z', isRead: true },
    { id: '3', title: 'Registration Approved', message: 'Your registration for the competition has been approved by the administrator.', createdAt: '2025-07-03T09:15:00Z', isRead: true },
    { id: '4', title: 'New Competition Available', message: 'Inter-School Essay Challenge 2025 is now open for registration.', createdAt: '2025-07-01T08:00:00Z', isRead: true },
    { id: '5', title: 'Welcome to EssayCompass', message: 'Your student account has been created. Complete your profile to get started.', createdAt: '2025-06-28T12:00:00Z', isRead: true },
  ],
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    CONFIRMED: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
    VERIFIED: { label: 'Verified', cls: 'bg-teal-100 text-teal-700' },
    PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
    PAYMENT_PENDING: { label: 'Payment Pending', cls: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
    SUCCESS: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    FAILED: { label: 'Failed', cls: 'bg-rose-100 text-rose-700' },
    CREATED: { label: 'Not Paid', cls: 'bg-slate-100 text-slate-700' },
    NOT_STARTED: { label: 'Not Started', cls: 'bg-slate-100 text-slate-700' },
    UPLOAD_PENDING: { label: 'Upload Pending', cls: 'bg-amber-100 text-amber-700' },
    SUBMITTED: { label: 'Submitted', cls: 'bg-emerald-100 text-emerald-700' },
    VALIDATING: { label: 'Validating', cls: 'bg-amber-100 text-amber-700' },
    UNDER_EVALUATION: { label: 'Under Evaluation', cls: 'bg-teal-100 text-teal-700' },
    EVALUATED: { label: 'Evaluated', cls: 'bg-emerald-100 text-emerald-700' },
    RESULT_PUBLISHED: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
    PUBLISHED: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
  };
  const info = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <Badge variant="outline" className={info.cls}>{info.label}</Badge>;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

// ── Status Card ──────────────────────────────────────────────────────────────
function StatusCard({ icon: Icon, label, status, accent }: {
  icon: React.ElementType; label: string; status: string; accent: string;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="relative overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
              </div>
            </div>
            {statusBadge(status)}
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
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}><CardContent className="p-5"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full rounded" /></CardContent></Card>
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentDashboardView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-dashboard');
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
                <h1 className="text-2xl font-bold">Welcome back, {user?.name ?? 'Student'}!</h1>
                <p className="mt-1 text-emerald-100">{user?.email ?? 'student@example.com'}</p>
              </div>
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <PenTool className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Cards Row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard icon={UserCheck} label="Registration" status={data.registrationStatus} accent="bg-emerald-500" />
        <StatusCard icon={CreditCard} label="Payment" status={data.paymentStatus} accent="bg-teal-500" />
        <StatusCard icon={FileText} label="Essay" status={data.essayStatus} accent="bg-amber-500" />
        <StatusCard icon={Award} label="Result" status={data.resultStatus} accent="bg-rose-500" />
      </div>

      {/* Important Dates + Notifications */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Important Dates */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">Important Dates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-rose-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Registration Closes</p>
                  <p className="text-xs text-slate-500">Last date to register</p>
                </div>
                <Badge variant="outline" className="bg-rose-100 text-rose-700 font-semibold">
                  {new Date(data.importantDates.registrationClose).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-amber-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Submission Closes</p>
                  <p className="text-xs text-slate-500">Last date to upload essay</p>
                </div>
                <Badge variant="outline" className="bg-amber-100 text-amber-700 font-semibold">
                  {new Date(data.importantDates.submissionClose).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Result Declaration</p>
                  <p className="text-xs text-slate-500">Results will be published</p>
                </div>
                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 font-semibold">
                  {new Date(data.importantDates.resultDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Notifications */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="lg:col-span-3">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base">Recent Notifications</CardTitle>
                </div>
                <Button variant="ghost" size="sm" className="text-xs text-emerald-600" onClick={() => navigate('student-notifications')}>
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {data.notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.notifications.slice(0, 5).map((n) => (
                    <div key={n.id} className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${!n.isRead ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 truncate">{n.message}</p>
                      </div>
                      <span className="text-xs text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
            <CardDescription>Common tasks at your fingertips</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => navigate('student-essay')} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Upload className="h-4 w-4" />
                Upload Essay
              </Button>
              <Button variant="outline" onClick={() => navigate('student-competitions')} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Trophy className="h-4 w-4" />
                View Competitions
              </Button>
              <Button variant="outline" onClick={() => navigate('student-results')} className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50">
                <BarChart3 className="h-4 w-4" />
                Check Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
