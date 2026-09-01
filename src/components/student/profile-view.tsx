'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Phone, Calendar, MapPin, School, Hash, Shield, Save, Pencil, X, AlertTriangle, Calculator, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';

interface ProfileData {
  name: string; email: string; phone: string; dateOfBirth: string;
  gender: string; address: string; schoolName: string; schoolAddress: string;
  board: string; classGrade: string; section: string; rollNumber: string;
  studentId: string; guardianName: string; guardianRelation: string;
  guardianPhone: string; guardianEmail: string;
}

const EMPTY: ProfileData = {
  name: '', email: '', phone: '', dateOfBirth: '', gender: '', address: '',
  schoolName: '', schoolAddress: '', board: '', classGrade: '', section: '',
  rollNumber: '', studentId: '', guardianName: '', guardianRelation: '',
  guardianPhone: '', guardianEmail: '',
};

function calcAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getEligibleCategories(age: number | null): string[] {
  if (age === null) return [];
  if (age <= 8) return ['Sub-Junior (Up to 8 years)'];
  if (age <= 12) return ['Junior (9-12 years)'];
  if (age <= 15) return ['Junior (9-12 years)', 'Senior (13-15 years)'];
  if (age <= 18) return ['Senior (13-15 years)', 'Super Senior (16-18 years)'];
  return ['Open Category'];
}

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

function ProfileSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Card><CardContent className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</CardContent></Card>
    </div>
  );
}

export function StudentProfileView() {
  const user = useAuthStore((s) => s.user);
  const sp = (user as Record<string, unknown>)?.studentProfile as Record<string, string> | undefined;

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<ProfileData>(EMPTY);

  useEffect(() => {
    if (loaded) return;
    requestAnimationFrame(() => {
      const p: ProfileData = {
        name: user?.name ?? '',
        email: user?.email ?? '',
        phone: (user as Record<string, unknown>)?.phone as string ?? '',
        dateOfBirth: sp?.dateOfBirth ?? '',
        gender: sp?.gender ?? '',
        address: sp?.address ?? '',
        schoolName: sp?.schoolName ?? '',
        schoolAddress: sp?.schoolAddress ?? '',
        board: sp?.board ?? '',
        classGrade: sp?.classGrade ?? '',
        section: sp?.section ?? '',
        rollNumber: sp?.rollNumber ?? '',
        studentId: sp?.studentId ?? '',
        guardianName: sp?.guardianName ?? '',
        guardianRelation: sp?.guardianRelation ?? '',
        guardianPhone: sp?.guardianPhone ?? '',
        guardianEmail: sp?.guardianEmail ?? '',
      };
      setProfile(p);
      setEditData(p);
      setLoaded(true);
    });
  }, [user, sp, loaded]);

  const age = useMemo(() => calcAge(editData.dateOfBirth), [editData.dateOfBirth]);
  const eligibleCategories = useMemo(() => getEligibleCategories(age), [age]);

  const isIncomplete = profile && (!profile.dateOfBirth || !profile.gender || !profile.schoolName || !profile.classGrade || !profile.guardianName);

  function handleEdit() { setEditData({ ...profile! }); setEditing(true); }
  function handleCancel() { setEditData({ ...profile! }); setEditing(false); }

  async function handleSave() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 600));
    setProfile(editData);
    setEditing(false);
    setSaving(false);
    toast.success('Profile saved successfully');
  }

  if (!loaded) return <ProfileSkeleton />;
  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-400 mb-3" />
        <p className="text-slate-600 font-medium">Unable to load profile</p>
      </div>
    );
  }

  const u = (k: keyof ProfileData) => editData[k];
  const s = (k: keyof ProfileData, v: string) => setEditData({ ...editData, [k]: v });

  return (
    <div className="space-y-6 p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Profile</h1>
          <p className="text-sm text-slate-500">Manage your personal and academic information</p>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving} className="gap-1.5"><X className="h-4 w-4" /> Cancel</Button>
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

      {isIncomplete && !editing && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Your profile is incomplete. Please complete your profile to participate in competitions.
            <Button variant="link" size="sm" className="text-amber-700 underline p-0 h-auto ml-1" onClick={handleEdit}>Complete Now</Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="school">School Info</TabsTrigger>
          <TabsTrigger value="guardian">Guardian Info</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Personal Information</CardTitle>
                  {age !== null && (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 gap-1"><Calculator className="h-3 w-3" /> Age: {age} years</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow icon={User} label="Full Name" value={profile.name} editValue={u('name')} onChange={(v) => s('name', v)} editing={editing} />
                <FieldRow icon={Mail} label="Email" value={profile.email} editValue={u('email')} onChange={(v) => s('email', v)} editing={editing} readOnly />
                <FieldRow icon={Phone} label="Phone" value={profile.phone} editValue={u('phone')} onChange={(v) => s('phone', v)} editing={editing} />
                <FieldRow icon={Calendar} label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : ''} editValue={u('dateOfBirth')} onChange={(v) => s('dateOfBirth', v)} editing={editing} />
                <FieldRow icon={Shield} label="Gender" value={profile.gender} editValue={u('gender')} onChange={(v) => s('gender', v)} editing={editing} />
                <FieldRow icon={MapPin} label="Address" value={profile.address} editValue={u('address')} onChange={(v) => s('address', v)} editing={editing} />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="school">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">School Information</CardTitle>
                  {eligibleCategories.length > 0 && (
                    <div className="flex gap-1 flex-wrap justify-end">
                      {eligibleCategories.map(c => (
                        <Badge key={c} variant="outline" className="bg-teal-50 text-teal-700 gap-1 text-xs"><Tag className="h-3 w-3" />{c}</Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow icon={School} label="School Name" value={profile.schoolName} editValue={u('schoolName')} onChange={(v) => s('schoolName', v)} editing={editing} />
                <FieldRow icon={MapPin} label="School Address" value={profile.schoolAddress} editValue={u('schoolAddress')} onChange={(v) => s('schoolAddress', v)} editing={editing} />
                <FieldRow icon={School} label="Board" value={profile.board} editValue={u('board')} onChange={(v) => s('board', v)} editing={editing} />
                <FieldRow icon={Hash} label="Class" value={profile.classGrade} editValue={u('classGrade')} onChange={(v) => s('classGrade', v)} editing={editing} />
                <FieldRow icon={Hash} label="Section" value={profile.section} editValue={u('section')} onChange={(v) => s('section', v)} editing={editing} />
                <FieldRow icon={Hash} label="Roll Number" value={profile.rollNumber} editValue={u('rollNumber')} onChange={(v) => s('rollNumber', v)} editing={editing} />
                <FieldRow icon={Hash} label="Student ID" value={profile.studentId} editValue={u('studentId')} onChange={(v) => s('studentId', v)} editing={editing} />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="guardian">
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-emerald-700 uppercase tracking-wide">Guardian Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FieldRow icon={User} label="Guardian Name" value={profile.guardianName} editValue={u('guardianName')} onChange={(v) => s('guardianName', v)} editing={editing} />
                <FieldRow icon={User} label="Relationship" value={profile.guardianRelation} editValue={u('guardianRelation')} onChange={(v) => s('guardianRelation', v)} editing={editing} />
                <FieldRow icon={Phone} label="Phone" value={profile.guardianPhone} editValue={u('guardianPhone')} onChange={(v) => s('guardianPhone', v)} editing={editing} />
                <FieldRow icon={Mail} label="Email" value={profile.guardianEmail} editValue={u('guardianEmail')} onChange={(v) => s('guardianEmail', v)} editing={editing} />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
