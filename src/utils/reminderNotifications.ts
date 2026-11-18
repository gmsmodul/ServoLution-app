import { Assignment, Exam, NotificationItem, ScheduleItem } from '../types';
import { UPCOMING_EXAMS } from '../data/mockData';
import {
  formatScheduleDateLabel,
  getEffectiveAssignmentStatus,
  parseScheduleDateTime,
} from './assignmentSchedule';

const DAY_TO_JS_WEEKDAY: Record<ScheduleItem['day'], number> = {
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
};

const DAY_LABELS_ID: Record<ScheduleItem['day'], string> = {
  Mon: 'Senin',
  Tue: 'Selasa',
  Wed: 'Rabu',
  Thu: 'Kamis',
  Fri: 'Jumat',
};

const H1_DAY_LABELS_ID: Record<ScheduleItem['day'], string> = {
  Mon: 'Minggu',
  Tue: 'Senin',
  Wed: 'Selasa',
  Thu: 'Rabu',
  Fri: 'Kamis',
};

function parseEndHourMinutes(endHour: string): number {
  const match = String(endHour || '23:59').match(/(\d{1,2}):(\d{2})/);
  if (!match) return 23 * 60 + 59;
  return Math.min(23, Number(match[1])) * 60 + Math.min(59, Number(match[2]));
}

function getNextScheduleDiffDays(
  day: ScheduleItem['day'],
  endHour: string,
  now: Date
): number {
  const targetJsDay = DAY_TO_JS_WEEKDAY[day] ?? 1;
  const todayJsDay = now.getDay();
  let diff = (targetJsDay - todayJsDay + 7) % 7;
  if (diff === 0) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    if (nowMinutes > parseEndHourMinutes(endHour)) {
      diff = 7;
    }
  }
  return diff;
}

function getCalendarDiffDays(target: Date, now: Date): number {
  const targetMidnight = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate()
  ).getTime();
  const nowMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  return Math.round((targetMidnight - nowMidnight) / 86400000);
}

export interface BuildReminderNotificationsInput {
  schedules: ScheduleItem[];
  assignments: Assignment[];
  exams: Exam[];
  now?: Date;
}

export function buildAutoReminderNotifications({
  schedules,
  assignments,
  exams,
  now = new Date(),
}: BuildReminderNotificationsInput): NotificationItem[] {
  const activeRemindersFirst: NotificationItem[] = [];
  const upcomingEntries: NotificationItem[] = [];
  const isAfter7Pm = now.getHours() >= 19;

  // 1. Assignments: Notification + H-1 Reminder + 19:00 (7 Malam) Reminder
  assignments.forEach((asg) => {
    const effectiveStatus = getEffectiveAssignmentStatus(asg, now);
    if (effectiveStatus === 'Completed') return;

    const start = parseScheduleDateTime(asg.startDate);
    const end = parseScheduleDateTime(asg.endDate);
    const daysToEnd = end ? getCalendarDiffDays(end, now) : null;
    const daysToStart = start ? getCalendarDiffDays(start, now) : null;
    const dueLabel = asg.endDate
      ? formatScheduleDateLabel(asg.endDate)
      : asg.dueDate;

    const isH1Deadline = daysToEnd === 1;
    const isH1Start = daysToStart === 1;
    const isH1Active = isH1Deadline || isH1Start;
    const isTodayDeadline = daysToEnd === 0;

    // 7:00 PM (19:00) Reminder specifically for Tugas / Assignments
    const sevenPmItem: NotificationItem = {
      id: `auto-asg-1900-${asg.id}`,
      title: `Pengingat Tugas 19:00: ${asg.title}`,
      desc: isAfter7Pm
        ? `Waktunya pengingat jam 7 malam — periksa & kerjakan tugas ${asg.classCode} (${asg.subject}) sebelum ${dueLabel}.`
        : `Pengingat jam 7 malam (19:00) aktif untuk tugas ${asg.classCode} · batas ${dueLabel}.`,
      time: isAfter7Pm ? '19:00 · Aktif' : 'Jam 19:00',
      unread: true,
      category: 'Assignments',
      targetPage: 'assignments',
      targetId: asg.id,
      theme: asg.theme,
      reminderTag: isAfter7Pm ? 'Pengingat 19:00 · Aktif' : 'Pengingat 19:00',
      sourceType: 'assignment',
      isReminder: true,
    };
    activeRemindersFirst.push(sevenPmItem);

    // H-1 (Sehari Sebelumnya) Reminder for Assignment
    const h1Item: NotificationItem = {
      id: `auto-asg-h1-${asg.id}`,
      title: isH1Start
        ? `Reminder H-1 Mulai Tugas: ${asg.title}`
        : `Reminder H-1 Tugas: ${asg.title}`,
      desc: isH1Start
        ? `Besok tugas ${asg.classCode} mulai otomatis (${formatScheduleDateLabel(asg.startDate)}).`
        : isH1Deadline
        ? `Besok batas pengumpulan terakhir (${dueLabel}) untuk ${asg.classCode}.`
        : `Pengingat H-1 aktif 1 hari sebelum batas tugas (${dueLabel}).`,
      time: isH1Active ? 'Besok (H-1)' : 'H-1 sebelum batas',
      unread: isH1Active,
      category: 'Assignments',
      targetPage: 'assignments',
      targetId: asg.id,
      theme: asg.theme,
      reminderTag: isH1Active ? 'Reminder H-1 · Besok' : 'Reminder H-1',
      sourceType: 'assignment',
      isReminder: true,
    };
    if (isH1Active) {
      activeRemindersFirst.push(h1Item);
    } else {
      upcomingEntries.push(h1Item);
    }

    // Main Assignment notification entry
    upcomingEntries.push({
      id: `auto-asg-${asg.id}`,
      title: `Tugas ${asg.classCode}: ${asg.title}`,
      desc: `${asg.subject} · Batas ${dueLabel}.`,
      time: isTodayDeadline
        ? 'Hari ini'
        : isH1Deadline
        ? 'Besok'
        : dueLabel,
      unread: asg.status === 'Needs Grading' || isTodayDeadline || isH1Active,
      category: 'Assignments',
      targetPage: 'assignments',
      targetId: asg.id,
      theme: asg.theme,
      reminderTag: isTodayDeadline
        ? 'Deadline Hari Ini'
        : asg.status === 'Needs Grading'
        ? 'Perlu Dinilai'
        : 'Tugas Aktif',
      sourceType: 'assignment',
      isReminder: false,
    });
  });

  // 2. Schedules (including Exam-type Schedules): Notification + H-1 Reminder
  schedules.forEach((sch) => {
    const isExamSchedule = sch.type.trim().toLowerCase() === 'exam';
    const diffDays = getNextScheduleDiffDays(sch.day, sch.endHour, now);
    const classLabel =
      sch.classCode === 'All'
        ? 'All Classes'
        : `Class ${sch.classCode.replace(/^Class\s+/i, '')}`;
    const dayId = DAY_LABELS_ID[sch.day] || sch.day;
    const h1DayId = H1_DAY_LABELS_ID[sch.day] || 'H-1';
    const isTomorrow = diffDays === 1;
    const isToday = diffDays === 0;

    // H-1 Reminder entry
    const schH1Item: NotificationItem = {
      id: `auto-sch-h1-${sch.id}`,
      title: `Reminder H-1 ${isExamSchedule ? 'Ujian' : 'Jadwal'}: ${sch.subject}`,
      desc: isTomorrow
        ? `Besok (${dayId}) pukul ${sch.startHour}–${sch.endHour} di ${sch.room} · ${classLabel}.`
        : `Pengingat H-1 dikirim setiap ${h1DayId} (sehari sebelum ${dayId} ${sch.startHour}) · ${classLabel}.`,
      time: isTomorrow ? 'Besok (H-1)' : `H-1 · ${h1DayId}`,
      unread: isTomorrow,
      category: isExamSchedule ? 'Exams' : 'Schedule',
      targetPage: 'schedule',
      theme: sch.theme,
      reminderTag: isTomorrow ? 'Reminder H-1 · Besok' : 'Reminder H-1',
      sourceType: isExamSchedule ? 'exam' : 'schedule',
      isReminder: true,
    };
    if (isTomorrow) {
      activeRemindersFirst.push(schH1Item);
    } else {
      upcomingEntries.push(schH1Item);
    }

    // Main Schedule notification entry
    upcomingEntries.push({
      id: `auto-sch-${sch.id}`,
      title: isExamSchedule
        ? `Jadwal Ujian: ${sch.subject}`
        : `Jadwal: ${sch.subject}`,
      desc: `${dayId}, ${sch.startHour}–${sch.endHour} · ${sch.room} (${classLabel}).`,
      time: isToday
        ? `Hari ini · ${sch.startHour}`
        : isTomorrow
        ? `Besok · ${sch.startHour}`
        : `${sch.day} · ${sch.startHour}`,
      unread: isToday || isTomorrow,
      category: isExamSchedule ? 'Exams' : 'Schedule',
      targetPage: 'schedule',
      theme: sch.theme,
      reminderTag: isToday
        ? 'Hari Ini'
        : isTomorrow
        ? 'Besok'
        : isExamSchedule
        ? 'Exam'
        : 'Schedule',
      sourceType: isExamSchedule ? 'exam' : 'schedule',
      isReminder: false,
    });
  });

  // 3. Exams (UPCOMING_EXAMS + Exams list): Notification + H-1 Reminder
  const seenExamKeys = new Set<string>();

  UPCOMING_EXAMS.forEach((item) => {
    const key = `${item.title.toLowerCase()}|${item.classCode.toLowerCase()}`;
    seenExamKeys.add(key);
    const isTomorrow = /\b1\s*day\b|besok|tomorrow/i.test(item.daysLeft);

    const examH1Item: NotificationItem = {
      id: `auto-uexam-h1-${item.id}`,
      title: `Reminder H-1 Ujian: ${item.title}`,
      desc: isTomorrow
        ? `Ujian Class ${item.classCode} berlangsung besok (${item.dateStr}).`
        : `Pengingat H-1 otomatis aktif 1 hari sebelum ujian Class ${item.classCode} (${item.dateStr}).`,
      time: isTomorrow ? 'Besok (H-1)' : 'H-1 sebelum ujian',
      unread: isTomorrow,
      category: 'Exams',
      targetPage: 'exams',
      theme: item.theme,
      reminderTag: isTomorrow ? 'Reminder H-1 · Besok' : 'Reminder H-1',
      sourceType: 'exam',
      isReminder: true,
    };
    if (isTomorrow) {
      activeRemindersFirst.push(examH1Item);
    } else {
      upcomingEntries.push(examH1Item);
    }

    upcomingEntries.push({
      id: `auto-uexam-${item.id}`,
      title: `Ujian ${item.title} · Class ${item.classCode}`,
      desc: `Jadwal pelaksanaan: ${item.dateStr}.`,
      time: item.daysLeft,
      unread: isTomorrow,
      category: 'Exams',
      targetPage: 'exams',
      theme: item.theme,
      reminderTag: 'Exam',
      sourceType: 'exam',
      isReminder: false,
    });
  });

  exams.forEach((exam) => {
    const key = `${exam.title.toLowerCase()}|${exam.classCode.toLowerCase()}`;
    if (seenExamKeys.has(key)) return;
    seenExamKeys.add(key);

    const examDateObj = new Date(now.getFullYear(), now.getMonth(), exam.day);
    const diffDays = getCalendarDiffDays(examDateObj, now);
    const isTomorrow = diffDays === 1;
    const isToday = diffDays === 0;

    const examH1Item: NotificationItem = {
      id: `auto-exam-h1-${exam.id}`,
      title: `Reminder H-1 Ujian: ${exam.title}`,
      desc: isTomorrow
        ? `Ujian Class ${exam.classCode} (${exam.grade}) berlangsung besok pukul ${exam.time}.`
        : `Pengingat H-1 aktif 1 hari sebelum ujian Class ${exam.classCode} · ${exam.time}.`,
      time: isTomorrow ? 'Besok (H-1)' : 'H-1 sebelum ujian',
      unread: isTomorrow,
      category: 'Exams',
      targetPage: 'exams',
      theme: exam.theme,
      reminderTag: isTomorrow ? 'Reminder H-1 · Besok' : 'Reminder H-1',
      sourceType: 'exam',
      isReminder: true,
    };
    if (isTomorrow) {
      activeRemindersFirst.push(examH1Item);
    } else {
      upcomingEntries.push(examH1Item);
    }

    upcomingEntries.push({
      id: `auto-exam-${exam.id}`,
      title: `Ujian ${exam.title} · Class ${exam.classCode}`,
      desc: `${exam.grade} · Pukul ${exam.time} · ${exam.students} peserta (${exam.status}).`,
      time: isToday ? 'Hari ini' : isTomorrow ? 'Besok' : `Tgl ${exam.day}`,
      unread: isToday || isTomorrow,
      category: 'Exams',
      targetPage: 'exams',
      theme: exam.theme,
      reminderTag: 'Exam',
      sourceType: 'exam',
      isReminder: false,
    });
  });

  return [...activeRemindersFirst, ...upcomingEntries];
}
