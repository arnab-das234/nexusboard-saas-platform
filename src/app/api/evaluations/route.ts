import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/evaluations?status=...&essayId=...&examinerId=...&competitionId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const essayId = searchParams.get('essayId');
    const examinerId = searchParams.get('examinerId');
    const competitionId = searchParams.get('competitionId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (essayId) where.essayId = essayId;
    if (examinerId) where.examinerId = examinerId;
    if (competitionId) where.competitionId = competitionId;

    const [evaluations, total] = await Promise.all([
      db.examinerEvaluation.findMany({
        where,
        include: {
          essay: {
            include: {
              student: { include: { user: { select: { name: true, email: true } } } },
              competition: { select: { name: true } },
            },
          },
          examiner: {
            include: { user: { select: { name: true, email: true } } },
          },
          competition: { select: { name: true } },
          scores: {
            include: {
              criterion: { select: { name: true, maxMarks: true } },
            },
          },
          assignment: { select: { deadline: true, status: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.examinerEvaluation.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: evaluations,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/evaluations — Save/submit evaluation with scores per criterion
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      assignmentId?: string;
      essayId?: string;
      examinerId?: string;
      competitionId?: string;
      scores?: { criterionId: string; marks: number; comments?: string }[];
      justification?: string;
      comments?: string;
      ocrReferences?: string;
      submit?: boolean; // true = submit, false = save draft
    };

    const {
      assignmentId, essayId, examinerId, competitionId,
      scores = [], justification, comments, ocrReferences,
      submit = false,
    } = body;

    if (!assignmentId || !essayId || !examinerId || !competitionId) {
      return Response.json({ success: false, error: 'Assignment ID, Essay ID, Examiner ID, and Competition ID are required' }, { status: 400 });
    }

    if (scores.length === 0) {
      return Response.json({ success: false, error: 'At least one score is required' }, { status: 400 });
    }

    // Check assignment
    const assignment = await db.examinerAssignment.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) {
      return Response.json({ success: false, error: 'Assignment not found' }, { status: 404 });
    }

    if (assignment.status === 'SUBMITTED') {
      return Response.json({ success: false, error: 'Evaluation already submitted' }, { status: 400 });
    }

    // Validate scores against criteria
    const criteria = await db.evaluationCriterion.findMany({
      where: { competitionId },
    });

    for (const score of scores) {
      const criterion = criteria.find((c) => c.id === score.criterionId);
      if (!criterion) {
        return Response.json({ success: false, error: `Invalid criterion ID: ${score.criterionId}` }, { status: 400 });
      }
      if (score.marks < 0 || score.marks > criterion.maxMarks) {
        return Response.json({
          success: false,
          error: `Score ${score.marks} for '${criterion.name}' is out of range (0-${criterion.maxMarks})`,
        }, { status: 400 });
      }
    }

    const totalMarks = scores.reduce((sum, s) => sum + s.marks, 0);

    const evaluation = await db.$transaction(async (tx) => {
      // Upsert evaluation
      let evalRecord = await tx.examinerEvaluation.findUnique({
        where: { assignmentId },
      });

      if (evalRecord) {
        evalRecord = await tx.examinerEvaluation.update({
          where: { assignmentId },
          data: {
            totalMarks,
            justification,
            comments,
            ocrReferences,
            status: submit ? 'SUBMITTED' : 'IN_PROGRESS',
            submittedAt: submit ? new Date() : null,
          },
        });
      } else {
        evalRecord = await tx.examinerEvaluation.create({
          data: {
            assignmentId,
            essayId,
            examinerId,
            competitionId,
            totalMarks,
            justification,
            comments,
            ocrReferences,
            status: submit ? 'SUBMITTED' : 'IN_PROGRESS',
            submittedAt: submit ? new Date() : null,
          },
        });
      }

      // Upsert scores
      for (const score of scores) {
        await tx.evaluationScore.upsert({
          where: {
            evaluationId_criterionId: {
              evaluationId: evalRecord.id,
              criterionId: score.criterionId,
            },
          },
          create: {
            evaluationId: evalRecord.id,
            criterionId: score.criterionId,
            marks: score.marks,
            comments: score.comments,
          },
          update: {
            marks: score.marks,
            comments: score.comments,
          },
        });
      }

      // Update assignment status
      if (submit) {
        await tx.examinerAssignment.update({
          where: { id: assignmentId },
          data: { status: 'SUBMITTED' },
        });
      } else {
        await tx.examinerAssignment.update({
          where: { id: assignmentId },
          data: { status: 'IN_PROGRESS' },
        });
      }

      return evalRecord;
    });

    await db.auditLog.create({
      data: {
        userId: examinerId,
        userRole: 'EXAMINER',
        action: submit ? 'EVALUATION_SUBMIT' : 'EVALUATION_SAVE_DRAFT',
        entityType: 'ExaminerEvaluation',
        entityId: evaluation.id,
        newValue: JSON.stringify({ totalMarks, scoreCount: scores.length }),
      },
    });

    return Response.json({
      success: true,
      data: evaluation,
      message: submit ? 'Evaluation submitted' : 'Draft saved',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/evaluations?action=calculate-result
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'calculate-result') {
      return handleCalculateResult(request);
    }

    return Response.json({ success: false, error: 'Invalid action. Use: calculate-result' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleCalculateResult(request: NextRequest) {
  const body = await request.json() as { essayId?: string };
  const { essayId } = body;

  if (!essayId) {
    return Response.json({ success: false, error: 'Essay ID is required' }, { status: 400 });
  }

  // Get all submitted evaluations for this essay
  const evaluations = await db.examinerEvaluation.findMany({
    where: { essayId, status: 'SUBMITTED' },
    include: {
      scores: {
        include: { criterion: true },
      },
      competition: {
        include: { scoringConfig: true },
      },
    },
  });

  if (evaluations.length === 0) {
    return Response.json({ success: false, error: 'No submitted evaluations found for this essay' }, { status: 400 });
  }

  const competition = evaluations[0].competition;
  const scoringConfig = competition.scoringConfig;
  const averagingMethod = scoringConfig?.averagingMethod || 'MEAN';
  const outlierHandling = scoringConfig?.outlierHandling || false;

  // Calculate average score per criterion
  const criteriaIds = [...new Set(evaluations.flatMap((e) => e.scores.map((s) => s.criterionId)))];

  const criterionScores: Record<string, number[]> = {};
  for (const cId of criteriaIds) {
    const scores = evaluations
      .map((e) => e.scores.find((s) => s.criterionId === cId))
      .filter((s): s is NonNullable<typeof s> => !!s)
      .map((s) => s.marks);
    criterionScores[cId] = scores;
  }

  let finalScore = 0;

  if (averagingMethod === 'MEAN') {
    for (const cId of criteriaIds) {
      const scores = criterionScores[cId];
      if (scores.length === 0) continue;

      let avg: number;
      if (outlierHandling && scores.length >= 3) {
        // Trimmed mean: remove highest and lowest
        const sorted = [...scores].sort((a, b) => a - b);
 const trimmed = sorted.slice(1, -1);
        avg = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;
      } else {
        avg = scores.reduce((s, v) => s + v, 0) / scores.length;
      }
      finalScore += avg;
    }
  } else if (averagingMethod === 'MEDIAN') {
    for (const cId of criteriaIds) {
      const scores = criterionScores[cId];
      if (scores.length === 0) continue;

      const sorted = [...scores].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
      finalScore += median;
    }
  }

  const averageScore = evaluations.reduce((s, e) => s + (e.totalMarks || 0), 0) / evaluations.length;

  // Upsert result
  const essay = await db.essaySubmission.findUnique({
    where: { id: essayId },
    include: { competition: true, student: true, registration: true },
  });

  if (!essay) {
    return Response.json({ success: false, error: 'Essay not found' }, { status: 404 });
  }

  let result = await db.result.findUnique({ where: { essayId } });

  if (result) {
    result = await db.result.update({
      where: { essayId },
      data: {
        averageScore: Math.round(averageScore * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100,
        calculatedAt: new Date(),
      },
    });
  } else {
    result = await db.result.create({
      data: {
        essayId,
        competitionId: essay.competitionId,
        categoryId: essay.registration?.categoryId || null,
        studentId: essay.studentId,
        averageScore: Math.round(averageScore * 100) / 100,
        finalScore: Math.round(finalScore * 100) / 100,
        status: 'PENDING',
        calculatedAt: new Date(),
      },
    });
  }

  await db.auditLog.create({
    data: {
      action: 'RESULT_CALCULATE',
      entityType: 'Result',
      entityId: result.id,
      newValue: JSON.stringify({
        averageScore: result.averageScore,
        finalScore: result.finalScore,
        evaluationCount: evaluations.length,
        averagingMethod,
      }),
    },
  });

  return Response.json({ success: true, data: result, message: 'Result calculated' });
}
