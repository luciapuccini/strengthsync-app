import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';

import { destinations } from '@/components/tab-bar/destinations';
import { cn } from '@/shadcn/lib/utils';

/**
 * The app's primary navigation, fixed to the bottom of the viewport where a
 * thumb already is. Translucent with a blur so content stays faintly visible
 * passing underneath — the athlete can tell the page continues below the bar.
 *
 * The same bar at every width, constrained to the content column: what is
 * checked in a desktop browser is what ships inside the Capacitor shell.
 *
 * Which item is current is derived from the path and carried by `aria-current`
 * as well as by colour, so it is not a colour-only signal.
 */
export function TabBar(): JSX.Element {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/80 pb-safe-5 backdrop-blur-md"
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
                // min-h-11 is the 44pt tap target; flex-1 gives each item half
                // the bar's width, so the target is the whole cell.
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
