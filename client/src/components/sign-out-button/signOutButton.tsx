import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { Button } from '@/shadcn/ui/button';
import { useAppStore } from '@/store/useAppStore';

/**
 * Leaving is two things, and only one of them is ours. Clearing the store ends
 * the session in this tab; `logout` ends it at Auth0, which is what actually
 * revokes the refresh token — without it the next visit would be signed straight
 * back in by silent authentication, and "sign out" would mean "sign out until
 * you reload".
 *
 * Local first, then the redirect. The redirect is a full navigation and may take
 * a moment on a slow connection; doing it the other way round would leave the
 * athlete looking at their own training data for the duration of a click they
 * have already made.
 *
 * `returnTo` is the app's origin, so an athlete comes back to `/`, which resolves
 * to sign-in because nobody is signed in any more. It has to be registered as an
 * Allowed Logout URL on the application or Auth0 refuses the request.
 */
export function SignOutButton(): JSX.Element {
  const { logout } = useAuth0();
  const signOutSession = useAppStore((state) => state.signOutSession);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        signOutSession();
        void logout({ logoutParams: { returnTo: window.location.origin } });
      }}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign out
    </Button>
  );
}
