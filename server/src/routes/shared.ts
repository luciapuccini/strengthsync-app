import { z } from '@hono/zod-openapi';

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
export const badGateway = json('An upstream provider refused or was unreachable', ApiErrorSchema);

export const uuidParam = (name: string) => z.uuid().openapi({ param: { name, in: 'path' } });
