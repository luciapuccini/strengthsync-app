import type { JSX } from "react";
import { Navigate } from "react-router-dom";

import { DEMO_CLIENT_ID, IS_AUTHENTICATED } from "@/lib/auth";

export function RootRedirect(): JSX.Element {
  const target = IS_AUTHENTICATED
    ? `/clients/${DEMO_CLIENT_ID}/track`
    : "/sign-in";

  return <Navigate to={target} replace />;
}
