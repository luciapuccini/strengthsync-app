import { useState } from 'react';
import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { deleteAccount } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import type { Client } from '@/api/types';
import { UnitToggle } from '@/components/unit-toggle/unitToggle';
import { Button } from '@/shadcn/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shadcn/ui/card';
import { Input } from '@/shadcn/ui/input';
import { Label } from '@/shadcn/ui/label';
import { useAppStore } from '@/store/useAppStore';

/**
 * The phrase the athlete has to type. A typed confirmation rather than a modal
 * with two buttons, because the action is irreversible and a modal is dismissed
 * by the same reflex that opened it. It also avoids pulling in a dialog
 * primitive for the one screen in the app that needs one.
 */
const CONFIRMATION = 'delete my account';

/**
 * The unit setting. Its own component rather than more of `AccountPage`,
 * because it owns state that has nothing to do with deleting an account. The
 * buttons themselves are `UnitToggle`, shared with onboarding's first step.
 *
 * Nothing flips until the write comes back, so a failure leaves the buttons
 * showing what the server actually holds and the message is the whole of the
 * recovery — the athlete taps again.
 */
function UnitsCard(): JSX.Element {
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

/**
 * Account settings: the unit preference, and one destructive action.
 *
 * A route rather than a control in the header: App Store Guideline 5.1.1(v)
 * requires deletion to be reachable from inside the app, not to be one click
 * from every screen. It is also where the athlete's own details belong as they
 * grow — today `display_name`, which for a newly provisioned athlete is their
 * email address until onboarding overwrites it.
 */
export function AccountPage(): JSX.Element {
  const { logout } = useAuth0();
  const client = useAppStore((state) => state.sessionClient);
  const signOutSession = useAppStore((state) => state.signOutSession);

  const [confirmation, setConfirmation] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = confirmation.trim().toLowerCase() === CONFIRMATION;

  async function onDelete(): Promise<void> {
    setDeleting(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (err) {
      // A failed deletion left the account working and untouched — the server
      // aborts before it writes anything if the provider refuses — so the
      // honest thing is to stay on this screen and let them try again, not to
      // sign them out of an account that still exists.
      setError(
        err instanceof ApiClientError && err.kind === 'server'
          ? 'We could not delete your account just now. Nothing was removed — please try again.'
          : 'Something went wrong. Nothing was removed — please try again.',
      );
      setDeleting(false);
      return;
    }
    // The Auth0 user is gone, so there is no session left to end and no token
    // left to mint. `logout` is still the right call: it clears the SDK's own
    // in-memory state and the browser lands back on `/`, which resolves to
    // sign-in. Local state first, for the same reason as `SignOutButton` — the
    // redirect is a full navigation and this screen must not sit there showing
    // a deleted account while it happens.
    signOutSession();
    void logout({ logoutParams: { returnTo: window.location.origin } });
  }

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          {client && <CardDescription>Signed in as {client.display_name}</CardDescription>}
        </CardHeader>
      </Card>

      <UnitsCard />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            This deletes your account, your plans and every week you have logged. It cannot be
            undone, and the data cannot be recovered.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="delete-confirmation">
              Type <span className="font-mono text-foreground">{CONFIRMATION}</span> to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={deleting}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button
            type="button"
            variant="destructive"
            className="self-start"
            disabled={!confirmed || deleting}
            onClick={() => void onDelete()}
          >
            {deleting ? 'Deleting…' : 'Delete account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
