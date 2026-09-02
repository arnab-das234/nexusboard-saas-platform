import { PrismaClient } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════
// NexusBoard - Auto-Seeder (Vercel Build Time)
// ═══════════════════════════════════════════════════════════════
// This script runs during Vercel build.
// It ONLY seeds if the database is completely empty.
// Existing data is NEVER modified or overwritten.
// ═══════════════════════════════════════════════════════════════

const db = new PrismaClient();

async function seed() {
  console.log('   🌱 Seeding database...');

  // ── ROLES ─────────────────────────────────────────────────
  const roleData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system access' },
    { name: 'ADMIN', description: 'Administrator with management access' },
    { name: 'TEACHER', description: 'Teacher who can refer students' },
    { name: 'STUDENT', description: 'Student who participates in competitions' },
    { name: 'EXAMINER', description: 'Examiner who evaluates essays' },
  ];
  const roles: Record<string, any> = {};
  for (const r of roleData) {
    roles[r.name] = await db.role.create({ data: r });
  }
  console.log('   ✅ 5 roles created');

  // ── USERS ────────────────────────────────────────────────
  const usersData = [
    { email: 'admin@essaycomp.com', passwordHash: 'admin123', name: 'System Administrator', role: 'SUPER_ADMIN' },
    { email: 'ops@essaycomp.com', passwordHash: 'admin123', name: 'Operations Admin', role: 'ADMIN' },
    { email: 'teacher@essaycomp.com', passwordHash: 'teacher123', name: 'Dr. Sharma', role: 'TEACHER' },
    { email: 'teacher2@essaycomp.com', passwordHash: 'teacher123', name: 'Ms. Gupta', role: 'TEACHER' },
    { email: 'student1@essaycomp.com', passwordHash: 'student123', name: 'Arjun Patel', role: 'STUDENT' },
    { email: 'student2@essaycomp.com', passwordHash: 'student123', name: 'Priya Sharma', role: 'STUDENT' },
    { email: 'student3@essaycomp.com', passwordHash: 'student123', name: 'Rahul Kumar', role: 'STUDENT' },
    { email: 'student4@essaycomp.com', passwordHash: 'student123', name: 'Ananya Singh', role: 'STUDENT' },
    { email: 'student5@essaycomp.com', passwordHash: 'student123', name: 'Vikram Reddy', role: 'STUDENT' },
    { email: 'student6@essaycomp.com', passwordHash: 'student123', name: 'Meera Nair', role: 'STUDENT' },
    { email: 'examiner1@essaycomp.com', passwordHash: 'examiner123', name: 'Prof. Verma', role: 'EXAMINER' },
    { email: 'examiner2@essaycomp.com', passwordHash: 'examiner123', name: 'Dr. Iyer', role: 'EXAMINER' },
    { email: 'examiner3@essaycomp.com', passwordHash: 'examiner123', name: 'Ms. Das', role: 'EXAMINER' },
  ];
  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.email] = await db.user.create({
      data: {
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        emailVerified: true,
        isActive: true,
        roles: { create: { roleId: roles[u.role].id } },
      },
    });
  }
  console.log('   ✅ 13 users created');

  // ── STUDENT PROFILES ─────────────────────────────────────
  const studentEmails = ['student1@essaycomp.com', 'student2@essaycomp.com', 'student3@essaycomp.com', 'student4@essaycomp.com', 'student5@essaycomp.com', 'student6@essaycomp.com'];
  for (const email of studentEmails) {
    await db.studentProfile.create({
      data: {
        userId: users[email].id,
        dateOfBirth: new Date('2010-06-15'),
        schoolName: 'Delhi Public School',
        classGrade: '10',
        section: 'A',
        guardianName: 'Parent Name',
        guardianPhone: '+919999999999',
      },
    });
  }
  console.log('   ✅ 6 student profiles created');

  // ── TEACHER PROFILES ─────────────────────────────────────
  for (const email of ['teacher@essaycomp.com', 'teacher2@essaycomp.com']) {
    await db.teacherProfile.create({
      data: {
        userId: users[email].id,
        schoolName: 'Delhi Public School',
        designation: 'English Teacher',
      },
    });
  }
  console.log('   ✅ 2 teacher profiles created');

  // ── EXAMINER PROFILES ────────────────────────────────────
  for (const email of ['examiner1@essaycomp.com', 'examiner2@essaycomp.com', 'examiner3@essaycomp.com']) {
    await db.examinerProfile.create({
      data: {
        userId: users[email].id,
        specialization: 'English Literature',
        qualification: 'Ph.D.',
        isActive: true,
      },
    });
  }
  console.log('   ✅ 3 examiner profiles created');

  // ── DEMO COMPETITION ─────────────────────────────────────
  const competition = await db.competition.create({
    data: {
      id: 'demo-comp-001',
      name: 'National Essay Writing Competition 2025',
      description: 'A nationwide essay writing competition for school students.',
      academicYear: '2025-2026',
      startDate: new Date('2025-08-01'),
      registrationOpenDate: new Date('2025-08-01'),
      registrationCloseDate: new Date('2025-09-30'),
      submissionOpenDate: new Date('2025-10-01'),
      submissionCloseDate: new Date('2025-10-31'),
      competitionDate: new Date('2025-11-15'),
      resultDeclarationDate: new Date('2025-12-01'),
      minAge: 10,
      maxAge: 18,
      ageCalculationDate: new Date('2025-08-01'),
      registrationFee: 100,
      maxEssayFileSize: 5242880,
      status: 'REGISTRATION_OPEN',
      rules: '1. Essays must be original. 2. Word limit: 1500-2000. 3. PDF only. 4. Max 5 MB.',
      categories: {
        create: [
          { name: 'Group A (10-12 years)', minAge: 10, maxAge: 12 },
          { name: 'Group B (13-15 years)', minAge: 13, maxAge: 15 },
          { name: 'Group C (16-18 years)', minAge: 16, maxAge: 18 },
        ],
      },
      criteria: {
        create: [
          { name: 'Content', maxMarks: 20, description: 'Relevance, depth, originality', sortOrder: 0 },
          { name: 'Organization', maxMarks: 15, description: 'Structure, logical flow', sortOrder: 1 },
          { name: 'Language', maxMarks: 15, description: 'Grammar, vocabulary', sortOrder: 2 },
          { name: 'Creativity', maxMarks: 20, description: 'Originality, imagination', sortOrder: 3 },
          { name: 'Grammar', maxMarks: 15, description: 'Spelling, punctuation, syntax', sortOrder: 4 },
          { name: 'Overall Impact', maxMarks: 15, description: 'Overall impression', sortOrder: 5 },
        ],
      },
      scoringConfig: {
        create: {
          examinerCount: 3,
          maxMarks: 100,
          minMarks: 0,
          averagingMethod: 'MEAN',
          outlierHandling: false,
          blindEvaluation: true,
        },
      },
      examiners: {
        create: [
          { examinerId: users['examiner1@essaycomp.com'].id },
          { examinerId: users['examiner2@essaycomp.com'].id },
          { examinerId: users['examiner3@essaycomp.com'].id },
        ],
      },
    },
  });
  console.log('   ✅ 1 competition (3 categories, 6 criteria) created');

  // ── SYSTEM SETTINGS ──────────────────────────────────────
  await db.systemSetting.createMany({
    data: [
      { key: 'site_name', value: 'NexusBoard', category: 'GENERAL', type: 'STRING' },
      { key: 'site_description', value: 'Essay Competition Management Platform', category: 'GENERAL', type: 'STRING' },
      { key: 'default_competition_fee', value: '100', category: 'COMPETITION', type: 'NUMBER' },
      { key: 'max_essay_file_size_mb', value: '5', category: 'COMPETITION', type: 'NUMBER' },
      { key: 'currency', value: 'INR', category: 'PAYMENT', type: 'STRING' },
      { key: 'email_from_name', value: 'NexusBoard', category: 'EMAIL', type: 'STRING' },
      { key: 'examiner_count_default', value: '3', category: 'EXAMINATION', type: 'NUMBER' },
      { key: 'blind_evaluation_default', value: 'true', category: 'EXAMINATION', type: 'BOOLEAN' },
    ],
  });
  console.log('   ✅ 8 system settings created');

  // ── ANNOUNCEMENTS ────────────────────────────────────────
  await db.announcement.createMany({
    data: [
      {
        id: 'announce-welcome',
        title: 'Welcome to NexusBoard!',
        message: 'We are excited to launch the National Essay Writing Competition 2025.',
        audience: 'ALL',
        status: 'PUBLISHED',
        createdBy: users['admin@essaycomp.com'].id,
      },
      {
        id: 'announce-registration',
        title: 'Registration Now Open',
        message: 'Registration for the National Essay Writing Competition 2025 is now open.',
        audience: 'ALL',
        status: 'PUBLISHED',
        competitionId: competition.id,
        createdBy: users['admin@essaycomp.com'].id,
      },
    ],
  });
  console.log('   ✅ 2 announcements created');

  // ── ADMIN PERMISSIONS ────────────────────────────────────
  const permissions = [
    'STUDENT_VIEW', 'STUDENT_EDIT', 'TEACHER_VIEW', 'TEACHER_EDIT', 'EXAMINER_MANAGE',
    'COMPETITION_MANAGE', 'PAYMENT_VIEW', 'PAYMENT_MANAGE', 'EXAM_ASSIGN', 'RESULT_VIEW',
    'RESULT_MANAGE', 'NOTIFICATION_MANAGE', 'AUDIT_VIEW', 'SETTINGS_MANAGE', 'ADMIN_MANAGE',
  ];
  await db.adminPermission.createMany({
    data: permissions.map((p) => ({ userId: users['ops@essaycomp.com'].id, permission: p })),
  });
  console.log('   ✅ 15 admin permissions assigned');

  console.log('');
  console.log('   ════════════════════════════════════════════');
  console.log('   ✅ DATABASE SEEDED SUCCESSFULLY!');
  console.log('   ════════════════════════════════════════════');
  console.log('');
  console.log('   🔑 Login: admin@essaycomp.com / admin123');
  console.log('');
}

async function main() {
  try {
    // Check if database already has data by counting roles
    const roleCount = await db.role.count();

    if (roleCount > 0) {
      console.log('   ✅ Database already has data — skipping seed (existing data preserved)');
      return;
    }

    // Database is empty — run the seed
    await seed();
  } catch (error: any) {
    // If the Role table doesn't exist yet (first deploy), db push will create it
    // but auto-seed runs after db push, so this shouldn't happen.
    // If it does, log a warning but don't fail the build.
    console.log('   ⚠️  Could not check database state:');
    console.log(`      ${error.message || error}`);
    console.log('   ⚠️  Skipping auto-seed. You can seed manually with: npm run seed:neon');
  }
}

main()
  .catch(() => process.exit(0))  // Never fail the build due to seeding
  .finally(async () => {
    await db.$disconnect();
  });
