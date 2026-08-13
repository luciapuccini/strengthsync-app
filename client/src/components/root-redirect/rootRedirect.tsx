import type { JSX } from "react";
import { Navigate } from "react-router-dom";

import { Spinner } from "@/shadcn/ui/spinner";
import { useAppStore } from "@/store/useAppStore";

/**
 * The root resolves to the signed-in athlete's own tracker. Browser URLs still
 * carry the athlete id in this slice; it now comes from the session rather than
 * from a hardcoded demo id.
 */
export function RootRedirect(): JSX.Element {
  const status = useAppStore((state) => state.sessionStatus);
  const client = useAppStore((state) => state.sessionClient);

  if (status === "loading") {
    return <Spinner className="mx-auto mt-12 size-6" />;
  }
  if (status === "signed-in" && client) {
    return <Navigate to={`/clients/${client.id}/track`} replace />;
  }

  return <Navigate to="/sign-in" replace />;
}
