// ============ ROLES ============
export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'TEACHER' | 'STUDENT' | 'EXAMINER';

// ============ COMPETITION ============
export type CompetitionStatus =
  | 'DRAFT'
  | 'REGISTRATION_OPEN'
  | 'REGISTRATION_CLOSED'
  | 'SUBMISSION_OPEN'
  | 'SUBMISSION_CLOSED'
  | 'EVALUATION_IN_PROGRESS'
  | 'RESULT_PENDING'
  | 'RESULT_PUBLISHED'
  | 'COMPLETED'
  | 'CANCELLED';

// ============ PAYMENT ============
export type PaymentStatus =
  | 'CREATED'
  | 'PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED'
  | 'CANCELLED';

// ============ REGISTRATION ============
export type RegistrationStatus =
  | 'PENDING'
  | 'VERIFIED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'CANCELLED';

// ============ ESSAY ============
export type EssayStatus =
  | 'NOT_STARTED'
  | 'UPLOAD_PENDING'
  | 'UPLOADING'
  | 'VALIDATING'
  | 'VALID'
  | 'INVALID'
  | 'SUBMITTED'
  | 'LOCKED'
  | 'UNDER_EVALUATION'
  | 'EVALUATED'
  | 'RESULT_PUBLISHED';

// ============ EVALUATION ============
export type EvaluationStatus = 'ASSIGNED' | 'IN_PROGRESS' | 'SUBMITTED' | 'LOCKED';

// ============ NOTIFICATION ============
export type NotificationAudience =
  | 'ALL'
  | 'ALL_STUDENTS'
  | 'REGISTERED_STUDENTS'
  | 'COMPETITION_STUDENTS'
  | 'TEACHERS'
  | 'EXAMINERS'
  | 'SPECIFIC_USERS';

export type NotificationType = 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR';

// ============ ADMIN PERMISSIONS ============
export type AdminPermission =
  | 'STUDENT_VIEW'
  | 'STUDENT_EDIT'
  | 'TEACHER_VIEW'
  | 'TEACHER_EDIT'
  | 'EXAMINER_MANAGE'
  | 'COMPETITION_MANAGE'
  | 'PAYMENT_VIEW'
  | 'PAYMENT_MANAGE'
  | 'EXAM_ASSIGN'
  | 'RESULT_VIEW'
  | 'RESULT_MANAGE'
  | 'NOTIFICATION_MANAGE'
  | 'AUDIT_VIEW'
  | 'SETTINGS_MANAGE'
  | 'ADMIN_MANAGE';

// ============ SETTINGS ============
export type SettingCategory =
  | 'GENERAL'
  | 'COMPETITION'
  | 'PAYMENT'
  | 'EMAIL'
  | 'STORAGE'
  | 'SECURITY'
  | 'EXAMINATION'
  | 'NOTIFICATION';

// ============ NAVIGATION ============
export type NavView =
  // Auth
  | 'login'
  | 'register'
  | 'register-teacher'
  | 'forgot-password'
  // Admin
  | 'admin-dashboard'
  | 'admin-students'
  | 'admin-teachers'
  | 'admin-examiners'
  | 'admin-admins'
  | 'admin-competitions'
  | 'admin-registrations'
  | 'admin-finance'
  | 'admin-essays'
  | 'admin-examination'
  | 'admin-results'
  | 'admin-announcements'
  | 'admin-audit'
  | 'admin-settings'
  // Student
  | 'student-dashboard'
  | 'student-profile'
  | 'student-competitions'
  | 'student-essay'
  | 'student-payment'
  | 'student-results'
  | 'student-notifications'
  // Teacher
  | 'teacher-dashboard'
  | 'teacher-profile'
  | 'teacher-students'
  | 'teacher-add-student'
  | 'teacher-notifications'
  // Examiner
  | 'examiner-dashboard'
  | 'examiner-workspace'
  | 'examiner-notifications';

// ============ API RESPONSES ============
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============ FORM DATA ============
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  name: string;
  phone?: string;
  role: 'STUDENT' | 'TEACHER';
}

export interface StudentProfileFormData {
  dateOfBirth: string;
  gender?: string;
  address?: string;
  schoolName: string;
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
}

export interface TeacherProfileFormData {
  schoolName: string;
  schoolAddress?: string;
  designation?: string;
  employeeId?: string;
  address?: string;
}

export interface CompetitionFormData {
  name: string;
  description?: string;
  academicYear?: string;
  startDate?: string;
  registrationOpenDate?: string;
  registrationCloseDate?: string;
  submissionOpenDate?: string;
  submissionCloseDate?: string;
  competitionDate?: string;
  resultDeclarationDate?: string;
  minAge: number;
  maxAge: number;
  ageCalculationDate: string;
  registrationFee: number;
  maxEssayFileSize?: number;
  rules?: string;
  categories: { name: string; minAge: number; maxAge: number; description?: string }[];
  criteria: { name: string; maxMarks: number; description?: string }[];
}

// ============ DASHBOARD STATS ============
export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalExaminers: number;
  activeCompetitions: number;
  totalRegistrations: number;
  paidRegistrations: number;
  pendingPayments: number;
  totalRevenue: number;
  essaysSubmitted: number;
  essaysPendingEval: number;
  completedEvaluations: number;
  resultsPending: number;
  resultsPublished: number;
}

// ============ PROJECT (Competition-mapped) ============
export type ProjectStatus = 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Project {
  id: string;
  name: string;
  key: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  budget: number | null;
  spent: number | null;
  progress: number;
  taskCount: number;
  createdAt: string;
}

// ============ TEAM MEMBER ============
export type TeamRole = 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';

export interface TeamMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  taskCount: number;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    isActive: boolean;
  };
}

// ============ USER SESSION ============
export interface UserSession {
  id: string;
  email: string;
  name: string | null;
  roles: UserRole[];
  avatar?: string | null;
  emailVerified: boolean;
  isActive: boolean;
}
