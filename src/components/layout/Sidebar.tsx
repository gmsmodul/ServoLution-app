import React, { useRef, useState, useLayoutEffect } from 'react';
import {
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
  Settings,
  PanelLeft,
  Layers,
  Camera,
  GraduationCap,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PageId } from '../../types';

export const Sidebar: React.FC = () => {
  const {
    activePage,
    setActivePage,
    sidebarOpen,
    setSidebarOpen,
    materialsList,
  } = useApp();

  const mainMenu = [
    { id: 'overview' as PageId, label: 'Overview', icon: LayoutGrid, badge: '⌘ M', isTag: true },
    { id: 'materials' as PageId, label: 'Materials', icon: Library, badge: materialsList.length > 0 ? String(materialsList.length) : null },
    { id: 'prep' as PageId, label: 'Class Preparation', icon: BookOpen },
    { id: 'attendance' as PageId, label: 'Attendance', icon: Clock },
    { id: 'exams' as PageId, label: 'Exams', icon: FileCheck },
    { id: 'assignments' as PageId, label: 'Assignment', icon: Bookmark },
    { id: 'livequiz' as PageId, label: 'LiveQuiz', icon: Zap },
    { id: 'schedule' as PageId, label: 'Schedule', icon: CalendarIcon },
    { id: 'students' as PageId, label: 'Students', icon: Users },
    { id: 'trainers' as PageId, label: 'Trainer', icon: GraduationCap },
    { id: 'analytics' as PageId, label: 'Analytics', icon: BarChart2 },
    { id: 'reports' as PageId, label: 'Reports', icon: FileText },
  ];

  const settingsMenu = [
    { id: 'uikit' as PageId, label: 'UI Design System', icon: Layers, highlight: true },
  ];

  const mainMenuRef = useRef<HTMLDivElement>(null);
  const scrollWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeMenuBtnRef = useRef<HTMLButtonElement | null>(null);
  const [menuIndicator, setMenuIndicator] = useState({ top: 0, height: 0, visible: false });
  const [peekMaxHeight, setPeekMaxHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const updateMenuIndicator = () => {
      const container = mainMenuRef.current;
      const activeBtn = activeMenuBtnRef.current;
      const isMainActive = mainMenu.some((m) => m.id === activePage);
      if (!container || !activeBtn || !isMainActive) {
        setMenuIndicator((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }
      const cRect = container.getBoundingClientRect();
      const bRect = activeBtn.getBoundingClientRect();
      if (bRect.height === 0) return;
      setMenuIndicator({
        top: bRect.top - cRect.top,
        height: bRect.height,
        visible: true,
      });
    };

    updateMenuIndicator();
    const container = mainMenuRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(updateMenuIndicator);
    ro.observe(container);
    return () => ro.disconnect();
  }, [activePage, sidebarOpen]);

  // Size scroll viewport so the last visible boundary item shows half its text when scrollable
  useLayoutEffect(() => {
    const computePeekHeight = () => {
      const wrapper = scrollWrapperRef.current;
      const scroller = scrollContainerRef.current;
      if (!wrapper || !scroller) return;

      const availableHeight = wrapper.clientHeight;
      const totalHeight = scroller.scrollHeight;

      if (availableHeight <= 0 || totalHeight <= availableHeight + 2) {
        setPeekMaxHeight((prev) => (prev !== null ? null : prev));
        return;
      }

      const scrollerRect = scroller.getBoundingClientRect();
      const items = Array.from(
        scroller.querySelectorAll<HTMLElement>('[data-sidebar-item="true"]')
      );

      let targetMid: number | null = null;
      for (const item of items) {
        const rect = item.getBoundingClientRect();
        const topInContent = rect.top - scrollerRect.top + scroller.scrollTop;
        const midInContent = topInContent + rect.height * 0.5;
        if (midInContent <= availableHeight) {
          targetMid = Math.round(midInContent);
        } else {
          break;
        }
      }

      setPeekMaxHeight((prev) => (prev !== targetMid ? targetMid : prev));
    };

    computePeekHeight();
    const wrapper = scrollWrapperRef.current;
    const scroller = scrollContainerRef.current;
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(computePeekHeight) : null;
    if (ro && wrapper) ro.observe(wrapper);
    if (ro && scroller) ro.observe(scroller);
    window.addEventListener('resize', computePeekHeight);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', computePeekHeight);
    };
  }, [sidebarOpen, materialsList.length]);

  const handleNavClick = (id: PageId) => {
    setActivePage(id);
  };

  return (
    <aside
      className={`hidden md:flex md:static inset-y-0 left-0 z-50 h-full max-h-full overflow-hidden shrink-0 flex-col transition-all duration-300 ease-out bg-transparent backdrop-blur-md border-r border-black/[0.04] ${
        sidebarOpen ? 'w-[260px]' : 'w-[84px]'
      } p-4 select-none`}
    >
        {/* Brand Logo Header */}
        <div className="shrink-0 flex items-center justify-between px-2 pt-1 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#ee2e65] flex items-center justify-center text-white shadow-[0_4px_12px_-3px_rgba(238,46,101,0.45)] shrink-0">
              <Camera className="w-4 h-4 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-semibold text-[16px] tracking-tight text-[#1C1D21]">Servolution</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle Sidebar"
            className="hidden md:flex w-8 h-8 rounded-lg hover:bg-black/5 items-center justify-center text-[#6E717A] transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Navigation Region (scrollbar hidden, boundary menu text peeks at 50%) */}
        <div ref={scrollWrapperRef} className="flex-1 min-h-0 flex flex-col">
          <div
            ref={scrollContainerRef}
            className="overflow-y-auto no-scrollbar"
            style={peekMaxHeight !== null ? { maxHeight: `${peekMaxHeight}px` } : undefined}
          >
            {/* Main Menu Group */}
            <div ref={mainMenuRef} className="relative space-y-1">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-0 right-0 top-0 rounded-lg bg-white shadow-xs transition-[transform,height,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                  menuIndicator.visible ? 'opacity-100' : 'opacity-0'
                }`}
                style={{
                  height: `${menuIndicator.height}px`,
                  transform: `translate3d(0, ${menuIndicator.top}px, 0)`,
                }}
              />
              {sidebarOpen && (
                <div className="relative z-10 px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Main menu
                </div>
              )}
              {mainMenu.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    data-sidebar-item="true"
                    ref={isActive ? activeMenuBtnRef : undefined}
                    onClick={() => handleNavClick(item.id)}
                    className={`relative z-10 w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group cursor-pointer ${
                      isActive
                        ? `text-gray-900 font-semibold ${menuIndicator.visible ? '' : 'bg-white shadow-xs'}`
                        : 'text-gray-600 hover:bg-white/60 hover:text-gray-950 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 transition-colors duration-200 ${isActive ? 'text-[#ee2e65]' : 'text-gray-500 group-hover:text-gray-900'}`} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </div>
                    {sidebarOpen && item.badge && (
                      item.isTag ? (
                        <span className="text-xs font-semibold bg-[#F0EFFC] text-[#3F3B99] px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      ) : (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-xs font-semibold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )
                    )}
                  </button>
                );
              })}
            </div>

            {/* System & UI Kit Group */}
            <div className="mt-5 pb-2 space-y-1">
              {sidebarOpen && (
                <div className="px-3 pb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  System & UI Kit
                </div>
              )}
              {settingsMenu.map((item) => {
                const Icon = item.icon;
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    data-sidebar-item="true"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#ee2e65] text-white font-semibold shadow-xs'
                        : item.highlight
                        ? 'bg-primary-50 text-primary-700 font-semibold hover:bg-primary-100'
                        : 'text-gray-600 hover:bg-white/70 hover:text-gray-950 font-medium'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0" />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Settings & Teacher Profile */}
        <div className="shrink-0 pt-3 mt-2 border-t border-black/[0.05] space-y-2.5">
          <button
            onClick={() => setActivePage('settings')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer ${
              activePage === 'settings'
                ? 'bg-white text-gray-900 font-semibold shadow-xs'
                : 'font-medium text-gray-600 hover:bg-white/70 hover:text-gray-900'
            }`}
          >
            <Settings
              className={`w-4 h-4 shrink-0 ${
                activePage === 'settings' ? 'text-[#ee2e65]' : 'text-gray-500'
              }`}
            />
            {sidebarOpen && <span>Settings</span>}
          </button>

          <div className="px-2">
            {sidebarOpen && (
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 px-1">Account</div>
            )}
            <div className="flex items-center gap-3 p-1.5 rounded-2xl hover:bg-white/70 transition-colors cursor-pointer">
              <img
                src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80"
                alt="Rasengan"
                onError={(e) => {
                  e.currentTarget.src = 'https://placehold.co/80x80/1C1D21/FFFFFF?text=RS';
                }}
                className="w-9 h-9 rounded-full object-cover border border-white shadow-xs shrink-0"
              />
              {sidebarOpen && (
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-[#1C1D21] truncate">Rasengan</div>
                  <div className="text-[11px] text-[#8A8D98]">Teacher</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>
  );
};
