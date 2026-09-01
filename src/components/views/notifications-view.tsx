'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNotificationStore } from '@/lib/store';
import type { Notification } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  INFO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  SUCCESS: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function NotificationsView() {
  const { notifications, setNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const data: Notification[] = await res.json();
          setNotifications(data);
        }
      } catch { /* ignore */ } finally { setLoading(false); }
    }
    load();
  }, [setNotifications]);

  const handleMarkAllRead = async () => {
    markAllAsRead();
    try {
      await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markAllRead' }) });
    } catch { /* ignore */ }
    toast.success('All notifications marked as read');
  };

  const handleMarkRead = async (id: string) => {
    markAsRead(id);
    try {
      await fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'markRead', id }) });
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Stay updated with your workspace activity</p>
        </div>
        {notifications.some(n => !n.isRead) && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="mr-2 h-4 w-4" />Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}</div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Bell className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card
              key={n.id}
              className={`cursor-pointer transition-colors ${!n.isRead ? 'border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
              onClick={() => !n.isRead && handleMarkRead(n.id)}
            >
              <CardContent className="flex items-start justify-between p-4">
                <div className="flex items-start gap-3">
                  <span className={`mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_COLORS[n.type] || TYPE_COLORS.INFO}`}>
                    {n.type}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">{formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}