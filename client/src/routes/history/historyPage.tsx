import { use, useState } from "react";
import type { JSX } from "react";

import { completedWeeksResource } from "@/api/historyResource";
import { HistoryDaySection } from "@/routes/history/components/history-day-section/historyDaySection";
import { toWeekHistory } from "@/routes/history/toWeekHistory";
import { Button } from "@/shadcn/ui/button";
import { formatIsoDate } from "@/utils/formatIsoDate";

export function HistoryPage(): JSX.Element {
  // No parameters: the resource resolves the signed-in client's active plan.
  const { weeks, plan } = use(completedWeeksResource());
  const history = toWeekHistory(weeks, plan?.total_weeks ?? 0);
  const [page, setPage] = useState(() => Math.max(0, history.length - 1));

  // No active plan and no completed weeks read the same on this screen: there
  // is nothing to page through either way.
  if (history.length === 0) {
    return <p className="text-sm text-muted-foreground">No completed weeks.</p>;
  }

  const index = Math.min(page, history.length - 1);
  const week = history[index]!;
  const sn = `S${week.week_index}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">
          Week {sn} / S{week.total_weeks}{" "}
          <span className="text-base font-normal text-muted-foreground">
            {formatIsoDate(week.start_date)} – {formatIsoDate(week.end_date)}
          </span>
        </h1>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index === 0}
            onClick={() => setPage(index - 1)}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={index >= history.length - 1}
            onClick={() => setPage(index + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {week.days.map((day) => (
        <HistoryDaySection key={day.day_index} day={day} sn={sn} />
      ))}
    </div>
  );
}
