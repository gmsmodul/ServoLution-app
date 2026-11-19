import {
  Assignment,
  AttendanceGraduationRule,
  ClassAttendanceData,
  ExamAssessmentRecord,
  ExamGradingRule,
  LiveQuiz,
  LiveQuizSessionReport,
  QrAttendanceCheckInRecord,
  ScheduleItem,
  StudentDirectoryItem,
} from '../types';
import {
  getAssignmentSchedulePhase,
  getEffectiveAssignmentStatus,
} from './assignmentSchedule';
import { normalizeClassKey, resolveClassKeyForSubject } from './scheduleSubjects';

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

function calcMedian(nums: number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round1((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return round1(sorted[mid]);
}

function calcStdDev(nums: number[], mean: number): number {
  if (nums.length <= 1) return 0;
  const variance =
    nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
  return round1(Math.sqrt(variance));
}

// ============================================================================
// 1. ALL ATTENDANCE RECORDS ANALYTICS
// ============================================================================

export interface AttendanceClassSummary {
  classKey: string;
  totalCrew: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  excuseCount: number;
  qrCount: number;
  rosterCount: number;
  attendanceRatePct: number;
  meetsThreshold: boolean;
}

export interface AttendanceMissedScheduleStat {
  scheduleId: string;
  day: string;
  timeRange: string;
  classKey: string;
  subject: string;
  room: string;
  expectedCount: number;
  attendedCount: number;
  missedCount: number;
  attendancePct: number;
}

export interface AttendanceAtRiskItem {
  key: string;
  name: string;
  initials: string;
  color: string;
  classKey: string;
  status: 'On Time' | 'Late' | 'Absent' | 'Excuse' | 'Present';
  rate: number;
  reason: string;
}

export interface AttendanceAnalyticsSummary {
  totalUniqueCrew: number;
  totalStatusEntries: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  excuseCount: number;
  qrCheckInCount: number;
  rosterCheckInCount: number;
  rawAttendanceRatePct: number;
  effectiveAttendanceRatePct: number;
  onTimeRateAmongPresentPct: number;
  targetThresholdPct: number;
  eligibleCrewCount: number;
  atRiskCrewCount: number;
  byClass: AttendanceClassSummary[];
  missedSchedules: AttendanceMissedScheduleStat[];
  atRiskCrew: AttendanceAtRiskItem[];
  insights: string[];
}

export function computeAttendanceAnalytics(params: {
  attendanceByClass: Record<string, ClassAttendanceData>;
  qrCheckIns: QrAttendanceCheckInRecord[];
  schedules: ScheduleItem[];
  studentsDirectory: StudentDirectoryItem[];
  graduationRule: AttendanceGraduationRule;
  classFilter?: string;
}): AttendanceAnalyticsSummary {
  const {
    attendanceByClass,
    qrCheckIns,
    schedules,
    studentsDirectory,
    graduationRule,
    classFilter = 'All Classes',
  } = params;

  const normalizedFilter = normalizeClassKey(classFilter);
  const filterActive = normalizedFilter !== 'All Classes';

  const classEntries = Object.entries(attendanceByClass).filter(([cls]) =>
    filterActive ? normalizeClassKey(cls) === normalizedFilter : true
  );

  const uniqueCrewMap = new Map<
    string,
    {
      name: string;
      initials: string;
      color: string;
      classKey: string;
      latestStatus: AttendanceAtRiskItem['status'];
      rate: number;
      absentCount: number;
      lateCount: number;
      excuseCount: number;
      presentCount: number;
    }
  >();

  const byClass: AttendanceClassSummary[] = [];

  let totalPresent = 0;
  let totalOnTime = 0;
  let totalLate = 0;
  let totalAbsent = 0;
  let totalExcuse = 0;
  let totalQrEntries = 0;
  let totalRosterEntries = 0;

  classEntries.forEach(([rawClassKey, buckets]) => {
    const classKey = normalizeClassKey(rawClassKey);
    const att = buckets.attendance || [];
    const abs = buckets.absences || [];
    const exc = buckets.excuse || [];

    let classOnTime = 0;
    let classLate = 0;
    let classQr = 0;
    let classRoster = 0;

    att.forEach((st) => {
      const isLate = st.attendanceStatus === 'Late';
      if (isLate) classLate += 1;
      else classOnTime += 1;

      if (st.checkedInVia === 'QR') classQr += 1;
      else classRoster += 1;

      const uKey = st.name.trim().toLowerCase();
      const prev = uniqueCrewMap.get(uKey);
      const dirMatch = studentsDirectory.find(
        (d) => d.name.trim().toLowerCase() === uKey
      );
      uniqueCrewMap.set(uKey, {
        name: dirMatch?.name || st.name,
        initials: dirMatch?.initials || st.initials,
        color: dirMatch?.color || st.color,
        classKey,
        latestStatus: isLate
          ? 'Late'
          : st.attendanceStatus === 'On Time'
            ? 'On Time'
            : 'Present',
        rate: dirMatch?.rate ?? st.rate ?? 90,
        absentCount: prev?.absentCount || 0,
        lateCount: (prev?.lateCount || 0) + (isLate ? 1 : 0),
        excuseCount: prev?.excuseCount || 0,
        presentCount: (prev?.presentCount || 0) + (isLate ? 0 : 1),
      });
    });

    abs.forEach((st) => {
      const uKey = st.name.trim().toLowerCase();
      const prev = uniqueCrewMap.get(uKey);
      const dirMatch = studentsDirectory.find(
        (d) => d.name.trim().toLowerCase() === uKey
      );
      uniqueCrewMap.set(uKey, {
        name: dirMatch?.name || st.name,
        initials: dirMatch?.initials || st.initials,
        color: dirMatch?.color || st.color,
        classKey,
        latestStatus: 'Absent',
        rate: dirMatch?.rate ?? st.rate ?? 75,
        absentCount: (prev?.absentCount || 0) + 1,
        lateCount: prev?.lateCount || 0,
        excuseCount: prev?.excuseCount || 0,
        presentCount: prev?.presentCount || 0,
      });
    });

    exc.forEach((st) => {
      const uKey = st.name.trim().toLowerCase();
      const prev = uniqueCrewMap.get(uKey);
      const dirMatch = studentsDirectory.find(
        (d) => d.name.trim().toLowerCase() === uKey
      );
      uniqueCrewMap.set(uKey, {
        name: dirMatch?.name || st.name,
        initials: dirMatch?.initials || st.initials,
        color: dirMatch?.color || st.color,
        classKey,
        latestStatus: 'Excuse',
        rate: dirMatch?.rate ?? st.rate ?? 85,
        absentCount: prev?.absentCount || 0,
        lateCount: prev?.lateCount || 0,
        excuseCount: (prev?.excuseCount || 0) + 1,
        presentCount: prev?.presentCount || 0,
      });
    });

    const classTotal = att.length + abs.length + exc.length;
    const weightedPresent =
      classOnTime +
      classLate * (graduationRule.lateWeightPct / 100) +
      (graduationRule.excusePolicy === 'present' ? exc.length : 0);
    const effectiveDenom =
      graduationRule.excusePolicy === 'neutral'
        ? Math.max(1, att.length + abs.length)
        : Math.max(1, classTotal);
    const ratePct =
      classTotal > 0 ? Math.min(100, round1((weightedPresent / effectiveDenom) * 100)) : 0;

    totalPresent += att.length;
    totalOnTime += classOnTime;
    totalLate += classLate;
    totalAbsent += abs.length;
    totalExcuse += exc.length;
    totalQrEntries += classQr;
    totalRosterEntries += classRoster;

    byClass.push({
      classKey,
      totalCrew: classTotal,
      presentCount: att.length,
      onTimeCount: classOnTime,
      lateCount: classLate,
      absentCount: abs.length,
      excuseCount: exc.length,
      qrCount: classQr,
      rosterCount: classRoster,
      attendanceRatePct: ratePct,
      meetsThreshold: ratePct >= graduationRule.minAttendanceRatePct,
    });
  });

  // Also merge live QR check-ins for counts if any weren't reflected yet
  const filteredQr = qrCheckIns.filter((rec) =>
    filterActive ? normalizeClassKey(rec.classCode) === normalizedFilter : true
  );
  const qrTotalCount = Math.max(totalQrEntries, filteredQr.length);

  const totalStatusEntries = totalPresent + totalAbsent + totalExcuse;
  const rawAttendanceRatePct =
    totalStatusEntries > 0 ? round1((totalPresent / totalStatusEntries) * 100) : 0;

  const weightedPresentAll =
    totalOnTime +
    totalLate * (graduationRule.lateWeightPct / 100) +
    (graduationRule.excusePolicy === 'present' ? totalExcuse : 0);
  const effectiveDenomAll =
    graduationRule.excusePolicy === 'neutral'
      ? Math.max(1, totalPresent + totalAbsent)
      : Math.max(1, totalStatusEntries);
  const effectiveAttendanceRatePct =
    totalStatusEntries > 0
      ? Math.min(100, round1((weightedPresentAll / effectiveDenomAll) * 100))
      : 0;

  const onTimeRateAmongPresentPct =
    totalPresent > 0 ? round1((totalOnTime / totalPresent) * 100) : 100;

  // Evaluate crew at-risk against Graduation Rule
  const atRiskCrew: AttendanceAtRiskItem[] = [];
  let eligibleCrewCount = 0;

  uniqueCrewMap.forEach((u, key) => {
    const reasons: string[] = [];
    if (u.rate < graduationRule.minAttendanceRatePct) {
      reasons.push(`Rate ${u.rate}% < min ${graduationRule.minAttendanceRatePct}%`);
    }
    if (u.absentCount > graduationRule.maxUnexcusedAbsences || u.latestStatus === 'Absent') {
      if (u.absentCount > graduationRule.maxUnexcusedAbsences) {
        reasons.push(`Absent ${u.absentCount}x (> ${graduationRule.maxUnexcusedAbsences}x)`);
      } else {
        reasons.push('Tercatat Absent pada sesi terbaru');
      }
    }
    if (u.lateCount > graduationRule.maxLateCount) {
      reasons.push(`Terlambat ${u.lateCount}x (> ${graduationRule.maxLateCount}x)`);
    }

    if (reasons.length > 0) {
      atRiskCrew.push({
        key,
        name: u.name,
        initials: u.initials,
        color: u.color,
        classKey: u.classKey,
        status: u.latestStatus,
        rate: u.rate,
        reason: reasons.join(' · '),
      });
    } else {
      eligibleCrewCount += 1;
    }
  });

  atRiskCrew.sort((a, b) => a.rate - b.rate);

  // Schedule-level attendance gap analysis
  const missedSchedules: AttendanceMissedScheduleStat[] = schedules
    .filter((sch) =>
      filterActive ? normalizeClassKey(sch.classCode) === normalizedFilter : true
    )
    .map((sch) => {
      const schClass = normalizeClassKey(sch.classCode);
      const classData =
        schClass === 'All Classes'
          ? null
          : attendanceByClass[schClass];
      const expected = classData
        ? (classData.attendance?.length || 0) +
          (classData.absences?.length || 0) +
          (classData.excuse?.length || 0)
        : Math.max(sch.students || 0, uniqueCrewMap.size);

      const qrMatched = filteredQr.filter((c) => c.scheduleId === sch.id).length;
      const rosterPresent = classData ? classData.attendance.length : totalPresent;
      const attended = Math.min(expected, Math.max(qrMatched, rosterPresent));
      const missed = Math.max(0, expected - attended);
      const pct = expected > 0 ? round1((attended / expected) * 100) : 0;

      return {
        scheduleId: sch.id,
        day: sch.day,
        timeRange: `${sch.startHour}–${sch.endHour}`,
        classKey: schClass,
        subject: sch.subject,
        room: sch.room,
        expectedCount: expected,
        attendedCount: attended,
        missedCount: missed,
        attendancePct: pct,
      };
    })
    .sort((a, b) => a.attendancePct - b.attendancePct);

  const sortedByClass = [...byClass].sort(
    (a, b) => b.attendanceRatePct - a.attendanceRatePct
  );
  const bestClass = sortedByClass[0];
  const lowestClass = sortedByClass[sortedByClass.length - 1];

  const insights: string[] = [];
  if (totalStatusEntries === 0) {
    insights.push(
      'Belum ada catatan absensi pada kelas atau batch aktif. Buka halaman Attendance atau jalankan QR Absensi untuk mulai merekam kehadiran.'
    );
  } else {
    insights.push(
      `Tingkat kehadiran efektif tercatat ${effectiveAttendanceRatePct}% (${totalPresent} hadir, ${totalExcuse} izin, ${totalAbsent} absent) dengan target kelulusan batch ${graduationRule.minAttendanceRatePct}%.`
    );
    if (bestClass && lowestClass && bestClass.classKey !== lowestClass.classKey) {
      insights.push(
        `${bestClass.classKey} mencatat kehadiran tertinggi (${bestClass.attendanceRatePct}%), sementara ${lowestClass.classKey} berada di ${lowestClass.attendanceRatePct}%.`
      );
    }
    if (totalLate > 0) {
      insights.push(
        `Dari ${totalPresent} kehadiran, ${totalLate} check-in berstatus Late (ketepatan waktu ${onTimeRateAmongPresentPct}%).`
      );
    }
    if (atRiskCrew.length > 0) {
      insights.push(
        `${atRiskCrew.length} peserta memerlukan tindak lanjut (status Absent atau tingkat kehadiran di bawah batas ${graduationRule.minAttendanceRatePct}%).`
      );
    } else {
      insights.push(
        `Seluruh ${uniqueCrewMap.size} peserta berada di atas ambang minimal aturan kehadiran batch.`
      );
    }
  }

  return {
    totalUniqueCrew: uniqueCrewMap.size,
    totalStatusEntries,
    presentCount: totalPresent,
    onTimeCount: totalOnTime,
    lateCount: totalLate,
    absentCount: totalAbsent,
    excuseCount: totalExcuse,
    qrCheckInCount: qrTotalCount,
    rosterCheckInCount: totalRosterEntries,
    rawAttendanceRatePct,
    effectiveAttendanceRatePct,
    onTimeRateAmongPresentPct,
    targetThresholdPct: graduationRule.minAttendanceRatePct,
    eligibleCrewCount,
    atRiskCrewCount: atRiskCrew.length,
    byClass: sortedByClass,
    missedSchedules,
    atRiskCrew,
    insights,
  };
}

// ============================================================================
// 2. RIWAYAT PENILAIAN UJIAN ANALYTICS
// ============================================================================

export interface ExamGradeDistItem {
  grade: string;
  label: string;
  passed: boolean;
  count: number;
  pct: number;
}

export interface ExamPositionBreakdown {
  positionId: string;
  positionName: string;
  count: number;
  meanScore: number;
  passCount: number;
  passRatePct: number;
  highestScore: number;
  lowestScore: number;
}

export interface ExamSubjectBreakdown {
  subject: string;
  count: number;
  meanScore: number;
  passRatePct: number;
}

export interface ExamParameterStat {
  label: string;
  segmentName?: string;
  occurrences: number;
  meanScore: number;
  belowKkmCount: number;
}

export interface ExamAssessmentAnalyticsSummary {
  totalAssessments: number;
  uniqueExaminees: number;
  passingScore: number;
  scaleMax: number;
  meanScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  stdDev: number;
  passCount: number;
  failCount: number;
  passRatePct: number;
  gradeDistribution: ExamGradeDistItem[];
  byPosition: ExamPositionBreakdown[];
  bySubject: ExamSubjectBreakdown[];
  parameterStats: ExamParameterStat[];
  strongestParameters: ExamParameterStat[];
  weakestParameters: ExamParameterStat[];
  topExaminees: ExamAssessmentRecord[];
  belowKkmAssessments: ExamAssessmentRecord[];
  insights: string[];
}

export function computeExamAssessmentAnalytics(params: {
  examAssessments: ExamAssessmentRecord[];
  examGradingRule: ExamGradingRule;
  studentsDirectory: StudentDirectoryItem[];
  schedules: ScheduleItem[];
  classFilter?: string;
}): ExamAssessmentAnalyticsSummary {
  const {
    examAssessments,
    examGradingRule,
    studentsDirectory,
    schedules,
    classFilter = 'All Classes',
  } = params;

  const normalizedFilter = normalizeClassKey(classFilter);
  const filterActive = normalizedFilter !== 'All Classes';

  const filtered = examAssessments.filter((rec) => {
    if (!filterActive) return true;
    const st = rec.studentId
      ? studentsDirectory.find((s) => s.id === rec.studentId)
      : studentsDirectory.find(
          (s) => s.name.trim().toLowerCase() === rec.examineeName.trim().toLowerCase()
        );
    if (st) {
      return normalizeClassKey(st.classCode) === normalizedFilter;
    }
    const resolvedClass = resolveClassKeyForSubject(rec.subject, schedules);
    return resolvedClass === normalizedFilter;
  });

  const totalAssessments = filtered.length;
  const uniqueExaminees = new Set(
    filtered.map((a) => (a.studentId || a.examineeName).trim().toLowerCase())
  ).size;

  const scores = filtered.map((a) => a.finalScore);
  const meanScore =
    totalAssessments > 0
      ? round1(scores.reduce((s, n) => s + n, 0) / totalAssessments)
      : 0;
  const medianScore = calcMedian(scores);
  const highestScore = totalAssessments > 0 ? Math.max(...scores) : 0;
  const lowestScore = totalAssessments > 0 ? Math.min(...scores) : 0;
  const stdDev = calcStdDev(scores, meanScore);

  const passCount = filtered.filter((a) => a.passed).length;
  const failCount = totalAssessments - passCount;
  const passRatePct =
    totalAssessments > 0 ? round1((passCount / totalAssessments) * 100) : 0;

  // Grade distribution aligned to examGradingRule.gradeBands
  const gradeDistribution: ExamGradeDistItem[] = [...examGradingRule.gradeBands]
    .sort((a, b) => b.minScore - a.minScore)
    .map((band) => {
      const count = filtered.filter((a) => a.grade === band.grade).length;
      return {
        grade: band.grade,
        label: band.label,
        passed: band.passed,
        count,
        pct: totalAssessments > 0 ? round1((count / totalAssessments) * 100) : 0,
      };
    });

  // Per-Position breakdown
  const posMap = new Map<string, ExamAssessmentRecord[]>();
  filtered.forEach((rec) => {
    const key = rec.positionId || rec.positionName;
    const list = posMap.get(key) || [];
    list.push(rec);
    posMap.set(key, list);
  });

  const byPosition: ExamPositionBreakdown[] = Array.from(posMap.entries())
    .map(([positionId, list]) => {
      const sList = list.map((x) => x.finalScore);
      const pCount = list.filter((x) => x.passed).length;
      return {
        positionId,
        positionName: list[0]?.positionName || positionId,
        count: list.length,
        meanScore: round1(sList.reduce((a, b) => a + b, 0) / list.length),
        passCount: pCount,
        passRatePct: round1((pCount / list.length) * 100),
        highestScore: Math.max(...sList),
        lowestScore: Math.min(...sList),
      };
    })
    .sort((a, b) => b.meanScore - a.meanScore);

  // Per-Subject breakdown
  const subjMap = new Map<string, ExamAssessmentRecord[]>();
  filtered.forEach((rec) => {
    const key = rec.subject.trim() || 'Lainnya';
    const list = subjMap.get(key) || [];
    list.push(rec);
    subjMap.set(key, list);
  });

  const bySubject: ExamSubjectBreakdown[] = Array.from(subjMap.entries())
    .map(([subject, list]) => {
      const pCount = list.filter((x) => x.passed).length;
      return {
        subject,
        count: list.length,
        meanScore: round1(list.reduce((a, b) => a + b.finalScore, 0) / list.length),
        passRatePct: round1((pCount / list.length) * 100),
      };
    })
    .sort((a, b) => b.count - a.count || b.meanScore - a.meanScore);

  // Parameter-level statistics across all assessments
  const paramMap = new Map<
    string,
    { label: string; segmentName?: string; scores: number[] }
  >();
  filtered.forEach((rec) => {
    rec.parameterScores.forEach((ps) => {
      const key = ps.label.trim().toLowerCase();
      const curr = paramMap.get(key) || {
        label: ps.label,
        segmentName: ps.segmentName,
        scores: [],
      };
      curr.scores.push(ps.score);
      paramMap.set(key, curr);
    });
  });

  const parameterStats: ExamParameterStat[] = Array.from(paramMap.values())
    .map((entry) => {
      const avg = round1(
        entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length
      );
      const belowKkmCount = entry.scores.filter(
        (s) => s < examGradingRule.passingScore
      ).length;
      return {
        label: entry.label,
        segmentName: entry.segmentName,
        occurrences: entry.scores.length,
        meanScore: avg,
        belowKkmCount,
      };
    })
    .sort((a, b) => b.meanScore - a.meanScore);

  const strongestParameters = parameterStats.slice(0, 3);
  const weakestParameters = [...parameterStats]
    .sort((a, b) => a.meanScore - b.meanScore)
    .slice(0, 3);

  const topExaminees = [...filtered]
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 5);
  const belowKkmAssessments = filtered
    .filter((a) => !a.passed)
    .sort((a, b) => a.finalScore - b.finalScore);

  const insights: string[] = [];
  if (totalAssessments === 0) {
    insights.push(
      `Belum ada riwayat penilaian ujian tersimpan untuk filter ini. Gunakan formulir Penilaian Ujian di halaman Exams (KKM ${examGradingRule.passingScore}/${examGradingRule.scaleMax}) untuk menghasilkan analisa otomatis.`
    );
  } else {
    insights.push(
      `Dari ${totalAssessments} penilaian (${uniqueExaminees} peserta unik), rata-rata nilai akhir mencapai ${meanScore}/${examGradingRule.scaleMax} dengan tingkat kelulusan ${passRatePct}% (KKM ≥ ${examGradingRule.passingScore}).`
    );
    if (byPosition.length > 1) {
      const bestPos = byPosition[0];
      const lowPos = byPosition[byPosition.length - 1];
      insights.push(
        `Posisi "${bestPos.positionName}" meraih rata-rata tertinggi (${bestPos.meanScore}), sedangkan "${lowPos.positionName}" berada di ${lowPos.meanScore}.`
      );
    }
    if (weakestParameters.length > 0) {
      const w = weakestParameters[0];
      insights.push(
        `Kompetensi yang paling perlu pembinaan: "${w.label}" (rata-rata ${w.meanScore}, ${w.belowKkmCount} sesi di bawah KKM).`
      );
    }
    if (failCount > 0) {
      insights.push(
        `${failCount} penilaian berada di bawah batas KKM ${examGradingRule.passingScore} dan ${
          examGradingRule.allowRemedial
            ? `berhak mengikuti remedial (maks ${examGradingRule.maxRemedialAttempts}x, cap nilai ${examGradingRule.remedialCapScore}).`
            : 'memerlukan evaluasi ulang.'
        }`
      );
    }
  }

  return {
    totalAssessments,
    uniqueExaminees,
    passingScore: examGradingRule.passingScore,
    scaleMax: examGradingRule.scaleMax,
    meanScore,
    medianScore,
    highestScore,
    lowestScore,
    stdDev,
    passCount,
    failCount,
    passRatePct,
    gradeDistribution,
    byPosition,
    bySubject,
    parameterStats,
    strongestParameters,
    weakestParameters,
    topExaminees,
    belowKkmAssessments,
    insights,
  };
}

// ============================================================================
// 3. LAPORAN KESELURUHAN ASSIGNMENT ANALYTICS
// ============================================================================

export interface AssignmentItemStat {
  id: string;
  title: string;
  classCode: string;
  subject: string;
  effectiveStatus: 'Active' | 'Needs Grading' | 'Completed';
  phase: 'scheduled' | 'running' | 'ended';
  submitted: number;
  total: number;
  submissionRatePct: number;
  gradedCount: number;
  needsReviewCount: number;
  pendingCount: number;
  meanGradedScore: number | null;
}

export interface AssignmentClassStat {
  classKey: string;
  assignmentCount: number;
  submitted: number;
  totalExpected: number;
  submissionRatePct: number;
  meanScore: number | null;
  needsReviewCount: number;
}

export interface AssignmentStudentStat {
  name: string;
  initials: string;
  color: string;
  classCodes: string[];
  gradedCount: number;
  needsReviewCount: number;
  pendingCount: number;
  avgScore: number | null;
}

export interface AssignmentScoreBand {
  label: string;
  color: string;
  count: number;
  pct: number;
}

export interface AssignmentAnalyticsSummary {
  totalAssignments: number;
  activeCount: number;
  needsGradingCount: number;
  completedCount: number;
  runningPhaseCount: number;
  scheduledPhaseCount: number;
  endedPhaseCount: number;
  totalExpectedSubmissions: number;
  totalSubmitted: number;
  submissionRatePct: number;
  gradedCount: number;
  needsReviewCount: number;
  pendingCount: number;
  meanScore: number;
  medianScore: number;
  highestScore: number;
  lowestScore: number;
  scoreBands: AssignmentScoreBand[];
  perAssignment: AssignmentItemStat[];
  byClass: AssignmentClassStat[];
  topStudents: AssignmentStudentStat[];
  pendingStudents: AssignmentStudentStat[];
  insights: string[];
}

export function computeAssignmentAnalytics(params: {
  assignments: Assignment[];
  now?: Date;
  classFilter?: string;
}): AssignmentAnalyticsSummary {
  const { assignments, now = new Date(), classFilter = 'All Classes' } = params;
  const normalizedFilter = normalizeClassKey(classFilter);
  const filterActive = normalizedFilter !== 'All Classes';

  const filtered = assignments.filter((a) =>
    filterActive ? normalizeClassKey(a.classCode) === normalizedFilter : true
  );

  let activeCount = 0;
  let needsGradingCount = 0;
  let completedCount = 0;
  let runningPhaseCount = 0;
  let scheduledPhaseCount = 0;
  let endedPhaseCount = 0;
  let totalExpectedSubmissions = 0;
  let totalSubmitted = 0;
  let gradedCount = 0;
  let needsReviewCount = 0;
  let pendingCount = 0;

  const allScores: number[] = [];
  const classMap = new Map<
    string,
    {
      assignmentCount: number;
      submitted: number;
      totalExpected: number;
      scores: number[];
      needsReviewCount: number;
    }
  >();
  const studentMap = new Map<
    string,
    {
      name: string;
      initials: string;
      color: string;
      classCodes: Set<string>;
      scores: number[];
      needsReviewCount: number;
      pendingCount: number;
    }
  >();

  const perAssignment: AssignmentItemStat[] = filtered.map((asg) => {
    const effectiveStatus = getEffectiveAssignmentStatus(asg, now);
    const phase = getAssignmentSchedulePhase(asg, now);

    if (effectiveStatus === 'Active') activeCount += 1;
    else if (effectiveStatus === 'Needs Grading') needsGradingCount += 1;
    else completedCount += 1;

    if (phase === 'running') runningPhaseCount += 1;
    else if (phase === 'scheduled') scheduledPhaseCount += 1;
    else endedPhaseCount += 1;

    const total = Math.max(asg.total || 0, asg.submissions.length);
    const submitted = Math.max(
      asg.submitted || 0,
      asg.submissions.filter((s) => s.status !== 'Pending').length
    );

    totalExpectedSubmissions += total;
    totalSubmitted += submitted;

    const asgScores: number[] = [];
    let asgGraded = 0;
    let asgNeedsReview = 0;
    let asgPending = 0;

    const clsKey = normalizeClassKey(asg.classCode);
    const clsEntry = classMap.get(clsKey) || {
      assignmentCount: 0,
      submitted: 0,
      totalExpected: 0,
      scores: [],
      needsReviewCount: 0,
    };
    clsEntry.assignmentCount += 1;
    clsEntry.submitted += submitted;
    clsEntry.totalExpected += total;

    asg.submissions.forEach((sub) => {
      const sKey = sub.name.trim().toLowerCase();
      const sEntry = studentMap.get(sKey) || {
        name: sub.name,
        initials: sub.initials,
        color: sub.color,
        classCodes: new Set<string>(),
        scores: [],
        needsReviewCount: 0,
        pendingCount: 0,
      };
      sEntry.classCodes.add(clsKey);

      if (sub.status === 'Graded') {
        asgGraded += 1;
        gradedCount += 1;
        if (typeof sub.score === 'number') {
          asgScores.push(sub.score);
          allScores.push(sub.score);
          clsEntry.scores.push(sub.score);
          sEntry.scores.push(sub.score);
        }
      } else if (sub.status === 'Needs Review') {
        asgNeedsReview += 1;
        needsReviewCount += 1;
        clsEntry.needsReviewCount += 1;
        sEntry.needsReviewCount += 1;
      } else {
        asgPending += 1;
        pendingCount += 1;
        sEntry.pendingCount += 1;
      }

      studentMap.set(sKey, sEntry);
    });

    classMap.set(clsKey, clsEntry);

    const meanGradedScore =
      asgScores.length > 0
        ? round1(asgScores.reduce((a, b) => a + b, 0) / asgScores.length)
        : null;

    return {
      id: asg.id,
      title: asg.title,
      classCode: clsKey,
      subject: asg.subject,
      effectiveStatus,
      phase,
      submitted,
      total,
      submissionRatePct: total > 0 ? round1((submitted / total) * 100) : 0,
      gradedCount: asgGraded,
      needsReviewCount: asgNeedsReview,
      pendingCount: asgPending,
      meanGradedScore,
    };
  });

  const submissionRatePct =
    totalExpectedSubmissions > 0
      ? round1((totalSubmitted / totalExpectedSubmissions) * 100)
      : 0;

  const meanScore =
    allScores.length > 0
      ? round1(allScores.reduce((a, b) => a + b, 0) / allScores.length)
      : 0;
  const medianScore = calcMedian(allScores);
  const highestScore = allScores.length > 0 ? Math.max(...allScores) : 0;
  const lowestScore = allScores.length > 0 ? Math.min(...allScores) : 0;

  const bandDefs = [
    { label: '90–100 (Sangat Baik)', min: 90, max: 100, color: 'bg-[#6C5DD3]' },
    { label: '80–89 (Baik)', min: 80, max: 89.99, color: 'bg-[#10B981]' },
    { label: '70–79 (Cukup)', min: 70, max: 79.99, color: 'bg-[#F59E0B]' },
    { label: '< 70 (Perlu Dukungan)', min: -Infinity, max: 69.99, color: 'bg-[#ee2e65]' },
  ];

  const scoreBands: AssignmentScoreBand[] = bandDefs.map((b) => {
    const count = allScores.filter((s) => s >= b.min && s <= b.max).length;
    return {
      label: b.label,
      color: b.color,
      count,
      pct: allScores.length > 0 ? round1((count / allScores.length) * 100) : 0,
    };
  });

  const byClass: AssignmentClassStat[] = Array.from(classMap.entries())
    .map(([classKey, val]) => ({
      classKey,
      assignmentCount: val.assignmentCount,
      submitted: val.submitted,
      totalExpected: val.totalExpected,
      submissionRatePct:
        val.totalExpected > 0
          ? round1((val.submitted / val.totalExpected) * 100)
          : 0,
      meanScore:
        val.scores.length > 0
          ? round1(val.scores.reduce((a, b) => a + b, 0) / val.scores.length)
          : null,
      needsReviewCount: val.needsReviewCount,
    }))
    .sort((a, b) => (b.meanScore ?? 0) - (a.meanScore ?? 0));

  const studentStats: AssignmentStudentStat[] = Array.from(studentMap.values()).map(
    (s) => ({
      name: s.name,
      initials: s.initials,
      color: s.color,
      classCodes: Array.from(s.classCodes),
      gradedCount: s.scores.length,
      needsReviewCount: s.needsReviewCount,
      pendingCount: s.pendingCount,
      avgScore:
        s.scores.length > 0
          ? round1(s.scores.reduce((a, b) => a + b, 0) / s.scores.length)
          : null,
    })
  );

  const topStudents = studentStats
    .filter((s) => s.avgScore !== null)
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
    .slice(0, 5);

  const pendingStudents = studentStats
    .filter((s) => s.pendingCount > 0 || s.needsReviewCount > 0)
    .sort((a, b) => b.pendingCount - a.pendingCount || b.needsReviewCount - a.needsReviewCount);

  const insights: string[] = [];
  if (filtered.length === 0) {
    insights.push(
      'Belum ada assignment tercatat pada filter ini. Buat tugas baru di halaman Assignment untuk mulai melacak pengumpulan & nilai.'
    );
  } else {
    insights.push(
      `Total ${filtered.length} tugas dengan tingkat pengumpulan ${submissionRatePct}% (${totalSubmitted}/${totalExpectedSubmissions} jawaban masuk).`
    );
    if (allScores.length > 0) {
      insights.push(
        `Dari ${gradedCount} jawaban yang telah dinilai, rata-rata skor mencapai ${meanScore}/100 (rentang ${lowestScore}–${highestScore}).`
      );
    }
    if (needsReviewCount > 0) {
      insights.push(
        `Terdapat ${needsReviewCount} jawaban berstatus Needs Review yang menunggu pemeriksaan dan penilaian.`
      );
    }
    if (pendingCount > 0) {
      insights.push(
        `${pendingCount} slot pengumpulan masih berstatus Pending dan perlu diingatkan sebelum tenggat waktu berakhir.`
      );
    }
  }

  return {
    totalAssignments: filtered.length,
    activeCount,
    needsGradingCount,
    completedCount,
    runningPhaseCount,
    scheduledPhaseCount,
    endedPhaseCount,
    totalExpectedSubmissions,
    totalSubmitted,
    submissionRatePct,
    gradedCount,
    needsReviewCount,
    pendingCount,
    meanScore,
    medianScore,
    highestScore,
    lowestScore,
    scoreBands,
    perAssignment,
    byClass,
    topStudents,
    pendingStudents,
    insights,
  };
}

// ============================================================================
// 4. LAPORAN KESELURUHAN LIVEQUIZ ANALYTICS
// ============================================================================

export interface LiveQuizSessionStatItem {
  id: string;
  code: string;
  quizTitle: string;
  subject: string;
  classCode: string;
  mode: 'classic' | 'test';
  endedAt: string;
  participantCount: number;
  totalQuestions: number;
  avgAccuracyPct: number;
  avgScore: number;
  topScorer: string;
  totalTabSwitches: number;
}

export interface LiveQuizQuestionAggStat {
  questionId: string;
  prompt: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  quizTitle: string;
  totalAttempts: number;
  correctAttempts: number;
  accuracyPct: number;
}

export interface LiveQuizParticipantAggStat {
  name: string;
  avatarColor: string;
  sessionsPlayed: number;
  totalScore: number;
  avgScore: number;
  totalCorrect: number;
  totalQuestions: number;
  avgAccuracyPct: number;
  bestStreak: number;
  tabSwitches: number;
}

export interface LiveQuizQuestionTypeStat {
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  label: string;
  count: number;
  avgAccuracyPct: number;
}

export interface LiveQuizAnalyticsSummary {
  totalQuizzesInLibrary: number;
  totalQuestionsInLibrary: number;
  totalSessions: number;
  classicSessionsCount: number;
  testSessionsCount: number;
  totalParticipantEntries: number;
  uniqueParticipants: number;
  overallAvgAccuracyPct: number;
  highestSessionAccuracyPct: number;
  lowestSessionAccuracyPct: number;
  meanParticipantScore: number;
  highestParticipantScore: number;
  avgBestStreak: number;
  totalTabSwitches: number;
  sessions: LiveQuizSessionStatItem[];
  hardestQuestions: LiveQuizQuestionAggStat[];
  easiestQuestions: LiveQuizQuestionAggStat[];
  questionTypeStats: LiveQuizQuestionTypeStat[];
  leaderboard: LiveQuizParticipantAggStat[];
  insights: string[];
}

export function computeLiveQuizAnalytics(params: {
  liveQuizReports: LiveQuizSessionReport[];
  liveQuizzes: LiveQuiz[];
  schedules: ScheduleItem[];
  classFilter?: string;
}): LiveQuizAnalyticsSummary {
  const { liveQuizReports, liveQuizzes, schedules, classFilter = 'All Classes' } = params;
  const normalizedFilter = normalizeClassKey(classFilter);
  const filterActive = normalizedFilter !== 'All Classes';

  const resolveReportClass = (rep: LiveQuizSessionReport): string => {
    const matchedQuiz = liveQuizzes.find((q) => q.id === rep.quizId);
    if (matchedQuiz?.classCode) {
      return normalizeClassKey(matchedQuiz.classCode);
    }
    return resolveClassKeyForSubject(rep.subject, schedules);
  };

  const filteredQuizzes = liveQuizzes.filter((q) => {
    if (!filterActive) return true;
    const cls = normalizeClassKey(q.classCode);
    return cls === normalizedFilter || cls === 'All Classes';
  });

  const filteredReports = liveQuizReports.filter((rep) => {
    if (!filterActive) return true;
    const cls = resolveReportClass(rep);
    return cls === normalizedFilter || cls === 'All Classes';
  });

  const totalQuizzesInLibrary = filteredQuizzes.length;
  const totalQuestionsInLibrary = filteredQuizzes.reduce(
    (sum, q) => sum + (q.questions?.length || 0),
    0
  );

  let classicSessionsCount = 0;
  let testSessionsCount = 0;
  let totalParticipantEntries = 0;
  let totalTabSwitches = 0;

  const participantMap = new Map<
    string,
    {
      name: string;
      avatarColor: string;
      sessionsPlayed: number;
      totalScore: number;
      totalCorrect: number;
      totalQuestions: number;
      bestStreak: number;
      tabSwitches: number;
    }
  >();

  const questionStatsList: LiveQuizQuestionAggStat[] = [];
  const allParticipantScores: number[] = [];
  const allBestStreaks: number[] = [];

  const sessions: LiveQuizSessionStatItem[] = filteredReports.map((rep) => {
    if (rep.mode === 'classic') classicSessionsCount += 1;
    else testSessionsCount += 1;

    const pCount = rep.participants.length;
    totalParticipantEntries += pCount;

    let sessionScoreSum = 0;
    let sessionTabSwitches = 0;

    rep.participants.forEach((p) => {
      sessionScoreSum += p.score;
      sessionTabSwitches += p.tabSwitches || 0;
      totalTabSwitches += p.tabSwitches || 0;
      allParticipantScores.push(p.score);
      allBestStreaks.push(p.bestStreak || 0);

      const pKey = p.name.trim().toLowerCase();
      const prev = participantMap.get(pKey) || {
        name: p.name,
        avatarColor: p.avatarColor,
        sessionsPlayed: 0,
        totalScore: 0,
        totalCorrect: 0,
        totalQuestions: 0,
        bestStreak: 0,
        tabSwitches: 0,
      };
      prev.sessionsPlayed += 1;
      prev.totalScore += p.score;
      prev.totalCorrect += p.correctCount;
      prev.totalQuestions += Math.max(rep.totalQuestions, p.answeredCount);
      prev.bestStreak = Math.max(prev.bestStreak, p.bestStreak || 0);
      prev.tabSwitches += p.tabSwitches || 0;
      participantMap.set(pKey, prev);
    });

    (rep.questionStats || []).forEach((qs) => {
      questionStatsList.push({
        questionId: `${rep.id}-${qs.questionId}`,
        prompt: qs.prompt,
        type: qs.type,
        quizTitle: rep.quizTitle,
        totalAttempts: qs.totalAttempts,
        correctAttempts: qs.correctAttempts,
        accuracyPct: qs.accuracyPct,
      });
    });

    return {
      id: rep.id,
      code: rep.code,
      quizTitle: rep.quizTitle,
      subject: rep.subject,
      classCode: resolveReportClass(rep),
      mode: rep.mode,
      endedAt: rep.endedAt,
      participantCount: pCount,
      totalQuestions: rep.totalQuestions,
      avgAccuracyPct: rep.avgAccuracy,
      avgScore: pCount > 0 ? Math.round(sessionScoreSum / pCount) : 0,
      topScorer: rep.topScorer || rep.participants[0]?.name || '—',
      totalTabSwitches: sessionTabSwitches,
    };
  });

  const totalSessions = sessions.length;
  const sessionAccuracies = sessions.map((s) => s.avgAccuracyPct);
  const overallAvgAccuracyPct =
    totalSessions > 0
      ? round1(sessionAccuracies.reduce((a, b) => a + b, 0) / totalSessions)
      : 0;
  const highestSessionAccuracyPct =
    totalSessions > 0 ? Math.max(...sessionAccuracies) : 0;
  const lowestSessionAccuracyPct =
    totalSessions > 0 ? Math.min(...sessionAccuracies) : 0;

  const meanParticipantScore =
    allParticipantScores.length > 0
      ? Math.round(
          allParticipantScores.reduce((a, b) => a + b, 0) / allParticipantScores.length
        )
      : 0;
  const highestParticipantScore =
    allParticipantScores.length > 0 ? Math.max(...allParticipantScores) : 0;
  const avgBestStreak =
    allBestStreaks.length > 0
      ? round1(allBestStreaks.reduce((a, b) => a + b, 0) / allBestStreaks.length)
      : 0;

  const hardestQuestions = [...questionStatsList]
    .sort((a, b) => a.accuracyPct - b.accuracyPct)
    .slice(0, 5);
  const easiestQuestions = [...questionStatsList]
    .sort((a, b) => b.accuracyPct - a.accuracyPct)
    .slice(0, 5);

  const typeMeta: Record<
    'multiple_choice' | 'true_false' | 'short_answer',
    string
  > = {
    multiple_choice: 'Pilihan Ganda',
    true_false: 'Benar / Salah',
    short_answer: 'Isian Singkat',
  };

  const questionTypeStats: LiveQuizQuestionTypeStat[] = (
    ['multiple_choice', 'true_false', 'short_answer'] as const
  )
    .map((type) => {
      const matched = questionStatsList.filter((q) => q.type === type);
      return {
        type,
        label: typeMeta[type],
        count: matched.length,
        avgAccuracyPct:
          matched.length > 0
            ? round1(
                matched.reduce((acc, q) => acc + q.accuracyPct, 0) / matched.length
              )
            : 0,
      };
    })
    .filter((t) => t.count > 0);

  const leaderboard: LiveQuizParticipantAggStat[] = Array.from(
    participantMap.values()
  )
    .map((p) => ({
      name: p.name,
      avatarColor: p.avatarColor,
      sessionsPlayed: p.sessionsPlayed,
      totalScore: p.totalScore,
      avgScore: Math.round(p.totalScore / p.sessionsPlayed),
      totalCorrect: p.totalCorrect,
      totalQuestions: p.totalQuestions,
      avgAccuracyPct:
        p.totalQuestions > 0
          ? round1((p.totalCorrect / p.totalQuestions) * 100)
          : 0,
      bestStreak: p.bestStreak,
      tabSwitches: p.tabSwitches,
    }))
    .sort((a, b) => b.totalScore - a.totalScore || b.avgAccuracyPct - a.avgAccuracyPct);

  const insights: string[] = [];
  if (totalSessions === 0) {
    insights.push(
      `Tersedia ${totalQuizzesInLibrary} kuis (${totalQuestionsInLibrary} soal) di perpustakaan. Jalankan minimal 1 sesi LiveQuiz hingga selesai untuk menghasilkan statistik sesi.`
    );
  } else {
    insights.push(
      `Dari ${totalSessions} sesi selesai (${classicSessionsCount} Classic · ${testSessionsCount} Test Mode), rata-rata akurasi peserta mencapai ${overallAvgAccuracyPct}% dengan skor rata-rata ${meanParticipantScore.toLocaleString('id-ID')} poin.`
    );
    if (hardestQuestions.length > 0) {
      const hardest = hardestQuestions[0];
      insights.push(
        `Soal dengan tingkat akurasi terendah (${hardest.accuracyPct}%): "${hardest.prompt.slice(0, 72)}${hardest.prompt.length > 72 ? '…' : ''}" — disarankan untuk dibahas ulang.`
      );
    }
    if (leaderboard.length > 0) {
      const top = leaderboard[0];
      insights.push(
        `Performa terbaik kumulatif dipegang oleh ${top.name} (${top.totalScore.toLocaleString('id-ID')} poin, akurasi ${top.avgAccuracyPct}%, best streak ${top.bestStreak}x).`
      );
    }
    if (testSessionsCount > 0) {
      insights.push(
        totalTabSwitches > 0
          ? `Monitoring Test Mode mendeteksi ${totalTabSwitches} perpindahan tab selama sesi ujian berlangsung.`
          : 'Monitoring Test Mode mencatat 0 perpindahan tab (integritas sesi 100% terjaga).'
      );
    }
  }

  return {
    totalQuizzesInLibrary,
    totalQuestionsInLibrary,
    totalSessions,
    classicSessionsCount,
    testSessionsCount,
    totalParticipantEntries,
    uniqueParticipants: participantMap.size,
    overallAvgAccuracyPct,
    highestSessionAccuracyPct,
    lowestSessionAccuracyPct,
    meanParticipantScore,
    highestParticipantScore,
    avgBestStreak,
    totalTabSwitches,
    sessions,
    hardestQuestions,
    easiestQuestions,
    questionTypeStats,
    leaderboard,
    insights,
  };
}

// ============================================================================
// UNIFIED CSV EXPORT FOR ALL 4 MODULES
// ============================================================================

export function buildUnifiedAnalyticsCsv(params: {
  batchLabel: string;
  classFilter: string;
  attendance: AttendanceAnalyticsSummary;
  exams: ExamAssessmentAnalyticsSummary;
  assignments: AssignmentAnalyticsSummary;
  liveQuiz: LiveQuizAnalyticsSummary;
}): string {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? '').replace(/"/g, '""')}"`;

  const lines: string[] = [];
  lines.push(`Servolution Analytics & Statistics Report,${esc(params.batchLabel)},Filter,${esc(params.classFilter)}`);
  lines.push('');

  lines.push('1. ALL ATTENDANCE RECORDS SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Unique Crew,${params.attendance.totalUniqueCrew}`);
  lines.push(`Effective Attendance Rate,${params.attendance.effectiveAttendanceRatePct}%`);
  lines.push(`Present,${params.attendance.presentCount}`);
  lines.push(`On Time,${params.attendance.onTimeCount}`);
  lines.push(`Late,${params.attendance.lateCount}`);
  lines.push(`Excuse,${params.attendance.excuseCount}`);
  lines.push(`Absent,${params.attendance.absentCount}`);
  lines.push(`QR Check-Ins,${params.attendance.qrCheckInCount}`);
  lines.push(`At-Risk Crew,${params.attendance.atRiskCrewCount}`);
  lines.push('');
  lines.push('Class,Total Crew,Present,Late,Excuse,Absent,Effective Rate');
  params.attendance.byClass.forEach((c) => {
    lines.push(
      [esc(c.classKey), c.totalCrew, c.presentCount, c.lateCount, c.excuseCount, c.absentCount, `${c.attendanceRatePct}%`].join(',')
    );
  });
  lines.push('');

  lines.push('2. RIWAYAT PENILAIAN UJIAN SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Assessments,${params.exams.totalAssessments}`);
  lines.push(`Unique Examinees,${params.exams.uniqueExaminees}`);
  lines.push(`Mean Score,${params.exams.meanScore}`);
  lines.push(`Median Score,${params.exams.medianScore}`);
  lines.push(`Highest Score,${params.exams.highestScore}`);
  lines.push(`Lowest Score,${params.exams.lowestScore}`);
  lines.push(`Pass Rate (KKM ${params.exams.passingScore}),${params.exams.passRatePct}%`);
  lines.push('');
  lines.push('Position,Assessments,Mean Score,Pass Rate,Highest,Lowest');
  params.exams.byPosition.forEach((p) => {
    lines.push(
      [esc(p.positionName), p.count, p.meanScore, `${p.passRatePct}%`, p.highestScore, p.lowestScore].join(',')
    );
  });
  lines.push('');

  lines.push('3. LAPORAN KESELURUHAN ASSIGNMENT');
  lines.push('Metric,Value');
  lines.push(`Total Assignments,${params.assignments.totalAssignments}`);
  lines.push(`Submission Rate,${params.assignments.submissionRatePct}%`);
  lines.push(`Total Submitted,${params.assignments.totalSubmitted}/${params.assignments.totalExpectedSubmissions}`);
  lines.push(`Graded Submissions,${params.assignments.gradedCount}`);
  lines.push(`Needs Review,${params.assignments.needsReviewCount}`);
  lines.push(`Pending,${params.assignments.pendingCount}`);
  lines.push(`Mean Graded Score,${params.assignments.meanScore}`);
  lines.push('');
  lines.push('Title,Class,Status,Submitted,Total,Submission Rate,Mean Score');
  params.assignments.perAssignment.forEach((a) => {
    lines.push(
      [esc(a.title), esc(a.classCode), esc(a.effectiveStatus), a.submitted, a.total, `${a.submissionRatePct}%`, a.meanGradedScore ?? '-'].join(',')
    );
  });
  lines.push('');

  lines.push('4. LAPORAN KESELURUHAN LIVEQUIZ');
  lines.push('Metric,Value');
  lines.push(`Total Quizzes in Library,${params.liveQuiz.totalQuizzesInLibrary}`);
  lines.push(`Total Completed Sessions,${params.liveQuiz.totalSessions}`);
  lines.push(`Total Participants,${params.liveQuiz.totalParticipantEntries}`);
  lines.push(`Overall Avg Accuracy,${params.liveQuiz.overallAvgAccuracyPct}%`);
  lines.push(`Mean Participant Score,${params.liveQuiz.meanParticipantScore}`);
  lines.push(`Tab Switches (Test Mode),${params.liveQuiz.totalTabSwitches}`);
  lines.push('');
  lines.push('Quiz Title,Mode,Room Code,Participants,Avg Accuracy,Avg Score,Top Scorer');
  params.liveQuiz.sessions.forEach((s) => {
    lines.push(
      [esc(s.quizTitle), esc(s.mode), esc(s.code), s.participantCount, `${s.avgAccuracyPct}%`, s.avgScore, esc(s.topScorer)].join(',')
    );
  });

  return lines.join('\n');
}
