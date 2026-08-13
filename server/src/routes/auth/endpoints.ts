import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import {
  createClient,
  createCredential,
  getClient,
  getCredentialByEmail,
  type Db,
} from '../../db/index.ts';

import { hash, verify } from '../../lib/password.ts';
import {
  clearSessionCookie,
  requireSession,
  setSessionCookie,
  type SessionVariables,
} from '../../lib/session.ts';
import { defaultHook } from '../../lib/validation-error.ts';
import { ClientResponseSchema } from '../clients/schemas.ts';
import { conflict, invalidInput, json, unauthorized } from '../shared.ts';

import { SignInInputSchema, SignUpInputSchema, SignedOutResponseSchema } from './schemas.ts';

// `security: []` on the three routes reachable without a session: they are the
// way in, so requiring one would be circular. Sign-out is among them on
// purpose — clearing an expired cookie has to work. The session route declares
// nothing and so inherits the document's default, which is what guards it.
const signUpRoute = createRoute({
  method: 'post',
  path: '/sign-up',
  summary: 'Register a client and start a session',
  security: [],
  request: { body: { content: { 'application/json': { schema: SignUpInputSchema } } } },
  responses: {
    201: json('Client registered and signed in', ClientResponseSchema),
    400: invalidInput,
    409: conflict,
  },
});

const signInRoute = createRoute({
  method: 'post',
  path: '/sign-in',
  summary: 'Start a session for an existing client',
  security: [],
  request: { body: { content: { 'application/json': { schema: SignInInputSchema } } } },
  responses: {
    200: json('Signed in', ClientResponseSchema),
    400: invalidInput,
    401: unauthorized,
  },
});

const signOutRoute = createRoute({
  method: 'post',
  path: '/sign-out',
  summary: 'End the current session',
  security: [],
  responses: { 200: json('Signed out', SignedOutResponseSchema) },
});

const sessionRoute = createRoute({
  method: 'get',
  path: '/session',
  summary: 'Return the signed-in client',
  responses: {
    200: json('Signed in', ClientResponseSchema),
    401: unauthorized,
  },
});

/**
 * Registration and sign-in. Mounted outside the API guard, because these are
 * the routes that mint the token the guard checks — only `/session` is guarded,
 * and sign-out deliberately is not, so that clearing an expired cookie works.
 *
 * Handlers compose the password module, the credentials repository and the
 * existing client-creation function directly; there is no use-case layer, the
 * same way the profile handler composes an existence check with an upsert.
 */
export function authRoutes(
  db: Db,
  sessionSecret: string,
): OpenAPIHono<{ Variables: SessionVariables }> {
  const app = new OpenAPIHono<{ Variables: SessionVariables }>({ defaultHook });

  app.use('/session', requireSession(sessionSecret));

  app.openapi(signUpRoute, async (c) => {
    const { display_name, email, password } = c.req.valid('json');
    if (await getCredentialByEmail(db, email)) {
      return c.json(
        { error: { code: 'email_already_registered', message: 'email already registered' } },
        409,
      );
    }
    // D1 gives no transaction across these two writes. The check above keeps
    // the ordinary duplicate from creating a client row at all; createCredential
    // re-checks and raises a conflict (409 via app.ts's onError) if two
    // registrations for one email interleave, leaving a client row nothing can
    // reach, since reaching one requires a credential.
    const client = await createClient(db, { display_name });
    await createCredential(db, {
      client_id: client.id,
      email,
      password_hash: await hash(password),
    });
    await setSessionCookie(c, client.id, sessionSecret);
    return c.json({ client }, 201);
  });

  app.openapi(signInRoute, async (c) => {
    const { email, password } = c.req.valid('json');
    const credential = await getCredentialByEmail(db, email);
    // One exit for all three failures, so an unknown email and a wrong password
    // are indistinguishable in the response. They remain distinguishable by
    // timing — an unknown email skips the key derivation — which is a known and
    // accepted gap, not an oversight.
    const client =
      credential && (await verify(password, credential.password_hash))
        ? await getClient(db, credential.client_id)
        : null;
    if (!client) {
      return c.json(
        { error: { code: 'invalid_credentials', message: 'email or password is incorrect' } },
        401,
      );
    }
    await setSessionCookie(c, client.id, sessionSecret);
    return c.json({ client }, 200);
  });

  app.openapi(signOutRoute, (c) => {
    clearSessionCookie(c);
    return c.json({ ok: true }, 200);
  });

  app.openapi(sessionRoute, async (c) => {
    const client = await getClient(db, c.get('clientId'));
    // The token verified but its client is gone: treat it as no session.
    if (!client) {
      return c.json({ error: { code: 'unauthorized', message: 'sign in required' } }, 401);
    }
    return c.json({ client }, 200);
  });

  return app;
}
