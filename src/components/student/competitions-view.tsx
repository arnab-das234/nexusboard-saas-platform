'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, DollarSign, Tag, CheckCircle2, XCircle, Sparkles, AlertCircle, UserCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { COMPETITION_STATUS_LABELS, COMPETITION_STATUS_COLORS, REGISTRATION_STATUS_LABELS } from '@/lib/constants';
import type { CompetitionStatus, RegistrationStatus } from '@/lib/types';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface Competition {
  id: string; name: string; description?: string; fee: number;
  registrationOpenDate?: string; registrationCloseDate?: string;
  submissionCloseDate?: string; competitionDate?: string; resultDeclarationDate?: string;
  status: string; minAge: number; maxAge: number; categories?: { name: string; minAge: number; maxAge: number }[];
}

interface Registration {
  id: string; competitionId: string; status: string;
  competition?: { name: string; fee: number; registrationCloseDate?: string };
  registeredAt: string; registrationNo?: string;
}

function calcAge(dob?: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function fmtDate(d?: string) {
  if (!d) return 'TBD';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function regStatusColor(s: string) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700', PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return map[s] ?? 'bg-slate-100 text-slate-700';
}

function isEligible(studentAge: number | null, minAge: number, maxAge: number): { eligible: boolean; reason: string } {
  if (studentAge === null) return { eligible: false, reason: 'Complete your profile with date of birth to check eligibility.' };
  if (studentAge >= minAge && studentAge <= maxAge) return { eligible: true, reason: `You meet the age criteria (${minAge}-${maxAge} years).` };
  if (studentAge < minAge) return { eligible: false, reason: `Your age (${studentAge}) is below the minimum (${minAge} years).` };
  return { eligible: false, reason: `Your age (${studentAge}) exceeds the maximum (${maxAge} years).` };
}

function CompetitionsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /></div>
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full rounded" /></CardContent></Card>)}</div>
    </div>
  );
}

function CompetitionCard({ comp, studentAge, isRegistered, regStatus, onApply }: {
  comp: Competition; studentAge: number | null; isRegistered: boolean; regStatus?: string; onApply: () => void;
}) {
  const { eligible, reason } = isEligible(studentAge, comp.minAge, comp.maxAge);
  const status = comp.status as CompetitionStatus;
  const canApply = eligible && comp.status === 'REGISTRATION_OPEN' && !isRegistered;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{comp.name}</CardTitle>
              {comp.description && <p className="mt-1 text-xs text-slate-500 line-clamp-2">{comp.description}</p>}
            </div>
            <Badge variant="outline" className={COMPETITION_STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-700'}>
              {COMPETITION_STATUS_LABELS[status] ?? status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Reg. closes: {fmtDate(comp.registrationCloseDate)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <DollarSign className="h-3.5 w-3.5 text-slate-400" />
              <span>{comp.fee === 0 ? 'Free' : `₹${comp.fee}`}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Age: {comp.minAge}-{comp.maxAge} years</span>
            </div>
          </div>

          <div className={`rounded-lg p-2.5 text-xs ${eligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {eligible ? (
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {reason}</span>
            ) : (
              <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {reason}</span>
            )}
          </div>

          {isRegistered && regStatus ? (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={regStatusColor(regStatus)}>
                {REGISTRATION_STATUS_LABELS[regStatus as RegistrationStatus] ?? regStatus}
              </Badge>
            </div>
          ) : (
            <Button size="sm" disabled={!canApply} onClick={onApply} className={!canApply ? '' : 'bg-emerald-600 hover:bg-emerald-700'}>
              {canApply ? 'Register Now' : comp.status !== 'REGISTRATION_OPEN' ? 'Registration Closed' : 'Not Eligible'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function StudentCompetitionsView() {
  const user = useAuthStore((s) => s.user);
  const sp = (user as Record<string, unknown>)?.studentProfile as Record<string, string> | undefined;
  const studentAge = useMemo(() => calcAge(sp?.dateOfBirth), [sp?.dateOfBirth]);

  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'available' | 'registered'>('available');
  const [applyDialog, setApplyDialog] = useState<Competition | null>(null);
  const [applying, setApplying] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams();
        if (sp?.id) params.set('studentId', sp.id);
        const [compRes, regRes] = await Promise.all([
          fetch('/api/competitions'),
          sp?.id ? fetch(`/api/registrations?${params.toString()}`) : Promise.resolve({ ok: false }),
        ]);
        if (cancelled) return;
        if (compRes.ok) { const j = await compRes.json(); setCompetitions(j.data ?? []); }
        if (regRes.ok) { const j = await regRes.json(); setRegistrations(j.data ?? []); }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load competitions');
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [sp?.id, reloadKey]);

  function reload() { setReloadKey(k => k + 1); }

  const registeredIds = new Set(registrations.map(r => r.competitionId));
  const availableComps = competitions.filter(c => !registeredIds.has(c.id));
  const registeredComps = competitions.filter(c => registeredIds.has(c.id));

  async function handleApply() {
    if (!applyDialog || !sp?.id) return;
    setApplying(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: sp.id, competitionId: applyDialog.id }),
      });
      if (res.ok) {
        toast.success(`Registered for ${applyDialog.name}`);
        setApplyDialog(null);
        reload();
      } else {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? 'Failed to register');
      }
    } catch {
      toast.error('Network error. Please try again.');
    }
    setApplying(false);
  }

  if (loading) return <CompetitionsSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={reload}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Competitions</h1>
        <p className="text-sm text-slate-500">Browse and register for essay competitions</p>
      </motion.div>

      <div className="flex items-center gap-3">
        <Button variant={tab === 'available' ? 'default' : 'outline'} size="sm" onClick={() => setTab('available')}
          className={tab === 'available' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-200 text-emerald-700'}>
          <Sparkles className="h-4 w-4 mr-1.5" /> Available ({availableComps.length})
        </Button>
        <Button variant={tab === 'registered' ? 'default' : 'outline'} size="sm" onClick={() => setTab('registered')}
          className={tab === 'registered' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-200 text-emerald-700'}>
          <CheckCircle2 className="h-4 w-4 mr-1.5" /> Registered ({registeredComps.length})
        </Button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="grid gap-4 md:grid-cols-2">
          {tab === 'available' ? (
            availableComps.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No competitions available</p>
                <p className="text-sm text-slate-400 mt-1">Check back later for new competitions</p>
              </div>
            ) : availableComps.map(c => (
              <CompetitionCard key={c.id} comp={c} studentAge={studentAge} isRegistered={false} onApply={() => setApplyDialog(c)} />
            ))
          ) : (
            registeredComps.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No registered competitions</p>
                <p className="text-sm text-slate-400 mt-1">Browse available competitions and register</p>
              </div>
            ) : registeredComps.map(c => (
              <CompetitionCard key={c.id} comp={c} studentAge={studentAge} isRegistered
                regStatus={registrations.find(r => r.competitionId === c.id)?.status} onApply={() => {}} />
            ))
          )}
        </motion.div>
      </AnimatePresence>

      <Dialog open={!!applyDialog} onOpenChange={(open) => !open && setApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for Competition</DialogTitle>
            <DialogDescription>Confirm registration for {applyDialog?.name}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Fee</span><span className="font-medium">{applyDialog?.fee === 0 ? 'Free' : `₹${applyDialog?.fee}`}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Age Criteria</span><span className="font-medium">{applyDialog?.minAge}-{applyDialog?.maxAge} years</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Submission Deadline</span><span className="font-medium">{applyDialog ? fmtDate(applyDialog.submissionCloseDate) : ''}</span></div>
          </div>
          <DialogFooter className="gap-2">
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleApply} disabled={applying} className="bg-emerald-600 hover:bg-emerald-700">
              {applying ? 'Registering...' : 'Confirm Registration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
