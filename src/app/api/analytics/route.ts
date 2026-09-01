import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const workspace = await db.workspace.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!workspace) {
      return NextResponse.json({ projectTrend: [], taskVelocity: [], priorityDist: [], budgetData: [] });
    }

    // Project trend (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const createdProjects = await db.project.groupBy({
      by: ['createdAt'],
      where: { workspaceId: workspace.id, createdAt: { gte: sixMonthsAgo } },
    });
    const completedProjects = await db.project.groupBy({
      by: ['createdAt'],
      where: { workspaceId: workspace.id, status: 'COMPLETED', createdAt: { gte: sixMonthsAgo } },
    });

    const monthlyMap = new Map<string, { created: number; completed: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { created: 0, completed: 0 });
    }
    createdProjects.forEach(p => {
      const key = p.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.created++;
    });
    completedProjects.forEach(p => {
      const key = p.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) entry.completed++;
    });
    const projectTrend = Array.from(monthlyMap.entries()).map(([key, v]) => {
      const [y, m] = key.split('-');
      return { month: monthNames[parseInt(m) - 1], ...v };
    });

    // Priority distribution
    const priorityGroups = await db.task.groupBy({
      by: ['priority'],
      where: { project: { workspaceId: workspace.id } },
      _count: { priority: true },
    });
    const priorityDist = priorityGroups.map(g => ({
      name: g.priority.charAt(0) + g.priority.slice(1).toLowerCase(),
      value: g._count.priority,
    }));

    // Budget data
    const budgetProjects = await db.project.findMany({
      where: { workspaceId: workspace.id, budget: { gt: 0 } },
      select: { name: true, budget: true, spent: true },
    });

    return NextResponse.json({
      projectTrend,
      priorityDist,
      budgetData: budgetProjects,
      taskVelocity: [], // Would need time-series task data
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
