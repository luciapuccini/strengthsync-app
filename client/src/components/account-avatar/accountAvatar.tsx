import type { JSX } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User } from 'lucide-react';

import { cn } from '@/shadcn/lib/utils';
import { useAppStore } from '@/store/useAppStore';

/**
 * The first character of the display name, uppercased, or `null` when there is
 * nothing usable to show.
 *
 * Derived defensively rather than as `name[0]`: for a newly provisioned athlete
 * `display_name` is their email address until onboarding overwrites it, and it
 * may arrive empty or as whitespace. `Array.from` takes a whole code point, so
 * a name starting with an emoji or an astral character does not render as half
 * a surrogate pair.
 */
function initialOf(displayName: string | undefined): string | null {
  return Array.from(displayName?.trim() ?? '')[0]?.toUpperCase() ?? null;
}

/**
 * Identity in the top bar: a muted circle carrying the athlete's initial, which
 * navigates to the account route. A placeholder in the literal sense — a real
 * photo drops into the same circle later with no layout change.
 *
 * No tab is current on `/account` (it is deliberately absent from
 * `destinations`), so the avatar carries the active treatment itself — a
 * brand-yellow ring — and the app still answers "where am I".
 */
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
      // The link is the 44pt tap target (size-11); the circle inside it is
      // smaller, so the visual weight stays right without shrinking the target.
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
