import React, { useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BarChart2,
  BookOpen,
  Bookmark,
  Braces,
  Calendar,
  Clock,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Layers,
  LayoutGrid,
  Library,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReportExportFormat, ReportItem, ReportMenuKey } from '../../types';
import {
  REPORT_MENU_CATALOG,
  CompiledMenuReport,
  ReportTone,
  compileMenuReport,
  getReportMenuMeta,
  resolveMenuKeyFromReportItem,
} from '../../utils/reportBuilders';
import { getAvailableClassOptions } from '../../utils/scheduleSubjects';
import { CustomSelect } from '../ui/CustomSelect';
import { InfoPopover } from '../ui/InfoPopover';
import { ToggleSwitch } from '../ui/ToggleSwitch';
import { ACTION_BTN_PRIMARY, ACTION_BTN_SECONDARY } from '../../constants/buttonStyles';

type ReportsViewTab = 'menus' | 'archive';

const MENU_ICONS: Record<ReportMenuKey, React.ComponentType<{ className?: string }>> = {
  all_menus: Layers,
  overview: LayoutGrid,
  materials: Library,
  prep: BookOpen,
  attendance: Clock,
  exams: FileCheck,
  assignments: Bookmark,
  livequiz: Zap,
  schedule: Calendar,
  students: Users,
  trainers: GraduationCap,
};

const KPI_TONE_STYLES: Record<ReportTone, { bg: string; label: string; sub: string }> = {
  periwinkle: { bg: 'bg-[#F0EFFC]/80', label: 'text-[#3F3B99]', sub: 'text-[#5854A8]' },
  mint: { bg: 'bg-[#E6F9F0]/80', label: 'text-[#146C43]', sub: 'text-[#35684E]' },
  coral: { bg: 'bg-[#FEF1F5]/80', label: 'text-[#9D113C]', sub: 'text-[#7D3A51]' },
  peach: { bg: 'bg-[#FFF5E6]/80', label: 'text-[#8C5811]', sub: 'text-[#8C5811]' },
  slate: { bg: 'bg-[#FAFBFD]', label: 'text-[#434652]', sub: 'text-[#6E717A]' },
};

export const ReportsPage: React.FC = () => {
  const {
    activeBatch,
    graduationRule,
    examGradingRule,
    exams,
    examAssessments,
    assignments,
    lessonPlans,
    schedules,
    studentsDirectory,
    trainersDirectory,
    trainerFeedbackParameters,
    trainerFeedbacks,
    materialsList,
    liveQuizzes,
    liveQuizReports,
    attendanceByClass,
    qrCheckIns,
    reportsList,
    handleDeleteReport,
    handleExportCompiledReport,
    setIsGenerateReportOpen,
    setActivePage,
  } = useApp();

  const [viewTab, setViewTab] = useState<ReportsViewTab>('menus');
  const [selectedMenuKey, setSelectedMenuKey] = useState<ReportMenuKey>('all_menus');
  const [selectedArchiveId, setSelectedArchiveId] = useState<string>(
    reportsList[0]?.id || ''
  );
  const [classFilter, setClassFilter] = useState<string>('All Classes');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeFullBundle, setIncludeFullBundle] = useState<boolean>(true);

  const classOptions = useMemo(
    () =>
      getAvailableClassOptions(
        Object.keys(attendanceByClass),
        schedules.map((s) => s.classCode),
        assignments.map((a) => a.classCode)
      ),
    [attendanceByClass, schedules, assignments]
  );

  const datasetInput = useMemo(
    () => ({
      activeBatch,
      graduationRule,
      examGradingRule,
      exams,
      examAssessments,
      assignments,
      lessonPlans,
      schedules,
      studentsDirectory,
      trainersDirectory,
      trainerFeedbackParameters,
      trainerFeedbacks,
      materialsList,
      liveQuizzes,
      liveQuizReports,
      attendanceByClass,
      qrCheckIns,
    }),
    [
      activeBatch,
      graduationRule,
      examGradingRule,
      exams,
      examAssessments,
      assignments,
      lessonPlans,
      schedules,
      studentsDirectory,
      trainersDirectory,
      trainerFeedbackParameters,
      trainerFeedbacks,
      materialsList,
      liveQuizzes,
      liveQuizReports,
      attendanceByClass,
      qrCheckIns,
    ]
  );

  // Compile live previews for all menus in catalog (fast pure memo)
  const compiledByMenu = useMemo(() => {
    const map = {} as Record<ReportMenuKey, CompiledMenuReport>;
    REPORT_MENU_CATALOG.forEach((item) => {
      map[item.key] = compileMenuReport({
        menuKey: item.key,
        classFilter,
        data: datasetInput,
      });
    });
    return map;
  }, [classFilter, datasetInput]);

  const filteredMenuCatalog = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return REPORT_MENU_CATALOG;
    return REPORT_MENU_CATALOG.filter(
      (m) =>
        m.label.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.category.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredArchiveReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return reportsList.filter((r) => {
      const catOk =
        archiveCategoryFilter === 'All' || r.category === archiveCategoryFilter;
      if (!catOk) return false;
      if (!q) return true;
      return (
        r.title.toLowerCase().includes(q) ||
        r.classCode.toLowerCase().includes(q) ||
        r.summary.toLowerCase().includes(q)
      );
    });
  }, [reportsList, archiveCategoryFilter, searchQuery]);

  const selectedArchiveItem: ReportItem | undefined = useMemo(() => {
    return (
      reportsList.find((r) => r.id === selectedArchiveId) ||
      filteredArchiveReports[0] ||
      reportsList[0]
    );
  }, [reportsList, selectedArchiveId, filteredArchiveReports]);

  const activeCompiledReport: CompiledMenuReport = useMemo(() => {
    if (viewTab === 'archive' && selectedArchiveItem) {
      return compileMenuReport({
        id: selectedArchiveItem.id,
        menuKey: resolveMenuKeyFromReportItem(selectedArchiveItem),
        classFilter: selectedArchiveItem.classCode,
        title: selectedArchiveItem.title,
        notes: selectedArchiveItem.notes,
        generatedAt: selectedArchiveItem.generatedDate,
        data: datasetInput,
      });
    }
    return compiledByMenu[selectedMenuKey] || compiledByMenu.all_menus;
  }, [viewTab, selectedArchiveItem, compiledByMenu, selectedMenuKey, datasetInput]);

  const triggerExport = (format: ReportExportFormat) => {
    const bundleFlag =
      includeFullBundle && activeCompiledReport.menuKey === 'all_menus';
    handleExportCompiledReport(activeCompiledReport, format, bundleFlag);
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05] no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">
              Reports Center
            </h1>
            <InfoPopover
              label="Informasi Reports Center"
              content="Seluruh 10 menu operasional tersinkron real-time dalam satu batch aktif dan siap diekspor ke Excel, PDF, CSV, atau JSON."
            />
          </div>
          <p className="text-[12.5px] text-[#6E717A] mt-0.5 tabular-nums">
            {activeBatch.batchName} · Tahun {activeBatch.year}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {viewTab === 'menus' && (
            <CustomSelect
              value={classFilter}
              onChange={setClassFilter}
              pill
              ariaLabel="Filter kelas laporan"
              className="min-w-[168px]"
              triggerClassName="border-black/[0.08]"
              options={[
                { value: 'All Classes', label: 'All Classes' },
                ...classOptions.map((cls) => ({
                  value: cls,
                  label: cls,
                })),
              ]}
            />
          )}

          <button
            type="button"
            onClick={() => triggerExport('excel')}
            className={ACTION_BTN_SECONDARY}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0 text-[#146C43]" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setIsGenerateReportOpen(true)}
            className={ACTION_BTN_PRIMARY}
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Buat Laporan</span>
          </button>
        </div>
      </div>

      {/* Mode Tabs + Search + Archive Category Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div className="inline-flex items-center gap-1 bg-[#F4F5F8] p-1 rounded-xl self-start">
          <button
            type="button"
            onClick={() => setViewTab('menus')}
            className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
              viewTab === 'menus'
                ? 'bg-white text-[#1C1D21] shadow-xs'
                : 'text-[#6E717A] hover:text-[#1C1D21]'
            }`}
          >
            Laporan Live per Menu ({REPORT_MENU_CATALOG.length})
          </button>
          <button
            type="button"
            onClick={() => setViewTab('archive')}
            className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
              viewTab === 'archive'
                ? 'bg-white text-[#1C1D21] shadow-xs'
                : 'text-[#6E717A] hover:text-[#1C1D21]'
            }`}
          >
            Arsip Tersimpan ({reportsList.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {viewTab === 'archive' && (
            <CustomSelect
              value={archiveCategoryFilter}
              onChange={setArchiveCategoryFilter}
              pill
              ariaLabel="Filter kategori arsip"
              className="min-w-[144px]"
              triggerClassName="border-black/[0.08]"
              options={[
                { value: 'All', label: 'Semua Kategori' },
                { value: 'Academic', label: 'Academic' },
                { value: 'Attendance', label: 'Attendance' },
                { value: 'Assessments', label: 'Assessments' },
                { value: 'Advisory', label: 'Advisory' },
              ]}
            />
          )}

          <div className="relative min-w-[210px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-[#646772] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              enterKeyHint="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                viewTab === 'menus'
                  ? 'Cari menu laporan...'
                  : 'Cari arsip laporan...'
              }
              className="w-full pl-9 pr-3.5 py-2 text-[12.5px] rounded-xl bg-white border border-black/[0.12] outline-none focus:border-[#ee2e65]"
            />
          </div>
        </div>
      </div>

      {/* 12-Col Master-Detail Report Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 4 COLS: Menu / Archive Selector */}
        <div className="lg:col-span-4 border border-black/[0.07] rounded-2xl bg-white divide-y divide-black/[0.06] overflow-hidden no-print">
          {viewTab === 'menus' ? (
            filteredMenuCatalog.length > 0 ? (
              filteredMenuCatalog.map((menu) => {
                const Icon = MENU_ICONS[menu.key] || BarChart2;
                const isSelected = selectedMenuKey === menu.key;
                const compiled = compiledByMenu[menu.key];
                const leadKpi = compiled?.kpis[0];
                return (
                  <div
                    key={menu.key}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedMenuKey(menu.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedMenuKey(menu.key);
                      }
                    }}
                    className={`w-full text-left p-4 transition-colors cursor-pointer flex items-start gap-3 ${
                      isSelected ? 'bg-[#FAFBFD]' : 'hover:bg-[#FAFBFD]/70'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected
                          ? 'bg-[#ee2e65] text-white'
                          : 'bg-[#F4F5F8] text-[#5A5D67]'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            className={`text-[13.5px] font-semibold truncate ${
                              isSelected ? 'text-[#ee2e65]' : 'text-[#1C1D21]'
                            }`}
                          >
                            {menu.label}
                          </span>
                          <InfoPopover
                            label={`Informasi ${menu.label}`}
                            content={menu.description}
                          />
                        </div>
                        {leadKpi && (
                          <span className="text-[12px] font-bold text-[#1C1D21] tabular-nums shrink-0">
                            {leadKpi.value}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8A8D98] mt-1 flex items-center gap-1.5 tabular-nums">
                        <span>{menu.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{compiled?.sections.length || 0} tabel data</span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-[13px] text-[#6E717A]">
                Tidak ada menu laporan yang cocok dengan pencarian.
              </div>
            )
          ) : filteredArchiveReports.length > 0 ? (
            filteredArchiveReports.map((rep) => {
              const menuMeta = getReportMenuMeta(resolveMenuKeyFromReportItem(rep));
              const Icon = MENU_ICONS[menuMeta.key] || FileText;
              const isSelected = selectedArchiveItem?.id === rep.id;
              return (
                <div
                  key={rep.id}
                  onClick={() => setSelectedArchiveId(rep.id)}
                  className={`p-4 cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected ? 'bg-[#FAFBFD]' : 'hover:bg-[#FAFBFD]/70'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? 'bg-[#ee2e65] text-white'
                        : 'bg-[#F4F5F8] text-[#5A5D67]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] text-[#6E717A]">
                      <span className="truncate">
                        {menuMeta.shortLabel} · {rep.classCode} · {rep.category}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(rep.id);
                        }}
                        title="Hapus laporan dari arsip"
                        className="text-[#8A8D98] hover:text-[#ee2e65] p-1 -m-1 rounded cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <h3
                      className={`text-[13.5px] font-semibold mt-1 truncate ${
                        isSelected ? 'text-[#ee2e65]' : 'text-[#1C1D21]'
                      }`}
                    >
                      {rep.title}
                    </h3>
                    <p className="text-[11.5px] text-[#6E717A] mt-0.5 line-clamp-2">
                      {rep.summary}
                    </p>
                    <div className="flex items-center justify-between text-[11px] text-[#8A8D98] mt-1.5 tabular-nums">
                      <span>{rep.generatedDate}</span>
                      <span>{rep.format}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center space-y-2">
              <p className="text-[13px] text-[#6E717A]">
                Belum ada dokumen laporan di arsip untuk filter ini.
              </p>
              <button
                type="button"
                onClick={() => setIsGenerateReportOpen(true)}
                className="text-[12.5px] font-semibold text-[#ee2e65] hover:underline cursor-pointer"
              >
                + Buat Laporan Pertama
              </button>
            </div>
          )}
        </div>

        {/* RIGHT 8 COLS: Live Report Preview & 4-Format Exporter */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-black/[0.07] overflow-hidden print-section">
          {/* Document Header */}
          <div className="p-5 sm:p-6 border-b border-black/[0.06] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-[#ee2e65]">
                  <span>{activeCompiledReport.menuLabel}</span>
                  <span aria-hidden="true" className="text-[#D4D6E0]">
                    ·
                  </span>
                  <span className="text-[#6E717A] font-medium tabular-nums">
                    {activeCompiledReport.batchName} ({activeCompiledReport.batchYear})
                  </span>
                </div>
                <h2 className="text-[19px] font-semibold text-[#1C1D21] leading-snug">
                  {activeCompiledReport.title}
                </h2>
                <div className="text-[12px] text-[#6E717A] flex flex-wrap items-center gap-2 tabular-nums">
                  <span>Cakupan: {activeCompiledReport.classCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>Diperbarui: {activeCompiledReport.generatedAt}</span>
                  <span aria-hidden="true">·</span>
                  <span>Oleh: {activeCompiledReport.preparedBy}</span>
                </div>
                {activeCompiledReport.notes && (
                  <p className="text-[12px] text-[#434652] pt-1">
                    Catatan: {activeCompiledReport.notes}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setActivePage(activeCompiledReport.targetPage)}
                className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1C1D21] hover:text-[#ee2e65] px-3 py-1.5 rounded-xl border border-black/[0.08] bg-[#FAFBFD] transition-colors whitespace-nowrap shrink-0 cursor-pointer self-start no-print"
              >
                <span>Buka Menu Terkait</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Export Formats Toolbar: Excel, JSON, CSV, PDF + Print */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-black/[0.05] no-print">
              <div className="flex items-center gap-2.5 w-full sm:w-auto">
                <span className="text-[11.5px] font-semibold text-[#6E717A] shrink-0 hidden sm:inline">
                  Export
                </span>
                <div className="grid grid-cols-4 sm:inline-flex items-center gap-1 p-1 rounded-xl bg-[#F4F5F8] border border-black/[0.05] w-full sm:w-auto shrink-0">
                  <button
                    type="button"
                    onClick={() => triggerExport('excel')}
                    title="Unduh format Excel (.xlsx)"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#E6F9F0] text-[#146C43] text-[12px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerExport('pdf')}
                    title="Unduh format PDF (.pdf)"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FEF1F5] text-[#9D113C] text-[12px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerExport('csv')}
                    title="Unduh format CSV (.csv)"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#F0EFFC] text-[#3F3B99] text-[12px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <FileDown className="w-3.5 h-3.5 shrink-0" />
                    <span>CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerExport('json')}
                    title="Unduh format JSON (.json)"
                    className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#FFF5E6] text-[#8C5811] text-[12px] font-semibold shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Braces className="w-3.5 h-3.5 shrink-0" />
                    <span>JSON</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto sm:ml-auto shrink-0">
                {activeCompiledReport.menuKey === 'all_menus' ? (
                  <div className="inline-flex items-center gap-2 text-[12px] text-[#434652] font-medium select-none">
                    <ToggleSwitch
                      size="sm"
                      color="primary"
                      checked={includeFullBundle}
                      onChange={setIncludeFullBundle}
                      ariaLabel="Sertakan detail 10 menu"
                    />
                    <span
                      onClick={() => setIncludeFullBundle(!includeFullBundle)}
                      className="whitespace-nowrap cursor-pointer"
                    >
                      Sertakan detail 10 menu
                    </span>
                  </div>
                ) : (
                  <span />
                )}
                <button
                  type="button"
                  onClick={() => window.print()}
                  title="Cetak tampilan halaman"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-black/[0.08] bg-white text-[12px] font-semibold text-[#434652] hover:text-[#1C1D21] hover:bg-[#FAFBFD] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4-Column KPI Strip inside Report Document */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] border-b border-black/[0.06]">
            {activeCompiledReport.kpis.map((kpi) => {
              const style = KPI_TONE_STYLES[kpi.tone] || KPI_TONE_STYLES.slate;
              return (
                <div key={kpi.label} className={`p-4 ${style.bg}`}>
                  <div className={`text-[11.5px] font-semibold ${style.label}`}>
                    {kpi.label}
                  </div>
                  <div className="text-[21px] font-bold text-[#1C1D21] mt-1 tabular-nums">
                    {kpi.value}
                  </div>
                  <div className={`text-[11px] mt-0.5 tabular-nums ${style.sub}`}>
                    {kpi.subtext}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Insights Summary */}
          {activeCompiledReport.insights.length > 0 && (
            <div className="p-5 sm:px-6 border-b border-black/[0.06] bg-[#FAFBFD]/60 space-y-2">
              <div className="text-[12.5px] font-semibold text-[#1C1D21]">
                Analisa &amp; Temuan Utama
              </div>
              <ul className="space-y-1.5 text-[12.5px] text-[#434652] leading-relaxed">
                {activeCompiledReport.insights.map((line, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#ee2e65] font-bold mt-0.5" aria-hidden="true">
                      •
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Structured Data Tables */}
          <div className="divide-y divide-black/[0.06]">
            {activeCompiledReport.sections.map((section) => (
              <div key={section.id} className="p-5 sm:p-6 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <h3 className="text-[14.5px] font-semibold text-[#1C1D21]">
                      {section.title}
                    </h3>
                    {section.subtitle && (
                      <InfoPopover
                        label={`Informasi ${section.title}`}
                        content={section.subtitle}
                      />
                    )}
                  </div>
                  <span className="text-[11.5px] text-[#8A8D98] tabular-nums shrink-0">
                    {section.rows.length} baris
                  </span>
                </div>

                {section.rows.length > 0 ? (
                  <>
                    {/* Mobile < 640px: Stacked Card Rows */}
                    <div className="sm:hidden border border-black/[0.12] rounded-xl divide-y divide-black/[0.08] bg-white overflow-hidden">
                      {section.rows.map((row, rIdx) => {
                        const firstCol = section.columns[0];
                        const restCols = section.columns.slice(1);
                        return (
                          <div key={rIdx} className="p-3.5 space-y-2">
                            {firstCol && (
                              <div className="text-[13px] font-semibold text-[#1C1D21]">
                                {row[firstCol.key] ?? '—'}
                              </div>
                            )}
                            {restCols.length > 0 && (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1.5 border-t border-black/[0.06] text-[12px]">
                                {restCols.map((col) => (
                                  <div key={col.key} className="min-w-0">
                                    <span className="text-[10.5px] text-[#646772] block truncate">
                                      {col.label}
                                    </span>
                                    <span className="font-medium text-[#1C1D21] tabular-nums block truncate">
                                      {row[col.key] ?? '—'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Tablet/Desktop >= 640px: Full Table */}
                    <div className="hidden sm:block overflow-x-auto border border-black/[0.10] rounded-xl">
                      <table className="w-full text-left border-collapse min-w-[520px]">
                        <thead>
                          <tr className="bg-[#FAFBFD] border-b border-black/[0.10] text-[11.5px] font-semibold text-[#5A5D67]">
                            {section.columns.map((col) => (
                              <th
                                key={col.key}
                                className={`py-2.5 px-3.5 whitespace-nowrap ${
                                  col.align === 'right' ? 'text-right' : 'text-left'
                                }`}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-black/[0.07] text-[12.5px] tabular-nums">
                          {section.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className="hover:bg-[#FAFBFD] transition-colors"
                            >
                              {section.columns.map((col, cIdx) => (
                                <td
                                  key={col.key}
                                  className={`py-2.5 px-3.5 ${
                                    col.align === 'right'
                                      ? 'text-right font-medium text-[#1C1D21]'
                                      : cIdx === 0
                                        ? 'font-semibold text-[#1C1D21]'
                                        : 'text-[#434652]'
                                  }`}
                                >
                                  {row[col.key] ?? '—'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="px-4 py-5 rounded-xl bg-[#FAFBFD] border border-black/[0.05] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[12.5px] text-[#6E717A]">
                    <span>
                      {section.emptyMessage || 'Belum ada data tersedia pada bagian ini.'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActivePage(activeCompiledReport.targetPage)}
                      className="text-[12px] font-semibold text-[#ee2e65] hover:underline whitespace-nowrap shrink-0 cursor-pointer text-left"
                    >
                      Kelola di halaman {activeCompiledReport.menuLabel} →
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
