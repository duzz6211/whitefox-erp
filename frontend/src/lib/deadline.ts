export type DeadlineUrgency = 'overdue' | 'today' | 'soon' | 'this_week' | 'later' | 'none';

export function deadlineUrgency(deadline: string | null | undefined): DeadlineUrgency {
  if (!deadline) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diffMs = d.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 2) return 'soon';
  if (diffDays <= 7) return 'this_week';
  return 'later';
}

export function deadlineLabel(deadline: string | null | undefined): string {
  if (!deadline) return '마감일 없음';
  const u = deadlineUrgency(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline + 'T00:00:00');
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (u === 'overdue') return `${Math.abs(diffDays)}일 지남`;
  if (u === 'today') return '오늘 마감';
  if (u === 'soon') return `${diffDays}일 남음`;
  if (u === 'this_week') return `${diffDays}일 남음`;
  return `${diffDays}일 남음`;
}

export const URGENCY_COLORS: Record<DeadlineUrgency, string> = {
  overdue: 'bg-rose-100 text-rose-800 border-rose-300',
  today: 'bg-orange-100 text-orange-800 border-orange-300',
  soon: 'bg-amber-100 text-amber-800 border-amber-300',
  this_week: 'bg-yellow-50 text-yellow-800 border-yellow-200',
  later: 'bg-slate-50 text-slate-600 border-slate-200',
  none: 'bg-slate-50 text-slate-400 border-slate-200',
};

export function daysInStatus(statusChangedAt: string): number {
  const changed = new Date(statusChangedAt);
  const now = new Date();
  const diffMs = now.getTime() - changed.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}
