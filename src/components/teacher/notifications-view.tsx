'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellOff, CheckCheck, Trash2, ChevronDown, ChevronUp, Info, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';
  isRead: boolean;
  createdAt: string;
}

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'New Student Registered', message: 'Rohan Mehta has been registered under your school. The registration is pending payment.', type: 'INFO', isRead: false, createdAt: '2025-07-08T14:30:00Z' },
  { id: '2', title: 'Essay Submission by Student', message: 'Aarav Sharma has submitted their essay for National Essay Competition 2025. The essay is currently under validation.', type: 'SUCCESS', isRead: false, createdAt: '2025-07-08T10:00:00Z' },
  { id: '3', title: 'Payment Received', message: 'Priya Patel has successfully completed the payment of ₹200 for National Essay Competition 2025.', type: 'SUCCESS', isRead: true, createdAt: '2025-07-07T11:00:00Z' },
  { id: '4', title: 'New Competition Announced', message: 'State-Level Essay Challenge 2025 is now open for registration. Encourage your students to participate.', type: 'INFO', isRead: true, createdAt: '2025-07-01T08:00:00Z' },
  { id: '5', title: 'Welcome to EssayCompass', message: 'Welcome! Your teacher account has been set up. You can now add students and track their progress.', type: 'INFO', isRead: true, createdAt: '2025-06-28T12:00:00Z' },
  { id: '6', title: 'Submission Deadline Reminder', message: 'The submission deadline for National Essay Competition 2025 is September 1, 2025. 5 of your students have not yet submitted their essays.', type: 'WARNING', isRead: false, createdAt: '2025-07-08T16:00:00Z' },
  { id: '7', title: 'Student Registration Cancelled', message: 'Aditya Kumar has cancelled their registration for National Essay Competition 2025. Payment will be refunded.', type: 'WARNING', isRead: true, createdAt: '2025-07-04T09:30:00Z' },
  { id: '8', title: 'System Maintenance', message: 'EssayCompass will undergo maintenance on July 15, 2025 from 2:00 AM to 4:00 AM IST.', type: 'WARNING', isRead: true, createdAt: '2025-06-20T09:00:00Z' },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-36" />
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full rounded" /></CardContent></Card>
      ))}
    </div>
  );
}

// ── Notification Item ────────────────────────────────────────────────────────
function NotificationItem({ n, onRead, onDelete }: {
  n: Notification; onRead: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className={`${!n.isRead ? 'border-l-4 border-l-emerald-400' : ''}`}
    >
      <Card className="transition-colors hover:bg-slate-50/50">
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
                    <p className={`text-sm truncate ${!n.isRead ? 'font-semibold text-slate-800' : 'font-medium text-slate-700'}`}>{n.title}</p>
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.p initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="text-sm text-slate-500 mt-1.5 overflow-hidden">{n.message}</motion.p>
                    )}
                  </AnimatePresence>
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
                  <button onClick={() => onDelete(n.id)} className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
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
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { setNotifications: setGlobalNotifications, markAllAsRead } = useAppStore();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=teacher-notifications');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setNotifications(json.data); syncGlobal(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      setNotifications(MOCK_NOTIFICATIONS);
      syncGlobal(MOCK_NOTIFICATIONS);
      setLoading(false);
    }
    load();
  }, []);

  function syncGlobal(notifs: Notification[]) {
    setGlobalNotifications(notifs.map(n => ({ id: n.id, title: n.title, message: n.message, isRead: n.isRead, createdAt: n.createdAt })));
  }

  function handleMarkRead(id: string) {
    setNotifications(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isRead: true } : n);
      syncGlobal(updated);
      return updated;
    });
    toast.success('Marked as read');
  }

  function handleMarkAllRead() {
    const updated = notifications.map(n => ({ ...n, isRead: true }));
    setNotifications(updated);
    syncGlobal(updated);
    markAllAsRead();
    toast.success('All notifications marked as read');
  }

  function handleDelete(id: string) {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    syncGlobal(updated);
    toast.success('Notification deleted');
  }

  const filtered = filter === 'unread' ? notifications.filter(n => !n.isRead) : notifications;
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) return <NotificationsSkeleton />;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
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

      {/* Filter */}
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

      {/* Notifications List */}
      <div className="space-y-3">
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
              <NotificationItem key={n.id} n={n} onRead={handleMarkRead} onDelete={handleDelete} />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
