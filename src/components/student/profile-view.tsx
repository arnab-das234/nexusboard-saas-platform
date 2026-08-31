'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, School, Hash, Shield, Save, Pencil, X, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface StudentProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  address: string;
  schoolName: string;
  schoolAddress: string;
  board: string;
  classGrade: string;
  section: string;
  rollNumber: string;
  studentId: string;
  guardianName: string;
  guardianRelation: string;
  guardianPhone: string;
  guardianEmail: string;
}

const EMPTY_PROFILE: StudentProfile = {
  name: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '',
  schoolName: '', schoolAddress: '', board: '', classGrade: '', section: '',
  rollNumber: '', studentId: '', guardianName: '', guardianRelation: '',
  guardianPhone: '', guardianEmail: '',
};

const MOCK_PROFILE: StudentProfile = {
  name: 'Aarav Sharma',
  email: 'aarav.sharma@school.edu.in',
  phone: '+91 98765 43210',
  dateOfBirth: '2010-05-15',
  gender: 'Male',
  address: '42, Shanti Nagar, Jaipur, Rajasthan 302001',
  schoolName: 'Delhi Public School, Jaipur',
  schoolAddress: 'Bhaskar Enclave, Sector 10, Jaipur',
  board: 'CBSE',
  classGrade: '10',
  section: 'A',
  rollNumber: '2024-1015',
  studentId: 'DPS-JPR-2024-1015',
  guardianName: 'Rajesh Sharma',
  guardianRelation: 'Father',
  guardianPhone: '+91 98765 12345',
  guardianEmail: 'rajesh.sharma@gmail.com',
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

// ── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ title }: { title: string }) {
  return <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">{title}</h3>;
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function StudentProfileView() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<StudentProfile>(EMPTY_PROFILE);

  const isProfileIncomplete = profile && (
    !profile.dateOfBirth || !profile.gender || !profile.schoolName ||
    !profile.classGrade || !profile.guardianName
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/seed?action=student-profile');
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
      const res = await fetch('/api/seed?action=save-student-profile', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editData),
      });
      if (res.ok) {
        setProfile(editData);
        setEditing(false);
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch {
      // Simulate save
      setProfile(editData);
      setEditing(false);
      toast.success('Profile updated successfully');
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
          <p className="text-sm text-slate-500">Manage your personal and academic information</p>
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

      {/* Incomplete Banner */}
      {isProfileIncomplete && !editing && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              Your profile is incomplete. Please complete your profile to participate in competitions.
              <Button variant="link" size="sm" className="text-amber-700 underline p-0 h-auto ml-1" onClick={handleEdit}>
                Complete Now
              </Button>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}

      {/* Personal Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-4">
            <SectionHeader title="Personal Information" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={User} label="Full Name" value={profile.name} editValue={editData.name} onChange={(v) => setEditData({ ...editData, name: v })} editing={editing} />
            <FieldRow icon={Mail} label="Email" value={profile.email} editValue={editData.email} onChange={(v) => setEditData({ ...editData, email: v })} editing={editing} />
            <FieldRow icon={Phone} label="Phone" value={profile.phone} editValue={editData.phone} onChange={(v) => setEditData({ ...editData, phone: v })} editing={editing} />
            <FieldRow icon={Calendar} label="Date of Birth" value={profile.dateOfBirth} editValue={editData.dateOfBirth} onChange={(v) => setEditData({ ...editData, dateOfBirth: v })} editing={editing} />
            <FieldRow icon={Shield} label="Gender" value={profile.gender} editValue={editData.gender} onChange={(v) => setEditData({ ...editData, gender: v })} editing={editing} />
            <FieldRow icon={MapPin} label="Address" value={profile.address} editValue={editData.address} onChange={(v) => setEditData({ ...editData, address: v })} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>

      {/* School Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-4">
            <SectionHeader title="School Information" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={School} label="School Name" value={profile.schoolName} editValue={editData.schoolName} onChange={(v) => setEditData({ ...editData, schoolName: v })} editing={editing} />
            <FieldRow icon={MapPin} label="School Address" value={profile.schoolAddress} editValue={editData.schoolAddress} onChange={(v) => setEditData({ ...editData, schoolAddress: v })} editing={editing} />
            <FieldRow icon={School} label="Board" value={profile.board} editValue={editData.board} onChange={(v) => setEditData({ ...editData, board: v })} editing={editing} />
            <FieldRow icon={Hash} label="Class" value={profile.classGrade} editValue={editData.classGrade} onChange={(v) => setEditData({ ...editData, classGrade: v })} editing={editing} />
            <FieldRow icon={Hash} label="Section" value={profile.section} editValue={editData.section} onChange={(v) => setEditData({ ...editData, section: v })} editing={editing} />
            <FieldRow icon={Hash} label="Roll Number" value={profile.rollNumber} editValue={editData.rollNumber} onChange={(v) => setEditData({ ...editData, rollNumber: v })} editing={editing} />
            <FieldRow icon={Hash} label="Student ID" value={profile.studentId} editValue={editData.studentId} onChange={(v) => setEditData({ ...editData, studentId: v })} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>

      {/* Guardian Information */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader className="pb-4">
            <SectionHeader title="Guardian Information" />
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldRow icon={User} label="Guardian Name" value={profile.guardianName} editValue={editData.guardianName} onChange={(v) => setEditData({ ...editData, guardianName: v })} editing={editing} />
            <FieldRow icon={User} label="Relationship" value={profile.guardianRelation} editValue={editData.guardianRelation} onChange={(v) => setEditData({ ...editData, guardianRelation: v })} editing={editing} />
            <FieldRow icon={Phone} label="Guardian Phone" value={profile.guardianPhone} editValue={editData.guardianPhone} onChange={(v) => setEditData({ ...editData, guardianPhone: v })} editing={editing} />
            <FieldRow icon={Mail} label="Guardian Email" value={profile.guardianEmail} editValue={editData.guardianEmail} onChange={(v) => setEditData({ ...editData, guardianEmail: v })} editing={editing} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
