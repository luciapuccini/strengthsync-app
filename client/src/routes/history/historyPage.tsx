import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { use, useState } from 'react';
import type { JSX } from 'react';

import { completedWeeksResource } from '@/api/historyResource';
import type { Plan } from '@/api/types';
import { HistoryDaySection } from '@/routes/history/components/history-day-section/historyDaySection';
import { toHistoryCsv } from '@/routes/history/toHistoryCsv';
import { toWeekHistory } from '@/routes/history/toWeekHistory';
import { Button } from '@/shadcn/ui/button';
import { useUnitPreference } from '@/store/useUnitPreference';

/** `strengthsync-<plan-label-slug>-<YYYY-MM-DD>.csv`, with today's local date. */
function csvFileName(plan: Plan): string {
  const slug = plan.label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `strengthsync-${slug}-${now.getFullYear()}-${month}-${day}.csv`;
}

/** The browser saves the text as a file: a temporary object URL on a temporary link. */
function downloadCsv(csv: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export function HistoryPage(): JSX.Element {
  // No parameters: the resource resolves the signed-in client's active plan.
  const { weeks, plan } = use(completedWeeksResource());
  // `toWeekHistory` is pure and cannot read the store itself, so the preference
  // is read here and passed in — the week-over-week deltas depend on it.
  const unit = useUnitPreference();
  const history = toWeekHistory(weeks, plan?.total_weeks ?? 0, unit);
  const [page, setPage] = useState(() => Math.max(0, history.length - 1));

  // No active plan and no completed weeks read the same on this screen: there
  // is nothing to page through either way.
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed weeks.</p>;
  }

  const index = Math.min(page, history.length - 1);
  const week = history[index]!;
  const sn = `S${week.week_index}`;
  // Not null here: without a plan there are no completed weeks, and the page
  // returned above.
  const activePlan = plan!;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b pb-4">
        {/* Plan-level row: the export takes every completed week, not only the week on screen. */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{activePlan.label}</p>
            <p className="text-sm text-muted-foreground tabular-nums">
              {history.length} completed {history.length === 1 ? 'week' : 'weeks'}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-11 shrink-0"
            onClick={() =>
              downloadCsv(toHistoryCsv(weeks, activePlan, unit), csvFileName(activePlan))
            }
          >
            <Download aria-hidden="true" className="size-4" />
            Export CSV
          </Button>
        </div>
        {/* Week stepper: 44px arrows on both sides, so the thumb reaches each one. */}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Previous week"
            disabled={index === 0}
            onClick={() => setPage(index - 1)}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </Button>
          <h1 aria-live="polite" className="text-xl font-semibold tabular-nums">
            Week {week.week_index} of {week.total_weeks}
          </h1>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="Next week"
            disabled={index >= history.length - 1}
            onClick={() => setPage(index + 1)}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </Button>
        </div>
      </header>

      {week.days.map((day) => (
        <HistoryDaySection key={day.day_index} day={day} sn={sn} unit={unit} />
      ))}
    </div>
  );
}
