'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search, ScrollText, ChevronDown, ChevronUp, Filter,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

// ── Types ────────────────────────────────────────────────────────────────────
interface AuditEntry {
  id: string; timestamp: string; userName: string; userRole: string;
  action: string; entityType: string; entityId: string;
  details: string; previousValues?: Record<string, string | number | boolean>;
  newValues?: Record<string, string | number | boolean>;
}

const PAGE_SIZE = 15;

const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE', 'ASSIGN', 'PUBLISH', 'REFUND', 'REGISTER'];
const ENTITY_TYPES = ['User', 'Competition', 'Registration', 'Payment', 'Essay', 'Evaluation', 'Result', 'Announcement', 'Setting'];

const MOCK: AuditEntry[] = Array.from({ length: 68 }, (_, i) => ({
  id: `AUD-${String(i + 1).padStart(4, '0')}`,
  timestamp: `2025-07-${String(Math.max(1, 29 - Math.floor(i / 3))).padStart(2, '0')} ${String(8 + (i % 14)).padStart(2, '0')}:${String((i * 11) % 60).padStart(2, '0')}:${String((i * 23) % 60).padStart(2, '0')}`,
  userName: ['Admin User', 'Super Admin', 'Dr. Sunita Rao', 'Mrs. Meera Joshi', 'System'][i % 5],
  userRole: ['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'EXAMINER', 'SYSTEM'][i % 5],
  action: ACTION_TYPES[i % ACTION_TYPES.length],
  entityType: ENTITY_TYPES[i % ENTITY_TYPES.length],
  entityId: `${ENTITY_TYPES[i % ENTITY_TYPES.length]}-${String(i + 1).padStart(3, '0')}`,
  details: [
    'Created new competition', 'Updated competition dates', 'Deleted inactive user',
    'Admin logged in', 'User logged out', 'Changed registration status',
    'Assigned essays to examiner', 'Published results', 'Processed refund',
    'New student registered', 'Updated evaluation score', 'Modified system settings',
  ][i % 12],
  previousValues: i % 3 === 1 ? { status: 'PENDING' as const, fee: 100 } as Record<string, string | number | boolean> : undefined,
  newValues: i % 3 === 1 ? ({ status: 'CONFIRMED' as const, fee: 100 } as Record<string, string | number | boolean>) : i % 4 === 0 ? ({ name: 'New Entry', active: true } as Record<string, string | number | boolean>) : undefined,
}));

function actionColor(a: string) {
  if (['CREATE', 'REGISTER', 'PUBLISH'].includes(a)) return 'bg-emerald-100 text-emerald-700';
  if (['UPDATE', 'STATUS_CHANGE', 'ASSIGN'].includes(a)) return 'bg-amber-100 text-amber-700';
  if (['DELETE', 'REFUND'].includes(a)) return 'bg-rose-100 text-rose-700';
  if (['LOGIN', 'LOGOUT'].includes(a)) return 'bg-slate-100 text-slate-700';
  return 'bg-teal-100 text-teal-700';
}

function TableSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex gap-3"><Skeleton className="h-9 w-64" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-40" /></div>
      <Skeleton className="h-[500px] w-full rounded-lg" />
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminAuditView() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-audit');
      const json = await res.json();
      if (json.success && json.data) { setEntries(json.data); return; }
    } catch {} finally { setLoading(false); }
    setEntries(MOCK);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = entries.filter((e) => {
    if (search && !e.userName.toLowerCase().includes(search.toLowerCase()) && !e.details.toLowerCase().includes(search.toLowerCase())) return false;
    if (actionFilter !== 'ALL' && e.action !== actionFilter) return false;
    if (entityFilter !== 'ALL' && e.entityType !== entityFilter) return false;
    if (dateFrom && e.timestamp < dateFrom) return false;
    if (dateTo && e.timestamp > dateTo + 'T23:59:59') return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageData = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, actionFilter, entityFilter, dateFrom, dateTo]);

  if (loading) return <TableSkeleton />;

  return (
    <div className="space-y-4 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500">Track all system activities and changes</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input placeholder="Search user or action..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Action" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Actions</SelectItem>
            {ACTION_TYPES.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Entity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Entities</SelectItem>
            {ENTITY_TYPES.map((e) => (<SelectItem key={e} value={e}>{e}</SelectItem>))}
          </SelectContent>
        </Select>
        <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} placeholder="From" />
        <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} placeholder="To" />
      </div>

      {pageData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ScrollText className="h-12 w-12 text-slate-300 mb-3" />
          <p className="text-slate-500 font-medium">No audit logs found</p>
          <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="rounded-lg border bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80">
                <TableHead className="w-8"></TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageData.map((e) => (
                <>
                  <TableRow key={e.id} className="cursor-pointer" onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}>
                    <TableCell>
                      {e.previousValues || e.newValues ? (
                        expandedId === e.id ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : null}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-500 whitespace-nowrap">{e.timestamp}</TableCell>
                    <TableCell className="font-medium text-slate-800">{e.userName}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{e.userRole}</Badge></TableCell>
                    <TableCell><Badge variant="secondary" className={actionColor(e.action)}>{e.action}</Badge></TableCell>
                    <TableCell className="text-slate-600 text-xs">{e.entityType}</TableCell>
                    <TableCell className="text-slate-500 text-xs max-w-[200px] truncate">{e.details}</TableCell>
                  </TableRow>
                  {expandedId === e.id && (e.previousValues || e.newValues) && (
                    <TableRow key={`${e.id}-expanded`}>
                      <TableCell colSpan={7} className="bg-slate-50/50 px-8 py-3">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {e.previousValues && (
                            <div>
                              <p className="font-semibold text-rose-600 mb-1">Previous Values</p>
                              {Object.entries(e.previousValues).map(([k, v]) => (
                                <div key={k} className="flex gap-2"><span className="text-slate-500">{k}:</span><span className="text-rose-700 line-through">{String(v)}</span></div>
                              ))}
                            </div>
                          )}
                          {e.newValues && (
                            <div>
                              <p className="font-semibold text-emerald-600 mb-1">New Values</p>
                              {Object.entries(e.newValues).map(([k, v]) => (
                                <div key={k} className="flex gap-2"><span className="text-slate-500">{k}:</span><span className="text-emerald-700">{String(v)}</span></div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</p>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(page - 1)}>‹</Button>
          <span className="text-sm text-slate-600 px-2">Page {page} of {totalPages}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      </div>
    </div>
  );
}
