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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PASTEL_THEMES } from '../../constants/theme';
import { UPCOMING_EXAMS } from '../../data/mockData';
import {
  formatScheduleDateLabel,
  getAssignmentSchedulePhase,
  getEffectiveAssignmentStatus,
  getRemainingScheduleLabel,
} from '../../utils/assignmentSchedule';
import { LiveQuizJoinAccordion } from '../livequiz/LiveQuizJoinAccordion';

export const OverviewPage: React.FC = () => {
  const {
    setActivePage,
    exams,
    assignments,
    lessonPlans,
    schedules,
    setActiveTakeAssignment,
    setPendingLiveQuizJoin,
    triggerToast,
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
  const [isJoining, setIsJoining] = useState(false);

  const handleOverviewJoinSubmit = async (e: React.FormEvent) => {
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

    setJoinError(null);
    setIsJoining(true);
    try {
      const res = await fetch(`/api/livequiz/room/${cleanCode}`);
      if (!res.ok) {
        setJoinError(`Ruangan dengan kode ${cleanCode} tidak ditemukan.`);
        return;
      }
      const summary = await res.json();
      if (summary.status === 'ended') {
        setJoinError('Sesi LiveQuiz ini sudah berakhir.');
        return;
      }
      setPendingLiveQuizJoin({ code: cleanCode, name: joinName.trim() });
      setActivePage('livequiz');
    } catch {
      triggerToast('Koneksi Bermasalah', 'Gagal memeriksa kode ruangan. Coba lagi.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const pendingGradingCount = assignments.reduce(
    (acc, a) => acc + a.submissions.filter((s) => s.status === 'Needs Review').length,
    0
  );

  const avgReadiness = Math.round(
    lessonPlans.reduce((a, b) => a + b.progress, 0) / (lessonPlans.length || 1)
  );

  const SCHEDULE_PAGE_SIZE = 5;
  const [schedulePage, setSchedulePage] = useState(1);

  const weeklySchedules = useMemo(() => {
    const dayOrder: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
    return [...schedules].sort((a, b) => {
      const dayDiff = (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99);
      if (dayDiff !== 0) return dayDiff;
      return a.startHour.localeCompare(b.startHour);
    });
  }, [schedules]);

  const scheduleExamCount = useMemo(
    () => schedules.filter((sch) => sch.type.trim().toLowerCase() === 'exam').length,
    [schedules]
  );

  const upcomingExamItems = useMemo(() => {
    const dayOrder: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5 };
    const fromSchedules = [...schedules]
      .filter((sch) => sch.type.trim().toLowerCase() === 'exam')
      .sort((a, b) => {
        const dayDiff = (dayOrder[a.day] ?? 99) - (dayOrder[b.day] ?? 99);
        if (dayDiff !== 0) return dayDiff;
        return a.startHour.localeCompare(b.startHour);
      })
      .map((sch) => {
        const cleanClass = sch.classCode === 'All' ? 'All Classes' : `Class ${sch.classCode.replace(/^Class\s+/i, '')}`;
        return {
          id: `sch-${sch.id}`,
          title: sch.subject,
          subtitle: `${cleanClass} · ${sch.day}, ${sch.date} Feb · ${sch.startHour} → ${sch.endHour}`,
          badge: `Exam · ${sch.day}`,
          theme: sch.theme,
          targetPage: 'schedule' as const,
        };
      });

    const fromStatic = UPCOMING_EXAMS.map((item) => ({
      id: `exam-${item.id}`,
      title: item.title,
      subtitle: `Class ${item.classCode} · ${item.dateStr}`,
      badge: item.daysLeft,
      theme: item.theme,
      targetPage: 'exams' as const,
    }));

    return [...fromSchedules, ...fromStatic];
  }, [schedules]);

  const totalSchedulePages = Math.max(1, Math.ceil(weeklySchedules.length / SCHEDULE_PAGE_SIZE));
  const safeSchedulePage = Math.min(schedulePage, totalSchedulePages);
  const scheduleStartIdx = (safeSchedulePage - 1) * SCHEDULE_PAGE_SIZE;
  const scheduleEndIdx = Math.min(scheduleStartIdx + SCHEDULE_PAGE_SIZE, weeklySchedules.length);
  const paginatedWeeklySchedules = useMemo(
    () => weeklySchedules.slice(scheduleStartIdx, scheduleEndIdx),
    [weeklySchedules, scheduleStartIdx, scheduleEndIdx]
  );

  return (
    <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6">
      {/* Top Greeting Header (Tablet & PC; Mobile displays profile greeting in Header) */}
      <div className="hidden md:flex items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <span className="block text-xs font-medium text-gray-600">
            Welcome
          </span>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900 mt-0.5">
            Rasengan
          </h1>
        </div>
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
        errorMessage={joinError}
        isSubmitting={isJoining}
      />

      {/* Unified 4-Column Metric Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] border border-black/[0.06] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setActivePage('attendance')}
          className="p-4 sm:p-5 text-left bg-[#E6F9F0] hover:bg-[#DCF4E9] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#146C43]">
            <span>Daily Attendance</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#0F5132] transition-colors">
            95.8%
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[#35684E]">
            <span>83 / 87 Present</span>
            <span className="font-semibold text-emerald-700">+1.4%</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('exams')}
          className="p-4 sm:p-5 text-left bg-[#F0EFFC] hover:bg-[#E6E4FA] transition-colors cursor-pointer group border-l border-black/[0.06] sm:border-l-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#3F3B99]">
            <span>Upcoming Exams</span>
            <FileCheck className="w-4 h-4 text-[#6C5DD3] shrink-0" />
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#3F3B99] transition-colors">
            {exams.length + scheduleExamCount} Scheduled
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[#5854A8]">
            <span>Next: Math 302</span>
            <span className="font-semibold text-[#3F3B99]">Feb</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('assignments')}
          className="p-4 sm:p-5 text-left bg-[#FFF5E6] hover:bg-[#FFEBD1] transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C5811]">
            <span>Pending Grading</span>
            <Bookmark className="w-4 h-4 text-amber-600 shrink-0" />
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#704309] transition-colors">
            {pendingGradingCount} Items
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[#7A592A]">
            <span>Across {assignments.length} tasks</span>
            <span className="font-semibold text-amber-700">Review</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActivePage('prep')}
          className="p-4 sm:p-5 text-left bg-[#FEF1F5] hover:bg-[#FCE6EE] transition-colors cursor-pointer group border-l border-black/[0.06] sm:border-l-0"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-[#9D113C]">
            <span>Lesson Readiness</span>
            <BookOpen className="w-4 h-4 text-[#ee2e65] shrink-0" />
          </div>
          <div className="text-2xl sm:text-[28px] font-bold text-[#1C1D21] mt-2 tabular-nums group-hover:text-[#9D113C] transition-colors">
            {avgReadiness}%
          </div>
          <div className="flex items-center justify-between mt-1.5 text-[11.5px] text-[#7D3A51]">
            <span>
              {lessonPlans.filter((p) => p.status === 'Ready').length}/{lessonPlans.length} Ready
            </span>
            <span className="font-semibold text-emerald-700">On Track</span>
          </div>
        </button>
      </div>

      {/* Active Assignments (Autostart on Start Date & Auto-hide on End Date) */}
      <section className="bg-white rounded-2xl border border-black/[0.07] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-black/[0.06] bg-[#FAFBFD] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-full bg-[#FEF1F5] text-[#9D113C] flex items-center justify-center shrink-0">
              <Bookmark className="w-3.5 h-3.5" />
            </span>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-[#1C1D21]">
                Tugas Aktif
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[10.5px] font-bold tabular-nums">
                {activeOverviewAssignments.length} Sedang Berjalan
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
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${theme.bg} ${theme.text}`}
                        >
                          {asg.classCode}
                        </span>
                        <span className="text-[11.5px] text-[#6E717A] truncate">
                          {asg.subject}
                        </span>
                      </div>

                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E6F9F0] text-[#146C43] text-[10.5px] font-semibold tabular-nums shrink-0">
                        <Clock className="w-3 h-3" />
                        {getRemainingScheduleLabel(asg, now)}
                      </span>
                    </div>

                    <h3 className="text-[14.5px] font-semibold text-[#1C1D21] group-hover:text-[#9D113C] transition-colors leading-snug">
                      {asg.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#6E717A]">
                      <span className="inline-flex items-center gap-1">
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
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Weekly Schedule</h2>
              <button
                onClick={() => setActivePage('schedule')}
                className="text-[12.5px] font-semibold text-[#9D113C] hover:underline flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="sm:hidden">Timetable</span>
                <span className="hidden sm:inline">Full Timetable</span>
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
                          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[#6E717A]">
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-[#1C1D21] font-semibold text-[10.5px]">
                              {sch.day}
                            </span>
                            <span className="font-semibold text-[#1C1D21] tabular-nums">
                              {sch.startHour} – {sch.endHour}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${theme.bg} ${theme.text}`}>
                              {sch.classCode === 'All' ? 'All Classes' : `Class ${sch.classCode}`}
                            </span>
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
                          {sch.students} students
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

          {/* Weekly Attendance & Submission Chart */}
          <section className="pt-2">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
              <div>
                <h3 className="text-[15.5px] font-semibold text-[#1C1D21]">Weekly attendance and submissions</h3>
                <p className="text-[12px] text-[#8A8D98]">Comparison across active classes (Mon – Fri)</p>
              </div>
              <div className="flex items-center gap-4 text-[11.5px] font-medium text-[#5A5D67]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#6C5DD3]" /> Attendance
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ee2e65]" /> Assignments
                </span>
              </div>
            </div>

            <div className="h-44 flex items-end justify-between gap-4 px-2 pt-4 border-b border-black/[0.06]">
              {[
                { day: 'Mon', att: '96%', sub: '88%' },
                { day: 'Tue', att: '94%', sub: '91%' },
                { day: 'Wed', att: '98%', sub: '85%' },
                { day: 'Thu', att: '95%', sub: '92%' },
                { day: 'Fri', att: '92%', sub: '94%' },
              ].map((item) => (
                <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full">
                  <div className="w-full flex-1 flex items-end justify-center gap-1.5">
                    <div
                      style={{ height: item.att }}
                      title={`Attendance: ${item.att}`}
                      className="w-3.5 sm:w-5 bg-[#6C5DD3] rounded-t-md transition-all duration-300 hover:opacity-80"
                    />
                    <div
                      style={{ height: item.sub }}
                      title={`Submissions: ${item.sub}`}
                      className="w-3.5 sm:w-5 bg-[#ee2e65] rounded-t-md transition-all duration-300 hover:opacity-85"
                    />
                  </div>
                  <span className="text-[11.5px] font-medium text-[#6E717A] pb-2">{item.day}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right 5 Columns */}
        <div className="md:col-span-5 space-y-7">
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Needs attention</h2>
              <span className="text-xs font-semibold text-[#9D113C]">3 pending</span>
            </div>

            <div className="border-t border-b border-black/[0.06] divide-y divide-black/[0.05]">
              <div
                onClick={() => setActivePage('assignments')}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAFBFD] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#FFF5E6] flex items-center justify-center shrink-0">
                    <Bookmark className="w-4 h-4 text-amber-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] truncate">
                      Periksa &amp; Nilai Tugas Masuk
                    </div>
                    <div className="text-xs text-[#8A8D98]">
                      {pendingGradingCount} pengumpulan menunggu penilaian admin
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
              </div>

              <div
                onClick={() => setActivePage('prep')}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAFBFD] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#FEF1F5] flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-[#ee2e65]" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] truncate">
                      Complete Gouache Prep Checklist
                    </div>
                    <div className="text-xs text-[#8A8D98]">Class 304 · 33% ready</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
              </div>

              <div
                onClick={() => setActivePage('attendance')}
                className="py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#FAFBFD] -mx-2 px-2 rounded-xl transition-colors group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-full bg-[#E6F9F0] flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-emerald-600" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] truncate">
                      Verify Class 302 Absence Notes
                    </div>
                    <div className="text-xs text-[#8A8D98]">4 students marked absent this week</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#B4B6C1] shrink-0" />
              </div>
            </div>
          </section>

          {/* Upcoming Exams Preview */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[16px] font-semibold text-[#1C1D21]">Upcoming Exams</h2>
              <button
                onClick={() => setActivePage('exams')}
                className="text-xs font-semibold text-[#9D113C] hover:underline inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="sm:hidden">All</span>
                <span className="hidden sm:inline">See all</span>
                <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
            <div className="border-t border-b border-black/[0.06] divide-y divide-black/[0.05]">
              {upcomingExamItems.map((item) => {
                const theme = PASTEL_THEMES[item.theme] || PASTEL_THEMES.periwinkle;
                return (
                  <div
                    key={item.id}
                    onClick={() => setActivePage(item.targetPage)}
                    className="py-3 px-2 -mx-2 rounded-xl cursor-pointer hover:bg-[#FAFBFD] transition-colors flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[#1C1D21] group-hover:text-[#9D113C] truncate">
                        {item.title}
                      </div>
                      <div className="text-xs text-[#8A8D98] mt-0.5 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <span className={`text-xs font-semibold ${theme.text} ${theme.bg} px-2.5 py-1 rounded-full shrink-0 tabular-nums`}>
                      {item.badge}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
