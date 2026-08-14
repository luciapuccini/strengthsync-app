import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

const { generateTextMock } = vi.hoisted(() => ({ generateTextMock: vi.fn() }));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => (model: string) => ({ modelId: model }),
}));

vi.mock('ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('ai')>();
  return { ...actual, generateText: generateTextMock };
});

const { getAgentRuntime } = await import('./agent-core.ts');

const OutSchema = z.object({ summary: z.string() });

const ANALYZE_WEEK_SYSTEM =
  'You are a strength coach analyzing one completed training week. Do not prescribe the next schedule yet.';
const GENERATE_PLAN_SYSTEM =
  'You are a strength coach generating a multi-week training plan. Follow the coaching rules.';

const usage = { inputTokens: 11, outputTokens: 7, totalTokens: 18 };

const DEFAULT_OUTPUT = { summary: 'trained four of five days' };

/** `output` is explicit rather than defaulted: `undefined` is the case that
 * makes `getAgentRuntime` throw, and a default would swallow it. */
function modelResult(output: unknown) {
  return {
    output,
    usage,
    finishReason: 'stop',
    finalStep: { response: { id: 'resp_abc', modelId: 'gpt-4.1-mini-2026-01-01' } },
  };
}

function config(overrides: Partial<Parameters<typeof getAgentRuntime>[0]> = {}) {
  return {
    apiKey: 'sk-test',
    model: 'gpt-4.1-mini',
    system: ANALYZE_WEEK_SYSTEM,
    prompt: '{"completed_week":1}',
    outSchema: OutSchema,
    ...overrides,
  };
}

let logSpy: ReturnType<typeof vi.spyOn>;
let logged: string[] = [];

function loggedLines(): Record<string, unknown>[] {
  return logged.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function onlyLine(): Record<string, unknown> {
  const lines = loggedLines();
  expect(lines).toHaveLength(1);
  return lines[0] as Record<string, unknown>;
}

beforeEach(() => {
  generateTextMock.mockReset();
  logged = [];
  logSpy = vi.spyOn(console, 'log').mockImplementation((line: unknown) => {
    logged.push(String(line));
  });
});

afterEach(() => {
  logSpy.mockRestore();
});

describe('getAgentRuntime logging', () => {
  it('emits one line per successful call with prompt, output, model, latency and usage', async () => {
    generateTextMock.mockResolvedValue(modelResult(DEFAULT_OUTPUT));

    await getAgentRuntime(config());

    const line = onlyLine();
    expect(line).toMatchObject({
      event: 'llm_call',
      status: 'ok',
      model: 'gpt-4.1-mini',
      system: ANALYZE_WEEK_SYSTEM,
      prompt: '{"completed_week":1}',
      prompt_chars: 20,
      output: { summary: 'trained four of five days' },
      usage,
      finish_reason: 'stop',
      response_id: 'resp_abc',
      response_model_id: 'gpt-4.1-mini-2026-01-01',
    });
    expect(typeof line.latency_ms).toBe('number');
    expect(line.latency_ms as number).toBeGreaterThanOrEqual(0);
    expect(line.error).toBeUndefined();
  });

  it('logs the error and rethrows when the model returns no structured output', async () => {
    generateTextMock.mockResolvedValue(modelResult(undefined));

    await expect(getAgentRuntime(config())).rejects.toThrow('model returned no structured output');

    const line = onlyLine();
    expect(line.status).toBe('error');
    expect(line.error).toEqual({ name: 'Error', message: 'model returned no structured output' });
    // The call was billed even though it produced nothing usable.
    expect(line.usage).toEqual(usage);
  });

  it('logs the error and rethrows when the provider call fails', async () => {
    generateTextMock.mockRejectedValue(new Error('429 rate limit exceeded'));

    await expect(getAgentRuntime(config())).rejects.toThrow('429 rate limit exceeded');

    const line = onlyLine();
    expect(line.status).toBe('error');
    expect(line.error).toEqual({ name: 'Error', message: '429 rate limit exceeded' });
    expect(line.usage).toBeUndefined();
    expect(line.prompt).toBe('{"completed_week":1}');
  });

  it('logs the raw output when it fails the schema', async () => {
    generateTextMock.mockResolvedValue(modelResult({ summary: 42 }));

    await expect(getAgentRuntime(config())).rejects.toThrow();

    const line = onlyLine();
    expect(line.status).toBe('error');
    expect(line.output).toEqual({ summary: 42 });
    expect(line.usage).toEqual(usage);
  });

  it('emits one line per attempt, so a retried step is more than one line', async () => {
    generateTextMock
      .mockRejectedValueOnce(new Error('503 upstream unavailable'))
      .mockResolvedValueOnce(modelResult(DEFAULT_OUTPUT));

    await expect(getAgentRuntime(config())).rejects.toThrow('503 upstream unavailable');
    await getAgentRuntime(config());

    const lines = loggedLines();
    expect(lines).toHaveLength(2);
    expect(lines.map((line) => line.status)).toEqual(['error', 'ok']);
    expect(lines[0]?.call_id).not.toBe(lines[1]?.call_id);
    expect(lines[0]?.call_site).toBe(lines[1]?.call_site);
  });

  it('caps an oversized prompt but keeps its real length', async () => {
    const prompt = 'x'.repeat(20_000);
    generateTextMock.mockResolvedValue(modelResult({ summary: 'y'.repeat(20_000) }));

    await getAgentRuntime(config({ prompt }));

    const line = onlyLine();
    expect(String(line.prompt)).toHaveLength(16_000);
    expect(line.prompt_chars).toBe(20_000);
    expect(String(line.output)).toHaveLength(16_000);
  });
});

describe('getAgentRuntime call sites', () => {
  it('tells analyze-week apart from generate-plan', async () => {
    generateTextMock.mockResolvedValue(modelResult(DEFAULT_OUTPUT));

    await getAgentRuntime(config());
    await getAgentRuntime(config({ system: GENERATE_PLAN_SYSTEM }));

    const [analyzeWeek, generatePlan] = loggedLines();
    expect(analyzeWeek?.call_site).toBe('strength-coach-analyzing-one-completed-training-week');
    expect(generatePlan?.call_site).toBe('strength-coach-generating-a-multi-week-training-plan');
    expect(analyzeWeek?.system_fingerprint).not.toBe(generatePlan?.system_fingerprint);
  });

  it('keeps one call site stable across calls and honours an explicit label', async () => {
    generateTextMock.mockResolvedValue(modelResult(DEFAULT_OUTPUT));

    await getAgentRuntime(config());
    await getAgentRuntime(config());
    await getAgentRuntime(config({ callSite: 'analyze-week' }));

    const [first, second, labelled] = loggedLines();
    expect(second?.call_site).toBe(first?.call_site);
    expect(second?.system_fingerprint).toBe(first?.system_fingerprint);
    expect(labelled?.call_site).toBe('analyze-week');
  });
});

describe('getAgentRuntime contract', () => {
  it('still returns exactly what the schema parses', async () => {
    generateTextMock.mockResolvedValue(modelResult({ summary: 'kept', extra: 'dropped' }));

    await expect(getAgentRuntime(config())).resolves.toEqual({ summary: 'kept' });
  });

  it('throws on a missing api key without pretending a call was made', async () => {
    await expect(getAgentRuntime(config({ apiKey: '' }))).rejects.toThrow(
      'OPENAI_API_KEY is required for workflow LLM activities',
    );

    expect(generateTextMock).not.toHaveBeenCalled();
    expect(loggedLines()).toHaveLength(0);
  });
});
