import type { FormEvent, JSX } from "react";
import { Link } from "react-router-dom";

import { AuthHero } from "@/components/auth-hero/authHero";
import { BrandMark } from "@/components/brand-mark/brandMark";
import { SocialAuthButtons } from "@/components/social-auth-buttons/socialAuthButtons";
import { Button } from "@/shadcn/ui/button";
import { Field, FieldLabel } from "@/shadcn/ui/field";
import { Input } from "@/shadcn/ui/input";

export function SignIn(): JSX.Element {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // TODO: wire handler — call the real sign-in endpoint once auth exists.
  }

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
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            required
          />
        </Field>

        <Button type="submit" size="xl" className="w-full">
          Sign in
        </Button>

        <SocialAuthButtons />

        <p className="text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/sign-up"
            className="font-medium text-foreground hover:underline"
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
