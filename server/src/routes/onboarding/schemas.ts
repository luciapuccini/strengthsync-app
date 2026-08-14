import { z } from '@hono/zod-openapi';

import { OnboardingAnswersSchema } from '../../domain/onboarding/index.ts';

/**
 * HTTP shape for the onboarding questionnaire, registered as an OpenAPI
 * component.
 *
 * Rebuilt from `.shape` for the same reason as `routes/clients/schemas.ts`:
 * `@hono/zod-openapi` patches `.openapi()` onto `ZodType.prototype`, and a
 * schema built with plain `zod` before this module loads never gains it.
 */
export const OnboardingAnswersRequestSchema = z
  .object(OnboardingAnswersSchema.shape)
  .openapi('OnboardingAnswers');
