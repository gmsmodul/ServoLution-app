import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Plus,
  Eye,
  FileText,
  Presentation,
  Video,
  FlaskConical,
  BookOpen,
  CheckCircle2,
  Play,
  RotateCcw,
  Share2,
  Trash2,
  Edit3,
  X,
  Layers,
  GraduationCap,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  formatClassMobileLabel,
  getAvailableClassOptions,
  normalizeClassKey,
} from '../../utils/scheduleSubjects';
import {
  getCrewEntryForMaterial,
  getCrewOverallMaterialSummary,
  getCrewStatusCategory,
  getMaterialCrewSummary,
} from '../../utils/materialCrewProgress';
import { PASTEL_THEMES } from '../../constants/theme';
import {
  ACTION_BTN_DANGER_SOFT,
  ACTION_BTN_PRIMARY,
  ACTION_BTN_SECONDARY,
  ACTION_BTN_SOFT_PRIMARY,
} from '../../constants/buttonStyles';
import { ClassMaterial } from '../../types';
import { CustomSelect } from '../ui/CustomSelect';
import { useBottomSheetMotion } from '../../hooks/useBottomSheetMotion';
import { SplitFilterButton } from '../ui/SplitFilterButton';
import { InfoPopover } from '../ui/InfoPopover';

type ProgressFilterMode = 'All' | 'Completed' | 'InProgress' | 'NotStarted';

export const MaterialsPage: React.FC = () => {
  const {
    schedules,
    studentsDirectory,
    activeCrewId,
    monitoringBlockVisibility,
    setMonitoringBlockVisibility,
    materialViewerRole,
    materialsList,
    selectedMaterial,
    setSelectedMaterial,
    setActiveVideoPlayer,
    setIsUploadMaterialOpen,
    setEditingMaterial,
    handleDeleteMaterial,
    handleUpdateMaterialProgress,
    setActivePage,
    triggerToast,
  } = useApp();

  const { setSheetElement, backdropRef, animateClose, sheetGestureProps } = useBottomSheetMotion({
    onClose: () => setSelectedMaterial(null),
  });

  // Filter & Search for Daftar Materi (User Side)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [progressFilter, setProgressFilter] = useState<ProgressFilterMode>('All');
  const [sortBy, setSortBy] = useState<'latest' | 'progress' | 'title'>('latest');
  const [confirmDeleteMaterialId, setConfirmDeleteMaterialId] = useState<string | null>(null);

  // Standalone Block: Monitoring Crew independent filters
  const [monitoringSearch, setMonitoringSearch] = useState('');
  const [monitoringClass, setMonitoringClass] = useState<string>('All');
  const [monitoringStatusFilter, setMonitoringStatusFilter] = useState<ProgressFilterMode>('All');
  const [monitoringSortBy, setMonitoringSortBy] = useState<'latest' | 'progress' | 'title'>('latest');
  const [monitoringPage, setMonitoringPage] = useState<number>(1);
  const [monitoringPageSize, setMonitoringPageSize] = useState<number>(5);
  const [expandedCrewId, setExpandedCrewId] = useState<string | null>(
    () => studentsDirectory[0]?.id ?? null
  );

  // Material Detail Modal -> Crew Status filter state
  const [modalCrewFilter, setModalCrewFilter] = useState<ProgressFilterMode>('All');
  const [modalCrewSearch, setModalCrewSearch] = useState('');

  // Visibility permission check for Monitoring Crew standalone block
  const canViewMonitoringBlock =
    materialViewerRole === 'admin' ||
    (materialViewerRole === 'trainer' &&
      (monitoringBlockVisibility === 'admin_trainer' ||
        monitoringBlockVisibility === 'all')) ||
    (materialViewerRole === 'crew' && monitoringBlockVisibility === 'all');

  const classOptions = useMemo(() => {
    const classes = getAvailableClassOptions(
      materialsList.map((m) => m.classCode),
      schedules.map((s) => s.classCode),
      studentsDirectory.map((s) => s.classCode)
    );
    return [
      { value: 'All', label: 'Semua Kelas', mobileLabel: 'Semua' },
      ...classes.map((cls) => ({
        value: cls,
        label: cls,
        mobileLabel: formatClassMobileLabel(cls),
      })),
    ];
  }, [materialsList, schedules, studentsDirectory]);

  // Overall Admin KPI across all crew-material assignments
  const overallCrewStats = useMemo(() => {
    let totalPairs = 0;
    let completedPairs = 0;
    let sumPct = 0;

    materialsList.forEach((mat) => {
      const summary = getMaterialCrewSummary(mat, studentsDirectory);
      if (summary.totalCrew > 0) {
        totalPairs += summary.totalCrew;
        completedPairs += summary.completedCount;
        sumPct += summary.avgProgress * summary.totalCrew;
      }
    });

    return {
      totalPairs,
      completedPairs,
      avgPct: totalPairs > 0 ? Math.round(sumPct / totalPairs) : 0,
    };
  }, [materialsList, studentsDirectory]);

  const getUserContentProgress = (mat: ClassMaterial) => {
    const isVideo = mat.type === 'video';
    const crewEntry = activeCrewId ? getCrewEntryForMaterial(mat, activeCrewId) : null;
    const raw = crewEntry
      ? crewEntry.progress
      : isVideo
      ? mat.watchProgress ?? 0
      : mat.studyProgress ?? mat.watchProgress ?? 0;
    const isDone = crewEntry
      ? crewEntry.isCompleted || crewEntry.progress >= 100
      : Boolean(
          isVideo
            ? mat.isWatchedCompleted || raw >= 100
            : mat.isCompleted || mat.isWatchedCompleted || raw >= 100
        );
    const progress = isDone ? 100 : Math.min(100, Math.max(0, Math.round(raw)));
    const statusText = isVideo
      ? isDone
        ? 'Selesai Ditonton'
        : progress > 0
        ? 'Sedang Ditonton'
        : 'Belum Ditonton'
      : isDone
      ? 'Sudah Dibaca'
      : progress > 0
      ? 'Sedang Dibaca'
      : 'Belum Dibaca';

    return { progress, isDone, statusText, isVideo };
  };

  // User-side content completion badge stats
  const userProgressStats = useMemo(() => {
    const completed = materialsList.filter((m) => getUserContentProgress(m).isDone).length;
    return { total: materialsList.length, completed };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialsList, activeCrewId]);

  // Filtered Materials for "Daftar Materi" (sisi user - progres konten sendiri)
  const filteredMaterials = useMemo(() => {
    return materialsList
      .filter((item) => {
        const matchesClass =
          selectedClass === 'All' ||
          normalizeClassKey(item.classCode) === selectedClass;
        const matchesType =
          selectedType === 'All' || item.type.toLowerCase() === selectedType.toLowerCase();

        const { progress, isDone } = getUserContentProgress(item);
        let matchesProgress = true;
        if (progressFilter === 'Completed') {
          matchesProgress = isDone;
        } else if (progressFilter === 'InProgress') {
          matchesProgress = !isDone && progress > 0;
        } else if (progressFilter === 'NotStarted') {
          matchesProgress = !isDone && progress === 0;
        }

        const matchesSearch =
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.classCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.unitName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

        return matchesClass && matchesType && matchesProgress && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'progress') {
          return getUserContentProgress(b).progress - getUserContentProgress(a).progress;
        }
        return 0;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [materialsList, activeCrewId, selectedClass, selectedType, progressFilter, searchQuery, sortBy]);

  // Filtered Servolution Crew for Standalone Monitoring Crew Block
  const filteredCrewRows = useMemo(() => {
    return studentsDirectory
      .map((student) => ({
        student,
        summary: getCrewOverallMaterialSummary(student, materialsList),
      }))
      .filter(({ student, summary }) => {
        const matchesClass =
          monitoringClass === 'All' ||
          normalizeClassKey(student.classCode) === monitoringClass;

        const allDone =
          summary.totalMaterials > 0 &&
          summary.completedCount === summary.totalMaterials;

        let matchesProgress = true;
        if (monitoringStatusFilter === 'Completed') {
          matchesProgress = allDone;
        } else if (monitoringStatusFilter === 'InProgress') {
          matchesProgress = !allDone && summary.avgProgress > 0;
        } else if (monitoringStatusFilter === 'NotStarted') {
          matchesProgress = summary.avgProgress === 0;
        }

        const q = monitoringSearch.trim().toLowerCase();
        const matchesSearch =
          !q ||
          student.name.toLowerCase().includes(q) ||
          student.email.toLowerCase().includes(q) ||
          student.classCode.toLowerCase().includes(q) ||
          summary.assignedMaterials.some((m) => m.title.toLowerCase().includes(q));

        return matchesClass && matchesProgress && matchesSearch;
      })
      .sort((a, b) => {
        if (monitoringSortBy === 'title') return a.student.name.localeCompare(b.student.name);
        if (monitoringSortBy === 'progress') return b.summary.avgProgress - a.summary.avgProgress;
        return 0;
      });
  }, [
    studentsDirectory,
    materialsList,
    monitoringClass,
    monitoringStatusFilter,
    monitoringSearch,
    monitoringSortBy,
  ]);

  const crewBlockKpis = useMemo(() => {
    const total = filteredCrewRows.length;
    const completedAll = filteredCrewRows.filter(
      ({ summary }) =>
        summary.totalMaterials > 0 && summary.completedCount === summary.totalMaterials
    ).length;
    const avgCompletion =
      total > 0
        ? Math.round(
            filteredCrewRows.reduce((acc, row) => acc + row.summary.avgProgress, 0) / total
          )
        : 0;
    return { total, completedAll, avgCompletion };
  }, [filteredCrewRows]);

  const totalCrewCount = filteredCrewRows.length;
  const totalMonitoringPages = Math.max(1, Math.ceil(totalCrewCount / monitoringPageSize));
  const safeMonitoringPage = Math.min(monitoringPage, totalMonitoringPages);
  const monitoringStartIdx = (safeMonitoringPage - 1) * monitoringPageSize;
  const monitoringEndIdx = Math.min(totalCrewCount, monitoringStartIdx + monitoringPageSize);
  const paginatedCrewRows = useMemo(
    () => filteredCrewRows.slice(monitoringStartIdx, monitoringEndIdx),
    [filteredCrewRows, monitoringStartIdx, monitoringEndIdx]
  );

  const getTypeIcon = (type: ClassMaterial['type']) => {
    switch (type) {
      case 'document':
        return FileText;
      case 'slides':
        return Presentation;
      case 'video':
        return Video;
      case 'lab':
        return FlaskConical;
      case 'reading':
        return BookOpen;
      default:
        return FileText;
    }
  };

  const getTypeIconStyle = (type: ClassMaterial['type']) => {
    switch (type) {
      case 'video':
        return 'bg-[#FEF1F5] text-[#ee2e65]';
      case 'document':
        return 'bg-[#F0EFFC] text-[#3F3B99]';
      case 'slides':
        return 'bg-[#FFF5E6] text-[#8C5811]';
      case 'lab':
        return 'bg-[#E6F9F0] text-[#146C43]';
      case 'reading':
        return 'bg-[#FFECEB] text-[#942922]';
      default:
        return 'bg-[#F0EFFC] text-[#3F3B99]';
    }
  };

  const handleOpenMaterialDetail = (mat: ClassMaterial) => {
    setModalCrewFilter('All');
    setModalCrewSearch('');
    setSelectedMaterial(mat);
  };

  const handlePlayOrOpenMaterial = (mat: ClassMaterial) => {
    if (mat.type === 'video') {
      setActiveVideoPlayer(mat);
      return;
    }
    const { progress, isDone } = getUserContentProgress(mat);
    if (!isDone && progress === 0) {
      handleUpdateMaterialProgress(mat.id, 50, false);
      handleOpenMaterialDetail({ ...mat, studyProgress: 50, isCompleted: false });
    } else {
      handleOpenMaterialDetail(mat);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Header (Tanpa Top Tab) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:flex items-center gap-2.5">
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">
            Daftar Materi Kelas
          </h1>
          {userProgressStats.total > 0 && (
            <span className="px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11.5px] font-bold tabular-nums">
              Selesai {userProgressStats.completed}/{userProgressStats.total}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 sm:flex-initial min-w-[180px]">
            <Search className="w-4 h-4 text-[#8A8D98] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul atau topik..."
              className="w-full sm:w-64 h-9 pl-9 pr-8 rounded-full border border-black/[0.12] text-[13px] bg-white text-[#1C1D21] placeholder:text-[#8A8D98] outline-none focus:border-[#ee2e65]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8D98] hover:text-[#1C1D21] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingMaterial(null);
              setIsUploadMaterialOpen(true);
            }}
            className={ACTION_BTN_PRIMARY}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="sm:hidden">Tambah</span>
            <span className="hidden sm:inline">Tambah Materi</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <SplitFilterButton
            value={selectedClass}
            onChange={setSelectedClass}
            prefix="Kelas"
            icon={GraduationCap}
            variant="primary"
            ariaLabel="Filter class materi"
            options={classOptions}
          />

          <SplitFilterButton
            value={selectedType}
            onChange={setSelectedType}
            prefix="Tipe"
            icon={Layers}
            variant="surface"
            ariaLabel="Filter tipe materi"
            options={[
              { value: 'All', label: 'Semua Tipe', mobileLabel: 'Semua' },
              { value: 'video', label: 'Video', mobileLabel: 'Video' },
              { value: 'document', label: 'Dokumen', mobileLabel: 'Dokumen' },
              { value: 'slides', label: 'Slides', mobileLabel: 'Slides' },
              { value: 'lab', label: 'Lab', mobileLabel: 'Lab' },
            ]}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 ml-auto">

          <CustomSelect
            value={progressFilter}
            onChange={(val) => setProgressFilter(val as ProgressFilterMode)}
            pill
            ariaLabel="Filter status progress"
            className="min-w-[164px]"
            triggerClassName="border-black/[0.08]"
            options={[
              { value: 'All', label: 'Semua Progress' },
              { value: 'Completed', label: 'Sudah Dibaca / Selesai' },
              { value: 'InProgress', label: 'Sedang Dipelajari' },
              { value: 'NotStarted', label: 'Belum Dibaca / Ditonton' },
            ]}
          />

          <CustomSelect
            value={sortBy}
            onChange={(val) => setSortBy(val as 'latest' | 'progress' | 'title')}
            pill
            ariaLabel="Urutkan"
            align="right"
            className="min-w-[152px]"
            triggerClassName="border-black/[0.08]"
            options={[
              { value: 'latest', label: 'Urut: Terbaru' },
              { value: 'progress', label: 'Urut: Progress' },
              { value: 'title', label: 'Urut: Nama (A-Z)' },
            ]}
          />
        </div>
      </div>

      {/* SECTION 1: DAFTAR MATERI (SISI USER) */}
      {filteredMaterials.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-2xl border border-black/[0.07] p-8">
          <Layers className="w-9 h-9 text-[#B4B6C1] mx-auto mb-3" />
          <h3 className="text-[15px] font-semibold text-[#1C1D21]">Tidak ada materi yang sesuai</h3>
          <p className="text-[12.5px] text-[#8A8D98] max-w-sm mx-auto mt-1">
            Sesuaikan kata kunci pencarian atau ubah filter class dan tipe materi.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedClass('All');
              setSelectedType('All');
              setProgressFilter('All');
            }}
            className={`mt-4 ${ACTION_BTN_PRIMARY}`}
          >
            <RotateCcw className="w-4 h-4 sm:hidden shrink-0" />
            <span className="sm:hidden">Reset</span>
            <span className="hidden sm:inline">Reset Semua Filter</span>
          </button>
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-black/[0.12] bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFD] border-b border-black/[0.08] text-[11px] font-semibold uppercase tracking-wider text-[#8A8D98]">
                    <th className="py-3.5 px-5">Materi</th>
                    <th className="py-3.5 px-4">Kelas</th>
                    <th className="py-3.5 px-4">Tipe / Sumber</th>
                    <th className="py-3.5 px-4">Progress Konten</th>
                    <th className="py-3.5 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.08] text-[13px]">
                  {filteredMaterials.map((mat) => {
                    const TypeIcon = getTypeIcon(mat.type);
                    const theme = PASTEL_THEMES[mat.theme] || PASTEL_THEMES.periwinkle;
                    const { progress, isDone, statusText, isVideo } = getUserContentProgress(mat);

                    return (
                      <tr
                        key={mat.id}
                        className="hover:bg-[#FAFBFD] transition-colors group"
                      >
                        {/* Materi & Unit */}
                        <td className="py-3.5 px-5 align-middle">
                          <div className="flex items-center gap-3 min-w-0">
                            <button
                              type="button"
                              onClick={() => handlePlayOrOpenMaterial(mat)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-colors ${getTypeIconStyle(mat.type)}`}
                              title={isVideo ? 'Putar Video' : 'Baca Materi'}
                            >
                              <TypeIcon className="w-4 h-4" />
                            </button>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => handlePlayOrOpenMaterial(mat)}
                                className="font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors cursor-pointer text-left line-clamp-1"
                              >
                                {mat.title}
                              </button>
                              <div className="text-[11.5px] text-[#8A8D98] truncate mt-0.5">
                                {mat.subject} · {mat.unitName}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Kelas */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full ${theme.bg} ${theme.text} text-[11.5px] font-semibold`}>
                            {mat.classCode}
                          </span>
                        </td>

                        {/* Tipe / Sumber */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2 text-[12px] text-[#6E717A] tabular-nums">
                            <span className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10.5px] font-bold tracking-wide uppercase`}>
                              {mat.type}
                            </span>
                            <span className="truncate max-w-[150px]">
                              {mat.sourceLabel || mat.duration || 'Dalam App'}
                            </span>
                          </div>
                        </td>

                        {/* Progress Konten (Sudah Dibaca / Belum & Video %) */}
                        <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                          <div className="w-48 space-y-1.5">
                            <div className="flex items-center justify-between text-[11.5px] tabular-nums gap-2">
                              <span
                                className={`font-semibold ${
                                  isDone
                                    ? 'text-[#146C43]'
                                    : progress > 0
                                    ? 'text-[#8C5811]'
                                    : 'text-[#8A8D98]'
                                }`}
                              >
                                {statusText}
                              </span>
                              <span className="text-[#1C1D21] font-bold">
                                {progress}%{isVideo && mat.duration ? ` · ${mat.duration}` : ''}
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isDone
                                    ? 'bg-[#10B981]'
                                    : progress > 0
                                    ? 'bg-[#ee2e65]'
                                    : 'bg-transparent'
                                }`}
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-5 align-middle text-right whitespace-nowrap">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {isVideo ? (
                              <button
                                onClick={() => setActiveVideoPlayer(mat)}
                                className={ACTION_BTN_SOFT_PRIMARY}
                              >
                                <Play className="w-3.5 h-3.5 fill-[#9D113C] shrink-0" />
                                <span>{isDone ? 'Ulang' : progress > 0 ? 'Lanjut' : 'Putar'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handlePlayOrOpenMaterial(mat)}
                                className={ACTION_BTN_SECONDARY}
                              >
                                <Eye className="w-4 h-4 text-[#6E717A] shrink-0" />
                                <span>Baca</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteMaterialId(null);
                                setEditingMaterial(mat);
                                setIsUploadMaterialOpen(true);
                              }}
                              title="Edit Materi"
                              aria-label="Edit Materi"
                              className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>

                            {confirmDeleteMaterialId === mat.id ? (
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteMaterial(mat.id);
                                  setConfirmDeleteMaterialId(null);
                                }}
                                className="h-9 px-3 rounded-full bg-[#FFECEB] hover:bg-[#FAD2CF] text-[#942922] text-[12px] font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                                <span>Hapus?</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteMaterialId(mat.id)}
                                title="Hapus Materi"
                                aria-label="Hapus Materi"
                                className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View: Unified Clean Hairline List */}
          <div className="md:hidden bg-white rounded-2xl border border-black/[0.12] divide-y divide-black/[0.08] overflow-hidden">
            {filteredMaterials.map((mat) => {
              const TypeIcon = getTypeIcon(mat.type);
              const theme = PASTEL_THEMES[mat.theme] || PASTEL_THEMES.periwinkle;
              const { progress, isDone, statusText, isVideo } = getUserContentProgress(mat);

              return (
                <div key={mat.id} className="p-4 bg-white space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${getTypeIconStyle(mat.type)}`}
                      >
                        <TypeIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-[14px] text-[#1C1D21] line-clamp-2">
                          {mat.title}
                        </h4>
                        <div className="text-[11.5px] text-[#8A8D98] mt-0.5 truncate">
                          {mat.classCode} · {mat.subject}
                          {mat.sourceLabel ? ` · ${mat.sourceLabel}` : ''}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md ${theme.bg} ${theme.text} border ${theme.border} text-[10px] font-bold uppercase shrink-0`}>
                      {mat.type}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    <div className="flex items-center justify-between text-[11.5px] tabular-nums">
                      <span
                        className={`font-semibold ${
                          isDone
                            ? 'text-[#146C43]'
                            : progress > 0
                            ? 'text-[#8C5811]'
                            : 'text-[#8A8D98]'
                        }`}
                      >
                        {statusText}
                      </span>
                      <span className="font-bold text-[#1C1D21]">
                        {progress}%{isVideo && mat.duration ? ` · ${mat.duration}` : ''}
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          isDone
                            ? 'bg-[#10B981]'
                            : progress > 0
                            ? 'bg-[#ee2e65]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-0.5">
                    {isVideo ? (
                      <button
                        onClick={() => setActiveVideoPlayer(mat)}
                        className={`flex-1 ${ACTION_BTN_SOFT_PRIMARY}`}
                      >
                        <Play className="w-3.5 h-3.5 fill-[#9D113C] shrink-0" />
                        <span>{isDone ? 'Ulang' : progress > 0 ? 'Lanjut' : 'Putar Video'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handlePlayOrOpenMaterial(mat)}
                        className={`flex-1 ${ACTION_BTN_SECONDARY}`}
                      >
                        <Eye className="w-4 h-4 text-[#6E717A] shrink-0" />
                        <span>Baca Materi</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteMaterialId(null);
                        setEditingMaterial(mat);
                        setIsUploadMaterialOpen(true);
                      }}
                      title="Edit Materi"
                      aria-label="Edit Materi"
                      className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] text-[#6E717A] hover:text-[#1C1D21] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    {confirmDeleteMaterialId === mat.id ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleDeleteMaterial(mat.id);
                          setConfirmDeleteMaterialId(null);
                        }}
                        className="h-9 px-3 rounded-full bg-[#FFECEB] hover:bg-[#FAD2CF] text-[#942922] text-[12px] font-semibold inline-flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Hapus?</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteMaterialId(mat.id)}
                        title="Hapus Materi"
                        aria-label="Hapus Materi"
                        className="w-9 h-9 rounded-full border border-black/[0.08] bg-white hover:bg-[#FFECEB] text-[#6E717A] hover:text-[#942922] inline-flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SECTION 2: 1 BLOCK TERSENDIRI MONITORING CREW DI BAWAH DAFTAR MATERI */}
      {canViewMonitoringBlock && (
        <section className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
          {/* Block Header + Opsi Siapa yang Dapat Melihat Block Ini */}
          <div className="p-5 border-b border-black/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#FAFBFD]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-[#FEF1F5] text-[#9D113C] flex items-center justify-center shrink-0">
                <Users className="w-4 h-4" />
              </span>
              <h2 className="text-[16px] font-bold text-[#1C1D21]">
                Monitoring Servolution Crew
              </h2>
              <InfoPopover
                label="Informasi Monitoring Servolution Crew"
                content="Progress terisi otomatis berdasarkan materi yang dibaca dan persentase video yang ditonton oleh setiap crew."
              />
              {overallCrewStats.totalPairs > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C] text-[11px] font-bold tabular-nums">
                  {overallCrewStats.completedPairs}/{overallCrewStats.totalPairs} Selesai · {overallCrewStats.avgPct}%
                </span>
              )}
            </div>

            {/* Pengaturan Siapa yang Dapat Melihat Block Ini */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#6E717A]">
                <ShieldCheck className="w-4 h-4 text-[#9D113C]" />
                <span>Dapat dilihat oleh:</span>
              </div>
              <CustomSelect
                value={monitoringBlockVisibility}
                onChange={(val) =>
                  setMonitoringBlockVisibility(val as 'admin_only' | 'admin_trainer' | 'all')
                }
                pill
                align="right"
                ariaLabel="Siapa yang dapat melihat block Monitoring Crew"
                className="min-w-[200px]"
                triggerClassName="border-black/[0.09] bg-white"
                options={[
                  { value: 'admin_only', label: 'Hanya Admin' },
                  { value: 'admin_trainer', label: 'Admin & Trainer' },
                  { value: 'all', label: 'Semua (Admin, Trainer & Crew)' },
                ]}
              />
            </div>
          </div>

          {/* KPI + Filter Controls inside Block */}
          <div className="p-4 sm:px-5 border-b border-black/[0.05] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-[12px] tabular-nums">
              <span className="px-3 py-1 rounded-full bg-[#F4F5F8] text-[#1C1D21] font-semibold">
                {crewBlockKpis.total} Crew
              </span>
              <span className="px-3 py-1 rounded-full bg-[#E6F9F0] text-[#146C43] font-semibold">
                Tuntas Semua: {crewBlockKpis.completedAll}/{crewBlockKpis.total}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#FEF1F5] text-[#9D113C] font-semibold">
                Rata-rata: {crewBlockKpis.avgCompletion}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 sm:flex-initial min-w-[170px]">
                <Search className="w-3.5 h-3.5 text-[#8A8D98] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  enterKeyHint="search"
                  value={monitoringSearch}
                  onChange={(e) => {
                    setMonitoringSearch(e.target.value);
                    setMonitoringPage(1);
                  }}
                  placeholder="Cari nama crew..."
                  className="w-full sm:w-48 h-8 pl-8 pr-7 rounded-full border border-black/[0.12] text-[12px] bg-white text-[#1C1D21] placeholder:text-[#8A8D98] outline-none focus:border-[#ee2e65]"
                />
                {monitoringSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setMonitoringSearch('');
                      setMonitoringPage(1);
                    }}
                    aria-label="Hapus pencarian crew"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#8A8D98] hover:text-[#1C1D21] cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              <CustomSelect
                value={monitoringClass}
                onChange={(val) => {
                  setMonitoringClass(val);
                  setMonitoringPage(1);
                }}
                pill
                ariaLabel="Filter kelas monitoring crew"
                className="min-w-[130px]"
                triggerClassName="border-black/[0.08]"
                options={classOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
              />

              <CustomSelect
                value={monitoringStatusFilter}
                onChange={(val) => {
                  setMonitoringStatusFilter(val as ProgressFilterMode);
                  setMonitoringPage(1);
                }}
                pill
                ariaLabel="Filter status monitoring crew"
                className="min-w-[148px]"
                triggerClassName="border-black/[0.08]"
                options={[
                  { value: 'All', label: 'Semua Status' },
                  { value: 'Completed', label: 'Tuntas (100%)' },
                  { value: 'InProgress', label: 'Aktif Belajar' },
                  { value: 'NotStarted', label: 'Belum Mulai' },
                ]}
              />

              <CustomSelect
                value={monitoringSortBy}
                onChange={(val) => {
                  setMonitoringSortBy(val as 'latest' | 'progress' | 'title');
                  setMonitoringPage(1);
                }}
                pill
                align="right"
                ariaLabel="Urutkan crew"
                className="min-w-[142px]"
                triggerClassName="border-black/[0.08]"
                options={[
                  { value: 'latest', label: 'Urut: Default' },
                  { value: 'progress', label: 'Urut: Progress' },
                  { value: 'title', label: 'Urut: Nama (A-Z)' },
                ]}
              />
            </div>
          </div>

          {/* Crew Progress List inside Block */}
          {filteredCrewRows.length === 0 ? (
            <div className="text-center py-12 p-6">
              <Users className="w-8 h-8 text-[#B4B6C1] mx-auto mb-2.5" />
              <div className="text-[14px] font-semibold text-[#1C1D21]">
                Tidak ada Servolution Crew yang sesuai
              </div>
              <p className="text-[12px] text-[#8A8D98] mt-1">
                Ubah kata kunci pencarian atau pilih filter kelas lain.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMonitoringSearch('');
                  setMonitoringClass('All');
                  setMonitoringStatusFilter('All');
                  setMonitoringPage(1);
                }}
                className={`mt-3 ${ACTION_BTN_SECONDARY}`}
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>Reset Filter Crew</span>
              </button>
            </div>
          ) : (
            <>
              <div className="divide-y divide-black/[0.06]">
                {paginatedCrewRows.map(({ student, summary }) => {
                const isExpanded = expandedCrewId === student.id;
                const allDone =
                  summary.totalMaterials > 0 &&
                  summary.completedCount === summary.totalMaterials;

                return (
                  <div key={student.id} className="bg-white">
                    {/* Crew Summary Row */}
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedCrewId(isExpanded ? null : student.id)
                      }
                      className="w-full p-4 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFBFD] transition-colors text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-10 h-10 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${student.color}`}
                        >
                          {student.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-[14px] text-[#1C1D21] truncate">
                              {student.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-[#F4F5F8] text-[#5A5D67] text-[11px] font-semibold">
                              {student.classCode}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10.5px] font-bold ${
                                allDone
                                  ? 'bg-[#E6F9F0] text-[#146C43]'
                                  : summary.avgProgress > 0
                                  ? 'bg-[#FFF5E6] text-[#8C5811]'
                                  : 'bg-[#F4F5F8] text-[#8A8D98]'
                              }`}
                            >
                              {allDone
                                ? 'Tuntas'
                                : summary.avgProgress > 0
                                ? 'Aktif Belajar'
                                : 'Belum Mulai'}
                            </span>
                          </div>
                          <div className="text-[11.5px] text-[#8A8D98] truncate mt-0.5">
                            {student.email} · {summary.completedCount}/{summary.totalMaterials} Materi Selesai
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="w-40 space-y-1">
                          <div className="flex items-center justify-between text-[11.5px] tabular-nums">
                            <span className="text-[#6E717A] font-medium">Progress</span>
                            <span className="font-bold text-[#1C1D21]">
                              {summary.avgProgress}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                allDone
                                  ? 'bg-[#10B981]'
                                  : summary.avgProgress > 0
                                  ? 'bg-[#ee2e65]'
                                  : 'bg-transparent'
                              }`}
                              style={{ width: `${summary.avgProgress}%` }}
                            />
                          </div>
                        </div>

                        <span className="w-8 h-8 rounded-full bg-[#F4F5F8] text-[#6E717A] flex items-center justify-center shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Per-Material Breakdown (Otomatis Read-Only) */}
                    {isExpanded && (
                      <div className="bg-[#FAFBFD] border-t border-black/[0.05] px-4 sm:px-5 py-3.5 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11.5px] font-semibold uppercase tracking-wider text-[#6E717A]">
                            Daftar Materi {student.classCode} ({summary.assignedMaterials.length}) · Otomatis dari Aktivitas Crew
                          </span>
                          <span className="text-[11.5px] text-[#8A8D98] tabular-nums">
                            {summary.completedCount} selesai · {summary.inProgressCount} proses ·{' '}
                            {summary.notStartedCount} belum
                          </span>
                        </div>

                        {summary.assignedMaterials.length === 0 ? (
                          <div className="p-4 rounded-xl bg-white border border-black/[0.06] text-[12.5px] text-[#8A8D98]">
                            Belum ada materi yang ditugaskan untuk kelas {student.classCode}.
                          </div>
                        ) : (
                          <div className="bg-white rounded-xl border border-black/[0.06] divide-y divide-black/[0.05] overflow-hidden">
                            {summary.assignedMaterials.map((mat) => {
                              const TypeIcon = getTypeIcon(mat.type);
                              const entry = getCrewEntryForMaterial(mat, student.id);
                              const cat = getCrewStatusCategory(entry);
                              const isVideoMat = mat.type === 'video';
                              const readLabel = isVideoMat
                                ? cat === 'completed'
                                  ? 'Selesai Ditonton · 100%'
                                  : cat === 'in_progress'
                                  ? `Ditonton · ${entry.progress}%`
                                  : 'Belum Ditonton · 0%'
                                : cat === 'completed'
                                ? 'Sudah Dibaca · 100%'
                                : cat === 'in_progress'
                                ? `Sedang Dibaca · ${entry.progress}%`
                                : 'Belum Dibaca · 0%';

                              return (
                                <div
                                  key={mat.id}
                                  className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <button
                                      type="button"
                                      onClick={() => handleOpenMaterialDetail(mat)}
                                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer ${getTypeIconStyle(mat.type)}`}
                                    >
                                      <TypeIcon className="w-3.5 h-3.5" />
                                    </button>
                                    <div className="min-w-0">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenMaterialDetail(mat)}
                                        className="text-[13px] font-semibold text-[#1C1D21] hover:text-[#9D113C] text-left truncate block max-w-full cursor-pointer"
                                      >
                                        {mat.title}
                                      </button>
                                      <div className="text-[11px] text-[#8A8D98] truncate">
                                        {mat.subject} · {mat.type.toUpperCase()}
                                        {entry.updatedAt
                                          ? ` · Terakhir aktif ${entry.updatedAt}`
                                          : ' · Belum ada aktivitas'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                                    <div className="w-24 h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden hidden sm:block">
                                      <div
                                        className={`h-full rounded-full transition-all duration-300 ${
                                          cat === 'completed'
                                            ? 'bg-[#10B981]'
                                            : cat === 'in_progress'
                                            ? 'bg-[#ee2e65]'
                                            : 'bg-transparent'
                                        }`}
                                        style={{ width: `${entry.progress}%` }}
                                      />
                                    </div>

                                    <span
                                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold tabular-nums ${
                                        cat === 'completed'
                                          ? 'bg-[#E6F9F0] text-[#146C43]'
                                          : cat === 'in_progress'
                                          ? 'bg-[#FFF5E6] text-[#8C5811]'
                                          : 'bg-[#F4F5F8] text-[#6E717A]'
                                      }`}
                                    >
                                      {readLabel}
                                    </span>

                                    <button
                                      type="button"
                                      onClick={() => handleOpenMaterialDetail(mat)}
                                      title="Lihat Detail Materi & Crew"
                                      className="w-7 h-7 rounded-full border border-black/[0.08] bg-white hover:bg-[#FEF1F5] text-[#6E717A] hover:text-[#9D113C] inline-flex items-center justify-center cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              </div>

              {/* Pagination Footer */}
              <div className="px-4 sm:px-5 py-3.5 border-t border-black/[0.06] bg-[#FAFBFD] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-[#6E717A]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-medium text-[#6E717A]">Baris:</span>
                  <CustomSelect
                    value={String(monitoringPageSize)}
                    onChange={(val) => {
                      setMonitoringPageSize(Number(val));
                      setMonitoringPage(1);
                    }}
                    pill
                    ariaLabel="Jumlah crew per halaman"
                    className="min-w-[70px]"
                    triggerClassName="py-1.5 px-3 text-[12.5px] rounded-full border-black/[0.1] bg-white"
                    options={[
                      { value: '5', label: '5' },
                      { value: '10', label: '10' },
                      { value: '20', label: '20' },
                      { value: '50', label: '50' },
                    ]}
                  />
                  <span className="tabular-nums">
                    Menampilkan {totalCrewCount === 0 ? 0 : monitoringStartIdx + 1}–{monitoringEndIdx} dari {totalCrewCount} crew
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeMonitoringPage <= 1}
                    onClick={() => setMonitoringPage(1)}
                    aria-label="Halaman pertama"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={safeMonitoringPage <= 1}
                    onClick={() => setMonitoringPage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman sebelumnya"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3.5 h-8 rounded-full border border-black/[0.08] bg-white text-[12px] font-semibold text-[#1C1D21] inline-flex items-center justify-center tabular-nums">
                    {safeMonitoringPage} / {totalMonitoringPages}
                  </span>
                  <button
                    type="button"
                    disabled={safeMonitoringPage >= totalMonitoringPages}
                    onClick={() => setMonitoringPage((p) => Math.min(totalMonitoringPages, p + 1))}
                    aria-label="Halaman berikutnya"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={safeMonitoringPage >= totalMonitoringPages}
                    onClick={() => setMonitoringPage(totalMonitoringPages)}
                    aria-label="Halaman terakhir"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Material Detail Modal */}
      {selectedMaterial &&
        createPortal(
          <div
            ref={backdropRef}
            data-modal-sheet-backdrop="true"
            className="animate-ui-fade fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-5 no-print"
          >
            <div
              ref={setSheetElement}
              {...sheetGestureProps}
              className="bg-white rounded-t-[28px] sm:rounded-2xl max-w-2xl w-full p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] sm:pb-6 shadow-2xl border border-black/[0.12] max-h-[90vh] overflow-y-auto space-y-4 animate-bottom-sheet"
            >
              <div
                data-sheet-handle="true"
                className="sm:hidden flex justify-center py-2 -mt-3 -mb-1 cursor-grab active:cursor-grabbing touch-none"
              >
                <div className="w-10 h-1 bg-black/20 rounded-full animate-sheet-handle" />
              </div>

              {/* Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#FEF1F5] text-[#9D113C]">
                      {selectedMaterial.classCode}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {selectedMaterial.subject} · {selectedMaterial.grade}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mt-1">
                    {selectedMaterial.title}
                  </h2>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Diunggah oleh {selectedMaterial.author} · {selectedMaterial.uploadedAt}
                  </div>
                </div>
                <button
                  onClick={animateClose}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Deskripsi Materi
                </div>
                <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3.5 rounded-xl border border-gray-100">
                  {selectedMaterial.description}
                </p>
              </div>

              {/* Source & Metadata */}
              {(selectedMaterial.sourceLabel ||
                selectedMaterial.sourcePage ||
                selectedMaterial.duration) && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex flex-wrap items-center justify-between text-xs text-gray-600 gap-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Tipe: <strong className="uppercase">{selectedMaterial.type}</strong>
                    </span>
                    {selectedMaterial.duration && (
                      <span>
                        Durasi: <strong>{selectedMaterial.duration}</strong>
                      </span>
                    )}
                    {selectedMaterial.sourceLabel && (
                      <span>
                        Sumber: <strong>{selectedMaterial.sourceLabel}</strong>
                      </span>
                    )}
                  </div>
                  {selectedMaterial.sourcePage && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetPage = selectedMaterial.sourcePage!;
                        setSelectedMaterial(null);
                        setActivePage(targetPage);
                      }}
                      className="inline-flex items-center gap-1 text-[#9D113C] font-semibold hover:underline cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Buka Halaman</span>
                    </button>
                  )}
                </div>
              )}

              {/* Progress Konten User (Sudah Dibaca / Belum & Video %) */}
              {(() => {
                const { progress, isDone, statusText, isVideo } = getUserContentProgress(selectedMaterial);
                return (
                  <div className="p-3.5 bg-[#FAFBFD] rounded-xl border border-black/[0.06] space-y-2.5">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-[#1C1D21]">
                        {isVideo ? 'Progress Menonton Video' : 'Status Baca Materi'}
                      </span>
                      <span
                        className={`font-bold tabular-nums ${
                          isDone
                            ? 'text-[#146C43]'
                            : progress > 0
                            ? 'text-[#8C5811]'
                            : 'text-[#6E717A]'
                        }`}
                      >
                        {statusText} · {progress}%
                      </span>
                    </div>

                    <div className="w-full h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isDone
                            ? 'bg-[#10B981]'
                            : progress > 0
                            ? 'bg-[#ee2e65]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {!isVideo && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {[
                          { pct: 0, label: 'Belum Dibaca (0%)' },
                          { pct: 50, label: 'Sedang Dibaca (50%)' },
                          { pct: 100, label: 'Sudah Dibaca (100%)' },
                        ].map((step) => {
                          const isStepActive = progress === step.pct;
                          return (
                            <button
                              key={step.pct}
                              type="button"
                              onClick={() =>
                                handleUpdateMaterialProgress(
                                  selectedMaterial.id,
                                  step.pct,
                                  step.pct >= 100
                                )
                              }
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                                isStepActive
                                  ? step.pct === 100
                                    ? 'bg-[#10B981] text-white'
                                    : 'bg-[#1C1D21] text-white'
                                  : 'bg-white border border-black/[0.09] text-[#6E717A] hover:text-[#1C1D21]'
                              }`}
                            >
                              {step.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Status & Progress per Servolution Crew (Hanya ditampilkan jika role diizinkan melihat block Monitoring Crew) */}
              {canViewMonitoringBlock && (() => {
                const summary = getMaterialCrewSummary(selectedMaterial, studentsDirectory);
                const allDone =
                  summary.totalCrew > 0 && summary.completedCount === summary.totalCrew;
                const isVideoMat = selectedMaterial.type === 'video';

                const visibleCrew = summary.crew.filter((member) => {
                  const entry = getCrewEntryForMaterial(selectedMaterial, member.id);
                  const cat = getCrewStatusCategory(entry);
                  if (modalCrewFilter === 'Completed' && cat !== 'completed') return false;
                  if (modalCrewFilter === 'InProgress' && cat !== 'in_progress') return false;
                  if (modalCrewFilter === 'NotStarted' && cat !== 'not_started') return false;
                  if (modalCrewSearch.trim()) {
                    const q = modalCrewSearch.trim().toLowerCase();
                    return (
                      member.name.toLowerCase().includes(q) ||
                      member.email.toLowerCase().includes(q)
                    );
                  }
                  return true;
                });

                return (
                  <div className="p-4 bg-[#FAFBFD] rounded-2xl border border-black/[0.06] space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-[13px] font-bold text-[#1C1D21]">
                          Status & Progress Servolution Crew
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] tabular-nums mt-0.5">
                          {summary.completedCount} dari {summary.totalCrew} crew selesai · Rata-rata{' '}
                          <strong className="text-[#1C1D21]">{summary.avgProgress}%</strong>
                        </div>
                      </div>

                      <span className="px-2.5 py-1 rounded-full bg-white border border-black/[0.08] text-[10.5px] font-semibold text-[#6E717A]">
                        Otomatis dari aktivitas crew
                      </span>
                    </div>

                    {/* Aggregate Progress Bar */}
                    <div className="w-full h-2 rounded-full bg-black/[0.06] overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          allDone
                            ? 'bg-[#10B981]'
                            : summary.avgProgress > 0
                            ? 'bg-[#ee2e65]'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${summary.avgProgress}%` }}
                      />
                    </div>

                    {/* Filter Pills + Optional Search */}
                    {summary.totalCrew > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(
                            [
                              { id: 'All', label: `Semua (${summary.totalCrew})` },
                              { id: 'Completed', label: `Selesai (${summary.completedCount})` },
                              { id: 'InProgress', label: `Sedang (${summary.inProgressCount})` },
                              { id: 'NotStarted', label: `Belum (${summary.notStartedCount})` },
                            ] as const
                          ).map((pill) => (
                            <button
                              key={pill.id}
                              type="button"
                              onClick={() => setModalCrewFilter(pill.id)}
                              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors cursor-pointer ${
                                modalCrewFilter === pill.id
                                  ? 'bg-[#1C1D21] text-white'
                                  : 'bg-white border border-black/[0.08] text-[#6E717A] hover:text-[#1C1D21]'
                              }`}
                            >
                              {pill.label}
                            </button>
                          ))}
                        </div>

                        {summary.totalCrew > 4 && (
                          <input
                            type="text"
                            enterKeyHint="search"
                            value={modalCrewSearch}
                            onChange={(e) => setModalCrewSearch(e.target.value)}
                            placeholder="Cari crew..."
                            className="h-7 px-3 rounded-full border border-black/[0.12] text-[11.5px] bg-white text-[#1C1D21] outline-none focus:border-[#ee2e65] w-36"
                          />
                        )}
                      </div>
                    )}

                    {/* Individual Servolution Crew List (Read-Only) */}
                    {summary.totalCrew === 0 ? (
                      <div className="p-4 rounded-xl bg-white border border-black/[0.06] text-xs text-[#8A8D98] text-center">
                        Belum ada Servolution Crew yang terdaftar di {selectedMaterial.classCode}.
                      </div>
                    ) : visibleCrew.length === 0 ? (
                      <div className="p-4 rounded-xl bg-white border border-black/[0.06] text-xs text-[#8A8D98] text-center">
                        Tidak ada crew dengan filter status ini.
                      </div>
                    ) : (
                      <div className="bg-white rounded-xl border border-black/[0.06] divide-y divide-black/[0.05] max-h-60 overflow-y-auto">
                        {visibleCrew.map((member) => {
                          const entry = getCrewEntryForMaterial(selectedMaterial, member.id);
                          const cat = getCrewStatusCategory(entry);
                          const memberLabel = isVideoMat
                            ? cat === 'completed'
                              ? 'Selesai Ditonton · 100%'
                              : cat === 'in_progress'
                              ? `Ditonton · ${entry.progress}%`
                              : 'Belum Ditonton · 0%'
                            : cat === 'completed'
                            ? 'Sudah Dibaca · 100%'
                            : cat === 'in_progress'
                            ? `Sedang Dibaca · ${entry.progress}%`
                            : 'Belum Dibaca · 0%';

                          return (
                            <div
                              key={member.id}
                              className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span
                                  className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${member.color}`}
                                >
                                  {member.initials}
                                </span>
                                <div className="min-w-0">
                                  <div className="text-[12.5px] font-semibold text-[#1C1D21] truncate">
                                    {member.name}
                                  </div>
                                  <div className="text-[11px] text-[#8A8D98] truncate">
                                    {member.classCode}
                                    {entry.updatedAt
                                      ? ` · Terakhir aktif ${entry.updatedAt}`
                                      : ' · Belum ada aktivitas'}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0">
                                <div className="w-20 h-1.5 rounded-full bg-[#F4F5F8] overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      cat === 'completed'
                                        ? 'bg-[#10B981]'
                                        : cat === 'in_progress'
                                        ? 'bg-[#ee2e65]'
                                        : 'bg-transparent'
                                    }`}
                                    style={{ width: `${entry.progress}%` }}
                                  />
                                </div>

                                <span
                                  className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold tabular-nums ${
                                    cat === 'completed'
                                      ? 'bg-[#E6F9F0] text-[#146C43]'
                                      : cat === 'in_progress'
                                      ? 'bg-[#FFF5E6] text-[#8C5811]'
                                      : 'bg-[#F4F5F8] text-[#6E717A]'
                                  }`}
                                >
                                  {memberLabel}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div className="pt-2 flex flex-row items-center gap-2 justify-between">
                <button
                  onClick={() => {
                    handleDeleteMaterial(selectedMaterial.id);
                  }}
                  className={`flex-1 sm:flex-initial ${ACTION_BTN_DANGER_SOFT}`}
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span className="sm:hidden">Hapus</span>
                  <span className="hidden sm:inline">Hapus Materi</span>
                </button>

                <div className="flex-[2] sm:flex-initial flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(window.location.href);
                      triggerToast('Tautan Disalin', 'Tautan materi telah disalin.', 'info');
                    }}
                    className={ACTION_BTN_SECONDARY}
                  >
                    <Share2 className="w-4 h-4 text-[#6E717A] shrink-0" />
                    <span>Bagikan</span>
                  </button>

                  {selectedMaterial.type === 'video' ? (
                    <button
                      type="button"
                      onClick={() => {
                        const target = selectedMaterial;
                        setSelectedMaterial(null);
                        setActiveVideoPlayer(target);
                      }}
                      className={ACTION_BTN_PRIMARY}
                    >
                      <Play className="w-4 h-4 shrink-0" />
                      <span>Putar Video</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={animateClose}
                      className={ACTION_BTN_PRIMARY}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Tutup</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
