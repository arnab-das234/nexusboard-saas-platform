'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  UserCheck, CreditCard, FileText, Award, Calendar, Bell, Upload, Trophy, BarChart3, PenTool, AlertCircle, ArrowRight, Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, useNavStore } from '@/lib/store';

interface ActiveCompetition {
  id: string; name: string; registrationCloseDate: string; fee: number; status: string;
}

interface Notification {
  id: string; title: string; message: string; isRead: boolean; createdAt: string;
}

interface Registration {
  id: string; status: string; competitionId: string;
  competition?: { name: string; status: string; resultDeclarationDate?: string; submissionCloseDate?: string };
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    CONFIRMED: { label: 'Confirmed', cls: 'bg-emerald-100 text-emerald-700' },
    VERIFIED: { label: 'Verified', cls: 'bg-teal-100 text-teal-700' },
    PENDING: { label: 'Pending', cls: 'bg-amber-100 text-amber-700' },
    PAYMENT_PENDING: { label: 'Payment Pending', cls: 'bg-amber-100 text-amber-700' },
    PAID: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    SUCCESS: { label: 'Paid', cls: 'bg-emerald-100 text-emerald-700' },
    CANCELLED: { label: 'Cancelled', cls: 'bg-rose-100 text-rose-700' },
    NOT_STARTED: { label: 'Not Started', cls: 'bg-slate-100 text-slate-700' },
    UPLOAD_PENDING: { label: 'Upload Pending', cls: 'bg-amber-100 text-amber-700' },
    SUBMITTED: { label: 'Submitted', cls: 'bg-emerald-100 text-emerald-700' },
    UNDER_EVALUATION: { label: 'Evaluating', cls: 'bg-teal-100 text-teal-700' },
    RESULT_PUBLISHED: { label: 'Published', cls: 'bg-emerald-100 text-emerald-700' },
  };
  const info = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-700' };
  return <Badge variant="outline" className={info.cls}>{info.label}</Badge>;
}

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
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            </div>
            {statusBadge(status)}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

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

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Something went wrong</p>
      <p className="text-sm text-slate-400 mt-1 max-w-md">{message}</p>
      <Button variant="outline" className="mt-4" onClick={onRetry}>Try Again</Button>
    </div>
  );
}

export function StudentDashboardView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const profile = (user as unknown as Record<string, unknown>)?.studentProfile as { id: string; dateOfBirth?: string } | undefined;

  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [activeCompetitions, setActiveCompetitions] = useState<ActiveCompetition[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const studentId = profile?.id;
        const params = new URLSearchParams();
        if (studentId) params.set('studentId', studentId);

        const [regRes, compRes, notifRes] = await Promise.allSettled([
          studentId ? fetch(`/api/registrations?${params.toString()}`) : Promise.reject('No profile'),
          fetch('/api/competitions?status=REGISTRATION_OPEN'),
          fetch(`/api/notifications?userId=${user?.id ?? ''}&pageSize=3`),
        ]);

        if (cancelled) return;
        if (regRes.status === 'fulfilled' && regRes.value.ok) {
          const json = await regRes.value.json();
          setRegistrations(json.data ?? []);
        }
        if (compRes.status === 'fulfilled' && compRes.value.ok) {
          const json = await compRes.value.json();
          setActiveCompetitions((json.data ?? []).slice(0, 4));
        }
        if (notifRes.status === 'fulfilled' && notifRes.value.ok) {
          const json = await notifRes.value.json();
          setNotifications(json.data ?? []);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard data');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [user?.id, profile?.id, reloadKey]);

  function reload() { setReloadKey(k => k + 1); }

  const reg = registrations[0];
  const regStatus = reg?.status ?? 'NOT_STARTED';
  const hasRegistrations = registrations.length > 0;

  const paymentStatus = reg ? (
    ['PAID', 'CONFIRMED'].includes(reg.status) ? 'SUCCESS' : reg.status === 'PAYMENT_PENDING' ? 'PENDING' : 'NOT_STARTED'
  ) : 'NOT_STARTED';

  const essayStatus = reg ? (
    ['CONFIRMED', 'PAID'].includes(reg.status) ? 'UPLOAD_PENDING' : 'NOT_STARTED'
  ) : 'NOT_STARTED';

  const resultStatus = reg?.competition?.status === 'RESULT_PUBLISHED' ? 'RESULT_PUBLISHED' : 'NOT_STARTED';

  const importantDates = reg?.competition ? [
    { label: 'Submission Closes', date: reg.competition.submissionCloseDate, cls: 'bg-amber-50' },
    { label: 'Result Declaration', date: reg.competition.resultDeclarationDate, cls: 'bg-emerald-50' },
  ].filter(d => d.date) : [];

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} onRetry={reload} />;

  return (
    <div className="space-y-6 p-6">
      {/* Welcome Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="bg-gradient-to-r from-emerald-600 to-teal-600 border-0 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Welcome back, {user?.name ?? 'Student'}!</h1>
                <p className="mt-1 text-emerald-100">{user?.email ?? ''}</p>
              </div>
              <div className="hidden sm:flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
                <PenTool className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatusCard icon={UserCheck} label="Registration" status={hasRegistrations ? regStatus : 'NOT_STARTED'} accent="bg-emerald-500" />
        <StatusCard icon={CreditCard} label="Payment" status={paymentStatus} accent="bg-teal-500" />
        <StatusCard icon={FileText} label="Essay" status={essayStatus} accent="bg-amber-500" />
        <StatusCard icon={Award} label="Result" status={resultStatus} accent="bg-rose-500" />
      </div>

      {/* No registrations CTA */}
      {!hasRegistrations && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100">
                    <Sparkles className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Get Started!</p>
                    <p className="text-sm text-slate-500">You haven&apos;t registered for any competitions yet. Browse available competitions now.</p>
                  </div>
                </div>
                <Button onClick={() => navigate('student-competitions')} className="bg-emerald-600 hover:bg-emerald-700 gap-2 shrink-0">
                  Browse Competitions <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Active Competitions / Important Dates */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-base">{hasRegistrations ? 'Important Dates' : 'Active Competitions'}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {hasRegistrations && importantDates.length > 0 ? (
                <div className="space-y-4">
                  {importantDates.map((d, i) => (
                    <div key={i} className={`flex items-center justify-between rounded-lg ${d.cls} p-3`}>
                      <div>
                        <p className="text-sm font-medium text-slate-700">{d.label}</p>
                      </div>
                      <Badge variant="outline" className="font-semibold bg-white/60">
                        {new Date(d.date!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : activeCompetitions.length > 0 ? (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activeCompetitions.map(c => (
                    <div key={c.id} className="rounded-lg border p-3 hover:bg-slate-50 transition-colors">
                      <p className="text-sm font-medium text-slate-800 truncate">{c.name}</p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-xs text-slate-500">Closes {new Date(c.registrationCloseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700">
                          {c.fee === 0 ? 'Free' : `₹${c.fee}`}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No active competitions right now</p>
                </div>
              )}
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
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Bell className="h-10 w-10 text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {notifications.slice(0, 3).map(n => (
                    <div key={n.id} className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${!n.isRead ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${!n.isRead ? 'bg-emerald-500' : 'bg-transparent'}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm truncate ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>{n.title}</p>
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
                <Upload className="h-4 w-4" /> Upload Essay
              </Button>
              <Button variant="outline" onClick={() => navigate('student-competitions')} className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                <Trophy className="h-4 w-4" /> View Competitions
              </Button>
              <Button variant="outline" onClick={() => navigate('student-results')} className="gap-2 border-teal-200 text-teal-700 hover:bg-teal-50">
                <BarChart3 className="h-4 w-4" /> Check Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
