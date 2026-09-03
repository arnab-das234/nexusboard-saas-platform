import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Competition trend (last 6 months): created vs completed
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const allCompetitions = await db.competition.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, status: true },
    });

    const monthlyMap = new Map<string, { created: number; completed: number }>();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap.set(key, { created: 0, completed: 0 });
    }
    allCompetitions.forEach(c => {
      const key = c.createdAt.toISOString().slice(0, 7);
      const entry = monthlyMap.get(key);
      if (entry) {
        entry.created++;
        if (c.status === 'COMPLETED' || c.status === 'RESULT_PUBLISHED') entry.completed++;
      }
    });
    const projectTrend = Array.from(monthlyMap.entries()).map(([key, v]) => {
      const m = key.split('-')[1];
      return { month: monthNames[parseInt(m) - 1], ...v };
    });

    // Evaluation velocity (submissions per week, last 8 weeks)
    const eightWeeksAgo = new Date();
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56);
    const recentEvaluations = await db.examinerEvaluation.findMany({
      where: { submittedAt: { gte: eightWeeksAgo }, status: 'SUBMITTED' },
      select: { submittedAt: true },
    });

    const weekMap = new Map<string, number>();
    for (let i = 7; i >= 0; i--) {
      weekMap.set(`W${8 - i}`, 0);
    }
    recentEvaluations.forEach(e => {
      if (!e.submittedAt) return;
      const weekDiff = Math.floor((Date.now() - e.submittedAt.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekLabel = `W${8 - weekDiff}`;
      if (weekMap.has(weekLabel)) weekMap.set(weekLabel, (weekMap.get(weekLabel) || 0) + 1);
    });
    const taskVelocity = Array.from(weekMap.entries()).map(([week, done]) => ({ week, done }));

    // Registration status distribution (maps to priority-like pie chart)
    const registrationStatuses = await db.registration.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const priorityDist = registrationStatuses.map(g => ({
      name: g.status.charAt(0) + g.status.slice(1).toLowerCase().replace(/_/g, ' '),
      value: g._count.status,
    }));

    // Competition revenue data (budget = registrationFee * registrations, spent = paid revenue)
    const competitionsWithFees = await db.competition.findMany({
      where: { registrationFee: { gt: 0 } },
      select: {
        id: true,
        name: true,
        registrationFee: true,
        registrations: {
          select: { status: true, payments: { where: { status: 'SUCCESS' }, select: { amount: true } } },
        },
      },
    });

    const budgetData = competitionsWithFees.map(c => {
      const totalRegistrations = c.registrations.length;
      const collected = c.registrations.reduce(
        (sum, r) => sum + r.payments.reduce((ps, p) => ps + p.amount, 0), 0
      );
      return {
        name: c.name,
        budget: c.registrationFee * totalRegistrations,
        spent: collected,
      };
    });

    return NextResponse.json({
      projectTrend,
      taskVelocity,
      priorityDist,
      budgetData,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
