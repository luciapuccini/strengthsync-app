import { z } from '@hono/zod-openapi';

import { OnboardingAnswersSchema } from '../../domain/onboarding/index.ts';

export const OnboardingAnswersRequestSchema = z
  .object(OnboardingAnswersSchema.shape)
  .openapi('OnboardingAnswers');
