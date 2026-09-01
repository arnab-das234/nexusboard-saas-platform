'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

const SAMPLE_PROJECT_TREND = [
  { month: 'Jan', created: 3, completed: 2 },
  { month: 'Feb', created: 5, completed: 3 },
  { month: 'Mar', created: 4, completed: 5 },
  { month: 'Apr', created: 7, completed: 4 },
  { month: 'May', created: 6, completed: 8 },
  { month: 'Jun', created: 8, completed: 6 },
];

const SAMPLE_TASK_VELOCITY = [
  { week: 'W1', done: 5 },
  { week: 'W2', done: 8 },
  { week: 'W3', done: 12 },
  { week: 'W4', done: 9 },
  { week: 'W5', done: 15 },
  { week: 'W6', done: 11 },
  { week: 'W7', done: 18 },
  { week: 'W8', done: 14 },
];

const SAMPLE_PRIORITY_DIST = [
  { name: 'Low', value: 8 },
  { name: 'Medium', value: 22 },
  { name: 'High', value: 14 },
  { name: 'Critical', value: 4 },
];

const SAMPLE_BUDGET_DATA = [
  { name: 'Website Redesign', budget: 15000, spent: 9200 },
  { name: 'Mobile App', budget: 25000, spent: 18000 },
  { name: 'API Platform', budget: 10000, spent: 4500 },
  { name: 'Marketing Site', budget: 8000, spent: 7800 },
  { name: 'Dashboard', budget: 12000, spent: 3600 },
];

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  fontSize: '12px',
};

export function AnalyticsView() {
  const [loading, setLoading] = useState(true);
  const [projectTrend, setProjectTrend] = useState(SAMPLE_PROJECT_TREND);
  const [taskVelocity, setTaskVelocity] = useState(SAMPLE_TASK_VELOCITY);
  const [priorityDist, setPriorityDist] = useState(SAMPLE_PRIORITY_DIST);
  const [budgetData, setBudgetData] = useState(SAMPLE_BUDGET_DATA);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analytics');
        if (res.ok) {
          const data = await res.json();
          if (data.projectTrend?.length) setProjectTrend(data.projectTrend);
          if (data.taskVelocity?.length) setTaskVelocity(data.taskVelocity);
          if (data.priorityDist?.length) setPriorityDist(data.priorityDist);
          if (data.budgetData?.length) setBudgetData(data.budgetData);
        }
      } catch { /* use sample */ } finally { setLoading(false); }
    }
    load();
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Deep insights into your workspace performance</p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="budget">Budget</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Task Velocity</CardTitle><CardDescription>Tasks completed per week</CardDescription></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[280px]" /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={taskVelocity}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="done" fill="#10b981" radius={[6, 6, 0, 0]} name="Completed" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Priority Distribution</CardTitle><CardDescription>Tasks by priority level</CardDescription></CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[280px]" /> : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="60%" height={250}>
                      <PieChart>
                        <Pie data={priorityDist} cx="50%" cy="50%" innerRadius={55} outerRadius={90} dataKey="value" strokeWidth={2}>
                          {priorityDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-3">
                      {priorityDist.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-muted-foreground">{item.name}</span>
                          <span className="ml-auto font-semibold">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Project Creation vs Completion</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[350px]" /> : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={projectTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend />
                    <Line type="monotone" dataKey="created" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Created" />
                    <Line type="monotone" dataKey="completed" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} name="Completed" />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Weekly Task Completion Trend</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[350px]" /> : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={taskVelocity}>
                    <defs>
                      <linearGradient id="velGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="week" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area type="monotone" dataKey="done" stroke="#10b981" fill="url(#velGrad)" strokeWidth={2} name="Completed" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Budget vs Spent by Project</CardTitle></CardHeader>
            <CardContent>
              {loading ? <Skeleton className="h-[350px]" /> : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={budgetData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} width={130} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => `$${v.toLocaleString()}`} />
                    <Legend />
                    <Bar dataKey="budget" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} name="Budget" />
                    <Bar dataKey="spent" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={14} name="Spent" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}