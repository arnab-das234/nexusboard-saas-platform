import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// GET /api/essays?status=...&competitionId=...&studentId=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const competitionId = searchParams.get('competitionId');
    const studentId = searchParams.get('studentId');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (competitionId) where.competitionId = competitionId;
    if (studentId) where.studentId = studentId;

    const [essays, total] = await Promise.all([
      db.essaySubmission.findMany({
        where,
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
          competition: { select: { id: true, name: true, status: true } },
          registration: { select: { registrationNo: true, category: true } },
          assignments: {
            include: {
              examiner: { include: { user: { select: { name: true, email: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.essaySubmission.count({ where }),
    ]);

    return Response.json({
      success: true,
      data: essays,
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

// POST /api/essays — Upload essay (validate PDF, store metadata, mock Cloudinary)
export async function POST(request: NextRequest) {
  try {
    // In a real app, we'd use FormData. For API testing, accept JSON.
    const contentType = request.headers.get('content-type') || '';

    let registrationId: string | undefined;
    let studentId: string | undefined;
    let fileName: string | undefined;
    let fileSize: number | undefined;
    let fileHash: string | undefined;
    let cloudinaryId: string | undefined;
    let fileUrl: string | undefined;
    let secureUrl: string | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      registrationId = formData.get('registrationId') as string;
      studentId = formData.get('studentId') as string;
      const file = formData.get('file') as File | null;

      if (!file) {
        return Response.json({ success: false, error: 'File is required' }, { status: 400 });
      }

      fileName = file.name;
      fileSize = file.size;

      // Validate PDF
      if (file.type !== 'application/pdf') {
        return Response.json({ success: false, error: 'Only PDF files are allowed' }, { status: 400 });
      }

      // Mock file hash
      fileHash = `hash_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;

      // Mock Cloudinary upload
      cloudinaryId = `essay_${Date.now()}`;
      fileUrl = `http://res.cloudinary.com/mock/image/upload/${cloudinaryId}`;
      secureUrl = `https://res.cloudinary.com/mock/image/upload/${cloudinaryId}`;
    } else {
      // JSON body for dev/testing
      const body = await request.json() as {
        registrationId?: string;
        studentId?: string;
        fileName?: string;
        fileSize?: number;
      };
      registrationId = body.registrationId;
      studentId = body.studentId;
      fileName = body.fileName || 'essay.pdf';
      fileSize = body.fileSize || 1024000;
      fileHash = `hash_${Date.now()}`;
      cloudinaryId = `essay_${Date.now()}`;
      fileUrl = `http://res.cloudinary.com/mock/image/upload/${cloudinaryId}`;
      secureUrl = `https://res.cloudinary.com/mock/image/upload/${cloudinaryId}`;
    }

    if (!registrationId || !studentId) {
      return Response.json({ success: false, error: 'Registration ID and Student ID are required' }, { status: 400 });
    }

    // Check registration
    const registration = await db.registration.findUnique({
      where: { id: registrationId },
      include: { competition: true },
    });

    if (!registration) {
      return Response.json({ success: false, error: 'Registration not found' }, { status: 404 });
    }

    if (registration.status === 'CANCELLED') {
      return Response.json({ success: false, error: 'Registration is cancelled' }, { status: 400 });
    }

    // Check competition submission is open
    if (registration.competition.status !== 'SUBMISSION_OPEN' && registration.competition.status !== 'SUBMISSION_CLOSED') {
      return Response.json({ success: false, error: 'Competition is not accepting submissions' }, { status: 400 });
    }

    // Check file size
    if (fileSize && fileSize > registration.competition.maxEssayFileSize) {
      const maxMB = Math.round(registration.competition.maxEssayFileSize / 1024 / 1024);
      return Response.json({ success: false, error: `File size exceeds maximum limit of ${maxMB}MB` }, { status: 400 });
    }

    // Check for existing essay
    const existingEssay = await db.essaySubmission.findUnique({
      where: { registrationId },
    });

    if (existingEssay && (existingEssay.status === 'SUBMITTED' || existingEssay.status === 'LOCKED' || existingEssay.status === 'UNDER_EVALUATION')) {
      return Response.json({ success: false, error: 'Essay already submitted and locked' }, { status: 400 });
    }

    const essay = await db.$transaction(async (tx) => {
      let essayData;

      if (existingEssay) {
        // Update existing essay
        essayData = await tx.essaySubmission.update({
          where: { id: existingEssay.id },
          data: {
            studentId,
            competitionId: registration.competitionId,
            cloudinaryId,
            fileUrl,
            secureUrl,
            fileName,
            originalName: fileName,
            fileSize,
            mimeType: 'application/pdf',
            fileHash,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        });
      } else {
        // Create new essay
        essayData = await tx.essaySubmission.create({
          data: {
            registrationId,
            studentId,
            competitionId: registration.competitionId,
            cloudinaryId,
            fileUrl,
            secureUrl,
            fileName,
            originalName: fileName,
            fileSize,
            mimeType: 'application/pdf',
            fileHash,
            status: 'SUBMITTED',
            submittedAt: new Date(),
          },
        });
      }

      return essayData;
    });

    await db.auditLog.create({
      data: {
        action: 'ESSAY_UPLOAD',
        entityType: 'EssaySubmission',
        entityId: essay.id,
        newValue: JSON.stringify({ fileName, fileSize, registrationId }),
      },
    });

    // Notify student
    const user = await db.user.findFirst({
      where: { studentProfile: { id: studentId } },
      select: { id: true },
    });
    if (user) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: 'Essay Submitted Successfully',
          message: `Your essay "${fileName}" has been submitted for ${registration.competition.name}. It will be validated shortly.`,
          type: 'SUCCESS',
        },
      });
    }

    return Response.json({ success: true, data: essay, message: 'Essay submitted successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/essays?action=validate
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'validate') {
      return handleValidateEssay(request);
    }

    return Response.json({ success: false, error: 'Invalid action. Use: validate' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleValidateEssay(request: NextRequest) {
  const body = await request.json() as {
    id?: string;
    isValid?: boolean;
    notes?: string;
  };

  const { id, isValid = true, notes } = body;

  if (!id) {
    return Response.json({ success: false, error: 'Essay ID is required' }, { status: 400 });
  }

  const essay = await db.essaySubmission.findUnique({
    where: { id },
    include: {
      student: { include: { user: { select: { id: true, name: true, email: true } } } },
      competition: { select: { name: true } },
      registration: { select: { registrationNo: true } },
    },
  });

  if (!essay) {
    return Response.json({ success: false, error: 'Essay not found' }, { status: 404 });
  }

  if (essay.status !== 'SUBMITTED' && essay.status !== 'VALIDATING') {
    return Response.json({ success: false, error: `Essay cannot be validated in current status: ${essay.status}` }, { status: 400 });
  }

  const updated = await db.essaySubmission.update({
    where: { id },
    data: {
      status: isValid ? 'VALID' : 'INVALID',
      validatedAt: new Date(),
      validationNotes: notes,
    },
    include: {
      student: { include: { user: { select: { name: true, email: true } } } },
      competition: { select: { name: true } },
    },
  });

  await db.auditLog.create({
    data: {
      action: 'ESSAY_VALIDATE',
      entityType: 'EssaySubmission',
      entityId: id,
      newValue: JSON.stringify({ isValid, notes, status: isValid ? 'VALID' : 'INVALID' }),
    },
  });

  // Notify student
  if (essay.student.user?.id) {
    await db.notification.create({
      data: {
        userId: essay.student.user.id,
        title: isValid ? 'Essay Validated' : 'Essay Validation Failed',
        message: isValid
          ? `Your essay for ${essay.competition.name} has been validated successfully and is ready for evaluation.`
          : `Your essay for ${essay.competition.name} did not pass validation. Reason: ${notes || 'Not specified'}. Please resubmit.`,
        type: isValid ? 'SUCCESS' : 'ERROR',
      },
    });
  }

  return Response.json({ success: true, data: updated, message: `Essay ${isValid ? 'validated' : 'rejected'}` });
}
