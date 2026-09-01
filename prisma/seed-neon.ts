import { PrismaClient } from '@prisma/client';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NexusBoard - Neon PostgreSQL Seeder
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//
// Usage:
//   1. Get your Neon connection string from https://neon.tech/dashboard
//   2. Run:
//
//      DATABASE_URL="postgresql://neondb_owner:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require" \
//        npx tsx prisma/seed-neon.ts
//
//   OR use the npm script:
//
//      DATABASE_URL="postgresql://..." npm run seed:neon
//
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const db = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL || '';
  
  if (!dbUrl.includes('postgresql') && !dbUrl.includes('postgres')) {
    console.error('❌ ERROR: DATABASE_URL must point to a PostgreSQL (Neon) database.');
    console.error('   Current DATABASE_URL starts with:', dbUrl.split('://')[0]);
    console.error('');
    console.error('   Usage:');
    console.error('   DATABASE_URL="postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require" npx tsx prisma/seed-neon.ts');
    process.exit(1);
  }

  console.log('🌐 Connecting to Neon PostgreSQL...');
  console.log(`   Host: ${dbUrl.split('@')[1]?.split('/')[0] || 'unknown'}`);
  console.log('');

  // Test connection
  try {
    await db.$connect();
    console.log('✅ Connected to Neon successfully!\n');
  } catch (error) {
    console.error('❌ Failed to connect to Neon:');
    console.error('   Check your DATABASE_URL and network connection.');
    console.error('   Make sure the URL includes ?sslmode=require');
    process.exit(1);
  }

  console.log('🌱 Starting Neon database seeding...\n');

  // ============================================
  // 1. CREATE ROLES
  // ============================================
  console.log('📋 Creating roles...');
  const roleData = [
    { name: 'SUPER_ADMIN', description: 'Super Administrator with full system access' },
    { name: 'ADMIN', description: 'Administrator with management access' },
    { name: 'TEACHER', description: 'Teacher who can refer students' },
    { name: 'STUDENT', description: 'Student who participates in competitions' },
    { name: 'EXAMINER', description: 'Examiner who evaluates essays' },
  ];

  const roles: Record<string, any> = {};
  for (const r of roleData) {
    roles[r.name] = await db.role.upsert({
      where: { name: r.name },
      update: {},
      create: r,
    });
    console.log(`  ✅ Role: ${r.name}`);
  }

  // ============================================
  // 2. CREATE USERS
  // ============================================
  console.log('\n👤 Creating users...');
  const usersData = [
    { email: 'admin@essaycomp.com', passwordHash: 'admin123', name: 'System Administrator', role: 'SUPER_ADMIN', verified: true },
    { email: 'ops@essaycomp.com', passwordHash: 'admin123', name: 'Operations Admin', role: 'ADMIN', verified: true },
    { email: 'teacher@essaycomp.com', passwordHash: 'teacher123', name: 'Dr. Sharma', role: 'TEACHER', verified: true },
    { email: 'teacher2@essaycomp.com', passwordHash: 'teacher123', name: 'Ms. Gupta', role: 'TEACHER', verified: true },
    { email: 'student1@essaycomp.com', passwordHash: 'student123', name: 'Arjun Patel', role: 'STUDENT', verified: true },
    { email: 'student2@essaycomp.com', passwordHash: 'student123', name: 'Priya Sharma', role: 'STUDENT', verified: true },
    { email: 'student3@essaycomp.com', passwordHash: 'student123', name: 'Rahul Kumar', role: 'STUDENT', verified: true },
    { email: 'student4@essaycomp.com', passwordHash: 'student123', name: 'Ananya Singh', role: 'STUDENT', verified: true },
    { email: 'student5@essaycomp.com', passwordHash: 'student123', name: 'Vikram Reddy', role: 'STUDENT', verified: true },
    { email: 'student6@essaycomp.com', passwordHash: 'student123', name: 'Meera Nair', role: 'STUDENT', verified: true },
    { email: 'examiner1@essaycomp.com', passwordHash: 'examiner123', name: 'Prof. Verma', role: 'EXAMINER', verified: true },
    { email: 'examiner2@essaycomp.com', passwordHash: 'examiner123', name: 'Dr. Iyer', role: 'EXAMINER', verified: true },
    { email: 'examiner3@essaycomp.com', passwordHash: 'examiner123', name: 'Ms. Das', role: 'EXAMINER', verified: true },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.email] = await db.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash: u.passwordHash,
        name: u.name,
        emailVerified: u.verified,
        isActive: true,
      },
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: users[u.email].id, roleId: roles[u.role].id } },
      update: {},
      create: { userId: users[u.email].id, roleId: roles[u.role].id },
    });
    console.log(`  ✅ ${u.role}: ${u.email}`);
  }

  // ============================================
  // 3. CREATE PROFILES
  // ============================================
  console.log('\n📝 Creating profiles...');

  // Student profiles
  const studentProfiles = ['student1@essaycomp.com', 'student2@essaycomp.com', 'student3@essaycomp.com', 'student4@essaycomp.com', 'student5@essaycomp.com', 'student6@essaycomp.com'];
  for (const email of studentProfiles) {
    await db.studentProfile.upsert({
      where: { userId: users[email].id },
      update: {},
      create: {
        userId: users[email].id,
        dateOfBirth: new Date('2010-06-15'),
        schoolName: 'Delhi Public School',
        classGrade: '10',
        section: 'A',
        guardianName: 'Parent Name',
        guardianPhone: '+919999999999',
      },
    });
    console.log(`  ✅ Student profile: ${email}`);
  }

  // Teacher profiles
  for (const email of ['teacher@essaycomp.com', 'teacher2@essaycomp.com']) {
    await db.teacherProfile.upsert({
      where: { userId: users[email].id },
      update: {},
      create: {
        userId: users[email].id,
        schoolName: 'Delhi Public School',
        designation: 'English Teacher',
      },
    });
    console.log(`  ✅ Teacher profile: ${email}`);
  }

  // Examiner profiles
  for (const email of ['examiner1@essaycomp.com', 'examiner2@essaycomp.com', 'examiner3@essaycomp.com']) {
    await db.examinerProfile.upsert({
      where: { userId: users[email].id },
      update: {},
      create: {
        userId: users[email].id,
        specialization: 'English Literature',
        qualification: 'Ph.D.',
        isActive: true,
      },
    });
    console.log(`  ✅ Examiner profile: ${email}`);
  }

  // ============================================
  // 4. CREATE DEMO COMPETITION
  // ============================================
  console.log('\n🏆 Creating demo competition...');
  const competition = await db.competition.upsert({
    where: { id: 'demo-comp-001' },
    update: {},
    create: {
      id: 'demo-comp-001',
      name: 'National Essay Writing Competition 2025',
      description: 'A nationwide essay writing competition for school students to showcase their writing skills.',
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
      rules: '1. Essays must be original and unpublished.\n2. Word limit: 1500-2000 words.\n3. Only PDF format accepted.\n4. Maximum file size: 5 MB.\n5. Decision of examiners is final.',
    },
  });
  console.log(`  ✅ Competition: ${competition.name}`);

  // Categories
  const categories = [
    { name: 'Group A (10-12 years)', minAge: 10, maxAge: 12 },
    { name: 'Group B (13-15 years)', minAge: 13, maxAge: 15 },
    { name: 'Group C (16-18 years)', minAge: 16, maxAge: 18 },
  ];
  const createdCategories: Record<string, any> = {};
  for (const cat of categories) {
    createdCategories[cat.name] = await db.competitionCategory.upsert({
      where: { competitionId_name: { competitionId: competition.id, name: cat.name } },
      update: {},
      create: { ...cat, competitionId: competition.id },
    });
    console.log(`  ✅ Category: ${cat.name}`);
  }

  // Evaluation Criteria
  const criteriaData = [
    { name: 'Content', maxMarks: 20, description: 'Relevance, depth, and originality of ideas' },
    { name: 'Organization', maxMarks: 15, description: 'Structure, logical flow, and coherence' },
    { name: 'Language', maxMarks: 15, description: 'Grammar, vocabulary, and sentence structure' },
    { name: 'Creativity', maxMarks: 20, description: 'Originality, imagination, and unique perspective' },
    { name: 'Grammar', maxMarks: 15, description: 'Spelling, punctuation, and syntax' },
    { name: 'Overall Impact', maxMarks: 15, description: 'Overall impression and effectiveness' },
  ];
  for (let i = 0; i < criteriaData.length; i++) {
    await db.evaluationCriterion.upsert({
      where: { competitionId_name: { competitionId: competition.id, name: criteriaData[i].name } },
      update: {},
      create: { ...criteriaData[i], competitionId: competition.id, sortOrder: i },
    });
  }
  console.log(`  ✅ 6 evaluation criteria created`);

  // Scoring Config
  await db.scoringConfig.upsert({
    where: { competitionId: competition.id },
    update: {},
    create: {
      competitionId: competition.id,
      examinerCount: 3,
      maxMarks: 100,
      minMarks: 0,
      averagingMethod: 'MEAN',
      outlierHandling: false,
      blindEvaluation: true,
    },
  });
  console.log(`  ✅ Scoring config: 3 examiners, MEAN averaging, blind evaluation`);

  // ============================================
  // 5. ASSIGN EXAMINERS TO COMPETITION
  // ============================================
  console.log('\n👨‍🏫 Assigning examiners to competition...');
  for (const email of ['examiner1@essaycomp.com', 'examiner2@essaycomp.com', 'examiner3@essaycomp.com']) {
    await db.competitionExaminer.upsert({
      where: { competitionId_examinerId: { competitionId: competition.id, examinerId: users[email].id } },
      update: {},
      create: { competitionId: competition.id, examinerId: users[email].id },
    });
    console.log(`  ✅ Assigned: ${email}`);
  }

  // ============================================
  // 6. CREATE SYSTEM SETTINGS
  // ============================================
  console.log('\n⚙️ Creating system settings...');
  const settingsData = [
    { key: 'site_name', value: 'NexusBoard', category: 'GENERAL', type: 'STRING' },
    { key: 'site_description', value: 'Essay Competition Management Platform', category: 'GENERAL', type: 'STRING' },
    { key: 'default_competition_fee', value: '100', category: 'COMPETITION', type: 'NUMBER' },
    { key: 'max_essay_file_size_mb', value: '5', category: 'COMPETITION', type: 'NUMBER' },
    { key: 'currency', value: 'INR', category: 'PAYMENT', type: 'STRING' },
    { key: 'email_from_name', value: 'NexusBoard', category: 'EMAIL', type: 'STRING' },
    { key: 'examiner_count_default', value: '3', category: 'EXAMINATION', type: 'NUMBER' },
    { key: 'blind_evaluation_default', value: 'true', category: 'EXAMINATION', type: 'BOOLEAN' },
  ];
  for (const s of settingsData) {
    await db.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log(`  ✅ ${settingsData.length} system settings created`);

  // ============================================
  // 7. CREATE DEMO ANNOUNCEMENTS
  // ============================================
  console.log('\n📢 Creating announcements...');
  await db.announcement.upsert({
    where: { id: 'announce-welcome' },
    update: {},
    create: {
      id: 'announce-welcome',
      title: 'Welcome to NexusBoard!',
      message: 'We are excited to launch the National Essay Writing Competition 2025. Register now to participate!',
      audience: 'ALL',
      status: 'PUBLISHED',
      createdBy: users['admin@essaycomp.com'].id,
    },
  });
  await db.announcement.upsert({
    where: { id: 'announce-registration' },
    update: {},
    create: {
      id: 'announce-registration',
      title: 'Registration Now Open',
      message: 'Registration for the National Essay Writing Competition 2025 is now open. Last date: September 30, 2025.',
      audience: 'ALL',
      status: 'PUBLISHED',
      competitionId: competition.id,
      createdBy: users['admin@essaycomp.com'].id,
    },
  });
  console.log('  ✅ 2 announcements created');

  // ============================================
  // 8. CREATE ADMIN PERMISSIONS
  // ============================================
  console.log('\n🔐 Assigning admin permissions...');
  const permissions = [
    'STUDENT_VIEW', 'STUDENT_EDIT', 'TEACHER_VIEW', 'TEACHER_EDIT', 'EXAMINER_MANAGE',
    'COMPETITION_MANAGE', 'PAYMENT_VIEW', 'PAYMENT_MANAGE', 'EXAM_ASSIGN', 'RESULT_VIEW',
    'RESULT_MANAGE', 'NOTIFICATION_MANAGE', 'AUDIT_VIEW', 'SETTINGS_MANAGE', 'ADMIN_MANAGE',
  ];
  for (const perm of permissions) {
    await db.adminPermission.upsert({
      where: { userId_permission: { userId: users['ops@essaycomp.com'].id, permission: perm } },
      update: {},
      create: { userId: users['ops@essaycomp.com'].id, permission: perm },
    });
  }
  console.log(`  ✅ ${permissions.length} permissions assigned to ops@essaycomp.com`);

  // ============================================
  // DONE
  // ============================================
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Neon database seeded successfully!');
  console.log('═'.repeat(50));
  console.log('\n📊 Summary:');
  console.log(`   Roles:         ${Object.keys(roles).length}`);
  console.log(`   Users:         ${Object.keys(users).length}`);
  console.log(`   Competitions:  1 (with 3 categories)`);
  console.log(`   Criteria:      6`);
  console.log(`   Examiners:     3`);
  console.log(`   Settings:      ${settingsData.length}`);
  console.log(`   Announcements: 2`);
  console.log('\n🔑 Login Credentials:');
  console.log('   SUPER_ADMIN: admin@essaycomp.com / admin123');
  console.log('   ADMIN:       ops@essaycomp.com / admin123');
  console.log('   TEACHER:     teacher@essaycomp.com / teacher123');
  console.log('   STUDENT:     student1@essaycomp.com / student123');
  console.log('   EXAMINER:    examiner1@essaycomp.com / examiner123');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\n❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
