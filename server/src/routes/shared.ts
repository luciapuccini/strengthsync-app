import { z } from '@hono/zod-openapi';

/**
 * Pieces every route area needs: the error envelope, the response-object
 * boilerplate, and uuid path params.
 *
 * The runtime counterpart of `ApiErrorSchema` is the `ApiError` type in
 * `lib/errors.ts`, which is what actually builds these bodies. The two are
 * deliberately separate: `lib/` sits below the routes and must not import from
 * them, and this schema exists to document the shape, not to produce it.
 */

export const ApiErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
    }),
  })
  .openapi('ApiError');

export const json = <S>(description: string, schema: S) => ({
  description,
  content: { 'application/json': { schema } },
});

export const unauthorized = json('Missing or invalid credentials', ApiErrorSchema);
export const forbidden = json('Understood, but not allowed', ApiErrorSchema);
export const invalidInput = json('Invalid input', ApiErrorSchema);
export const notFound = json('Not found', ApiErrorSchema);
export const conflict = json('Conflicts with existing state', ApiErrorSchema);

// No shared client-id param: no route takes one. The athlete is read from the
// session, so the only ids left in a path are a week's and a plan's.
export const uuidParam = (name: string) => z.uuid().openapi({ param: { name, in: 'path' } });
