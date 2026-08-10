import { useState } from "react";
import type { JSX } from "react";
import { toast } from "sonner";

import { startWeeklyProgression } from "@/api/cf-api/complete-week";
import { Button } from "@/shadcn/ui/button";
import { Spinner } from "@/shadcn/ui/spinner";
import { useAppStore } from "@/store/useAppStore";

export function CompleteWeekButton(): JSX.Element {
  const clientId = useAppStore((s) => s.client?.id)!;
  const [isRunning, setIsRunning] = useState(false);

  async function completeWeek(): Promise<void> {
    // setIsRunning(true);
    try {
      const { instanceId, details } = await startWeeklyProgression(clientId);
      console.log("started", instanceId, details);
      toast.success("Week complete triggered");
    } catch (error) {
      toast.error("Could not complete the week", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <Button
      size="sm"
      className="min-h-11 px-3"
      disabled={isRunning}
      onClick={completeWeek}
    >
      {isRunning && <Spinner />}
      {isRunning ? "Analyzing…" : "Complete week"}
    </Button>
  );
}
