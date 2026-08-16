import { MockLanguageModelV4 } from 'ai/test';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { z } from 'zod';

/**
 * The mock stands in for the provider, not for `generateText`: the telemetry
 * lifecycle that produces the log lines runs inside `generateText`, so mocking
 * that away would test nothing.
 */
const { languageModel } = vi.hoisted(() => ({
  languageModel: { current: undefined as MockLanguageModelV4 | undefined },
}));

vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: () => () => languageModel.current,
}));

const { getAgentRuntime } = await import('./agent-core.ts');

const OutSchema = z.object({ summary: z.string() });

/** Provider-shaped usage; the SDK flattens it before it reaches telemetry. */
const usage = {
  inputTokens: { total: 11, noCache: 11, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 7, text: 7, reasoning: 0 },
};

function respondWith(text: string) {
  languageModel.current = new MockLanguageModelV4({
    provider: 'openai',
    modelId: 'gpt-4.1-mini',
    doGenerate: async () => ({
      content: [{ type: 'text' as const, text }],
      finishReason: { unified: 'stop' as const, raw: 'stop' },
      usage,
      response: { id: 'resp_abc', modelId: 'gpt-4.1-mini-2026-01-01', timestamp: new Date(0) },
      warnings: [],
    }),
  });
}

function failWith(error: Error) {
  languageModel.current = new MockLanguageModelV4({
    provider: 'openai',
    modelId: 'gpt-4.1-mini',
    doGenerate: async () => {
      throw error;
    },
  });
}

function config(overrides: Record<string, unknown> = {}) {
  return {
    apiKey: 'sk-test',
    model: 'gpt-4.1-mini',
    callSite: 'analyze-week',
    system: 'You are a strength coach analyzing one completed training week.',
    prompt: '{"completed_week":1}',
    outSchema: OutSchema,
    ...overrides,
  };
}

let logSpy: MockInstance<typeof console.log>;

function loggedLines(): Record<string, unknown>[] {
  return logSpy.mock.calls
    .map((call) => String(call[0]))
    .filter((line) => line.includes('"llm_call"'))
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function onlyLine(): Record<string, unknown> {
  const lines = loggedLines();
  expect(lines).toHaveLength(1);
  return lines[0] as Record<string, unknown>;
}

beforeEach(() => {
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  respondWith(JSON.stringify({ summary: 'trained four of five days' }));
});

afterEach(() => {
  logSpy.mockRestore();
  vi.restoreAllMocks();
});

describe('getAgentRuntime', () => {
  it('returns the structured output', async () => {
    await expect(getAgentRuntime(config())).resolves.toEqual({
      summary: 'trained four of five days',
    });
  });

  it('throws without an api key, and logs nothing', async () => {
    await expect(getAgentRuntime(config({ apiKey: '' }))).rejects.toThrow('OPENAI_API_KEY');
    expect(loggedLines()).toEqual([]);
  });

  it('rejects output the schema does not accept', async () => {
    respondWith(JSON.stringify({ summary: 42 }));
    await expect(getAgentRuntime(config())).rejects.toThrow();
  });
});

describe('llm_call logging', () => {
  it('emits exactly one line per successful call, carrying the cost data', async () => {
    await getAgentRuntime(config());

    const line = onlyLine();
    expect(line).toMatchObject({
      event: 'llm_call',
      call_site: 'analyze-week',
      status: 'ok',
      provider: 'openai',
      model: 'gpt-4.1-mini',
      // The cost data, the reason this exists.
      usage: expect.objectContaining({ inputTokens: 11, outputTokens: 7 }),
      finish_reason: 'stop',
      response_id: 'resp_abc',
      response_model_id: 'gpt-4.1-mini-2026-01-01',
    });
    expect(typeof line.call_id).toBe('string');
    expect(typeof line.latency_ms).toBe('number');
  });

  it('carries the prompt as actually sent and the output as returned', async () => {
    await getAgentRuntime(config());

    const line = onlyLine();
    expect(JSON.stringify(line.prompt)).toContain('completed_week');
    expect(JSON.stringify(line.prompt)).toContain('strength coach analyzing');
    expect(String(line.output)).toContain('trained four of five days');
  });

  it('labels each call site separately, with a distinct call id per call', async () => {
    await getAgentRuntime(config());
    await getAgentRuntime(config({ callSite: 'generate-plan' }));

    const lines = loggedLines();
    expect(lines.map((line) => line.call_site)).toEqual(['analyze-week', 'generate-plan']);
    expect(lines[0]?.call_id).not.toEqual(lines[1]?.call_id);
  });

  it('emits one line carrying the error when the provider fails', async () => {
    failWith(new Error('upstream 503'));

    await expect(getAgentRuntime(config({ callSite: 'generate-plan' }))).rejects.toThrow();

    const line = onlyLine();
    expect(line).toMatchObject({
      event: 'llm_call',
      call_site: 'generate-plan',
      status: 'error',
      error: { message: expect.stringContaining('upstream 503') },
    });
    // A failure still names the prompt that caused it.
    expect(JSON.stringify(line.prompt)).toContain('completed_week');
  });

  it('emits one line per attempt, so a retried call is not read as one slow call', async () => {
    failWith(new Error('upstream 503'));

    await expect(getAgentRuntime(config())).rejects.toThrow();
    await expect(getAgentRuntime(config())).rejects.toThrow();

    const lines = loggedLines();
    expect(lines).toHaveLength(2);
    expect(lines[0]?.call_id).not.toEqual(lines[1]?.call_id);
  });

  it('correlates a post-response schema rejection with the prompt that caused it', async () => {
    respondWith(JSON.stringify({ summary: 42 }));

    await expect(getAgentRuntime(config())).rejects.toThrow();

    // The provider call itself succeeded, so it is logged; the schema rejection
    // happens after the SDK's end event and is logged as its own failure.
    const lines = loggedLines();
    expect(lines.map((line) => line.status)).toEqual(['ok', 'error']);
    expect(lines[1]).toMatchObject({ call_site: 'analyze-week', call_id: lines[0]?.call_id });
    expect(JSON.stringify(lines[1]?.prompt)).toContain('completed_week');
  });

  it('caps an oversized prompt but keeps its true size, so the line survives', async () => {
    const huge = 'x'.repeat(40_000);
    await getAgentRuntime(config({ prompt: huge }));

    const line = onlyLine();
    expect(line.prompt_chars).toBeGreaterThan(40_000);
    expect(String(line.prompt)).toHaveLength(16_000);
    // The fields that make the line worth keeping outlive the truncation.
    expect(line).toMatchObject({
      status: 'ok',
      model: 'gpt-4.1-mini',
      usage: expect.objectContaining({ inputTokens: 11 }),
    });
  });
});
