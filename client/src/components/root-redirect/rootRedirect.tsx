import type { JSX } from 'react';
import { Navigate } from 'react-router-dom';

import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

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
