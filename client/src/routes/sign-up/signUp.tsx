import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { signUp } from '@/api/client';
import { ApiClientError } from '@/api/errors';
import { AuthHero } from '@/components/auth-hero/authHero';
import { BrandMark } from '@/components/brand-mark/brandMark';
import { SocialAuthButtons } from '@/components/social-auth-buttons/socialAuthButtons';
import { Button } from '@/shadcn/ui/button';
import { Field, FieldLabel } from '@/shadcn/ui/field';
import { Input } from '@/shadcn/ui/input';
import { Spinner } from '@/shadcn/ui/spinner';
import { useAppStore } from '@/store/useAppStore';

/**
 * Field-level checking stays with the browser's native `required` and email
 * validation, so no rule is duplicated across packages — the password minimum
 * lives only in the server's request schema, and what the server rejects is
 * what this error region reports.
 *
 * The error is state, not a toast: it has to survive on screen while the field
 * it refers to is being corrected.
 */
type SignUpForm = {
  pending: boolean;
  error: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function useSignUpForm(): SignUpForm {
  const markSignedIn = useAppStore((state) => state.markSignedIn);
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (pending) return;

    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      const client = await signUp({
        display_name: String(form.get('display_name')),
        email: String(form.get('email')),
        password: String(form.get('password')),
        invite_code: String(form.get('invite_code')),
      });
      markSignedIn(client);
      // Unlike sign-in, registration does not go through the root redirect:
      // a brand-new account has no plan yet, and the root redirect is
      // deliberately plan-unaware, so only this one call site can know to
      // send a fresh registration straight into the questionnaire.
      void navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
      );
      setPending(false);
    }
  }

  return { pending, error, handleSubmit: (event) => void submit(event) };
}

// Ahead of the submit button, not after: this is what the athlete is
// agreeing to before they hand over health-adjacent data in onboarding, so
// it has to be seen before "Create account" is pressed, not scrolled to
// afterwards. Absolute URLs opened in a new tab — this SPA is served from
// app.strengthsync.ai and has no /terms or /privacy route of its own.
function SignUpLegalLinks(): JSX.Element {
  return (
    <p className="text-center text-xs text-muted-foreground">
      By creating an account, you agree to our{' '}
      <a
        href="https://strengthsync.ai/terms"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground hover:underline"
      >
        Terms
      </a>{' '}
      and{' '}
      <a
        href="https://strengthsync.ai/privacy"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-foreground hover:underline"
      >
        Privacy Policy
      </a>
      .
    </p>
  );
}

export function SignUp(): JSX.Element {
  const { pending, error, handleSubmit } = useSignUpForm();

  return (
    <div className="flex flex-col items-center gap-6">
      <BrandMark />
      <AuthHero />

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <h1 className="text-center text-2xl font-semibold">Create your account</h1>

        <Field>
          <FieldLabel htmlFor="sign-up-name">Name</FieldLabel>
          <Input
            id="sign-up-name"
            name="display_name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="sign-up-email">Email</FieldLabel>
          <Input
            id="sign-up-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="sign-up-password">Password</FieldLabel>
          <Input
            id="sign-up-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </Field>

        {/*
          Registration is invite-only while the cohort is being run
          (docs/mvp.md §2). Whether the code is the current one is a comparison
          against a Worker secret, so this field only collects it — the
          rejection arrives from the server and lands in the error region below,
          like the password rule.
        */}
        <Field>
          <FieldLabel htmlFor="sign-up-invite-code">Invite code</FieldLabel>
          <Input
            id="sign-up-invite-code"
            name="invite_code"
            type="text"
            autoComplete="off"
            placeholder="From your invitation email"
            required
          />
        </Field>

        {error !== null && (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <SignUpLegalLinks />

        <Button type="submit" size="xl" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {pending ? 'Creating account…' : 'Create account'}
        </Button>

        <SocialAuthButtons />

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-foreground hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
