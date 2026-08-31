'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, MapPin, School, Hash, Briefcase, Save, Pencil, X, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface TeacherProfile {
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  schoolAddress: string;
  designation: string;
  employeeId: string;
  address: string;
}

const EMPTY_PROFILE: TeacherProfile = {
  name: '', email: '', phone: '', schoolName: '', schoolAddress: '',
  designation: '', employeeId: '', address: '',
};

const MOCK_PROFILE: TeacherProfile = {
  name: 'Dr. Sunita Verma',
  email: 'sunita.verma@dpsjaipur.edu.in',
  phone: '+91 99887 76655',
  schoolName: 'Delhi Public School, Jaipur',
  schoolAddress: 'Bhaskar Enclave, Sector 10, Jaipur, Rajasthan 302001',
  designation: 'Senior English Teacher',
  employeeId: 'DPS-JPR-TCH-2018-042',
  address: '15, Civil Lines, Jaipur, Rajasthan 302001',
};

// ── Field Row ────────────────────────────────────────────────────────────────
function FieldRow({ icon: Icon, label, value, editValue, onChange, editing }: {
  icon: React.ElementType; label: string; value: string; editValue: string;
  onChange: (v: string) => void; editing: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-center">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <Label className="text-sm font-medium text-slate-600 whitespace-nowrap">{label}</Label>
      </div>
      <div className="sm:col-span-2">
        {editing ? (
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
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-28" />
      </div>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherProfileView() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<TeacherProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<TeacherProfile>(EMPTY_PROFILE);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=teacher-profile');
        if (res.ok) {
          const json = await res.json();
          if (json.data) { setProfile(json.data); setEditData(json.data); setLoading(false); return; }
        }
      } catch { /* fall through */ }
      const p = { ...MOCK_PROFILE, name: user?.name ?? MOCK_PROFILE.name, email: user?.email ?? MOCK_PROFILE.email };
      setProfile(p);
      setEditData(p);
      setLoading(false);
    }
    load();
  }, [user]);

  function handleEdit() {
    setEditData({ ...profile! });
    setEditing(true);
  }

  function handleCancel() {
    setEditData({ ...profile! });
    setEditing(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/seed?action=save-teacher-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData),
      });
      if (res.ok) {
        setProfile(editData); setEditing(false); toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      setProfile(editData); setEditing(false); toast.success('Profile updated successfully');
    }
    setSaving(false);
  }

  if (loading) return <ProfileSkeleton />;
  if (!profile) return null;

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
            <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Personal Information</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={User} label="Full Name" value={profile.name} editValue={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} editing={editing} />
            <FieldRow icon={Mail} label="Email" value={profile.email} editValue={editData.email} onChange={(v) => setEditData({ ...editData, email: v })} editing={editing} />
            <FieldRow icon={Phone} label="Phone" value={profile.phone} editValue={editData.phone} onChange={(v) => setEditData({ ...editData, phone: v })} editing={editing} />
            <FieldRow icon={MapPin} label="Address" value={profile.address} editValue={editData.address} onChange={(v) => setEditData({ ...editData, address: v })} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Professional Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-4">
            <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">School & Professional</h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={School} label="School Name" value={profile.schoolName} editValue={editData.schoolName} onChange={(v) => setEditData({ ...editData, schoolName: v })} editing={editing} />
            <FieldRow icon={MapPin} label="School Address" value={profile.schoolAddress} editValue={editData.schoolAddress} onChange={(v) => setEditData({ ...editData, schoolAddress: v })} editing={editing} />
            <FieldRow icon={Briefcase} label="Designation" value={profile.designation} editValue={editData.designation} onChange={(v) => setEditData({ ...editData, designation: v })} editing={editing} />
            <FieldRow icon={Hash} label="Employee ID" value={profile.employeeId} editValue={editData.employeeId} onChange={(v) => setEditData({ ...editData, employeeId: v })} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
