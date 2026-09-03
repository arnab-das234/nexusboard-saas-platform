'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  User, Mail, Phone, Calendar, School, Users, UserPlus, CheckCircle2, Loader2, ArrowLeft, ArrowRight, Check,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuthStore, useNavStore } from '@/lib/store';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────────────────
interface FormData {
  name: string; email: string; phone: string; dateOfBirth: string; gender: string;
  schoolName: string; schoolAddress: string; board: string; classGrade: string;
  section: string; rollNumber: string;
  guardianName: string; guardianRelation: string; guardianPhone: string; guardianEmail: string;
}

const EMPTY_FORM: FormData = {
  name: '', email: '', phone: '', dateOfBirth: '', gender: '',
  schoolName: '', schoolAddress: '', board: '', classGrade: '',
  section: '', rollNumber: '',
  guardianName: '', guardianRelation: 'Father', guardianPhone: '', guardianEmail: '',
};

const STEPS = ['Basic Info', 'School Info', 'Guardian Info', 'Review'];

// ── Field Component ──────────────────────────────────────────────────────────
function FormField({ icon: Icon, label, name, value, onChange, type = 'text', required, placeholder, error }: {
  icon: React.ElementType; label: string; name: string; value: string;
  onChange: (name: string, value: string) => void; type?: string; required?: boolean; placeholder?: string; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name} className="text-sm font-medium text-slate-600">{label} {required && <span className="text-rose-500">*</span>}</Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input id={name} type={type} value={value} placeholder={placeholder}
          onChange={(e) => onChange(name, e.target.value)}
          className={`pl-9 h-9 ${error ? 'border-rose-300 focus-visible:ring-rose-200' : ''}`} />
      </div>
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}

// ── Main View ────────────────────────────────────────────────────────────────
export function TeacherAddStudentView() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);
  const tp = (user as unknown as Record<string, unknown>)?.teacherProfile as { id: string; schoolName?: string; schoolAddress?: string } | undefined;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({ ...EMPTY_FORM, schoolName: tp?.schoolName ?? '' });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(name: string, value: string) {
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: undefined }));
  }

  function validateStep(s: number): boolean {
    const e: Partial<Record<keyof FormData, string>> = {};
    if (s === 0) {
      if (!form.name.trim()) e.name = 'Name is required';
      if (!form.email.trim()) e.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
      if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
      if (!form.gender) e.gender = 'Gender is required';
    }
    if (s === 1) {
      if (!form.schoolName.trim()) e.schoolName = 'School name is required';
      if (!form.classGrade) e.classGrade = 'Class is required';
      if (!form.section) e.section = 'Section is required';
    }
    if (s === 2) {
      if (!form.guardianName.trim()) e.guardianName = 'Guardian name is required';
      if (!form.guardianPhone.trim()) e.guardianPhone = 'Guardian phone is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function nextStep() { if (validateStep(step)) setStep(s => Math.min(s + 1, 3)); }
  function prevStep() { setStep(s => Math.max(s - 1, 0)); }

  async function handleSubmit() {
    if (!validateStep(2)) { setStep(2); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, password: 'Student@123', phone: form.phone,
          role: 'STUDENT', referredByTeacherId: tp?.id,
          dateOfBirth: form.dateOfBirth, gender: form.gender,
          schoolName: form.schoolName, schoolAddress: form.schoolAddress,
          board: form.board, classGrade: form.classGrade, section: form.section, rollNumber: form.rollNumber,
          guardianName: form.guardianName, guardianRelation: form.guardianRelation,
          guardianPhone: form.guardianPhone, guardianEmail: form.guardianEmail,
        }),
      });
      if (res.ok) {
        setSuccess(true);
        toast.success('Student added successfully! An invitation email has been sent.');
      } else {
        const j = await res.json();
        toast.error(j.error ?? 'Failed to add student');
      }
    } catch {
      toast.error('Network error. Please try again.');
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
                An invitation has been sent to <span className="font-medium text-slate-700">{form.email}</span>.
              </p>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => { setForm({ ...EMPTY_FORM }); setErrors({}); setStep(0); setSuccess(false); }}>Add Another</Button>
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
      {/* Header + Stepper */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-slate-800">Add Student</h1>
        <p className="text-sm text-slate-500">Register a new student. Fill in each step to continue.</p>
      </motion.div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <React.Fragment key={label}>
            <button onClick={() => { if (i < step) setStep(i); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${i === step ? 'bg-emerald-100 text-emerald-700' : i < step ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {i < step ? <Check className="h-3 w-3" /> : <span className="flex h-5 w-5 items-center justify-center rounded-full bg-current text-white text-[10px]">{i + 1}</span>}
              <span className="hidden sm:inline">{label}</span>
            </button>
            {i < STEPS.length - 1 && <div className={`h-px flex-1 ${i < step ? 'bg-emerald-300' : 'bg-slate-200'}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base flex items-center gap-2"><User className="h-5 w-5 text-emerald-600" /> Basic Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField icon={User} label="Full Name" name="name" value={form.name} onChange={handleChange} required placeholder="Aarav Sharma" error={errors.name} />
                <FormField icon={Mail} label="Email" name="email" value={form.email} onChange={handleChange} type="email" required placeholder="student@school.edu" error={errors.email} />
                <FormField icon={Phone} label="Phone" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 98765 43210" />
                <FormField icon={Calendar} label="Date of Birth" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} type="date" required error={errors.dateOfBirth} />
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-600">Gender <span className="text-rose-500">*</span></Label>
                  <Select value={form.gender} onValueChange={(v) => handleChange('gender', v)}>
                    <SelectTrigger className={`h-9 ${errors.gender ? 'border-rose-300' : ''}`}><SelectValue placeholder="Select gender" /></SelectTrigger>
                    <SelectContent><SelectItem value="Male">Male</SelectItem><SelectItem value="Female">Female</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                  {errors.gender && <p className="text-xs text-rose-600">{errors.gender}</p>}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 1: School Info */}
      {step === 1 && (
        <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base flex items-center gap-2"><School className="h-5 w-5 text-emerald-600" /> School Information</CardTitle><CardDescription>Pre-filled from your school. Change if needed.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField icon={School} label="School Name" name="schoolName" value={form.schoolName} onChange={handleChange} required error={errors.schoolName} />
                <FormField icon={School} label="School Address" name="schoolAddress" value={form.schoolAddress} onChange={handleChange} placeholder="School address" />
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-600">Board</Label>
                  <Select value={form.board} onValueChange={(v) => handleChange('board', v)}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Select board" /></SelectTrigger>
                    <SelectContent><SelectItem value="CBSE">CBSE</SelectItem><SelectItem value="ICSE">ICSE</SelectItem><SelectItem value="State">State Board</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-600">Class <span className="text-rose-500">*</span></Label>
                  <Select value={form.classGrade} onValueChange={(v) => handleChange('classGrade', v)}>
                    <SelectTrigger className={`h-9 ${errors.classGrade ? 'border-rose-300' : ''}`}><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>{['5','6','7','8','9','10','11','12'].map(c => <SelectItem key={c} value={c}>Class {c}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.classGrade && <p className="text-xs text-rose-600">{errors.classGrade}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-600">Section <span className="text-rose-500">*</span></Label>
                  <Select value={form.section} onValueChange={(v) => handleChange('section', v)}>
                    <SelectTrigger className={`h-9 ${errors.section ? 'border-rose-300' : ''}`}><SelectValue placeholder="Select section" /></SelectTrigger>
                    <SelectContent>{['A','B','C','D','E'].map(s => <SelectItem key={s} value={s}>Section {s}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.section && <p className="text-xs text-rose-600">{errors.section}</p>}
                </div>
                <FormField icon={User} label="Roll Number" name="rollNumber" value={form.rollNumber} onChange={handleChange} placeholder="e.g. 01" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 2: Guardian Info */}
      {step === 2 && (
        <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-emerald-600" /> Guardian Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField icon={User} label="Guardian Name" name="guardianName" value={form.guardianName} onChange={handleChange} required placeholder="Parent name" error={errors.guardianName} />
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-slate-600">Relationship</Label>
                  <Select value={form.guardianRelation} onValueChange={(v) => handleChange('guardianRelation', v)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Father">Father</SelectItem><SelectItem value="Mother">Mother</SelectItem><SelectItem value="Guardian">Guardian</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                  </Select>
                </div>
                <FormField icon={Phone} label="Guardian Phone" name="guardianPhone" value={form.guardianPhone} onChange={handleChange} required placeholder="+91 98765 43210" error={errors.guardianPhone} />
                <FormField icon={Mail} label="Guardian Email" name="guardianEmail" value={form.guardianEmail} onChange={handleChange} type="email" placeholder="parent@email.com" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <Card>
            <CardHeader className="pb-4"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Review & Submit</CardTitle><CardDescription>Please verify the details before submitting.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <ReviewSection title="Basic Information" items={[['Name', form.name], ['Email', form.email], ['Phone', form.phone || 'N/A'], ['Date of Birth', form.dateOfBirth], ['Gender', form.gender]]} />
              <ReviewSection title="School Information" items={[['School', form.schoolName], ['Address', form.schoolAddress || 'N/A'], ['Board', form.board || 'N/A'], ['Class & Section', `${form.classGrade}-${form.section}`], ['Roll Number', form.rollNumber || 'N/A']]} />
              <ReviewSection title="Guardian Information" items={[['Name', form.guardianName], ['Relationship', form.guardianRelation], ['Phone', form.guardianPhone], ['Email', form.guardianEmail || 'N/A']]} />
              <Alert className="border-amber-200 bg-amber-50">
                <AlertDescription className="text-amber-800 text-sm">
                  A default password will be set. The student will receive an invitation email at <strong>{form.email}</strong>.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Navigation Buttons */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex justify-between">
          <div>
            {step > 0 && <Button variant="outline" onClick={prevStep} className="gap-2"><ArrowLeft className="h-4 w-4" /> Back</Button>}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('teacher-students')}>Cancel</Button>
            {step < 3 ? (
              <Button onClick={nextStep} className="gap-2 bg-emerald-600 hover:bg-emerald-700">Next <ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={handleSubmit} disabled={submitting} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Registering...</> : <><UserPlus className="h-4 w-4" /> Register Student</>}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Review Section ───────────────────────────────────────────────────────────
function ReviewSection({ title, items }: { title: string; items: [string, string][] }) {
  return (
    <div>
      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-lg border p-3 bg-slate-50">
        {items.map(([label, value]) => (
          <div key={label} className="text-sm"><span className="text-slate-500">{label}:</span> <span className="font-medium text-slate-800">{value || '—'}</span></div>
        ))}
      </div>
    </div>
  );
}
