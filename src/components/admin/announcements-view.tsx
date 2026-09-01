'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Eye, Clock, Send, FileEdit, CalendarDays, AlertCircle, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import type { NotificationAudience, PaginatedResponse } from '@/lib/types';

interface AnnouncementItem {
  id: string;
  title: string;
  message: string;
  audience: string;
  competitionId: string | null;
  scheduledAt: string | null;
  status: string;
  createdAt: string;
  competition: { id: string; name: string } | null;
  _count: { userNotifications: number };
}

interface CompOption { id: string; name: string; }

const AUDIENCE_LABELS: Record<string, string> = {
  ALL: 'Everyone', ALL_STUDENTS: 'All Students', REGISTERED_STUDENTS: 'Registered Students',
  COMPETITION_STUDENTS: 'Competition Students', TEACHERS: 'Teachers',
  EXAMINERS: 'Examiners', SPECIFIC_USERS: 'Specific Users', STUDENTS: 'Students',
};

function statusBadge(s: string) {
  const m: Record<string, string> = {
    DRAFT: 'bg-slate-100 text-slate-700', SCHEDULED: 'bg-amber-100 text-amber-700',
    PUBLISHED: 'bg-emerald-100 text-emerald-700', CANCELLED: 'bg-rose-100 text-rose-700',
  };
  return m[s] ?? 'bg-slate-100 text-slate-700';
}

function statusIcon(s: string) {
  if (s === 'DRAFT') return <FileEdit className="h-4 w-4 text-slate-500" />;
  if (s === 'SCHEDULED') return <Clock className="h-4 w-4 text-amber-500" />;
  if (s === 'PUBLISHED') return <Send className="h-4 w-4 text-emerald-500" />;
  return <XCircle className="h-4 w-4 text-rose-500" />;
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-10 w-48" />
      <div className="grid gap-4">{Array.from({ length: 3 }).map((_, i) => (<Card key={i}><CardContent className="p-5"><Skeleton className="h-20 rounded" /></CardContent></Card>))}</div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center p-6">
      <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
      <p className="text-slate-600 font-medium">Failed to load announcements</p>
      <p className="text-sm text-slate-400 mt-1 mb-4">{message}</p>
      <Button variant="outline" onClick={onRetry}><RefreshCw className="h-4 w-4 mr-1.5" /> Retry</Button>
    </div>
  );
}

export function AdminAnnouncementsView() {
  const user = useAuthStore(s => s.user);
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [competitions, setCompetitions] = useState<CompOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewAnn, setPreviewAnn] = useState<AnnouncementItem | null>(null);
  const [form, setForm] = useState({
    title: '', message: '', audience: 'ALL' as string,
    competition: '', scheduledDate: '', status: 'DRAFT' as string,
  });
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ pageSize: '100' });
      const res = await fetch(`/api/announcements?${params}`);
      const json: PaginatedResponse<AnnouncementItem> = await res.json();
      if (!json.success) { setError(json.error || 'Unknown error'); return; }
      setAnnouncements(json.data || []);
    } catch (e) { setError(e instanceof Error ? e.message : 'Network error'); }
    finally { setLoading(false); }
  }, []);

  const fetchCompetitions = useCallback(async () => {
    try {
      const res = await fetch('/api/competitions');
      const json = await res.json();
      if (json.success) setCompetitions((json.data || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchCompetitions(); }, [fetchCompetitions]);
  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const openCreate = () => {
    setForm({ title: '', message: '', audience: 'ALL', competition: '', scheduledDate: '', status: 'DRAFT' });
    setFormOpen(true);
  };

  const handleCreate = async () => {
    if (!form.title || !form.message) { toast.error('Title and message are required'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title, message: form.message, audience: form.audience,
          competitionId: form.competition || undefined,
          scheduledAt: form.scheduledDate || undefined,
          status: form.scheduledDate ? 'DRAFT' : form.status,
          createdBy: user?.id,
        }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed to create'); return; }
      toast.success(form.status === 'PUBLISHED' ? 'Announcement published' : 'Announcement saved as draft');
      setFormOpen(false);
      fetchAnnouncements();
    } catch { toast.error('Network error'); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (id: string, action: 'publish' | 'cancel') => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/announcements?action=${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!json.success) { toast.error(json.error || 'Failed'); return; }
      toast.success(`Announcement ${action === 'publish' ? 'published' : 'cancelled'}`);
      fetchAnnouncements();
    } catch { toast.error('Network error'); }
    finally { setActionLoading(null); }
  };

  if (error && !loading) return <ErrorState message={error} onRetry={fetchAnnouncements} />;
  if (loading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500">Send notifications to users · {announcements.length} total</p>
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
        <div className="rounded-lg border bg-white max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader><TableRow className="bg-slate-50/80 sticky top-0">
              <TableHead>Title</TableHead><TableHead>Audience</TableHead><TableHead>Competition</TableHead>
              <TableHead>Status</TableHead><TableHead>Scheduled</TableHead><TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {announcements.map(ann => (
                <TableRow key={ann.id}>
                  <TableCell className="font-medium text-slate-800 max-w-[200px] truncate" title={ann.title}>{ann.title}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{AUDIENCE_LABELS[ann.audience] || ann.audience}</Badge></TableCell>
                  <TableCell className="text-slate-500 text-xs">{ann.competition?.name || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      {statusIcon(ann.status)}
                      <Badge variant="secondary" className={statusBadge(ann.status)}>{ann.status}</Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">{ann.scheduledAt ? new Date(ann.scheduledAt).toLocaleString() : '—'}</TableCell>
                  <TableCell className="text-slate-500 text-xs">{new Date(ann.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setPreviewAnn(ann); setPreviewOpen(true); }}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      {ann.status === 'DRAFT' && (
                        <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-7 px-2" disabled={actionLoading === ann.id} onClick={() => handleAction(ann.id, 'publish')}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Publish
                        </Button>
                      )}
                      {ann.status !== 'CANCELLED' && ann.status !== 'PUBLISHED' && (
                        <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-7 px-2" disabled={actionLoading === ann.id} onClick={() => handleAction(ann.id, 'cancel')}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{previewAnn?.title}</DialogTitle>
            <DialogDescription>{AUDIENCE_LABELS[previewAnn?.audience ?? 'ALL']} {previewAnn?.competition?.name && `• ${previewAnn.competition.name}`}</DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-slate-50 p-4 text-sm text-slate-700 whitespace-pre-wrap">{previewAnn?.message}</div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-2">
            <span>Status: <Badge variant="secondary" className={statusBadge(previewAnn?.status || '')}>{previewAnn?.status}</Badge></span>
            {previewAnn?.scheduledAt && <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {new Date(previewAnn.scheduledAt).toLocaleString()}</span>}
            <span>Recipients: {previewAnn?._count.userNotifications || 0}</span>
          </div>
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
            <div><Label>Title</Label><Input className="mt-1" placeholder="Announcement title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea className="mt-1" rows={4} placeholder="Write your message..." value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Audience</Label>
                <Select value={form.audience} onValueChange={v => setForm({ ...form, audience: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(AUDIENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Competition (optional)</Label>
                <Select value={form.competition} onValueChange={v => setForm({ ...form, competition: v })}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All competitions</SelectItem>
                    {competitions.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Schedule Date (optional — leave empty for draft)</Label><Input type="datetime-local" className="mt-1" value={form.scheduledDate} onChange={e => setForm({ ...form, scheduledDate: e.target.value })} /></div>
            <div><Label>Initial Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Publish Immediately</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={submitting} onClick={handleCreate}>
              {submitting ? 'Creating...' : form.status === 'PUBLISHED' ? 'Publish Now' : 'Save Draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
