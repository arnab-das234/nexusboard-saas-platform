'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, MoreHorizontal, FolderKanban, Calendar, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { STATUS_COLORS, PRIORITY_COLORS } from '@/lib/constants';
import type { Project } from '@/lib/types';

export function ProjectsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', priority: 'MEDIUM' as const, budget: '' });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) setProjects(await res.json());
    } catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProjects(); }, [fetchProjects]);

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error('Project name is required'); return; }
    setFormLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, description: form.description || null, priority: form.priority, budget: form.budget ? parseFloat(form.budget) : null }),
      });
      if (res.ok) { toast.success('Project created'); setDialogOpen(false); setForm({ name: '', description: '', priority: 'MEDIUM', budget: '' }); fetchProjects(); }
      else toast.error('Failed to create project');
    } catch { toast.error('Network error'); } finally { setFormLoading(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
      if (res.ok) { toast.success('Project deleted'); fetchProjects(); } else toast.error('Failed to delete');
    } catch { toast.error('Network error'); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) { toast.success('Status updated'); fetchProjects(); }
    } catch { /* ignore */ }
  };

  const filtered = projects.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage and track your workspace projects</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" />New Project</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Create New Project</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input placeholder="e.g. Website Redesign" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Brief description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as 'MEDIUM' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="CRITICAL">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Budget ($)</Label>
                  <Input type="number" placeholder="0.00" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
                </div>
              </div>
              <Button className="w-full" onClick={handleCreate} disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Project'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search projects..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_HOLD">On Hold</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="ARCHIVED">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <FolderKanban className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No projects found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <Card key={project.id} className="group relative transition-shadow hover:shadow-md">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {project.key.slice(-2)}
                  </div>
                  <div>
                    <CardTitle className="text-sm font-semibold">{project.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{project.key}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED'].filter(s => s !== project.status).map(s => (
                      <DropdownMenuItem key={s} onClick={() => handleStatusChange(project.id, s)}>Set {s.replace('_', ' ')}</DropdownMenuItem>
                    ))}
                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(project.id)}>Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{project.description || 'No description'}</p>
                <div className="mb-3 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={STATUS_COLORS[project.status]}>{project.status.replace('_', ' ')}</span>
                  <span className={PRIORITY_COLORS[project.priority]}>{project.priority}</span>
                </div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{project.progress}%</span>
                </div>
                <Progress value={project.progress} className="h-1.5" />
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  {project.budget ? (
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{(project.spent ?? 0).toLocaleString()} / {project.budget.toLocaleString()}</span>
                  ) : (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(project.createdAt).toLocaleDateString()}</span>
                  )}
                  <Badge variant="secondary" className="text-[10px]">{project.taskCount} tasks</Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}