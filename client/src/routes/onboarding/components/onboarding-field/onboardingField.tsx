import type { JSX, ReactNode } from 'react';

import { Field, FieldLabel } from '@/shadcn/ui/field';

type Props = {
  id: string;
  label: string;
  error: string | undefined;
  children: ReactNode;
};

/** One labelled control plus its own validation error, shared by every step. */
export function OnboardingField({ id, label, error, children }: Props): JSX.Element {
  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </Field>
  );
}
