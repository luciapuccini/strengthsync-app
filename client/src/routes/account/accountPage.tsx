import { useState } from 'react';
import type { JSX } from 'react';
import { useAuth0 } from '@auth0/auth0-react';

import { deleteAccount } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import { SignOutButton } from '@/components/sign-out-button/signOutButton';
import { UnitsCard } from '@/routes/account/components/units-card/unitsCard';
import { Button } from '@/shadcn/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shadcn/ui/card';
import { Input } from '@/shadcn/ui/input';
import { Label } from '@/shadcn/ui/label';
import { useAppStore } from '@/store/useAppStore';

const CONFIRMATION = 'delete my account';

/**
 * Account settings: App Store Guideline 5.1.1(v)
 * requires deletion to be reachable from inside the app, not to be one click
 * from every screen.
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
      setError(
        err instanceof ApiClientError && err.kind === 'server'
          ? 'We could not delete your account just now. Nothing was removed — please try again.'
          : 'Something went wrong. Nothing was removed — please try again.',
      );
      setDeleting(false);
      return;
    }

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

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>

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
