import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validationFailure } from './validation-error.ts';

/** safeParse the schema and hand the resulting error to the mapper. */
function failureFor(schema: z.ZodType, value: unknown, target: 'param' | 'json' | 'query') {
  const parsed = schema.safeParse(value);
  if (parsed.success) throw new Error('expected the schema to reject this value');
  return validationFailure(parsed.error, target);
}

describe('validationFailure', () => {
  it('reports a malformed uuid route id as invalid_id', () => {
    const failure = failureFor(z.object({ clientId: z.uuid() }), { clientId: 'nope' }, 'param');
    expect(failure).toEqual({ status: 400, code: 'invalid_id', message: 'clientId: Invalid UUID' });
  });

  it('reports a non-id path param as invalid_input, not invalid_id', () => {
    const schema = z.object({ dayIndex: z.coerce.number().int().min(1).max(7) });
    expect(failureFor(schema, { dayIndex: '99' }, 'param').code).toBe('invalid_input');
  });

  it('reports body and query failures as invalid_input, with the field path', () => {
    const body = failureFor(z.object({ display_name: z.string() }), {}, 'json');
    expect(body.code).toBe('invalid_input');
    expect(body.message).toMatch(/^display_name: /);

    expect(failureFor(z.object({ status: z.enum(['a']) }), { status: 'x' }, 'query').code).toBe(
      'invalid_input',
    );
  });
});
