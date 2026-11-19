import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import {
  Home,
  BookOpen,
  Calendar,
  ChevronsUpDown,
  Search,
  Library,
  Clock,
  FileCheck,
  Bookmark,
  Users,
  BarChart2,
  FileText,
  Layers,
  Bell,
  Plus,
  SlidersHorizontal,
  ArrowLeft,
  X,
  ChevronRight,
  CheckCheck,
  GraduationCap,
  Zap,
  Settings,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';
import { PASTEL_THEMES } from '../../constants/theme';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { playUiMotionSound } from '../../utils/uiMotionSound';

export const MobileBottomNav: React.FC = () => {
  const {
    activePage,
    setActivePage,
    unreadNotifCount,
    notifications,
    handleMarkAllRead,
    handleNotificationClick,
    materialsList,
    studentsDirectory,
    trainersDirectory,
    assignments,
    schedules,
    exams,
    liveQuizzes,
    setSelectedStudentDrawer,
    setSelectedTrainerDrawer,
    setSelectedMaterial,
    setActiveTakeAssignment,
    setIsNewPlanModalOpen,
    setIsNewAssignmentOpen,
    setIsAddExamOpen,
    setIsUploadMaterialOpen,
    setIsAddStudentOpen,
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const [menuSubview, setMenuSubview] = useState<'nav' | 'notifications' | 'quickCreate'>('nav');
  const [mobileNotifFilter, setMobileNotifFilter] = useState<'All' | 'Unread' | 'Reminders'>('All');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const menuCloseTimerRef = useRef<number | null>(null);
  const pillBarRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const openMenuSmoothly = () => {
    if (menuCloseTimerRef.current) {
      window.clearTimeout(menuCloseTimerRef.current);
      menuCloseTimerRef.current = null;
    }
    playUiMotionSound('pop');
    setMenuClosing(false);
    setMenuOpen(true);
  };

  const closeMenuSmoothly = () => {
    if (!menuOpen || menuClosing) return;
    playUiMotionSound('tick');
    setMenuClosing(true);
    menuCloseTimerRef.current = window.setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      menuCloseTimerRef.current = null;
    }, 200);
  };

  useEffect(() => {
    return () => {
      if (menuCloseTimerRef.current) window.clearTimeout(menuCloseTimerRef.current);
    };
  }, []);

  const {
    setSheetElement: setSearchSheetEl,
    backdropRef: searchBackdropRef,
    animateClose: animateCloseSearch,
    sheetGestureProps: searchGestureProps,
  } = useBottomSheetMotion({
    onClose: () => {
      setSearchOpen(false);
      setSearchQuery('');
    },
  });

  // Top 3 primary dock slots + 4th slot as overflow/module switcher
  const primarySlots: Array<{
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    dot?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'schedule', label: 'Schedule', icon: Calendar, dot: unreadNotifCount > 0 },
    { id: 'materials', label: 'Class Materials', icon: Library },
  ];

  // Full vertical drawer items tailored to Servolution
  const allModules: Array<{
    id: PageId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number | null;
    dividerBefore?: boolean;
  }> = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'prep', label: 'Class Preparation', icon: BookOpen },
    { id: 'materials', label: 'Class Materials', icon: Library },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'exams', label: 'Exams', icon: FileCheck },
    { id: 'assignments', label: 'Assignment', icon: Bookmark },
    { id: 'livequiz', label: 'LiveQuiz', icon: Zap },
    { id: 'schedule', label: 'Schedule', icon: Calendar },
    { id: 'students', label: 'Students Roster', icon: Users },
    { id: 'trainers', label: 'Trainer', icon: GraduationCap },
    { id: 'analytics', label: 'Analytics', icon: BarChart2 },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings, dividerBefore: true },
    { id: 'uikit', label: 'UI Design System', icon: Layers },
  ];

  const primaryIds = new Set(primarySlots.map((s) => s.id));
  const popupModules = allModules.filter((m) => !primaryIds.has(m.id));
  const isOverflowActive = !primaryIds.has(activePage);
  const activeOverflowModule = isOverflowActive
    ? allModules.find((m) => m.id === activePage)
    : undefined;

  // Which of the 4 dock slots (0..3) is currently active
  const activeSlotIndex = isOverflowActive
    ? 3
    : primarySlots.findIndex((s) => s.id === activePage);

  // Gliding pill calculation for the 4-slot floating dock
  useLayoutEffect(() => {
    const updateIndicator = () => {
      const bar = pillBarRef.current;
      const btn = slotRefs.current[activeSlotIndex];
      if (!bar || !btn) return;
      const barRect = bar.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      if (btnRect.width === 0) return;
      setIndicator({
        left: btnRect.left - barRect.left,
        width: btnRect.width,
        ready: true,
      });
    };

    updateIndicator();
    const bar = pillBarRef.current;
    const ro = typeof ResizeObserver !== 'undefined' && bar ? new ResizeObserver(updateIndicator) : null;
    if (ro && bar) ro.observe(bar);
    window.addEventListener('resize', updateIndicator);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeSlotIndex, activePage, menuOpen]);

  // Reset subview whenever menu opens/closes
  useEffect(() => {
    if (!menuOpen) {
      setMenuSubview('nav');
    }
  }, [menuOpen]);

  // Auto-focus search input when search sheet opens
  useEffect(() => {
    if (searchOpen) {
      const id = window.setTimeout(() => searchInputRef.current?.focus(), 140);
      return () => window.clearTimeout(id);
    }
  }, [searchOpen]);

  // Close popup menu on Escape
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenuSmoothly();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, menuClosing]);

  const handleSelectPage = (id: PageId) => {
    setActivePage(id);
    closeMenuSmoothly();
  };

  const quickCreateActions = [
    { label: 'New Lesson Plan', action: () => setIsNewPlanModalOpen(true) },
    { label: 'Create Assignment', action: () => setIsNewAssignmentOpen(true) },
    { label: 'Schedule New Exam', action: () => setIsAddExamOpen(true) },
    { label: 'Upload Material', action: () => setIsUploadMaterialOpen(true) },
    { label: 'Enroll Student', action: () => setIsAddStudentOpen(true) },
  ];

  // Quick search results across modules, assignments, schedules, exams, trainers, students, materials, and live quizzes
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const matchedModules = allModules
      .filter((m) => !q || m.label.toLowerCase().includes(q))
      .slice(0, q ? 5 : 4);

    const matchedAssignments = q
      ? assignments
          .filter(
            (a) =>
              a.title.toLowerCase().includes(q) ||
              a.subject.toLowerCase().includes(q) ||
              a.classCode.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    const matchedSchedules = q
      ? schedules
          .filter(
            (s) =>
              s.subject.toLowerCase().includes(q) ||
              s.room.toLowerCase().includes(q) ||
              s.classCode.toLowerCase().includes(q) ||
              s.type.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    const matchedExams = q
      ? exams
          .filter(
            (e) =>
              e.title.toLowerCase().includes(q) ||
              e.classCode.toLowerCase().includes(q) ||
              e.grade.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

    const matchedTrainers = q
      ? trainersDirectory
          .filter(
            (t) =>
              t.name.toLowerCase().includes(q) ||
              t.department.toLowerCase().includes(q) ||
              t.specialization.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

    const matchedStudents = q
      ? studentsDirectory
          .filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.classCode.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    const matchedMaterials = q
      ? materialsList
          .filter(
            (m) =>
              m.title.toLowerCase().includes(q) ||
              m.subject.toLowerCase().includes(q) ||
              m.classCode.toLowerCase().includes(q)
          )
          .slice(0, 4)
      : [];

    const matchedLiveQuizzes = q
      ? liveQuizzes
          .filter(
            (lq) =>
              lq.title.toLowerCase().includes(q) ||
              lq.subject.toLowerCase().includes(q) ||
              lq.classCode.toLowerCase().includes(q)
          )
          .slice(0, 3)
      : [];

    return {
      matchedModules,
      matchedAssignments,
      matchedSchedules,
      matchedExams,
      matchedTrainers,
      matchedStudents,
      matchedMaterials,
      matchedLiveQuizzes,
    };
  }, [
    assignments,
    exams,
    liveQuizzes,
    materialsList,
    schedules,
    searchQuery,
    studentsDirectory,
    trainersDirectory,
  ]);

  const ActiveOverflowIcon = activeOverflowModule?.icon;

  return (
    <>
      {/* Backdrop + Floating Vertical Popup Menu (No X button -> outside click auto-closes with fold-down) */}
      {menuOpen && (
        <div
          onClick={closeMenuSmoothly}
          className={`${
            menuClosing ? 'animate-ui-fade-out' : 'animate-ui-fade'
          } fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] md:hidden no-print`}
        >
          <div className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] inset-x-4 max-w-[352px] mx-auto pointer-events-none">
            <div
              onClick={(e) => e.stopPropagation()}
              className={`${
                menuClosing ? 'animate-menu-fold-down' : 'animate-menu-fold-up'
              } pointer-events-auto w-[min(272px,100%)] max-h-[calc(100vh-92px)] bg-white rounded-[24px] shadow-[0_20px_48px_-12px_rgba(15,23,42,0.28)] border border-black/[0.14] flex flex-col overflow-hidden`}
            >
              {/* Top Profile & Quick Utility Header */}
              <div className="px-3.5 pt-3 pb-2.5 border-b border-black/[0.12] flex items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSelectPage('overview')}
                  className="flex items-center gap-2 min-w-0 text-left cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#ee2e65] text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-xs">
                    RS
                  </div>
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#1C1D21] truncate group-hover:text-[#ee2e65] transition-colors">
                      Rasengan
                    </div>
                    <div className="text-[10px] text-[#8A8D98] leading-tight">
                      Teacher · Servolution
                    </div>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    title="Analytics & Preferences"
                    onClick={() => handleSelectPage('analytics')}
                    className="w-7 h-7 rounded-full hover:bg-[#F4F5F8] text-[#4B4E57] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Quick Create"
                    onClick={() =>
                      setMenuSubview((prev) => (prev === 'quickCreate' ? 'nav' : 'quickCreate'))
                    }
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      menuSubview === 'quickCreate'
                        ? 'bg-[#FDE0E9] text-[#9D113C] rotate-45'
                        : 'bg-[#ee2e65] text-white hover:brightness-105 shadow-xs'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subview: Main Navigation List */}
              {menuSubview === 'nav' && (
                <div className="overflow-y-auto p-2 space-y-0.5 overscroll-contain">
                  {popupModules.map((item) => {
                    const Icon = item.icon;
                    const isCurrent = activePage === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        {item.dividerBefore && (
                          <div className="my-1 border-t border-black/[0.12] mx-2" />
                        )}
                        <button
                          type="button"
                          onClick={() => handleSelectPage(item.id)}
                          className={`touch-target-44 w-full flex items-center justify-between px-3 py-2 rounded-full text-left transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] cursor-pointer ${
                            isCurrent
                              ? 'bg-[#ee2e65] text-white font-semibold shadow-[0_6px_16px_-6px_rgba(238,46,101,0.55)]'
                              : 'text-[#1C1D21] hover:bg-[#F4F5F8] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <Icon
                              className={`w-4 h-4 shrink-0 ${
                                isCurrent ? 'text-white stroke-[2.2px]' : 'text-[#1C1D21] stroke-[1.8px]'
                              }`}
                            />
                            <span className="text-[13px] truncate">{item.label}</span>
                          </div>

                          {item.badge && (
                            <span
                              className={`min-w-[22px] h-[20px] px-1.5 rounded-full text-[10.5px] font-bold flex items-center justify-center shrink-0 ${
                                isCurrent
                                  ? 'bg-white text-[#ee2e65]'
                                  : 'bg-[#EF4444] text-white'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>

                        {/* Place Notifications row right after Trainer */}
                        {item.id === 'trainers' && (
                          <button
                            type="button"
                            onClick={() => setMenuSubview('notifications')}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-full text-left text-[#1C1D21] hover:bg-[#F4F5F8] font-medium transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Bell className="w-4 h-4 shrink-0 text-[#1C1D21] stroke-[1.8px]" />
                              <span className="text-[13px] truncate">Notifications</span>
                            </div>
                            {unreadNotifCount > 0 && (
                              <span className="min-w-[22px] h-[20px] px-1.5 rounded-full bg-[#EF4444] text-white text-[10.5px] font-bold flex items-center justify-center shrink-0">
                                {unreadNotifCount}
                              </span>
                            )}
                          </button>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

            {/* Subview: Notifications Drawer View */}
            {menuSubview === 'notifications' && (
              <div className="overflow-y-auto p-3 space-y-2.5 overscroll-contain">
                <div className="flex items-center justify-between px-1">
                  <button
                    type="button"
                    onClick={() => setMenuSubview('nav')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21] hover:text-[#ee2e65] whitespace-nowrap cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">Back</span>
                    <span className="hidden sm:inline">All Modules</span>
                  </button>
                  {unreadNotifCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#ee2e65] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 sm:hidden shrink-0" />
                      <span className="sm:hidden">Read</span>
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  )}
                </div>

                {/* Filter tabs */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                  {(['All', 'Unread', 'Reminders'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setMobileNotifFilter(tab)}
                      className={`flex-1 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                        mobileNotifFilter === tab
                          ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  {notifications
                    .filter((n) => {
                      if (mobileNotifFilter === 'Unread') return n.unread;
                      if (mobileNotifFilter === 'Reminders') return Boolean(n.isReminder);
                      return true;
                    })
                    .map((notif) => {
                    const theme = PASTEL_THEMES[notif.theme] || PASTEL_THEMES.periwinkle;
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          handleNotificationClick(notif);
                          closeMenuSmoothly();
                        }}
                        className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start gap-2.5 cursor-pointer ${
                          notif.unread
                            ? `${theme.bg} border-black/[0.05]`
                            : 'bg-[#FAFBFD] border-black/[0.04] hover:bg-gray-100/70'
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            notif.unread ? theme.dot : 'bg-gray-300'
                          }`}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[12.5px] font-semibold text-[#1C1D21] truncate">
                              {notif.title}
                            </span>
                            <span className="text-[10.5px] text-[#8A8D98] shrink-0">
                              {notif.time}
                            </span>
                          </div>
                          <p className="text-[11.5px] text-[#5A5D67] mt-0.5 line-clamp-2">
                            {notif.desc}
                          </p>
                          {notif.reminderTag && (
                            <span className="inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C]">
                              {notif.reminderTag}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {notifications.filter((n) => {
                    if (mobileNotifFilter === 'Unread') return n.unread;
                    if (mobileNotifFilter === 'Reminders') return Boolean(n.isReminder);
                    return true;
                  }).length === 0 && (
                    <div className="py-8 text-center text-[12px] text-[#8A8D98]">
                      Tidak ada notifikasi pada filter ini.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Subview: Quick Create Menu triggered by + button */}
            {menuSubview === 'quickCreate' && (
              <div className="overflow-y-auto p-3 space-y-1.5 overscroll-contain">
                <div className="flex items-center justify-between px-1 pb-1">
                  <button
                    type="button"
                    onClick={() => setMenuSubview('nav')}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21] hover:text-[#ee2e65] whitespace-nowrap cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                    <span className="sm:hidden">Back</span>
                    <span className="hidden sm:inline">Back to Menu</span>
                  </button>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                    Quick Create
                  </span>
                </div>

                {quickCreateActions.map((act) => (
                  <button
                    key={act.label}
                    type="button"
                    onClick={() => {
                      closeMenuSmoothly();
                      act.action();
                    }}
                    className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl bg-[#FAFBFD] hover:bg-[#FEF1F5] text-[#1C1D21] hover:text-[#ee2e65] text-[12.5px] font-semibold border border-black/[0.04] transition-colors cursor-pointer"
                  >
                    <span>{act.label}</span>
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            )}
            </div>
          </div>
        </div>
      )}

      {/* Compact One-Handed Floating Bottom Navigation Bar + Detached Search Button */}
      <div className="fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom,0px))] inset-x-4 max-w-[352px] mx-auto z-40 md:hidden flex items-center gap-2 no-print">
        {/* Main Floating Pill Dock */}
        <nav
          ref={pillBarRef}
          aria-label="Mobile navigation"
          className="relative flex-1 bg-white/95 backdrop-blur-md rounded-full p-1 shadow-[0_10px_28px_-8px_rgba(15,23,42,0.18)] border border-black/[0.14] flex items-center justify-between"
        >
          {/* Gliding Brand-Primary Active Pill */}
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute top-1 bottom-1 left-0 rounded-full bg-[#ee2e65] shadow-[0_5px_14px_-4px_rgba(238,46,101,0.55)] transition-[transform,width,opacity] duration-[220ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
              indicator.ready ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              width: `${indicator.width}px`,
              transform: `translate3d(${indicator.left}px, 0, 0)`,
            }}
          />

          {primarySlots.map((slot, index) => {
            const Icon = slot.icon;
            const isActive = activeSlotIndex === index;
            return (
              <button
                key={slot.id}
                ref={(el) => {
                  slotRefs.current[index] = el;
                }}
                type="button"
                aria-label={slot.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActivePage(slot.id);
                  closeMenuSmoothly();
                }}
                className={`relative z-10 flex-1 h-10 rounded-full flex items-center justify-center transition-colors duration-200 cursor-pointer ${
                  isActive ? 'text-white' : 'text-[#1C1D21] hover:text-[#ee2e65]'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'stroke-[2.2px]' : 'stroke-[1.9px]'}`} />
                  {slot.dot && (
                    <span
                      className={`w-2 h-2 rounded-full absolute -top-0.5 -right-1 ring-[1.5px] ${
                        isActive ? 'bg-white ring-[#ee2e65]' : 'bg-[#EF4444] ring-white'
                      }`}
                    />
                  )}
                </div>
              </button>
            );
          })}

          {/* Slot 4: Overflow Menu Trigger (Shows active module icon + chevrons when an overflow module is active) */}
          <button
            ref={(el) => {
              slotRefs.current[3] = el;
            }}
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={menuOpen && !menuClosing}
            onClick={() => (menuOpen && !menuClosing ? closeMenuSmoothly() : openMenuSmoothly())}
            className={`relative z-10 h-10 rounded-full flex items-center justify-center gap-1 transition-colors duration-200 cursor-pointer ${
              isOverflowActive ? 'flex-[1.28] px-2.5 text-white' : 'flex-1 text-[#1C1D21] hover:text-[#ee2e65]'
            }`}
          >
            {isOverflowActive && ActiveOverflowIcon && (
              <ActiveOverflowIcon className="w-[17px] h-[17px] stroke-[2.1px] shrink-0" />
            )}
            <ChevronsUpDown className={`w-[15px] h-[15px] stroke-[2.1px] shrink-0 transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${menuOpen && !menuClosing ? 'scale-110' : ''}`} />
          </button>
        </nav>

        {/* Separate Floating Circular Search Button */}
        <button
          type="button"
          aria-label="Search modules, students, and materials"
          onClick={() => {
            closeMenuSmoothly();
            playUiMotionSound('pop');
            setSearchOpen(true);
          }}
          className={`w-12 h-12 shrink-0 rounded-full backdrop-blur-md shadow-[0_10px_28px_-8px_rgba(15,23,42,0.18)] border flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer ${
            searchOpen
              ? 'bg-[#ee2e65] text-white border-[#ee2e65]'
              : 'bg-white/95 text-[#1C1D21] border-black/[0.14] hover:text-[#ee2e65]'
          }`}
        >
          <Search className="w-[18px] h-[18px] stroke-[2px]" />
        </button>
      </div>

      {/* Mobile Search Sheet (Has X button -> closes only via X or mobile drag-down) */}
      {searchOpen && (
        <div
          ref={searchBackdropRef}
          data-modal-sheet-backdrop="true"
          className="animate-ui-fade fixed inset-0 z-50 bg-black/35 backdrop-blur-xs flex items-end justify-center md:hidden no-print"
        >
          <div
            ref={setSearchSheetEl}
            {...searchGestureProps}
            className="w-full bg-white rounded-t-[28px] p-5 pb-[calc(1.75rem+env(safe-area-inset-bottom,0px))] space-y-4 shadow-2xl max-h-[82vh] flex flex-col animate-bottom-sheet"
          >
            <div
              data-sheet-handle="true"
              className="flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none shrink-0"
            >
              <div className="w-10 h-1 bg-black/20 rounded-full animate-sheet-handle" />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex-1 flex items-center gap-2.5 bg-[#F4F5F8] rounded-full px-4 py-2.5 border border-black/[0.12] focus-within:border-[#ee2e65] focus-within:bg-white transition-colors">
                <Search className="w-4 h-4 text-[#646772] shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  enterKeyHint="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari modul, siswa, atau materi..."
                  className="w-full bg-transparent text-[13.5px] text-[#1C1D21] placeholder:text-[#646772] outline-none"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-[#8A8D98] hover:text-[#1C1D21] cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-label="Close search"
                onClick={animateCloseSearch}
                className="w-9 h-9 rounded-full hover:bg-[#F4F5F8] flex items-center justify-center text-[#6E717A] shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto overscroll-contain space-y-4 pr-0.5">
              {/* Modules */}
              {searchResults.matchedModules.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    {searchQuery ? 'Modules' : 'Quick Access Modules'}
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedModules.map((mod) => {
                      const Icon = mod.icon;
                      const isCurrent = activePage === mod.id;
                      return (
                        <button
                          key={mod.id}
                          type="button"
                          onClick={() => {
                            setActivePage(mod.id);
                            animateCloseSearch();
                          }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl transition-colors text-left cursor-pointer ${
                            isCurrent
                              ? 'bg-[#ee2e65] text-white font-semibold'
                              : 'bg-[#FAFBFD] hover:bg-[#F4F5F8] text-[#1C1D21] font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="w-4 h-4 shrink-0" />
                            <span className="text-[13px] truncate">{mod.label}</span>
                          </div>
                          <ChevronRight className={`w-4 h-4 shrink-0 ${isCurrent ? 'text-white/80' : 'text-[#B4B6C1]'}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Assignments */}
              {searchResults.matchedAssignments.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Assignments
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedAssignments.map((asg) => (
                      <button
                        key={asg.id}
                        type="button"
                        onClick={() => {
                          setActivePage('assignments');
                          if (asg.status !== 'Completed') {
                            setActiveTakeAssignment(asg);
                          }
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{asg.title}</div>
                          <div className="text-[11px] text-[#8A8D98] truncate">{asg.classCode} · {asg.subject}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule */}
              {searchResults.matchedSchedules.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Schedule
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedSchedules.map((sch) => (
                      <button
                        key={sch.id}
                        type="button"
                        onClick={() => {
                          setActivePage('schedule');
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{sch.subject}</div>
                          <div className="text-[11px] text-[#8A8D98] truncate">{sch.day} {sch.startHour}–{sch.endHour} · {sch.room}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Exams */}
              {searchResults.matchedExams.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Exams
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedExams.map((ex) => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => {
                          setActivePage('exams');
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{ex.title}</div>
                          <div className="text-[11px] text-[#8A8D98] truncate">Class {ex.classCode} · {ex.time}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Trainers */}
              {searchResults.matchedTrainers.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Trainers
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedTrainers.map((tr) => (
                      <button
                        key={tr.id}
                        type="button"
                        onClick={() => {
                          setActivePage('trainers');
                          setSelectedTrainerDrawer(tr);
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${tr.color}`}>
                            {tr.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{tr.name}</div>
                            <div className="text-[11px] text-[#8A8D98] truncate">{tr.department} · {tr.rating}%</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Students */}
              {searchResults.matchedStudents.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Students
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedStudents.map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => {
                          setActivePage('students');
                          setSelectedStudentDrawer(st);
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${st.color}`}>
                            {st.initials}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{st.name}</div>
                            <div className="text-[11px] text-[#8A8D98] truncate">{st.classCode} · {st.grade}</div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Materials */}
              {searchResults.matchedMaterials.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    Class Materials
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedMaterials.map((mat) => (
                      <button
                        key={mat.id}
                        type="button"
                        onClick={() => {
                          setActivePage('materials');
                          setSelectedMaterial(mat);
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{mat.title}</div>
                          <div className="text-[11px] text-[#8A8D98] truncate">{mat.subject} · {mat.classCode}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* LiveQuiz */}
              {searchResults.matchedLiveQuizzes.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#8A8D98] px-1">
                    LiveQuiz
                  </div>
                  <div className="space-y-1">
                    {searchResults.matchedLiveQuizzes.map((lq) => (
                      <button
                        key={lq.id}
                        type="button"
                        onClick={() => {
                          setActivePage('livequiz');
                          animateCloseSearch();
                        }}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#FAFBFD] hover:bg-[#F4F5F8] text-left transition-colors cursor-pointer"
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">{lq.title}</div>
                          <div className="text-[11px] text-[#8A8D98] truncate">{lq.subject} · {lq.questions.length} soal</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {searchQuery &&
                searchResults.matchedModules.length === 0 &&
                searchResults.matchedAssignments.length === 0 &&
                searchResults.matchedSchedules.length === 0 &&
                searchResults.matchedExams.length === 0 &&
                searchResults.matchedTrainers.length === 0 &&
                searchResults.matchedStudents.length === 0 &&
                searchResults.matchedMaterials.length === 0 &&
                searchResults.matchedLiveQuizzes.length === 0 && (
                  <div className="py-8 text-center text-[12.5px] text-[#8A8D98]">
                    Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
