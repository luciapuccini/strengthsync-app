import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { destinations } from '@/components/tab-bar/destinations';
import { cn } from '@/shadcn/lib/utils';

export function TabBar(): JSX.Element {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 p-2 backdrop-blur-md"
    >
      <div className="mx-auto flex w-full max-w-3xl pr-safe-3 pl-safe-3">
        {destinations.map(({ path, label, icon: Icon }) => {
          const isCurrent = pathname === path;

          return (
            <Link
              key={path}
              to={path}
              aria-current={isCurrent ? 'page' : undefined}
              className={cn(
                'flex min-h-11 flex-1 flex-col items-center justify-center gap-1 text-xs',
                isCurrent ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
