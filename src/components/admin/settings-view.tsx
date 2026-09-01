'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Settings, Globe, Trophy, CreditCard, Mail, HardDrive, Shield,
  ClipboardCheck, Bell, Save, Loader2, AlertCircle, RefreshCw,
  CheckCircle2,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { SETTING_CATEGORY_LABELS } from '@/lib/constants';
import type { SettingCategory } from '@/lib/types';

// ── Types ────────────────────────────────────────────────────────────────────
interface SettingItem {
  id: string;
  key: string;
  value: string;
  category: string;
  type: string;
}

interface SettingDef {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'switch' | 'email';
  placeholder?: string;
  options?: { label: string; value: string }[];
  defaultValue?: string;
}

// ── Settings definitions per category ─────────────────────────────────────────
const SETTINGS_DEFS: Record<SettingCategory, SettingDef[]> = {
  GENERAL: [
    { key: 'org_name', label: 'Organization Name', description: 'Name displayed across the platform', type: 'text', placeholder: 'EssayCompass' },
    { key: 'org_email', label: 'Organization Email', description: 'Primary contact email', type: 'email', placeholder: 'admin@example.com' },
    { key: 'org_phone', label: 'Phone Number', description: 'Primary contact phone', type: 'text', placeholder: '+91 98765 43210' },
    { key: 'org_website', label: 'Website', description: 'Organization website URL', type: 'text', placeholder: 'https://example.com' },
    { key: 'org_address', label: 'Address', description: 'Organization physical address', type: 'textarea', placeholder: '123 Main Street, City, State' },
    { key: 'timezone', label: 'Timezone', description: 'System timezone for scheduling', type: 'select', options: [
      { label: 'Asia/Kolkata (IST +5:30)', value: 'Asia/Kolkata' },
      { label: 'UTC', value: 'UTC' },
      { label: 'America/New_York (EST)', value: 'America/New_York' },
      { label: 'America/Chicago (CST)', value: 'America/Chicago' },
      { label: 'America/Los_Angeles (PST)', value: 'America/Los_Angeles' },
      { label: 'Europe/London (GMT)', value: 'Europe/London' },
    ], defaultValue: 'Asia/Kolkata' },
  ],
  COMPETITION: [
    { key: 'default_fee', label: 'Default Registration Fee', description: 'Default fee for new competitions (in currency units)', type: 'number', placeholder: '100', defaultValue: '100' },
    { key: 'max_essay_size_mb', label: 'Max Essay File Size (MB)', description: 'Maximum allowed essay upload size', type: 'number', placeholder: '5', defaultValue: '5' },
    { key: 'allowed_file_formats', label: 'Allowed File Formats', description: 'Comma-separated MIME types for uploads', type: 'text', placeholder: 'application/pdf', defaultValue: 'application/pdf' },
    { key: 'default_rules', label: 'Default Competition Rules', description: 'Default rules text for new competitions', type: 'textarea', placeholder: '1. Essays must be original work...', defaultValue: '' },
  ],
  PAYMENT: [
    { key: 'currency', label: 'Currency', description: 'Primary payment currency', type: 'select', options: [
      { label: 'INR (Indian Rupee)', value: 'INR' },
      { label: 'USD (US Dollar)', value: 'USD' },
      { label: 'EUR (Euro)', value: 'EUR' },
      { label: 'GBP (British Pound)', value: 'GBP' },
    ], defaultValue: 'INR' },
    { key: 'payment_mode', label: 'Payment Mode', description: 'Test or live payment processing', type: 'select', options: [
      { label: 'Test Mode', value: 'TEST' },
      { label: 'Live Mode', value: 'LIVE' },
    ], defaultValue: 'TEST' },
    { key: 'razorpay_status', label: 'Razorpay Status', description: 'Enable or disable Razorpay integration', type: 'select', options: [
      { label: 'Enabled', value: 'ENABLED' },
      { label: 'Disabled', value: 'DISABLED' },
    ], defaultValue: 'DISABLED' },
  ],
  EMAIL: [
    { key: 'sender_name', label: 'Sender Name', description: 'Display name for outgoing emails', type: 'text', placeholder: 'EssayCompass' },
    { key: 'sender_email', label: 'Sender Email', description: 'Email address for outgoing emails', type: 'email', placeholder: 'noreply@example.com' },
    { key: 'resend_status', label: 'Resend Status', description: 'Enable or disable Resend email service', type: 'select', options: [
      { label: 'Enabled', value: 'ENABLED' },
      { label: 'Disabled', value: 'DISABLED' },
    ], defaultValue: 'DISABLED' },
  ],
  STORAGE: [
    { key: 'cloudinary_status', label: 'Cloudinary Status', description: 'Enable or disable Cloudinary storage', type: 'select', options: [
      { label: 'Enabled', value: 'ENABLED' },
      { label: 'Disabled', value: 'DISABLED' },
    ], defaultValue: 'DISABLED' },
    { key: 'upload_limit_mb', label: 'Upload Limit (MB)', description: 'Global maximum upload file size', type: 'number', placeholder: '10', defaultValue: '10' },
    { key: 'storage_policy', label: 'Storage Policy', description: 'Policy text displayed to users about data storage', type: 'textarea', placeholder: 'Files are stored securely and encrypted at rest...', defaultValue: '' },
  ],
  EXAMINATION: [
    { key: 'default_examiner_count', label: 'Default Examiner Count', description: 'Number of examiners assigned per essay', type: 'number', placeholder: '3', defaultValue: '3' },
    { key: 'default_max_marks', label: 'Default Max Marks', description: 'Maximum marks per essay evaluation', type: 'number', placeholder: '100', defaultValue: '100' },
    { key: 'default_averaging', label: 'Averaging Method', description: 'How to combine scores from multiple examiners', type: 'select', options: [
      { label: 'Mean (Average)', value: 'MEAN' },
      { label: 'Median', value: 'MEDIAN' },
      { label: 'Trimmed Mean', value: 'TRIMMED_MEAN' },
    ], defaultValue: 'MEAN' },
    { key: 'blind_evaluation_default', label: 'Blind Evaluation', description: 'Hide student identity from examiners by default', type: 'switch', defaultValue: 'true' },
  ],
  SECURITY: [
    { key: 'session_timeout', label: 'Session Timeout (minutes)', description: 'Auto-logout after inactivity', type: 'number', placeholder: '30', defaultValue: '30' },
    { key: 'password_min_length', label: 'Password Min Length', description: 'Minimum characters required for passwords', type: 'number', placeholder: '8', defaultValue: '8' },
    { key: 'max_login_attempts', label: 'Max Login Attempts', description: 'Account lockout after failed attempts', type: 'number', placeholder: '5', defaultValue: '5' },
    { key: 'rate_limit_requests', label: 'Rate Limit (requests/min)', description: 'Max API requests per minute per user', type: 'number', placeholder: '60', defaultValue: '60' },
  ],
  NOTIFICATION: [
    { key: 'email_notifications_enabled', label: 'Email Notifications', description: 'Send notifications via email to users', type: 'switch', defaultValue: 'true' },
    { key: 'in_app_notifications_enabled', label: 'In-App Notifications', description: 'Show notifications within the application', type: 'switch', defaultValue: 'true' },
  ],
};

// ── Tab configuration ────────────────────────────────────────────────────────
const TAB_ITEMS: { value: SettingCategory; label: string; icon: React.ElementType; description: string }[] = [
  { value: 'GENERAL', label: 'General', icon: Globe, description: 'Basic organization information' },
  { value: 'COMPETITION', label: 'Competition', icon: Trophy, description: 'Default values for new competitions' },
  { value: 'PAYMENT', label: 'Payment', icon: CreditCard, description: 'Payment gateway configuration' },
  { value: 'EMAIL', label: 'Email', icon: Mail, description: 'Email service configuration' },
  { value: 'STORAGE', label: 'Storage', icon: HardDrive, description: 'File storage configuration' },
  { value: 'EXAMINATION', label: 'Examination', icon: ClipboardCheck, description: 'Evaluation policies and criteria' },
  { value: 'SECURITY', label: 'Security', icon: Shield, description: 'Authentication and session policies' },
  { value: 'NOTIFICATION', label: 'Notifications', icon: Bell, description: 'Notification channel settings' },
];

// ── Sub-components ───────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>
      <Skeleton className="h-10 w-full max-w-3xl" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  );
}

function TabLoadingSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent className="space-y-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-9 w-full max-w-md" />
          </div>
        ))}
        <div className="flex justify-end pt-2">
          <Skeleton className="h-9 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="rounded-full bg-rose-100 p-4 mb-4">
        <AlertCircle className="h-8 w-8 text-rose-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-1">Failed to Load Settings</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md">{message}</p>
      <Button variant="outline" onClick={onRetry} className="gap-2">
        <RefreshCw className="h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}

function EmptyCategoryState({ category }: { category: SettingCategory }) {
  return (
    <Card>
      <CardContent className="py-12">
        <div className="flex flex-col items-center text-center">
          <Settings className="h-8 w-8 text-slate-300 mb-2" />
          <p className="text-sm text-slate-500">No settings configured for {SETTING_CATEGORY_LABELS[category]}</p>
          <p className="text-xs text-slate-400 mt-1">Fill in the fields below and save to create settings</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Single setting field renderer ─────────────────────────────────────────────
function SettingField({
  def, value, onChange,
}: {
  def: SettingDef;
  value: string;
  onChange: (val: string) => void;
}) {
  const id = `setting-${def.key}`;

  if (def.type === 'switch') {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4 gap-4">
        <div className="space-y-0.5">
          <Label htmlFor={id} className="text-sm font-medium text-slate-700 cursor-pointer">{def.label}</Label>
          {def.description && <p className="text-xs text-slate-500">{def.description}</p>}
        </div>
        <Switch
          id={id}
          checked={value === 'true'}
          onCheckedChange={(checked) => onChange(String(checked))}
        />
      </div>
    );
  }

  if (def.type === 'textarea') {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">{def.label}</Label>
        {def.description && <p className="text-xs text-slate-500">{def.description}</p>}
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          rows={4}
          className="max-w-lg"
        />
      </div>
    );
  }

  if (def.type === 'select' && def.options) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id} className="text-sm font-medium text-slate-700">{def.label}</Label>
        {def.description && <p className="text-xs text-slate-500">{def.description}</p>}
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger id={id} className="max-w-lg">
            <SelectValue placeholder="Select..." />
          </SelectTrigger>
          <SelectContent>
            {def.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // text, number, email
  const inputType = def.type === 'email' ? 'email' : def.type === 'number' ? 'number' : 'text';
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-medium text-slate-700">{def.label}</Label>
      {def.description && <p className="text-xs text-slate-500">{def.description}</p>}
      <Input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={def.placeholder}
        className="max-w-lg"
      />
    </div>
  );
}

// ── Category Tab Content ─────────────────────────────────────────────────────
function CategoryTab({
  category,
  loading,
  error,
  onRetry,
  values,
  originalValues,
  onChange,
  saving,
  onSave,
}: {
  category: SettingCategory;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  values: Record<string, string>;
  originalValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  saving: boolean;
  onSave: () => void;
}) {
  const defs = SETTINGS_DEFS[category];
  const tabInfo = TAB_ITEMS.find((t) => t.value === category)!;

  // Detect changes
  const hasChanges = defs.some((d) => values[d.key] !== originalValues[d.key]);

  if (loading) return <TabLoadingSkeleton />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <tabInfo.icon className="h-5 w-5 text-slate-500" />
          <CardTitle className="text-base">{tabInfo.label} Settings</CardTitle>
        </div>
        <CardDescription>{tabInfo.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-x-8 gap-y-5">
          {defs.map((def) => (
            <div key={def.key} className={def.type === 'textarea' || def.type === 'switch' ? 'sm:col-span-2' : ''}>
              <SettingField
                def={def}
                value={values[def.key] ?? def.defaultValue ?? ''}
                onChange={(v) => onChange(def.key, v)}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            {hasChanges && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
                Unsaved changes
              </p>
            )}
          </div>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={onSave}
            disabled={saving || !hasChanges}
          >
            {saving ? (
              <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="h-4 w-4 mr-1.5" /> Save Changes</>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────
export function AdminSettingsView() {
  const [activeTab, setActiveTab] = useState<SettingCategory>('GENERAL');
  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Store values per category: { GENERAL: { org_name: 'val', ... }, ... }
  const [settingsValues, setSettingsValues] = useState<Record<string, Record<string, string>>>({});
  const [originalValues, setOriginalValues] = useState<Record<string, Record<string, string>>>({});
  const [tabErrors, setTabErrors] = useState<Record<string, string | null>>({});
  const [tabLoading, setTabLoading] = useState<Record<string, boolean>>({});
  const [loadedCategories, setLoadedCategories] = useState<Set<string>>(new Set());

  // Track initial load so we don't flash error on first render
  const initialLoadDone = useRef(false);

  // Fetch settings for a given category
  const fetchCategory = useCallback(async (category: SettingCategory) => {
    if (loadedCategories.has(category)) return;

    setTabLoading((prev) => ({ ...prev, [category]: true }));
    setTabErrors((prev) => ({ ...prev, [category]: null }));

    try {
      const res = await fetch(`/api/settings?category=${category}`);
      const json = await res.json();

      if (json.success && json.map) {
        const incoming: Record<string, string> = json.map;
        setSettingsValues((prev) => ({
          ...prev,
          [category]: incoming,
        }));
        setOriginalValues((prev) => ({
          ...prev,
          [category]: { ...incoming },
        }));
        setLoadedCategories((prev) => new Set(prev).add(category));
      } else {
        setTabErrors((prev) => ({ ...prev, [category]: json.error || 'Failed to load settings' }));
        setLoadedCategories((prev) => new Set(prev).add(category));
      }
    } catch (err) {
      setTabErrors((prev) => ({
        ...prev,
        [category]: err instanceof Error ? err.message : 'Network error',
      }));
      setLoadedCategories((prev) => new Set(prev).add(category));
    } finally {
      setTabLoading((prev) => ({ ...prev, [category]: false }));
    }
  }, [loadedCategories]);

  // Initial load: fetch GENERAL tab, then we lazy-load others on tab switch
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await fetchCategory('GENERAL');
      setInitialLoading(false);
      initialLoadDone.current = true;
    };
    init();
  }, []);

  // When tab changes, lazy-load that category
  useEffect(() => {
    if (initialLoadDone.current && !loadedCategories.has(activeTab)) {
      fetchCategory(activeTab);
    }
  }, [activeTab, loadedCategories, fetchCategory]);

  // Handle value change
  const handleChange = useCallback((key: string, value: string) => {
    setSettingsValues((prev) => ({
      ...prev,
      [activeTab]: {
        ...(prev[activeTab] || {}),
        [key]: value,
      },
    }));
  }, [activeTab]);

  // Save changed settings for the active category
  const handleSave = useCallback(async () => {
    const defs = SETTINGS_DEFS[activeTab];
    const current = settingsValues[activeTab] || {};
    const original = originalValues[activeTab] || {};

    // Find changed keys
    const changedKeys = defs
      .filter((d) => current[d.key] !== original[d.key])
      .map((d) => d.key);

    if (changedKeys.length === 0) {
      toast.info('No changes to save');
      return;
    }

    setSaving(true);
    let allSuccess = true;
    let failCount = 0;

    for (const key of changedKeys) {
      try {
        const res = await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            key,
            value: current[key],
            category: activeTab,
            type: defs.find((d) => d.key === key)?.type === 'switch' ? 'BOOLEAN' : 'STRING',
          }),
        });
        const json = await res.json();
        if (!json.success) {
          allSuccess = false;
          failCount++;
        }
      } catch {
        allSuccess = false;
        failCount++;
      }
    }

    setSaving(false);

    if (allSuccess) {
      toast.success(`${SETTING_CATEGORY_LABELS[activeTab]} settings saved successfully`, {
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
      });
      // Update original values to match current
      setOriginalValues((prev) => ({
        ...prev,
        [activeTab]: { ...current },
      }));
    } else {
      toast.error(`Failed to save ${failCount} of ${changedKeys.length} setting(s). Please try again.`);
    }
  }, [activeTab, settingsValues, originalValues]);

  // Retry fetch for a category
  const handleRetry = useCallback((category: SettingCategory) => {
    setLoadedCategories((prev) => {
      const next = new Set(prev);
      next.delete(category);
      return next;
    });
    // Fetch will be triggered by useEffect since category is no longer in loadedCategories
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  if (initialLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Settings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure system settings and integrations</p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingCategory)}>
        <TabsList className="flex flex-wrap h-auto gap-1 bg-slate-100 p-1">
          {TAB_ITEMS.map((t) => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="gap-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs sm:text-sm"
            >
              <t.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {TAB_ITEMS.map((t) => (
          <TabsContent key={t.value} value={t.value}>
            <CategoryTab
              category={t.value}
              loading={tabLoading[t.value] ?? false}
              error={tabErrors[t.value] ?? null}
              onRetry={() => handleRetry(t.value)}
              values={settingsValues[t.value] || {}}
              originalValues={originalValues[t.value] || {}}
              onChange={handleChange}
              saving={saving}
              onSave={handleSave}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
