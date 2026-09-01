'use client';

import React, { useMemo } from 'react';
import { PenTool, LogOut, ChevronRight, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthStore, useNavStore } from '@/lib/store';
import { ADMIN_NAV, STUDENT_NAV, TEACHER_NAV, EXAMINER_NAV, ROLE_LABELS, type NavItem } from '@/lib/constants';
import type { NavView, UserRole } from '@/lib/types';

// ── Icon map ──────────────────────────────────────────────────────────────────
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Shield,
  Trophy,
  FileText,
  IndianRupee,
  FileUp,
  Award,
  Megaphone,
  ScrollText,
  Settings,
  Bell,
  UserPlus,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  ClipboardCheck,
  Shield,
  Trophy,
  FileText,
  IndianRupee,
  FileUp,
  PenTool,
  Award,
  Megaphone,
  ScrollText,
  Settings,
  Bell,
  User,
  UserPlus,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function getNavForRole(role: UserRole): NavItem[] {
  switch (role) {
    case 'SUPER_ADMIN':
    case 'ADMIN':
      return ADMIN_NAV;
    case 'STUDENT':
      return STUDENT_NAV;
    case 'TEACHER':
      return TEACHER_NAV;
    case 'EXAMINER':
      return EXAMINER_NAV;
    default:
      return [];
  }
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

// ── Sub-menu item ─────────────────────────────────────────────────────────────
function NavSubItem({ item, isActive, onNavigate }: { item: NavItem; isActive: boolean; onNavigate: (v: NavView) => void }) {
  const Icon = ICON_MAP[item.icon] ?? FileText;
  if (!item.view) return null;
  return (
    <SidebarMenuSubItem>
      <SidebarMenuSubButton
        isActive={isActive}
        onClick={() => onNavigate(item.view!)}
        className="cursor-pointer"
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
      </SidebarMenuSubButton>
    </SidebarMenuSubItem>
  );
}

// ── Main Sidebar Component ────────────────────────────────────────────────────
export function AppSidebar() {
  const { user, logout } = useAuthStore();
  const { currentView, navigate } = useNavStore();

  const navItems = useMemo(() => {
    if (!user) return [];
    const role = user.roles[0];
    return getNavForRole(role);
  }, [user]);

  const handleLogout = () => {
    logout();
    navigate('login');
  };

  const roleLabel = user?.roles[0] ? ROLE_LABELS[user.roles[0]] : '';

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-3">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <PenTool className="size-4" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-sm font-bold tracking-tight text-sidebar-foreground">
              EssayCompass
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/60">
              Writing Competition
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <AnimatePresence initial={false}>
                {navItems.map((item) => {
                  if (item.children && item.children.length > 0) {
                    const isChildActive = item.children.some((c) => c.view === currentView);
                    const isExpanded = isChildActive;
                    const ParentIcon = ICON_MAP[item.icon] ?? FileText;
                    return (
                      <Collapsible key={item.label} defaultOpen={isExpanded} open={isExpanded}>
                        <SidebarMenuItem>
                          <CollapsibleTrigger asChild>
                            <SidebarMenuButton
                              tooltip={item.label}
                              isActive={isChildActive}
                              className="cursor-pointer"
                            >
                              <ParentIcon className="size-4" />
                              <span>{item.label}</span>
                              <ChevronRight className="ml-auto size-4 shrink-0 text-sidebar-foreground/50 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                            </SidebarMenuButton>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <SidebarMenuSub>
                              {item.children.map((child) => (
                                <NavSubItem
                                  key={child.view}
                                  item={child}
                                  isActive={currentView === child.view}
                                  onNavigate={navigate}
                                />
                              ))}
                            </SidebarMenuSub>
                          </CollapsibleContent>
                        </SidebarMenuItem>
                      </Collapsible>
                    );
                  }

                  const Icon = ICON_MAP[item.icon] ?? FileText;
                  const isActive = !!item.view && currentView === item.view;

                  return (
                    <motion.div
                      key={item.view ?? item.label}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <SidebarMenuItem>
                        <SidebarMenuButton
                          tooltip={item.label}
                          isActive={isActive}
                          onClick={() => item.view && navigate(item.view)}
                          className="cursor-pointer"
                        >
                          <Icon className="size-4" />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="size-8 shrink-0 border border-sidebar-border">
            <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
              {getInitials(user?.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col overflow-hidden">
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {user?.name ?? 'User'}
            </span>
            <span className="truncate text-[11px] text-sidebar-foreground/50">
              {roleLabel}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex size-8 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/50 transition-colors hover:bg-sidebar-accent hover:text-rose-600"
            title="Logout"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
