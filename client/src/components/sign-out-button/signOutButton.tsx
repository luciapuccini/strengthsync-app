import { useState } from 'react';
import type { JSX } from 'react';

import { signOut } from '@/api/client';
import { Button } from '@/shadcn/ui/button';
import { useAppStore } from '@/store/useAppStore';

/**
 * Leaving has two halves: the server clears the cookie, and the store clears the
 * session. The redirect is nobody's job here — the route guard renders one as
 * soon as the status turns signed-out, from whichever screen was open.
 */
export function SignOutButton(): JSX.Element {
  const signOutSession = useAppStore((state) => state.signOutSession);
  const [pending, setPending] = useState(false);

  async function leave(): Promise<void> {
    if (pending) return;
    setPending(true);
    try {
      await signOut();
    } catch {
      // An unreachable server or an already-rejected cookie must not strand
      // someone on a shared device: clear the session either way.
    }
    // No matching setPending(false): the guard unmounts this the moment the
    // status changes.
    signOutSession();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => void leave()}
      disabled={pending}
      className="text-sm text-muted-foreground hover:text-foreground"
    >
      Sign out
    </Button>
  );
}
