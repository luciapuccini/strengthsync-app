//AnalyzeWeekPromptInput
export function buildAnalyzeWeekPrompt(input: unknown): {
  system: string;
  prompt: string;
} {
  // WIP:
  console.log({ input });
  return {
    system: [
      "You are a strength coach analyzing one completed training week.",
      "Produce actionable guidance for generating the next week: adherence, skipped work,",
      "easy/hard/heavy/light feedback, performed sets versus prescription, and fatigue signals.",
      "Days with completed:false mean the athlete did not finish those sessions and missed targets;",
      "reflect reduced adherence in next-week guidance. Do not invent missing performance data.",
      "Do not prescribe the next schedule yet.",
    ].join(" "),
    prompt: JSON.stringify(
      {
        // coaching_rules: input.coaching_rules,
        // profile: compactProfile(input.profile),
        // active_plan: compactPlan(input.active_plan),
        // completed_week: compactWeek(input.week),
      },
      null,
      2,
    ),
  };
}
