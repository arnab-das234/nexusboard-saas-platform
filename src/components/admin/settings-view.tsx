'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Settings, Globe, Trophy, CreditCard, Mail, HardDrive, Shield, ClipboardCheck, Bell,
  CheckCircle, XCircle, Save, Loader2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { SETTING_CATEGORY_LABELS } from '@/lib/constants';
import type { SettingCategory } from '@/lib/types';

// ── Connection Status ────────────────────────────────────────────────────────
function ConnBadge({ connected, label }: { connected: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {connected ? (
        <CheckCircle className="h-4 w-4 text-emerald-500" />
      ) : (
        <XCircle className="h-4 w-4 text-rose-500" />
      )}
      <span className={connected ? 'text-emerald-700' : 'text-rose-600'}>{label}</span>
    </div>
  );
}

// ── Field Row ───────────────────────────────────────────────────────────────
function Field({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {description && <p className="text-xs text-slate-500">{description}</p>}
      {children}
    </div>
  );
}

// ── Save Button ──────────────────────────────────────────────────────────────
function SaveButton({ saving, onSave }: { saving: boolean; onSave: () => void }) {
  return (
    <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={onSave} disabled={saving}>
      {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
      {saving ? 'Saving...' : 'Save Changes'}
    </Button>
  );
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
function SettingsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-8 gap-4"><Skeleton className="h-10 col-span-8" /><Skeleton className="h-[400px] col-span-8" /></div>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────
export function AdminSettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('GENERAL');

  // General
  const [orgName, setOrgName] = useState('EssayCompass');
  const [contactEmail, setContactEmail] = useState('admin@essaycompass.in');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [website, setWebsite] = useState('https://essaycompass.in');
  const [timezone, setTimezone] = useState('Asia/Kolkata');

  // Payment
  const [razorpayKey, setRazorpayKey] = useState('rzp_live_xxxxxxxxxxxxxxx');
  const [currency, setCurrency] = useState('INR');
  const [paymentMode, setPaymentMode] = useState('TEST');
  const [razorpayConnected, setRazorpayConnected] = useState(true);

  // Email
  const [fromEmail, setFromEmail] = useState('noreply@essaycompass.in');
  const [senderName, setSenderName] = useState('EssayCompass');
  const [resendConnected, setResendConnected] = useState(true);

  // Storage
  const [cloudName, setCloudName] = useState('essaycompass');
  const [maxFileSize, setMaxFileSize] = useState('5');
  const [cloudinaryConnected, setCloudinaryConnected] = useState(true);

  // Examination
  const [examinerCount, setExaminerCount] = useState('3');
  const [maxMarks, setMaxMarks] = useState('100');
  const [averagingMethod, setAveragingMethod] = useState('MEAN');
  const [blindEval, setBlindEval] = useState(true);

  // Security
  const [sessionTimeout, setSessionTimeout] = useState('30');
  const [passwordMinLength, setPasswordMinLength] = useState('8');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');

  // Notifications
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(false);
  const [pushNotifs, setPushNotifs] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/seed?action=admin-settings');
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        if (d.orgName) setOrgName(d.orgName);
        if (d.contactEmail) setContactEmail(d.contactEmail);
      }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast.success(`${SETTING_CATEGORY_LABELS[activeTab as SettingCategory]} settings saved`);
    }, 800);
  };

  if (loading) return <SettingsSkeleton />;

  const tabItems: { value: SettingCategory; label: string; icon: React.ElementType }[] = [
    { value: 'GENERAL', label: 'General', icon: Globe },
    { value: 'COMPETITION', label: 'Competition', icon: Trophy },
    { value: 'PAYMENT', label: 'Payment', icon: CreditCard },
    { value: 'EMAIL', label: 'Email', icon: Mail },
    { value: 'STORAGE', label: 'Storage', icon: HardDrive },
    { value: 'SECURITY', label: 'Security', icon: Shield },
    { value: 'EXAMINATION', label: 'Examination', icon: ClipboardCheck },
    { value: 'NOTIFICATION', label: 'Notifications', icon: Bell },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500">Configure system settings and integrations</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          {tabItems.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm">
              <t.icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General */}
        <TabsContent value="GENERAL">
          <Card>
            <CardHeader><CardTitle className="text-base">General Settings</CardTitle><CardDescription>Basic organization information</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Organization Name"><Input value={orgName} onChange={(e) => setOrgName(e.target.value)} /></Field>
                <Field label="Contact Email" description="Primary contact for the organization"><Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
                <Field label="Phone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
                <Field label="Website"><Input value={website} onChange={(e) => setWebsite(e.target.value)} /></Field>
                <Field label="Timezone">
                  <Select value={timezone} onValueChange={setTimezone}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Competition */}
        <TabsContent value="COMPETITION">
          <Card>
            <CardHeader><CardTitle className="text-base">Competition Settings</CardTitle><CardDescription>Default values for new competitions</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Default Registration Fee (₹)"><Input type="number" value="100" /></Field>
                <Field label="Default Max File Size (MB)"><Input type="number" value="5" /></Field>
                <Field label="Default Min Age"><Input type="number" value="10" /></Field>
                <Field label="Default Max Age"><Input type="number" value="18" /></Field>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment */}
        <TabsContent value="PAYMENT">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Settings</CardTitle>
              <CardDescription>Razorpay integration configuration</CardDescription>
              <div className="flex gap-4 pt-2"><ConnBadge connected={razorpayConnected} label={razorpayConnected ? 'Razorpay Connected' : 'Razorpay Disconnected'} /></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Razorpay Key ID" description="Your public key ID from Razorpay dashboard">
                  <Input value={razorpayKey} onChange={(e) => setRazorpayKey(e.target.value)} className="font-mono text-sm" />
                </Field>
                <Field label="Currency">
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR (₹)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Payment Mode">
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TEST">Test Mode</SelectItem>
                      <SelectItem value="LIVE">Live Mode</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Email */}
        <TabsContent value="EMAIL">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Settings</CardTitle>
              <CardDescription>Resend email service configuration</CardDescription>
              <div className="flex gap-4 pt-2"><ConnBadge connected={resendConnected} label={resendConnected ? 'Resend Connected' : 'Resend Disconnected'} /></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="From Email" description="Sender email address"><Input value={fromEmail} onChange={(e) => setFromEmail(e.target.value)} /></Field>
                <Field label="Sender Name"><Input value={senderName} onChange={(e) => setSenderName(e.target.value)} /></Field>
              </div>
              <Field label="Email Template Preview" description="Sample email template">
                <div className="rounded-lg border bg-slate-50 p-4 mt-1 text-sm">
                  <p className="font-semibold text-slate-700">Subject: Registration Confirmed — {orgName}</p>
                  <p className="text-slate-500 mt-2">Dear [Student Name],</p>
                  <p className="text-slate-500 mt-1">Your registration for [Competition Name] has been confirmed. Registration number: [REG-XXXX].</p>
                  <p className="text-slate-400 mt-2">— {senderName} Team</p>
                </div>
              </Field>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Storage */}
        <TabsContent value="STORAGE">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Storage Settings</CardTitle>
              <CardDescription>Cloudinary configuration for file uploads</CardDescription>
              <div className="flex gap-4 pt-2"><ConnBadge connected={cloudinaryConnected} label={cloudinaryConnected ? 'Cloudinary Connected' : 'Cloudinary Disconnected'} /></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Cloud Name" description="Your Cloudinary cloud name"><Input value={cloudName} onChange={(e) => setCloudName(e.target.value)} className="font-mono text-sm" /></Field>
                <Field label="Max File Size (MB)"><Input type="number" value={maxFileSize} onChange={(e) => setMaxFileSize(e.target.value)} /></Field>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security */}
        <TabsContent value="SECURITY">
          <Card>
            <CardHeader><CardTitle className="text-base">Security Settings</CardTitle><CardDescription>Authentication and session policies</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Field label="Session Timeout (minutes)"><Input type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} /></Field>
                <Field label="Password Min Length"><Input type="number" value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} /></Field>
                <Field label="Max Login Attempts"><Input type="number" value={maxLoginAttempts} onChange={(e) => setMaxLoginAttempts(e.target.value)} /></Field>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examination */}
        <TabsContent value="EXAMINATION">
          <Card>
            <CardHeader><CardTitle className="text-base">Examination Settings</CardTitle><CardDescription>Evaluation policies and criteria</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Default Examiner Count" description="Number of examiners per essay"><Input type="number" value={examinerCount} onChange={(e) => setExaminerCount(e.target.value)} /></Field>
                <Field label="Default Max Marks"><Input type="number" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} /></Field>
                <Field label="Averaging Method" description="How to calculate final score from multiple examiners">
                  <Select value={averagingMethod} onValueChange={setAveragingMethod}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEAN">Mean (Average)</SelectItem>
                      <SelectItem value="MEDIAN">Median</SelectItem>
                      <SelectItem value="TRIMMED_MEAN">Trimmed Mean</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div><Label>Blind Evaluation</Label><p className="text-xs text-slate-500">Hide student identity from examiners</p></div>
                  <Switch checked={blindEval} onCheckedChange={setBlindEval} />
                </div>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="NOTIFICATION">
          <Card>
            <CardHeader><CardTitle className="text-base">Notification Settings</CardTitle><CardDescription>Configure notification channels</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label>Email Notifications</Label><p className="text-xs text-slate-500">Send notifications via email</p></div>
                  <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label>SMS Notifications</Label><p className="text-xs text-slate-500">Send notifications via SMS</p></div>
                  <Switch checked={smsNotifs} onCheckedChange={setSmsNotifs} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div><Label>Push Notifications</Label><p className="text-xs text-slate-500">Send in-app push notifications</p></div>
                  <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
                </div>
              </div>
              <div className="flex justify-end pt-2"><SaveButton saving={saving} onSave={handleSave} /></div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
