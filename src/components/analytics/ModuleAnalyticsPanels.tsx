import React from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import type {
  AssignmentAnalyticsSummary,
  AttendanceAnalyticsSummary,
  ExamAssessmentAnalyticsSummary,
  LiveQuizAnalyticsSummary,
} from '../../utils/moduleAnalytics';
import { InfoPopover } from '../ui/InfoPopover';

const InsightsStrip: React.FC<{
  title: string;
  insights: string[];
}> = ({ title, insights }) => {
  if (insights.length === 0) return null;
  return (
    <div className="rounded-2xl border border-black/[0.12] bg-[#FAFBFD] overflow-hidden">
      <div className="px-4 sm:px-5 py-3 border-b border-black/[0.08] flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-[#ee2e65] shrink-0" />
        <h3 className="text-[13.5px] font-semibold text-[#1C1D21]">{title}</h3>
      </div>
      <ul className="divide-y divide-black/[0.05]">
        {insights.map((line, idx) => (
          <li
            key={idx}
            className="px-4 sm:px-5 py-2.5 text-[12.5px] text-[#4B4E57] leading-relaxed flex items-start gap-2.5"
          >
            <span className="text-[11px] font-bold text-[#8A8D98] tabular-nums mt-0.5 shrink-0">
              {String(idx + 1).padStart(2, '0')}.
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// 1. ATTENDANCE RECORDS ANALYTICS PANEL
// ============================================================================

export const AttendanceAnalyticsPanel: React.FC<{
  data: AttendanceAnalyticsSummary;
  compact?: boolean;
}> = ({ data, compact = false }) => {
  return (
    <div className="space-y-5">
      {/* Unified 4-Column Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden bg-white">
        <div className="p-4 sm:p-5 bg-[#E6F9F0]/75">
          <div className="text-[12px] font-semibold text-[#146C43]">
            Kehadiran Efektif
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalStatusEntries > 0 ? `${data.effectiveAttendanceRatePct}%` : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#35684E] tabular-nums">
              Target ≥ {data.targetThresholdPct}%
            </span>
          </div>
          <p className="text-[11.5px] text-[#35684E] mt-1 tabular-nums">
            {data.totalStatusEntries === 0
              ? 'Belum ada catatan kehadiran'
              : `${data.presentCount} hadir · ${data.excuseCount} izin · ${data.absentCount} absen`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#F0EFFC]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#3F3B99]">
            Ketepatan Waktu &amp; QR
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.presentCount > 0 ? `${data.onTimeRateAmongPresentPct}%` : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#5854A8] tabular-nums">
              {data.qrCheckInCount} scan QR
            </span>
          </div>
          <p className="text-[11.5px] text-[#5854A8] mt-1 tabular-nums">
            {data.presentCount === 0
              ? 'Belum ada peserta tercatat hadir'
              : `${data.onTimeCount} tepat waktu · ${data.lateCount} terlambat`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <div className="text-[12px] font-semibold text-[#1C1D21]">
            Total Crew Terpantau
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalUniqueCrew}
            </span>
            <span className="text-[11.5px] font-medium text-[#146C43] tabular-nums">
              {data.eligibleCrewCount} memenuhi syarat
            </span>
          </div>
          <p className="text-[11.5px] text-[#6E717A] mt-1 tabular-nums">
            {data.byClass.length} kelas aktif · {data.totalStatusEntries} catatan
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#FEF1F5]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#9D113C]">
            Perlu Tindak Lanjut
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.atRiskCrewCount}
            </span>
            <span className="text-[11.5px] font-medium text-[#9D113C] tabular-nums">
              {data.absentCount} absen
            </span>
          </div>
          <p className="text-[11.5px] text-[#7D3A51] mt-1 tabular-nums">
            {data.atRiskCrewCount === 0
              ? 'Semua peserta di atas ambang minimal'
              : `${data.atRiskCrewCount} peserta di bawah batas ${data.targetThresholdPct}% / absen`}
          </p>
        </div>
      </div>

      {/* Analisa Ringkas */}
      <InsightsStrip
        title="Analisa All Attendance Records"
        insights={data.insights}
      />

      {!compact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Per-Class Attendance Breakdown */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.12] overflow-hidden self-start">
            <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                  Statistik Kehadiran per Kelas
                </h3>
                <InfoPopover
                  label="Informasi Statistik Kehadiran per Kelas"
                  content={`Perbandingan rate efektif terhadap ambang minimal ${data.targetThresholdPct}%.`}
                />
              </div>
              <span className="text-[12px] font-medium text-[#6E717A] tabular-nums">
                {data.byClass.length} Kelas
              </span>
            </div>

            {data.byClass.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[#8A8D98]">
                Belum ada data kelas absensi.
              </div>
            ) : (
              <div className="divide-y divide-black/[0.05]">
                {data.byClass.map((cls) => (
                  <div key={cls.classKey} className="px-5 py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[13px]">
                        <span className="font-semibold text-[#1C1D21]">
                          {cls.classKey}
                        </span>
                        <span className="text-[#8A8D98] text-[12px] tabular-nums">
                          · {cls.totalCrew} peserta
                        </span>
                        <span
                          className={`text-[11.5px] font-semibold ${
                            cls.meetsThreshold ? 'text-[#146C43]' : 'text-[#942922]'
                          }`}
                        >
                          · {cls.meetsThreshold ? 'Memenuhi Target' : 'Di Bawah Target'}
                        </span>
                      </div>
                      <span className="text-[13px] font-bold text-[#1C1D21] tabular-nums">
                        {cls.attendanceRatePct}%
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
                          cls.meetsThreshold ? 'bg-[#10B981]' : 'bg-[#ee2e65]'
                        }`}
                        style={{ width: `${Math.min(100, cls.attendanceRatePct)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#6E717A] tabular-nums">
                      <span>Hadir: {cls.presentCount}</span>
                      <span>·</span>
                      <span>Tepat Waktu: {cls.onTimeCount}</span>
                      <span>·</span>
                      <span>Late: {cls.lateCount}</span>
                      <span>·</span>
                      <span>Excuse: {cls.excuseCount}</span>
                      <span>·</span>
                      <span>Absent: {cls.absentCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* At-Risk Crew & Schedule Gaps */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#ee2e65] shrink-0" />
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Peserta Perlu Perhatian
                  </h3>
                </div>
                <span className="text-[12px] font-semibold text-[#9D113C] tabular-nums">
                  {data.atRiskCrew.length}
                </span>
              </div>

              {data.atRiskCrew.length === 0 ? (
                <div className="p-6 text-center text-[12.5px] text-[#146C43] font-medium">
                  Seluruh peserta berada dalam batas aman aturan kehadiran.
                </div>
              ) : (
                <div className="divide-y divide-black/[0.05] max-h-[290px] overflow-y-auto">
                  {data.atRiskCrew.map((item) => (
                    <div
                      key={item.key}
                      className="px-5 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ${item.color}`}
                        >
                          {item.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-[#1C1D21] truncate">
                            {item.name}
                          </div>
                          <div className="text-[11.5px] text-[#6E717A] truncate">
                            {item.classKey} · {item.reason}
                          </div>
                        </div>
                      </div>
                      <span className="text-[12.5px] font-bold text-[#942922] tabular-nums shrink-0">
                        {item.rate}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {data.missedSchedules.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#D97706] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Cakupan Sesi Jadwal
                    </h3>
                  </div>
                  <span className="text-[12px] text-[#6E717A] tabular-nums">
                    {data.missedSchedules.length} Sesi
                  </span>
                </div>
                <div className="divide-y divide-black/[0.05] max-h-[240px] overflow-y-auto">
                  {data.missedSchedules.slice(0, 6).map((sch) => (
                    <div
                      key={sch.scheduleId}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1C1D21] truncate">
                          {sch.subject}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] tabular-nums truncate">
                          {sch.day} {sch.timeRange} · {sch.classKey}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="font-bold text-[#1C1D21]">
                          {sch.attendancePct}%
                        </div>
                        <div className="text-[11px] text-[#8A8D98]">
                          {sch.attendedCount}/{sch.expectedCount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. RIWAYAT PENILAIAN UJIAN ANALYTICS PANEL
// ============================================================================

export const ExamAssessmentAnalyticsPanel: React.FC<{
  data: ExamAssessmentAnalyticsSummary;
  compact?: boolean;
}> = ({ data, compact = false }) => {
  return (
    <div className="space-y-5">
      {/* Unified 4-Column Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden bg-white">
        <div className="p-4 sm:p-5 bg-[#FEF1F5]/75">
          <div className="text-[12px] font-semibold text-[#9D113C]">
            Rata-Rata Nilai Ujian
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalAssessments > 0 ? data.meanScore : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#7D3A51] tabular-nums">
              Skala {data.scaleMax}
            </span>
          </div>
          <p className="text-[11.5px] text-[#7D3A51] mt-1 tabular-nums">
            {data.totalAssessments > 0
              ? `Median ${data.medianScore} · SD ${data.stdDev}`
              : 'Belum ada riwayat penilaian'}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#E6F9F0]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#146C43]">
            Tingkat Kelulusan (KKM {data.passingScore})
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalAssessments > 0 ? `${data.passRatePct}%` : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#35684E] tabular-nums">
              {data.passCount} lulus
            </span>
          </div>
          <p className="text-[11.5px] text-[#35684E] mt-1 tabular-nums">
            {data.totalAssessments === 0
              ? 'Belum ada peserta dinilai'
              : data.failCount === 0
              ? 'Seluruh penilaian memenuhi KKM'
              : `${data.failCount} perlu remedial (di bawah KKM)`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#F0EFFC]/75">
          <div className="text-[12px] font-semibold text-[#3F3B99]">
            Rentang Nilai
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalAssessments > 0
                ? `${data.lowestScore}–${data.highestScore}`
                : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#5854A8] tabular-nums">
              Min–Maks
            </span>
          </div>
          <p className="text-[11.5px] text-[#5854A8] mt-1 tabular-nums">
            {data.totalAssessments > 0
              ? `${data.byPosition.length} posisi diuji`
              : 'Menunggu data penilaian'}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#1C1D21]">
            Total Riwayat Penilaian
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalAssessments}
            </span>
            <span className="text-[11.5px] font-medium text-[#6E717A] tabular-nums">
              {data.uniqueExaminees} peserta unik
            </span>
          </div>
          <p className="text-[11.5px] text-[#6E717A] mt-1 tabular-nums">
            {data.bySubject.length > 0
              ? `${data.bySubject.length} mata pelajaran diuji`
              : 'Belum ada mata pelajaran dinilai'}
          </p>
        </div>
      </div>

      <InsightsStrip
        title="Analisa Riwayat Penilaian Ujian"
        insights={data.insights}
      />

      {!compact && data.totalAssessments > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7: Per Position & Grade Distribution */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Statistik per Posisi Ujian
                  </h3>
                  <InfoPopover
                    label="Informasi Statistik per Posisi Ujian"
                    content="Rata-rata skor terbobot dan rasio kelulusan tiap posisi yang diuji."
                  />
                </div>
                <span className="text-[12px] text-[#6E717A] tabular-nums">
                  {data.byPosition.length} Posisi
                </span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {data.byPosition.map((pos) => (
                  <div key={pos.positionId} className="px-5 py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="text-[13px] min-w-0">
                        <span className="font-semibold text-[#1C1D21]">
                          {pos.positionName}
                        </span>
                        <span className="text-[#8A8D98] text-[12px] tabular-nums">
                          {' '}
                          · {pos.count} penilaian · Lulus {pos.passRatePct}%
                        </span>
                      </div>
                      <span className="text-[13px] font-bold text-[#1C1D21] tabular-nums">
                        Avg {pos.meanScore}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${
                          pos.meanScore >= data.passingScore
                            ? 'bg-[#6C5DD3]'
                            : 'bg-[#ee2e65]'
                        }`}
                        style={{
                          width: `${Math.min(
                            100,
                            Math.round((pos.meanScore / Math.max(1, data.scaleMax)) * 100)
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="text-[11.5px] text-[#6E717A] tabular-nums">
                      Rentang: {pos.lowestScore}–{pos.highestScore} · Lulus {pos.passCount}/{pos.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08]">
                <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                  Distribusi Grade Penilaian
                </h3>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {data.gradeDistribution.map((band) => (
                  <div
                    key={band.grade}
                    className="px-5 py-3 flex items-center gap-4 text-[12.5px]"
                  >
                    <div className="w-36 shrink-0">
                      <span className="font-bold text-[#1C1D21]">Grade {band.grade}</span>
                      <span className="text-[#6E717A]"> · {band.label}</span>
                    </div>
                    <div className="flex-1 h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          band.passed ? 'bg-[#10B981]' : 'bg-[#ee2e65]'
                        }`}
                        style={{ width: `${band.pct}%` }}
                      />
                    </div>
                    <div className="w-24 text-right font-semibold text-[#1C1D21] tabular-nums shrink-0">
                      {band.count} ({band.pct}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right 5: Parameter Strength/Weakness & Top/Below KKM */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-[#6C5DD3] shrink-0" />
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Analisa Parameter Kompetensi
                  </h3>
                </div>
                <span className="text-[12px] text-[#6E717A] tabular-nums">
                  {data.parameterStats.length} Parameter
                </span>
              </div>
              <div className="divide-y divide-black/[0.05] max-h-[300px] overflow-y-auto">
                {data.parameterStats.map((ps) => (
                  <div
                    key={ps.label}
                    className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-[#1C1D21] truncate">
                        {ps.label}
                      </div>
                      <div className="text-[11.5px] text-[#6E717A] tabular-nums">
                        {ps.occurrences}x dinilai · {ps.belowKkmCount}x di bawah KKM
                      </div>
                    </div>
                    <span
                      className={`font-bold tabular-nums shrink-0 ${
                        ps.meanScore >= data.passingScore
                          ? 'text-[#146C43]'
                          : 'text-[#942922]'
                      }`}
                    >
                      {ps.meanScore}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {data.topExaminees.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-[#ee2e65] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Skor Ujian Tertinggi
                    </h3>
                  </div>
                  <span className="text-[12px] text-[#146C43] font-semibold">
                    Top {data.topExaminees.length}
                  </span>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.topExaminees.map((rec, idx) => (
                    <div
                      key={rec.id}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#1C1D21] truncate">
                          <span className="text-[#8A8D98] mr-1.5 tabular-nums">
                            #{idx + 1}
                          </span>
                          {rec.examineeName}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] truncate">
                          {rec.positionName} · {rec.subject}
                        </div>
                      </div>
                      <span className="font-bold text-[#1C1D21] tabular-nums shrink-0">
                        {rec.finalScore} ({rec.grade})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. LAPORAN KESELURUHAN ASSIGNMENT ANALYTICS PANEL
// ============================================================================

export const AssignmentAnalyticsPanel: React.FC<{
  data: AssignmentAnalyticsSummary;
  compact?: boolean;
}> = ({ data, compact = false }) => {
  return (
    <div className="space-y-5">
      {/* Unified 4-Column Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden bg-white">
        <div className="p-4 sm:p-5 bg-[#F0EFFC]/75">
          <div className="text-[12px] font-semibold text-[#3F3B99]">
            Tingkat Pengumpulan
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalExpectedSubmissions > 0 ? `${data.submissionRatePct}%` : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#5854A8] tabular-nums">
              {data.totalSubmitted}/{data.totalExpectedSubmissions}
            </span>
          </div>
          <p className="text-[11.5px] text-[#5854A8] mt-1 tabular-nums">
            {data.totalAssignments === 0
              ? 'Belum ada tugas aktif'
              : `${data.totalAssignments} tugas (${data.activeCount} aktif · ${data.completedCount} selesai)`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#E6F9F0]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#146C43]">
            Rata-Rata Nilai Tugas
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.gradedCount > 0 ? data.meanScore : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#35684E] tabular-nums">
              Median {data.gradedCount > 0 ? data.medianScore : '—'}
            </span>
          </div>
          <p className="text-[11.5px] text-[#35684E] mt-1 tabular-nums">
            {data.gradedCount > 0
              ? `Rentang ${data.lowestScore}–${data.highestScore} (${data.gradedCount} dinilai)`
              : 'Belum ada jawaban yang dinilai'}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#FFF5E6]/75">
          <div className="text-[12px] font-semibold text-[#8C5811]">
            Antrean Pemeriksaan
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.needsReviewCount}
            </span>
            <span className="text-[11.5px] font-medium text-[#8C5811] tabular-nums">
              {data.needsGradingCount} tugas
            </span>
          </div>
          <p className="text-[11.5px] text-[#8C5811] mt-1 tabular-nums">
            {data.needsReviewCount === 0
              ? 'Semua jawaban masuk sudah dinilai'
              : `Menunggu pemeriksaan di ${data.needsGradingCount} tugas`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#FEF1F5]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#9D113C]">
            Belum Mengumpulkan
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.pendingCount}
            </span>
            <span className="text-[11.5px] font-medium text-[#9D113C] tabular-nums">
              {data.runningPhaseCount} berjalan
            </span>
          </div>
          <p className="text-[11.5px] text-[#7D3A51] mt-1 tabular-nums">
            {data.totalAssignments === 0
              ? 'Belum ada jadwal tugas'
              : `${data.scheduledPhaseCount} terjadwal · ${data.endedPhaseCount} berakhir`}
          </p>
        </div>
      </div>

      <InsightsStrip
        title="Analisa Laporan Keseluruhan Assignment"
        insights={data.insights}
      />

      {!compact && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7: Per-Assignment Performance Table */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-black/[0.12] overflow-hidden self-start">
            <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                  Rekap Statistik per Assignment
                </h3>
                <InfoPopover
                  label="Informasi Rekap Statistik per Assignment"
                  content="Rasio pengumpulan, antrean review, dan rata-rata nilai tiap tugas."
                />
              </div>
              <span className="text-[12px] text-[#6E717A] tabular-nums">
                {data.perAssignment.length} Tugas
              </span>
            </div>

            {data.perAssignment.length === 0 ? (
              <div className="p-8 text-center text-[13px] text-[#8A8D98]">
                Belum ada tugas yang tercatat.
              </div>
            ) : (
              <div className="divide-y divide-black/[0.05]">
                {data.perAssignment.map((item) => (
                  <div key={item.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-[#1C1D21] truncate">
                          {item.title}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] truncate">
                          {item.classCode} · {item.subject} · {item.effectiveStatus}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-[13px] font-bold text-[#1C1D21]">
                          {item.submissionRatePct}% terkumpul
                        </div>
                        <div className="text-[11.5px] text-[#6E717A]">
                          Avg:{' '}
                          {item.meanGradedScore !== null
                            ? `${item.meanGradedScore}/100`
                            : 'Belum dinilai'}
                        </div>
                      </div>
                    </div>

                    <div className="w-full h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6C5DD3] rounded-full transition-all duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                        style={{ width: `${Math.min(100, item.submissionRatePct)}%` }}
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#6E717A] tabular-nums">
                      <span>
                        Masuk: {item.submitted}/{item.total}
                      </span>
                      <span>·</span>
                      <span className="text-[#146C43] font-medium">
                        Dinilai: {item.gradedCount}
                      </span>
                      <span>·</span>
                      <span className="text-[#8C5811] font-medium">
                        Needs Review: {item.needsReviewCount}
                      </span>
                      <span>·</span>
                      <span>Pending: {item.pendingCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right 5: Score Distribution + Top Students + Pending */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-[#6C5DD3] shrink-0" />
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Sebaran Nilai Assignment
                  </h3>
                </div>
                <span className="text-[12px] text-[#6E717A] tabular-nums">
                  {data.gradedCount} dinilai
                </span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {data.scoreBands.map((band) => (
                  <div
                    key={band.label}
                    className="px-5 py-3 flex items-center gap-3 text-[12.5px]"
                  >
                    <span className="w-36 shrink-0 font-medium text-[#1C1D21]">
                      {band.label}
                    </span>
                    <div className="flex-1 h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${band.color}`}
                        style={{ width: `${band.pct}%` }}
                      />
                    </div>
                    <span className="w-20 text-right font-semibold text-[#1C1D21] tabular-nums shrink-0">
                      {band.count} ({band.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {data.topStudents.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpenCheck className="w-4 h-4 text-[#10B981] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Performa Siswa Terbaik (Assignment)
                    </h3>
                  </div>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.topStudents.map((st) => (
                    <div
                      key={st.name}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-[10.5px] font-bold shrink-0 ${st.color}`}
                        >
                          {st.initials}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1C1D21] truncate">
                            {st.name}
                          </div>
                          <div className="text-[11.5px] text-[#6E717A] truncate">
                            {st.classCodes.join(', ')} · {st.gradedCount} tugas dinilai
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-[#146C43] tabular-nums shrink-0">
                        {st.avgScore}/100
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.byClass.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08]">
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Ringkasan Assignment per Kelas
                  </h3>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.byClass.map((cls) => (
                    <div
                      key={cls.classKey}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px] tabular-nums"
                    >
                      <div>
                        <div className="font-semibold text-[#1C1D21]">
                          {cls.classKey}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A]">
                          {cls.assignmentCount} tugas · {cls.submitted}/{cls.totalExpected} masuk
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-[#1C1D21]">
                          {cls.meanScore !== null ? `Avg ${cls.meanScore}` : '—'}
                        </div>
                        <div className="text-[11px] text-[#8A8D98]">
                          {cls.submissionRatePct}% terkumpul
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 4. LAPORAN KESELURUHAN LIVEQUIZ ANALYTICS PANEL
// ============================================================================

export const LiveQuizAnalyticsPanel: React.FC<{
  data: LiveQuizAnalyticsSummary;
  compact?: boolean;
}> = ({ data, compact = false }) => {
  return (
    <div className="space-y-5">
      {/* Unified 4-Column Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.08] border border-black/[0.12] rounded-2xl overflow-hidden bg-white">
        <div className="p-4 sm:p-5 bg-[#E6F9F0]/75">
          <div className="text-[12px] font-semibold text-[#146C43]">
            Rata-Rata Akurasi Sesi
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalSessions > 0 ? `${data.overallAvgAccuracyPct}%` : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#35684E] tabular-nums">
              {data.totalSessions} sesi
            </span>
          </div>
          <p className="text-[11.5px] text-[#35684E] mt-1 tabular-nums">
            {data.totalSessions === 0
              ? 'Belum ada sesi kuis selesai'
              : `${data.classicSessionsCount} Classic · ${data.testSessionsCount} Test Mode`}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#F0EFFC]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#3F3B99]">
            Partisipasi &amp; Skor Rata-Rata
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalSessions > 0
                ? data.meanParticipantScore.toLocaleString('id-ID')
                : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#5854A8] tabular-nums">
              {data.uniqueParticipants} peserta unik
            </span>
          </div>
          <p className="text-[11.5px] text-[#5854A8] mt-1 tabular-nums">
            {data.totalSessions > 0
              ? `Puncak ${data.highestParticipantScore.toLocaleString('id-ID')} · Rata-rata streak ${data.avgBestStreak}x`
              : 'Menunggu partisipasi sesi'}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-white">
          <div className="text-[12px] font-semibold text-[#1C1D21]">
            Bank Kuis &amp; Soal
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.totalQuizzesInLibrary}
            </span>
            <span className="text-[11.5px] font-medium text-[#6E717A] tabular-nums">
              {data.totalQuestionsInLibrary} soal
            </span>
          </div>
          <p className="text-[11.5px] text-[#6E717A] mt-1 tabular-nums">
            {data.totalParticipantEntries > 0
              ? `${data.totalParticipantEntries} total keikutsertaan`
              : 'Siap dijalankan ke kelas'}
          </p>
        </div>

        <div className="p-4 sm:p-5 bg-[#FEF1F5]/75 border-l border-black/[0.08] sm:border-l-0">
          <div className="text-[12px] font-semibold text-[#9D113C]">
            Integritas Test Mode
          </div>
          <div className="flex items-baseline justify-between gap-2 mt-1.5">
            <span className="kpi-value text-[24px] font-bold text-[#1C1D21] tabular-nums">
              {data.testSessionsCount > 0 ? data.totalTabSwitches : '—'}
            </span>
            <span className="text-[11.5px] font-medium text-[#9D113C] tabular-nums">
              {data.testSessionsCount > 0 ? 'pindah tab' : '0 sesi'}
            </span>
          </div>
          <p className="text-[11.5px] text-[#7D3A51] mt-1 tabular-nums">
            {data.testSessionsCount === 0
              ? 'Belum ada sesi Test Mode'
              : data.totalTabSwitches === 0
              ? 'Tidak ada perpindahan tab terdeteksi'
              : `Tercatat di ${data.testSessionsCount} sesi Test Mode`}
          </p>
        </div>
      </div>

      <InsightsStrip
        title="Analisa Laporan Keseluruhan LiveQuiz"
        insights={data.insights}
      />

      {!compact && data.totalSessions > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left 7: Session Breakdown & Question Difficulty */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
              <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#ee2e65] shrink-0" />
                  <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                    Statistik per Sesi LiveQuiz
                  </h3>
                </div>
                <span className="text-[12px] text-[#6E717A] tabular-nums">
                  {data.sessions.length} Sesi
                </span>
              </div>
              <div className="divide-y divide-black/[0.05]">
                {data.sessions.map((s) => (
                  <div key={s.id} className="px-5 py-3.5 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold text-[#1C1D21] truncate">
                          {s.quizTitle}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] tabular-nums">
                          {s.mode === 'classic' ? 'Classic' : 'Test Mode'} · Room {s.code} · {s.endedAt}
                        </div>
                      </div>
                      <div className="text-right shrink-0 tabular-nums">
                        <div className="text-[13px] font-bold text-[#146C43]">
                          Akurasi {s.avgAccuracyPct}%
                        </div>
                        <div className="text-[11.5px] text-[#6E717A]">
                          Avg {s.avgScore.toLocaleString('id-ID')} poin
                        </div>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#10B981] rounded-full transition-all duration-[260ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                        style={{ width: `${Math.min(100, s.avgAccuracyPct)}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11.5px] text-[#6E717A] tabular-nums">
                      <span>{s.participantCount} peserta</span>
                      <span>·</span>
                      <span>{s.totalQuestions} soal</span>
                      <span>·</span>
                      <span>Top: {s.topScorer}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.hardestQuestions.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#D97706] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Analisa Tingkat Kesulitan Soal
                    </h3>
                  </div>
                  <span className="text-[12px] text-[#6E717A]">
                    Akurasi Terendah → Tertinggi
                  </span>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.hardestQuestions.map((q) => (
                    <div
                      key={q.questionId}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-[#1C1D21] truncate">
                          {q.prompt}
                        </div>
                        <div className="text-[11.5px] text-[#6E717A] tabular-nums">
                          {q.quizTitle} · {q.correctAttempts}/{q.totalAttempts} benar
                        </div>
                      </div>
                      <span
                        className={`font-bold tabular-nums shrink-0 ${
                          q.accuracyPct >= 75
                            ? 'text-[#146C43]'
                            : q.accuracyPct >= 50
                              ? 'text-[#8C5811]'
                              : 'text-[#942922]'
                        }`}
                      >
                        {q.accuracyPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right 5: Cumulative Leaderboard & Question Type Stats */}
          <div className="lg:col-span-5 space-y-6">
            {data.leaderboard.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-[#6C5DD3] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Klasemen Kumulatif Peserta
                    </h3>
                  </div>
                  <span className="text-[12px] text-[#6E717A] tabular-nums">
                    {data.leaderboard.length} Peserta
                  </span>
                </div>
                <div className="divide-y divide-black/[0.05] max-h-[320px] overflow-y-auto">
                  {data.leaderboard.map((p, idx) => (
                    <div
                      key={p.name}
                      className="px-5 py-3 flex items-center justify-between gap-3 text-[12.5px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[11.5px] font-bold text-[#8A8D98] w-5 tabular-nums shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <div className="font-semibold text-[#1C1D21] truncate">
                            {p.name}
                          </div>
                          <div className="text-[11.5px] text-[#6E717A] tabular-nums">
                            {p.sessionsPlayed} sesi · Akurasi {p.avgAccuracyPct}% · Streak {p.bestStreak}x
                          </div>
                        </div>
                      </div>
                      <span className="font-bold text-[#1C1D21] tabular-nums shrink-0">
                        {p.totalScore.toLocaleString('id-ID')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.questionTypeStats.length > 0 && (
              <div className="bg-white rounded-2xl border border-black/[0.12] overflow-hidden">
                <div className="px-5 py-4 border-b border-black/[0.08] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0" />
                    <h3 className="text-[15px] font-semibold text-[#1C1D21]">
                      Akurasi per Tipe Soal
                    </h3>
                  </div>
                </div>
                <div className="divide-y divide-black/[0.05]">
                  {data.questionTypeStats.map((qt) => (
                    <div
                      key={qt.type}
                      className="px-5 py-3 flex items-center gap-3 text-[12.5px]"
                    >
                      <div className="w-32 shrink-0">
                        <div className="font-semibold text-[#1C1D21]">{qt.label}</div>
                        <div className="text-[11px] text-[#8A8D98] tabular-nums">
                          {qt.count} butir soal
                        </div>
                      </div>
                      <div className="flex-1 h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#6C5DD3] rounded-full"
                          style={{ width: `${qt.avgAccuracyPct}%` }}
                        />
                      </div>
                      <span className="w-14 text-right font-bold text-[#1C1D21] tabular-nums shrink-0">
                        {qt.avgAccuracyPct}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
