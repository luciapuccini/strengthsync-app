import { z } from 'zod';

/**
 * Core domain entities and value types, as Zod schemas.
 * Source of truth: docs/architecture/domain_model.md.
 *
 * The five SQL records are Coach → Client → ClientProfile / Plan / Week.
 * `Plan.week_template` and `Week.schedule` are JSON columns validated by
 * these schemas at every API/persistence boundary.
 *
 * Every measurement here is imperial — pounds and inches — and says so in its
 * field name. That is the canonical unit for storage, transport and prompts
 * alike; kilograms exist only as something the client renders. The suffix is
 * load-bearing rather than decorative: these values end up inside free-form
 * JSON blobs that nothing type-checks and inside prompts the model reads
 * literally, so the unit has to travel with the value.
 */

export const UuidSchema = z.uuid();
export const ISODateSchema = z.iso.date();
export const ISODateTimeSchema = z.iso.datetime();

export type Uuid = z.infer<typeof UuidSchema>;
export type ISODate = z.infer<typeof ISODateSchema>;
export type ISODateTime = z.infer<typeof ISODateTimeSchema>;

export const DAY_TYPES = [
  'upper_body',
  'leg_day',
  'full_body',
  'rest',
  'activity',
  'cardio',
] as const;
export const CLIENT_STATUSES = ['active', 'archived'] as const;
export const PLAN_STATUSES = ['draft', 'active', 'archived'] as const;
export const WEEK_STATUSES = ['in_flight', 'completed', 'abandoned'] as const;
export const EXERCISE_FEEDBACKS = ['easy', 'hard', 'heavy', 'light'] as const;
/** Which units an athlete reads in. Storage is imperial either way. */
export const UNIT_PREFERENCES = ['imperial', 'metric'] as const;

export const DayTypeSchema = z.enum(DAY_TYPES);
export const ClientStatusSchema = z.enum(CLIENT_STATUSES);
export const PlanStatusSchema = z.enum(PLAN_STATUSES);
export const WeekStatusSchema = z.enum(WEEK_STATUSES);
export const ExerciseFeedbackSchema = z.enum(EXERCISE_FEEDBACKS);
export const UnitPreferenceSchema = z.enum(UNIT_PREFERENCES);

export type DayType = z.infer<typeof DayTypeSchema>;
export type ClientStatus = z.infer<typeof ClientStatusSchema>;
export type PlanStatus = z.infer<typeof PlanStatusSchema>;
export type WeekStatus = z.infer<typeof WeekStatusSchema>;
export type ExerciseFeedback = z.infer<typeof ExerciseFeedbackSchema>;
export type UnitPreference = z.infer<typeof UnitPreferenceSchema>;

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

export interface JsonObject {
  [key: string]: JsonValue;
}
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface JsonArray extends Array<JsonValue> {}
export type JsonValue = string | number | boolean | null | JsonArray | JsonObject;

/**
 * Free-form JSON columns: an object with string keys, values unvalidated.
 *
 * The runtime schema is deliberately NOT a recursive `z.lazy` union. That
 * version described the value shape precisely, but a recursive schema cannot be
 * rendered into OpenAPI without registering a named component to break the
 * cycle — the generator otherwise overflows the stack — which would force this
 * schema to be built in the route layer. The precision bought nothing: these
 * columns hold coach notes and measurements that no code reads structurally.
 *
 * The static type stays `JsonValue` because a recursive *type* costs nothing
 * and Cloudflare's `Serializable<T>` constraint on `step.do()` rejects
 * `unknown`. The cast is the seam between the two: values are trusted to be
 * JSON because the only writers are JSON request bodies and the JSON columns
 * themselves. Tighten this if something starts depending on their contents.
 */
const jsonRecord = z.record(z.string(), z.unknown()) as unknown as z.ZodType<
  Record<string, JsonValue>
>;

export const ClientProfileSchema = z.object({
  id: UuidSchema,
  client_id: UuidSchema,
  snapshot_date: ISODateSchema,
  sex: z.string().nullable(),
  age: z.number().int().positive().nullable(),
  height_in: z.number().positive().nullable(),
  goals: jsonRecord,
  body_composition: jsonRecord,
  strength_loads: jsonRecord,
  nutrition: jsonRecord.nullable(),
  /**
   * Whatever the client does outside lifting — swimming, cycling, a pilates
   * class. Free-form like its siblings, but the convention is `{ items: [...] }`
   * with each item shaped `{ name, sessions_per_week, days?, note? }`: a
   * declared activity's name, how often, which days (optional), and free text
   * (optional). Coaching rules use this to plan around a client's other sport
   * rather than stack training on top of it. Keep new writers on this shape
   * rather than inventing a second one.
   */
  activities: jsonRecord.nullable(),
  schedule_preferences: jsonRecord.nullable(),
  notes: z.string().nullable(),
  updated_at: ISODateTimeSchema,
});
export type ClientProfile = z.infer<typeof ClientProfileSchema>;

/** Editable subset of a profile: everything the caller owns. */
export const ClientProfileWriteSchema = ClientProfileSchema.omit({
  id: true,
  client_id: true,
  updated_at: true,
});
export type ClientProfileWrite = z.infer<typeof ClientProfileWriteSchema>;

export const PlannedExerciseSchema = z.object({
  /** Stable history key, e.g. `press_banca`. */
  exercise_key: z.string().min(1),
  name: z.string().min(1),
  series: z.number().int().positive(),
  reps: z.number().int().positive(),
  rest_time_sec: z.number().int().nonnegative(),
  weight_lb: z.number().nonnegative().nullable(),
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
  performed_weight_lb: z.number().nonnegative().nullable(),
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
    weight_lb: z.number().nonnegative().nullable(),
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

/**
 * One exercise as written by the athlete. Narrower than `ExerciseLog`: the
 * name and prescription come from the stored week, not from the writer.
 */
export const DayExerciseLogSchema = z.object({
  exercise_key: z.string().min(1),
  skipped: z.boolean(),
  feedback: ExerciseFeedbackSchema.nullable(),
  sets: z.array(PerformedSetSchema),
});
export type DayExerciseLog = z.infer<typeof DayExerciseLogSchema>;

/**
 * Write shape for one day of a week's schedule. The cross-field rule that a
 * skipped exercise carries no sets is enforced at the API boundary, in
 * `routes/weeks/schemas.ts`.
 */
export const DayLogPatchSchema = z.object({
  completed: z.boolean(),
  exercises: z.array(DayExerciseLogSchema),
});
export type DayLogPatch = z.infer<typeof DayLogPatchSchema>;
/** Athlete save: the server decides `completed`. */
export type DayLogSave = Pick<DayLogPatch, 'exercises'>;

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
