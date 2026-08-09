import type {
  WeeklyProgressionInput,
  WeeklyProgressionResult,
} from "@strengthsync/domain/contracts";

import type { WeeklyProgressionActivities } from "../activities/types.ts";

/**
 * Durable weekly-progression steps, factored out of the Temporal workflow
 * entrypoint so unit tests can simulate retries without a worker.
 */
export async function runWeeklyProgression(
  input: WeeklyProgressionInput,
  workflow_id: string,
  activities: WeeklyProgressionActivities,
): Promise<WeeklyProgressionResult> {
  await activities.completeWeekActivity({
    workflow_id,
    client_id: input.client_id,
    week_id: input.week_id,
  });

  const context = await activities.loadWeeklyContext({
    client_id: input.client_id,
    week_id: input.week_id,
  });

  const analysis = await activities.analyzeWeekActivity({
    workflow_id,
    client_id: input.client_id,
    context,
  });

  if (context.week.week_index >= context.active_plan.total_weeks) {
    return { next_week_id: null, plan_complete: true };
  }

  const schedule = await activities.generateNextWeekActivity({
    workflow_id,
    client_id: input.client_id,
    context,
    analysis,
  });

  const nextWeek = await activities.createNextWeekActivity({
    workflow_id,
    client_id: input.client_id,
    previous_week_id: input.week_id,
    schedule,
  });

  return { next_week_id: nextWeek.id, plan_complete: false };
}
