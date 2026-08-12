import type { FormEvent, JSX } from "react";
import { Link } from "react-router-dom";

import { AuthHero } from "@/components/auth-hero/authHero";
import { BrandMark } from "@/components/brand-mark/brandMark";
import { SocialAuthButtons } from "@/components/social-auth-buttons/socialAuthButtons";
import { Button } from "@/shadcn/ui/button";
import { Field, FieldLabel } from "@/shadcn/ui/field";
import { Input } from "@/shadcn/ui/input";

export function SignUp(): JSX.Element {
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    // TODO: wire handler — call the real sign-up endpoint once auth exists.
  }

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
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            required
          />
        </Field>

        <Button type="submit" size="xl" className="w-full">
          Create account
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
