import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  Bell,
  Search,
  LayoutGrid,
  Library,
  BookOpen,
  Clock,
  FileCheck,
  Bookmark,
  Calendar as CalendarIcon,
  Users,
  BarChart2,
  FileText,
  Layers,
  CheckCheck,
  GraduationCap,
  Zap,
  Settings,
  BellRing,
  X,
  RotateCcw,
  WifiOff,
  RefreshCw,
} from 'lucide-react';
import { playUiMotionSound } from '../../utils/uiMotionSound';
import { AnimatePresence, motion } from 'motion/react';
import { useApp } from '../../context/AppContext';
import { PASTEL_THEMES } from '../../constants/theme';
import { PageId, PastelThemeKey } from '../../types';
import { useIsMobile } from '../../hooks/useIsMobile';
import { getPageDirection } from '../ui/PageTransition';
import { HorizontalSlideTrack } from '../ui/HorizontalSlideTrack';

type SearchCategoryFilter =
  | 'All'
  | 'Modules'
  | 'Assignments'
  | 'Schedule'
  | 'Exams'
  | 'Materials'
  | 'Students'
  | 'Trainers'
  | 'LiveQuiz';

interface SearchEntry {
  id: string;
  category: Exclude<SearchCategoryFilter, 'All'>;
  title: string;
  desc: string;
  meta: string;
  badge?: string;
  theme: PastelThemeKey;
  onSelect: () => void;
}

const SEARCH_MODULES: Array<{
  id: PageId;
  label: string;
  desc: string;
  keywords: string;
  theme: PastelThemeKey;
}> = [
  { id: 'overview', label: 'Overview', desc: 'Ringkasan dashboard, tugas aktif & jadwal mingguan', keywords: 'dashboard beranda home', theme: 'periwinkle' },
  { id: 'materials', label: 'Class Materials', desc: 'Repositori PDF, slide, dan video pembelajaran', keywords: 'materi modul video dokumen', theme: 'periwinkle' },
  { id: 'prep', label: 'Class Preparation', desc: 'Rencana pembelajaran & checklist persiapan kelas', keywords: 'silabus lesson plan rpp', theme: 'mint' },
  { id: 'attendance', label: 'Attendance', desc: 'Absensi harian & QR check-in Servolution Crew', keywords: 'kehadiran qr absen', theme: 'mint' },
  { id: 'exams', label: 'Exams', desc: 'Jadwal ujian, penilaian peserta & kelulusan', keywords: 'ujian evaluasi nilai', theme: 'coral' },
  { id: 'assignments', label: 'Assignment', desc: 'Kelola tugas, kumpulkan jawaban & review', keywords: 'tugas pr soal', theme: 'peach' },
  { id: 'livequiz', label: 'LiveQuiz', desc: 'Kuis interaktif real-time & laporan sesi', keywords: 'kuis game room', theme: 'coral' },
  { id: 'schedule', label: 'Schedule', desc: 'Kalender jadwal kelas, praktikum & ujian mingguan', keywords: 'jadwal kalender waktu', theme: 'mint' },
  { id: 'students', label: 'Students Roster', desc: 'Direktori lengkap peserta & status belajar', keywords: 'siswa crew peserta murid', theme: 'periwinkle' },
  { id: 'trainers', label: 'Trainer', desc: 'Direktori trainer, rating & form feedback crew', keywords: 'pengajar guru dosen feedback rating', theme: 'peach' },
  { id: 'analytics', label: 'Analytics & Statistics', desc: 'Statistik performa kelas & grafik tren', keywords: 'analitik grafik statistik', theme: 'periwinkle' },
  { id: 'reports', label: 'Reports', desc: 'Laporan akademik, absensi & ekspor CSV', keywords: 'laporan rekap ekspor', theme: 'peach' },
  { id: 'settings', label: 'Settings', desc: 'Manajemen batch, aturan kelulusan & bobot ujian', keywords: 'pengaturan batch tahun aturan', theme: 'mint' },
  { id: 'uikit', label: 'UI Design System', desc: 'Katalog komponen, warna & scrollbar UI Kit', keywords: 'komponen desain tema scrollbar', theme: 'coral' },
];

export const Header: React.FC = () => {
  const {
    activePage,
    prevPage,
    setActivePage,
    notifications,
    unreadNotifCount,
    handleMarkAllRead,
    handleNotificationClick,
    browserNotifEnabled,
    toggleBrowserNotifications,
    isGlobalSearchOpen,
    setIsGlobalSearchOpen,
    assignments,
    schedules,
    exams,
    materialsList,
    studentsDirectory,
    trainersDirectory,
    liveQuizzes,
    reportsList,
    setActiveTakeAssignment,
    setSelectedMaterial,
    setSelectedStudentDrawer,
    setSelectedTrainerDrawer,
    isOnline,
    pendingSyncCount,
    syncPendingNow,
  } = useApp();

  const isMobile = useIsMobile();
  const direction = getPageDirection(prevPage, activePage, isMobile);

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsFilter, setNotificationsFilter] = useState<'All' | 'Unread' | 'Reminders'>('All');
  const [popoverCoords, setPopoverCoords] = useState<{
    top: number;
    right: number;
    isSm: boolean;
  }>({ top: 68, right: 16, isSm: false });
  const notifWrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Search popover state & refs (anchored identical to Notifications)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState<SearchCategoryFilter>('All');
  const [searchActiveIdx, setSearchActiveIdx] = useState(0);
  const [searchCoords, setSearchCoords] = useState<{
    top: number;
    right: number;
    isSm: boolean;
  }>({ top: 68, right: 16, isSm: false });
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchPopoverRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const updatePopoverPosition = useCallback(() => {
    const el = notifWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setPopoverCoords({
      top: Math.round(rect.bottom + 8),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      isSm: window.innerWidth >= 640,
    });
  }, []);

  const updateSearchPosition = useCallback(() => {
    const el = searchWrapperRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSearchCoords({
      top: Math.round(rect.bottom + 8),
      right: Math.max(12, Math.round(window.innerWidth - rect.right)),
      isSm: window.innerWidth >= 640,
    });
  }, []);

  useEffect(() => {
    if (!notificationsOpen) return;
    updatePopoverPosition();

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        notifWrapperRef.current &&
        !notifWrapperRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setNotificationsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNotificationsOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [notificationsOpen, updatePopoverPosition]);

  // Search popover lifecycle (mirrors Notifications popover)
  useEffect(() => {
    if (!isGlobalSearchOpen) {
      setSearchQuery('');
      setSearchCategory('All');
      setSearchActiveIdx(0);
      return;
    }

    setNotificationsOpen(false);
    updateSearchPosition();
    const focusTimer = window.setTimeout(() => searchInputRef.current?.focus(), 60);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        searchWrapperRef.current &&
        !searchWrapperRef.current.contains(target) &&
        searchPopoverRef.current &&
        !searchPopoverRef.current.contains(target)
      ) {
        setIsGlobalSearchOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('resize', updateSearchPosition);
    window.addEventListener('scroll', updateSearchPosition, true);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('resize', updateSearchPosition);
      window.removeEventListener('scroll', updateSearchPosition, true);
    };
  }, [isGlobalSearchOpen, setIsGlobalSearchOpen, updateSearchPosition]);

  const reminderNotifCount = notifications.filter((n) => Boolean(n.isReminder)).length;

  const filteredNotifications = notifications.filter((n) => {
    if (notificationsFilter === 'Unread') return n.unread;
    if (notificationsFilter === 'Reminders') return Boolean(n.isReminder);
    return true;
  });

  const allSearchEntries = useMemo<SearchEntry[]>(() => {
    const close = () => setIsGlobalSearchOpen(false);
    const list: SearchEntry[] = [];

    SEARCH_MODULES.forEach((mod) => {
      list.push({
        id: `mod-${mod.id}`,
        category: 'Modules',
        title: mod.label,
        desc: mod.desc,
        meta: 'Page',
        badge: mod.keywords.split(' ')[0],
        theme: mod.theme,
        onSelect: () => {
          setActivePage(mod.id);
          close();
        },
      });
    });

    assignments.forEach((asg) => {
      list.push({
        id: `asg-${asg.id}`,
        category: 'Assignments',
        title: asg.title,
        desc: `${asg.classCode} · ${asg.subject} · Batas ${asg.dueDate}`,
        meta: asg.classCode,
        badge: asg.status,
        theme: asg.theme,
        onSelect: () => {
          setActivePage('assignments');
          if (asg.status !== 'Completed') {
            setActiveTakeAssignment(asg);
          }
          close();
        },
      });
    });

    schedules.forEach((sch) => {
      list.push({
        id: `sch-${sch.id}`,
        category: 'Schedule',
        title: sch.subject,
        desc: `${sch.day}, ${sch.startHour}–${sch.endHour} di ${sch.room} (${sch.classCode})`,
        meta: sch.day,
        badge: sch.type,
        theme: sch.theme,
        onSelect: () => {
          setActivePage('schedule');
          close();
        },
      });
    });

    exams.forEach((ex) => {
      list.push({
        id: `ex-${ex.id}`,
        category: 'Exams',
        title: ex.title,
        desc: `Class ${ex.classCode} · ${ex.grade} · ${ex.time} (${ex.students} peserta)`,
        meta: ex.time,
        badge: ex.status,
        theme: ex.theme,
        onSelect: () => {
          setActivePage('exams');
          close();
        },
      });
    });

    materialsList.forEach((mat) => {
      list.push({
        id: `mat-${mat.id}`,
        category: 'Materials',
        title: mat.title,
        desc: `${mat.subject} · ${mat.classCode} · ${mat.fileFormat} (${mat.fileSize})`,
        meta: mat.fileFormat,
        badge: mat.classCode,
        theme: mat.theme,
        onSelect: () => {
          setActivePage('materials');
          setSelectedMaterial(mat);
          close();
        },
      });
    });

    studentsDirectory.forEach((st) => {
      list.push({
        id: `st-${st.id}`,
        category: 'Students',
        title: st.name,
        desc: `${st.classCode} · ${st.grade} · ${st.email}`,
        meta: st.classCode,
        badge: st.status,
        theme: 'mint',
        onSelect: () => {
          setActivePage('students');
          setSelectedStudentDrawer(st);
          close();
        },
      });
    });

    trainersDirectory.forEach((tr) => {
      list.push({
        id: `tr-${tr.id}`,
        category: 'Trainers',
        title: tr.name,
        desc: `${tr.department} · ${tr.assignedClass} · ${tr.specialization}`,
        meta: `${tr.rating}%`,
        badge: tr.status,
        theme: 'peach',
        onSelect: () => {
          setActivePage('trainers');
          setSelectedTrainerDrawer(tr);
          close();
        },
      });
    });

    liveQuizzes.forEach((lq) => {
      list.push({
        id: `lq-${lq.id}`,
        category: 'LiveQuiz',
        title: lq.title,
        desc: `${lq.subject} · ${lq.classCode} · ${lq.questions.length} soal`,
        meta: `${lq.questions.length} Soal`,
        badge: 'LiveQuiz',
        theme: 'coral',
        onSelect: () => {
          setActivePage('livequiz');
          close();
        },
      });
    });

    reportsList.forEach((rep) => {
      list.push({
        id: `rep-${rep.id}`,
        category: 'Modules',
        title: rep.title,
        desc: `${rep.category} · ${rep.classCode} · ${rep.generatedDate}`,
        meta: rep.format,
        badge: rep.status,
        theme: rep.theme,
        onSelect: () => {
          setActivePage('reports');
          close();
        },
      });
    });

    return list;
  }, [
    assignments,
    exams,
    liveQuizzes,
    materialsList,
    reportsList,
    schedules,
    setActivePage,
    setActiveTakeAssignment,
    setIsGlobalSearchOpen,
    setSelectedMaterial,
    setSelectedStudentDrawer,
    setSelectedTrainerDrawer,
    studentsDirectory,
    trainersDirectory,
  ]);

  const filteredSearchEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allSearchEntries
      .filter((item) => {
        if (searchCategory !== 'All' && item.category !== searchCategory) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.desc.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.badge || '').toLowerCase().includes(q)
        );
      })
      .slice(0, q ? 24 : 12);
  }, [allSearchEntries, searchCategory, searchQuery]);

  useEffect(() => {
    setSearchActiveIdx(0);
  }, [searchQuery, searchCategory]);

  useEffect(() => {
    if (!isGlobalSearchOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsGlobalSearchOpen(false);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSearchActiveIdx((prev) =>
          filteredSearchEntries.length > 0 ? (prev + 1) % filteredSearchEntries.length : 0
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSearchActiveIdx((prev) =>
          filteredSearchEntries.length > 0
            ? (prev - 1 + filteredSearchEntries.length) % filteredSearchEntries.length
            : 0
        );
      } else if (e.key === 'Enter' && filteredSearchEntries[searchActiveIdx]) {
        e.preventDefault();
        filteredSearchEntries[searchActiveIdx].onSelect();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [filteredSearchEntries, isGlobalSearchOpen, searchActiveIdx, setIsGlobalSearchOpen]);

  const pageMeta: Record<
    string,
    { title: string; icon: React.ComponentType<{ className?: string }>; iconClass?: string }
  > = {
    overview: { title: 'Overview', icon: LayoutGrid },
    materials: { title: 'Class Materials', icon: Library },
    prep: { title: 'Class Preparation', icon: BookOpen },
    attendance: { title: 'Attendance', icon: Clock },
    exams: { title: 'Exams', icon: FileCheck },
    assignments: { title: 'Assignment', icon: Bookmark },
    livequiz: { title: 'LiveQuiz', icon: Zap, iconClass: 'text-[#ee2e65]' },
    schedule: { title: 'Schedule', icon: CalendarIcon },
    students: { title: 'Students', icon: Users },
    trainers: { title: 'Trainer', icon: GraduationCap },
    analytics: { title: 'Analytics & Statistics', icon: BarChart2 },
    reports: { title: 'Reports', icon: FileText },
    settings: { title: 'Settings', icon: Settings },
    uikit: { title: 'Design System & UI Components', icon: Layers, iconClass: 'text-[#9D113C]' },
  };

  const currentMeta = pageMeta[activePage] || pageMeta.overview;
  const CurrentPageIcon = currentMeta.icon;

  const searchCategories: SearchCategoryFilter[] = [
    'All',
    'Modules',
    'Assignments',
    'Schedule',
    'Exams',
    'Materials',
    'Students',
    'Trainers',
    'LiveQuiz',
  ];

  return (
    <header className="relative z-30 h-16 px-4 sm:px-7 border-b border-black/[0.12] flex items-center justify-between gap-3 sm:gap-4 shrink-0 bg-white/80 backdrop-blur-sm no-print">
      <div className="relative flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
        {/* Mobile Header Left: Profile on Overview, Page Title on other pages */}
        <div className="flex md:hidden items-center min-w-0 flex-1 relative">
          <AnimatePresence mode="popLayout" initial={false}>
            {activePage === 'overview' ? (
              <motion.div
                key="mobile-header-overview"
                initial={{ opacity: 0, x: direction * 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -12 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center gap-2.5 min-w-0 w-full"
              >
                <img
                  src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                  alt="Rasengan"
                  onError={(e) => {
                    e.currentTarget.src = 'https://placehold.co/80x80/1C1D21/FFFFFF?text=RS';
                  }}
                  className="w-9 h-9 rounded-full object-cover border border-black/[0.08] shadow-xs shrink-0"
                />
                <div className="min-w-0">
                  <span className="block text-[11px] font-medium text-gray-600 leading-tight">
                    Welcome
                  </span>
                  <span className="block text-[15px] font-semibold tracking-tight text-[#1C1D21] truncate leading-tight">
                    Rasengan
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`mobile-header-${activePage}`}
                initial={{ opacity: 0, x: direction * 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -12 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center gap-2 min-w-0 w-full"
              >
                <CurrentPageIcon className={`w-[18px] h-[18px] shrink-0 ${currentMeta.iconClass || 'text-[#1C1D21]'}`} />
                <h1 className="text-[17px] font-semibold tracking-tight text-[#1C1D21] truncate">
                  {currentMeta.title}
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tablet & PC Breadcrumbs */}
        <nav className="hidden md:flex items-center gap-2 text-[13px] min-w-0">
          <span className="text-[#646772] font-medium shrink-0">Servolution</span>
          <ChevronRight className="w-3.5 h-3.5 text-[#8A8D98] shrink-0" />
          <div className="relative flex items-center min-w-0 overflow-hidden py-0.5">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`desktop-crumb-${activePage}`}
                initial={{ opacity: 0, y: direction * 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: direction * -8 }}
                transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                className="flex items-center gap-1.5 font-semibold text-[#1C1D21] min-w-0"
              >
                <CurrentPageIcon className={`w-4 h-4 shrink-0 ${currentMeta.iconClass || 'text-[#1C1D21]'}`} />
                <span className="truncate">{currentMeta.title}</span>
              </motion.div>
            </AnimatePresence>
          </div>
        </nav>
      </div>

      {/* Top Right Icons */}
      <div className="flex items-center gap-2 sm:gap-2.5 relative shrink-0">
        {(!isOnline || pendingSyncCount > 0) && (
          <button
            type="button"
            onClick={() => void syncPendingNow()}
            title={
              !isOnline
                ? 'Mode offline — mutasi otomatis antre untuk disinkronkan'
                : `${pendingSyncCount} mutasi menunggu sinkronisasi — klik untuk kirim`
            }
            className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              !isOnline
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-[#F0EFFC] border-[#D6D4FF] text-[#3F3B99] hover:bg-[#E4E1FD]'
            }`}
          >
            {!isOnline ? (
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden sm:inline">
              {!isOnline ? 'Offline' : `Sync (${pendingSyncCount})`}
            </span>
          </button>
        )}

        {/* Notifications Button & Popover */}
        <div ref={notifWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setIsGlobalSearchOpen(false);
              setNotificationsOpen((prev) => {
                playUiMotionSound(!prev ? 'pop' : 'tick');
                return !prev;
              });
            }}
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors relative cursor-pointer ${
              notificationsOpen
                ? 'bg-[#FEF1F5] text-[#9D113C] border-[#FBC2D4]'
                : 'border-black/[0.14] text-[#1C1D21] hover:bg-[#F4F5F8]'
            }`}
          >
            <Bell className="w-4 h-4" />
            {unreadNotifCount > 0 && (
              <span className="min-w-[17px] h-[17px] px-1 rounded-full bg-[#EF4444] text-white text-[10px] font-bold flex items-center justify-center absolute -top-1 -right-1 ring-2 ring-white tabular-nums">
                {unreadNotifCount}
              </span>
            )}
          </button>

          {/* Interactive Notifications Center Popover */}
          {notificationsOpen &&
            createPortal(
              <div
                ref={popoverRef}
                data-no-pull="true"
                style={{
                  top: popoverCoords.top,
                  right: popoverCoords.isSm ? popoverCoords.right : 12,
                  left: popoverCoords.isSm ? undefined : 12,
                }}
                className="fixed sm:w-[400px] bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.22)] border border-black/[0.14] p-4 z-[9999] space-y-3 animate-ui-pop"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-semibold text-[#1C1D21]">Notifications</span>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#FFECEB] text-[#942922] text-[10.5px] font-bold shrink-0">
                        {unreadNotifCount} New
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={toggleBrowserNotifications}
                      title="Aktifkan/Matikan Notifikasi Browser"
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                        browserNotifEnabled
                          ? 'bg-[#E6F9F0] text-[#146C43]'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <BellRing className="w-3 h-3 shrink-0" />
                      <span>{browserNotifEnabled ? 'Alert On' : 'Aktifkan'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#9D113C] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <CheckCheck className="w-3.5 h-3.5 sm:hidden shrink-0" />
                      <span className="sm:hidden">Read</span>
                      <span className="hidden sm:inline">Mark all read</span>
                    </button>
                  </div>
                </div>

                {/* Segmented Filter Control */}
                <div className="flex items-center gap-1 bg-gray-100 p-0.5 rounded-lg">
                  {(
                    [
                      { id: 'All' as const, label: `All (${notifications.length})` },
                      { id: 'Unread' as const, label: `Unread (${unreadNotifCount})` },
                      { id: 'Reminders' as const, label: `Reminders (${reminderNotifCount})` },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setNotificationsFilter(tab.id)}
                      className={`flex-1 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                        notificationsFilter === tab.id
                          ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Notification List */}
                <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto ui-scrollbar space-y-2 pr-1 overscroll-contain">
                  {filteredNotifications.map((notif) => {
                    const theme = PASTEL_THEMES[notif.theme] || PASTEL_THEMES.periwinkle;
                    return (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => {
                          handleNotificationClick(notif);
                          setNotificationsOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          notif.unread
                            ? `${theme.bg} border-black/[0.05]`
                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100/70'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notif.unread ? theme.dot : 'bg-gray-300'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">{notif.title}</span>
                            <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">{notif.time}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{notif.desc}</p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {notif.reminderTag && (
                              <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C]">
                                {notif.reminderTag}
                              </span>
                            )}
                            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-900 shadow-2xs">
                              Open {notif.category} →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredNotifications.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">
                      You&apos;re all caught up! No notifications.
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
        </div>

        {/* Search Button & Popover (Identical Popover Pattern to Notifications) */}
        <div ref={searchWrapperRef} className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(false);
              setIsGlobalSearchOpen((prev) => {
                playUiMotionSound(!prev ? 'pop' : 'tick');
                return !prev;
              });
            }}
            aria-label="Search aplikasi"
            aria-expanded={isGlobalSearchOpen}
            title="Cari modul, tugas, jadwal, siswa, trainer (⌘K / /)"
            className={`w-9 h-9 rounded-full border flex items-center justify-center transition-colors relative cursor-pointer ${
              isGlobalSearchOpen
                ? 'bg-[#FEF1F5] text-[#9D113C] border-[#FBC2D4]'
                : 'border-black/[0.14] text-[#1C1D21] hover:bg-[#F4F5F8]'
            }`}
          >
            <Search className="w-4 h-4 shrink-0" />
          </button>

          {isGlobalSearchOpen &&
            createPortal(
              <div
                ref={searchPopoverRef}
                data-no-pull="true"
                style={{
                  top: searchCoords.top,
                  right: searchCoords.isSm ? searchCoords.right : 12,
                  left: searchCoords.isSm ? undefined : 12,
                }}
                className="fixed sm:w-[400px] bg-white rounded-[24px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.22)] border border-black/[0.14] p-4 z-[9999] space-y-3 animate-ui-pop"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px] font-semibold text-[#1C1D21]">Search</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#F0EFFC] text-[#3F3B99] text-[10.5px] font-bold shrink-0 tabular-nums">
                      {filteredSearchEntries.length} Results
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10.5px] font-mono font-semibold">
                      ⌘K
                    </kbd>
                    {(searchQuery || searchCategory !== 'All') && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery('');
                          setSearchCategory('All');
                          searchInputRef.current?.focus();
                        }}
                        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-[#9D113C] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 shrink-0" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Search Input */}
                <div className="flex items-center gap-2 bg-[#F4F5F8] rounded-xl px-3 py-2 border border-black/[0.12] focus-within:bg-white focus-within:border-[#ee2e65] transition-colors">
                  <Search className="w-3.5 h-3.5 text-[#646772] shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    enterKeyHint="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari modul, tugas, jadwal, siswa, trainer..."
                    className="flex-1 bg-transparent text-xs text-[#1C1D21] placeholder:text-[#646772] outline-none min-w-0"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      aria-label="Hapus pencarian"
                      className="text-gray-400 hover:text-gray-700 cursor-pointer shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Segmented Category Filter Control */}
                <div className="bg-gray-100/90 p-1 rounded-xl border border-black/[0.04]">
                  <HorizontalSlideTrack
                    activeKey={searchCategory}
                    accent="dark"
                    visibility="auto"
                    showControls
                    fadeEdges
                    indicatorSize="wide"
                    trackClassName="flex items-center gap-1"
                    indicatorClassName="mt-1.5 pb-0.5"
                  >
                    {searchCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        data-slide-active={searchCategory === cat ? 'true' : undefined}
                        onClick={() => setSearchCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                          searchCategory === cat
                            ? 'bg-white text-gray-900 shadow-2xs font-semibold'
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </HorizontalSlideTrack>
                </div>

                {/* Search Results List */}
                <div className="max-h-[60vh] sm:max-h-80 overflow-y-auto ui-scrollbar space-y-2 pr-1 overscroll-contain">
                  {filteredSearchEntries.map((item, idx) => {
                    const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
                    const isHighlighted = idx === searchActiveIdx;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseEnter={() => setSearchActiveIdx(idx)}
                        onClick={item.onSelect}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${
                          isHighlighted
                            ? `${theme.bg} border-black/[0.06]`
                            : 'bg-gray-50 border-gray-100 hover:bg-gray-100/70'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${theme.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {item.title}
                            </span>
                            <span className="text-[11px] text-gray-500 shrink-0 tabular-nums">
                              {item.meta}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                            {item.desc}
                          </p>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {item.badge && (
                              <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C]">
                                {item.badge}
                              </span>
                            )}
                            <span className="inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full bg-white text-gray-900 shadow-2xs">
                              Open {item.category} →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                  {filteredSearchEntries.length === 0 && (
                    <div className="text-center py-8 text-xs text-gray-500">
                      Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;.
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
        </div>
      </div>
    </header>
  );
};
