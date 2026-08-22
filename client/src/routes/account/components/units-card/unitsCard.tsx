import { useState } from 'react';
import type { JSX } from 'react';

import type { Client } from '@/api/types';
import { UnitToggle } from '@/components/unit-toggle/unitToggle';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shadcn/ui/card';
import { useAppStore } from '@/store/useAppStore';

/** See docs/architecture/domain_model.md for what the preference does and does not affect. */
export function UnitsCard(): JSX.Element {
  const client = useAppStore((state) => state.sessionClient);
  const setUnitPreference = useAppStore((state) => state.setUnitPreference);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(preference: Client['unit_preference']): Promise<void> {
    if (!client || preference === client.unit_preference || saving) return;
    setSaving(true);
    setError(null);
    try {
      await setUnitPreference(preference);
    } catch {
      setError('We could not save that just now. Your units are unchanged — please try again.');
    }
    setSaving(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Units</CardTitle>
        <CardDescription>
          How weights are shown to you. It changes nothing about what is recorded.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <UnitToggle
          value={client?.unit_preference}
          disabled={!client || saving}
          onChange={(preference) => void onPick(preference)}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
