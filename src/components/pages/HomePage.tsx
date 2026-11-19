import React, { useState, useEffect, useMemo } from 'react';
import { ArrowUpRight, Pin, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { HOME_SIDEBAR_GROUPS, WORKSPACES_REGISTRY } from '../../constants/workspaces';
import { PASTEL_THEMES } from '../../constants/theme';
import { WorkspaceId } from '../../types';
import { playUiMotionSound } from '../../utils/uiMotionSound';

type QuickAccessGroupFilter = 'all' | 'ministry' | 'office' | 'data';

const PINNED_STORAGE_KEY = 'multimedia_pinned_quick_access_v1';
const DEFAULT_PINNED: WorkspaceId[] = [
  'servolution',
  'editing-project',
  'calendar',
  'live-camera',
];

export const HomePage: React.FC = () => {
  const { enterWorkspace } = useApp();
  const [groupFilter, setGroupFilter] = useState<QuickAccessGroupFilter>('all');
  const [pinnedIds, setPinnedIds] = useState<WorkspaceId[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_PINNED;
    try {
      const raw = window.localStorage.getItem(PINNED_STORAGE_KEY);
      if (!raw) return DEFAULT_PINNED;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (id): id is WorkspaceId =>
            typeof id === 'string' && id !== 'home' && id in WORKSPACES_REGISTRY
        );
      }
    } catch {
      // ignore storage errors
    }
    return DEFAULT_PINNED;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinnedIds));
    } catch {
      // ignore storage errors
    }
  }, [pinnedIds]);

  const workspaceGroups = useMemo(
    () => HOME_SIDEBAR_GROUPS.filter((group) => group.id !== 'main'),
    []
  );

  const visibleGroups = useMemo(() => {
    if (groupFilter === 'all') return workspaceGroups;
    return workspaceGroups.filter((group) => group.id === groupFilter);
  }, [groupFilter, workspaceGroups]);

  const handleOpenWorkspace = (workspaceId: WorkspaceId) => {
    if (workspaceId === 'servolution') {
      enterWorkspace('servolution', { servolutionPage: 'overview' });
    } else {
      enterWorkspace(workspaceId);
    }
  };

  const togglePin = (workspaceId: WorkspaceId) => {
    playUiMotionSound('pop');
    setPinnedIds((prev) =>
      prev.includes(workspaceId)
        ? prev.filter((id) => id !== workspaceId)
        : [...prev, workspaceId]
    );
  };

  const filterTabs: Array<{ id: QuickAccessGroupFilter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'ministry', label: 'Ministry' },
    { id: 'office', label: 'Office' },
    { id: 'data', label: 'Data' },
  ];

  const renderQuickAccessButton = (workspaceId: WorkspaceId, compact = false) => {
    const ws = WORKSPACES_REGISTRY[workspaceId];
    const groupItem = workspaceGroups
      .flatMap((g) => g.items)
      .find((item) => item.workspaceId === workspaceId);
    const Icon = groupItem?.icon || ws.icon;
    const theme = PASTEL_THEMES[ws.theme] || PASTEL_THEMES.periwinkle;
    const isPinned = pinnedIds.includes(workspaceId);

    return (
      <div
        key={`${compact ? 'pin' : 'all'}-${workspaceId}`}
        className="group relative rounded-2xl border border-black/[0.12] bg-white hover:border-[#ee2e65]/40 hover:shadow-[0_10px_28px_-14px_rgba(238,46,101,0.28)] transition-all duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        <button
          type="button"
          onClick={() => handleOpenWorkspace(workspaceId)}
          className={`w-full text-left flex items-center gap-3.5 ${
            compact ? 'p-3.5 pr-11' : 'p-4 pr-11'
          } rounded-2xl active:scale-[0.985] transition-transform cursor-pointer`}
        >
          <div
            className={`${
              compact ? 'w-10 h-10 rounded-xl' : 'w-11 h-11 rounded-xl'
            } ${theme.bg} ${theme.text} border ${theme.border} flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105`}
          >
            <Icon className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[14px] font-semibold text-[#1C1D21] group-hover:text-[#ee2e65] transition-colors truncate">
                {ws.label}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#8A8D98] opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-[#ee2e65] transition-all duration-200 shrink-0" />
            </div>
            <div className="text-[11.5px] font-medium text-[#646772] truncate mt-0.5">
              {ws.groupLabel}
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => togglePin(workspaceId)}
          title={isPinned ? 'Lepas dari Quick Access utama' : 'Sematkan ke Quick Access utama'}
          aria-label={isPinned ? `Unpin ${ws.label}` : `Pin ${ws.label}`}
          className={`absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
            isPinned
              ? 'bg-[#FEF1F5] text-[#ee2e65]'
              : 'text-gray-400 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-gray-100 hover:text-gray-700'
          }`}
        >
          <Pin className={`w-3.5 h-3.5 ${isPinned ? 'fill-current' : ''}`} />
        </button>
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-7 space-y-6 max-w-[1440px] w-full mx-auto">
      {/* Header & Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#9D113C]">
            <Sparkles className="w-3.5 h-3.5 text-[#ee2e65]" />
            <span>Multimedia Hub</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-semibold tracking-tight text-[#1C1D21]">
            Quick Access
          </h1>
          <p className="text-[13px] text-[#646772]">
            Akses cepat ke setiap workspace Multimedia. Klik ikon pin untuk mengatur pintasan utama.
          </p>
        </div>

        {/* Segmented Filter Control */}
        <div className="inline-flex items-center gap-1 bg-gray-100/90 p-1 rounded-xl border border-black/[0.06] overflow-x-auto no-scrollbar self-start sm:self-auto max-w-full">
          {filterTabs.map((tab) => {
            const isActive = groupFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setGroupFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-gray-900 font-semibold shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pinned Quick Access Section */}
      {groupFilter === 'all' && pinnedIds.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              Pinned Shortcuts
            </h2>
            <span className="text-[11.5px] font-medium text-[#646772] tabular-nums">
              {pinnedIds.length} disematkan
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pinnedIds.map((wsId) => renderQuickAccessButton(wsId, true))}
          </div>
        </section>
      )}

      {/* Grouped All Workspaces Quick Access */}
      <div className="space-y-6">
        {visibleGroups.map((group) => (
          <section key={group.id} className="space-y-3">
            <div className="flex items-center justify-between border-b border-black/[0.08] pb-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {group.label}
              </h2>
              <span className="text-[11px] font-medium text-gray-400 tabular-nums">
                {group.items.length} menu
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.items.map((item) => renderQuickAccessButton(item.workspaceId))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};
