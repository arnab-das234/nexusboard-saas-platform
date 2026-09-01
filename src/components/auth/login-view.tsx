'use client';

import React, { useState } from 'react';
import { PenTool, Loader2, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

import { useAuthStore, useNavStore } from '@/lib/store';
import type { UserSession, NavView } from '@/lib/types';

export function LoginView() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const login = useAuthStore((s) => s.login);
  const navigate = useNavStore((s) => s.navigate);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      toast.error('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || data.message || 'Login failed. Please try again.');
        return;
      }

      const user: UserSession = data.data;
      login(user);
      toast.success(`Welcome back, ${user.name ?? 'User'}!`);

      // Navigate to the appropriate dashboard
      const role = user.roles[0];
      switch (role) {
        case 'SUPER_ADMIN':
        case 'ADMIN':
          navigate('admin-dashboard');
          break;
        case 'STUDENT':
          navigate('student-dashboard');
          break;
        case 'TEACHER':
          navigate('teacher-dashboard');
          break;
        case 'EXAMINER':
          navigate('examiner-dashboard');
          break;
      }
    } catch (err) {
      toast.error('Something went wrong. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              Welcome to EssayCompass
            </CardTitle>
            <CardDescription className="mt-1 text-slate-500">
              Sign in to manage essay competitions
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            {/* Email */}
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="h-10 border-border/80 bg-background"
              />
            </div>

            {/* Password */}
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => navigate('forgot-password')}
                  className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="h-10 pr-10 border-border/80 bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={isLoading}
              className="mt-1 h-10 bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-600/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <Separator />
            <div className="mt-4 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-slate-500">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => navigate('register')}
                  className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Register as Student
                </button>
              </p>
              <p className="text-sm text-slate-500">
                Are you a teacher?{' '}
                <button
                  onClick={() => navigate('register-teacher')}
                  className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Register as Teacher
                </button>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
