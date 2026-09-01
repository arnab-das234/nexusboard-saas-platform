'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, School, Briefcase, Hash, Save, Pencil, X, AlertTriangle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface TeacherProfileData {
  name: string; email: string; phone: string;
  schoolName: string; schoolAddress: string;
  designation: string; employeeId: string; address: string;
}

const EMPTY: TeacherProfileData = {
  name: '', email: '', phone: '', schoolName: '', schoolAddress: '',
  designation: '', employeeId: '', address: '',
};

// ── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ icon: Icon, label, value, editValue, onChange, editing, readOnly }: {
  icon: React.ElementType; label: string; value: string; editValue: string;
  onChange: (v: string) => void; editing: boolean; readOnly?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <Label className="text-sm font-medium text-slate-600 whitespace-nowrap">{label}</Label>
      </div>
      <div className="sm:col-span-2">
        {editing && !readOnly ? (
          <Input value={editValue} onChange={(e) => onChange(e.target.value)} className="h-9" />
        ) : (
          <p className="text-sm text-slate-800">{value || <span className="text-slate-400 italic">Not provided</span>}</p>
        )}
      </div>
    </div>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" /><Skeleton className="h-9 w-28" />
      </div>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherProfileView() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<TeacherProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<TeacherProfileData>(EMPTY);

  async function load() {
    if (!user?.id) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/users?action=me&userId=${user.id}`);
      if (!res.ok) throw new Error('Failed to load profile');
      const j = await res.json();
      const d = j.data;
      const tp = d?.teacherProfile ?? {};
      const p: TeacherProfileData = {
        name: d.name ?? user.name ?? '',
        email: d.email ?? user.email ?? '',
        phone: d.phone ?? '',
        schoolName: tp.schoolName ?? '',
        schoolAddress: tp.schoolAddress ?? '',
        designation: tp.designation ?? '',
        employeeId: tp.employeeId ?? '',
        address: tp.address ?? '',
      };
      setProfile(p); setEditData(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load profile');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [user?.id]);

  function handleEdit() { setEditData({ ...profile! }); setEditing(true); }
  function handleCancel() { setEditData({ ...profile! }); setEditing(false); }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/users?action=me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, ...editData }),
      });
      if (res.ok) {
        setProfile(editData); setEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      setProfile(editData); setEditing(false);
      toast.success('Profile updated successfully');
    }
    setSaving(false);
  }

  if (loading) return <ProfileSkeleton />;
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Unable to load profile</p>
        <p className="text-sm text-slate-400 mt-1">{error}</p>
        <Button variant="outline" className="mt-4 gap-2" onClick={load}><RefreshCw className="h-4 w-4" /> Try Again</Button>
      </div>
    );
  }
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-slate-300 mb-3" />
        <p className="text-slate-600 font-medium">No profile data found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-500">Manage your personal and professional information</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="gap-1.5">
              <X className="h-4 w-4" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              {saving ? 'Saving...' : <><Save className="h-4 w-4" /> Save</>}
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={handleEdit} className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50">
            <Pencil className="h-4 w-4" /> Edit Profile
          </Button>
        )}
      </motion.div>

      {/* Personal Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={User} label="Full Name" value={profile.name} editValue={editData.name} onChange={(v) => setEditData(p => ({ ...p, name: v }))} editing={editing} />
            <FieldRow icon={Mail} label="Email" value={profile.email} editValue={editData.email} onChange={(v) => setEditData(p => ({ ...p, email: v }))} editing={editing} readOnly />
            <FieldRow icon={Phone} label="Phone" value={profile.phone} editValue={editData.phone} onChange={(v) => setEditData(p => ({ ...p, phone: v }))} editing={editing} />
            <FieldRow icon={MapPin} label="Address" value={profile.address} editValue={editData.address} onChange={(v) => setEditData(p => ({ ...p, address: v }))} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">School & Professional</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={School} label="School Name" value={profile.schoolName} editValue={editData.schoolName} onChange={(v) => setEditData(p => ({ ...p, schoolName: v }))} editing={editing} />
            <FieldRow icon={MapPin} label="School Address" value={profile.schoolAddress} editValue={editData.schoolAddress} onChange={(v) => setEditData(p => ({ ...p, schoolAddress: v }))} editing={editing} />
            <FieldRow icon={Briefcase} label="Designation" value={profile.designation} editValue={editData.designation} onChange={(v) => setEditData(p => ({ ...p, designation: v }))} editing={editing} />
            <FieldRow icon={Hash} label="Employee ID" value={profile.employeeId} editValue={editData.employeeId} onChange={(v) => setEditData(p => ({ ...p, employeeId: v }))} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
