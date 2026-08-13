import { useId } from 'react';
import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';

function AppleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
      <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.017-.09-.05-.29-.05-.5 0-1.14.572-2.27 1.207-2.98.744-.85 2.037-1.5 3.075-1.55.03.13.232.28.232.41zM20.94 17.4c-.35.81-.52 1.17-.97 1.9-.63 1.02-1.52 2.3-2.62 2.31-.98.01-1.23-.63-2.56-.62-1.33.01-1.6.63-2.59.62-1.1-.01-1.94-1.16-2.57-2.18-1.76-2.85-1.94-6.2-.86-7.98.77-1.27 1.98-2.02 3.11-2.02 1.15 0 1.87.66 2.82.66.92 0 1.48-.66 2.82-.66 1.01 0 2.08.55 2.84 1.5-2.5 1.37-2.09 4.94.58 6.47z" />
    </svg>
  );
}

function GoogleIcon(): JSX.Element {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.6 12.23c0-.71-.06-1.4-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.89-1.74 2.98-4.3 2.98-7.35Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.96-.89 6.61-2.42l-3.23-2.5c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.75-5.59-4.11H3.07v2.58A9.99 9.99 0 0 0 12 22Z"
      />
      <path
        fill="#FBBC05"
        d="M6.41 13.93a5.99 5.99 0 0 1 0-3.86V7.49H3.07a10 10 0 0 0 0 9.02l3.34-2.58Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.06c1.47 0 2.79.5 3.83 1.49l2.87-2.87C16.95 2.99 14.7 2 12 2A9.99 9.99 0 0 0 3.07 7.49l3.34 2.58c.79-2.36 2.99-4.01 5.59-4.01Z"
      />
    </svg>
  );
}

/**
 * Apple and Google sign-in are not built. The buttons stay on both auth screens
 * because the front door is designed around them, but they render natively
 * `disabled` rather than as the live-looking no-ops they were: `disabled` takes
 * a button out of the tab order, and the shared variant already carries
 * `disabled:pointer-events-none`, so neither pointer nor keyboard reaches them.
 * `aria-disabled` would have announced the state while leaving them focusable
 * and clickable.
 *
 * The caption sits below the buttons rather than above them, so nothing between
 * the first field and the submit button moves and the screens' mobile layout is
 * unchanged. `useId` rather than a constant because two ids would collide if
 * this ever rendered twice on one screen.
 */
export function SocialAuthButtons(): JSX.Element {
  const captionId = useId();

  return (
    <div className="flex w-full flex-col gap-3">
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        disabled
        aria-describedby={captionId}
      >
        <AppleIcon />
        Continue with Apple
      </Button>
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full gap-2"
        disabled
        aria-describedby={captionId}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
      <p id={captionId} className="text-center text-xs text-muted-foreground">
        Social sign-in isn&apos;t available yet.
      </p>
    </div>
  );
}
