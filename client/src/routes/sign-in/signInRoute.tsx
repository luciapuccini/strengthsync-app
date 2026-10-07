import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { Button } from '@/shadcn/ui/button';
import { Spinner } from '@/shadcn/ui/spinner';

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
