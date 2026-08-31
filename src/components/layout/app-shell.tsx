'use client';

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';

import { useAuthStore, useNavStore } from '@/lib/store';
import type { NavView, UserRole } from '@/lib/types';

import { AppSidebar } from './app-sidebar';
import { AppHeader } from './app-header';
import { LoginView } from '@/components/auth/login-view';
import { RegisterView } from '@/components/auth/register-view';

// ── Admin views ───────────────────────────────────────────────────────────────
import { AdminDashboardView } from '@/components/admin/dashboard-view';
import { AdminStudentsView } from '@/components/admin/students-view';
import { AdminTeachersView } from '@/components/admin/teachers-view';
import { AdminExaminersView } from '@/components/admin/examiners-view';
import { AdminCompetitionsView } from '@/components/admin/competitions-view';
import { AdminRegistrationsView } from '@/components/admin/registrations-view';
import { AdminFinanceView } from '@/components/admin/finance-view';
import { AdminEssaysView } from '@/components/admin/essays-view';
import { AdminExaminationView } from '@/components/admin/examination-view';
import { AdminResultsView } from '@/components/admin/results-view';
import { AdminAnnouncementsView } from '@/components/admin/announcements-view';
import { AdminAuditView } from '@/components/admin/audit-view';
import { AdminSettingsView } from '@/components/admin/settings-view';

// ── Student views ───────────────────────────────────────────────────────────
import { StudentDashboardView } from '@/components/student/dashboard-view';
import { StudentProfileView } from '@/components/student/profile-view';
import { StudentCompetitionsView } from '@/components/student/competitions-view';
import { StudentEssayView } from '@/components/student/essay-view';
import { StudentPaymentView } from '@/components/student/payment-view';
import { StudentResultsView } from '@/components/student/results-view';
import { StudentNotificationsView } from '@/components/student/notifications-view';

// ── Teacher views ───────────────────────────────────────────────────────────
import { TeacherDashboardView } from '@/components/teacher/dashboard-view';
import { TeacherProfileView } from '@/components/teacher/profile-view';
import { TeacherStudentsView } from '@/components/teacher/students-view';
import { TeacherAddStudentView } from '@/components/teacher/add-student-view';
import { TeacherNotificationsView } from '@/components/teacher/notifications-view';

// ── Examiner views ─────────────────────────────────────────────────────────
import { ExaminerDashboardView } from '@/components/examiner/dashboard-view';
import { ExaminerWorkspaceView } from '@/components/examiner/workspace-view';
import { ExaminerNotificationsView } from '@/components/examiner/notifications-view';

// ── Placeholder component for views not yet built ──────────────────────────
function PlaceholderView({ view }: { view: string }) {
  const label = view
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-emerald-50">
          <span className="text-2xl font-bold text-emerald-600">{label.charAt(0)}</span>
        </div>
        <h2 className="text-lg font-semibold text-slate-800">{label}</h2>
        <p className="mt-1 text-sm text-slate-500">This view is coming soon.</p>
      </div>
    </div>
  );
}

// ── View router ─────────────────────────────────────────────────────────────
function AuthRouter() {
  const currentView = useNavStore((s) => s.currentView);

  switch (currentView) {
    case 'login':
      return <LoginView />;
    case 'register':
    case 'register-teacher':
      return <RegisterView />;
    case 'forgot-password':
      return <PlaceholderView view={currentView} />;
    default:
      return <LoginView />;
  }
}

function AppRouter() {
  const currentView = useNavStore((s) => s.currentView);

  switch (currentView) {
    // Admin views
    case 'admin-dashboard':      return <AdminDashboardView />;
    case 'admin-students':       return <AdminStudentsView />;
    case 'admin-teachers':       return <AdminTeachersView />;
    case 'admin-examiners':      return <AdminExaminersView />;
    case 'admin-competitions':   return <AdminCompetitionsView />;
    case 'admin-registrations':  return <AdminRegistrationsView />;
    case 'admin-finance':        return <AdminFinanceView />;
    case 'admin-essays':         return <AdminEssaysView />;
    case 'admin-examination':    return <AdminExaminationView />;
    case 'admin-results':        return <AdminResultsView />;
    case 'admin-announcements':  return <AdminAnnouncementsView />;
    case 'admin-audit':          return <AdminAuditView />;
    case 'admin-settings':       return <AdminSettingsView />;
    // Student views
    case 'student-dashboard':      return <StudentDashboardView />;
    case 'student-profile':        return <StudentProfileView />;
    case 'student-competitions':   return <StudentCompetitionsView />;
    case 'student-essay':          return <StudentEssayView />;
    case 'student-payment':        return <StudentPaymentView />;
    case 'student-results':        return <StudentResultsView />;
    case 'student-notifications':  return <StudentNotificationsView />;
    // Teacher views
    case 'teacher-dashboard':      return <TeacherDashboardView />;
    case 'teacher-profile':        return <TeacherProfileView />;
    case 'teacher-students':       return <TeacherStudentsView />;
    case 'teacher-add-student':    return <TeacherAddStudentView />;
    case 'teacher-notifications':  return <TeacherNotificationsView />;
    // Examiner views
    case 'examiner-dashboard':       return <ExaminerDashboardView />;
    case 'examiner-workspace':      return <ExaminerWorkspaceView />;
    case 'examiner-notifications':  return <ExaminerNotificationsView />;
    // Other views — placeholder until implemented
    default:
      return <PlaceholderView view={currentView} />;
  }
}

// ── Main shell ───────────────────────────────────────────────────────────────
export function AppShell() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavStore((s) => s.navigate);

  // Auto-navigate to correct dashboard on mount or after login
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.roles[0];
      const cur = useNavStore.getState().currentView;
      // Only auto-navigate from auth views
      const authViews: NavView[] = ['login', 'register', 'register-teacher', 'forgot-password'];
      if (authViews.includes(cur)) {
        switch (role) {
          case 'SUPER_ADMIN':
          case 'ADMIN':
            navigate('admin-dashboard');
            break;
          case 'STUDENT':
            navigate('student-dashboard');
            break;
          case 'TEACHER':
            navigate('teacher-dashboard');
            break;
          case 'EXAMINER':
            navigate('examiner-dashboard');
            break;
        }
      }
    }
  }, [isAuthenticated, user, navigate]);

  return (
    <AnimatePresence mode="wait">
      {isAuthenticated ? (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-svh w-full"
        >
          <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
              <AppHeader />
              <div className="flex-1 overflow-auto">
                <AppRouter />
              </div>
            </SidebarInset>
          </SidebarProvider>
        </motion.div>
      ) : (
        <motion.div
          key="auth"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex min-h-svh w-full items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30"
        >
          <AuthRouter />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
