import {
  Assignment,
  AttendanceGraduationRule,
  BatchRecord,
  ClassAttendanceData,
  ClassMaterial,
  Exam,
  ExamAssessmentRecord,
  ExamGradingRule,
  LessonPlan,
  LiveQuiz,
  LiveQuizSessionReport,
  PageId,
  PastelThemeKey,
  QrAttendanceCheckInRecord,
  ReportExportFormat,
  ReportItem,
  ReportMenuKey,
  ScheduleItem,
  StudentDirectoryItem,
  TrainerDirectoryItem,
  TrainerFeedbackParameter,
  TrainerFeedbackRecord,
} from '../types';
import {
  computeAssignmentAnalytics,
  computeAttendanceAnalytics,
  computeExamAssessmentAnalytics,
  computeLiveQuizAnalytics,
} from './moduleAnalytics';
import { getMaterialCrewSummary } from './materialCrewProgress';
import { evaluateStudentBatchEligibility } from '../data/batchDefaults';
import { normalizeClassKey } from './scheduleSubjects';

export type ReportTone = 'periwinkle' | 'mint' | 'coral' | 'peach' | 'slate';

export interface CompiledReportKpi {
  label: string;
  value: string;
  subtext: string;
  tone: ReportTone;
}

export interface CompiledReportColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
}

export interface CompiledReportSection {
  id: string;
  title: string;
  subtitle?: string;
  columns: CompiledReportColumn[];
  rows: Array<Record<string, string | number>>;
  emptyMessage?: string;
}

export interface CompiledMenuReport {
  id: string;
  menuKey: ReportMenuKey;
  menuLabel: string;
  category: ReportItem['category'];
  targetPage: PageId;
  title: string;
  classCode: string;
  batchName: string;
  batchYear: number;
  gmsAsal?: string;
  programEvent?: string;
  generatedAt: string;
  preparedBy: string;
  notes?: string;
  kpis: CompiledReportKpi[];
  insights: string[];
  sections: CompiledReportSection[];
  legacyMetrics: {
    avgScore: string;
    attendance: string;
    passRate: string;
  };
  summary: string;
}

export interface ReportMenuMeta {
  key: ReportMenuKey;
  label: string;
  shortLabel: string;
  category: ReportItem['category'];
  theme: PastelThemeKey;
  targetPage: PageId;
  description: string;
}

export const REPORT_MENU_CATALOG: ReportMenuMeta[] = [
  {
    key: 'all_menus',
    label: 'Semua Menu (Terpadu)',
    shortLabel: 'Terpadu',
    category: 'Academic',
    theme: 'periwinkle',
    targetPage: 'overview',
    description: 'Rekap eksekutif lintas seluruh menu aktif dalam satu laporan batch.',
  },
  {
    key: 'overview',
    label: 'Overview & Profil Batch',
    shortLabel: 'Overview',
    category: 'Academic',
    theme: 'periwinkle',
    targetPage: 'overview',
    description: 'Ringkasan kesehatan batch, aturan kelulusan, KKM, dan kesiapan operasional.',
  },
  {
    key: 'materials',
    label: 'Materials & Progres Crew',
    shortLabel: 'Materials',
    category: 'Academic',
    theme: 'periwinkle',
    targetPage: 'materials',
    description: 'Katalog materi pembelajaran, unduhan, dan tingkat penyelesaian crew.',
  },
  {
    key: 'prep',
    label: 'Class Preparation (RPP)',
    shortLabel: 'Class Prep',
    category: 'Academic',
    theme: 'mint',
    targetPage: 'prep',
    description: 'Kesiapan lesson plan, progres checklist pengajar, dan kelengkapan materi.',
  },
  {
    key: 'attendance',
    label: 'Attendance & QR Check-In',
    shortLabel: 'Attendance',
    category: 'Attendance',
    theme: 'mint',
    targetPage: 'attendance',
    description: 'Kehadiran efektif, On Time/Late/Absent/Excuse, check-in QR, dan crew berisiko.',
  },
  {
    key: 'exams',
    label: 'Exams & Penilaian Ujian',
    shortLabel: 'Exams',
    category: 'Assessments',
    theme: 'coral',
    targetPage: 'exams',
    description: 'Jadwal ujian, statistik penilaian, distribusi grade, posisi, dan remedial KKM.',
  },
  {
    key: 'assignments',
    label: 'Assignment (Keseluruhan)',
    shortLabel: 'Assignment',
    category: 'Assessments',
    theme: 'periwinkle',
    targetPage: 'assignments',
    description: 'Tingkat pengumpulan tugas, antrean review, sebaran nilai, dan siswa pending.',
  },
  {
    key: 'livequiz',
    label: 'LiveQuiz (Keseluruhan)',
    shortLabel: 'LiveQuiz',
    category: 'Assessments',
    theme: 'peach',
    targetPage: 'livequiz',
    description: 'Rekap sesi Classic & Test Mode, akurasi soal tersulit, leaderboard, tab switch.',
  },
  {
    key: 'schedule',
    label: 'Schedule (Jadwal Kelas)',
    shortLabel: 'Schedule',
    category: 'Attendance',
    theme: 'peach',
    targetPage: 'schedule',
    description: 'Jadwal mingguan per kelas, ruangan, toleransi terlambat, dan cakupan absensi.',
  },
  {
    key: 'students',
    label: 'Students & Kelulusan',
    shortLabel: 'Students',
    category: 'Advisory',
    theme: 'coral',
    targetPage: 'students',
    description: 'Direktori siswa/crew serta evaluasi kelayakan kelulusan batch terhadap aturan.',
  },
  {
    key: 'trainers',
    label: 'Trainer & Feedback Crew',
    shortLabel: 'Trainer',
    category: 'Advisory',
    theme: 'mint',
    targetPage: 'trainers',
    description: 'Kinerja pengajar, total sesi, skor per parameter feedback, dan ulasan crew.',
  },
];

export interface ReportDatasetInput {
  activeBatch: BatchRecord;
  graduationRule: AttendanceGraduationRule;
  examGradingRule: ExamGradingRule;
  exams: Exam[];
  examAssessments: ExamAssessmentRecord[];
  assignments: Assignment[];
  lessonPlans: LessonPlan[];
  schedules: ScheduleItem[];
  studentsDirectory: StudentDirectoryItem[];
  trainersDirectory: TrainerDirectoryItem[];
  trainerFeedbackParameters: TrainerFeedbackParameter[];
  trainerFeedbacks: TrainerFeedbackRecord[];
  materialsList: ClassMaterial[];
  liveQuizzes: LiveQuiz[];
  liveQuizReports: LiveQuizSessionReport[];
  attendanceByClass: Record<string, ClassAttendanceData>;
  qrCheckIns: QrAttendanceCheckInRecord[];
}

export function getReportMenuMeta(key: ReportMenuKey): ReportMenuMeta {
  return REPORT_MENU_CATALOG.find((m) => m.key === key) || REPORT_MENU_CATALOG[0];
}

export function resolveMenuKeyFromReportItem(item: ReportItem): ReportMenuKey {
  if (item.menuKey && REPORT_MENU_CATALOG.some((m) => m.key === item.menuKey)) {
    return item.menuKey;
  }
  const lowerTitle = item.title.toLowerCase();
  if (lowerTitle.includes('livequiz') || lowerTitle.includes('quiz')) return 'livequiz';
  if (lowerTitle.includes('material') || lowerTitle.includes('materi')) return 'materials';
  if (lowerTitle.includes('prep') || lowerTitle.includes('rpp') || lowerTitle.includes('lesson')) return 'prep';
  if (lowerTitle.includes('schedule') || lowerTitle.includes('jadwal')) return 'schedule';
  if (lowerTitle.includes('trainer') || lowerTitle.includes('pengajar')) return 'trainers';
  if (lowerTitle.includes('exam') || lowerTitle.includes('ujian')) return 'exams';
  if (lowerTitle.includes('assignment') || lowerTitle.includes('tugas')) return 'assignments';
  if (lowerTitle.includes('student') || lowerTitle.includes('kelulusan') || lowerTitle.includes('at-risk')) {
    return 'students';
  }
  if (item.category === 'Attendance') return 'attendance';
  if (item.category === 'Assessments') return 'assignments';
  if (item.category === 'Advisory') return 'students';
  return 'all_menus';
}

export function suggestReportTitle(menuKey: ReportMenuKey, classCode: string): string {
  const meta = getReportMenuMeta(menuKey);
  const scope = classCode === 'All Classes' ? 'Semua Kelas' : classCode;
  return `Laporan ${meta.label} · ${scope}`;
}

export function formatExportFormatLabel(format: ReportExportFormat): string {
  switch (format) {
    case 'excel':
      return 'Excel (.xlsx)';
    case 'json':
      return 'JSON (.json)';
    case 'csv':
      return 'CSV (.csv)';
    case 'pdf':
      return 'PDF (.pdf)';
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function formatNowLabel(): string {
  return new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function matchesClassFilter(itemClass: string | undefined, filterClass: string): boolean {
  const normFilter = normalizeClassKey(filterClass);
  if (normFilter === 'All Classes') return true;
  const normItem = normalizeClassKey(itemClass || 'All Classes');
  return normItem === normFilter || normItem === 'All Classes';
}

export function compileMenuReport(params: {
  menuKey: ReportMenuKey;
  classFilter?: string;
  title?: string;
  notes?: string;
  id?: string;
  generatedAt?: string;
  data: ReportDatasetInput;
}): CompiledMenuReport {
  const {
    menuKey,
    classFilter = 'All Classes',
    title,
    notes,
    id,
    generatedAt = formatNowLabel(),
    data,
  } = params;

  const normalizedFilter = normalizeClassKey(classFilter);
  const filterActive = normalizedFilter !== 'All Classes';
  const meta = getReportMenuMeta(menuKey);
  const resolvedTitle = title?.trim() || suggestReportTitle(menuKey, normalizedFilter);

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
  } = data;

  // Shared live analytics across key modules
  const attendanceStats = computeAttendanceAnalytics({
    attendanceByClass,
    qrCheckIns,
    schedules,
    studentsDirectory,
    graduationRule,
    classFilter: normalizedFilter,
  });

  const examStats = computeExamAssessmentAnalytics({
    examAssessments,
    examGradingRule,
    studentsDirectory,
    schedules,
    classFilter: normalizedFilter,
  });

  const assignmentStats = computeAssignmentAnalytics({
    assignments,
    classFilter: normalizedFilter,
  });

  const liveQuizStats = computeLiveQuizAnalytics({
    liveQuizReports,
    liveQuizzes,
    schedules,
    classFilter: normalizedFilter,
  });

  // Filtered per-menu slices
  const filteredMaterials = materialsList.filter((m) =>
    matchesClassFilter(m.classCode, normalizedFilter)
  );
  const filteredPlans = lessonPlans.filter((p) =>
    matchesClassFilter(p.classCode, normalizedFilter)
  );
  const filteredSchedules = schedules.filter((s) =>
    matchesClassFilter(s.classCode, normalizedFilter)
  );
  const filteredExams = exams.filter((ex) =>
    filterActive ? normalizeClassKey(ex.classCode) === normalizedFilter : true
  );
  const filteredStudents = studentsDirectory.filter((st) =>
    filterActive ? normalizeClassKey(st.classCode) === normalizedFilter : true
  );
  const filteredTrainers = trainersDirectory.filter((tr) =>
    filterActive ? matchesClassFilter(tr.assignedClass, normalizedFilter) : true
  );
  const filteredFeedbacks = trainerFeedbacks.filter((fb) =>
    filterActive ? matchesClassFilter(fb.classCode, normalizedFilter) : true
  );

  // Student eligibility evaluations (used in Overview, Students, and All Menus)
  const studentEvaluations = filteredStudents.map((student) => ({
    student,
    eval: evaluateStudentBatchEligibility(
      student,
      attendanceByClass,
      graduationRule,
      examGradingRule
    ),
  }));
  const eligibleStudentsCount = studentEvaluations.filter((x) => x.eval.overallPassed).length;
  const studentPassRatePct =
    filteredStudents.length > 0
      ? round1((eligibleStudentsCount / filteredStudents.length) * 100)
      : 0;

  // Legacy 3-metric strip defaults derived dynamically
  const avgStudentScore =
    filteredStudents.length > 0
      ? round1(filteredStudents.reduce((s, st) => s + st.score, 0) / filteredStudents.length)
      : examStats.totalAssessments > 0
        ? examStats.meanScore
        : assignmentStats.meanScore;

  const baseMeta = {
    id: id || `LIVE-${menuKey.toUpperCase()}`,
    menuKey,
    menuLabel: meta.label,
    category: meta.category,
    targetPage: meta.targetPage,
    title: resolvedTitle,
    classCode: normalizedFilter,
    batchName: activeBatch.batchName,
    batchYear: activeBatch.year,
    gmsAsal: activeBatch.gmsAsal,
    programEvent: activeBatch.programEvent,
    generatedAt,
    preparedBy: 'Rasengan · Servolution Faculty',
    notes,
  };

  // ============================================================================
  // BUILD PER-MENU CONTENT
  // ============================================================================

  if (menuKey === 'materials') {
    const matSummaries = filteredMaterials.map((mat) => ({
      mat,
      summary: getMaterialCrewSummary(mat, studentsDirectory),
    }));
    const totalDownloads = filteredMaterials.reduce((s, m) => s + (m.downloadCount || 0), 0);
    const avgCompletionPct =
      matSummaries.length > 0
        ? round1(
            matSummaries.reduce((s, item) => s + item.summary.avgProgress, 0) /
              matSummaries.length
          )
        : 0;
    const fullyCompletedMaterials = matSummaries.filter(
      (x) => x.summary.totalCrew > 0 && x.summary.completedCount === x.summary.totalCrew
    ).length;

    const insights: string[] = [];
    if (filteredMaterials.length === 0) {
      insights.push('Belum ada materi tercatat pada filter kelas ini. Unggah materi di halaman Materials.');
    } else {
      insights.push(
        `Tersedia ${filteredMaterials.length} materi ajar dengan rata-rata penyelesaian crew ${avgCompletionPct}% dan total ${totalDownloads} kali unduhan.`
      );
      const lowest = [...matSummaries].sort((a, b) => a.summary.avgProgress - b.summary.avgProgress)[0];
      if (lowest) {
        insights.push(
          `Materi dengan progres terendah saat ini adalah "${lowest.mat.title}" (${lowest.summary.avgProgress}% rata-rata penyelesaian crew).`
        );
      }
      const videoCount = filteredMaterials.filter((m) => m.type === 'video').length;
      if (videoCount > 0) {
        insights.push(
          `Terdapat ${videoCount} materi video dan ${filteredMaterials.length - videoCount} dokumen/slide/lab yang aktif dipantau.`
        );
      }
    }

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Materi',
          value: String(filteredMaterials.length),
          subtext:
            filteredMaterials.length > 0
              ? `${fullyCompletedMaterials} tuntas seluruh crew`
              : 'Belum ada materi tercatat',
          tone: 'periwinkle',
        },
        {
          label: 'Rata-rata Progres Crew',
          value: filteredMaterials.length > 0 ? `${avgCompletionPct}%` : '—',
          subtext:
            filteredMaterials.length > 0
              ? `${filteredMaterials.filter((m) => m.type === 'video').length} video · ${
                  filteredMaterials.filter((m) => m.type !== 'video').length
                } dokumen/slide`
              : 'Menunggu materi aktif',
          tone: 'mint',
        },
        {
          label: 'Total Unduhan',
          value: String(totalDownloads),
          subtext:
            filteredMaterials.length > 0
              ? `Rata-rata ${round1(totalDownloads / filteredMaterials.length)} unduhan/materi`
              : 'Belum ada unduhan',
          tone: 'peach',
        },
        {
          label: 'Crew Tuntas 100%',
          value: `${matSummaries.reduce((s, x) => s + x.summary.completedCount, 0)}`,
          subtext: `Dari ${matSummaries.reduce((s, x) => s + x.summary.totalCrew, 0)} entri target`,
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'materials-catalog',
          title: 'Daftar Materi & Progres Penyelesaian Crew',
          subtitle: 'Menampilkan tipe, format, unduhan, dan ketercapaian crew per materi',
          columns: [
            { key: 'title', label: 'Judul Materi' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'subject', label: 'Mapel' },
            { key: 'format', label: 'Format' },
            { key: 'downloads', label: 'Unduhan', align: 'right' },
            { key: 'completedCrew', label: 'Crew Selesai', align: 'right' },
            { key: 'avgProgress', label: 'Rata-rata Progres', align: 'right' },
          ],
          rows: matSummaries.map(({ mat, summary }) => ({
            title: mat.title,
            classCode: normalizeClassKey(mat.classCode),
            subject: mat.subject,
            format: `${mat.type.toUpperCase()} (${mat.fileFormat})`,
            downloads: mat.downloadCount,
            completedCrew: `${summary.completedCount}/${summary.totalCrew}`,
            avgProgress: `${summary.avgProgress}%`,
          })),
          emptyMessage: 'Belum ada materi pada filter kelas yang dipilih.',
        },
      ],
      legacyMetrics: {
        avgScore: `${avgCompletionPct}%`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${filteredMaterials.length > 0 ? Math.round((fullyCompletedMaterials / filteredMaterials.length) * 100) : 0}%`,
      },
      summary: insights[0],
    };
  }

  if (menuKey === 'prep') {
    const readyCount = filteredPlans.filter((p) => p.status === 'Ready').length;
    const inProgressCount = filteredPlans.filter((p) => p.status === 'In Progress').length;
    const draftCount = filteredPlans.filter((p) => p.status === 'Draft').length;
    const totalTasks = filteredPlans.reduce((s, p) => s + p.checklist.length, 0);
    const doneTasks = filteredPlans.reduce(
      (s, p) => s + p.checklist.filter((c) => c.done).length,
      0
    );
    const avgProgress =
      filteredPlans.length > 0
        ? round1(filteredPlans.reduce((s, p) => s + p.progress, 0) / filteredPlans.length)
        : 0;

    const insights: string[] = [];
    if (filteredPlans.length === 0) {
      insights.push('Belum ada RPP / Lesson Plan tersimpan untuk filter ini.');
    } else {
      insights.push(
        `Dari ${filteredPlans.length} rencana pembelajaran, ${readyCount} berstatus Ready, ${inProgressCount} In Progress, dan ${draftCount} Draft.`
      );
      insights.push(
        `${doneTasks} dari ${totalTasks} item checklist persiapan mengajar telah selesai (${avgProgress}% rata-rata kesiapan).`
      );
    }

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Rencana Kelas',
          value: String(filteredPlans.length),
          subtext:
            filteredPlans.length > 0
              ? `${readyCount} siap mengajar`
              : 'Belum ada rencana kelas',
          tone: 'periwinkle',
        },
        {
          label: 'Rata-rata Kesiapan',
          value: filteredPlans.length > 0 ? `${avgProgress}%` : '—',
          subtext: `${doneTasks}/${totalTasks} poin checklist tuntas`,
          tone: 'mint',
        },
        {
          label: 'Perlu Penyelesaian',
          value: String(inProgressCount + draftCount),
          subtext: `${inProgressCount} dikerjakan · ${draftCount} draf`,
          tone: 'peach',
        },
        {
          label: 'Lampiran Bahan Ajar',
          value: String(filteredPlans.reduce((s, p) => s + p.materials.length, 0)),
          subtext:
            filteredPlans.length > 0
              ? `Tersebar di ${filteredPlans.filter((p) => p.materials.length > 0).length}/${filteredPlans.length} modul`
              : 'Belum ada lampiran',
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'prep-plans',
          title: 'Daftar Rencana Pembelajaran (Lesson Plans)',
          columns: [
            { key: 'topic', label: 'Topik Pembelajaran' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'subject', label: 'Mapel' },
            { key: 'date', label: 'Tanggal' },
            { key: 'status', label: 'Status' },
            { key: 'checklist', label: 'Checklist', align: 'right' },
            { key: 'progress', label: 'Progres', align: 'right' },
          ],
          rows: filteredPlans.map((p) => {
            const done = p.checklist.filter((c) => c.done).length;
            return {
              topic: p.topic,
              classCode: normalizeClassKey(p.classCode),
              subject: p.subject,
              date: p.date,
              status: p.status,
              checklist: `${done}/${p.checklist.length}`,
              progress: `${p.progress}%`,
            };
          }),
          emptyMessage: 'Belum ada lesson plan untuk kelas ini.',
        },
      ],
      legacyMetrics: {
        avgScore: `${avgProgress}%`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${filteredPlans.length > 0 ? round1((readyCount / filteredPlans.length) * 100) : 0}%`,
      },
      summary: insights[0],
    };
  }

  if (menuKey === 'attendance') {
    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Kehadiran Efektif',
          value:
            attendanceStats.totalStatusEntries > 0
              ? `${attendanceStats.effectiveAttendanceRatePct}%`
              : '—',
          subtext: `Target kelulusan ≥ ${attendanceStats.targetThresholdPct}%`,
          tone: 'mint',
        },
        {
          label: 'Status Hadir',
          value: String(attendanceStats.presentCount),
          subtext: `${attendanceStats.onTimeCount} tepat waktu · ${attendanceStats.lateCount} terlambat`,
          tone: 'periwinkle',
        },
        {
          label: 'QR vs Daftar Hadir',
          value: `${attendanceStats.qrCheckInCount} / ${attendanceStats.rosterCheckInCount}`,
          subtext: `${attendanceStats.qrCheckInCount} scan QR · ${attendanceStats.rosterCheckInCount} input manual`,
          tone: 'peach',
        },
        {
          label: 'Absen / Berisiko',
          value: `${attendanceStats.absentCount} / ${attendanceStats.atRiskCrewCount}`,
          subtext: `${attendanceStats.excuseCount} izin · ${attendanceStats.atRiskCrewCount} perlu tindak lanjut`,
          tone: 'coral',
        },
      ],
      insights: attendanceStats.insights,
      sections: [
        {
          id: 'att-by-class',
          title: 'Rekap Kehadiran per Kelas',
          columns: [
            { key: 'classKey', label: 'Kelas' },
            { key: 'totalCrew', label: 'Total Entri', align: 'right' },
            { key: 'onTimeCount', label: 'On Time', align: 'right' },
            { key: 'lateCount', label: 'Late', align: 'right' },
            { key: 'excuseCount', label: 'Excuse', align: 'right' },
            { key: 'absentCount', label: 'Absent', align: 'right' },
            { key: 'qrCount', label: 'QR', align: 'right' },
            { key: 'rate', label: 'Efektif (%)', align: 'right' },
            { key: 'threshold', label: 'Status Batas' },
          ],
          rows: attendanceStats.byClass.map((c) => ({
            classKey: c.classKey,
            totalCrew: c.totalCrew,
            onTimeCount: c.onTimeCount,
            lateCount: c.lateCount,
            excuseCount: c.excuseCount,
            absentCount: c.absentCount,
            qrCount: c.qrCount,
            rate: `${c.attendanceRatePct}%`,
            threshold: c.meetsThreshold ? 'Memenuhi Target' : 'Di Bawah Target',
          })),
        },
        {
          id: 'att-at-risk',
          title: 'Daftar Crew / Siswa Perlu Tindak Lanjut',
          columns: [
            { key: 'name', label: 'Nama Peserta' },
            { key: 'classKey', label: 'Kelas' },
            { key: 'status', label: 'Status Terakhir' },
            { key: 'rate', label: 'Rate (%)', align: 'right' },
            { key: 'reason', label: 'Alasan Evaluasi' },
          ],
          rows: attendanceStats.atRiskCrew.map((item) => ({
            name: item.name,
            classKey: item.classKey,
            status: item.status,
            rate: `${item.rate}%`,
            reason: item.reason,
          })),
          emptyMessage: 'Semua peserta berada di atas ambang minimal kehadiran batch.',
        },
        {
          id: 'att-schedules',
          title: 'Cakupan Absensi per Jadwal Sesi',
          columns: [
            { key: 'day', label: 'Hari' },
            { key: 'timeRange', label: 'Jam' },
            { key: 'classKey', label: 'Kelas' },
            { key: 'subject', label: 'Mata Pelajaran' },
            { key: 'attendedCount', label: 'Hadir', align: 'right' },
            { key: 'expectedCount', label: 'Target', align: 'right' },
            { key: 'attendancePct', label: 'Cakupan', align: 'right' },
          ],
          rows: attendanceStats.missedSchedules.map((s) => ({
            day: s.day,
            timeRange: s.timeRange,
            classKey: s.classKey,
            subject: s.subject,
            attendedCount: s.attendedCount,
            expectedCount: s.expectedCount,
            attendancePct: `${s.attendancePct}%`,
          })),
        },
      ],
      legacyMetrics: {
        avgScore: `${attendanceStats.onTimeRateAmongPresentPct}%`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${attendanceStats.totalUniqueCrew > 0 ? round1((attendanceStats.eligibleCrewCount / attendanceStats.totalUniqueCrew) * 100) : 0}%`,
      },
      summary: attendanceStats.insights[0],
    };
  }

  if (menuKey === 'exams') {
    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Penilaian Ujian',
          value: String(examStats.totalAssessments),
          subtext: `${examStats.uniqueExaminees} peserta dinilai · ${filteredExams.length} jadwal ujian`,
          tone: 'periwinkle',
        },
        {
          label: 'Rata-rata / Median',
          value: examStats.totalAssessments > 0 ? `${examStats.meanScore}` : '—',
          subtext:
            examStats.totalAssessments > 0
              ? `Median ${examStats.medianScore} · StdDev ${examStats.stdDev}`
              : `Skala maks ${examStats.scaleMax}`,
          tone: 'mint',
        },
        {
          label: 'Tingkat Kelulusan KKM',
          value: examStats.totalAssessments > 0 ? `${examStats.passRatePct}%` : '—',
          subtext: `KKM ≥ ${examStats.passingScore} (${examStats.passCount} lulus · ${examStats.failCount} remedial)`,
          tone: 'peach',
        },
        {
          label: 'Rentang Nilai',
          value:
            examStats.totalAssessments > 0
              ? `${examStats.lowestScore} – ${examStats.highestScore}`
              : '—',
          subtext:
            examStats.totalAssessments > 0
              ? `Selisih ${round1(examStats.highestScore - examStats.lowestScore)} poin · ${examStats.byPosition.length} posisi`
              : 'Belum ada riwayat nilai ujian',
          tone: 'coral',
        },
      ],
      insights: examStats.insights,
      sections: [
        {
          id: 'exam-positions',
          title: 'Statistik Penilaian per Posisi / Bidang',
          columns: [
            { key: 'positionName', label: 'Posisi Ujian' },
            { key: 'count', label: 'Penilaian', align: 'right' },
            { key: 'meanScore', label: 'Rata-rata', align: 'right' },
            { key: 'passRatePct', label: 'Kelulusan', align: 'right' },
            { key: 'lowestScore', label: 'Min', align: 'right' },
            { key: 'highestScore', label: 'Max', align: 'right' },
          ],
          rows: examStats.byPosition.map((p) => ({
            positionName: p.positionName,
            count: p.count,
            meanScore: p.meanScore,
            passRatePct: `${p.passRatePct}%`,
            lowestScore: p.lowestScore,
            highestScore: p.highestScore,
          })),
          emptyMessage: 'Belum ada riwayat penilaian ujian. Catat penilaian melalui halaman Exams.',
        },
        {
          id: 'exam-parameters',
          title: 'Rata-rata Skor per Parameter Kompetensi',
          columns: [
            { key: 'label', label: 'Parameter Penilaian' },
            { key: 'segmentName', label: 'Segmen' },
            { key: 'occurrences', label: 'Jumlah Uji', align: 'right' },
            { key: 'meanScore', label: 'Rata-rata', align: 'right' },
            { key: 'belowKkmCount', label: 'Di Bawah KKM', align: 'right' },
          ],
          rows: examStats.parameterStats.map((pm) => ({
            label: pm.label,
            segmentName: pm.segmentName || 'Umum',
            occurrences: pm.occurrences,
            meanScore: pm.meanScore,
            belowKkmCount: pm.belowKkmCount,
          })),
          emptyMessage: 'Parameter kompetensi akan terhitung otomatis setelah penilaian ujian tersimpan.',
        },
        {
          id: 'exam-schedule-list',
          title: 'Kalender Jadwal Ujian Terdaftar',
          columns: [
            { key: 'title', label: 'Nama Ujian' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'grade', label: 'Tingkat' },
            { key: 'day', label: 'Tanggal', align: 'right' },
            { key: 'time', label: 'Waktu' },
            { key: 'students', label: 'Peserta', align: 'right' },
            { key: 'status', label: 'Status' },
          ],
          rows: filteredExams.map((ex) => ({
            title: ex.title,
            classCode: normalizeClassKey(ex.classCode),
            grade: ex.grade,
            day: `Tgl ${ex.day}`,
            time: ex.time,
            students: ex.students,
            status: ex.status,
          })),
        },
      ],
      legacyMetrics: {
        avgScore: examStats.totalAssessments > 0 ? `${examStats.meanScore}` : `${avgStudentScore}`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: examStats.totalAssessments > 0 ? `${examStats.passRatePct}%` : `${studentPassRatePct}%`,
      },
      summary: examStats.insights[0],
    };
  }

  if (menuKey === 'assignments') {
    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Assignment',
          value: String(assignmentStats.totalAssignments),
          subtext: `${assignmentStats.activeCount} aktif · ${assignmentStats.needsGradingCount} perlu nilai · ${assignmentStats.completedCount} selesai`,
          tone: 'periwinkle',
        },
        {
          label: 'Tingkat Pengumpulan',
          value:
            assignmentStats.totalExpectedSubmissions > 0
              ? `${assignmentStats.submissionRatePct}%`
              : '—',
          subtext: `${assignmentStats.totalSubmitted}/${assignmentStats.totalExpectedSubmissions} jawaban masuk`,
          tone: 'mint',
        },
        {
          label: 'Rata-rata Nilai Tugas',
          value: assignmentStats.gradedCount > 0 ? String(assignmentStats.meanScore) : '—',
          subtext:
            assignmentStats.gradedCount > 0
              ? `Median ${assignmentStats.medianScore} (${assignmentStats.lowestScore}–${assignmentStats.highestScore})`
              : 'Belum ada tugas dinilai',
          tone: 'peach',
        },
        {
          label: 'Antrean Review / Pending',
          value: `${assignmentStats.needsReviewCount} / ${assignmentStats.pendingCount}`,
          subtext: `${assignmentStats.needsReviewCount} menunggu nilai · ${assignmentStats.pendingCount} belum kumpul`,
          tone: 'coral',
        },
      ],
      insights: assignmentStats.insights,
      sections: [
        {
          id: 'asg-per-item',
          title: 'Rincian Seluruh Assignment',
          columns: [
            { key: 'title', label: 'Judul Assignment' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'effectiveStatus', label: 'Status' },
            { key: 'submitted', label: 'Masuk', align: 'right' },
            { key: 'submissionRatePct', label: 'Submit (%)', align: 'right' },
            { key: 'needsReviewCount', label: 'Perlu Review', align: 'right' },
            { key: 'meanGradedScore', label: 'Avg Skor', align: 'right' },
          ],
          rows: assignmentStats.perAssignment.map((a) => ({
            title: a.title,
            classCode: a.classCode,
            effectiveStatus: a.effectiveStatus,
            submitted: `${a.submitted}/${a.total}`,
            submissionRatePct: `${a.submissionRatePct}%`,
            needsReviewCount: a.needsReviewCount,
            meanGradedScore: a.meanGradedScore ?? '—',
          })),
          emptyMessage: 'Belum ada assignment pada filter kelas ini.',
        },
        {
          id: 'asg-pending',
          title: 'Siswa dengan Tugas Pending / Menunggu Review',
          columns: [
            { key: 'name', label: 'Nama Siswa' },
            { key: 'classCodes', label: 'Kelas' },
            { key: 'pendingCount', label: 'Belum Submit', align: 'right' },
            { key: 'needsReviewCount', label: 'Menunggu Nilai', align: 'right' },
            { key: 'avgScore', label: 'Avg Nilai', align: 'right' },
          ],
          rows: assignmentStats.pendingStudents.map((s) => ({
            name: s.name,
            classCodes: s.classCodes.join(', '),
            pendingCount: s.pendingCount,
            needsReviewCount: s.needsReviewCount,
            avgScore: s.avgScore ?? '—',
          })),
          emptyMessage: 'Seluruh siswa telah mengumpulkan dan dinilai.',
        },
      ],
      legacyMetrics: {
        avgScore: assignmentStats.gradedCount > 0 ? `${assignmentStats.meanScore}` : '—',
        attendance: `${assignmentStats.submissionRatePct}%`,
        passRate: `${assignmentStats.totalSubmitted > 0 ? round1((assignmentStats.gradedCount / assignmentStats.totalSubmitted) * 100) : 0}%`,
      },
      summary: assignmentStats.insights[0],
    };
  }

  if (menuKey === 'livequiz') {
    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Sesi LiveQuiz Selesai',
          value: String(liveQuizStats.totalSessions),
          subtext: `${liveQuizStats.classicSessionsCount} Classic · ${liveQuizStats.testSessionsCount} Test Mode`,
          tone: 'peach',
        },
        {
          label: 'Akurasi Rata-rata',
          value: liveQuizStats.totalSessions > 0 ? `${liveQuizStats.overallAvgAccuracyPct}%` : '—',
          subtext: `${liveQuizStats.uniqueParticipants} peserta unik · ${liveQuizStats.totalQuizzesInLibrary} kuis di pustaka`,
          tone: 'mint',
        },
        {
          label: 'Rata-rata Skor / Streak',
          value: liveQuizStats.totalSessions > 0 ? liveQuizStats.meanParticipantScore.toLocaleString('id-ID') : '—',
          subtext:
            liveQuizStats.totalSessions > 0
              ? `Puncak ${liveQuizStats.highestParticipantScore.toLocaleString('id-ID')} · Rata-rata streak ${liveQuizStats.avgBestStreak}x`
              : 'Belum ada sesi selesai',
          tone: 'periwinkle',
        },
        {
          label: 'Integritas Test Mode',
          value: liveQuizStats.testSessionsCount > 0 ? String(liveQuizStats.totalTabSwitches) : '—',
          subtext:
            liveQuizStats.testSessionsCount === 0
              ? 'Belum ada sesi Test Mode'
              : liveQuizStats.totalTabSwitches === 0
                ? 'Tidak ada perpindahan tab terdeteksi'
                : `Tercatat di ${liveQuizStats.testSessionsCount} sesi Test Mode`,
          tone: 'coral',
        },
      ],
      insights: liveQuizStats.insights,
      sections: [
        {
          id: 'lq-sessions',
          title: 'Riwayat Sesi LiveQuiz',
          columns: [
            { key: 'quizTitle', label: 'Judul Kuis' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'mode', label: 'Mode' },
            { key: 'code', label: 'Kode Room' },
            { key: 'participantCount', label: 'Peserta', align: 'right' },
            { key: 'avgAccuracyPct', label: 'Akurasi', align: 'right' },
            { key: 'avgScore', label: 'Avg Skor', align: 'right' },
            { key: 'topScorer', label: 'Top Scorer' },
          ],
          rows: liveQuizStats.sessions.map((s) => ({
            quizTitle: s.quizTitle,
            classCode: s.classCode,
            mode: s.mode === 'test' ? 'Test Mode' : 'Classic',
            code: s.code,
            participantCount: s.participantCount,
            avgAccuracyPct: `${s.avgAccuracyPct}%`,
            avgScore: s.avgScore,
            topScorer: s.topScorer,
          })),
          emptyMessage: 'Belum ada riwayat sesi LiveQuiz selesai.',
        },
        {
          id: 'lq-hardest',
          title: 'Soal dengan Akurasi Terendah (Perlu Pembahasan)',
          columns: [
            { key: 'prompt', label: 'Pertanyaan' },
            { key: 'quizTitle', label: 'Kuis' },
            { key: 'correctAttempts', label: 'Benar', align: 'right' },
            { key: 'totalAttempts', label: 'Percobaan', align: 'right' },
            { key: 'accuracyPct', label: 'Akurasi', align: 'right' },
          ],
          rows: liveQuizStats.hardestQuestions.map((q) => ({
            prompt: q.prompt,
            quizTitle: q.quizTitle,
            correctAttempts: q.correctAttempts,
            totalAttempts: q.totalAttempts,
            accuracyPct: `${q.accuracyPct}%`,
          })),
          emptyMessage: 'Statistik per soal tersedia setelah sesi LiveQuiz dijalankan.',
        },
        {
          id: 'lq-leaderboard',
          title: 'Leaderboard Kumulatif Partisipan LiveQuiz',
          columns: [
            { key: 'name', label: 'Peserta' },
            { key: 'sessionsPlayed', label: 'Sesi', align: 'right' },
            { key: 'totalScore', label: 'Total Skor', align: 'right' },
            { key: 'avgAccuracyPct', label: 'Akurasi', align: 'right' },
            { key: 'bestStreak', label: 'Best Streak', align: 'right' },
            { key: 'tabSwitches', label: 'Tab Switch', align: 'right' },
          ],
          rows: liveQuizStats.leaderboard.slice(0, 15).map((p) => ({
            name: p.name,
            sessionsPlayed: p.sessionsPlayed,
            totalScore: p.totalScore,
            avgAccuracyPct: `${p.avgAccuracyPct}%`,
            bestStreak: `${p.bestStreak}x`,
            tabSwitches: p.tabSwitches,
          })),
        },
      ],
      legacyMetrics: {
        avgScore: `${liveQuizStats.overallAvgAccuracyPct}%`,
        attendance: `${liveQuizStats.uniqueParticipants} peserta`,
        passRate: `${liveQuizStats.totalSessions} sesi`,
      },
      summary: liveQuizStats.insights[0],
    };
  }

  if (menuKey === 'schedule') {
    const uniqueRooms = new Set(filteredSchedules.map((s) => s.room)).size;
    const totalSeats = filteredSchedules.reduce((sum, s) => sum + (s.students || 0), 0);
    const avgTolerance =
      filteredSchedules.length > 0
        ? round1(
            filteredSchedules.reduce((sum, s) => sum + (s.lateToleranceMin ?? 15), 0) /
              filteredSchedules.length
          )
        : 0;

    const insights: string[] = [];
    if (filteredSchedules.length === 0) {
      insights.push('Belum ada sesi jadwal terdaftar untuk filter kelas ini.');
    } else {
      insights.push(
        `Terjadwal ${filteredSchedules.length} sesi mingguan menggunakan ${uniqueRooms} ruang kelas dengan rata-rata toleransi keterlambatan ${avgTolerance} menit.`
      );
      const lowestCoverage = attendanceStats.missedSchedules[0];
      if (lowestCoverage) {
        insights.push(
          `Sesi ${lowestCoverage.subject} (${lowestCoverage.day}, ${lowestCoverage.timeRange}) memiliki cakupan kehadiran ${lowestCoverage.attendancePct}%.`
        );
      }
    }

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Sesi Jadwal',
          value: String(filteredSchedules.length),
          subtext: `${uniqueRooms} ruangan digunakan`,
          tone: 'periwinkle',
        },
        {
          label: 'Total Kapasitas Sesi',
          value: String(totalSeats),
          subtext:
            filteredSchedules.length > 0
              ? `Rata-rata ${Math.round(totalSeats / filteredSchedules.length)} peserta/sesi`
              : 'Belum ada sesi terjadwal',
          tone: 'mint',
        },
        {
          label: 'Rata-rata Toleransi Terlambat',
          value: filteredSchedules.length > 0 ? `${avgTolerance} mnt` : '—',
          subtext:
            filteredSchedules.length > 0
              ? `Berlaku pada ${filteredSchedules.length} sesi aktif`
              : 'Belum ada jadwal',
          tone: 'peach',
        },
        {
          label: 'Scan QR Tercatat',
          value: String(attendanceStats.qrCheckInCount),
          subtext:
            attendanceStats.qrCheckInCount > 0
              ? `${attendanceStats.onTimeCount} tepat waktu · ${attendanceStats.lateCount} terlambat`
              : 'Belum ada scan QR masuk',
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'schedule-grid',
          title: 'Daftar Sesi Jadwal Mengajar & Cakupan Kehadiran',
          columns: [
            { key: 'day', label: 'Hari' },
            { key: 'date', label: 'Tanggal' },
            { key: 'time', label: 'Jam' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'subject', label: 'Mata Pelajaran' },
            { key: 'room', label: 'Ruang' },
            { key: 'tolerance', label: 'Toleransi', align: 'right' },
            { key: 'students', label: 'Target Siswa', align: 'right' },
          ],
          rows: filteredSchedules.map((s) => ({
            day: s.day,
            date: s.date,
            time: `${s.startHour}–${s.endHour}`,
            classCode: normalizeClassKey(s.classCode),
            subject: s.subject,
            room: s.room,
            tolerance: `${s.lateToleranceMin ?? 15} mnt`,
            students: s.students,
          })),
          emptyMessage: 'Belum ada sesi terjadwal untuk filter kelas ini.',
        },
      ],
      legacyMetrics: {
        avgScore: `${avgTolerance} mnt`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${filteredSchedules.length} sesi`,
      },
      summary: insights[0],
    };
  }

  if (menuKey === 'students') {
    const honorRollCount = filteredStudents.filter((s) => s.status === 'Honor Roll').length;
    const supportCount = filteredStudents.filter((s) => s.status === 'Needs Support').length;
    const notEligible = studentEvaluations.filter((x) => !x.eval.overallPassed);

    const insights: string[] = [];
    if (filteredStudents.length === 0) {
      insights.push('Belum ada siswa / crew terdaftar pada filter kelas ini.');
    } else {
      insights.push(
        `Dari ${filteredStudents.length} peserta, ${eligibleStudentsCount} dinyatakan Memenuhi Syarat Kelulusan Batch (${studentPassRatePct}%) berdasarkan batas hadir ≥ ${graduationRule.minAttendanceRatePct}% dan KKM ≥ ${examGradingRule.passingScore}.`
      );
      if (notEligible.length > 0) {
        insights.push(
          `${notEligible.length} peserta memerlukan pendampingan khusus karena kendala absensi, keterlambatan, atau nilai ujian di bawah KKM.`
        );
      } else {
        insights.push('Seluruh peserta dalam filter ini memenuhi kriteria akademik dan kehadiran batch.');
      }
    }

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Siswa / Crew',
          value: String(filteredStudents.length),
          subtext: `${honorRollCount} Honor Roll · ${supportCount} Needs Support`,
          tone: 'periwinkle',
        },
        {
          label: 'Memenuhi Syarat Lulus',
          value: `${eligibleStudentsCount}/${filteredStudents.length}`,
          subtext: `Tingkat kelulusan ${studentPassRatePct}%`,
          tone: 'mint',
        },
        {
          label: 'Rata-rata Nilai Siswa',
          value: filteredStudents.length > 0 ? String(avgStudentScore) : '—',
          subtext: `KKM Batch ≥ ${examGradingRule.passingScore}`,
          tone: 'peach',
        },
        {
          label: 'Perlu Pendampingan',
          value: String(notEligible.length),
          subtext: `Batas alfa maks ${graduationRule.maxUnexcusedAbsences}x`,
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'students-eligibility',
          title: 'Evaluasi Kelulusan & Standing Akademik Siswa',
          subtitle: 'Dihitung real-time terhadap aturan kehadiran dan KKM batch aktif',
          columns: [
            { key: 'name', label: 'Nama Peserta' },
            { key: 'classCode', label: 'Kelas' },
            { key: 'standing', label: 'Standing' },
            { key: 'rate', label: 'Hadir Efektif', align: 'right' },
            { key: 'score', label: 'Skor Ujian', align: 'right' },
            { key: 'grade', label: 'Grade', align: 'right' },
            { key: 'status', label: 'Evaluasi Batch' },
            { key: 'notes', label: 'Catatan' },
          ],
          rows: studentEvaluations.map(({ student, eval: ev }) => ({
            name: student.name,
            classCode: normalizeClassKey(student.classCode),
            standing: student.status,
            rate: `${ev.effectiveAttendanceRate}%`,
            score: ev.examScore,
            grade: ev.gradeBand.grade,
            status: ev.overallPassed ? 'Memenuhi Syarat' : 'Perlu Tindak Lanjut',
            notes: ev.reasons.length > 0 ? ev.reasons.join('; ') : 'Seluruh kriteria terpenuhi',
          })),
          emptyMessage: 'Belum ada data siswa terdaftar.',
        },
      ],
      legacyMetrics: {
        avgScore: `${avgStudentScore}`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${studentPassRatePct}%`,
      },
      summary: insights[0],
    };
  }

  if (menuKey === 'trainers') {
    const totalSessions = filteredTrainers.reduce((s, t) => s + t.sessionsCount, 0);
    const avgRating =
      filteredTrainers.length > 0
        ? round1(filteredTrainers.reduce((s, t) => s + t.rating, 0) / filteredTrainers.length)
        : 0;
    const activeParams = trainerFeedbackParameters.filter((p) => p.active);

    const paramRows = activeParams.map((param) => {
      const ratings: number[] = [];
      filteredFeedbacks.forEach((fb) => {
        const matched = fb.parameterScores.find((ps) => ps.parameterId === param.id);
        if (matched) ratings.push(matched.rating);
      });
      const avgStar =
        ratings.length > 0
          ? round1(ratings.reduce((a, b) => a + b, 0) / ratings.length)
          : 0;
      return {
        label: param.label,
        responses: ratings.length,
        avgStar: ratings.length > 0 ? `${avgStar} / 5.0` : '—',
        pct: ratings.length > 0 ? `${Math.round((avgStar / 5) * 100)}%` : '—',
      };
    });

    const insights: string[] = [];
    if (filteredTrainers.length === 0) {
      insights.push('Belum ada data trainer terdaftar untuk filter kelas ini.');
    } else {
      const topTrainer = [...filteredTrainers].sort((a, b) => b.rating - a.rating)[0];
      insights.push(
        `Tercatat ${filteredTrainers.length} pengajar aktif dengan akumulasi ${totalSessions} sesi mengajar dan rata-rata rating ${avgRating}%.`
      );
      if (topTrainer) {
        insights.push(
          `Rating tertinggi saat ini dipegang oleh ${topTrainer.name} (${topTrainer.department} · ${topTrainer.rating}%).`
        );
      }
      insights.push(
        `Terkumpul ${filteredFeedbacks.length} ulasan feedback crew pada ${activeParams.length} parameter penilaian aktif.`
      );
    }

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Total Trainer',
          value: String(filteredTrainers.length),
          subtext: `${filteredTrainers.filter((t) => t.status === 'Lead Trainer').length} Lead Trainer`,
          tone: 'periwinkle',
        },
        {
          label: 'Rata-rata Rating',
          value: filteredTrainers.length > 0 ? `${avgRating}%` : '—',
          subtext:
            filteredFeedbacks.length > 0
              ? `Dihitung dari ${filteredFeedbacks.length} ulasan crew`
              : filteredTrainers.length > 0
                ? 'Menggunakan skor dasar direktori'
                : 'Belum ada trainer terdaftar',
          tone: 'mint',
        },
        {
          label: 'Total Sesi Mengajar',
          value: String(totalSessions),
          subtext:
            filteredTrainers.length > 0
              ? `Rata-rata ${round1(totalSessions / filteredTrainers.length)} sesi/trainer`
              : 'Belum ada sesi tercatat',
          tone: 'peach',
        },
        {
          label: 'Ulasan Crew Masuk',
          value: String(filteredFeedbacks.length),
          subtext: `${activeParams.length} parameter penilaian aktif`,
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'trainers-directory',
          title: 'Kinerja & Beban Sesi Trainer',
          columns: [
            { key: 'name', label: 'Nama Trainer' },
            { key: 'department', label: 'Departemen' },
            { key: 'assignedClass', label: 'Kelas Ampuan' },
            { key: 'status', label: 'Status' },
            { key: 'sessionsCount', label: 'Total Sesi', align: 'right' },
            { key: 'rating', label: 'Rating', align: 'right' },
          ],
          rows: filteredTrainers.map((t) => ({
            name: t.name,
            department: t.department,
            assignedClass: normalizeClassKey(t.assignedClass),
            status: t.status,
            sessionsCount: t.sessionsCount,
            rating: `${t.rating}%`,
          })),
        },
        {
          id: 'trainer-feedback-params',
          title: 'Skor Rata-rata per Parameter Feedback Crew',
          columns: [
            { key: 'label', label: 'Parameter Evaluasi' },
            { key: 'responses', label: 'Jumlah Ulasan', align: 'right' },
            { key: 'avgStar', label: 'Rata-rata Bintang', align: 'right' },
            { key: 'pct', label: 'Persentase', align: 'right' },
          ],
          rows: paramRows,
        },
      ],
      legacyMetrics: {
        avgScore: `${avgRating}%`,
        attendance: `${totalSessions} sesi`,
        passRate: `${filteredFeedbacks.length} review`,
      },
      summary: insights[0],
    };
  }

  if (menuKey === 'overview') {
    const readyPlans = filteredPlans.filter((p) => p.status === 'Ready').length;
    const totalMatProgress =
      filteredMaterials.length > 0
        ? round1(
            filteredMaterials.reduce(
              (s, m) => s + getMaterialCrewSummary(m, studentsDirectory).avgProgress,
              0
            ) / filteredMaterials.length
          )
        : 0;

    const overviewRows = [
      {
        menu: 'Materials',
        metric: `${filteredMaterials.length} materi · Avg progres ${totalMatProgress}%`,
        status: filteredMaterials.length > 0 ? 'Aktif' : 'Kosong',
      },
      {
        menu: 'Class Preparation',
        metric: `${readyPlans}/${filteredPlans.length} Lesson Plan siap ajar`,
        status: readyPlans === filteredPlans.length && filteredPlans.length > 0 ? 'Siap' : 'Berjalan',
      },
      {
        menu: 'Attendance',
        metric: `${attendanceStats.effectiveAttendanceRatePct}% hadir efektif · ${attendanceStats.atRiskCrewCount} berisiko`,
        status:
          attendanceStats.effectiveAttendanceRatePct >= graduationRule.minAttendanceRatePct
            ? 'Memenuhi Target'
            : 'Perlu Perhatian',
      },
      {
        menu: 'Exams',
        metric: `${filteredExams.length} jadwal · ${examStats.totalAssessments} penilaian (Lulus ${examStats.passRatePct}%)`,
        status: examStats.totalAssessments > 0 ? 'Terekam' : 'Menunggu Nilai',
      },
      {
        menu: 'Assignment',
        metric: `${assignmentStats.totalAssignments} tugas · Submit ${assignmentStats.submissionRatePct}% · Avg ${assignmentStats.meanScore}`,
        status: assignmentStats.needsReviewCount > 0 ? `${assignmentStats.needsReviewCount} Perlu Review` : 'Terkendali',
      },
      {
        menu: 'LiveQuiz',
        metric: `${liveQuizStats.totalSessions} sesi · Akurasi ${liveQuizStats.overallAvgAccuracyPct}%`,
        status: liveQuizStats.totalSessions > 0 ? 'Aktif' : 'Belum Ada Sesi',
      },
      {
        menu: 'Schedule',
        metric: `${filteredSchedules.length} sesi mingguan terjadwal`,
        status: filteredSchedules.length > 0 ? 'Terjadwal' : 'Kosong',
      },
      {
        menu: 'Students',
        metric: `${eligibleStudentsCount}/${filteredStudents.length} memenuhi syarat kelulusan (${studentPassRatePct}%)`,
        status: `${studentPassRatePct}% Lulus`,
      },
      {
        menu: 'Trainer',
        metric: `${filteredTrainers.length} trainer · ${filteredFeedbacks.length} feedback crew`,
        status: 'Aktif',
      },
    ];

    const insights = [
      `${activeBatch.batchName} (${activeBatch.year}) — ${activeBatch.programEvent || 'Servolution Academy'} (${activeBatch.gmsAsal || 'GMS Pusat'}) mencatat kehadiran efektif ${attendanceStats.effectiveAttendanceRatePct}% dan kelulusan siswa ${studentPassRatePct}%.`,
      `Aturan kelulusan aktif mensyaratkan kehadiran minimal ${graduationRule.minAttendanceRatePct}% (maks alfa ${graduationRule.maxUnexcusedAbsences}x) dan nilai KKM ujian ≥ ${examGradingRule.passingScore}/${examGradingRule.scaleMax}.`,
      assignmentStats.needsReviewCount > 0
        ? `Prioritas terdekat: periksa ${assignmentStats.needsReviewCount} jawaban tugas Needs Review dan tindak lanjuti ${attendanceStats.atRiskCrewCount} peserta berisiko absensi.`
        : `Operasional kelas berjalan stabil di ${filteredSchedules.length} jadwal mingguan dan ${filteredMaterials.length} materi ajar.`,
    ];

    return {
      ...baseMeta,
      kpis: [
        {
          label: 'Kehadiran Efektif',
          value:
            attendanceStats.totalStatusEntries > 0
              ? `${attendanceStats.effectiveAttendanceRatePct}%`
              : '—',
          subtext: `Target batch ≥ ${graduationRule.minAttendanceRatePct}%`,
          tone: 'mint',
        },
        {
          label: 'Kelulusan Batch Peserta',
          value: filteredStudents.length > 0 ? `${studentPassRatePct}%` : '—',
          subtext: `${eligibleStudentsCount}/${filteredStudents.length} memenuhi kriteria`,
          tone: 'periwinkle',
        },
        {
          label: 'Pengumpulan & Nilai Tugas',
          value:
            assignmentStats.totalExpectedSubmissions > 0
              ? `${assignmentStats.submissionRatePct}%`
              : '—',
          subtext: `Rata-rata skor ${assignmentStats.gradedCount > 0 ? assignmentStats.meanScore : '—'}`,
          tone: 'peach',
        },
        {
          label: 'Akurasi LiveQuiz',
          value: liveQuizStats.totalSessions > 0 ? `${liveQuizStats.overallAvgAccuracyPct}%` : '—',
          subtext: `${liveQuizStats.totalSessions} sesi · ${examStats.totalAssessments} penilaian ujian`,
          tone: 'coral',
        },
      ],
      insights,
      sections: [
        {
          id: 'overview-menu-health',
          title: 'Ringkasan Status Operasional Semua Menu',
          columns: [
            { key: 'menu', label: 'Menu Aplikasi' },
            { key: 'metric', label: 'Ringkasan Metrik Real-Time' },
            { key: 'status', label: 'Status Operasional' },
          ],
          rows: overviewRows,
        },
        {
          id: 'overview-batch-rules',
          title: 'Parameter & Aturan Evaluasi Batch Aktif',
          columns: [
            { key: 'parameter', label: 'Aturan / Parameter' },
            { key: 'nilai', label: 'Ketentuan Aktif' },
          ],
          rows: [
            { parameter: 'Batch & Tahun', nilai: `${activeBatch.batchName} (${activeBatch.year})` },
            { parameter: 'GMS Asal / Program', nilai: `${activeBatch.gmsAsal || '—'} · ${activeBatch.programEvent || '—'}` },
            { parameter: 'Minimal Kehadiran Kelulusan', nilai: `${graduationRule.minAttendanceRatePct}% (Bobot Late ${graduationRule.lateWeightPct}%)` },
            { parameter: 'Batas Alfa / Terlambat Maksimal', nilai: `${graduationRule.maxUnexcusedAbsences}x Absent · ${graduationRule.maxLateCount}x Late` },
            { parameter: 'KKM Penilaian Ujian', nilai: `${examGradingRule.passingScore} dari ${examGradingRule.scaleMax} (Remedial: ${examGradingRule.allowRemedial ? 'Diizinkan' : 'Tidak'})` },
          ],
        },
      ],
      legacyMetrics: {
        avgScore: `${avgStudentScore}`,
        attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
        passRate: `${studentPassRatePct}%`,
      },
      summary: insights[0],
    };
  }

  // DEFAULT: 'all_menus' — Comprehensive Cross-Menu Integrated Report
  const avgMaterialProgress =
    filteredMaterials.length > 0
      ? round1(
          filteredMaterials.reduce(
            (s, m) => s + getMaterialCrewSummary(m, studentsDirectory).avgProgress,
            0
          ) / filteredMaterials.length
        )
      : 0;
  const readyPlans = filteredPlans.filter((p) => p.status === 'Ready').length;
  const avgTrainerRating =
    filteredTrainers.length > 0
      ? round1(filteredTrainers.reduce((s, t) => s + t.rating, 0) / filteredTrainers.length)
      : 0;

  const allInsights = [
    `Laporan terpadu mencakup 10 modul operasional untuk ${activeBatch.batchName} (${activeBatch.year}) dengan cakupan ${normalizedFilter}.`,
    attendanceStats.insights[0],
    assignmentStats.insights[0],
    examStats.totalAssessments > 0
      ? examStats.insights[0]
      : `Direktori Siswa mencatat ${eligibleStudentsCount}/${filteredStudents.length} peserta (${studentPassRatePct}%) memenuhi syarat kelulusan batch.`,
    liveQuizStats.insights[0],
  ];

  return {
    ...baseMeta,
    kpis: [
      {
        label: 'Kehadiran Efektif',
        value:
          attendanceStats.totalStatusEntries > 0
            ? `${attendanceStats.effectiveAttendanceRatePct}%`
            : '—',
        subtext: `${attendanceStats.presentCount} hadir · ${attendanceStats.atRiskCrewCount} berisiko`,
        tone: 'mint',
      },
      {
        label: 'Kelulusan & Ujian',
        value: filteredStudents.length > 0 ? `${studentPassRatePct}%` : '—',
        subtext:
          examStats.totalAssessments > 0
            ? `Rata-rata ujian ${examStats.meanScore} · Lulus KKM ${examStats.passRatePct}%`
            : `${eligibleStudentsCount}/${filteredStudents.length} peserta layak lulus`,
        tone: 'periwinkle',
      },
      {
        label: 'Tugas & Materi',
        value:
          assignmentStats.totalExpectedSubmissions > 0
            ? `${assignmentStats.submissionRatePct}%`
            : '—',
        subtext: `Rata-rata tugas ${assignmentStats.gradedCount > 0 ? assignmentStats.meanScore : '—'} · Progres materi ${avgMaterialProgress}%`,
        tone: 'peach',
      },
      {
        label: 'LiveQuiz & Trainer',
        value: liveQuizStats.totalSessions > 0 ? `${liveQuizStats.overallAvgAccuracyPct}%` : '—',
        subtext: `${liveQuizStats.totalSessions} sesi kuis · Rating trainer ${filteredTrainers.length > 0 ? `${avgTrainerRating}%` : '—'}`,
        tone: 'coral',
      },
    ],
    insights: allInsights,
    sections: [
      {
        id: 'all-menus-matrix',
        title: '1. Matriks Ringkasan Seluruh Menu Operasional',
        columns: [
          { key: 'menu', label: 'Menu' },
          { key: 'volume', label: 'Volume Data', align: 'right' },
          { key: 'keyMetric', label: 'Metrik Utama', align: 'right' },
          { key: 'highlight', label: 'Ringkasan Kondisi' },
        ],
        rows: [
          {
            menu: 'Materials',
            volume: `${filteredMaterials.length} item`,
            keyMetric: `${avgMaterialProgress}%`,
            highlight: `${filteredMaterials.reduce((s, m) => s + m.downloadCount, 0)} unduhan tercatat`,
          },
          {
            menu: 'Class Preparation',
            volume: `${filteredPlans.length} RPP`,
            keyMetric: `${readyPlans} Ready`,
            highlight: `${filteredPlans.length - readyPlans} RPP masih dalam progres/draft`,
          },
          {
            menu: 'Attendance',
            volume: `${attendanceStats.totalUniqueCrew} crew`,
            keyMetric: `${attendanceStats.effectiveAttendanceRatePct}%`,
            highlight: `${attendanceStats.onTimeCount} On Time · ${attendanceStats.lateCount} Late · ${attendanceStats.absentCount} Absent`,
          },
          {
            menu: 'Exams',
            volume: `${filteredExams.length} jadwal / ${examStats.totalAssessments} nilai`,
            keyMetric: examStats.totalAssessments > 0 ? `${examStats.meanScore}` : '—',
            highlight:
              examStats.totalAssessments > 0
                ? `Kelulusan KKM ${examStats.passRatePct}%`
                : 'Belum ada input penilaian ujian',
          },
          {
            menu: 'Assignment',
            volume: `${assignmentStats.totalAssignments} tugas`,
            keyMetric: `${assignmentStats.submissionRatePct}%`,
            highlight: `Avg nilai ${assignmentStats.meanScore} · ${assignmentStats.needsReviewCount} perlu review`,
          },
          {
            menu: 'LiveQuiz',
            volume: `${liveQuizStats.totalSessions} sesi`,
            keyMetric: `${liveQuizStats.overallAvgAccuracyPct}%`,
            highlight: `${liveQuizStats.uniqueParticipants} partisipan · ${liveQuizStats.totalTabSwitches} tab switches`,
          },
          {
            menu: 'Schedule',
            volume: `${filteredSchedules.length} sesi`,
            keyMetric: `${new Set(filteredSchedules.map((s) => s.room)).size} ruang`,
            highlight: `Terjadwal Senin–Jumat lintas kelas`,
          },
          {
            menu: 'Students',
            volume: `${filteredStudents.length} siswa`,
            keyMetric: `${studentPassRatePct}% Lulus`,
            highlight: `${eligibleStudentsCount} memenuhi syarat kelulusan batch`,
          },
          {
            menu: 'Trainer',
            volume: `${filteredTrainers.length} trainer`,
            keyMetric: `${avgTrainerRating}%`,
            highlight: `${filteredFeedbacks.length} ulasan crew tersimpan`,
          },
        ],
      },
      {
        id: 'all-menus-attendance',
        title: '2. Rekap Kehadiran per Kelas (Attendance)',
        columns: [
          { key: 'classKey', label: 'Kelas' },
          { key: 'totalCrew', label: 'Crew', align: 'right' },
          { key: 'onTimeCount', label: 'On Time', align: 'right' },
          { key: 'lateCount', label: 'Late', align: 'right' },
          { key: 'absentCount', label: 'Absent', align: 'right' },
          { key: 'rate', label: 'Efektif (%)', align: 'right' },
        ],
        rows: attendanceStats.byClass.map((c) => ({
          classKey: c.classKey,
          totalCrew: c.totalCrew,
          onTimeCount: c.onTimeCount,
          lateCount: c.lateCount,
          absentCount: c.absentCount,
          rate: `${c.attendanceRatePct}%`,
        })),
      },
      {
        id: 'all-menus-assignments',
        title: '3. Rekap Assignment & Pengumpulan',
        columns: [
          { key: 'title', label: 'Judul Tugas' },
          { key: 'classCode', label: 'Kelas' },
          { key: 'effectiveStatus', label: 'Status' },
          { key: 'submitted', label: 'Terkumpul', align: 'right' },
          { key: 'meanGradedScore', label: 'Avg Nilai', align: 'right' },
        ],
        rows: assignmentStats.perAssignment.map((a) => ({
          title: a.title,
          classCode: a.classCode,
          effectiveStatus: a.effectiveStatus,
          submitted: `${a.submitted}/${a.total} (${a.submissionRatePct}%)`,
          meanGradedScore: a.meanGradedScore ?? '—',
        })),
      },
      {
        id: 'all-menus-livequiz',
        title: '4. Rekap Sesi LiveQuiz',
        columns: [
          { key: 'quizTitle', label: 'Kuis' },
          { key: 'mode', label: 'Mode' },
          { key: 'participantCount', label: 'Peserta', align: 'right' },
          { key: 'avgAccuracyPct', label: 'Akurasi', align: 'right' },
          { key: 'topScorer', label: 'Skor Tertinggi' },
        ],
        rows: liveQuizStats.sessions.map((s) => ({
          quizTitle: s.quizTitle,
          mode: s.mode === 'test' ? 'Test Mode' : 'Classic',
          participantCount: s.participantCount,
          avgAccuracyPct: `${s.avgAccuracyPct}%`,
          topScorer: s.topScorer,
        })),
      },
      {
        id: 'all-menus-students',
        title: '5. Evaluasi Kelulusan Siswa (Students & Exams)',
        columns: [
          { key: 'name', label: 'Nama' },
          { key: 'classCode', label: 'Kelas' },
          { key: 'rate', label: 'Hadir', align: 'right' },
          { key: 'score', label: 'Nilai', align: 'right' },
          { key: 'status', label: 'Kelulusan' },
        ],
        rows: studentEvaluations.map(({ student, eval: ev }) => ({
          name: student.name,
          classCode: normalizeClassKey(student.classCode),
          rate: `${ev.effectiveAttendanceRate}%`,
          score: `${ev.examScore} (${ev.gradeBand.grade})`,
          status: ev.overallPassed ? 'Memenuhi Syarat' : 'Perlu Tindak Lanjut',
        })),
      },
    ],
    legacyMetrics: {
      avgScore: `${avgStudentScore}`,
      attendance: `${attendanceStats.effectiveAttendanceRatePct}%`,
      passRate: `${studentPassRatePct}%`,
    },
    summary: allInsights[1] || allInsights[0],
  };
}
