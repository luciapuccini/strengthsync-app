import type { JSX } from 'react';

import type { OnboardingActivity } from '@/lib/onboarding-schema';
import { Button } from '@/shadcn/ui/button';
import { Field, FieldLabel } from '@/shadcn/ui/field';
import { Input } from '@/shadcn/ui/input';

type Props = {
  activities: OnboardingActivity[];
  onChange: (activities: OnboardingActivity[]) => void;
};

const emptyActivity: OnboardingActivity = { name: '', sessions_per_week: 1 };

/**
 * A variable-length list, so each row is a controlled input rather than the
 * uncontrolled `defaultValue` the rest of the wizard uses — there is no fixed
 * set of field names for `useActionState` to read on submit.
 */
export function ActivitiesField({ activities, onChange }: Props): JSX.Element {
  function updateRow(index: number, patch: Partial<OnboardingActivity>): void {
    onChange(activities.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <Field>
      <FieldLabel>Other sports or activities (optional)</FieldLabel>
      {activities.map((activity, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-md border border-input p-3">
          <Input
            aria-label="Activity name"
            placeholder="Swimming"
            value={activity.name}
            onChange={(e) => updateRow(index, { name: e.target.value })}
          />
          <Input
            aria-label="Sessions per week"
            type="number"
            inputMode="numeric"
            min={1}
            max={7}
            value={activity.sessions_per_week}
            onChange={(e) => updateRow(index, { sessions_per_week: Number(e.target.value) })}
          />
          <Input
            aria-label="Note"
            placeholder="Note (optional)"
            value={activity.note ?? ''}
            onChange={(e) => updateRow(index, { note: e.target.value || undefined })}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(activities.filter((_, i) => i !== index))}
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...activities, { ...emptyActivity }])}
      >
        Add activity
      </Button>
    </Field>
  );
}
