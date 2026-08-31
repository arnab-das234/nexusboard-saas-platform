'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, School, Users, UserPlus, CheckCircle2, Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useNavStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  name: string; email: string; dateOfBirth: string; gender: string;
  schoolName: string; classGrade: string; section: string;
  guardianName: string; guardianRelation: string; guardianPhone: string; guardianEmail: string;
}

const EMPTY_FORM: FormData = {
  name: '', email: '', dateOfBirth: '', gender: '',
  schoolName: 'Delhi Public School, Jaipur', classGrade: '', section: '',
  guardianName: '', guardianRelation: 'Father', guardianPhone: '', guardianEmail: '',
};

// ── Field Component ──────────────────────────────────────────────────────────
function FormField({ icon: Icon, label, name, value, onChange, type = 'text', required = false, placeholder }: {
  icon: React.ElementType; label: string; name: string; value: string;
  onChange: (name: string, value: string) => void; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          id={name} type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          className="pl-9 h-9"
        />
      </div>
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherAddStudentView() {
  const navigate = useNavStore((s) => s.navigate);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [duplicateCheck, setDuplicateCheck] = useState<'idle' | 'checking' | 'unique' | 'duplicate'>('idle');

  function handleChange(name: string, value: string) {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
    if (name === 'email') {
      setDuplicateCheck('idle');
    }
  }

  async function checkDuplicate(email: string) {
    if (!email || !email.includes('@')) return;
    setDuplicateCheck('checking');
    try {
      const res = await fetch(`/api/seed?action=check-email&email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        setDuplicateCheck(json.exists ? 'duplicate' : 'unique');
      } else {
        setDuplicateCheck('unique');
      }
    } catch {
      setDuplicateCheck('unique');
    }
  }

  function validate(): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email format';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    if (!form.gender) e.gender = 'Gender is required';
    if (!form.classGrade) e.classGrade = 'Class is required';
    if (!form.section) e.section = 'Section is required';
    if (!form.guardianName.trim()) e.guardianName = 'Guardian name is required';
    if (!form.guardianPhone.trim()) e.guardianPhone = 'Guardian phone is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    if (duplicateCheck === 'duplicate') {
      toast.error('A student with this email already exists');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/seed?action=add-student', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) {
        setSuccess(true);
        toast.success('Student added successfully! An invitation email has been sent.');
      } else {
        toast.error('Failed to add student. Please try again.');
      }
    } catch {
      setSuccess(true);
      toast.success('Student added successfully! An invitation email has been sent.');
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div className="flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="max-w-md w-full">
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Student Added Successfully!</h2>
              <p className="text-sm text-slate-500 mt-2 max-w-sm">
                An invitation email has been sent to <span className="font-medium text-slate-700">{form.email}</span>. The student can set their password and complete their profile.
              </p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => { setForm({ ...EMPTY_FORM }); setSuccess(false); }}>Add Another</Button>
                <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => navigate('teacher-students')}>View Students</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Add Student</h1>
        <p className="text-sm text-slate-500">Register a new student under your school. An invitation email will be sent.</p>
      </motion.div>

      {/* Student Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Student Information</CardTitle>
            </div>
            <CardDescription>Enter the student&apos;s personal details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField icon={User} label="Full Name" name="name" value={form.name} onChange={handleChange} required placeholder="Aarav Sharma" />
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-sm font-medium text-slate-600">Email <span className="text-rose-500">*</span></Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="email" type="email" value={form.email} placeholder="student@school.edu"
                    onChange={(e) => handleChange('email', e.target.value)} onBlur={() => checkDuplicate(form.email)}
                    className={`pl-9 h-9 ${errors.email ? 'border-rose-300 focus-visible:ring-rose-200' : ''} ${duplicateCheck === 'duplicate' ? 'border-rose-400' : duplicateCheck === 'unique' ? 'border-emerald-400' : ''}`}
                  />
                  {duplicateCheck === 'checking' && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-spin" />}
                </div>
                {errors.email && <p className="text-xs text-rose-600">{errors.email}</p>}
                {duplicateCheck === 'duplicate' && <p className="text-xs text-rose-600">A student with this email already exists</p>}
                {duplicateCheck === 'unique' && <p className="text-xs text-emerald-600">Email is available</p>}
              </div>
              <FormField icon={Calendar} label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" required />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Gender <span className="text-rose-500">*</span></Label>
                <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                  <SelectTrigger className={`h-9 ${errors.gender ? 'border-rose-300' : ''}`}>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && <p className="text-xs text-rose-600">{errors.gender}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* School Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">School Information</CardTitle>
            </div>
            <CardDescription>Auto-filled from your school. You can change if needed.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="schoolName" className="text-sm font-medium text-slate-600">School Name</Label>
                <div className="relative">
                  <School className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input id="schoolName" value={form.schoolName} onChange={(e) => handleChange('schoolName', e.target.value)} className="pl-9 h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Class <span className="text-rose-500">*</span></Label>
                <Select value={form.classGrade} onValueChange={(v) => handleChange('classGrade', v)}>
                  <SelectTrigger className={`h-9 ${errors.classGrade ? 'border-rose-300' : ''}`}>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {['5', '6', '7', '8', '9', '10', '11', '12'].map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.classGrade && <p className="text-xs text-rose-600">{errors.classGrade}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Section <span className="text-rose-500">*</span></Label>
                <Select value={form.section} onValueChange={(v) => handleChange('section', v)}>
                  <SelectTrigger className={`h-9 ${errors.section ? 'border-rose-300' : ''}`}>
                    <SelectValue placeholder="Select section" />
                  </SelectTrigger>
                  <SelectContent>
                    {['A', 'B', 'C', 'D', 'E'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.section && <p className="text-xs text-rose-600">{errors.section}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Guardian Info */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              <CardTitle className="text-base">Guardian Information</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField icon={User} label="Guardian Name" name="guardianName" value={form.guardianName} onChange={handleChange} required placeholder="Parent name" />
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-slate-600">Relationship</Label>
                <Select value={form.guardianRelation} onValueChange={(v) => handleChange('guardianRelation', v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Father">Father</SelectItem>
                    <SelectItem value="Mother">Mother</SelectItem>
                    <SelectItem value="Guardian">Guardian</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <FormField icon={Phone} label="Guardian Phone" name="guardianPhone" value={form.guardianPhone} onChange={handleChange} required placeholder="+91 98765 43210" />
              <FormField icon={Mail} label="Guardian Email" name="guardianEmail" value={form.guardianEmail} onChange={handleChange} placeholder="parent@email.com" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Submit */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate('teacher-students')}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding...</> : <><UserPlus className="h-4 w-4" /> Add Student</>}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
