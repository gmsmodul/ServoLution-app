import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  BarChart2,
  Bookmark,
  Braces,
  ChevronDown,
  Clock,
  Download,
  FileCheck,
  FileDown,
  FileSpreadsheet,
  FileText,
  Zap,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ReportExportFormat, ReportMenuKey } from '../../types';
import {
  getAvailableClassOptions,
  normalizeClassKey,
} from '../../utils/scheduleSubjects';
import {
  computeAssignmentAnalytics,
  computeAttendanceAnalytics,
  computeExamAssessmentAnalytics,
  computeLiveQuizAnalytics,
} from '../../utils/moduleAnalytics';
import { compileMenuReport } from '../../utils/reportBuilders';
import {
  AssignmentAnalyticsPanel,
  AttendanceAnalyticsPanel,
  ExamAssessmentAnalyticsPanel,
  LiveQuizAnalyticsPanel,
} from '../analytics/ModuleAnalyticsPanels';
import { CustomSelect } from '../ui/CustomSelect';
import { InfoPopover } from '../ui/InfoPopover';
import { ACTION_BTN_PRIMARY } from '../../constants/buttonStyles';

type AnalyticsModuleTab =
  | 'overview'
  | 'attendance'
  | 'exams'
  | 'assignments'
  | 'livequiz';

export const AnalyticsPage: React.FC = () => {
  const {
    schedules,
    attendanceByClass,
    qrCheckIns,
    studentsDirectory,
    graduationRule,
    exams,
    examAssessments,
    examGradingRule,
    assignments,
    lessonPlans,
    trainersDirectory,
    trainerFeedbackParameters,
    trainerFeedbacks,
    materialsList,
    liveQuizzes,
    liveQuizReports,
    activeBatch,
    setActivePage,
    handleExportCompiledReport,
  } = useApp();

  const [activeTab, setActiveTab] = useState<AnalyticsModuleTab>('overview');
  const [analyticsClass, setAnalyticsClass] = useState('All Classes');
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [exportMenuOpen]);

  const classOptions = useMemo(
    () =>
      getAvailableClassOptions(
        Object.keys(attendanceByClass),
        schedules.map((s) => s.classCode),
        assignments.map((a) => a.classCode)
      ),
    [attendanceByClass, schedules, assignments]
  );

  const attendanceStats = useMemo(
    () =>
      computeAttendanceAnalytics({
        attendanceByClass,
        qrCheckIns,
        schedules,
        studentsDirectory,
        graduationRule,
        classFilter: analyticsClass,
      }),
    [
      attendanceByClass,
      qrCheckIns,
      schedules,
      studentsDirectory,
      graduationRule,
      analyticsClass,
    ]
  );

  const examStats = useMemo(
    () =>
      computeExamAssessmentAnalytics({
        examAssessments,
        examGradingRule,
        studentsDirectory,
        schedules,
        classFilter: analyticsClass,
      }),
    [
      examAssessments,
      examGradingRule,
      studentsDirectory,
      schedules,
      analyticsClass,
    ]
  );

  const assignmentStats = useMemo(
    () =>
      computeAssignmentAnalytics({
        assignments,
        classFilter: analyticsClass,
      }),
    [assignments, analyticsClass]
  );

  const liveQuizStats = useMemo(
    () =>
      computeLiveQuizAnalytics({
        liveQuizReports,
        liveQuizzes,
        schedules,
        classFilter: analyticsClass,
      }),
    [liveQuizReports, liveQuizzes, schedules, analyticsClass]
  );

  const classComparisonRows = useMemo(() => {
    const keys =
      analyticsClass === 'All Classes'
        ? classOptions
        : [normalizeClassKey(analyticsClass)];

    return keys.map((classKey) => {
      const att = attendanceStats.byClass.find((c) => c.classKey === classKey);
      const asg = assignmentStats.byClass.find((c) => c.classKey === classKey);
      const lqSessions = liveQuizStats.sessions.filter(
        (s) => s.classCode === classKey
      );
      const lqAvgAcc =
        lqSessions.length > 0
          ? Math.round(
              (lqSessions.reduce((acc, s) => acc + s.avgAccuracyPct, 0) /
                lqSessions.length) *
                10
            ) / 10
          : null;

      return {
        classKey,
        attendanceRate: att?.attendanceRatePct ?? null,
        totalCrew: att?.totalCrew ?? 0,
        assignmentRate: asg?.submissionRatePct ?? null,
        assignmentScore: asg?.meanScore ?? null,
        liveQuizAcc: lqAvgAcc,
      };
    });
  }, [
    analyticsClass,
    classOptions,
    attendanceStats.byClass,
    assignmentStats.byClass,
    liveQuizStats.sessions,
  ]);

  const handleExportFormat = (format: ReportExportFormat) => {
    const tabToMenuMap: Record<AnalyticsModuleTab, ReportMenuKey> = {
      overview: 'all_menus',
      attendance: 'attendance',
      exams: 'exams',
      assignments: 'assignments',
      livequiz: 'livequiz',
    };
    const menuKey = tabToMenuMap[activeTab];
    const compiled = compileMenuReport({
      menuKey,
      classFilter: analyticsClass,
      data: {
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
      },
    });
    handleExportCompiledReport(compiled, format, menuKey === 'all_menus');
    setExportMenuOpen(false);
  };

  const tabs: { id: AnalyticsModuleTab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Semua Modul' },
    {
      id: 'attendance',
      label: 'Attendance Records',
      count: attendanceStats.totalUniqueCrew,
    },
    {
      id: 'exams',
      label: 'Penilaian Ujian',
      count: examStats.totalAssessments,
    },
    {
      id: 'assignments',
      label: 'Assignment',
      count: assignmentStats.totalAssignments,
    },
    {
      id: 'livequiz',
      label: 'LiveQuiz',
      count: liveQuizStats.totalSessions,
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 md:pb-6 border-b border-black/[0.05]">
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] font-semibold tracking-tight text-[#1C1D21]">
              Analytics &amp; Statistics
            </h1>
            <InfoPopover
              label="Informasi Analytics & Statistics"
              content="Analisa real-time lintas modul: Attendance Records, Penilaian Ujian, Assignment & LiveQuiz untuk batch aktif."
            />
          </div>
          <p className="text-[12.5px] text-[#6E717A] mt-0.5 tabular-nums">
            {activeBatch.batchName} · Tahun {activeBatch.year}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 w-full md:w-auto">
          <CustomSelect
            value={analyticsClass}
            onChange={setAnalyticsClass}
            pill
            ariaLabel="Filter kelas analitik"
            className="min-w-[176px]"
            triggerClassName="border-black/[0.08]"
            options={[
              { value: 'All Classes', label: 'All Classes' },
              ...classOptions.map((cls) => ({
                value: cls,
                label: cls,
              })),
            ]}
          />

          <div ref={exportMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setExportMenuOpen((prev) => !prev)}
              className={ACTION_BTN_PRIMARY}
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export</span>
              <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-80" />
            </button>

            {exportMenuOpen && (
              <div className="animate-ui-pop absolute right-0 mt-2 w-48 bg-white border border-black/[0.08] rounded-2xl shadow-xl p-1.5 z-30">
                <button
                  type="button"
                  onClick={() => handleExportFormat('excel')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-[#146C43] hover:bg-[#E6F9F0]/60 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4 shrink-0" />
                  <span>Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportFormat('pdf')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-[#9D113C] hover:bg-[#FEF1F5]/70 transition-colors cursor-pointer"
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  <span>PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportFormat('csv')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-[#3F3B99] hover:bg-[#F0EFFC]/70 transition-colors cursor-pointer"
                >
                  <FileDown className="w-4 h-4 shrink-0" />
                  <span>CSV (.csv)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleExportFormat('json')}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[12.5px] font-semibold text-[#8C5811] hover:bg-[#FFF5E6]/80 transition-colors cursor-pointer"
                >
                  <Braces className="w-4 h-4 shrink-0" />
                  <span>JSON (.json)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Module Segmented Tabs */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="inline-flex items-center gap-1 bg-[#F4F5F8] p-1 rounded-xl">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer tabular-nums ${
                  isActive
                    ? 'bg-white text-[#1C1D21] shadow-xs'
                    : 'text-[#6E717A] hover:text-[#1C1D21]'
                }`}
              >
                {tab.label}
                {typeof tab.count === 'number' ? ` (${tab.count})` : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB 1: UNIFIED OVERVIEW OF ALL 4 MODULES */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* 4-Column Live Cross-Module Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setActiveTab('attendance')}
              className="p-4 sm:p-5 bg-[#E6F9F0]/75 hover:bg-[#E6F9F0] text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#146C43]">
                <span>Kehadiran Efektif</span>
                <Clock className="w-3.5 h-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="kpi-value text-[26px] font-bold text-[#1C1D21] tabular-nums">
                  {attendanceStats.totalStatusEntries > 0
                    ? `${attendanceStats.effectiveAttendanceRatePct}%`
                    : '—'}
                </span>
                <span className="text-[11.5px] font-semibold text-[#146C43] tabular-nums">
                  {attendanceStats.totalUniqueCrew} crew
                </span>
              </div>
              <p className="text-[11.5px] text-[#35684E] mt-1 tabular-nums">
                {attendanceStats.totalStatusEntries === 0
                  ? 'Belum ada catatan absensi'
                  : `${attendanceStats.presentCount} hadir · ${attendanceStats.lateCount} terlambat · ${attendanceStats.absentCount} absen`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('exams')}
              className="p-4 sm:p-5 bg-[#FEF1F5]/75 hover:bg-[#FEF1F5] text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#9D113C]">
                <span>Riwayat Penilaian Ujian</span>
                <FileCheck className="w-3.5 h-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="kpi-value text-[26px] font-bold text-[#1C1D21] tabular-nums">
                  {examStats.totalAssessments > 0 ? examStats.meanScore : '—'}
                </span>
                <span className="text-[11.5px] font-semibold text-[#9D113C] tabular-nums">
                  {examStats.totalAssessments > 0
                    ? `Lulus ${examStats.passRatePct}%`
                    : 'Belum ada nilai'}
                </span>
              </div>
              <p className="text-[11.5px] text-[#7D3A51] mt-1 tabular-nums">
                {examStats.totalAssessments > 0
                  ? `${examStats.totalAssessments} penilaian · KKM ${examStats.passingScore}/${examStats.scaleMax}`
                  : `KKM aktif ${examStats.passingScore}/${examStats.scaleMax}`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assignments')}
              className="p-4 sm:p-5 bg-[#F0EFFC]/75 hover:bg-[#F0EFFC] text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#3F3B99]">
                <span>Pengumpulan Tugas</span>
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="kpi-value text-[26px] font-bold text-[#1C1D21] tabular-nums">
                  {assignmentStats.totalExpectedSubmissions > 0
                    ? `${assignmentStats.submissionRatePct}%`
                    : '—'}
                </span>
                <span className="text-[11.5px] font-semibold text-[#3F3B99] tabular-nums">
                  Rata-rata {assignmentStats.gradedCount > 0 ? assignmentStats.meanScore : '—'}
                </span>
              </div>
              <p className="text-[11.5px] text-[#5854A8] mt-1 tabular-nums">
                {assignmentStats.totalAssignments === 0
                  ? 'Belum ada tugas aktif'
                  : `${assignmentStats.totalSubmitted}/${assignmentStats.totalExpectedSubmissions} masuk · ${assignmentStats.needsReviewCount} perlu dinilai`}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('livequiz')}
              className="p-4 sm:p-5 bg-[#FFF5E6]/75 hover:bg-[#FFF5E6] text-left transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between gap-2 text-[12px] font-semibold text-[#8C5811]">
                <span>Akurasi LiveQuiz</span>
                <Zap className="w-3.5 h-3.5 shrink-0" />
              </div>
              <div className="flex items-baseline justify-between gap-2 mt-2">
                <span className="kpi-value text-[26px] font-bold text-[#1C1D21] tabular-nums">
                  {liveQuizStats.totalSessions > 0
                    ? `${liveQuizStats.overallAvgAccuracyPct}%`
                    : '—'}
                </span>
                <span className="text-[11.5px] font-semibold text-[#8C5811] tabular-nums">
                  {liveQuizStats.totalSessions} sesi
                </span>
              </div>
              <p className="text-[11.5px] text-[#8C5811] mt-1 tabular-nums">
                {liveQuizStats.totalSessions > 0
                  ? `${liveQuizStats.uniqueParticipants} peserta unik · ${liveQuizStats.totalQuizzesInLibrary} kuis`
                  : `${liveQuizStats.totalQuizzesInLibrary} kuis siap dijalankan`}
              </p>
            </button>
          </div>

          {/* Class Comparison Matrix + Module Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 7: Class Comparison Table */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.12] overflow-hidden self-start">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-[#ee2e65] shrink-0" />
                  <h2 className="text-[15.5px] font-semibold text-[#1C1D21]">
                    Matriks Statistik Lintas Modul per Kelas
                  </h2>
                  <InfoPopover
                    label="Informasi Matriks Statistik"
                    content="Perbandingan tingkat kehadiran, persentase pengumpulan & rata-rata nilai tugas, serta akurasi LiveQuiz di tiap kelas."
                  />
                </div>
                <span className="text-[12px] text-[#6E717A] tabular-nums shrink-0">
                  {classComparisonRows.length} Kelas
                </span>
              </div>

              {/* Mobile Card Stack (< 640px) */}
              <div className="sm:hidden divide-y divide-black/[0.07]">
                {classComparisonRows.map((row) => (
                  <div key={row.classKey} className="p-4 space-y-2.5 tabular-nums">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-[#1C1D21]">
                        {row.classKey}
                      </span>
                      <span className="text-[12px] text-[#6E717A]">
                        {row.totalCrew} crew
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[12px]">
                      <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.08] px-3 py-2">
                        <div className="text-[11px] text-[#6E717A]">Kehadiran</div>
                        <div className="font-bold text-[#146C43]">
                          {row.attendanceRate !== null ? `${row.attendanceRate}%` : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.08] px-3 py-2">
                        <div className="text-[11px] text-[#6E717A]">Submit Tugas</div>
                        <div className="font-bold text-[#3F3B99]">
                          {row.assignmentRate !== null ? `${row.assignmentRate}%` : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.08] px-3 py-2">
                        <div className="text-[11px] text-[#6E717A]">Rata-rata Tugas</div>
                        <div className="font-bold text-[#1C1D21]">
                          {row.assignmentScore !== null ? row.assignmentScore : '—'}
                        </div>
                      </div>
                      <div className="rounded-xl bg-[#FAFBFD] border border-black/[0.08] px-3 py-2">
                        <div className="text-[11px] text-[#6E717A]">Akurasi LiveQuiz</div>
                        <div className="font-bold text-[#8C5811]">
                          {row.liveQuizAcc !== null ? `${row.liveQuizAcc}%` : '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[540px]">
                  <thead>
                    <tr className="bg-[#FAFBFD] border-b border-black/[0.08] text-[11.5px] font-medium text-[#6E717A]">
                      <th className="py-3 px-4">Kelas</th>
                      <th className="py-3 px-4 text-right">Crew</th>
                      <th className="py-3 px-4 text-right">Kehadiran</th>
                      <th className="py-3 px-4 text-right">Pengumpulan Tugas</th>
                      <th className="py-3 px-4 text-right">Rata-rata Tugas</th>
                      <th className="py-3 px-4 text-right">Akurasi LiveQuiz</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/[0.06] text-[13px] tabular-nums">
                    {classComparisonRows.map((row) => (
                      <tr
                        key={row.classKey}
                        className="hover:bg-[#FAFBFD] transition-colors"
                      >
                        <td className="py-3 px-4 font-semibold text-[#1C1D21]">
                          {row.classKey}
                        </td>
                        <td className="py-3 px-4 text-right text-[#6E717A]">
                          {row.totalCrew}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#146C43]">
                          {row.attendanceRate !== null
                            ? `${row.attendanceRate}%`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-[#3F3B99]">
                          {row.assignmentRate !== null
                            ? `${row.assignmentRate}%`
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#1C1D21]">
                          {row.assignmentScore !== null
                            ? row.assignmentScore
                            : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-[#8C5811]">
                          {row.liveQuizAcc !== null
                            ? `${row.liveQuizAcc}%`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 5: Ringkasan Analisa Eksekutif 4 Modul */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-black/[0.12] overflow-hidden self-start">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center gap-2">
                <h2 className="text-[15.5px] font-semibold text-[#1C1D21]">
                  Sorotan Analisa per Sumber Data
                </h2>
                <InfoPopover
                  label="Informasi Sorotan Analisa"
                  content="Klik Detail Analisa untuk melihat statistik lengkap modul, atau klik Buka untuk menuju halaman sumber."
                />
              </div>
              <div className="divide-y divide-black/[0.07]">
                {[
                  {
                    tab: 'attendance' as const,
                    sourcePage: 'attendance' as const,
                    title: 'All Attendance Records',
                    summary: attendanceStats.insights[0],
                  },
                  {
                    tab: 'exams' as const,
                    sourcePage: 'exams' as const,
                    title: 'Riwayat Penilaian Ujian',
                    summary: examStats.insights[0],
                  },
                  {
                    tab: 'assignments' as const,
                    sourcePage: 'assignments' as const,
                    title: 'Laporan Keseluruhan Assignment',
                    summary: assignmentStats.insights[0],
                  },
                  {
                    tab: 'livequiz' as const,
                    sourcePage: 'livequiz' as const,
                    title: 'Laporan Keseluruhan LiveQuiz',
                    summary: liveQuizStats.insights[0],
                  },
                ].map((block) => (
                  <div key={block.tab} className="p-4 sm:px-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-[#1C1D21]">
                        {block.title}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveTab(block.tab)}
                          className="text-[12px] font-semibold text-[#ee2e65] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Detail Analisa
                        </button>
                        <span className="text-[#D4D6E0]">·</span>
                        <button
                          type="button"
                          onClick={() => setActivePage(block.sourcePage)}
                          className="inline-flex items-center gap-0.5 text-[12px] font-medium text-[#6E717A] hover:text-[#1C1D21] whitespace-nowrap cursor-pointer"
                        >
                          <span>Buka</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[12px] text-[#5A5D67] leading-relaxed">
                      {block.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ALL ATTENDANCE RECORDS */}
      {activeTab === 'attendance' && (
        <AttendanceAnalyticsPanel data={attendanceStats} />
      )}

      {/* TAB 3: RIWAYAT PENILAIAN UJIAN */}
      {activeTab === 'exams' && (
        <ExamAssessmentAnalyticsPanel data={examStats} />
      )}

      {/* TAB 4: LAPORAN KESELURUHAN ASSIGNMENT */}
      {activeTab === 'assignments' && (
        <AssignmentAnalyticsPanel data={assignmentStats} />
      )}

      {/* TAB 5: LAPORAN KESELURUHAN LIVEQUIZ */}
      {activeTab === 'livequiz' && (
        <LiveQuizAnalyticsPanel data={liveQuizStats} />
      )}
    </div>
  );
};
