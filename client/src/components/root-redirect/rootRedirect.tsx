import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * The root resolves to the tracker, which now needs no identity in its URL —
 * so this only has to know whether anyone is signed in, not who.
 */
export function RootRedirect(): JSX.Element {
  const status = useAppStore((state) => state.sessionStatus);

  if (status === 'loading') {
    return <Spinner className="mx-auto mt-12 size-6" />;
  }
  if (status === 'signed-in') {
    return <Navigate to="/track" replace />;
  }

  return <Navigate to="/sign-in" replace />;
}
