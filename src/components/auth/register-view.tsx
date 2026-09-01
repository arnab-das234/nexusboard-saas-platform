'use client';

import React, { useState, useEffect } from 'react';
import { PenTool, Loader2, Eye, EyeOff, GraduationCap, BookOpen, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { useNavStore } from '@/lib/store';

// ── Types ──────────────────────────────────────────────────────────────────
interface StudentForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}

interface TeacherForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  schoolName: string;
  designation: string;
}

// ── Component ───────────────────────────────────────────────────────────────
export function RegisterView() {
  const currentView = useNavStore((s) => s.currentView);
  const navigate = useNavStore((s) => s.navigate);

  // Default tab: 'teacher' if navigated from 'register-teacher', else 'student'
  const defaultTab = currentView === 'register-teacher' ? 'teacher' : 'student';
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset tab when currentView changes (e.g. coming from login links)
  useEffect(() => {
    setActiveTab(currentView === 'register-teacher' ? 'teacher' : 'student');
    setShowSuccess(false);
  }, [currentView]);

  // ── Student form state ──────────────────────────────────────────────────
  const [student, setStudent] = useState<StudentForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [showStudentPw, setShowStudentPw] = useState(false);

  // ── Teacher form state ──────────────────────────────────────────────────
  const [teacher, setTeacher] = useState<TeacherForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    schoolName: '',
    designation: '',
  });
  const [showTeacherPw, setShowTeacherPw] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (student.password !== student.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (student.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: student.name,
          email: student.email,
          password: student.password,
          phone: student.phone || undefined,
          role: 'STUDENT',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || data.message || 'Registration failed.');
        return;
      }
      setShowSuccess(true);
      toast.success('Student account created successfully!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teacher.password !== teacher.confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    if (teacher.password.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (!teacher.schoolName.trim()) {
      toast.error('Please enter your school name.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacher.name,
          email: teacher.email,
          password: teacher.password,
          phone: teacher.phone || undefined,
          schoolName: teacher.schoolName,
          designation: teacher.designation || undefined,
          role: 'TEACHER',
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || data.message || 'Registration failed.');
        return;
      }
      setShowSuccess(true);
      toast.success('Teacher account created successfully!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Success state ────────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-border/60 shadow-xl shadow-slate-200/40">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Account Created!</h2>
              <p className="mt-1 text-sm text-slate-500">
                Your account has been registered successfully. You can now sign in.
              </p>
            </div>
            <Button
              onClick={() => navigate('login')}
              className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // ── Input helper ─────────────────────────────────────────────────────────
  const inputCls = 'h-10 border-border/80 bg-background';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-border/60 shadow-xl shadow-slate-200/40">
        <CardHeader className="space-y-3 pb-4 text-center">
          {/* Branding */}
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
            <PenTool className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">
              Create an Account
            </CardTitle>
            <CardDescription className="mt-1 text-slate-500">
              Join EssayCompass to participate in competitions
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {/* Back link */}
          <button
            onClick={() => navigate('login')}
            className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ArrowLeft className="size-3.5" />
            Back to login
          </button>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'student' | 'teacher')}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="student" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <GraduationCap className="size-3.5" />
                Student
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <BookOpen className="size-3.5" />
                Teacher
              </TabsTrigger>
            </TabsList>

            {/* ── Student Tab ─────────────────────────────────────────────── */}
            <TabsContent value="student">
              <form onSubmit={handleStudentSubmit} className="grid gap-3.5">
                <div className="grid gap-1.5">
                  <Label htmlFor="s-name" className="text-sm font-medium text-slate-700">Full Name</Label>
                  <Input
                    id="s-name"
                    placeholder="John Doe"
                    value={student.name}
                    onChange={(e) => setStudent({ ...student, name: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="s-email"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={student.email}
                    onChange={(e) => setStudent({ ...student, email: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                  <Input
                    id="s-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={student.phone}
                    onChange={(e) => setStudent({ ...student, phone: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-pw" className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="s-pw"
                      type={showStudentPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={student.password}
                      onChange={(e) => setStudent({ ...student, password: e.target.value })}
                      disabled={isLoading}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowStudentPw(!showStudentPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showStudentPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="s-cpw" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                  <Input
                    id="s-cpw"
                    type="password"
                    placeholder="Re-enter your password"
                    value={student.confirmPassword}
                    onChange={(e) => setStudent({ ...student, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating Account…
                    </>
                  ) : (
                    'Create Student Account'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* ── Teacher Tab ─────────────────────────────────────────────── */}
            <TabsContent value="teacher">
              <form onSubmit={handleTeacherSubmit} className="grid gap-3.5">
                <div className="grid gap-1.5">
                  <Label htmlFor="t-name" className="text-sm font-medium text-slate-700">Full Name</Label>
                  <Input
                    id="t-name"
                    placeholder="Dr. Jane Smith"
                    value={teacher.name}
                    onChange={(e) => setTeacher({ ...teacher, name: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-email" className="text-sm font-medium text-slate-700">Email address</Label>
                  <Input
                    id="t-email"
                    type="email"
                    placeholder="you@school.edu"
                    autoComplete="email"
                    value={teacher.email}
                    onChange={(e) => setTeacher({ ...teacher, email: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                  <Input
                    id="t-phone"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={teacher.phone}
                    onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-school" className="text-sm font-medium text-slate-700">School / Institution Name</Label>
                  <Input
                    id="t-school"
                    placeholder="Springfield High School"
                    value={teacher.schoolName}
                    onChange={(e) => setTeacher({ ...teacher, schoolName: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-desig" className="text-sm font-medium text-slate-700">Designation</Label>
                  <Input
                    id="t-desig"
                    placeholder="English Teacher, HOD, etc."
                    value={teacher.designation}
                    onChange={(e) => setTeacher({ ...teacher, designation: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-pw" className="text-sm font-medium text-slate-700">Password</Label>
                  <div className="relative">
                    <Input
                      id="t-pw"
                      type={showTeacherPw ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={teacher.password}
                      onChange={(e) => setTeacher({ ...teacher, password: e.target.value })}
                      disabled={isLoading}
                      className={`${inputCls} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowTeacherPw(!showTeacherPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                    >
                      {showTeacherPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-cpw" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                  <Input
                    id="t-cpw"
                    type="password"
                    placeholder="Re-enter your password"
                    value={teacher.confirmPassword}
                    onChange={(e) => setTeacher({ ...teacher, confirmPassword: e.target.value })}
                    disabled={isLoading}
                    className={inputCls}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="mt-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" />
                      Creating Account…
                    </>
                  ) : (
                    'Create Teacher Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}
