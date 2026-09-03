'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenTool, Loader2, Eye, EyeOff, GraduationCap, BookOpen, ArrowLeft,
  CheckCircle2, CalendarIcon, ChevronRight, ChevronLeft, Shield,
  Mail, Phone, User, School, Lock, XCircle, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format, differenceInYears, isValid } from 'date-fns';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from '@/components/ui/input-otp';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';

import { useNavStore, useAuthStore } from '@/lib/store';
import type { UserSession } from '@/lib/types';

// ── Types ──────────────────────────────────────────────────────────────────
interface StudentForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  schoolName: string;
  board: string;
  classGrade: string;
  section: string;
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

type Step = 1 | 2 | 3 | 4;

interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  checks: {
    minLength: boolean;
    uppercase: boolean;
    lowercase: boolean;
    digit: boolean;
    special: boolean;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[a-zA-Z]+( [a-zA-Z]+)*$/;

function cleanName(raw: string): string {
  return raw.trim().replace(/\s{2,}/g, ' ');
}

function validateName(raw: string): { valid: boolean; error?: string; cleaned?: string } {
  const cleaned = cleanName(raw);
  if (!cleaned) return { valid: false, error: 'Full name is required.' };
  if (cleaned.length < 2) return { valid: false, error: 'Name must be at least 2 characters.', cleaned };
  if (cleaned.length > 100) return { valid: false, error: 'Name is too long (max 100 chars).', cleaned };
  if (!NAME_REGEX.test(cleaned)) return { valid: false, error: 'Name can only contain letters and single spaces.', cleaned };
  return { valid: true, cleaned };
}

function validateDOB(dob: string): { valid: boolean; error?: string } {
  if (!dob) return { valid: false, error: 'Date of birth is required.' };
  const date = new Date(dob);
  if (!isValid(date)) return { valid: false, error: 'Invalid date.' };
  const today = new Date();
  if (date > today) return { valid: false, error: 'Date of birth cannot be in the future.' };
  const age = differenceInYears(today, date);
  if (age < 5) return { valid: false, error: 'You must be at least 5 years old.' };
  if (age > 25) return { valid: false, error: 'You must be 25 years old or younger.' };
  return { valid: true };
}

function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email.trim()) return { valid: false, error: 'Email address is required.' };
  if (!EMAIL_REGEX.test(email.trim())) return { valid: false, error: 'Please enter a valid email address.' };
  return { valid: true };
}

function validatePhone(phone: string): { valid: boolean; error?: string } {
  if (!phone.trim()) return { valid: false, error: 'Mobile number is required.' };
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10) return { valid: false, error: 'Phone number must have 10 digits.' };
  if (digits.length > 12) return { valid: false, error: 'Phone number is too long.' };
  const last10 = digits.slice(-10);
  if (!/^[6-9]/.test(last10)) return { valid: false, error: 'Indian mobile numbers start with 6-9.' };
  return { valid: true };
}

function getPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '').slice(-10);
}

function evaluatePasswordStrength(password: string): PasswordStrength {
  const checks = {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let label = 'Very Weak';
  let color = 'bg-red-500';
  if (score === 1) { label = 'Very Weak'; color = 'bg-red-500'; }
  else if (score === 2) { label = 'Weak'; color = 'bg-orange-500'; }
  else if (score === 3) { label = 'Fair'; color = 'bg-orange-400'; }
  else if (score === 4) { label = 'Good'; color = 'bg-yellow-500'; }
  else if (score === 5) { label = 'Strong'; color = 'bg-emerald-500'; }

  return { score, label, color, checks };
}

// ── OTP Input Component ────────────────────────────────────────────────────
interface OtpSectionProps {
  label: string;
  icon: React.ReactNode;
  otpValue: string;
  setOtpValue: (v: string) => void;
  isOtpSent: boolean;
  isOtpVerified: boolean;
  isSending: boolean;
  isVerifying: boolean;
  timer: number;
  onSend: () => void;
  onVerify: () => void;
  onResend: () => void;
  disabled?: boolean;
}

function OtpSection({
  label, icon, otpValue, setOtpValue,
  isOtpSent, isOtpVerified, isSending, isVerifying,
  timer, onSend, onVerify, onResend, disabled,
}: OtpSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-slate-700">{label}</span>
        {isOtpVerified && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
            <CheckCircle2 className="size-3.5" /> Verified
          </span>
        )}
      </div>

      {!isOtpSent && !isOtpVerified && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onSend}
          disabled={isSending || disabled}
          className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
        >
          {isSending ? (
            <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Sending...</>
          ) : (
            <><Mail className="mr-1.5 size-3.5" /> Send OTP</>
          )}
        </Button>
      )}

      {isOtpSent && !isOtpVerified && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <InputOTP
              maxLength={6}
              value={otpValue}
              onChange={setOtpValue}
              disabled={disabled}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={onVerify}
              disabled={isVerifying || otpValue.length < 6 || disabled}
              className="h-8 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {isVerifying ? (
                <><Loader2 className="mr-1.5 size-3.5 animate-spin" /> Verifying...</>
              ) : (
                'Verify OTP'
              )}
            </Button>

            {timer > 0 ? (
              <span className="text-xs text-slate-500">
                Resend in <span className="font-medium text-slate-700">{timer}s</span>
              </span>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onResend}
                disabled={isSending || disabled}
                className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
              >
                {isSending ? <Loader2 className="size-3.5 animate-spin" /> : 'Resend OTP'}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Step Indicator ─────────────────────────────────────────────────────────
function StepIndicator({ step, completedSteps }: { step: Step; completedSteps: Set<number> }) {
  const steps = [
    { num: 1, label: 'Personal' },
    { num: 2, label: 'Academic' },
    { num: 3, label: 'Password' },
    { num: 4, label: 'Review' },
  ];

  return (
    <div className="flex items-center justify-between mb-6">
      {steps.map((s, idx) => {
        const isActive = s.num === step;
        const isCompleted = completedSteps.has(s.num);

        return (
          <React.Fragment key={s.num}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isCompleted
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                    : isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 ring-2 ring-emerald-600/30'
                      : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isCompleted ? <Check className="size-4" /> : s.num}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive || isCompleted ? 'text-emerald-700' : 'text-slate-400'
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 rounded-full transition-colors duration-300 ${
                  completedSteps.has(s.num) ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export function RegisterView() {
  const currentView = useNavStore((s) => s.currentView);
  const navigate = useNavStore((s) => s.navigate);
  const login = useAuthStore((s) => s.login);

  const defaultTab = currentView === 'register-teacher' ? 'teacher' : 'student';
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>(defaultTab);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    setActiveTab(currentView === 'register-teacher' ? 'teacher' : 'student');
    setShowSuccess(false);
  }, [currentView]);

  // ── Student form state ─────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [student, setStudent] = useState<StudentForm>({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    dateOfBirth: '', gender: '', schoolName: '', board: '', classGrade: '', section: '',
  });

  // Field-level validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Email OTP state
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailOtpVerified, setIsEmailOtpVerified] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpTimer, setEmailOtpTimer] = useState(0);
  const emailOtpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mobile OTP state
  const [mobileOtp, setMobileOtp] = useState('');
  const [isMobileOtpSent, setIsMobileOtpSent] = useState(false);
  const [isMobileOtpVerified, setIsMobileOtpVerified] = useState(false);
  const [isSendingMobileOtp, setIsSendingMobileOtp] = useState(false);
  const [isVerifyingMobileOtp, setIsVerifyingMobileOtp] = useState(false);
  const [mobileOtpTimer, setMobileOtpTimer] = useState(0);
  const mobileOtpIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Password visibility
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Email availability check
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // DOB picker
  const [dobOpen, setDobOpen] = useState(false);

  // Password strength
  const pwStrength = evaluatePasswordStrength(student.password);

  // ── OTP Timer Logic ────────────────────────────────────────────────────
  const startEmailOtpTimer = useCallback(() => {
    if (emailOtpIntervalRef.current) clearInterval(emailOtpIntervalRef.current);
    setEmailOtpTimer(60);
    emailOtpIntervalRef.current = setInterval(() => {
      setEmailOtpTimer((prev) => {
        if (prev <= 1) {
          if (emailOtpIntervalRef.current) clearInterval(emailOtpIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const startMobileOtpTimer = useCallback(() => {
    if (mobileOtpIntervalRef.current) clearInterval(mobileOtpIntervalRef.current);
    setMobileOtpTimer(60);
    mobileOtpIntervalRef.current = setInterval(() => {
      setMobileOtpTimer((prev) => {
        if (prev <= 1) {
          if (mobileOtpIntervalRef.current) clearInterval(mobileOtpIntervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (emailOtpIntervalRef.current) clearInterval(emailOtpIntervalRef.current);
      if (mobileOtpIntervalRef.current) clearInterval(mobileOtpIntervalRef.current);
    };
  }, []);

  // ── Email Availability Check ───────────────────────────────────────────
  const checkEmailAvailability = useCallback(async (email: string) => {
    if (!validateEmail(email).valid) return;
    setIsCheckingEmail(true);
    setEmailAvailable(null);
    try {
      const res = await fetch('/api/auth?action=check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setEmailAvailable(data.data.available);
        if (!data.data.available) {
          setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
        } else {
          setFieldErrors((prev) => ({ ...prev, email: '' }));
        }
      }
    } catch {
      // Silently fail availability check
    } finally {
      setIsCheckingEmail(false);
    }
  }, []);

  // ── Send Email OTP ─────────────────────────────────────────────────────
  const handleSendEmailOtp = useCallback(async () => {
    const emailVal = student.email.trim();
    const emailValidation = validateEmail(emailVal);
    if (!emailValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, email: emailValidation.error! }));
      return;
    }
    if (emailAvailable === false) {
      setFieldErrors((prev) => ({ ...prev, email: 'This email is already registered.' }));
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await fetch('/api/auth?action=send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to send OTP.');
        return;
      }
      setIsEmailOtpSent(true);
      startEmailOtpTimer();
      toast.success('Verification code sent to your email.');
      // Auto-fill dev OTP
      if (data._devOtp) {
        setEmailOtp(data._devOtp);
      }
    } catch {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingEmailOtp(false);
    }
  }, [student.email, emailAvailable, startEmailOtpTimer]);

  // ── Verify Email OTP ──────────────────────────────────────────────────
  const handleVerifyEmailOtp = useCallback(async () => {
    if (emailOtp.length < 6) {
      toast.error('Please enter the complete 6-digit code.');
      return;
    }
    setIsVerifyingEmailOtp(true);
    try {
      const res = await fetch('/api/auth?action=verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: student.email.trim(), otpCode: emailOtp }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Invalid verification code.');
        return;
      }
      setIsEmailOtpVerified(true);
      if (emailOtpIntervalRef.current) clearInterval(emailOtpIntervalRef.current);
      toast.success('Email verified successfully!');
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  }, [emailOtp, student.email]);

  // ── Send Mobile OTP ────────────────────────────────────────────────────
  const handleSendMobileOtp = useCallback(async () => {
    const phoneVal = student.phone.trim();
    const phoneValidation = validatePhone(phoneVal);
    if (!phoneValidation.valid) {
      setFieldErrors((prev) => ({ ...prev, phone: phoneValidation.error! }));
      return;
    }

    setIsSendingMobileOtp(true);
    try {
      const phoneForApi = '+91' + getPhoneDigits(phoneVal);
      const res = await fetch('/api/auth?action=send-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneForApi }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to send OTP.');
        return;
      }
      setIsMobileOtpSent(true);
      startMobileOtpTimer();
      toast.success('Verification code sent to your mobile.');
      // Auto-fill dev OTP
      if (data._devOtp) {
        setMobileOtp(data._devOtp);
      }
    } catch {
      toast.error('Failed to send OTP. Please try again.');
    } finally {
      setIsSendingMobileOtp(false);
    }
  }, [student.phone, startMobileOtpTimer]);

  // ── Verify Mobile OTP ─────────────────────────────────────────────────
  const handleVerifyMobileOtp = useCallback(async () => {
    if (mobileOtp.length < 6) {
      toast.error('Please enter the complete 6-digit code.');
      return;
    }
    setIsVerifyingMobileOtp(true);
    try {
      const phoneForApi = '+91' + getPhoneDigits(student.phone);
      const res = await fetch('/api/auth?action=verify-mobile-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneForApi, otpCode: mobileOtp }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Invalid verification code.');
        return;
      }
      setIsMobileOtpVerified(true);
      if (mobileOtpIntervalRef.current) clearInterval(mobileOtpIntervalRef.current);
      toast.success('Mobile number verified successfully!');
    } catch {
      toast.error('Verification failed. Please try again.');
    } finally {
      setIsVerifyingMobileOtp(false);
    }
  }, [mobileOtp, student.phone]);

  // ── Step Validation ────────────────────────────────────────────────────
  const validateStep1 = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    // Name
    const nameResult = validateName(student.name);
    if (!nameResult.valid) {
      errors.name = nameResult.error!;
    } else if (nameResult.cleaned && nameResult.cleaned !== student.name) {
      setStudent((prev) => ({ ...prev, name: nameResult.cleaned! }));
    }

    // DOB
    const dobResult = validateDOB(student.dateOfBirth);
    if (!dobResult.valid) errors.dateOfBirth = dobResult.error!;

    // Gender
    if (!student.gender) errors.gender = 'Please select your gender.';

    // Email
    const emailResult = validateEmail(student.email);
    if (!emailResult.valid) errors.email = emailResult.error!;

    // Phone
    const phoneResult = validatePhone(student.phone);
    if (!phoneResult.valid) errors.phone = phoneResult.error!;

    // OTP verification checks
    if (!isEmailOtpVerified) errors.emailOtp = 'Please verify your email address.';
    if (!isMobileOtpVerified) errors.mobileOtp = 'Please verify your mobile number.';

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [student, isEmailOtpVerified, isMobileOtpVerified]);

  const validateStep2 = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!student.schoolName.trim()) errors.schoolName = 'School name is required.';
    if (!student.board) errors.board = 'Please select a board.';
    if (!student.classGrade) errors.classGrade = 'Please select your class.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [student]);

  const validateStep3 = useCallback((): boolean => {
    const errors: Record<string, string> = {};
    if (!student.password) {
      errors.password = 'Password is required.';
    } else if (pwStrength.score < 5) {
      errors.password = 'Please meet all password requirements.';
    }
    if (!student.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (student.password !== student.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [student, pwStrength]);

  // ── Navigation ─────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (step === 1 && validateStep1()) {
      setCompletedSteps((prev) => new Set([...prev, 1]));
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setCompletedSteps((prev) => new Set([...prev, 2]));
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      setCompletedSteps((prev) => new Set([...prev, 3]));
      setStep(4);
    }
  }, [step, validateStep1, validateStep2, validateStep3]);

  const goBack = useCallback(() => {
    setFieldErrors({});
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else if (step === 4) setStep(3);
  }, [step]);

  // ── Final Submit ───────────────────────────────────────────────────────
  const handleFinalSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const phoneDigits = getPhoneDigits(student.phone);
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName(student.name),
          email: student.email.trim(),
          password: student.password,
          phone: '+91' + phoneDigits,
          role: 'STUDENT',
          dateOfBirth: student.dateOfBirth,
          gender: student.gender,
          schoolName: student.schoolName.trim(),
          board: student.board,
          classGrade: student.classGrade,
          section: student.section || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || data.message || 'Registration failed.');
        return;
      }

      // Try auto-login
      try {
        const loginRes = await fetch('/api/auth?action=login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: student.email.trim(), password: student.password }),
        });
        const loginData = await loginRes.json();
        if (loginData.success && loginData.data) {
          const user: UserSession = loginData.data;
          login(user);
          toast.success(`Welcome, ${user.name ?? 'Student'}!`);
          navigate('student-dashboard');
          return;
        }
      } catch {
        // Auto-login failed, show success screen
      }

      setShowSuccess(true);
      toast.success('Student account created successfully!');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [student, login, navigate]);

  // ── Teacher form state ─────────────────────────────────────────────────
  const [teacher, setTeacher] = useState<TeacherForm>({
    name: '', email: '', password: '', confirmPassword: '', phone: '',
    schoolName: '', designation: '',
  });
  const [showTeacherPw, setShowTeacherPw] = useState(false);
  const [isTeacherLoading, setIsTeacherLoading] = useState(false);

  const handleTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher.name.trim()) { toast.error('Please enter your full name.'); return; }
    if (!teacher.email.trim()) { toast.error('Please enter your email.'); return; }
    if (teacher.password !== teacher.confirmPassword) { toast.error('Passwords do not match.'); return; }
    if (teacher.password.length < 8) { toast.error('Password must be at least 8 characters.'); return; }
    if (!teacher.schoolName.trim()) { toast.error('Please enter your school name.'); return; }

    setIsTeacherLoading(true);
    try {
      const res = await fetch('/api/auth?action=register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teacher.name, email: teacher.email, password: teacher.password,
          phone: teacher.phone || undefined, schoolName: teacher.schoolName,
          designation: teacher.designation || undefined, role: 'TEACHER',
        }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || data.message || 'Registration failed.'); return; }
      setShowSuccess(true);
      toast.success('Teacher account created successfully!');
    } catch { toast.error('Something went wrong. Please try again.'); }
    finally { setIsTeacherLoading(false); }
  };

  // ── Reset student form when tab changes ────────────────────────────────
  useEffect(() => {
    if (activeTab === 'student') {
      setStep(1);
      setCompletedSteps(new Set());
      setFieldErrors({});
    }
  }, [activeTab]);

  // ── Success Screen ─────────────────────────────────────────────────────
  if (showSuccess) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full max-w-md px-4">
        <Card className="border-border/60 shadow-xl shadow-slate-200/40">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="size-8 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Account Created!</h2>
              <p className="mt-1 text-sm text-slate-500">Your account has been registered successfully. You can now sign in.</p>
            </div>
            <Button onClick={() => navigate('login')} className="mt-2 bg-emerald-600 text-white hover:bg-emerald-700">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const inputCls = 'h-10 border-border/80 bg-background';

  // ── DOB Calculation ────────────────────────────────────────────────────
  const dobDate = student.dateOfBirth ? new Date(student.dateOfBirth) : undefined;
  const dobDisplay = dobDate && isValid(dobDate) ? format(dobDate, 'PPP') : '';
  const minDOB = new Date();
  minDOB.setFullYear(minDOB.getFullYear() - 25);
  const maxDOB = new Date();
  maxDOB.setFullYear(maxDOB.getFullYear() - 5);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-lg px-4"
    >
      <Card className="border-border/60 shadow-xl shadow-slate-200/40">
        <CardHeader className="space-y-3 pb-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-200">
            <PenTool className="size-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold tracking-tight text-slate-900">Create an Account</CardTitle>
            <CardDescription className="mt-1 text-slate-500">Join NexusBoard to participate in competitions</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <button onClick={() => navigate('login')} className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors">
            <ArrowLeft className="size-3.5" /> Back to login
          </button>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'student' | 'teacher')}>
            <TabsList className="mb-4 grid w-full grid-cols-2">
              <TabsTrigger value="student" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <GraduationCap className="size-3.5" /> Student
              </TabsTrigger>
              <TabsTrigger value="teacher" className="gap-1.5 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                <BookOpen className="size-3.5" /> Teacher
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════ STUDENT TAB ═══════════════════════ */}
            <TabsContent value="student">
              <StepIndicator step={step} completedSteps={completedSteps} />

              <AnimatePresence mode="wait">
                {/* ─── STEP 1: Personal Information ─── */}
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 max-h-[58vh] overflow-y-auto pr-1 pb-1"
                  >
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="size-3.5" /> Personal Information
                    </p>

                    {/* Full Name */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-name" className="text-sm font-medium text-slate-700">Full Name *</Label>
                      <Input
                        id="s-name"
                        placeholder="e.g. Aarav Sharma"
                        value={student.name}
                        onChange={(e) => {
                          setStudent({ ...student, name: e.target.value });
                          if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        onBlur={() => {
                          const cleaned = cleanName(student.name);
                          if (cleaned !== student.name) setStudent((prev) => ({ ...prev, name: cleaned }));
                          const result = validateName(student.name);
                          if (!result.valid && student.name) setFieldErrors((prev) => ({ ...prev, name: result.error! }));
                        }}
                        className={`${inputCls} ${fieldErrors.name ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
                      />
                      {fieldErrors.name && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.name}</p>}
                    </div>

                    {/* DOB + Gender row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-sm font-medium text-slate-700">Date of Birth *</Label>
                        <Popover open={dobOpen} onOpenChange={setDobOpen}>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={`h-10 justify-start text-left font-normal border-border/80 ${!student.dateOfBirth ? 'text-muted-foreground' : ''} ${fieldErrors.dateOfBirth ? 'border-red-400' : ''}`}
                            >
                              <CalendarIcon className="mr-2 size-4 opacity-50" />
                              {dobDisplay || 'Pick a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dobDate}
                              onSelect={(date) => {
                                if (date) {
                                  const yyyy = date.getFullYear();
                                  const mm = String(date.getMonth() + 1).padStart(2, '0');
                                  const dd = String(date.getDate()).padStart(2, '0');
                                  const val = `${yyyy}-${mm}-${dd}`;
                                  setStudent({ ...student, dateOfBirth: val });
                                  if (fieldErrors.dateOfBirth) setFieldErrors((prev) => ({ ...prev, dateOfBirth: '' }));
                                }
                                setDobOpen(false);
                              }}
                              disabled={(date) => date > maxDOB || date < minDOB}
                              defaultMonth={maxDOB}
                              captionLayout="dropdown"
                              fromYear={new Date().getFullYear() - 25}
                              toYear={new Date().getFullYear() - 5}
                            />
                          </PopoverContent>
                        </Popover>
                        {fieldErrors.dateOfBirth && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.dateOfBirth}</p>}
                      </div>

                      <div className="grid gap-1.5">
                        <Label className="text-sm font-medium text-slate-700">Gender *</Label>
                        <Select
                          value={student.gender}
                          onValueChange={(v) => {
                            setStudent({ ...student, gender: v });
                            if (fieldErrors.gender) setFieldErrors((prev) => ({ ...prev, gender: '' }));
                          }}
                        >
                          <SelectTrigger className={`${inputCls} ${fieldErrors.gender ? 'border-red-400' : ''}`}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {fieldErrors.gender && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.gender}</p>}
                      </div>
                    </div>

                    {/* Email */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-email" className="text-sm font-medium text-slate-700">Email Address *</Label>
                      <div className="relative">
                        <Input
                          id="s-email"
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          value={student.email}
                          onChange={(e) => {
                            setStudent({ ...student, email: e.target.value });
                            setEmailAvailable(null);
                            setIsEmailOtpSent(false);
                            setIsEmailOtpVerified(false);
                            setEmailOtp('');
                            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: '' }));
                          }}
                          onBlur={() => {
                            if (validateEmail(student.email).valid) {
                              checkEmailAvailability(student.email);
                            }
                          }}
                          disabled={isEmailOtpVerified}
                          className={`${inputCls} pr-20 ${fieldErrors.email ? 'border-red-400 focus-visible:ring-red-400/30' : ''} ${isEmailOtpVerified ? 'bg-emerald-50/50 border-emerald-300' : ''}`}
                        />
                        {isCheckingEmail && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 className="size-4 animate-spin text-slate-400" /></span>
                        )}
                        {!isCheckingEmail && emailAvailable === true && !isEmailOtpVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 text-xs font-medium">Available</span>
                        )}
                        {isEmailOtpVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="size-3.5" /> Verified
                          </span>
                        )}
                      </div>
                      {fieldErrors.email && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.email}</p>}
                    </div>

                    {/* Email OTP */}
                    {validateEmail(student.email).valid && emailAvailable !== false && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <OtpSection
                          label="Email Verification"
                          icon={<Mail className="size-4 text-emerald-600" />}
                          otpValue={emailOtp}
                          setOtpValue={setEmailOtp}
                          isOtpSent={isEmailOtpSent}
                          isOtpVerified={isEmailOtpVerified}
                          isSending={isSendingEmailOtp}
                          isVerifying={isVerifyingEmailOtp}
                          timer={emailOtpTimer}
                          onSend={handleSendEmailOtp}
                          onVerify={handleVerifyEmailOtp}
                          onResend={handleSendEmailOtp}
                          disabled={isEmailOtpVerified}
                        />
                      </div>
                    )}
                    {fieldErrors.emailOtp && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.emailOtp}</p>}

                    {/* Mobile Number */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-phone" className="text-sm font-medium text-slate-700">Mobile Number *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-medium">+91</span>
                        <Input
                          id="s-phone"
                          type="tel"
                          placeholder="9876543210"
                          value={student.phone}
                          onChange={(e) => {
                            // Allow only digits and limit to 10 digits
                            const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                            setStudent({ ...student, phone: val });
                            if (val !== student.phone) {
                              setIsMobileOtpSent(false);
                              setIsMobileOtpVerified(false);
                              setMobileOtp('');
                            }
                            if (fieldErrors.phone) setFieldErrors((prev) => ({ ...prev, phone: '' }));
                          }}
                          disabled={isMobileOtpVerified}
                          className={`${inputCls} pl-12 ${fieldErrors.phone ? 'border-red-400 focus-visible:ring-red-400/30' : ''} ${isMobileOtpVerified ? 'bg-emerald-50/50 border-emerald-300' : ''}`}
                        />
                        {isMobileOtpVerified && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-emerald-600 text-xs font-medium">
                            <CheckCircle2 className="size-3.5" /> Verified
                          </span>
                        )}
                      </div>
                      {fieldErrors.phone && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.phone}</p>}
                    </div>

                    {/* Mobile OTP */}
                    {validatePhone(student.phone).valid && (
                      <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
                        <OtpSection
                          label="Mobile Verification"
                          icon={<Phone className="size-4 text-emerald-600" />}
                          otpValue={mobileOtp}
                          setOtpValue={setMobileOtp}
                          isOtpSent={isMobileOtpSent}
                          isOtpVerified={isMobileOtpVerified}
                          isSending={isSendingMobileOtp}
                          isVerifying={isVerifyingMobileOtp}
                          timer={mobileOtpTimer}
                          onSend={handleSendMobileOtp}
                          onVerify={handleVerifyMobileOtp}
                          onResend={handleSendMobileOtp}
                          disabled={isMobileOtpVerified}
                        />
                      </div>
                    )}
                    {fieldErrors.mobileOtp && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.mobileOtp}</p>}

                    {/* Next button */}
                    <Button
                      type="button"
                      onClick={goNext}
                      className="w-full h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Continue <ChevronRight className="ml-1.5 size-4" />
                    </Button>
                  </motion.div>
                )}

                {/* ─── STEP 2: Academic Information ─── */}
                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <School className="size-3.5" /> Academic Information
                    </p>

                    {/* School Name */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-school" className="text-sm font-medium text-slate-700">School Name *</Label>
                      <Input
                        id="s-school"
                        placeholder="e.g. Delhi Public School"
                        value={student.schoolName}
                        onChange={(e) => {
                          setStudent({ ...student, schoolName: e.target.value });
                          if (fieldErrors.schoolName) setFieldErrors((prev) => ({ ...prev, schoolName: '' }));
                        }}
                        className={`${inputCls} ${fieldErrors.schoolName ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
                      />
                      {fieldErrors.schoolName && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.schoolName}</p>}
                    </div>

                    {/* Board */}
                    <div className="grid gap-1.5">
                      <Label className="text-sm font-medium text-slate-700">Board *</Label>
                      <Select
                        value={student.board}
                        onValueChange={(v) => {
                          setStudent({ ...student, board: v });
                          if (fieldErrors.board) setFieldErrors((prev) => ({ ...prev, board: '' }));
                        }}
                      >
                        <SelectTrigger className={`${inputCls} ${fieldErrors.board ? 'border-red-400' : ''}`}>
                          <SelectValue placeholder="Select Board" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CBSE">CBSE</SelectItem>
                          <SelectItem value="ICSE">ICSE</SelectItem>
                          <SelectItem value="State Board">State Board</SelectItem>
                          <SelectItem value="IB">IB</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldErrors.board && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.board}</p>}
                    </div>

                    {/* Class + Section row */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-1.5">
                        <Label className="text-sm font-medium text-slate-700">Class/Grade *</Label>
                        <Select
                          value={student.classGrade}
                          onValueChange={(v) => {
                            setStudent({ ...student, classGrade: v });
                            if (fieldErrors.classGrade) setFieldErrors((prev) => ({ ...prev, classGrade: '' }));
                          }}
                        >
                          <SelectTrigger className={`${inputCls} ${fieldErrors.classGrade ? 'border-red-400' : ''}`}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                              <SelectItem key={n} value={String(n)}>Class {n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldErrors.classGrade && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.classGrade}</p>}
                      </div>

                      <div className="grid gap-1.5">
                        <Label htmlFor="s-section" className="text-sm font-medium text-slate-700">Section</Label>
                        <Select
                          value={student.section}
                          onValueChange={(v) => setStudent({ ...student, section: v })}
                        >
                          <SelectTrigger className={inputCls}>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {['A', 'B', 'C', 'D', 'E', 'F'].map((s) => (
                              <SelectItem key={s} value={s}>Section {s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="flex-1 h-10"
                      >
                        <ChevronLeft className="mr-1.5 size-4" /> Back
                      </Button>
                      <Button
                        type="button"
                        onClick={goNext}
                        className="flex-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Continue <ChevronRight className="ml-1.5 size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 3: Set Password ─── */}
                {step === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4"
                  >
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Lock className="size-3.5" /> Set Password
                    </p>

                    {/* Password */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-pw" className="text-sm font-medium text-slate-700">Password *</Label>
                      <div className="relative">
                        <Input
                          id="s-pw"
                          type={showPw ? 'text' : 'password'}
                          placeholder="Create a strong password"
                          value={student.password}
                          onChange={(e) => {
                            setStudent({ ...student, password: e.target.value });
                            if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: '' }));
                          }}
                          className={`${inputCls} pr-10 ${fieldErrors.password ? 'border-red-400 focus-visible:ring-red-400/30' : ''}`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(!showPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Password Strength Meter */}
                    {student.password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Password Strength</span>
                          <span className={`text-xs font-bold ${
                            pwStrength.score <= 1 ? 'text-red-500' :
                            pwStrength.score === 2 ? 'text-orange-500' :
                            pwStrength.score === 3 ? 'text-orange-400' :
                            pwStrength.score === 4 ? 'text-yellow-600' :
                            'text-emerald-600'
                          }`}>
                            {pwStrength.label}
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= pwStrength.score ? pwStrength.color : 'bg-slate-200'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          {[
                            { key: 'minLength', label: 'At least 8 characters' },
                            { key: 'uppercase', label: 'One uppercase letter' },
                            { key: 'lowercase', label: 'One lowercase letter' },
                            { key: 'digit', label: 'One number' },
                            { key: 'special', label: 'One special character' },
                          ].map((req) => (
                            <div
                              key={req.key}
                              className={`flex items-center gap-1.5 text-xs ${
                                pwStrength.checks[req.key as keyof typeof pwStrength.checks]
                                  ? 'text-emerald-600'
                                  : 'text-slate-400'
                              }`}
                            >
                              {pwStrength.checks[req.key as keyof typeof pwStrength.checks] ? (
                                <Check className="size-3.5" />
                              ) : (
                                <XCircle className="size-3.5" />
                              )}
                              {req.label}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {fieldErrors.password && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.password}</p>}

                    {/* Confirm Password */}
                    <div className="grid gap-1.5">
                      <Label htmlFor="s-cpw" className="text-sm font-medium text-slate-700">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="s-cpw"
                          type={showConfirmPw ? 'text' : 'password'}
                          placeholder="Re-enter your password"
                          value={student.confirmPassword}
                          onChange={(e) => {
                            setStudent({ ...student, confirmPassword: e.target.value });
                            if (fieldErrors.confirmPassword) setFieldErrors((prev) => ({ ...prev, confirmPassword: '' }));
                          }}
                          className={`${inputCls} pr-10 ${fieldErrors.confirmPassword ? 'border-red-400 focus-visible:ring-red-400/30' : ''} ${
                            student.confirmPassword && student.password === student.confirmPassword ? 'border-emerald-300' : ''
                          }`}
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPw(!showConfirmPw)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          tabIndex={-1}
                        >
                          {showConfirmPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {student.confirmPassword && student.password === student.confirmPassword && (
                        <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle2 className="size-3" /> Passwords match</p>
                      )}
                      {fieldErrors.confirmPassword && <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="size-3" />{fieldErrors.confirmPassword}</p>}
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="flex-1 h-10"
                      >
                        <ChevronLeft className="mr-1.5 size-4" /> Back
                      </Button>
                      <Button
                        type="button"
                        onClick={goNext}
                        className="flex-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        Continue <ChevronRight className="ml-1.5 size-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 4: Review & Submit ─── */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -40 }}
                    transition={{ duration: 0.25 }}
                    className="space-y-4 max-h-[58vh] overflow-y-auto pr-1 pb-1"
                  >
                    <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                      <Shield className="size-3.5" /> Review & Submit
                    </p>

                    {/* Personal Info Review */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Personal Information</p>
                      <ReviewRow label="Full Name" value={cleanName(student.name)} />
                      <ReviewRow label="Date of Birth" value={student.dateOfBirth ? format(new Date(student.dateOfBirth), 'PPP') : '—'} />
                      <ReviewRow label="Gender" value={student.gender || '—'} />
                      <ReviewRow label="Email" value={student.email} icon={<CheckCircle2 className="size-3 text-emerald-500" />} />
                      <ReviewRow label="Mobile" value={'+91 ' + getPhoneDigits(student.phone)} icon={<CheckCircle2 className="size-3 text-emerald-500" />} />
                    </div>

                    {/* Academic Info Review */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Academic Information</p>
                      <ReviewRow label="School" value={student.schoolName} />
                      <ReviewRow label="Board" value={student.board} />
                      <ReviewRow label="Class" value={`Class ${student.classGrade}`} />
                      <ReviewRow label="Section" value={student.section ? `Section ${student.section}` : '—'} />
                    </div>

                    {/* Password Review */}
                    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Account Security</p>
                      <ReviewRow label="Password" value="••••••••" icon={<CheckCircle2 className="size-3 text-emerald-500" />} />
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goBack}
                        className="flex-1 h-10"
                        disabled={isSubmitting}
                      >
                        <ChevronLeft className="mr-1.5 size-4" /> Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleFinalSubmit}
                        disabled={isSubmitting}
                        className="flex-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        {isSubmitting ? (
                          <><Loader2 className="mr-2 size-4 animate-spin" /> Creating Account...</>
                        ) : (
                          <><CheckCircle2 className="mr-1.5 size-4" /> Create Account</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </TabsContent>

            {/* ═══════════════════════ TEACHER TAB ═══════════════════════ */}
            <TabsContent value="teacher">
              <form onSubmit={handleTeacherSubmit} className="grid gap-3.5 max-h-[60vh] overflow-y-auto pr-1">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Personal Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-name" className="text-sm font-medium text-slate-700">Full Name *</Label>
                    <Input id="t-name" placeholder="Dr. Jane Smith" value={teacher.name} onChange={(e) => setTeacher({ ...teacher, name: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                    <Input id="t-phone" type="tel" placeholder="+91 98765 43210" value={teacher.phone} onChange={(e) => setTeacher({ ...teacher, phone: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-school" className="text-sm font-medium text-slate-700">School Name *</Label>
                    <Input id="t-school" placeholder="Springfield High School" value={teacher.schoolName} onChange={(e) => setTeacher({ ...teacher, schoolName: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-desig" className="text-sm font-medium text-slate-700">Designation</Label>
                    <Input id="t-desig" placeholder="English Teacher" value={teacher.designation} onChange={(e) => setTeacher({ ...teacher, designation: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                  </div>
                </div>

                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider pt-1">Account Credentials</p>
                <div className="grid gap-1.5">
                  <Label htmlFor="t-email" className="text-sm font-medium text-slate-700">Email address *</Label>
                  <Input id="t-email" type="email" placeholder="you@school.edu" autoComplete="email" value={teacher.email} onChange={(e) => setTeacher({ ...teacher, email: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-pw" className="text-sm font-medium text-slate-700">Password *</Label>
                    <div className="relative">
                      <Input id="t-pw" type={showTeacherPw ? 'text' : 'password'} placeholder="Min 8 chars" value={teacher.password} onChange={(e) => setTeacher({ ...teacher, password: e.target.value })} disabled={isTeacherLoading} className={`${inputCls} pr-10`} />
                      <button type="button" onClick={() => setShowTeacherPw(!showTeacherPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                        {showTeacherPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="t-cpw" className="text-sm font-medium text-slate-700">Confirm Password *</Label>
                    <Input id="t-cpw" type="password" placeholder="Re-enter" value={teacher.confirmPassword} onChange={(e) => setTeacher({ ...teacher, confirmPassword: e.target.value })} disabled={isTeacherLoading} className={inputCls} />
                  </div>
                </div>
                <Button type="submit" disabled={isTeacherLoading} className="mt-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700">
                  {isTeacherLoading ? (<><Loader2 className="mr-2 size-4 animate-spin" /> Creating Account...</>) : 'Create Teacher Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Review Row Helper ──────────────────────────────────────────────────────
function ReviewRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-medium text-slate-800 truncate">{value}</span>
        {icon}
      </div>
    </div>
  );
}
