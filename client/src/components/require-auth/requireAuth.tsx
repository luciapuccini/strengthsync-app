import type { JSX } from "react";
import { Navigate, Outlet } from "react-router-dom";

import { IS_AUTHENTICATED } from "@/lib/auth";

export function RequireAuth(): JSX.Element {
  if (!IS_AUTHENTICATED) {
    return <Navigate to="/sign-in" replace />;
  }

  return <Outlet />;
}
