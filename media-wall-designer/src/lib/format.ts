import type { ProjectStatus } from '@shared/types';

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  lead: 'Lead', measured: 'Measured', designing: 'Designing', proposed: 'Proposed',
  approved: 'Approved', scheduled: 'Scheduled', in_progress: 'In progress', complete: 'Complete', lost: 'Lost',
};

export const STATUS_TONE: Record<ProjectStatus, string> = {
  lead: 'slate', measured: 'slate', designing: '', proposed: 'gold', approved: 'ok',
  scheduled: 'ok', in_progress: 'gold', complete: 'ok', lost: 'rust',
};

export const STATUS_ORDER: ProjectStatus[] = ['lead', 'measured', 'designing', 'proposed', 'approved', 'scheduled', 'in_progress', 'complete', 'lost'];

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const day = 86_400_000;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} min ago`;
  if (diff < day) return `${Math.floor(diff / 3_600_000)} h ago`;
  if (diff < day * 7) return `${Math.floor(diff / day)} d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: diff > day * 300 ? 'numeric' : undefined });
}

export const fullDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}
