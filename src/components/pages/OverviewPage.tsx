import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  FileCheck,
  Bookmark,
  BookOpen,
  ArrowRight,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  Image as ImageIcon,
  AlertTriangle,
  UserX,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PASTEL_THEMES } from '../../constants/theme';
import {
  formatScheduleDateLabel,
  getAssignmentSchedulePhase,
  getEffectiveAssignmentStatus,
  getRemainingScheduleLabel,
} from '../../utils/assignmentSchedule';
import {
  normalizeClassKey,
  resolveSubjectForClassKey,
} from '../../utils/scheduleSubjects';
import { LiveQuizJoinAccordion } from '../livequiz/LiveQuizJoinAccordion';
import { InfoPopover } from '../ui/InfoPopover';
import { PageId } from '../../types';

interface AttentionQueueItem {
  id: string;
  title: string;
  subtitle: string;
  metricLabel: string;
  iconBg: string;
  icon: React.ReactNode;
  onAction: () => void;
}

const DAY_ORDER: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };

export const OverviewPage: React.FC = () => {
  const {
    setActivePage,
    exams,
    assignments,
    lessonPlans,
    schedules,
    liveQuizzes,
    attendanceByClass,
    studentsDirectory,
    graduationRule,
    setSelectedAttendanceClass,
    setActiveTakeAssignment,
  } = useApp();

  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const activeOverviewAssignments = useMemo(
    () =>
      assignments.filter(
        (asg) =>
          asg.status !== 'Completed' &&
          getAssignmentSchedulePhase(asg, now) === 'running' &&
          getEffectiveAssignmentStatus(asg, now) !== 'Completed'
      ),
    [assignments, now]
  );

  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleOverviewJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = joinCode.replace(/\D/g, '').slice(0, 6);
    if (cleanCode.length !== 6) {
      setJoinError('Masukkan 6 digit kode ruangan LiveQuiz.');
      return;
    }
    if (!joinName.trim()) {
      setJoinError('Masukkan nama peserta terlebih dahulu.');
      return;
    }
  };

  const stashQuizzesForJoinTab = () => {
    setJoinError(null);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('servolution_live_quizzes', JSON.stringify(liveQuizzes));
    } catch {
      // ignore storage quota errors
    }
  };

  const overviewPreviewTabUrl = `/?liveQuizJoin=1&preview=1&name=${encodeURIComponent(
    joinName.trim() || 'Peserta Preview'
  )}`;

  // 1. Live Attendance KPI Summary from attendanceByClass
  const attendanceSummary = useMemo(() => {
    let presentCount = 0;
    let absentCount = 0;
    let excuseCount = 0;

    const absencesByClass: Array<{ classKey: string; count: number }> = [];

    Object.entries(attendanceByClass).forEach(([classKey, bucket]) => {
      const p = bucket.attendance?.length || 0;
      const a = bucket.absences?.length || 0;
      const e = bucket.excuse?.length || 0;
      presentCount += p;
      absentCount += a;
      excuseCount += e;
      if (a > 0) {
        absencesByClass.push({ classKey, count: a });
      }
    });

    absencesByClass.sort((a, b) => b.count - a.count);

    const totalCount = presentCount + absentCount + excuseCount;
    const rawRate =
      totalCount > 0
        ? (presentCount / totalCount) * 100
        : studentsDirectory.length > 0
        ? studentsDirectory.reduce((sum, st) => sum + st.rate, 0) / studentsDirectory.length
        : 0;
    const rateFormatted = `${(Math.round(rawRate * 10) / 10).toFixed(1).replace(/\.0$/, '')}%`;

    return {
      presentCount,
      absentCount,
      excuseCount,
      totalCount,
      rawRate,
      rateFormatted,
      absencesByClass,
    };
  }, [attendanceByClass, studentsDirectory]);

  // 2. Live Crew Below Minimum Attendance Threshold (deduplicated across directory & attendance buckets)
  const belowMinAttendanceCrew = useMemo(() => {
    const threshold = graduationRule.minAttendanceRatePct;
    const map = new Map<string, { name: string; rate: number; classKey: string }>();

    studentsDirectory.forEach((st) => {
      const key = st.name.trim().toLowerCase();
      if (!key) return;
      map.set(key, {
        name: st.name,
        rate: st.rate,
        classKey: normalizeClassKey(st.classCode),
      });
    });

    Object.entries(attendanceByClass).forEach(([classKey, bucket]) => {
      const allEntries = [
        ...(bucket.attendance || []),
        ...(bucket.absences || []),
        ...(bucket.excuse || []),
      ];
      allEntries.forEach((rec) => {
        const key = rec.name.trim().toLowerCase();
        if (!key) return;
        const existing = map.get(key);
        if (!existing || rec.rate < existing.rate) {
          map.set(key, {
            name: rec.name,
            rate: rec.rate,
            classKey,
          });
        }
      });
    });

    return Array.from(map.values())
      .filter((crew) => crew.rate < threshold)
      .sort((a, b) => a.rate - b.rate);
  }, [studentsDirectory, attendanceByClass, graduationRule.minAttendanceRatePct]);

  // 3. Live Pending Grading KPI Summary
  const gradingSummary = useMemo(() => {
    let pendingSubmissions = 0;
    let tasksWithPending = 0;

    assignments.forEach((asg) => {
      const needsReview = asg.submissions.filter((s) => s.status === 'Needs Review').length;
      if (needsReview > 0) {
        pendingSubmissions += needsReview;
        tasksWithPending += 1;
      }
    });

    return { pendingSubmissions, tasksWithPending };
  }, [assignments]);

  // 4. Live Lesson Readiness KPI Summary
  const readinessSummary = useMemo(() => {
    const totalPlans = lessonPlans.length;
    const readyPlans = lessonPlans.filter((p) => p.status === 'Ready' || p.progress >= 100).length;
    const avgReadiness =
      totalPlans > 0
        ? Math.round(lessonPlans.reduce((acc, plan) => acc + plan.progress, 0) / totalPlans)
        : 0;

    const incompletePlans = lessonPlans
      .filter((p) => p.status !== 'Ready' && p.progress < 100)
      .sort((a, b) => a.progress - b.progress);

    const statusLabel =
      totalPlans === 0
        ? 'Belum ada modul'
        : avgReadiness >= 80
        ? 'Siap mengajar'
        : avgReadiness >= 50
        ? 'Dalam proses'
        : 'Perlu dilengkapi';

    const statusClass =
      totalPlans === 0
        ? 'text-[#7D3A51]'
        : avgReadiness >= 80
        ? 'text-emerald-700'
        : avgReadiness >= 50
        ? 'text-amber-700'
        : 'text-[#9D113C]';

    return {
      totalPlans,
      readyPlans,
      avgReadiness,
      incompletePlans,
      statusLabel,
      statusClass,
    };
  }, [lessonPlans]);

  // 5. Live Scheduled & Upcoming Exams (from schedules[type='exam'] + exams state, zero static list)
  const upcomingExamItems = useMemo(() => {
    const fromSchedules = [...schedules]
      .filter((sch) => sch.type.trim().toLowerCase() === 'exam')
      .sort((a, b) => {
        const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
        if (dayDiff !== 0) return dayDiff;
        return a.startHour.localeCompare(b.startHour);
      })
      .map((sch) => {
        const cleanClass =
          sch.classCode === 'All'
            ? 'Semua Kelas'
            : normalizeClassKey(sch.classCode);
        return {
          id: `sch-${sch.id}`,
          title: sch.subject,
          shortLabel: `${sch.subject} · ${cleanClass.replace(/^Class\s+/i, '')}`,
          subtitle: `${cleanClass} · ${sch.day}, ${sch.date} Feb · ${sch.startHour}–${sch.endHour}`,
          metaLabel: `Jadwal · ${sch.day}`,
          theme: sch.theme,
          targetPage: 'schedule' as PageId,
        };
      });

    const fromExams = [...exams]
      .sort((a, b) => a.day - b.day || a.time.localeCompare(b.time))
      .map((ex) => {
        const cleanClass = normalizeClassKey(ex.classCode);
        return {
          id: `exam-${ex.id}`,
          title: ex.title,
          shortLabel: `${ex.title} · ${cleanClass.replace(/^Class\s+/i, '')}`,
          subtitle: `${cleanClass} · ${ex.grade} · Hari ke-${ex.day}, ${ex.time} · ${ex.students} crew`,
          metaLabel: `Hari ${ex.day} · ${ex.time}`,
          theme: ex.theme,
          targetPage: 'exams' as PageId,
        };
      });

    return [...fromSchedules, ...fromExams];
  }, [schedules, exams]);

  // 6. Real Per-Class Attendance & Assignment Submission Rates for Chart
  const classPerformanceChart = useMemo(() => {
    const classSet = new Set<string>();

    Object.keys(attendanceByClass).forEach((key) => {
      const normalized = normalizeClassKey(key);
      if (normalized && normalized !== 'All Classes') classSet.add(normalized);
    });
    assignments.forEach((asg) => {
      const normalized = normalizeClassKey(asg.classCode);
      if (normalized && normalized !== 'All Classes') classSet.add(normalized);
    });
    studentsDirectory.forEach((st) => {
      const normalized = normalizeClassKey(st.classCode);
      if (normalized && normalized !== 'All Classes') classSet.add(normalized);
    });

    const orderedClasses = Array.from(classSet).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );

    return orderedClasses.map((classKey) => {
      const bucket = attendanceByClass[classKey];
      const present = bucket?.attendance?.length || 0;
      const absent = bucket?.absences?.length || 0;
      const excuse = bucket?.excuse?.length || 0;
      const attTotal = present + absent + excuse;

      const classStudents = studentsDirectory.filter(
        (st) => normalizeClassKey(st.classCode) === classKey
      );

      let attendancePct = 0;
      let attendanceDetail = 'Belum ada catatan absensi';
      if (attTotal > 0) {
        attendancePct = Math.round((present / attTotal) * 100);
        attendanceDetail = `${present}/${attTotal} hadir (${absent} absen, ${excuse} izin)`;
      } else if (classStudents.length > 0) {
        attendancePct = Math.round(
          classStudents.reduce((sum, st) => sum + st.rate, 0) / classStudents.length
        );
        attendanceDetail = `Rata-rata direktori (${classStudents.length} crew)`;
      }

      const classAssignments = assignments.filter(
        (asg) => normalizeClassKey(asg.classCode) === classKey
      );

      let totalSubmitted = 0;
      let totalExpected = 0;
      classAssignments.forEach((asg) => {
        const subCount =
          asg.submissions.length > 0
            ? asg.submissions.filter((s) => s.status !== 'Pending').length
            : asg.submitted;
        const expected = Math.max(asg.total, asg.submissions.length);
        totalSubmitted += subCount;
        totalExpected += expected;
      });

      const submissionPct =
        totalExpected > 0 ? Math.min(100, Math.round((totalSubmitted / totalExpected) * 100)) : 0;
      const submissionDetail =
        totalExpected > 0
          ? `${totalSubmitted}/${totalExpected} dikumpulkan (${classAssignments.length} tugas)`
          : 'Belum ada tugas kelas ini';

      return {
        classKey,
        shortLabel: classKey.replace(/^Class\s+/i, 'Kls '),
        subject: resolveSubjectForClassKey(classKey, schedules),
        attendancePct,
        submissionPct,
        attendanceDetail,
        submissionDetail,
      };
    });
  }, [attendanceByClass, assignments, studentsDirectory, schedules]);

  // 7. Dynamic Priority Queue ("Perlu Tindakan")
  const attentionQueue = useMemo<AttentionQueueItem[]>(() => {
    const queue: AttentionQueueItem[] = [];

    if (gradingSummary.pendingSubmissions > 0) {
      queue.push({
        id: 'pending-grading',
        title: `Nilai ${gradingSummary.pendingSubmissions} jawaban tugas masuk`,
        subtitle: `Menunggu tinjauan di ${gradingSummary.tasksWithPending} tugas aktif`,
        metricLabel: `${gradingSummary.pendingSubmissions} perlu nilai`,
        iconBg: 'bg-[#FFF5E6]',
        icon: <Bookmark className="w-4 h-4 text-amber-600" />,
        onAction: () => setActivePage('assignments'),
      });
    }

    if (readinessSummary.incompletePlans.length > 0) {
      const mostUrgent = readinessSummary.incompletePlans[0];
      const remainingSteps = mostUrgent.checklist.filter((c) => !c.done).length;
      const otherCount = readinessSummary.incompletePlans.length - 1;
      queue.push({
        id: `prep-${mostUrgent.id}`,
        title: `Lengkapi persiapan: ${mostUrgent.topic}`,
        subtitle: `${mostUrgent.classCode} · ${mostUrgent.progress}% siap${
          remainingSteps > 0 ? ` · ${remainingSteps} poin tersisa` : ''
        }${otherCount > 0 ? ` · +${otherCount} modul lain` : ''}`,
        metricLabel: `${mostUrgent.progress}%`,
        iconBg: 'bg-[#FEF1F5]',
        icon: <BookOpen className="w-4 h-4 text-[#ee2e65]" />,
        onAction: () => setActivePage('prep'),
      });
    }

    if (attendanceSummary.absentCount > 0) {
      const topClass = attendanceSummary.absencesByClass[0];
      const otherClasses = Math.max(0, attendanceSummary.absencesByClass.length - 1);
      queue.push({
        id: 'attendance-absences',
        title: `Tinjau ${attendanceSummary.absentCount} catatan ketidakhadiran`,
        subtitle: `${topClass.classKey} (${topClass.count} absen)${
          otherClasses > 0 ? ` dan ${otherClasses} kelas lain` : ''
        }${attendanceSummary.excuseCount > 0 ? ` · ${attendanceSummary.excuseCount} izin` : ''}`,
        metricLabel: `${attendanceSummary.absentCount} absen`,
        iconBg: 'bg-[#E6F9F0]',
        icon: <UserX className="w-4 h-4 text-emerald-700" />,
        onAction: () => {
          setSelectedAttendanceClass(topClass.classKey);
          setActivePage('attendance');
        },
      });
    }

    if (belowMinAttendanceCrew.length > 0) {
      const lowest = belowMinAttendanceCrew[0];
      queue.push({
        id: 'low-attendance-crew',
        title: `${belowMinAttendanceCrew.length} crew di bawah batas kehadiran (${graduationRule.minAttendanceRatePct}%)`,
        subtitle: `Terendah: ${lowest.name} (${lowest.rate}% · ${lowest.classKey})`,
        metricLabel: `<${graduationRule.minAttendanceRatePct}%`,
        iconBg: 'bg-[#FFECEB]',
        icon: <AlertTriangle className="w-4 h-4 text-[#942922]" />,
        onAction: () => setActivePage('students'),
      });
    }

    return queue;
  }, [
    gradingSummary,
    readinessSummary,
    attendanceSummary,
    belowMinAttendanceCrew,
    graduationRule.minAttendanceRatePct,
    setActivePage,
    setSelectedAttendanceClass,
  ]);

  const SCHEDULE_PAGE_SIZE = 5;
  const [schedulePage, setSchedulePage] = useState(1);

  const weeklySchedules = useMemo(() => {
    return [...schedules].sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);
      if (dayDiff !== 0) return dayDiff;
      return a.startHour.localeCompare(b.startHour);
    });
  }, [schedules]);

  const totalSchedulePages = Math.max(1, Math.ceil(weeklySchedules.length / SCHEDULE_PAGE_SIZE));
  const safeSchedulePage = Math.min(schedulePage, totalSchedulePages);
  const scheduleStartIdx = (safeSchedulePage - 1) * SCHEDULE_PAGE_SIZE;
  const scheduleEndIdx = Math.min(scheduleStartIdx + SCHEDULE_PAGE_SIZE, weeklySchedules.length);
  const paginatedWeeklySchedules = useMemo(
    () => weeklySchedules.slice(scheduleStartIdx, scheduleEndIdx),
    [weeklySchedules, scheduleStartIdx, scheduleEndIdx]
  );

  const nextScheduledExam = upcomingExamItems[0];

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Unified 4-Column Live KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setActivePage('attendance')}
          className="p-4 sm:p-5 text-left bg-[#E6F9F0] hover:bg-[#DCF4E9] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#146C43]">
            <span>Kehadiran</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="kpi-value text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#0F5132] transition-colors">
            {attendanceSummary.rateFormatted}
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11.5px] text-[#35684E] tabular-nums">
            <span className="truncate">
              {attendanceSummary.totalCount > 0
                ? `${attendanceSummary.presentCount} / ${attendanceSummary.totalCount} hadir`
                : 'Belum ada absensi'}
            </span>
            <span className="font-semibold text-emerald-800 shrink-0">
              {attendanceSummary.totalCount > 0
                ? `${attendanceSummary.absentCount} absen`
                : `Min ${graduationRule.minAttendanceRatePct}%`}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('exams')}
          className="p-4 sm:p-5 text-left bg-[#F0EFFC] hover:bg-[#E6E4FA] transition-colors cursor-pointer group border-l border-black/[0.08] sm:border-l-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#3F3B99]">
            <span>Ujian Terjadwal</span>
            <FileCheck className="w-4 h-4 text-[#6C5DD3] shrink-0" />
          </div>
          <div className="kpi-value text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#3F3B99] transition-colors">
            {upcomingExamItems.length} Sesi
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11.5px] text-[#5854A8]">
            <span className="truncate">
              {nextScheduledExam ? `Berikutnya: ${nextScheduledExam.shortLabel}` : 'Belum ada ujian'}
            </span>
            <span className="font-semibold text-[#3F3B99] shrink-0 tabular-nums">
              {nextScheduledExam ? nextScheduledExam.metaLabel.split(' · ')[0] : 'Kosong'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('assignments')}
          className="p-4 sm:p-5 text-left bg-[#FFF5E6] hover:bg-[#FFEBD1] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C5811]">
            <span>Perlu Dinilai</span>
            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="kpi-value text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#704309] transition-colors">
            {gradingSummary.pendingSubmissions} Jawaban
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11.5px] text-[#7A592A] tabular-nums">
            <span className="truncate">
              {assignments.length > 0 ? `Dari ${assignments.length} tugas aktif` : 'Belum ada tugas'}
            </span>
            <span className="font-semibold text-amber-800 shrink-0">
              {gradingSummary.pendingSubmissions > 0 ? 'Tinjau' : 'Tuntas'}
            </span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('prep')}
          className="p-4 sm:p-5 text-left bg-[#FEF1F5] hover:bg-[#FCE6EE] transition-colors cursor-pointer group border-l border-black/[0.08] sm:border-l-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#9D113C]">
            <span>Kesiapan Kelas</span>
            <BookOpen className="w-4 h-4 text-[#ee2e65] shrink-0" />
          </div>
          <div className="kpi-value text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#9D113C] transition-colors">
            {readinessSummary.avgReadiness}%
          </div>
          <div className="flex items-center justify-between gap-2 mt-1.5 text-[11.5px] text-[#7D3A51] tabular-nums">
            <span className="truncate">
              {readinessSummary.readyPlans}/{readinessSummary.totalPlans} modul siap
            </span>
            <span className={`font-semibold shrink-0 ${readinessSummary.statusClass}`}>
              {readinessSummary.statusLabel}
            </span>
          </div>
        </button>
      </div>

      {/* Quick LiveQuiz Join Accordion for Students & Servolution Crew */}
      <LiveQuizJoinAccordion
        code={joinCode}
        name={joinName}
        onCodeChange={(val) => {
          setJoinError(null);
          setJoinCode(val);
        }}
        onNameChange={(val) => {
          setJoinError(null);
          setJoinName(val);
        }}
        onSubmit={handleOverviewJoinSubmit}
        onTestPreview={stashQuizzesForJoinTab}
        previewTabUrl={overviewPreviewTabUrl}
        errorMessage={joinError}
      />

      {/* Active Assignments (Autostart on Start Date & Auto-hide on End Date) */}
      <section className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.08] bg-[#FAFBFD] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#FEF1F5] text-[#9D113C] flex items-center justify-center shrink-0">
              <Bookmark className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#1C1D21]">
                Tugas Aktif
              </h2>
              <span className="text-[12px] font-semibold text-[#146C43] tabular-nums">
                · {activeOverviewAssignments.length} sedang berjalan
              </span>
            </div>
          </div>
        </div>

        {activeOverviewAssignments.length === 0 ? (
          <div className="px-5 py-6 text-center text-[12.5px] text-[#8A8D98]">
            Belum ada tugas yang aktif saat ini. Tugas terjadwal akan tampil otomatis di sini saat waktu mulai tiba.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-black/[0.06]">
            {activeOverviewAssignments.map((asg, index) => {
              const theme = PASTEL_THEMES[asg.theme] || PASTEL_THEMES.periwinkle;
              const qCount = asg.questions?.length || 0;
              const hasImageQ = Boolean(asg.questions?.some((q) => Boolean(q.imageUrl)));
              return (
                <button
                  key={asg.id}
                  type="button"
                  onClick={() => setActiveTakeAssignment(asg)}
                  className={`w-full p-4 sm:p-5 text-left hover:bg-[#FAFBFD] transition-colors cursor-pointer group flex items-center justify-between gap-3 ${
                    index >= 2 ? 'border-t border-black/[0.06]' : ''
                  }`}
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`font-semibold ${theme.text}`}>
                          {asg.classCode}
                        </span>
                        <span aria-hidden="true" className="text-[#B4B6C1]">·</span>
                        <span className="text-[#6E717A] truncate">
                          {asg.subject}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 text-[#146C43] text-[11px] font-semibold tabular-nums shrink-0">
                        <Clock className="w-3 h-3" />
                        {getRemainingScheduleLabel(asg, now)}
                      </span>
                    </div>

                    <h3 className="text-[14.5px] font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors leading-snug">
                      {asg.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#6E717A]">
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <FileQuestion className="w-3.5 h-3.5 text-[#8A8D98]" />
                        {qCount} Pertanyaan
                      </span>
                      {hasImageQ && (
                        <span className="inline-flex items-center gap-1 text-[#3F3B99] font-medium">
                          <ImageIcon className="w-3.5 h-3.5" />
                          Dengan Gambar
                        </span>
                      )}
                      {asg.startDate && asg.endDate && (
                        <span className="text-[11px] text-[#8A8D98] tabular-nums">
                          {formatScheduleDateLabel(asg.startDate)} → {formatScheduleDateLabel(asg.endDate)}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-[#B4B6C1] group-hover:text-[#9D113C] transition-colors shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* 12-Col Workspace */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-8 pt-1">
        {/* Left 7 Columns */}
        <div className="md:col-span-7 md:border-r md:border-black/[0.06] md:pr-6 lg:pr-8 space-y-7">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Jadwal Mingguan</h2>
              <button
                type="button"
                onClick={() => setActivePage('schedule')}
                className="text-[12.5px] font-semibold text-[#9D113C] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="sm:hidden">Jadwal</span>
                <span className="hidden sm:inline">Lihat Semua Jadwal</span>
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            <div className="border-t border-b border-black/[0.06] divide-y divide-black/[0.05]">
              {paginatedWeeklySchedules.length === 0 ? (
                <div className="py-6 text-center text-[12.5px] text-[#8A8D98]">
                  Belum ada jadwal mingguan yang tersedia.
                </div>
              ) : (
                paginatedWeeklySchedules.map((sch) => {
                  const theme = PASTEL_THEMES[sch.theme] || PASTEL_THEMES.periwinkle;
                  return (
                    <div
                      key={sch.id}
                      onClick={() => setActivePage('schedule')}
                      className="py-3 px-2 -mx-2 rounded-xl hover:bg-[#FAFBFD] transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${theme.dot}`} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-[11.5px] text-[#6E717A]">
                            <span className="font-semibold text-[#1C1D21]">{sch.day}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-semibold text-[#1C1D21] tabular-nums">
                              {sch.startHour} – {sch.endHour}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className={`font-semibold ${theme.text}`}>
                              {sch.classCode === 'All' ? 'Semua Kelas' : normalizeClassKey(sch.classCode)}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 shrink-0" /> {sch.room}
                            </span>
                          </div>
                          <h3 className="text-[14.5px] font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors truncate mt-0.5">
                            {sch.subject}
                          </h3>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="hidden sm:inline text-[12px] text-[#8A8D98] tabular-nums">
                          {sch.students} crew
                        </span>
                        <ChevronRight className="w-4 h-4 text-[#B4B6C1] group-hover:text-[#9D113C] transition-colors" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {weeklySchedules.length > 0 && (
              <div className="pt-3 flex items-center justify-between gap-3 text-[12px] text-[#6E717A]">
                <span className="tabular-nums">
                  Menampilkan {scheduleStartIdx + 1}–{scheduleEndIdx} dari {weeklySchedules.length} jadwal
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={safeSchedulePage <= 1}
                    onClick={() => setSchedulePage((p) => Math.max(1, p - 1))}
                    aria-label="Halaman jadwal sebelumnya"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 h-8 rounded-full border border-black/[0.08] bg-white text-[12px] font-semibold text-[#1C1D21] inline-flex items-center justify-center tabular-nums">
                    {safeSchedulePage} / {totalSchedulePages}
                  </span>
                  <button
                    type="button"
                    disabled={safeSchedulePage >= totalSchedulePages}
                    onClick={() => setSchedulePage((p) => Math.min(totalSchedulePages, p + 1))}
                    aria-label="Halaman jadwal berikutnya"
                    className="w-8 h-8 rounded-full border border-black/[0.08] bg-white hover:bg-[#FAFBFD] disabled:opacity-40 flex items-center justify-center text-[#6E717A] cursor-pointer disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Real Per-Class Attendance & Assignment Submission Bar Chart */}
          <section className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div className="flex items-center gap-2">
                <h3 className="text-[15.5px] font-semibold text-[#1C1D21]">
                  Kehadiran &amp; Pengumpulan Tugas per Kelas
                </h3>
                <InfoPopover
                  label="Informasi grafik kehadiran dan pengumpulan tugas per kelas"
                  content="Persentase dihitung langsung dari catatan absensi aktif dan rasio tugas yang sudah dikumpulkan pada tiap kelas. Klik kolom kelas untuk membuka detail absensi."
                />
              </div>
              <div className="flex items-center gap-4 text-[11.5px] font-medium text-[#5A5D67]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#6C5DD3]" /> Kehadiran
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#ee2e65]" /> Pengumpulan Tugas
                </span>
              </div>
            </div>

            {classPerformanceChart.length === 0 ? (
              <div className="py-10 px-4 rounded-2xl border border-black/[0.06] bg-[#FAFBFD] text-center text-[12.5px] text-[#8A8D98]">
                Belum ada data absensi maupun tugas per kelas pada batch ini.
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 sm:gap-5 px-2 pt-3 border-b border-black/[0.06]">
                {classPerformanceChart.map((item) => {
                  const attHeightPx = Math.max(6, Math.round((item.attendancePct / 100) * 124));
                  const subHeightPx = Math.max(6, Math.round((item.submissionPct / 100) * 124));
                  return (
                    <button
                      key={item.classKey}
                      type="button"
                      onClick={() => {
                        setSelectedAttendanceClass(item.classKey);
                        setActivePage('attendance');
                      }}
                      title={`${item.classKey} (${item.subject})\nKehadiran: ${item.attendancePct}% — ${item.attendanceDetail}\nPengumpulan Tugas: ${item.submissionPct}% — ${item.submissionDetail}`}
                      className="flex-1 min-w-0 flex flex-col items-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5DD3] rounded-t-xl pt-1"
                    >
                      <div className="w-full h-[150px] flex items-end justify-center gap-2 sm:gap-3">
                        {/* Attendance Bar + Direct Top Label */}
                        <div className="flex flex-col items-center justify-end h-full">
                          <span className="text-[10.5px] sm:text-[11px] font-semibold text-[#3F3B99] tabular-nums mb-1 leading-none">
                            {item.attendancePct}%
                          </span>
                          <div
                            style={{ height: `${attHeightPx}px` }}
                            className="w-5 sm:w-7 bg-[#6C5DD3] rounded-t-md transition-opacity duration-200 group-hover:opacity-85"
                          />
                        </div>

                        {/* Assignment Submission Bar + Direct Top Label */}
                        <div className="flex flex-col items-center justify-end h-full">
                          <span className="text-[10.5px] sm:text-[11px] font-semibold text-[#9D113C] tabular-nums mb-1 leading-none">
                            {item.submissionPct}%
                          </span>
                          <div
                            style={{ height: `${subHeightPx}px` }}
                            className="w-5 sm:w-7 bg-[#ee2e65] rounded-t-md transition-opacity duration-200 group-hover:opacity-85"
                          />
                        </div>
                      </div>

                      <div className="pb-2.5 text-center min-w-0 w-full">
                        <div className="text-[12px] font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors truncate">
                          {item.shortLabel}
                        </div>
                        <div className="text-[10.5px] text-[#8A8D98] truncate">
                          {item.subject}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right 5 Columns */}
        <div className="md:col-span-5 space-y-7">
          {/* Dynamic Priority Queue */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Perlu Tindakan</h2>
              <span
                className={`text-xs font-semibold tabular-nums ${
                  attentionQueue.length > 0 ? 'text-[#9D113C]' : 'text-[#146C43]'
                }`}
              >
                {attentionQueue.length > 0 ? `${attentionQueue.length} prioritas` : 'Semua tuntas'}
              </span>
            </div>

            {attentionQueue.length === 0 ? (
              <div className="border-t border-b border-black/[0.06] py-6 text-center space-y-1">
                <div className="text-[13.5px] font-semibold text-[#146C43]">
                  Tidak ada antrean prioritas
                </div>
                <p className="text-[12px] text-[#8A8D98]">
                  Seluruh penilaian tugas, persiapan modul, dan kehadiran crew berada dalam kondisi baik.
                </p>
              </div>
            ) : (
              <div className="border-t border-b border-black/[0.06] divide-y divide-black/[0.05]">
                {attentionQueue.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onAction}
                    className="w-full py-3 flex items-center justify-between gap-3 text-left cursor-pointer hover:bg-[#FAFBFD] -mx-2 px-2 rounded-xl transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span
                        className={`w-8 h-8 rounded-full ${item.iconBg} flex items-center justify-center shrink-0`}
                      >
                        {item.icon}
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#6E717A] truncate mt-0.5">
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11.5px] font-semibold text-[#5A5D67] tabular-nums whitespace-nowrap">
                        {item.metricLabel}
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#B4B6C1] group-hover:text-[#9D113C] shrink-0" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Live Upcoming Exams Preview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Ujian Mendatang</h2>
              <button
                type="button"
                onClick={() => setActivePage('exams')}
                className="text-xs font-semibold text-[#9D113C] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="sm:hidden">Semua</span>
                <span className="hidden sm:inline">Lihat semua</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>

            {upcomingExamItems.length === 0 ? (
              <div className="border-t border-b border-black/[0.06] py-6 text-center text-[12.5px] text-[#8A8D98]">
                Belum ada sesi ujian yang terjadwal pada batch ini.
              </div>
            ) : (
              <div className="border-t border-b border-black/[0.06] divide-y divide-black/[0.05]">
                {upcomingExamItems.slice(0, 6).map((item) => {
                  const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActivePage(item.targetPage)}
                      className="w-full py-3 px-2 -mx-2 rounded-xl cursor-pointer hover:bg-[#FAFBFD] transition-colors flex items-center justify-between gap-3 text-left group"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] transition-colors truncate">
                          {item.title}
                        </div>
                        <div className="text-xs text-[#6E717A] mt-0.5 truncate tabular-nums">
                          {item.subtitle}
                        </div>
                      </div>
                      <span className={`text-xs font-semibold ${theme.text} shrink-0 tabular-nums whitespace-nowrap`}>
                        {item.metaLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
