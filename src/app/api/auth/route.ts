import { NextRequest } from 'next/server';
import { db } from '@/lib/db';

// POST /api/auth?action=login|register|verify-email
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'login':
        return handleLogin(request);
      case 'register':
        return handleRegister(request);
      case 'verify-email':
        return handleVerifyEmail(request);
      default:
        return Response.json({ success: false, error: 'Invalid action. Use: login, register, verify-email' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}

async function handleLogin(request: NextRequest) {
  const body = await request.json() as { email?: string; password?: string };
  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ success: false, error: 'Email and password are required' }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      roles: { include: { role: true } },
      studentProfile: true,
      teacherProfile: true,
      examinerProfile: true,
    },
  });

  if (!user) {
    return Response.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
  }

  if (!user.isActive) {
    return Response.json({ success: false, error: 'Account is deactivated. Contact administrator.' }, { status: 403 });
  }

  // Dev mode: accept any password (no real bcrypt)
  // In production, use: const isValid = await bcrypt.compare(password, user.passwordHash);
  const isValid = password === user.passwordHash || process.env.NODE_ENV === 'development';

  if (!isValid) {
    return Response.json({ success: false, error: 'Invalid email or password' }, { status: 401 });
  }

  const roleNames = user.roles.map((ur) => ur.role.name as 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'EXAMINER');

  const sessionData = {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: roleNames,
    avatar: user.avatar,
    emailVerified: user.emailVerified,
    isActive: user.isActive,
    phone: user.phone,
    studentProfile: user.studentProfile ? {
      id: user.studentProfile.id,
      dateOfBirth: user.studentProfile.dateOfBirth,
      gender: user.studentProfile.gender,
      schoolName: user.studentProfile.schoolName,
      board: user.studentProfile.board,
      classGrade: user.studentProfile.classGrade,
      section: user.studentProfile.section,
      rollNumber: user.studentProfile.rollNumber,
      studentId: user.studentProfile.studentId,
    } : null,
    teacherProfile: user.teacherProfile ? {
      id: user.teacherProfile.id,
      schoolName: user.teacherProfile.schoolName,
      designation: user.teacherProfile.designation,
      employeeId: user.teacherProfile.employeeId,
    } : null,
    examinerProfile: user.examinerProfile ? {
      id: user.examinerProfile.id,
      specialization: user.examinerProfile.specialization,
      qualification: user.examinerProfile.qualification,
      isActive: user.examinerProfile.isActive,
    } : null,
  };

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      userRole: roleNames[0],
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user.id,
    },
  });

  return Response.json({ success: true, data: sessionData, message: 'Login successful' });
}

async function handleRegister(request: NextRequest) {
  const body = await request.json() as {
    email?: string;
    password?: string;
    name?: string;
    phone?: string;
    role?: 'STUDENT' | 'TEACHER';
    // Student profile fields
    dateOfBirth?: string;
    gender?: string;
    address?: string;
    schoolName?: string;
    schoolAddress?: string;
    board?: string;
    classGrade?: string;
    section?: string;
    rollNumber?: string;
    studentId?: string;
    guardianName?: string;
    guardianRelation?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    referredByTeacherId?: string;
    // Teacher profile fields
    designation?: string;
    employeeId?: string;
  };

  const { email, password, name, phone, role } = body;

  if (!email || !password || !name || !role) {
    return Response.json({ success: false, error: 'Email, password, name, and role are required' }, { status: 400 });
  }

  if (!['STUDENT', 'TEACHER'].includes(role)) {
    return Response.json({ success: false, error: 'Role must be STUDENT or TEACHER' }, { status: 400 });
  }

  if (password.length < 6) {
    return Response.json({ success: false, error: 'Password must be at least 6 characters' }, { status: 400 });
  }

  // Check duplicate email
  const existingUser = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existingUser) {
    return Response.json({ success: false, error: 'An account with this email already exists' }, { status: 409 });
  }

  // Dev mode: store password as-is (no real bcrypt for dev)
  // In production, use: const passwordHash = await bcrypt.hash(password, 12);
  const passwordHash = password; // Dev: plain text storage with note

  // Check role exists
  const roleRecord = await db.role.findUnique({ where: { name: role } });
  if (!roleRecord) {
    return Response.json({ success: false, error: `Role ${role} not found` }, { status: 400 });
  }

  const user = await db.$transaction(async (tx) => {
    // Create user
    const newUser = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        name,
        phone,
        roles: {
          create: {
            roleId: roleRecord.id,
          },
        },
      },
      include: { roles: { include: { role: true } } },
    });

    // Create profile based on role
    if (role === 'STUDENT') {
      if (!body.schoolName) {
        throw new Error('School name is required for students');
      }
      if (!body.dateOfBirth) {
        throw new Error('Date of birth is required for students');
      }

      await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          dateOfBirth: new Date(body.dateOfBirth),
          gender: body.gender,
          address: body.address,
          schoolName: body.schoolName,
          schoolAddress: body.schoolAddress,
          board: body.board,
          classGrade: body.classGrade,
          section: body.section,
          rollNumber: body.rollNumber,
          studentId: body.studentId,
          guardianName: body.guardianName,
          guardianRelation: body.guardianRelation,
          guardianPhone: body.guardianPhone,
          guardianEmail: body.guardianEmail,
          referredByTeacherId: body.referredByTeacherId,
        },
      });
    } else if (role === 'TEACHER') {
      if (!body.schoolName) {
        throw new Error('School name is required for teachers');
      }

      await tx.teacherProfile.create({
        data: {
          userId: newUser.id,
          schoolName: body.schoolName,
          schoolAddress: body.schoolAddress,
          designation: body.designation,
          employeeId: body.employeeId,
          address: body.address,
        },
      });
    }

    return newUser;
  });

  // Create audit log
  await db.auditLog.create({
    data: {
      userId: user.id,
      userRole: role,
      action: 'USER_REGISTER',
      entityType: 'User',
      entityId: user.id,
      newValue: JSON.stringify({ email: user.email, name: user.name, role }),
    },
  });

  return Response.json({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      role,
    },
    message: 'Registration successful',
  }, { status: 201 });
}

async function handleVerifyEmail(request: NextRequest) {
  const body = await request.json() as { token?: string };
  const { token } = body;

  if (!token) {
    return Response.json({ success: false, error: 'Verification token is required' }, { status: 400 });
  }

  const emailToken = await db.emailVerificationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!emailToken) {
    return Response.json({ success: false, error: 'Invalid verification token' }, { status: 400 });
  }

  if (emailToken.usedAt) {
    return Response.json({ success: false, error: 'Token already used' }, { status: 400 });
  }

  if (emailToken.expiresAt < new Date()) {
    return Response.json({ success: false, error: 'Verification token has expired' }, { status: 400 });
  }

  await db.$transaction([
    db.user.update({
      where: { id: emailToken.userId },
      data: { emailVerified: true },
    }),
    db.emailVerificationToken.update({
      where: { id: emailToken.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await db.auditLog.create({
    data: {
      userId: emailToken.userId,
      action: 'EMAIL_VERIFIED',
      entityType: 'User',
      entityId: emailToken.userId,
    },
  });

  return Response.json({ success: true, message: 'Email verified successfully' });
}
