'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Megaphone, Plus, Eye, Clock, Send, FileEdit, CalendarDays,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import type { NotificationAudience } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface Announcement {
  id: string; title: string; message: string;
  audience: NotificationAudience; competitionName?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  scheduledDate?: string; sentAt?: string; createdAt: string;
}

const AUDIENCE_LABELS: Record<NotificationAudience, string> = {
  ALL: 'Everyone', ALL_STUDENTS: 'All Students', REGISTERED_STUDENTS: 'Registered Students',
  COMPETITION_STUDENTS: 'Competition Students', TEACHERS: 'Teachers',
  EXAMINERS: 'Examiners', SPECIFIC_USERS: 'Specific Users',
};

function statusBadge(s: string) {
  const m: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700', SCHEDULED: 'bg-amber-100 text-amber-700', SENT: 'bg-emerald-100 text-emerald-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function statusIcon(s: string) {
  if (s === 'DRAFT') return <FileEdit className="h-4 w-4 text-slate-500" />;
  if (s === 'SCHEDULED') return <Clock className="h-4 w-4 text-amber-500" />;
  return <Send className="h-4 w-4 text-emerald-500" />;
}

const MOCK: Announcement[] = [
  {
    id: 'ANN-001', title: 'Registration Now Open',
    message: 'We are pleased to announce that registrations for the National Essay Writing Competition 2025 are now open. All eligible students are encouraged to register before the deadline.',
    audience: 'ALL_STUDENTS', competitionName: 'National Essay 2025', status: 'SENT',
    sentAt: '2025-06-01 09:00', createdAt: '2025-05-30',
  },
  {
    id: 'ANN-002', title: 'Submission Deadline Reminder',
    message: 'This is a reminder that the essay submission deadline is approaching. Please submit your essays before the closing date.',
    audience: 'COMPETITION_STUDENTS', competitionName: 'State Level Essay', status: 'SCHEDULED',
    scheduledDate: '2025-07-25 08:00', createdAt: '2025-07-20',
  },
  {
    id: 'ANN-003', title: 'Results for Inter-School Essay',
    message: 'Results for the Inter-School Essay Challenge have been published. Congratulations to all winners!',
    audience: 'COMPETITION_STUDENTS', competitionName: 'Inter-School Essay', status: 'DRAFT',
    createdAt: '2025-07-28',
  },
  {
    id: 'ANN-004', title: 'Examiner Evaluation Guidelines',
    message: 'Updated evaluation guidelines have been posted. Please review the new rubric before starting your evaluations.',
    audience: 'EXAMINERS', status: 'SENT',
    sentAt: '2025-07-15 10:00', createdAt: '2025-07-14',
  },
  {
    id: 'ANN-005', title: 'System Maintenance Notice',
    message: 'The platform will undergo scheduled maintenance on August 1st from 2:00 AM to 4:00 AM IST.',
    audience: 'ALL', status: 'DRAFT',
    createdAt: '2025-07-29',
  },
];

function ListSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardContent className="p-5"><Skeleton className="h-20 rounded" /></CardContent></Card>))}</div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminAnnouncementsView() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnn, setPreviewAnn] = useState<Announcement | null>(null);
  const [form, setForm] = useState({
    title: '', message: '', audience: 'ALL_STUDENTS' as NotificationAudience,
    competition: '', scheduledDate: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-announcements');
      const json = await res.json();
      if (json.success && json.data) { setAnnouncements(json.data); return; }
    } catch {} finally { setLoading(false); }
    setAnnouncements(MOCK);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setForm({ title: '', message: '', audience: 'ALL_STUDENTS', competition: '', scheduledDate: '' });
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.title || !form.message) { toast.error('Title and message are required'); return; }
    const newAnn: Announcement = {
      id: `ANN-${String(announcements.length + 1).padStart(3, '0')}`,
      title: form.title, message: form.message, audience: form.audience,
      competitionName: form.competition || undefined,
      status: form.scheduledDate ? 'SCHEDULED' : 'DRAFT',
      scheduledDate: form.scheduledDate || undefined,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setAnnouncements((prev) => [newAnn, ...prev]);
    toast.success(form.scheduledDate ? 'Announcement scheduled' : 'Announcement saved as draft');
    setFormOpen(false);
  };

  const handleSend = (ann: Announcement) => {
    setAnnouncements((prev) => prev.map((a) => a.id === ann.id ? { ...a, status: 'SENT', sentAt: new Date().toISOString() } : a));
    toast.success(`"${ann.title}" sent`);
  };

  if (loading) return <ListSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500">Send notifications to users</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> New Announcement
        </Button>
      </div>

      {announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Megaphone className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No announcements yet</p>
          <p className="text-sm text-slate-400 mt-1">Create your first announcement</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map((ann) => (
            <Card key={ann.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    {statusIcon(ann.status)}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">{ann.title}</h3>
                        <Badge variant="secondary" className={statusBadge(ann.status)}>{ann.status}</Badge>
                        <Badge variant="outline" className="text-xs">{AUDIENCE_LABELS[ann.audience]}</Badge>
                      </div>
                      <p className="text-sm text-slate-500 mt-1 line-clamp-2">{ann.message}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-400">
                        {ann.competitionName && <span>Competition: {ann.competitionName}</span>}
                        {ann.scheduledDate && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Scheduled: {ann.scheduledDate}</span>}
                        {ann.sentAt && <span className="flex items-center gap-1"><Send className="h-3 w-3" /> Sent: {ann.sentAt}</span>}
                        <span>Created: {ann.createdAt}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => { setPreviewAnn(ann); setPreviewOpen(true); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preview
                    </Button>
                    {ann.status === 'DRAFT' && (
                      <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleSend(ann)}>
                        <Send className="h-3.5 w-3.5 mr-1" /> Send Now
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{previewAnn?.title}</DialogTitle>
            <DialogDescription>{AUDIENCE_LABELS[previewAnn?.audience ?? 'ALL']} {previewAnn?.competitionName && `• ${previewAnn.competitionName}`}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{previewAnn?.message}</div>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Announcement</DialogTitle>
            <DialogDescription>Compose a new announcement or notification</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title</Label>
              <Input className="mt-1" placeholder="Announcement title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <Label>Message</Label>
              <Textarea className="mt-1" rows={4} placeholder="Write your message..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            </div>
            <div>
              <Label>Audience</Label>
              <Select value={form.audience} onValueChange={(v) => setForm({ ...form, audience: v as NotificationAudience })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(AUDIENCE_LABELS).map(([k, v]) => (<SelectItem key={k} value={k}>{v}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Competition (optional)</Label>
              <Select value={form.competition} onValueChange={(v) => setForm({ ...form, competition: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="All competitions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All competitions</SelectItem>
                  <SelectItem value="National Essay 2025">National Essay 2025</SelectItem>
                  <SelectItem value="State Level Essay">State Level Essay</SelectItem>
                  <SelectItem value="Inter-School Essay">Inter-School Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Schedule Date (optional — leave empty to save as draft)</Label>
              <Input type="datetime-local" className="mt-1" value={form.scheduledDate} onChange={(e) => setForm({ ...form, scheduledDate: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
              {form.scheduledDate ? 'Schedule' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
