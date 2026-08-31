import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/competitions?status=...&academicYear=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const academicYear = searchParams.get('academicYear');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (academicYear) where.academicYear = academicYear;

    const competitions = await db.competition.findMany({
      where,
      include: {
        categories: true,
        criteria: { orderBy: { sortOrder: 'asc' } },
        scoringConfig: true,
        _count: {
          select: {
            registrations: true,
            essays: true,
            results: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return Response.json({ success: true, data: competitions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/competitions — Create competition with categories and criteria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      name?: string;
      description?: string;
      academicYear?: string;
      startDate?: string;
      registrationOpenDate?: string;
      registrationCloseDate?: string;
      submissionOpenDate?: string;
      submissionCloseDate?: string;
      competitionDate?: string;
      resultDeclarationDate?: string;
      minAge?: number;
      maxAge?: number;
      ageCalculationDate?: string;
      registrationFee?: number;
      maxEssayFileSize?: number;
      rules?: string;
      categories?: { name: string; minAge: number; maxAge: number; description?: string }[];
      criteria?: { name: string; maxMarks: number; description?: string }[];
      examinerCount?: number;
      averagingMethod?: string;
      blindEvaluation?: boolean;
    };

    const {
      name, description, academicYear, startDate,
      registrationOpenDate, registrationCloseDate,
      submissionOpenDate, submissionCloseDate,
      competitionDate, resultDeclarationDate,
      minAge = 10, maxAge = 18,
      ageCalculationDate, registrationFee = 100,
      maxEssayFileSize, rules,
      categories = [],
      criteria = [],
      examinerCount = 3,
      averagingMethod = 'MEAN',
      blindEvaluation = true,
    } = body;

    if (!name) {
      return Response.json({ success: false, error: 'Competition name is required' }, { status: 400 });
    }

    if (!ageCalculationDate) {
      return Response.json({ success: false, error: 'Age calculation date is required' }, { status: 400 });
    }

    if (categories.length === 0) {
      return Response.json({ success: false, error: 'At least one category is required' }, { status: 400 });
    }

    if (criteria.length === 0) {
      return Response.json({ success: false, error: 'At least one evaluation criterion is required' }, { status: 400 });
    }

    const competition = await db.$transaction(async (tx) => {
      const newCompetition = await tx.competition.create({
        data: {
          name,
          description,
          academicYear,
          startDate: startDate ? new Date(startDate) : null,
          registrationOpenDate: registrationOpenDate ? new Date(registrationOpenDate) : null,
          registrationCloseDate: registrationCloseDate ? new Date(registrationCloseDate) : null,
          submissionOpenDate: submissionOpenDate ? new Date(submissionOpenDate) : null,
          submissionCloseDate: submissionCloseDate ? new Date(submissionCloseDate) : null,
          competitionDate: competitionDate ? new Date(competitionDate) : null,
          resultDeclarationDate: resultDeclarationDate ? new Date(resultDeclarationDate) : null,
          minAge,
          maxAge,
          ageCalculationDate: new Date(ageCalculationDate),
          registrationFee,
          maxEssayFileSize: maxEssayFileSize || 5242880,
          rules,
          criteria: {
            create: criteria.map((c, index) => ({
              name: c.name,
              description: c.description,
              maxMarks: c.maxMarks,
              sortOrder: index,
            })),
          },
          categories: {
            create: categories.map((c) => ({
              name: c.name,
              minAge: c.minAge,
              maxAge: c.maxAge,
              description: c.description,
            })),
          },
          scoringConfig: {
            create: {
              examinerCount,
              maxMarks: criteria.reduce((sum, c) => sum + c.maxMarks, 0),
              averagingMethod,
              blindEvaluation,
            },
          },
        },
        include: {
          categories: true,
          criteria: { orderBy: { sortOrder: 'asc' } },
          scoringConfig: true,
        },
      });

      return newCompetition;
    });

    await db.auditLog.create({
      data: {
        action: 'COMPETITION_CREATE',
        entityType: 'Competition',
        entityId: competition.id,
        newValue: JSON.stringify({ name: competition.name }),
      },
    });

    return Response.json({ success: true, data: competition, message: 'Competition created successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/competitions?action=update-status
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'update-status') {
      return handleUpdateStatus(request);
    }

    return Response.json({ success: false, error: 'Invalid action. Use: update-status' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleUpdateStatus(request: NextRequest) {
  const body = await request.json() as { id?: string; status?: string };
  const { id, status } = body;

  if (!id || !status) {
    return Response.json({ success: false, error: 'Competition ID and status are required' }, { status: 400 });
  }

  const validStatuses = [
    'DRAFT', 'REGISTRATION_OPEN', 'REGISTRATION_CLOSED',
    'SUBMISSION_OPEN', 'SUBMISSION_CLOSED', 'EVALUATION_IN_PROGRESS',
    'RESULT_PENDING', 'RESULT_PUBLISHED', 'COMPLETED', 'CANCELLED',
  ];

  if (!validStatuses.includes(status)) {
    return Response.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
  }

  const previous = await db.competition.findUnique({ where: { id }, select: { status: true } });
  if (!previous) {
    return Response.json({ success: false, error: 'Competition not found' }, { status: 404 });
  }

  const competition = await db.competition.update({
    where: { id },
    data: { status },
    include: { categories: true, criteria: { orderBy: { sortOrder: 'asc' } }, scoringConfig: true },
  });

  await db.auditLog.create({
    data: {
      action: 'COMPETITION_STATUS_UPDATE',
      entityType: 'Competition',
      entityId: id,
      previousValue: JSON.stringify({ status: previous.status }),
      newValue: JSON.stringify({ status }),
    },
  });

  return Response.json({ success: true, data: competition, message: 'Competition status updated' });
}
