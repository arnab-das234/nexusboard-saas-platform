import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Map competition status to project-like status
function mapStatus(status: string): string {
  switch (status) {
    case 'DRAFT': return 'ON_HOLD';
    case 'REGISTRATION_OPEN':
    case 'SUBMISSION_OPEN':
    case 'EVALUATION_IN_PROGRESS': return 'ACTIVE';
    case 'REGISTRATION_CLOSED':
    case 'SUBMISSION_CLOSED':
    case 'RESULT_PENDING': return 'ON_HOLD';
    case 'RESULT_PUBLISHED':
    case 'COMPLETED': return 'COMPLETED';
    case 'CANCELLED': return 'ARCHIVED';
    default: return 'ACTIVE';
  }
}

// Map competition to project-like shape
function mapCompetition(c: any) {
  const regCount = c._count?.registrations ?? 0;
  const statusSteps: Record<string, number> = {
    DRAFT: 0, REGISTRATION_OPEN: 20, REGISTRATION_CLOSED: 30,
    SUBMISSION_OPEN: 40, SUBMISSION_CLOSED: 50,
    EVALUATION_IN_PROGRESS: 70, RESULT_PENDING: 85,
    RESULT_PUBLISHED: 95, COMPLETED: 100, CANCELLED: 0,
  };
  const progress = statusSteps[c.status] ?? 0;

  return {
    id: c.id,
    name: c.name,
    key: `CMP-${c.id.slice(-4).toUpperCase()}`,
    description: c.description,
    status: mapStatus(c.status),
    priority: 'MEDIUM' as const,
    budget: c.registrationFee ? c.registrationFee * regCount : null,
    spent: c._paidRevenue ?? 0,
    progress,
    taskCount: regCount,
    createdAt: c.createdAt,
  };
}

export async function GET() {
  try {
    const competitions = await db.competition.findMany({
      include: {
        _count: { select: { registrations: true } },
        registrations: {
          include: { payments: { where: { status: 'SUCCESS' }, select: { amount: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const projects = competitions.map(c => {
      const paidRevenue = c.registrations.reduce(
        (sum, r) => sum + r.payments.reduce((ps, p) => ps + p.amount, 0), 0
      );
      return mapCompetition({ ...c, _paidRevenue: paidRevenue });
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error('Projects GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Competition name is required' }, { status: 400 });
    }

    const competition = await db.competition.create({
      data: {
        name: body.name,
        description: body.description || null,
        minAge: 10,
        maxAge: 25,
        ageCalculationDate: new Date(),
        registrationFee: body.budget ? body.budget / 100 : 100,
        status: 'DRAFT',
      },
    });

    return NextResponse.json(mapCompetition({
      ...competition,
      _count: { registrations: 0 },
      _paidRevenue: 0,
    }), { status: 201 });
  } catch (error) {
    console.error('Projects POST error:', error);
    return NextResponse.json({ error: 'Failed to create' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    // Map project status back to competition status
    const statusMap: Record<string, string> = {
      ACTIVE: 'REGISTRATION_OPEN',
      ON_HOLD: 'REGISTRATION_CLOSED',
      COMPLETED: 'COMPLETED',
      ARCHIVED: 'CANCELLED',
    };
    const compStatus = statusMap[body.status] || body.status;

    const competition = await db.competition.update({
      where: { id: body.id },
      data: { status: compStatus },
      include: { _count: { select: { registrations: true } } },
    });

    return NextResponse.json(mapCompetition({ ...competition, _paidRevenue: 0 }));
  } catch (error) {
    console.error('Projects PUT error:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.competition.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Projects DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
