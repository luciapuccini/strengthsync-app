import { useState } from "react";
import type { FormEvent, JSX } from "react";
import { Link, useNavigate } from "react-router-dom";

import { signUp } from "@/api/client";
import { ApiClientError } from "@/api/errors";
import { AuthHero } from "@/components/auth-hero/authHero";
import { BrandMark } from "@/components/brand-mark/brandMark";
import { SocialAuthButtons } from "@/components/social-auth-buttons/socialAuthButtons";
import { Button } from "@/shadcn/ui/button";
import { Field, FieldLabel } from "@/shadcn/ui/field";
import { Input } from "@/shadcn/ui/input";
import { Spinner } from "@/shadcn/ui/spinner";
import { useAppStore } from "@/store/useAppStore";

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
        display_name: String(form.get("display_name")),
        email: String(form.get("email")),
        password: String(form.get("password")),
      });
      markSignedIn(client);
      // The root redirect owns where a signed-in athlete lands, so this does
      // not need to know the tracker's path.
      void navigate("/", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Something went wrong. Please try again.",
      );
      setPending(false);
    }
  }

  return { pending, error, handleSubmit: (event) => void submit(event) };
}

export function SignUp(): JSX.Element {
  const { pending, error, handleSubmit } = useSignUpForm();

  return (
    <div className="flex flex-col items-center gap-6">
      <BrandMark />
      <AuthHero />

      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <h1 className="text-center text-2xl font-semibold">
          Create your account
        </h1>

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
          {pending ? "Creating account…" : "Create account"}
        </Button>

        <SocialAuthButtons />

        <p className="text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <a href="#" className="font-medium text-foreground hover:underline">
            Terms
          </a>{" "}
          and{" "}
          <a href="#" className="font-medium text-foreground hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/sign-in"
            className="font-medium text-foreground hover:underline"
          >
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
