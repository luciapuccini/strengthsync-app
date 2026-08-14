import type { JSX } from 'react';

type Props = {
  current: number;
  total: number;
};

export function OnboardingProgress({ current, total }: Props): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-muted-foreground">
        Step {current} of {total}
      </p>
      <div
        className="flex gap-1.5"
        role="progressbar"
        aria-valuenow={current}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i < current ? 'bg-primary' : 'bg-muted'}`}
          />
        ))}
      </div>
    </div>
  );
}
