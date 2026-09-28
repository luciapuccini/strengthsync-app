import type { JSX } from 'react';

import { Button } from '@/shadcn/ui/button';

type Props = {
  status: 'pending' | 'failed';
  onRetry: () => void;
};

export function ComposingScreen({ status, onRetry }: Props): JSX.Element {
  const pending = status === 'pending';
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <img
        src="/athlete-no-bg.png"
        alt=""
        aria-hidden="true"
        width={192}
        height={192}
        loading="eager"
        decoding="async"
        className={
          pending ? 'h-48 w-48 animate-pulse motion-reduce:animate-none' : 'h-48 w-48 opacity-60'
        }
      />

      {pending ? (
        <p className="text-lg font-medium" aria-live="polite">
          Building your plan…
        </p>
      ) : (
        <>
          <p role="alert" className="text-sm text-destructive">
            Something went wrong while building your plan. Please try again.
          </p>
          <Button type="button" size="xl" onClick={onRetry}>
            Retry
          </Button>
        </>
      )}
    </div>
  );
}
