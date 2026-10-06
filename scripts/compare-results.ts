import { readFileSync } from 'node:fs';
import type { EvalResult, RunMetrics } from './run-agent-eval.ts';

const METRICS = [
  { key: 'numTurns', label: 'Turns', format: (n: number) => n.toFixed(1) },
  { key: 'durationMs', label: 'Duration (s)', format: (n: number) => (n / 1000).toFixed(1) },
  { key: 'costUsd', label: 'Cost (USD)', format: (n: number) => `$${n.toFixed(3)}` },
] as const satisfies { key: keyof RunMetrics; label: string; format: (n: number) => string }[];

const [baselinePath, candidatePath] = process.argv.slice(2);
if (!baselinePath || !candidatePath) {
  throw new Error('Usage: compare-results.ts <baseline.json> <candidate.json>');
}

const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as EvalResult;
const baseline = read(baselinePath);
const candidate = read(candidatePath);

function average(result: EvalResult, key: (typeof METRICS)[number]['key']): number {
  const ok = result.runs.filter((run) => !run.isError);
  return ok.reduce((sum, run) => sum + run[key], 0) / ok.length;
}

function delta(before: number, after: number): string {
  const percent = ((after - before) / before) * 100;
  return `${percent > 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

const errors = (result: EvalResult) => result.runs.filter((run) => run.isError).length;

const rows = METRICS.map(({ key, label, format }) => {
  const before = average(baseline, key);
  const after = average(candidate, key);
  return `| ${label} | ${format(before)} | ${format(after)} | ${delta(before, after)} |`;
});

console.log(
  [
    '### Repo agent benchmark',
    '',
    `Average over ${baseline.runs.length} runs per side. Lower is better.`,
    '',
    `| Metric | ${baseline.label} (\`${baseline.sha.slice(0, 7)}\`) | ${candidate.label} (\`${candidate.sha.slice(0, 7)}\`) | Change |`,
    '| --- | --- | --- | --- |',
    ...rows,
    `| Failed runs | ${errors(baseline)} | ${errors(candidate)} | |`,
  ].join('\n'),
);
