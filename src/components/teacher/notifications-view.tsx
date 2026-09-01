'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCheck, AlertCircle, Info, AlertTriangle, CheckCircle2, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore, useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string; title: string; message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean; createdAt: string;
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
  return days < 7 ? `${days}d ago` : new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function typeIcon(type: Notification['type']) {
  switch (type) {
    case 'INFO': return <Info className="h-4 w-4 text-teal-500" />;
    case 'WARNING': return <AlertTriangle className="h-4 w-4 text-amber-500" />;
    case 'SUCCESS': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'ERROR': return <XCircle className="h-4 w-4 text-rose-500" />;
  }
}

function typeBg(type: Notification['type']) {
  switch (type) {
    case 'INFO': return 'bg-teal-50';
    case 'WARNING': return 'bg-amber-50';
    case 'SUCCESS': return 'bg-emerald-50';
    case 'ERROR': return 'bg-rose-50';
  }
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function NotificationsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" /><Skeleton className="h-9 w-36" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
      ))}
    </div>
  );
}

// ── Notification Item ────────────────────────────────────────────────────────
function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`${!n.isRead ? 'border-l-4 border-l-emerald-400' : ''}`}>
      <Card className={`transition-colors ${!n.isRead ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-slate-50/50'}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${typeBg(n.type)}`}>
              {typeIcon(n.type)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 cursor-pointer" onClick={() => { setExpanded(!expanded); if (!n.isRead) onRead(n.id); }}>
                  <div className="flex items-center gap-2">
                    {!n.isRead && <div className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    <p className={`text-sm ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>{n.title}</p>
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-sm text-slate-500 mt-1.5 overflow-hidden">{n.message}</motion.p>
                    )}
                  </AnimatePresence>
                  {!expanded && <p className="text-sm text-slate-400 mt-0.5 truncate">{n.message}</p>}
                  <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                    {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                  {!n.isRead && (
                    <button onClick={() => onRead(n.id)} className="p-1 rounded hover:bg-emerald-50 text-slate-400 hover:text-emerald-600" title="Mark as read">
                      <CheckCheck className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherNotificationsView() {
  const user = useAuthStore((s) => s.user);
  const { setNotifications: setGlobalNotifications, markAllAsRead: globalMarkAll } = useAppStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [reloadKey, setReloadKey] = useState(0);

  function syncGlobal(notifs: Notification[]) {
    setGlobalNotifications(notifs.map(n => ({ id: n.id, title: n.title, message: n.message, isRead: n.isRead, createdAt: n.createdAt })));
  }

  const load = useCallback(async () => {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/notifications?userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load notifications');
      const j = await res.json();
      const data: Notification[] = (j.data ?? []).map((n: Record<string, unknown>) => ({
        id: n.id as string, title: n.title as string, message: n.message as string,
        type: (n.type as Notification['type']) ?? 'INFO', isRead: n.isRead as boolean, createdAt: n.createdAt as string,
      }));
      setNotifications(data);
      syncGlobal(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { load(); }, [load, reloadKey]);

  const handleMarkRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      syncGlobal(updated);
      return updated;
    });
    try {
      await fetch('/api/notifications?action=mark-read', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, userId: user?.id }),
      });
    } catch { /* optimistic */ }
    toast.success('Marked as read');
  };

  const handleMarkAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    syncGlobal(updated);
    globalMarkAll();
    try {
      await fetch('/api/notifications?action=mark-all-read', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id }),
      });
    } catch { /* optimistic */ }
    toast.success('All notifications marked as read');
  };

  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return <NotificationsSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Something went wrong</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4" onClick={() => setReloadKey(k => k + 1)}>Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Notifications</h1>
          <p className="text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead} className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <CheckCheck className="h-4 w-4" /> Mark All Read
          </Button>
        )}
      </motion.div>

      <div className="flex items-center gap-2">
        <Button variant={filter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          All ({notifications.length})
        </Button>
        <Button variant={filter === 'unread' ? 'default' : 'outline'} size="sm" onClick={() => setFilter('unread')}
          className={filter === 'unread' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}>
          Unread ({unreadCount})
        </Button>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        <AnimatePresence>
          {filtered.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BellOff className="h-12 w-12 text-slate-300 mb-3" />
                  <p className="text-slate-600 font-medium">{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
                  <p className="text-sm text-slate-400 mt-1">You&apos;ll see notifications here when there&apos;s activity on your students</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            filtered.map(n => (
              <NotificationItem key={n.id} n={n} onRead={handleMarkRead} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
