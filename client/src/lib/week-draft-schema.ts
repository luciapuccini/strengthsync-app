import { z } from "zod";

/**
 * UI-local schema for validating week drafts stored in localStorage.
 *
 * This is deliberately NOT the wire contract. Its job is to reject corrupt or
 * garbage drafts and accept drafts the UI itself writes. The wire shape is
 * enforced by the server and typed on the client via `api/openapi.d.ts`.
 */

const UuidSchema = z.string().uuid();
const ISODateSchema = z.string().date();
const ISODateTimeSchema = z.string().datetime();

const DayTypeSchema = z.enum([
  "upper_body",
  "leg_day",
  "rest",
  "swimming",
  "cardio",
]);

const ExerciseFeedbackSchema = z.enum(["easy", "hard", "heavy", "light"]);

const PerformedSetSchema = z.object({
  performed_reps: z.number().int().nonnegative(),
  performed_weight_kg: z.number().nonnegative().nullable(),
});

const ExerciseLogSchema = z.object({
  exercise_key: z.string().min(1),
  name: z.string().min(1),
  skipped: z.boolean(),
  feedback: ExerciseFeedbackSchema.nullable(),
  prescribed: z.object({
    series: z.number().int().positive(),
    reps: z.number().int().positive(),
    rest_time_sec: z.number().int().nonnegative(),
    weight_kg: z.number().nonnegative().nullable(),
    notes: z.string().nullable(),
  }),
  sets: z.array(PerformedSetSchema),
});

const WeekDaySchema = z.object({
  day_index: z.number().int().min(1).max(7),
  date: ISODateSchema,
  type: DayTypeSchema,
  notes: z.string().nullable(),
  completed: z.boolean(),
  completed_at: ISODateTimeSchema.nullable(),
  exercises: z.array(ExerciseLogSchema),
});

export const WeekSchema = z.object({
  id: UuidSchema,
  client_id: UuidSchema,
  plan_id: UuidSchema,
  week_index: z.number().int().positive(),
  start_date: ISODateSchema,
  end_date: ISODateSchema,
  status: z.enum(["in_flight", "completed", "abandoned"]),
  schedule: z.array(WeekDaySchema),
  created_at: ISODateTimeSchema,
  updated_at: ISODateTimeSchema,
});

export type Week = z.infer<typeof WeekSchema>;
