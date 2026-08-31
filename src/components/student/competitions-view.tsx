'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Calendar, DollarSign, Tag, CheckCircle2, XCircle, Clock, UserCheck, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { COMPETITION_STATUS_LABELS, COMPETITION_STATUS_COLORS, REGISTRATION_STATUS_LABELS } from '@/lib/constants';
import type { CompetitionStatus, RegistrationStatus } from '@/lib/types';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Competition {
  id: string; name: string; description: string; fee: number;
  registrationOpenDate: string; registrationCloseDate: string;
  submissionOpenDate: string; submissionCloseDate: string;
  competitionDate: string; resultDeclarationDate: string;
  status: CompetitionStatus; category: string;
  minAge: number; maxAge: number;
  studentAge: number; isEligible: boolean; eligibilityReason: string;
}

interface Registration {
  id: string; competitionId: string; competitionName: string;
  status: RegistrationStatus; registeredAt: string;
  category: string; fee: number;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_COMPETITIONS: Competition[] = [
  {
    id: 'c1', name: 'National Essay Competition 2025',
    description: 'Annual national-level essay writing competition for school students. Topic will be revealed on the competition date. Essays must be original and in English or Hindi.',
    fee: 200, registrationOpenDate: '2025-06-01', registrationCloseDate: '2025-08-15',
    submissionOpenDate: '2025-07-01', submissionCloseDate: '2025-09-01',
    competitionDate: '2025-09-15', resultDeclarationDate: '2025-10-15',
    status: 'SUBMISSION_OPEN', category: 'National', minAge: 10, maxAge: 18,
    studentAge: 15, isEligible: true, eligibilityReason: 'You meet the age criteria (10-18 years).',
  },
  {
    id: 'c2', name: 'State-Level Essay Challenge',
    description: 'State-level competition focusing on environmental awareness. Open to students from classes 8-12.',
    fee: 100, registrationOpenDate: '2025-07-01', registrationCloseDate: '2025-07-31',
    submissionOpenDate: '2025-07-15', submissionCloseDate: '2025-08-31',
    competitionDate: '2025-09-01', resultDeclarationDate: '2025-10-01',
    status: 'REGISTRATION_OPEN', category: 'State', minAge: 13, maxAge: 17,
    studentAge: 15, isEligible: true, eligibilityReason: 'You meet the age criteria (13-17 years).',
  },
  {
    id: 'c3', name: 'Junior Writers Award',
    description: 'A special competition for young writers in classes 5-8. Focus on creative writing and imagination.',
    fee: 50, registrationOpenDate: '2025-06-15', registrationCloseDate: '2025-08-01',
    submissionOpenDate: '2025-07-01', submissionCloseDate: '2025-08-15',
    competitionDate: '2025-08-20', resultDeclarationDate: '2025-09-20',
    status: 'SUBMISSION_CLOSED', category: 'District', minAge: 10, maxAge: 13,
    studentAge: 15, isEligible: false, eligibilityReason: 'Your age (15) exceeds the maximum age (13).',
  },
  {
    id: 'c4', name: 'Inter-School Debate & Essay',
    description: 'Combined debate and essay writing event. Students can participate in one or both categories.',
    fee: 150, registrationOpenDate: '2025-05-01', registrationCloseDate: '2025-06-30',
    submissionOpenDate: '2025-06-15', submissionCloseDate: '2025-07-31',
    competitionDate: '2025-08-10', resultDeclarationDate: '2025-09-10',
    status: 'EVALUATION_IN_PROGRESS', category: 'Inter-School', minAge: 12, maxAge: 18,
    studentAge: 15, isEligible: true, eligibilityReason: 'You meet the age criteria (12-18 years).',
  },
  {
    id: 'c5', name: 'Science Essay Championship',
    description: 'Write about innovations in science and technology. Open to students with interest in STEM fields.',
    fee: 0, registrationOpenDate: '2025-07-10', registrationCloseDate: '2025-09-30',
    submissionOpenDate: '2025-08-01', submissionCloseDate: '2025-10-31',
    competitionDate: '2025-11-15', resultDeclarationDate: '2025-12-15',
    status: 'REGISTRATION_OPEN', category: 'National', minAge: 14, maxAge: 19,
    studentAge: 15, isEligible: true, eligibilityReason: 'You meet the age criteria (14-19 years).',
  },
];

const MOCK_REGISTRATIONS: Registration[] = [
  { id: 'r1', competitionId: 'c1', competitionName: 'National Essay Competition 2025', status: 'CONFIRMED', registeredAt: '2025-06-15T10:00:00Z', category: 'National', fee: 200 },
  { id: 'r2', competitionId: 'c4', competitionName: 'Inter-School Debate & Essay', status: 'PAID', registeredAt: '2025-05-20T14:00:00Z', category: 'Inter-School', fee: 150 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
function regStatusColor(s: RegistrationStatus) {
  const map: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-700', VERIFIED: 'bg-teal-100 text-teal-700',
    PAYMENT_PENDING: 'bg-amber-100 text-amber-700', PAID: 'bg-emerald-100 text-emerald-700',
    CONFIRMED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return map[s] ?? 'bg-slate-100 text-slate-700';
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function CompetitionsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2"><Skeleton className="h-9 w-24" /><Skeleton className="h-9 w-24" /></div>
      <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 4 }).map((_, i) => <Card key={i}><CardContent className="p-6"><Skeleton className="h-40 w-full rounded" /></CardContent></Card>)}</div>
    </div>
  );
}

// ── Competition Card ─────────────────────────────────────────────────────────
function CompetitionCard({ comp, isRegistered, regStatus, onApply }: {
  comp: Competition; isRegistered: boolean; regStatus?: RegistrationStatus; onApply: () => void;
}) {
  const canApply = comp.isEligible && comp.status === 'REGISTRATION_OPEN' && !isRegistered;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="h-full flex flex-col">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base leading-tight">{comp.name}</CardTitle>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">{comp.description}</p>
            </div>
            <Badge variant="outline" className={COMPETITION_STATUS_COLORS[comp.status]}>
              {COMPETITION_STATUS_LABELS[comp.status]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col justify-between gap-4">
          {/* Meta Info */}
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
              <Tag className="h-3.5 w-3.5 text-slate-400" />
              <span>{comp.category}</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600">
              <UserCheck className="h-3.5 w-3.5 text-slate-400" />
              <span>Age: {comp.minAge}-{comp.maxAge} years</span>
            </div>
          </div>

          {/* Eligibility */}
          <div className={`rounded-lg p-2.5 text-xs ${comp.isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
            {comp.isEligible ? (
              <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {comp.eligibilityReason}</span>
            ) : (
              <span className="flex items-center gap-1.5"><XCircle className="h-3.5 w-3.5" /> {comp.eligibilityReason}</span>
            )}
          </div>

          {/* Registration Status or Apply */}
          {isRegistered && regStatus ? (
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={regStatusColor(regStatus)}>
                {REGISTRATION_STATUS_LABELS[regStatus]}
              </Badge>
              <span className="text-xs text-slate-400">Applied on {fmtDate(MOCK_REGISTRATIONS.find(r => r.competitionId === comp.id)?.registeredAt ?? '')}</span>
            </div>
          ) : (
            <Button
              size="sm"
              disabled={!canApply}
              onClick={onApply}
              className={!canApply ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
            >
              {canApply ? 'Apply Now' : comp.status !== 'REGISTRATION_OPEN' ? 'Registration Closed' : 'Not Eligible'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentCompetitionsView() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'available' | 'registered'>('available');
  const [applyDialog, setApplyDialog] = useState<Competition | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-competitions');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setCompetitions(json.data.competitions ?? MOCK_COMPETITIONS); setRegistrations(json.data.registrations ?? MOCK_REGISTRATIONS); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setCompetitions(MOCK_COMPETITIONS);
      setRegistrations(MOCK_REGISTRATIONS);
      setLoading(false);
    }
    load();
  }, []);

  const registeredIds = new Set(registrations.map(r => r.competitionId));

  const availableComps = competitions.filter(c => !registeredIds.has(c.id)).filter(c =>
    !selectedCategory || c.category === selectedCategory
  );
  const registeredComps = competitions.filter(c => registeredIds.has(c.id));

  async function handleApply() {
    if (!applyDialog) return;
    setApplying(true);
    try {
      const res = await fetch('/api/seed?action=register-competition', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ competitionId: applyDialog.id }),
      });
      if (res.ok) {
        const newReg: Registration = {
          id: `r${Date.now()}`, competitionId: applyDialog.id,
          competitionName: applyDialog.name, status: 'PENDING',
          registeredAt: new Date().toISOString(), category: applyDialog.category, fee: applyDialog.fee,
        };
        setRegistrations(prev => [...prev, newReg]);
        toast.success(`Registered for ${applyDialog.name}`);
        setApplyDialog(null);
      } else {
        toast.error('Failed to register. Please try again.');
      }
    } catch {
      const newReg: Registration = {
        id: `r${Date.now()}`, competitionId: applyDialog.id,
        competitionName: applyDialog.name, status: 'PENDING',
        registeredAt: new Date().toISOString(), category: applyDialog.category, fee: applyDialog.fee,
      };
      setRegistrations(prev => [...prev, newReg]);
      toast.success(`Registered for ${applyDialog.name}`);
      setApplyDialog(null);
    }
    setApplying(false);
  }

  if (loading) return <CompetitionsSkeleton />;

  const categories = [...new Set(competitions.map(c => c.category))];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Competitions</h1>
        <p className="text-sm text-slate-500">Browse and register for essay competitions</p>
      </motion.div>

      {/* Tabs */}
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

      {/* Category Filter (only for available) */}
      {tab === 'available' && categories.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm text-slate-500">Filter:</Label>
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue placeholder="All Categories" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Competition Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
          className="grid gap-4 md:grid-cols-2"
        >
          {tab === 'available' ? (
            availableComps.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <Trophy className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No competitions available</p>
                <p className="text-sm text-slate-400 mt-1">Check back later for new competitions</p>
              </div>
            ) : (
              availableComps.map(c => (
                <CompetitionCard key={c.id} comp={c} isRegistered={false} onApply={() => setApplyDialog(c)} />
              ))
            )
          ) : (
            registeredComps.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center py-16 text-center">
                <CheckCircle2 className="h-12 w-12 text-slate-300 mb-3" />
                <p className="text-slate-600 font-medium">No registered competitions</p>
                <p className="text-sm text-slate-400 mt-1">Browse available competitions and apply</p>
              </div>
            ) : (
              registeredComps.map(c => (
                <CompetitionCard
                  key={c.id} comp={c} isRegistered
                  regStatus={registrations.find(r => r.competitionId === c.id)?.status}
                  onApply={() => {}}
                />
              ))
            )
          )}
        </motion.div>
      </AnimatePresence>

      {/* Apply Dialog */}
      <Dialog open={!!applyDialog} onOpenChange={(open) => !open && setApplyDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Register for Competition</DialogTitle>
            <DialogDescription>
              You are about to register for {applyDialog?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Category</span><span className="font-medium">{applyDialog?.category}</span></div>
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
