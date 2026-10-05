import type { JSX } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

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
