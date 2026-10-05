import { z } from 'zod';

export const ProfileSummarySchema = z.object({
  summary: z.string().min(1),
});
export type ProfileSummary = z.infer<typeof ProfileSummarySchema>;

export const HistorySummarySchema = z.object({
  summary: z.string().min(1),
});
export type HistorySummary = z.infer<typeof HistorySummarySchema>;
