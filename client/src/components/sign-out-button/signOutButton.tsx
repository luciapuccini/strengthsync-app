import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';
import { useAppStore } from '@/store/useAppStore';

/**
 * Clears local state, and that is currently all leaving can do. The route it
 * used to call first is deleted; `issues/013-web-app-universal-login.md` makes
 * this call the SDK's logout, which ends the session at Auth0 and is what
 * actually revokes the refresh token.
 *
 * There is no pending state left to hold, because nothing is in flight — the
 * store update is synchronous. The redirect is nobody's job here either: the
 * route guard renders one as soon as the status turns signed-out, from whichever
 * screen was open.
 */
export function SignOutButton(): JSX.Element {
  const signOutSession = useAppStore((state) => state.signOutSession);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={signOutSession}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign out
    </Button>
  );
}
