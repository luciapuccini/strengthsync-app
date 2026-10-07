import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { LogOut } from 'lucide-react';

import { Button } from '@/shadcn/ui/button';
import { useAppStore } from '@/store/useAppStore';

export function SignOutButton(): JSX.Element {
  const { logout } = useAuth0();
  const signOutSession = useAppStore((state) => state.signOutSession);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        signOutSession();
        void logout({ logoutParams: { returnTo: window.location.origin } });
      }}
    >
      <LogOut aria-hidden="true" />
      Sign out
    </Button>
  );
}
