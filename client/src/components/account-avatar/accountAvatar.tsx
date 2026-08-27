import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { useAppStore } from '@/store/useAppStore';

function initialOf(displayName: string | undefined): string | null {
  return Array.from(displayName?.trim() ?? '')[0]?.toUpperCase() ?? null;
}

export function AccountAvatar(): JSX.Element {
  const { pathname } = useLocation();
  const client = useAppStore((state) => state.sessionClient);

  const initial = initialOf(client?.display_name);
  const isCurrent = pathname === '/account';

  return (
    <Link
      to="/account"
      aria-label="Account"
      aria-current={isCurrent ? 'page' : undefined}
      className="flex size-11 items-center justify-center"
    >
      <span
        className={cn(
          'flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground',
          isCurrent && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
        )}
      >
        {initial ?? <User aria-hidden="true" className="size-4 text-muted-foreground" />}
      </span>
    </Link>
  );
}
