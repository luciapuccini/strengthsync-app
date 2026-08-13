import { useState } from 'react';
import type { FormEvent, JSX } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { signIn } from '@/api/client';
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
 * Mirrors the sign-up form: native `required` and email validation for the
 * fields, and one error region fed by the typed API error. The server answers a
 * wrong password and an unknown email with the same message, so showing what it
 * says is what keeps the two indistinguishable here.
 */
type SignInForm = {
  pending: boolean;
  error: string | null;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

function useSignInForm(): SignInForm {
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
      const client = await signIn({
        email: String(form.get('email')),
        password: String(form.get('password')),
      });
      markSignedIn(client);
      // The root redirect owns where a signed-in athlete lands, so this does
      // not need to know the tracker's path.
      void navigate('/', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
      );
      setPending(false);
    }
  }

  return { pending, error, handleSubmit: (event) => void submit(event) };
}

export function SignIn(): JSX.Element {
  const { pending, error, handleSubmit } = useSignInForm();

  return (
    <div className="flex flex-col items-center gap-6">
      <BrandMark />
      <AuthHero />

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <h1 className="text-center text-2xl font-semibold">Welcome back</h1>

        <Field>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            required
          />
        </Field>

        <Field>
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            {/* TODO: wire password recovery flow */}
            <button
              type="button"
              className="text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Forgot password?
            </button>
          </div>
          <Input
            id="sign-in-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
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

        <Button type="submit" size="xl" className="w-full" disabled={pending}>
          {pending && <Spinner />}
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>

        <SocialAuthButtons />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/sign-up" className="font-medium text-foreground hover:underline">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
