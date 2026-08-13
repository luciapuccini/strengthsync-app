import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * Three states, not two: redirecting while the session is still resolving would
 * bounce every signed-in athlete to sign-in on a cold load, before the
 * bootstrap call has had a chance to answer.
 */
export function RequireAuth(): JSX.Element {
  const status = useAppStore((state) => state.sessionStatus);

  if (status === 'loading') {
    return <Spinner className="mx-auto mt-12 size-6" />;
  }
  if (status === 'signed-out') {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}
