import { z } from "zod";

/**
 * Core domain entities and value types, as Zod schemas.
 * Source of truth: docs/architecture/domain_model.md.
 *
 * The five SQL records are Coach → Client → ClientProfile / Plan / Week.
 * `Plan.week_template` and `Week.schedule` are JSON columns validated by
 * these schemas at every API/persistence boundary.
 */

export const UuidSchema = z.uuid();
export const ISODateSchema = z.iso.date();
export const ISODateTimeSchema = z.iso.datetime();

export type Uuid = z.infer<typeof UuidSchema>;
export type ISODate = z.infer<typeof ISODateSchema>;
export type ISODateTime = z.infer<typeof ISODateTimeSchema>;

export const DAY_TYPES = [
  "upper_body",
  "leg_day",
  "rest",
  "swimming",
  "cardio",
] as const;
export const CLIENT_STATUSES = ["active", "archived"] as const;
export const PLAN_STATUSES = ["draft", "active", "archived"] as const;
export const WEEK_STATUSES = ["in_flight", "completed", "abandoned"] as const;
export const EXERCISE_FEEDBACKS = ["easy", "hard", "heavy", "light"] as const;

export const DayTypeSchema = z.enum(DAY_TYPES);
export const ClientStatusSchema = z.enum(CLIENT_STATUSES);
export const PlanStatusSchema = z.enum(PLAN_STATUSES);
export const WeekStatusSchema = z.enum(WEEK_STATUSES);
export const ExerciseFeedbackSchema = z.enum(EXERCISE_FEEDBACKS);

export type DayType = z.infer<typeof DayTypeSchema>;
export type ClientStatus = z.infer<typeof ClientStatusSchema>;
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
export type WeekStatus = z.infer<typeof WeekStatusSchema>;
export type ExerciseFeedback = z.infer<typeof ExerciseFeedbackSchema>;

const timestampFields = {
  created_at: ISODateTimeSchema,
  updated_at: ISODateTimeSchema,
} as const;

export const CoachSchema = z.object({
  id: UuidSchema,
  display_name: z.string().min(1),
  auth_subject_id: z.string().nullable(),
  ...timestampFields,
});
export type Coach = z.infer<typeof CoachSchema>;

export const ClientSchema = z.object({
  id: UuidSchema,
  coach_id: UuidSchema,
  display_name: z.string().min(1),
  status: ClientStatusSchema,
  ...timestampFields,
});
export type Client = z.infer<typeof ClientSchema>;

const jsonRecord = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

export const ClientProfileSchema = z.object({
  id: UuidSchema,
  client_id: UuidSchema,
  snapshot_date: ISODateSchema,
  sex: z.string().nullable(),
  age: z.number().int().positive().nullable(),
  height_cm: z.number().positive().nullable(),
  goals: jsonRecord,
  body_composition: jsonRecord,
  strength_loads: jsonRecord,
  nutrition: jsonRecord.nullable(),
  swimming: jsonRecord.nullable(),
  schedule_preferences: jsonRecord.nullable(),
  notes: z.string().nullable(),
  updated_at: ISODateTimeSchema,
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

export const PlannedExerciseSchema = z.object({
  /** Stable history key, e.g. `press_banca`. */
  exercise_key: z.string().min(1),
  name: z.string().min(1),
  series: z.number().int().positive(),
  reps: z.number().int().positive(),
  rest_time_sec: z.number().int().nonnegative(),
  weight_kg: z.number().nonnegative().nullable(),
  notes: z.string().nullable(),
});
export type PlannedExercise = z.infer<typeof PlannedExerciseSchema>;

export const PlanDaySchema = z.object({
  day_index: z.number().int().min(1).max(7),
  type: DayTypeSchema,
  notes: z.string().nullable(),
  exercises: z.array(PlannedExerciseSchema),
});
export type PlanDay = z.infer<typeof PlanDaySchema>;

export const PlanSchema = z.object({
  id: UuidSchema,
  client_id: UuidSchema,
  label: z.string().min(1),
  status: PlanStatusSchema,
  total_weeks: z.number().int().positive(),
  week_template: z.array(PlanDaySchema),
  rationale: z.string().nullable(),
  activated_at: ISODateTimeSchema.nullable(),
  ...timestampFields,
});
export type Plan = z.infer<typeof PlanSchema>;

export const PerformedSetSchema = z.object({
  performed_reps: z.number().int().nonnegative(),
  performed_weight_kg: z.number().nonnegative().nullable(),
});
export type PerformedSet = z.infer<typeof PerformedSetSchema>;

export const ExerciseLogSchema = z.object({
  /** Matches the plan exercise unless the week intentionally changes it. */
  exercise_key: z.string().min(1),
  name: z.string().min(1),
  /** The athlete did not perform this exercise this week. */
  skipped: z.boolean(),
  /** Controlled athlete feedback; not free-form coaching notes. */
  feedback: ExerciseFeedbackSchema.nullable(),
  prescribed: z.object({
    series: z.number().int().positive(),
    reps: z.number().int().positive(),
    rest_time_sec: z.number().int().nonnegative(),
    weight_kg: z.number().nonnegative().nullable(),
    notes: z.string().nullable(),
  }),
  /** One entry per performed set; can be empty before training. */
  sets: z.array(PerformedSetSchema),
});
export type ExerciseLog = z.infer<typeof ExerciseLogSchema>;

export const WeekDaySchema = z.object({
  day_index: z.number().int().min(1).max(7),
  date: ISODateSchema,
  type: DayTypeSchema,
  notes: z.string().nullable(),
  completed: z.boolean(),
  completed_at: ISODateTimeSchema.nullable(),
  exercises: z.array(ExerciseLogSchema),
});
export type WeekDay = z.infer<typeof WeekDaySchema>;

export const WeekSchema = z.object({
  id: UuidSchema,
  client_id: UuidSchema,
  plan_id: UuidSchema,
  week_index: z.number().int().positive(),
  start_date: ISODateSchema,
  end_date: ISODateSchema,
  status: WeekStatusSchema,
  /** Snapshot of the planned work for this week, including AI adjustments. */
  schedule: z.array(WeekDaySchema),
  ...timestampFields,
});
export type Week = z.infer<typeof WeekSchema>;
