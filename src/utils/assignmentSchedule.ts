import { Assignment } from '../types';

export type AssignmentSchedulePhase = 'scheduled' | 'running' | 'ended';

export function toLocalDateTimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${mins}`;
}

export function relativeLocalDateTimeInput(offsetHours: number): string {
  return toLocalDateTimeInputValue(new Date(Date.now() + offsetHours * 3600 * 1000));
}

export function parseScheduleDateTime(value?: string): Date | null {
  if (!value || !value.trim()) return null;
  const trimmed = value.trim();
  // Handle YYYY-MM-DDTHH:mm as local time explicitly
  const localMatch = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (localMatch) {
    const [, y, m, d, hh, mm, ss] = localMatch;
    const dt = new Date(
      Number(y),
      Number(m) - 1,
      Number(d),
      Number(hh),
      Number(mm),
      Number(ss || 0),
      0
    );
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatScheduleDateLabel(value?: string): string {
  const dt = parseScheduleDateTime(value);
  if (!dt) return value || '-';
  return dt.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getAssignmentSchedulePhase(
  assignment: Pick<Assignment, 'startDate' | 'endDate'>,
  now: Date = new Date()
): AssignmentSchedulePhase {
  const start = parseScheduleDateTime(assignment.startDate);
  const end = parseScheduleDateTime(assignment.endDate);
  const nowMs = now.getTime();

  if (start && nowMs < start.getTime()) {
    return 'scheduled';
  }
  if (end && nowMs > end.getTime()) {
    return 'ended';
  }
  return 'running';
}

export function getEffectiveAssignmentStatus(
  assignment: Assignment,
  now: Date = new Date()
): 'Active' | 'Needs Grading' | 'Completed' {
  const phase = getAssignmentSchedulePhase(assignment, now);
  const hasNeedsReview = assignment.submissions.some(
    (s) => s.status === 'Needs Review'
  );

  if (hasNeedsReview) {
    return 'Needs Grading';
  }
  if (phase === 'ended') {
    return 'Completed';
  }
  return assignment.status === 'Completed' && !assignment.endDate
    ? 'Completed'
    : 'Active';
}

function formatDurationCompact(ms: number): string {
  const totalMins = Math.max(1, Math.round(ms / 60000));
  if (totalMins < 60) {
    return `${totalMins} mnt`;
  }
  const totalHours = Math.floor(totalMins / 60);
  const remMins = totalMins % 60;
  if (totalHours < 24) {
    return remMins > 0 ? `${totalHours} jam ${remMins} mnt` : `${totalHours} jam`;
  }
  const days = Math.floor(totalHours / 24);
  const remHours = totalHours % 24;
  return remHours > 0 ? `${days} hari ${remHours} jam` : `${days} hari`;
}

export function getRemainingScheduleLabel(
  assignment: Pick<Assignment, 'startDate' | 'endDate'>,
  now: Date = new Date()
): string {
  const phase = getAssignmentSchedulePhase(assignment, now);
  const start = parseScheduleDateTime(assignment.startDate);
  const end = parseScheduleDateTime(assignment.endDate);
  const nowMs = now.getTime();

  if (phase === 'scheduled' && start) {
    return `Autostart dalam ${formatDurationCompact(start.getTime() - nowMs)}`;
  }
  if (phase === 'ended') {
    return 'Sudah berakhir';
  }
  if (end) {
    return `Berakhir dalam ${formatDurationCompact(end.getTime() - nowMs)}`;
  }
  return 'Sedang aktif';
}
