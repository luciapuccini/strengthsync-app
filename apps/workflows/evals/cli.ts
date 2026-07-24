/**
 * Manual eval CLI.
 *
 *   pnpm eval:score  -- --step generate_next_week
 *   pnpm eval:replay -- --step generate_plan|generate_next_week --limit 3
 *
 * score: deterministic LightProgression only (no model tokens).
 * replay: braintrust eval (LLM + scorers).
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import weekFixtures from "./fixtures/week-generation.json";
import { scoreLightProgression } from "./scorers/light-progression.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Step = "generate_plan" | "generate_next_week";

function parseArgs(argv: string[]) {
  const args = {
    step: undefined as Step | undefined,
    limit: undefined as number | undefined,
  };
  const cleaned = argv.filter((a) => a !== "--");
  for (let i = 0; i < cleaned.length; i++) {
    const a = cleaned[i];
    if (a === "--step") {
      args.step = cleaned[++i] as Step;
    } else if (a === "--limit") {
      args.limit = Number(cleaned[++i]);
    }
  }
  return args;
}

function requireStep(step: Step | undefined): Step {
  if (step !== "generate_plan" && step !== "generate_next_week") {
    console.error("Required: --step generate_plan|generate_next_week");
    process.exit(1);
  }
  return step;
}

function runScore(step: Step) {
  if (step !== "generate_next_week") {
    console.error(
      "eval:score currently supports --step generate_next_week only",
    );
    process.exit(1);
  }

  let failed = 0;
  for (const tc of weekFixtures) {
    if (!("sample_output" in tc) || !tc.sample_output) {
      console.log(`[skip] ${tc.id}: no sample_output`);
      continue;
    }
    const result = scoreLightProgression({
      inputWeekSchedule: tc.input.week.schedule,
      outputSchedule: tc.sample_output.schedule,
    });
    if (result === null) {
      console.log(`[skip] ${tc.id}: LightProgression not applicable`);
      continue;
    }
    const label = result.score === 1 ? "PASS" : "FAIL";
    if (result.score !== 1) failed += 1;
    console.log(
      `[${label}] ${tc.id} LightProgression=${result.score}`,
      result.metadata,
    );
  }

  if (failed > 0) process.exit(1);
}

function runReplay(step: Step, limit: number | undefined) {
  const evalFile =
    step === "generate_plan"
      ? join(__dirname, "plan-generation.eval.ts")
      : join(__dirname, "week-generation.eval.ts");

  const env = {
    ...process.env,
    ...(limit !== undefined ? { EVAL_LIMIT: String(limit) } : {}),
  };

  const result = spawnSync("pnpm", ["exec", "braintrust", "eval", evalFile], {
    cwd: join(__dirname, ".."),
    env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  process.exit(result.status ?? 1);
}

const mode = process.argv[2];
const parsed = parseArgs(process.argv.slice(3));
const step = requireStep(parsed.step);

if (mode === "score") {
  runScore(step);
} else if (mode === "replay") {
  if (parsed.limit !== undefined && !(parsed.limit > 0)) {
    console.error("--limit must be a positive number");
    process.exit(1);
  }
  runReplay(step, parsed.limit);
} else {
  console.error("Usage: eval-cli score|replay -- --step <step> [--limit N]");
  process.exit(1);
}
