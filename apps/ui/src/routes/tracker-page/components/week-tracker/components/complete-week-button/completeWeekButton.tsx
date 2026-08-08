import { useEffect, useState } from "react";
import type { JSX } from "react";
import { toast } from "sonner";

// Migrating to CF API
// import { startWeeklyProgression } from "@/api/client";
import { startWeeklyProgression } from "@/api/cf-api/complete-week";

import { Button } from "@/shadcn/ui/button";
import { Spinner } from "@/shadcn/ui/spinner";
import {
  completeWeekCooldownRemaining,
  // startCompleteWeekCooldown,
} from "@/utils/completeWeekCooldown";
// import { waitForWorkflow } from "@/api/workflowPolling";
import { useAppStore } from "@/store/useAppStore";

export function CompleteWeekButton(): JSX.Element {
  // const refreshTracker = useAppStore((s) => s.refreshTracker);
  const clientId = useAppStore((s) => s.client?.id)!;
  // const weekId = useAppStore((s) => s.week?.id)!;

  const [isRunning, setIsRunning] = useState(false);
  // const [result, setResult] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(() =>
    completeWeekCooldownRemaining(clientId),
  );

  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = window.setTimeout(
      () => setCooldownRemaining(0),
      cooldownRemaining,
    );
    return () => window.clearTimeout(timer);
  }, [cooldownRemaining]);

  async function completeWeek(): Promise<void> {
    // setIsRunning(true);
    // setResult(null);
    try {
      const { instanceId, details } = await startWeeklyProgression(clientId);
      console.log("started", instanceId, details);
      // setResult(details.status);
      // const status = await waitForWorkflow(started.workflow_id);
      // if (status.status === "running")
      //   throw new Error("The workflow is still running.");
      // if (status.status === "failed") throw new Error(status.error.message);
      // const resultValue = status.result;
      // const message =
      //   "plan_complete" in resultValue && resultValue.plan_complete
      //     ? "Plan complete. Generate your next block when you are ready."
      //     : "Week complete. Your next week is ready.";

      //     setCooldownRemaining(startCompleteWeekCooldown(clientId));

      //     setResult(message);

      // await refreshTracker();

      toast.success("Week complete triggered");
    } catch (error) {
      toast.error("Could not complete the week", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  }

  if (cooldownRemaining > 0) return <></>;

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        className="min-h-11 px-3"
        disabled={isRunning}
        onClick={completeWeek}
      >
        {isRunning && <Spinner />}
        {isRunning ? "Analyzing…" : "Complete week"}
      </Button>
      {/* {result !== null && (
        <p className="max-w-60 text-right text-xs text-primary">{result}</p>
      )} */}
    </div>
  );
}
