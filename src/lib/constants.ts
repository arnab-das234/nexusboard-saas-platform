import type {
  UserRole,
  CompetitionStatus,
  PaymentStatus,
  RegistrationStatus,
  EssayStatus,
  EvaluationStatus,
  AdminPermission,
  SettingCategory,
  NavView,
} from './types';

// ============ ROLE LABELS ============
export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  TEACHER: 'Teacher',
  STUDENT: 'Student',
  EXAMINER: 'Examiner',
};

// ============ COMPETITION STATUS ============
export const COMPETITION_STATUS_LABELS: Record<CompetitionStatus, string> = {
  DRAFT: 'Draft',
  REGISTRATION_OPEN: 'Registration Open',
  REGISTRATION_CLOSED: 'Registration Closed',
  SUBMISSION_OPEN: 'Submission Open',
  SUBMISSION_CLOSED: 'Submission Closed',
  EVALUATION_IN_PROGRESS: 'Evaluation In Progress',
  RESULT_PENDING: 'Result Pending',
  RESULT_PUBLISHED: 'Result Published',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const COMPETITION_STATUS_COLORS: Record<CompetitionStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  REGISTRATION_OPEN: 'bg-emerald-100 text-emerald-700',
  REGISTRATION_CLOSED: 'bg-amber-100 text-amber-700',
  SUBMISSION_OPEN: 'bg-emerald-100 text-emerald-700',
  SUBMISSION_CLOSED: 'bg-amber-100 text-amber-700',
  EVALUATION_IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESULT_PENDING: 'bg-purple-100 text-purple-700',
  RESULT_PUBLISHED: 'bg-teal-100 text-teal-700',
  COMPLETED: 'bg-slate-100 text-slate-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

// ============ PAYMENT STATUS ============
export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  CREATED: 'Created',
  PENDING: 'Pending',
  SUCCESS: 'Success',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
  PARTIALLY_REFUNDED: 'Partially Refunded',
  CANCELLED: 'Cancelled',
};

export const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  CREATED: 'bg-gray-100 text-gray-700',
  PENDING: 'bg-amber-100 text-amber-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  REFUNDED: 'bg-orange-100 text-orange-700',
  PARTIALLY_REFUNDED: 'bg-orange-100 text-orange-700',
  CANCELLED: 'bg-slate-100 text-slate-700',
};

// ============ REGISTRATION STATUS ============
export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING: 'Pending',
  VERIFIED: 'Verified',
  PAYMENT_PENDING: 'Payment Pending',
  PAID: 'Paid',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
};

// ============ ESSAY STATUS ============
export const ESSAY_STATUS_LABELS: Record<EssayStatus, string> = {
  NOT_STARTED: 'Not Started',
  UPLOAD_PENDING: 'Upload Pending',
  UPLOADING: 'Uploading',
  VALIDATING: 'Validating',
  VALID: 'Valid',
  INVALID: 'Invalid',
  SUBMITTED: 'Submitted',
  LOCKED: 'Locked',
  UNDER_EVALUATION: 'Under Evaluation',
  EVALUATED: 'Evaluated',
  RESULT_PUBLISHED: 'Result Published',
};

// ============ EVALUATION STATUS ============
export const EVALUATION_STATUS_LABELS: Record<EvaluationStatus, string> = {
  ASSIGNED: 'Assigned',
  IN_PROGRESS: 'In Progress',
  SUBMITTED: 'Submitted',
  LOCKED: 'Locked',
};

// ============ PERMISSION LABELS ============
export const PERMISSION_LABELS: Record<AdminPermission, string> = {
  STUDENT_VIEW: 'View Students',
  STUDENT_EDIT: 'Edit Students',
  TEACHER_VIEW: 'View Teachers',
  TEACHER_EDIT: 'Edit Teachers',
  EXAMINER_MANAGE: 'Manage Examiners',
  COMPETITION_MANAGE: 'Manage Competitions',
  PAYMENT_VIEW: 'View Payments',
  PAYMENT_MANAGE: 'Manage Payments',
  EXAM_ASSIGN: 'Assign Exams',
  RESULT_VIEW: 'View Results',
  RESULT_MANAGE: 'Manage Results',
  NOTIFICATION_MANAGE: 'Manage Notifications',
  AUDIT_VIEW: 'View Audit Logs',
  SETTINGS_MANAGE: 'Manage Settings',
  ADMIN_MANAGE: 'Manage Admins',
};

// ============ SETTING CATEGORIES ============
export const SETTING_CATEGORY_LABELS: Record<SettingCategory, string> = {
  GENERAL: 'General',
  COMPETITION: 'Competition',
  PAYMENT: 'Payment',
  EMAIL: 'Email',
  STORAGE: 'Storage',
  SECURITY: 'Security',
  EXAMINATION: 'Examination',
  NOTIFICATION: 'Notifications',
};

// ============ NAVIGATION STRUCTURE ============
export interface NavItem {
  label: string;
  view?: NavView;
  icon: string;
  roles: UserRole[];
  children?: NavItem[];
}

export const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'admin-dashboard', icon: 'LayoutDashboard', roles: ['SUPER_ADMIN', 'ADMIN'] },
  {
    label: 'Users', icon: 'Users', roles: ['SUPER_ADMIN', 'ADMIN'], children: [
      { label: 'Students', view: 'admin-students', icon: 'GraduationCap', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Teachers', view: 'admin-teachers', icon: 'BookOpen', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Examiners', view: 'admin-examiners', icon: 'ClipboardCheck', roles: ['SUPER_ADMIN', 'ADMIN'] },
      { label: 'Administrators', view: 'admin-admins', icon: 'Shield', roles: ['SUPER_ADMIN'] },
    ]
  },
  { label: 'Competitions', view: 'admin-competitions', icon: 'Trophy', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Registrations', view: 'admin-registrations', icon: 'FileText', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Finance', view: 'admin-finance', icon: 'IndianRupee', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Essays', view: 'admin-essays', icon: 'FileUp', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Examination', view: 'admin-examination', icon: 'PenTool', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Results', view: 'admin-results', icon: 'Award', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Announcements', view: 'admin-announcements', icon: 'Megaphone', roles: ['SUPER_ADMIN', 'ADMIN'] },
  { label: 'Audit Logs', view: 'admin-audit', icon: 'ScrollText', roles: ['SUPER_ADMIN'] },
  { label: 'Settings', view: 'admin-settings', icon: 'Settings', roles: ['SUPER_ADMIN'] },
];

export const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'student-dashboard', icon: 'LayoutDashboard', roles: ['STUDENT'] },
  { label: 'Profile', view: 'student-profile', icon: 'User', roles: ['STUDENT'] },
  { label: 'Competitions', view: 'student-competitions', icon: 'Trophy', roles: ['STUDENT'] },
  { label: 'My Essay', view: 'student-essay', icon: 'FileUp', roles: ['STUDENT'] },
  { label: 'Payment', view: 'student-payment', icon: 'IndianRupee', roles: ['STUDENT'] },
  { label: 'Results', view: 'student-results', icon: 'Award', roles: ['STUDENT'] },
  { label: 'Notifications', view: 'student-notifications', icon: 'Bell', roles: ['STUDENT'] },
];

export const TEACHER_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'teacher-dashboard', icon: 'LayoutDashboard', roles: ['TEACHER'] },
  { label: 'Profile', view: 'teacher-profile', icon: 'User', roles: ['TEACHER'] },
  { label: 'My Students', view: 'teacher-students', icon: 'GraduationCap', roles: ['TEACHER'] },
  { label: 'Add Student', view: 'teacher-add-student', icon: 'UserPlus', roles: ['TEACHER'] },
  { label: 'Notifications', view: 'teacher-notifications', icon: 'Bell', roles: ['TEACHER'] },
];

export const EXAMINER_NAV: NavItem[] = [
  { label: 'Dashboard', view: 'examiner-dashboard', icon: 'LayoutDashboard', roles: ['EXAMINER'] },
  { label: 'Evaluation Workspace', view: 'examiner-workspace', icon: 'PenTool', roles: ['EXAMINER'] },
  { label: 'Notifications', view: 'examiner-notifications', icon: 'Bell', roles: ['EXAMINER'] },
];

// ============ STATE MACHINE TRANSITIONS ============
export const REGISTRATION_TRANSITIONS: Record<RegistrationStatus, RegistrationStatus[]> = {
  PENDING: ['VERIFIED', 'CANCELLED'],
  VERIFIED: ['PAYMENT_PENDING', 'CANCELLED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED'],
  PAID: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: [],
  CANCELLED: [],
};

export const ESSAY_TRANSITIONS: Record<EssayStatus, EssayStatus[]> = {
  NOT_STARTED: ['UPLOAD_PENDING', 'UPLOADING'],
  UPLOAD_PENDING: ['UPLOADING', 'INVALID'],
  UPLOADING: ['VALIDATING'],
  VALIDATING: ['VALID', 'INVALID'],
  VALID: ['SUBMITTED'],
  INVALID: ['UPLOAD_PENDING'],
  SUBMITTED: ['LOCKED'],
  LOCKED: ['UNDER_EVALUATION'],
  UNDER_EVALUATION: ['EVALUATED'],
  EVALUATED: ['RESULT_PUBLISHED'],
  RESULT_PUBLISHED: [],
};

// ============ DEFAULT VALUES ============
export const DEFAULT_REGISTRATION_FEE = 100;
export const MAX_ESSAY_SIZE_MB = 5;
export const MAX_ESSAY_SIZE_BYTES = 5 * 1024 * 1024;
export const DEFAULT_EXAMINER_COUNT = 3;
export const DEFAULT_MAX_MARKS = 100;
