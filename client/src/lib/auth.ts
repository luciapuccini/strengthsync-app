// Dummy auth seam for the landing experience.
//
// This module is the single, obvious place where real session logic will
// later attach. Everything else (route tree, layouts, guards, screens) is built
// to survive that change.

// TODO: replace with real session state (derived from a token/session, not a const).
export const IS_AUTHENTICATED = false;

// TODO: replace with the active client selected after real auth/login.
// Reused from the demo id currently hardcoded in the app header.
export const DEMO_CLIENT_ID = "00000000-0000-4000-8000-000000000010";

// TODO: once real auth state is wired, add router-level tests covering the
// guard/redirect behavior (logged-out private route -> /sign-in, root redirect,
// authenticated pass-through).
