import { readFileSync } from 'node:fs';
import type { EvalResult, RunMetrics } from './run-agent-eval.ts';

const ratio = (n: number) => n.toFixed(2);

const METRICS = [
  { key: 'hitFileRate', label: 'hit_file_rate', better: 'higher', format: ratio },
  { key: 'noiseFileRate', label: 'noise_file_rate', better: 'lower', format: ratio },
  { key: 'contextEfficiency', label: 'Context efficiency', better: 'higher', format: ratio },
  { key: 'numTurns', label: 'Turns', better: 'lower', format: (n: number) => n.toFixed(1) },
  {
    key: 'durationMs',
    label: 'Duration (s)',
    better: 'lower',
    format: (n: number) => (n / 1000).toFixed(1),
  },
  {
    key: 'costUsd',
    label: 'Cost (USD)',
    better: 'lower',
    format: (n: number) => `$${n.toFixed(3)}`,
  },
] as const satisfies {
  key: keyof RunMetrics;
  label: string;
  better: 'higher' | 'lower';
  format: (n: number) => string;
}[];

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error('Usage: compare-results.ts <baseline.json> <candidate.json>');
}

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as EvalResult;
const baseline = read(baselinePath);
const candidate = read(candidatePath);

function median(values: number[]): number {
  const sorted = values.toSorted((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
}

function summary(values: number[], format: (n: number) => string): string {
  if (values.length === 0) return 'n/a';
  return `${format(median(values))} (${format(Math.min(...values))}–${format(Math.max(...values))})`;
}

const taskRuns = (result: EvalResult, taskId: string) =>
  result.runs.filter((run) => run.taskId === taskId);
const successful = (runs: RunMetrics[]) => runs.filter((run) => !run.isError);

function passRate(runs: RunMetrics[]): string {
  return `${runs.filter((run) => run.answerPassed).length}/${runs.length}`;
}

function firstCoreRead(runs: RunMetrics[]): string {
  const steps = successful(runs).flatMap((run) =>
    run.stepsToFirstCoreRead === null ? [] : [run.stepsToFirstCoreRead],
  );
  const never = successful(runs).length - steps.length;
  return `${summary(steps, (n) => n.toFixed(1))}, ${never} never`;
}

function failures(runs: RunMetrics[]): string {
  return String(runs.filter((run) => run.isError).length);
}

function taskTable(taskId: string): string[] {
  const before = taskRuns(baseline, taskId);
  const after = taskRuns(candidate, taskId);
  const row = (label: string, better: string, format: (runs: RunMetrics[]) => string) =>
    `| ${label} | ${better} | ${format(before)} | ${format(after)} |`;
  const metricRow = ({ key, label, better, format }: (typeof METRICS)[number]) =>
    row(label, better, (runs) =>
      summary(
        successful(runs).map((run) => run[key]),
        format,
      ),
    );
  const [hit, noise, context, turns, duration, cost] = METRICS;
  return [
    `#### ${taskId}`,
    '',
    `| Metric | Better | ${baseline.label} (\`${baseline.sha.slice(0, 7)}\`) | ${candidate.label} (\`${candidate.sha.slice(0, 7)}\`) |`,
    '| --- | --- | --- | --- |',
    row('Answer pass rate', 'higher', passRate),
    metricRow(hit),
    metricRow(noise),
    row('Steps to first core read', 'lower', firstCoreRead),
    metricRow(context),
    metricRow(turns),
    metricRow(duration),
    metricRow(cost),
    row('Failures', 'lower', failures),
    '',
  ];
}

const taskIds = [...new Set([...baseline.runs, ...candidate.runs].map((run) => run.taskId))];

console.log(
  [
    '### Repo agent benchmark',
    '',
    'Per task: median (min–max) over successful runs. Answer pass rate and failures count all runs.',
    '',
    ...taskIds.flatMap(taskTable),
  ].join('\n'),
);
