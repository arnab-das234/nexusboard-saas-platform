'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { FolderKanban, CheckCircle2, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuthStore } from '@/lib/store';

type DashboardStats = {
  totalProjects: number;
  activeProjects: number;
  totalTasks: number;
  completedTasks: number;
  totalMembers: number;
  completionRate: number;
};

type Activity = {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: string;
  user: { name: string };
};

const KPIS = [
  { key: 'totalProjects', label: 'Total Projects', icon: FolderKanban, color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400', change: '+12%' },
  { key: 'activeProjects', label: 'Active Tasks', icon: CheckCircle2, color: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400', change: '+8%' },
  { key: 'totalMembers', label: 'Team Members', icon: Users, color: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400', change: '+3' },
  { key: 'completionRate', label: 'Completion Rate', icon: TrendingUp, color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400', change: '+5%' },
] as const;

const PIE_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

const SAMPLE_MONTHLY = [
  { name: 'Jul', projects: 4 },
  { name: 'Aug', projects: 6 },
  { name: 'Sep', projects: 5 },
  { name: 'Oct', projects: 8 },
  { name: 'Nov', projects: 12 },
  { name: 'Dec', projects: 10 },
];

const SAMPLE_STATUS = [
  { name: 'Active', value: 8 },
  { name: 'On Hold', value: 3 },
  { name: 'Completed', value: 12 },
  { name: 'Archived', value: 2 },
];

const SAMPLE_TASKS = [
  { name: 'To Do', count: 12 },
  { name: 'In Progress', count: 8 },
  { name: 'In Review', count: 5 },
  { name: 'Done', count: 23 },
];

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [monthly, setMonthly] = useState(SAMPLE_MONTHLY);
  const [statusDist, setStatusDist] = useState(SAMPLE_STATUS);
  const [taskDist, setTaskDist] = useState(SAMPLE_TASKS);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard');
        if (res.ok) {
          const data = await res.json();
          setStats(data.stats);
          if (data.monthlyData?.length) setMonthly(data.monthlyData);
          if (data.statusDistribution?.length) setStatusDist(data.statusDistribution);
          if (data.taskDistribution?.length) setTaskDist(data.taskDistribution);
          if (data.activities?.length) setActivities(data.activities);
        }
      } catch {
        // Use sample data
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statValues: Record<string, number> = stats
    ? {
        totalProjects: stats.totalProjects,
        activeProjects: stats.totalTasks - stats.completedTasks,
        totalMembers: stats.totalMembers,
        completionRate: stats.completionRate,
      }
    : { totalProjects: 25, activeProjects: 28, totalMembers: 16, completionRate: 72 };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.name ?? 'User'}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
        {KPIS.map((kpi) => (
          <Card key={kpi.key} className="relative overflow-hidden">
            <CardContent className="p-6">
              {loading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{kpi.label}</p>
                    <p className="mt-1 text-3xl font-bold">
                      {kpi.key === 'completionRate' ? `${statValues[kpi.key]}%` : statValues[kpi.key]}
                    </p>
                    <p className="mt-1 text-xs text-emerald-600">{kpi.change} from last month</p>
                  </div>
                  <div className={`rounded-xl p-3 ${kpi.color}`}>
                    <kpi.icon className="h-6 w-6" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Area Chart */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Project Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={monthly}>
                  <defs>
                    <linearGradient id="colorProjects" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Area type="monotone" dataKey="projects" stroke="#10b981" fillOpacity={1} fill="url(#colorProjects)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Project Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <div>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={statusDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      strokeWidth={2}
                    >
                      {statusDist.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 flex flex-wrap justify-center gap-4 text-xs">
                  {statusDist.map((item, i) => (
                    <div key={item.name} className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-4 md:grid-cols-7">
        {/* Recent Activity */}
        <Card className="md:col-span-4">
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activities.length > 0 ? (
              <ScrollArea className="h-80">
                <div className="space-y-4 pr-4">
                  {activities.map((a) => (
                    <div key={a.id} className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        {a.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm">
                          <span className="font-medium">{a.user.name}</span>{' '}
                          <span className="text-muted-foreground">
                            {a.action.toLowerCase()}
                            {a.entityType ? ` ${a.entityType.toLowerCase()}` : ''}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Task Distribution */}
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Tasks by Status</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[250px] w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={taskDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
