import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

/**
 * Where a signed-out visitor lands, and all it does is leave. There is no form
 * here and there will not be one: authorization happens on Auth0's hosted page,
 * which is what lets the same flow work inside the iOS WebView later, where an
 * embedded form is the anti-pattern RFC 8252 exists to prevent.
 *
 * It is a route rather than a call inside `RequireAuth` so that both guards stay
 * as they were — they redirect to a path, and the path knows what to do with
 * itself. That also keeps the redirect out of a render pass: `loginWithRedirect`
 * navigates the browser away, which is not something a guard should do while
 * deciding what to render.
 *
 * The `isAuthenticated` check is the loop breaker, and it is the reason this is
 * not three lines. If the provider says the athlete is signed in but the store
 * says signed-out — `GET /api/me` failed, the API is down, the token was
 * refused — the guard sends them here, and a bare `loginWithRedirect` would ask
 * Auth0 to authenticate someone who already has a live session. Auth0 would
 * answer immediately, the app would land back on the same failure, and the
 * athlete would watch the browser bounce between two domains forever. So when
 * the provider is already satisfied, this stops and says so.
 */
export function SignInRoute(): JSX.Element {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();
  const started = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || started.current) return;
    started.current = true;
    void loginWithRedirect();
  }, [isLoading, isAuthenticated, loginWithRedirect]);

  if (!isLoading && isAuthenticated) {
    return (
      <div className="mx-auto mt-12 flex max-w-sm flex-col items-center gap-3 text-center">
        <h1 className="text-2xl font-semibold">We could not load your account</h1>
        <p className="text-muted-foreground">
          You are signed in, but we could not reach your training data. This is usually temporary.
        </p>
        <Button type="button" onClick={() => window.location.reload()}>
          Try again
        </Button>
      </div>
    );
  }

  return <Spinner className="mx-auto mt-12 size-6" />;
}
