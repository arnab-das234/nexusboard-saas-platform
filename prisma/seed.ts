import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

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
    console.log(`  ✅ Role: ${r.name} (${roles[r.name].id})`);
  }

  // ============================================
  // 2. CREATE SUPER ADMIN USER
  // ============================================
  console.log('\n👤 Creating super admin user...');
  const superAdmin = await db.user.upsert({
    where: { email: 'admin@essaycomp.com' },
    update: {},
    create: {
      email: 'admin@essaycomp.com',
      passwordHash: 'admin123',
      name: 'System Administrator',
      emailVerified: true,
      isActive: true,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: superAdmin.id, roleId: roles.SUPER_ADMIN.id } },
    update: {},
    create: { userId: superAdmin.id, roleId: roles.SUPER_ADMIN.id },
  });
  console.log(`  ✅ Super Admin: ${superAdmin.email} (${superAdmin.id})`);

  // ============================================
  // 3. CREATE REGULAR ADMIN USER
  // ============================================
  console.log('\n👤 Creating regular admin user...');
  const admin = await db.user.upsert({
    where: { email: 'ops@essaycomp.com' },
    update: {},
    create: {
      email: 'ops@essaycomp.com',
      passwordHash: 'admin123',
      name: 'Operations Admin',
      emailVerified: true,
      isActive: true,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: roles.ADMIN.id } },
    update: {},
    create: { userId: admin.id, roleId: roles.ADMIN.id },
  });
  console.log(`  ✅ Admin: ${admin.email} (${admin.id})`);

  // ============================================
  // 4. CREATE TEACHER USERS WITH PROFILES
  // ============================================
  console.log('\n👩‍🏫 Creating teacher users...');
  const teacher1User = await db.user.upsert({
    where: { email: 'teacher@essaycomp.com' },
    update: {},
    create: {
      email: 'teacher@essaycomp.com',
      passwordHash: 'teacher123',
      name: 'Dr. Sharma',
      emailVerified: true,
      isActive: true,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: teacher1User.id, roleId: roles.TEACHER.id } },
    update: {},
    create: { userId: teacher1User.id, roleId: roles.TEACHER.id },
  });
  const teacher1Profile = await db.teacherProfile.upsert({
    where: { userId: teacher1User.id },
    update: {},
    create: {
      userId: teacher1User.id,
      schoolName: 'Delhi Public School',
      designation: 'Senior Teacher',
    },
  });
  console.log(`  ✅ Teacher 1: ${teacher1User.email} (${teacher1User.id}) | Profile: ${teacher1Profile.id}`);

  const teacher2User = await db.user.upsert({
    where: { email: 'teacher2@essaycomp.com' },
    update: {},
    create: {
      email: 'teacher2@essaycomp.com',
      passwordHash: 'teacher123',
      name: "Ms. Gupta",
      emailVerified: true,
      isActive: true,
    },
  });
  await db.userRole.upsert({
    where: { userId_roleId: { userId: teacher2User.id, roleId: roles.TEACHER.id } },
    update: {},
    create: { userId: teacher2User.id, roleId: roles.TEACHER.id },
  });
  const teacher2Profile = await db.teacherProfile.upsert({
    where: { userId: teacher2User.id },
    update: {},
    create: {
      userId: teacher2User.id,
      schoolName: "St. Mary's School",
      designation: 'English Teacher',
    },
  });
  console.log(`  ✅ Teacher 2: ${teacher2User.email} (${teacher2User.id}) | Profile: ${teacher2Profile.id}`);

  // ============================================
  // 5. CREATE STUDENT USERS WITH PROFILES
  // ============================================
  console.log('\n👨‍🎓 Creating student users...');
  const studentData = [
    {
      email: 'student1@essaycomp.com', password: 'student123', name: 'Arjun Patel',
      dob: new Date('2012-03-15'), schoolName: 'Delhi Public School', classGrade: '7',
      guardianName: 'Rajesh Patel', guardianRelation: 'Father', referredByTeacherId: undefined as string | undefined,
    },
    {
      email: 'student2@essaycomp.com', password: 'student123', name: 'Priya Sharma',
      dob: new Date('2011-07-22'), schoolName: 'Delhi Public School', classGrade: '8',
      guardianName: undefined, guardianRelation: undefined, referredByTeacherId: teacher1Profile.id,
    },
    {
      email: 'student3@essaycomp.com', password: 'student123', name: 'Rahul Kumar',
      dob: new Date('2010-01-10'), schoolName: "St. Mary's School", classGrade: '9',
      guardianName: undefined, guardianRelation: undefined, referredByTeacherId: undefined,
    },
    {
      email: 'student4@essaycomp.com', password: 'student123', name: 'Ananya Singh',
      dob: new Date('2009-11-05'), schoolName: "St. Mary's School", classGrade: '10',
      guardianName: undefined, guardianRelation: undefined, referredByTeacherId: teacher2Profile.id,
    },
    {
      email: 'student5@essaycomp.com', password: 'student123', name: 'Vikram Reddy',
      dob: new Date('2008-06-18'), schoolName: 'KV Hebbal', classGrade: '11',
      guardianName: undefined, guardianRelation: undefined, referredByTeacherId: undefined,
    },
    {
      email: 'student6@essaycomp.com', password: 'student123', name: 'Meera Nair',
      dob: new Date('2007-09-30'), schoolName: 'KV Hebbal', classGrade: '12',
      guardianName: undefined, guardianRelation: undefined, referredByTeacherId: teacher1Profile.id,
    },
  ];

  const studentProfiles: any[] = [];
  for (const s of studentData) {
    const user = await db.user.upsert({
      where: { email: s.email },
      update: {},
      create: {
        email: s.email,
        passwordHash: s.password,
        name: s.name,
        emailVerified: true,
        isActive: true,
      },
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.STUDENT.id } },
      update: {},
      create: { userId: user.id, roleId: roles.STUDENT.id },
    });
    const profile = await db.studentProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        dateOfBirth: s.dob,
        schoolName: s.schoolName,
        classGrade: s.classGrade,
        guardianName: s.guardianName ?? null,
        guardianRelation: s.guardianRelation ?? null,
        referredByTeacherId: s.referredByTeacherId ?? null,
      },
    });
    studentProfiles.push(profile);
    console.log(`  ✅ Student: ${s.email} (${user.id}) | Profile: ${profile.id}`);
  }

  // ============================================
  // 6. CREATE EXAMINER USERS WITH PROFILES
  // ============================================
  console.log('\n📝 Creating examiner users...');
  const examinerData = [
    { email: 'examiner1@essaycomp.com', password: 'examiner123', name: 'Prof. Verma', specialization: 'English Literature', qualification: 'Ph.D' },
    { email: 'examiner2@essaycomp.com', password: 'examiner123', name: 'Dr. Iyer', specialization: 'Creative Writing', qualification: 'M.Phil' },
    { email: 'examiner3@essaycomp.com', password: 'examiner123', name: 'Ms. Das', specialization: 'Linguistics', qualification: 'Ph.D' },
  ];

  const examinerProfiles: any[] = [];
  for (const e of examinerData) {
    const user = await db.user.upsert({
      where: { email: e.email },
      update: {},
      create: {
        email: e.email,
        passwordHash: e.password,
        name: e.name,
        emailVerified: true,
        isActive: true,
      },
    });
    await db.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: roles.EXAMINER.id } },
      update: {},
      create: { userId: user.id, roleId: roles.EXAMINER.id },
    });
    const profile = await db.examinerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        specialization: e.specialization,
        qualification: e.qualification,
        isActive: true,
      },
    });
    examinerProfiles.push(profile);
    console.log(`  ✅ Examiner: ${e.email} (${user.id}) | Profile: ${profile.id}`);
  }

  // ============================================
  // 7. CREATE COMPETITION
  // ============================================
  console.log('\n🏆 Creating competition...');
  const competition = await db.competition.create({
    data: {
      name: 'National Essay Writing Competition 2025',
      academicYear: '2024-2025',
      registrationOpenDate: new Date('2025-01-01'),
      registrationCloseDate: new Date('2025-03-31'),
      submissionOpenDate: new Date('2025-04-01'),
      submissionCloseDate: new Date('2025-04-30'),
      competitionDate: new Date('2025-04-15'),
      resultDeclarationDate: new Date('2025-06-01'),
      minAge: 10,
      maxAge: 18,
      ageCalculationDate: new Date('2025-04-01'),
      registrationFee: 100,
      status: 'REGISTRATION_OPEN',
      description: 'Annual national-level essay writing competition for school students across India.',
      rules: '1. Essays must be original and unpublished. 2. Word limit: 1000-2000 words. 3. Only individual entries allowed. 4. Decision of judges is final.',
    },
  });
  console.log(`  ✅ Competition: ${competition.name} (${competition.id})`);

  // ============================================
  // 8. CREATE COMPETITION CATEGORIES
  // ============================================
  console.log('\n📂 Creating competition categories...');
  const categoryData = [
    { name: 'Group A', minAge: 10, maxAge: 12, description: 'Age group 10-12 years' },
    { name: 'Group B', minAge: 13, maxAge: 15, description: 'Age group 13-15 years' },
    { name: 'Group C', minAge: 16, maxAge: 18, description: 'Age group 16-18 years' },
  ];

  const categories: any[] = [];
  for (const c of categoryData) {
    const category = await db.competitionCategory.create({
      data: {
        competitionId: competition.id,
        name: c.name,
        minAge: c.minAge,
        maxAge: c.maxAge,
        description: c.description,
      },
    });
    categories.push(category);
    console.log(`  ✅ Category: ${c.name} (${category.id})`);
  }

  // ============================================
  // 9. CREATE EVALUATION CRITERIA
  // ============================================
  console.log('\n📊 Creating evaluation criteria...');
  const criteriaData = [
    { name: 'Content', maxMarks: 25, description: 'Quality and depth of content', sortOrder: 1 },
    { name: 'Relevance', maxMarks: 15, description: 'Relevance to the topic', sortOrder: 2 },
    { name: 'Originality', maxMarks: 20, description: 'Originality of thought and expression', sortOrder: 3 },
    { name: 'Language & Grammar', maxMarks: 15, description: 'Language proficiency and grammatical accuracy', sortOrder: 4 },
    { name: 'Structure & Organization', maxMarks: 15, description: 'Logical structure and organization of ideas', sortOrder: 5 },
    { name: 'Presentation', maxMarks: 10, description: 'Overall presentation and formatting', sortOrder: 6 },
  ];

  const criteria: any[] = [];
  for (const c of criteriaData) {
    const criterion = await db.evaluationCriterion.create({
      data: {
        competitionId: competition.id,
        name: c.name,
        maxMarks: c.maxMarks,
        description: c.description,
        sortOrder: c.sortOrder,
      },
    });
    criteria.push(criterion);
    console.log(`  ✅ Criterion: ${c.name} (${criterion.id}) - ${c.maxMarks} marks`);
  }

  // ============================================
  // 10. CREATE SCORING CONFIG
  // ============================================
  console.log('\n⚙️ Creating scoring config...');
  const scoringConfig = await db.scoringConfig.create({
    data: {
      competitionId: competition.id,
      examinerCount: 3,
      maxMarks: 100,
      minMarks: 0,
      averagingMethod: 'MEAN',
      outlierHandling: false,
      blindEvaluation: true,
    },
  });
  console.log(`  ✅ ScoringConfig: ${scoringConfig.id} (examiners: 3, maxMarks: 100, method: MEAN, blind: true)`);

  // ============================================
  // 11. CREATE REGISTRATIONS (students 1-4)
  // ============================================
  // Category assignment based on age at 2025-04-01:
  // student1 (Arjun, DOB 2012-03-15): age ~12 → Group A (10-12)
  // student2 (Priya, DOB 2011-07-22): age ~13 → Group B (13-15)
  // student3 (Rahul, DOB 2010-01-10): age ~15 → Group B (13-15)
  // student4 (Ananya, DOB 2009-11-05): age ~15 → Group B (13-15)
  console.log('\n📝 Creating registrations...');

  const registrationData = [
    { studentIdx: 0, categoryIdx: 0, status: 'CONFIRMED', regNo: 'REG-2025-0001' }, // student1 → Group A
    { studentIdx: 1, categoryIdx: 1, status: 'PAID', regNo: 'REG-2025-0002' },       // student2 → Group B
    { studentIdx: 2, categoryIdx: 1, status: 'PENDING', regNo: 'REG-2025-0003' },   // student3 → Group B
    { studentIdx: 3, categoryIdx: 1, status: 'PAYMENT_PENDING', regNo: 'REG-2025-0004' }, // student4 → Group B
  ];

  const registrations: any[] = [];
  for (const r of registrationData) {
    const registration = await db.registration.create({
      data: {
        registrationNo: r.regNo,
        studentId: studentProfiles[r.studentIdx].id,
        competitionId: competition.id,
        categoryId: categories[r.categoryIdx].id,
        status: r.status,
        confirmedAt: (r.status === 'CONFIRMED' || r.status === 'PAID') ? new Date() : null,
      },
    });
    registrations.push(registration);
    console.log(`  ✅ Registration: ${r.regNo} (${registration.id}) - ${r.status}`);
  }

  // ============================================
  // 12. CREATE PAYMENTS (for confirmed/paid registrations)
  // ============================================
  console.log('\n💰 Creating payments...');

  const payment1 = await db.payment.create({
    data: {
      registrationId: registrations[0].id, // student1 - CONFIRMED
      razorpayOrderId: 'order_seed_001',
      razorpayPaymentId: 'pay_seed_001',
      razorpaySignature: 'sig_seed_001',
      amount: 100,
      currency: 'INR',
      status: 'CAPTURED',
      verifiedAt: new Date(),
      createdById: superAdmin.id,
    },
  });
  console.log(`  ✅ Payment 1: ${payment1.id} (${payment1.razorpayOrderId}) - ₹${payment1.amount} ${payment1.status}`);

  const payment2 = await db.payment.create({
    data: {
      registrationId: registrations[1].id, // student2 - PAID
      razorpayOrderId: 'order_seed_002',
      razorpayPaymentId: 'pay_seed_002',
      razorpaySignature: 'sig_seed_002',
      amount: 100,
      currency: 'INR',
      status: 'CAPTURED',
      verifiedAt: new Date(),
      createdById: superAdmin.id,
    },
  });
  console.log(`  ✅ Payment 2: ${payment2.id} (${payment2.razorpayOrderId}) - ₹${payment2.amount} ${payment2.status}`);

  // ============================================
  // 13. CREATE ESSAY SUBMISSIONS (for confirmed registrations)
  // ============================================
  console.log('\n📄 Creating essay submissions...');

  const essay1 = await db.essaySubmission.create({
    data: {
      registrationId: registrations[0].id, // student1's registration
      studentId: studentProfiles[0].id,
      competitionId: competition.id,
      fileName: 'arjun_patel_essay.pdf',
      originalName: 'My Vision for India.pdf',
      fileSize: 245760,
      mimeType: 'application/pdf',
      status: 'SUBMITTED',
      submittedAt: new Date(),
    },
  });
  console.log(`  ✅ Essay 1: ${essay1.id} by Arjun Patel - ${essay1.status}`);

  const essay2 = await db.essaySubmission.create({
    data: {
      registrationId: registrations[1].id, // student2's registration
      studentId: studentProfiles[1].id,
      competitionId: competition.id,
      fileName: 'priya_sharma_essay.pdf',
      originalName: 'The Power of Education.pdf',
      fileSize: 312320,
      mimeType: 'application/pdf',
      status: 'VALID',
      submittedAt: new Date(),
      validatedAt: new Date(),
      validationNotes: 'Essay validated successfully. Meets all criteria.',
    },
  });
  console.log(`  ✅ Essay 2: ${essay2.id} by Priya Sharma - ${essay2.status}`);

  // ============================================
  // 14. CREATE EXAMINER ASSIGNMENTS (3 examiners per essay)
  // ============================================
  console.log('\n👤 Creating examiner assignments...');

  const assignmentResults: any[] = [];
  for (const essay of [essay1, essay2]) {
    for (const examiner of examinerProfiles) {
      const assignment = await db.examinerAssignment.create({
        data: {
          essayId: essay.id,
          examinerId: examiner.id,
          assignedBy: superAdmin.id,
          status: 'ASSIGNED',
          deadline: new Date('2025-05-15'),
        },
      });
      assignmentResults.push(assignment);
      const examinerName = examinerData.find(e => e.email.includes(examiner.id)) ? '' : '';
      console.log(`  ✅ Assignment: ${assignment.id} - Essay ${essay.id.substring(0, 6)}... → Examiner ${examiner.id.substring(0, 6)}...`);
    }
  }

  // ============================================
  // 15. CREATE SYSTEM SETTINGS
  // ============================================
  console.log('\n⚙️ Creating system settings...');

  const settingsData = [
    // GENERAL
    { key: 'org_name', value: 'EssayComp', category: 'GENERAL', type: 'STRING' },
    { key: 'org_email', value: 'info@essaycomp.com', category: 'GENERAL', type: 'STRING' },
    { key: 'org_phone', value: '+91-XXXX-XXXXXX', category: 'GENERAL', type: 'STRING' },
    { key: 'timezone', value: 'Asia/Kolkata', category: 'GENERAL', type: 'STRING' },
    // COMPETITION
    { key: 'default_fee', value: '100', category: 'COMPETITION', type: 'NUMBER' },
    { key: 'max_essay_size_mb', value: '5', category: 'COMPETITION', type: 'NUMBER' },
    // PAYMENT
    { key: 'currency', value: 'INR', category: 'PAYMENT', type: 'STRING' },
    { key: 'payment_mode', value: 'TEST', category: 'PAYMENT', type: 'STRING' },
    // EMAIL
    { key: 'sender_name', value: 'EssayComp', category: 'EMAIL', type: 'STRING' },
    { key: 'sender_email', value: 'noreply@essaycomp.com', category: 'EMAIL', type: 'STRING' },
    // EXAMINATION
    { key: 'default_examiner_count', value: '3', category: 'EXAMINATION', type: 'NUMBER' },
    { key: 'default_averaging', value: 'MEAN', category: 'EXAMINATION', type: 'STRING' },
    { key: 'blind_evaluation_default', value: 'true', category: 'EXAMINATION', type: 'BOOLEAN' },
  ];

  const settings: any[] = [];
  for (const s of settingsData) {
    const setting = await db.systemSetting.upsert({
      where: { key: s.key },
      update: { value: s.value, category: s.category, type: s.type },
      create: s,
    });
    settings.push(setting);
    console.log(`  ✅ Setting: ${s.key} = ${s.value} (${s.category})`);
  }

  // ============================================
  // 16. CREATE ANNOUNCEMENTS AND NOTIFICATIONS
  // ============================================
  console.log('\n📢 Creating announcements...');

  const announcement1 = await db.announcement.create({
    data: {
      title: 'Registration Now Open!',
      message: 'Registrations for the National Essay Writing Competition 2025 are now open. Please register before March 31, 2025.',
      audience: 'ALL',
      competitionId: competition.id,
      status: 'PUBLISHED',
      createdBy: superAdmin.id,
    },
  });
  console.log(`  ✅ Announcement 1: ${announcement1.id} - "${announcement1.title}"`);

  const announcement2 = await db.announcement.create({
    data: {
      title: 'Essay Topics Released',
      message: 'The essay topics for the National Essay Writing Competition 2025 have been released. Please check the competition page for details.',
      audience: 'STUDENT',
      competitionId: competition.id,
      status: 'PUBLISHED',
      createdBy: admin.id,
    },
  });
  console.log(`  ✅ Announcement 2: ${announcement2.id} - "${announcement2.title}"`);

  const announcement3 = await db.announcement.create({
    data: {
      title: 'Important: Submission Guidelines',
      message: 'All participants must submit their essays in PDF format. The file size must not exceed 5MB. Submissions open on April 1, 2025.',
      audience: 'STUDENT',
      competitionId: competition.id,
      status: 'PUBLISHED',
      createdBy: admin.id,
    },
  });
  console.log(`  ✅ Announcement 3: ${announcement3.id} - "${announcement3.title}"`);

  console.log('\n🔔 Creating notifications...');

  const notification1 = await db.notification.create({
    data: {
      userId: superAdmin.id,
      title: 'System Initialized',
      message: 'The EssayComp system has been successfully initialized with seed data.',
      type: 'INFO',
    },
  });
  console.log(`  ✅ Notification 1: ${notification1.id} - "${notification1.title}" → Super Admin`);

  const notification2 = await db.notification.create({
    data: {
      userId: admin.id,
      title: 'Competition Created',
      message: 'National Essay Writing Competition 2025 has been created and is now open for registration.',
      type: 'INFO',
    },
  });
  console.log(`  ✅ Notification 2: ${notification2.id} - "${notification2.title}" → Admin`);

  const notification3 = await db.notification.create({
    data: {
      userId: studentProfiles[0].userId,
      title: 'Registration Confirmed',
      message: 'Your registration for National Essay Writing Competition 2025 has been confirmed. You can now submit your essay.',
      type: 'SUCCESS',
    },
  });
  console.log(`  ✅ Notification 3: ${notification3.id} - "${notification3.title}" → Arjun Patel`);

  const notification4 = await db.notification.create({
    data: {
      userId: studentProfiles[1].userId,
      title: 'Payment Received',
      message: 'Your payment of ₹100 for National Essay Writing Competition 2025 has been received successfully.',
      type: 'SUCCESS',
    },
  });
  console.log(`  ✅ Notification 4: ${notification4.id} - "${notification4.title}" → Priya Sharma`);

  // Create user notifications (linking announcements to users)
  console.log('\n📬 Creating user notifications...');

  const allStudentUsers = studentProfiles.map(sp => sp.userId);
  for (const userId of allStudentUsers) {
    await db.userNotification.create({
      data: {
        userId,
        announcementId: announcement1.id,
        isRead: false,
      },
    });
  }
  console.log(`  ✅ UserNotification: Announcement 1 → ${allStudentUsers.length} students`);

  for (const userId of allStudentUsers) {
    await db.userNotification.create({
      data: {
        userId,
        announcementId: announcement2.id,
        isRead: false,
      },
    });
  }
  console.log(`  ✅ UserNotification: Announcement 2 → ${allStudentUsers.length} students`);

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n' + '='.repeat(60));
  console.log('✅ SEEDING COMPLETE - SUMMARY OF CREATED RECORDS');
  console.log('='.repeat(60));

  console.log('\n📋 ROLES (5):');
  for (const r of roleData) {
    console.log(`  ${roles[r.name].id} | ${r.name}`);
  }

  console.log('\n👤 USERS (13):');
  console.log(`  ${superAdmin.id} | admin@essaycomp.com | System Administrator [SUPER_ADMIN]`);
  console.log(`  ${admin.id} | ops@essaycomp.com | Operations Admin [ADMIN]`);
  console.log(`  ${teacher1User.id} | teacher@essaycomp.com | Dr. Sharma [TEACHER]`);
  console.log(`  ${teacher2User.id} | teacher2@essaycomp.com | Ms. Gupta [TEACHER]`);
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const sp = studentProfiles[i];
    console.log(`  ${sp.userId} | ${s.email} | ${s.name} [STUDENT] (Profile: ${sp.id})`);
  }
  for (let i = 0; i < examinerData.length; i++) {
    const e = examinerData[i];
    const ep = examinerProfiles[i];
    console.log(`  ${ep.userId} | ${e.email} | ${e.name} [EXAMINER] (Profile: ${ep.id})`);
  }

  console.log('\n👨‍🏫 TEACHER PROFILES (2):');
  console.log(`  ${teacher1Profile.id} | Dr. Sharma | Delhi Public School | Senior Teacher`);
  console.log(`  ${teacher2Profile.id} | Ms. Gupta | St. Mary's School | English Teacher`);

  console.log('\n👨‍🎓 STUDENT PROFILES (6):');
  for (let i = 0; i < studentData.length; i++) {
    const s = studentData[i];
    const sp = studentProfiles[i];
    console.log(`  ${sp.id} | ${s.name} | DOB: ${s.dob.toISOString().split('T')[0]} | ${s.schoolName} | Class ${s.classGrade}${s.referredByTeacherId ? ' (referred)' : ''}`);
  }

  console.log('\n📝 EXAMINER PROFILES (3):');
  for (let i = 0; i < examinerData.length; i++) {
    const e = examinerData[i];
    const ep = examinerProfiles[i];
    console.log(`  ${ep.id} | ${e.name} | ${e.specialization} | ${e.qualification}`);
  }

  console.log('\n🏆 COMPETITION (1):');
  console.log(`  ${competition.id} | ${competition.name} | ${competition.status}`);

  console.log('\n📂 CATEGORIES (3):');
  for (const c of categories) {
    console.log(`  ${c.id} | ${c.name} | Age ${c.minAge}-${c.maxAge}`);
  }

  console.log('\n📊 EVALUATION CRITERIA (6):');
  for (const c of criteria) {
    console.log(`  ${c.id} | ${c.name} | ${c.maxMarks} marks`);
  }

  console.log('\n⚙️ SCORING CONFIG (1):');
  console.log(`  ${scoringConfig.id} | Examiners: ${scoringConfig.examinerCount} | Max: ${scoringConfig.maxMarks} | Method: ${scoringConfig.averagingMethod} | Blind: ${scoringConfig.blindEvaluation}`);

  console.log('\n📝 REGISTRATIONS (4):');
  for (const r of registrations) {
    console.log(`  ${r.id} | ${r.registrationNo} | ${r.status}`);
  }

  console.log('\n💰 PAYMENTS (2):');
  console.log(`  ${payment1.id} | ${payment1.razorpayOrderId} | ₹${payment1.amount} | ${payment1.status}`);
  console.log(`  ${payment2.id} | ${payment2.razorpayOrderId} | ₹${payment2.amount} | ${payment2.status}`);

  console.log('\n📄 ESSAY SUBMISSIONS (2):');
  console.log(`  ${essay1.id} | Arjun Patel | ${essay1.status}`);
  console.log(`  ${essay2.id} | Priya Sharma | ${essay2.status}`);

  console.log(`\n👤 EXAMINER ASSIGNMENTS (${assignmentResults.length}):`);
  for (const a of assignmentResults) {
    console.log(`  ${a.id} | Essay: ${a.essayId.substring(0, 8)}... | Examiner: ${a.examinerId.substring(0, 8)}... | ${a.status}`);
  }

  console.log(`\n⚙️ SYSTEM SETTINGS (${settings.length}):`);
  for (const s of settings) {
    console.log(`  ${s.id} | ${s.key} = ${s.value} [${s.category}]`);
  }

  console.log('\n📢 ANNOUNCEMENTS (3):');
  console.log(`  ${announcement1.id} | ${announcement1.title} | ${announcement1.audience} | ${announcement1.status}`);
  console.log(`  ${announcement2.id} | ${announcement2.title} | ${announcement2.audience} | ${announcement2.status}`);
  console.log(`  ${announcement3.id} | ${announcement3.title} | ${announcement3.audience} | ${announcement3.status}`);

  console.log('\n🔔 NOTIFICATIONS (4):');
  console.log(`  ${notification1.id} | ${notification1.title} → Super Admin`);
  console.log(`  ${notification2.id} | ${notification2.title} → Admin`);
  console.log(`  ${notification3.id} | ${notification3.title} → Arjun Patel`);
  console.log(`  ${notification4.id} | ${notification4.title} → Priya Sharma`);

  console.log('\n' + '='.repeat(60));
  console.log('🌱 All seed data has been successfully created!');
  console.log('='.repeat(60));
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
