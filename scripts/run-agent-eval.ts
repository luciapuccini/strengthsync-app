import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

type Task = { id: string; prompt: string };

export type RunMetrics = {
  taskId: string;
  run: number;
  numTurns: number;
  durationMs: number;
  costUsd: number;
  isError: boolean;
};

export type EvalResult = { label: string; sha: string; runs: RunMetrics[] };

const { values } = parseArgs({
  options: {
    repo: { type: 'string' },
    label: { type: 'string' },
    out: { type: 'string' },
    runs: { type: 'string', default: '3' },
    model: { type: 'string', default: 'sonnet' },
    tasks: {
      type: 'string',
      default: new URL('../agent-evals/tasks.json', import.meta.url).pathname,
    },
  },
});

if (!values.repo || !values.label || !values.out) {
  throw new Error('Usage: run-agent-eval.ts --repo <dir> --label <name> --out <file.json>');
}

const repo = values.repo;
const tasks = JSON.parse(readFileSync(values.tasks, 'utf8')) as Task[];
const trajectoryDir = join(
  dirname(values.out),
  'trajectories',
  values.label.replace(/[^\w.-]/g, '_'),
);
mkdirSync(trajectoryDir, { recursive: true });

function runClaude(task: Task, run: number): RunMetrics {
  const child = spawnSync(
    'claude',
    [
      '-p',
      task.prompt,
      '--model',
      values.model,
      '--output-format',
      'stream-json',
      '--verbose',
      '--max-turns',
      '40',
      '--allowedTools',
      'Read,Grep,Glob',
      '--disallowedTools',
      'Bash,Edit,Write,NotebookEdit,WebFetch,WebSearch',
    ],
    { cwd: repo, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  writeFileSync(join(trajectoryDir, `${task.id}-${run}.jsonl`), child.stdout);
  const output = child.stdout
    .split('\n')
    .filter((line) => line.trim())
    .map(
      (line) =>
        JSON.parse(line) as {
          type: string;
          num_turns: number;
          duration_ms: number;
          total_cost_usd: number;
          is_error: boolean;
          result?: string;
        },
    )
    .findLast((event) => event.type === 'result');
  if (!output || output.is_error || child.status !== 0) {
    console.error(
      `[${task.id}#${run}] exit=${child.status} result=${output?.result} stderr=${child.stderr}`,
    );
  }
  if (!output) {
    return { taskId: task.id, run, numTurns: 0, durationMs: 0, costUsd: 0, isError: true };
  }
  return {
    taskId: task.id,
    run,
    numTurns: output.num_turns,
    durationMs: output.duration_ms,
    costUsd: output.total_cost_usd,
    isError: output.is_error || child.status !== 0,
  };
}

const runs: RunMetrics[] = [];
for (const task of tasks) {
  for (let run = 1; run <= Number(values.runs); run++) {
    const metrics = runClaude(task, run);
    console.log(JSON.stringify(metrics));
    runs.push(metrics);
  }
}

const sha = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8' }).stdout.trim();
const result: EvalResult = { label: values.label, sha, runs };
mkdirSync(dirname(values.out), { recursive: true });
writeFileSync(values.out, JSON.stringify(result, null, 2));
