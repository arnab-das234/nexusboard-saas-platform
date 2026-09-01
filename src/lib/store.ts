import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserSession, UserRole, NavView } from './types';

// ============ AUTH STORE ============
interface AuthState {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: UserSession) => void;
  logout: () => void;
  updateUser: (data: Partial<UserSession>) => void;
  setLoading: (loading: boolean) => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      login: (user) => set({ user, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, isAuthenticated: false }),
      updateUser: (data) => set((s) => ({ user: s.user ? { ...s.user, ...data } : null })),
      setLoading: (loading) => set({ isLoading: loading }),
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
      hasAnyRole: (roles) => roles.some((r) => get().user?.roles.includes(r) ?? false),
    }),
    { name: 'essay-auth' }
  )
);

// ============ NAVIGATION STORE ============
interface NavState {
  currentView: NavView;
  sidebarOpen: boolean;
  breadcrumbs: { label: string; view?: NavView }[];
  navigate: (view: NavView) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setBreadcrumbs: (items: { label: string; view?: NavView }[]) => void;
  pushBreadcrumb: (item: { label: string; view?: NavView }) => void;
}

export const useNavStore = create<NavState>()((set) => ({
  currentView: 'login',
  sidebarOpen: true,
  breadcrumbs: [],
  navigate: (view) => {
    set((s) => ({
      currentView: view,
      breadcrumbs: s.breadcrumbs.length > 0
        ? [...s.breadcrumbs.filter(b => b.view === undefined), { label: view.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '), view }]
        : [],
    }));
  },
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setBreadcrumbs: (items) => set({ breadcrumbs: items }),
  pushBreadcrumb: (item) => set((s) => ({ breadcrumbs: [...s.breadcrumbs, item] })),
}));

// ============ APP DATA STORE ============
interface AppState {
  notifications: Array<{ id: string; title: string; message: string; isRead: boolean; createdAt: string }>;
  unreadCount: number;
  setNotifications: (notifications: AppState['notifications']) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const useAppStore = create<AppState>()((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
  }),
  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      );
      return { notifications: updated, unreadCount: updated.filter((n) => !n.isRead).length };
    }),
  markAllAsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
      unreadCount: 0,
    })),
}));
