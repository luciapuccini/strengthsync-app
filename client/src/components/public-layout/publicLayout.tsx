import type { JSX } from "react";
import { Outlet } from "react-router-dom";

// Minimal public shell for the auth routes. Chrome (centered mobile column,
// radial glow, brand mark, hero) lands in a later slice; for now it is a plain
// outlet so the routing spine is complete.
export function PublicLayout(): JSX.Element {
  return <Outlet />;
}
