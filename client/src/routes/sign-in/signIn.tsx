import type { JSX } from "react";

import { AuthHero } from "@/components/auth-hero/authHero";
import { BrandMark } from "@/components/brand-mark/brandMark";

export function SignIn(): JSX.Element {
  return (
    <div className="flex flex-col items-center gap-6">
      <BrandMark />
      <AuthHero />
      <h1 className="text-2xl font-semibold">Sign in</h1>
    </div>
  );
}
