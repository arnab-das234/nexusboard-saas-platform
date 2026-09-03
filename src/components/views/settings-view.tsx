'use client';

import { useState, useEffect } from 'react';
import { User, Bell, Shield, Palette } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuthStore } from '@/lib/store';
import { useTheme } from 'next-themes';

export function SettingsView() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', bio: '', phone: '', timezone: '' });
  const [notifications, setNotifications] = useState({ email: true, push: true, projectUpdates: true, taskAssigned: true, weeklyDigest: false });

  useEffect(() => {
    if (user) {
      setForm({ name: user.name ?? '', bio: '', phone: '', timezone: 'Asia/Calcutta' });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        updateUser({ name: form.name });
        toast.success('Profile updated');
      } else toast.error('Failed to update');
    } catch { toast.error('Network error'); } finally { setLoading(false); }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" />Profile</TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2"><Palette className="h-4 w-4" />Appearance</TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2"><Bell className="h-4 w-4" />Notifications</TabsTrigger>
          <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Security</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-emerald-100 text-lg font-bold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                    {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) ?? 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Separator />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 (555) 000-0000" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself..." rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Timezone</Label>
                <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
              </div>
              <Button onClick={handleSaveProfile} disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>Customize the look and feel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`relative flex flex-col items-center rounded-xl border-2 p-4 transition-colors ${theme === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : 'border-border hover:border-muted-foreground/30'}`}
                  >
                    <div className={`mb-3 h-10 w-10 rounded-full ${t === 'light' ? 'bg-white border' : t === 'dark' ? 'bg-slate-800' : 'bg-gradient-to-br from-white to-slate-800'}`} />
                    <span className="text-sm font-medium capitalize">{t}</span>
                    {theme === t && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white">
                        ✓
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Choose what you want to be notified about</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(notifications).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</p>
                    <p className="text-xs text-muted-foreground">Receive notifications for {key.replace(/([A-Z])/g, ' $1').toLowerCase()}</p>
                  </div>
                  <Switch checked={val} onCheckedChange={(v) => setNotifications({ ...notifications, [key]: v })} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input value={user?.email ?? ''} disabled />
                <p className="text-xs text-muted-foreground">Contact support to change your email</p>
              </div>
              <Separator />
              <div>
                <h3 className="mb-2 text-sm font-medium">Danger Zone</h3>
                <Button variant="destructive" size="sm" onClick={() => toast.error('Account deletion is disabled in demo mode')}>
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}