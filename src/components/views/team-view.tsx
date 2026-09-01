'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, UserPlus, MoreHorizontal, Mail, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { toast } from 'sonner';
import { ROLE_COLORS } from '@/lib/constants';
import type { TeamMember } from '@/lib/types';

type InviteForm = { email: string; role: 'MEMBER' | 'MANAGER' | 'ADMIN' };

export function TeamView() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState<InviteForm>({ email: '', role: 'MEMBER' });
  const [inviteLoading, setInviteLoading] = useState(false);

  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch('/api/team');
      if (res.ok) setMembers(await res.json());
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async () => {
    if (!inviteForm.email.trim() || !inviteForm.email.includes('@')) {
      toast.error('Valid email is required');
      return;
    }
    setInviteLoading(true);
    try {
      const res = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm),
      });
      if (res.ok) {
        toast.success('Invitation sent');
        setInviteOpen(false);
        setInviteForm({ email: '', role: 'MEMBER' });
        fetchTeam();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to invite');
      }
    } catch {
      toast.error('Network error');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      const res = await fetch('/api/team', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role }),
      });
      if (res.ok) {
        toast.success('Role updated');
        fetchTeam();
      }
    } catch {
      /* ignore */
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await fetch(`/api/team?userId=${userId}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Member removed');
        fetchTeam();
      } else {
        toast.error('Cannot remove this member');
      }
    } catch {
      toast.error('Network error');
    }
  };

  const filtered = members.filter((m) => {
    const matchSearch = m.user.name.toLowerCase().includes(search.toLowerCase()) || m.user.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'ALL' || m.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Team</h1>
          <p className="text-muted-foreground">Manage your workspace members and roles</p>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="colleague@company.com"
                    className="pl-9"
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select
                  value={inviteForm.role}
                  onValueChange={(v) => setInviteForm({ ...inviteForm, role: v as InviteForm['role'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MEMBER">Member</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" onClick={handleInvite} disabled={inviteLoading}>
                {inviteLoading ? 'Sending...' : 'Send Invitation'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search members..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Roles</SelectItem>
            <SelectItem value="OWNER">Owner</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MANAGER">Manager</SelectItem>
            <SelectItem value="MEMBER">Member</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-muted-foreground">No team members found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((member) => (
            <Card key={member.id} className="transition-shadow hover:shadow-sm">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-emerald-100 text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {member.user.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{member.user.name}</p>
                      <Badge variant="secondary" className={ROLE_COLORS[member.role]}>
                        {member.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">
                    Joined {new Date(member.joinedAt).toLocaleDateString()}
                  </span>
                  <span className="text-xs text-muted-foreground">{member.taskCount} tasks</span>
                  {member.role !== 'OWNER' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {['ADMIN', 'MANAGER', 'MEMBER']
                          .filter((r) => r !== member.role)
                          .map((r) => (
                            <DropdownMenuItem key={r} onClick={() => handleRoleChange(member.userId, r)}>
                              Change to {r}
                            </DropdownMenuItem>
                          ))}
                        <DropdownMenuItem className="text-red-600" onClick={() => handleRemove(member.userId)}>
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
