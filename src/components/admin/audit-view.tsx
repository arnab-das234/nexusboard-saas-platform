'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  ScrollText, Eye, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  AlertCircle, RefreshCw, Filter, X, Clock, User, Shield, FileText, Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import type { PaginatedResponse } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string;
  createdAt: string;
  userId: string | null;
  userRole: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  previousValue: string | null;
  newValue: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

const ACTION_TYPES = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT',
  'STATUS_CHANGE', 'ASSIGN', 'PUBLISH', 'REFUND', 'REGISTER',
  'SETTING_UPDATE', 'SETTING_CREATE',
];

const ENTITY_TYPES = [
  'User', 'Competition', 'Registration', 'Payment', 'Essay',
  'Evaluation', 'Result', 'Announcement', 'Setting', 'SystemSetting',
];

const PAGE_SIZE = 20;

// ── Helpers ──────────────────────────────────────────────────────────────────
function actionColor(action: string): string {
  if (['CREATE', 'REGISTER', 'PUBLISH', 'SETTING_CREATE'].includes(action))
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (['UPDATE', 'STATUS_CHANGE', 'ASSIGN', 'SETTING_UPDATE'].includes(action))
    return 'bg-amber-100 text-amber-700 border-amber-200';
  if (['DELETE', 'REFUND'].includes(action))
    return 'bg-rose-100 text-rose-700 border-rose-200';
  if (['LOGIN', 'LOGOUT'].includes(action))
    return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-teal-100 text-teal-700 border-teal-200';
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  } catch {
    return ts;
  }
}

function truncate(str: string | null | undefined, len: number = 40): string {
  if (!str) return '—';
  try {
    const parsed = JSON.stringify(JSON.parse(str), null, 2);
    if (parsed.length <= len) return parsed;
    return parsed.slice(0, len) + '…';
  } catch {
    if (str.length <= len) return str;
    return str.slice(0, len) + '…';
  }
}

function safeJson(str: string | null | undefined): string {
  if (!str) return 'No data';
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}

function roleBadgeColor(role: string | null): string {
  if (!role) return 'bg-gray-100 text-gray-600';
  switch (role) {
    case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700';
    case 'ADMIN': return 'bg-teal-100 text-teal-700';
    case 'TEACHER': return 'bg-sky-100 text-sky-700';
    case 'EXAMINER': return 'bg-orange-100 text-orange-700';
    case 'STUDENT': return 'bg-slate-100 text-slate-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

// ── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-36" />
      </div>
      <div className="rounded-lg border">
        <Skeleton className="h-10 w-full rounded-t-lg" />
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full border-t" />
        ))}
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-48" />
      </div>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-full bg-rose-100 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-rose-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Failed to Load Audit Logs</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">{message}</p>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-full bg-slate-100 p-4 mb-4">
        <ScrollText className="h-8 w-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">No Audit Logs Found</h3>
      <p className="text-sm text-slate-500 max-w-md">
        No audit entries match your current filters. Try adjusting the filters or clearing them to see all logs.
      </p>
    </div>
  );
}

function DetailsDialog({
  entry, open, onOpenChange,
}: {
  entry: AuditEntry | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!entry) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-slate-600" />
            Audit Log Details
          </DialogTitle>
          <DialogDescription>
            Detailed view of {entry.action} on {entry.entityType || 'unknown'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4">
            {/* Metadata */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Timestamp</p>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-400" />
                  {formatTimestamp(entry.createdAt)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">User</p>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  {entry.userName || entry.userEmail || 'System'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role</p>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  {entry.userRole || '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Action</p>
                <Badge variant="outline" className={actionColor(entry.action)}>{entry.action}</Badge>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Entity Type</p>
                <p className="text-slate-700">{entry.entityType || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Entity ID</p>
                <p className="text-slate-700 font-mono text-xs">{entry.entityId || '—'}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">IP Address</p>
                <p className="text-slate-700 flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5 text-slate-400" />
                  {entry.ipAddress || '—'}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Request ID</p>
                <p className="text-slate-700 font-mono text-xs">{entry.requestId || '—'}</p>
              </div>
            </div>

            {/* User Agent */}
            {entry.userAgent && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">User Agent</p>
                <p className="text-xs text-slate-600 bg-slate-50 rounded-md p-2 font-mono break-all">
                  {entry.userAgent}
                </p>
              </div>
            )}

            {/* Previous Value */}
            {(entry.previousValue || entry.newValue) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {entry.previousValue && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
                      Previous Value
                    </p>
                    <pre className="bg-rose-50 border border-rose-100 rounded-lg p-3 text-xs text-rose-800 overflow-x-auto max-h-56 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                      {safeJson(entry.previousValue)}
                    </pre>
                  </div>
                )}
                {entry.newValue && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
                      New Value
                    </p>
                    <pre className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-xs text-emerald-800 overflow-x-auto max-h-56 overflow-y-auto font-mono whitespace-pre-wrap break-words">
                      {safeJson(entry.newValue)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function AdminAuditView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [userId, setUserId] = useState<string>('ALL');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [entityFilter, setEntityFilter] = useState<string>('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Detail dialog
  const [detailEntry, setDetailEntry] = useState<AuditEntry | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch users for dropdown
  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('pageSize', '200');
      const res = await fetch(`/api/users?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setUsers(json.data.map((u: { id: string; name: string | null; email: string }) => ({
          id: u.id, name: u.name, email: u.email,
        })));
      }
    } catch {
      // Non-critical: user dropdown just won't populate
    }
  }, []);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(p));
      params.set('pageSize', String(PAGE_SIZE));
      if (userId && userId !== 'ALL') params.set('userId', userId);
      if (actionFilter && actionFilter !== 'ALL') params.set('action', actionFilter);
      if (entityFilter && entityFilter !== 'ALL') params.set('entityType', entityFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const res = await fetch(`/api/audit?${params.toString()}`);
      const json: PaginatedResponse<AuditEntry> = await res.json();

      if (json.success && json.data) {
        setEntries(json.data);
        setTotal(json.total);
        setTotalPages(json.totalPages);
      } else {
        setError(json.error || 'Failed to load audit logs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, actionFilter, entityFilter, startDate, endDate]);

  // Initial load
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchAuditLogs(page);
  }, [page, fetchAuditLogs]);

  // Reset page on filter change
  const updateFilter = useCallback((setter: React.Dispatch<React.SetStateAction<string>>) =>
    (val: string) => {
      setter(val);
      setPage(1);
    }, []);

  const clearFilters = () => {
    setUserId('ALL');
    setActionFilter('ALL');
    setEntityFilter('ALL');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  const hasActiveFilters = userId !== 'ALL' || actionFilter !== 'ALL' ||
    entityFilter !== 'ALL' || startDate || endDate;

  const openDetails = (entry: AuditEntry) => {
    setDetailEntry(entry);
    setDialogOpen(true);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <div className="rounded-lg border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4" />
            Filters
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs text-slate-500 hover:text-slate-700 gap-1">
              <X className="h-3 w-3" />
              Clear all
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={userId} onValueChange={updateFilter(setUserId)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Users</SelectItem>
              {users.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name || u.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={updateFilter(setActionFilter)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Actions</SelectItem>
              {ACTION_TYPES.map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={updateFilter(setEntityFilter)}>
            <SelectTrigger className="w-[170px]">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Entities</SelectItem>
              {ENTITY_TYPES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Input
              type="date"
              className="w-[160px]"
              value={startDate}
              onChange={(e) => updateFilter(setStartDate)(e.target.value)}
              placeholder="Start date"
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              type="date"
              className="w-[160px]"
              value={endDate}
              onChange={(e) => updateFilter(setEndDate)(e.target.value)}
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchAuditLogs(page)} />
      ) : entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                    <TableHead className="w-[170px]">Timestamp</TableHead>
                    <TableHead className="w-[140px]">User</TableHead>
                    <TableHead className="w-[110px]">Role</TableHead>
                    <TableHead className="w-[130px]">Action</TableHead>
                    <TableHead className="w-[110px]">Entity</TableHead>
                    <TableHead className="w-[110px]">Entity ID</TableHead>
                    <TableHead className="w-[150px]">Previous Value</TableHead>
                    <TableHead className="w-[150px]">New Value</TableHead>
                    <TableHead className="w-[120px]">IP Address</TableHead>
                    <TableHead className="w-[70px] text-center">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id} className="group">
                      <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">
                        {formatTimestamp(entry.createdAt)}
                      </TableCell>
                      <TableCell className="font-medium text-slate-800 text-sm max-w-[130px] truncate">
                        {entry.userName || entry.userEmail || 'System'}
                      </TableCell>
                      <TableCell>
                        {entry.userRole ? (
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${roleBadgeColor(entry.userRole)}`}>
                            {entry.userRole}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${actionColor(entry.action)}`}>
                          {entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{entry.entityType || '—'}</TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-500 max-w-[100px] truncate">
                        {entry.entityId || '—'}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500 max-w-[140px] truncate">
                        {truncate(entry.previousValue)}
                      </TableCell>
                      <TableCell className="text-[11px] text-slate-500 max-w-[140px] truncate">
                        {truncate(entry.newValue)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-500">
                        {entry.ipAddress || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-60 group-hover:opacity-100 transition-opacity"
                          onClick={() => openDetails(entry)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span className="sr-only">View details</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing {(page - 1) * PAGE_SIZE + 1}
              {'–'}
              {Math.min(page * PAGE_SIZE, total)} of {total} entries
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(1)}
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <span className="text-sm text-slate-700 px-3 font-medium">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline" size="icon" className="h-8 w-8"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Detail Dialog */}
      <DetailsDialog
        entry={detailEntry}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
