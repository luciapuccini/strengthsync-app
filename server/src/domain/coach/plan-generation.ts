import { z } from 'zod';

/**
 * LLM output schemas for plan generation. Prompts are built inline by the
 * Cloudflare Workflow in server/src/workflows.
 */

export const ProfileSummarySchema = z.object({
  summary: z.string().min(1),
});
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;

export const HistorySummarySchema = z.object({
  summary: z.string().min(1),
});
export type HistorySummary = z.infer<typeof HistorySummarySchema>;
