import { isAbsolute, relative, resolve } from 'node:path';

export type Task = {
  id: string;
  prompt: string;
  core_files: string[];
  optional_files: string[];
  required_facts: string[][];
};

type ContentBlock =
  | { type: 'tool_use'; id: string; name: string; input: { file_path?: string } }
  | {
      type: 'tool_result';
      tool_use_id: string;
      content: string | { type: string; text?: string }[];
    }
  | { type: string };

export type StreamEvent = {
  type: string;
  message?: { content: string | ContentBlock[] };
  result?: string;
};

export type ExplorationMetrics = {
  answerPassed: boolean;
  hitFileRate: number;
  noiseFileRate: number;
  stepsToFirstCoreRead: number | null;
  contextEfficiency: number;
};

type Read = { path: string; lines: number };

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function parseTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) throw new Error('tasks.json must be an array');
  return raw.map((task: Record<string, unknown>, index) => {
    const valid =
      typeof task.id === 'string' &&
      typeof task.prompt === 'string' &&
      isStringList(task.core_files) &&
      task.core_files.length > 0 &&
      isStringList(task.optional_files) &&
      Array.isArray(task.required_facts) &&
      task.required_facts.every((fact) => isStringList(fact) && fact.length > 0);
    if (!valid) {
      throw new Error(
        `tasks.json[${index}] needs id, prompt, core_files (non-empty), optional_files and required_facts (lists of alternatives)`,
      );
    }
    return task as Task;
  });
}

function blocks(event: StreamEvent): ContentBlock[] {
  return Array.isArray(event.message?.content) ? event.message.content : [];
}

function toolUses(events: StreamEvent[]) {
  return events
    .filter((event) => event.type === 'assistant')
    .flatMap(blocks)
    .filter((block) => block.type === 'tool_use') as Extract<ContentBlock, { type: 'tool_use' }>[];
}

function resultText(content: Extract<ContentBlock, { type: 'tool_result' }>['content']): string {
  if (typeof content === 'string') return content;
  return content.map((part) => part.text ?? '').join('\n');
}

function countLines(text: string): number {
  return text === '' ? 0 : text.replace(/\n$/, '').split('\n').length;
}

function normalizePath(repo: string, filePath: string): string {
  const path = relative(resolve(repo), resolve(repo, filePath));
  return path.startsWith('..') || isAbsolute(path) ? filePath : path;
}

function readCalls(events: StreamEvent[], repo: string) {
  return toolUses(events).flatMap((use, index) =>
    use.name === 'Read' && use.input.file_path
      ? [{ id: use.id, step: index + 1, path: normalizePath(repo, use.input.file_path) }]
      : [],
  );
}

function reads(events: StreamEvent[], repo: string): Read[] {
  const results = new Map<string, string>();
  for (const block of events.filter((event) => event.type === 'user').flatMap(blocks)) {
    if (block.type === 'tool_result') {
      const result = block as Extract<ContentBlock, { type: 'tool_result' }>;
      results.set(result.tool_use_id, resultText(result.content));
    }
  }
  return readCalls(events, repo).map((call) => ({
    path: call.path,
    lines: countLines(results.get(call.id) ?? ''),
  }));
}

export function answerPassed(answer: string, task: Task): boolean {
  const text = answer.toLowerCase();
  return task.required_facts.every((fact) =>
    fact.some((alternative) => text.includes(alternative.toLowerCase())),
  );
}

export function hitFileRate(readPaths: string[], task: Task): number {
  const opened = new Set(readPaths);
  return task.core_files.filter((file) => opened.has(file)).length / task.core_files.length;
}

export function noiseFileRate(readPaths: string[], task: Task): number {
  const opened = new Set(readPaths);
  if (opened.size === 0) return 0;
  const known = new Set([...task.core_files, ...task.optional_files]);
  return [...opened].filter((file) => !known.has(file)).length / opened.size;
}

export function stepsToFirstCoreRead(events: StreamEvent[], repo: string, task: Task) {
  const first = readCalls(events, repo).find((call) => task.core_files.includes(call.path));
  return first?.step ?? null;
}

export function contextEfficiency(fileReads: Read[], task: Task): number {
  const known = new Set([...task.core_files, ...task.optional_files]);
  const total = fileReads.reduce((sum, read) => sum + read.lines, 0);
  if (total === 0) return 0;
  const useful = fileReads
    .filter((read) => known.has(read.path))
    .reduce((sum, read) => sum + read.lines, 0);
  return useful / total;
}

export function explorationMetrics(
  events: StreamEvent[],
  repo: string,
  task: Task,
  isError: boolean,
): ExplorationMetrics {
  const fileReads = reads(events, repo);
  const readPaths = fileReads.map((read) => read.path);
  const answer = events.findLast((event) => event.type === 'result')?.result ?? '';
  return {
    answerPassed: !isError && answerPassed(answer, task),
    hitFileRate: hitFileRate(readPaths, task),
    noiseFileRate: noiseFileRate(readPaths, task),
    stepsToFirstCoreRead: stepsToFirstCoreRead(events, repo, task),
    contextEfficiency: contextEfficiency(fileReads, task),
  };
}
