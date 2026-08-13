import { z } from '@hono/zod-openapi';

/**
 * HTTP shapes for the authentication area.
 *
 * The eight-character password minimum lives here and nowhere else. The browser
 * does not restate it — it reports what this schema rejects — so there is no
 * second copy of the rule to drift, which matters because the generated
 * contract carries types but not constraints.
 *
 * Responses reuse `ClientResponse` from the clients area rather than declaring
 * a second component of the same shape: signing up, signing in and bootstrapping
 * all answer with the same client the rest of the API returns.
 */

export const SignUpInputSchema = z
  .object({
    display_name: z.string().min(1),
    email: z.email(),
    password: z.string().min(8),
  })
  .openapi('SignUpInput');

export const SignInInputSchema = z
  .object({ email: z.email(), password: z.string() })
  .openapi('SignInInput');

export const SignedOutResponseSchema = z.object({ ok: z.boolean() }).openapi('SignedOutResponse');
