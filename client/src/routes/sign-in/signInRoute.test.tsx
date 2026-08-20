import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInRoute } from './signInRoute';

/**
 * Two behaviours, and the second one is the reason this component exists in the
 * shape it does: it must start the redirect, and it must refuse to start one
 * when the provider already has a session — otherwise a failure to read the
 * athlete turns into a browser bouncing between two domains with no way out.
 */

const { useAuth0, loginWithRedirect } = vi.hoisted(() => ({
  useAuth0: vi.fn(),
  loginWithRedirect: vi.fn(),
}));

vi.mock('@auth0/auth0-react', () => ({ useAuth0 }));

const provider = (state: { isLoading: boolean; isAuthenticated: boolean }) => {
  useAuth0.mockReturnValue({ ...state, loginWithRedirect });
};

beforeEach(() => {
  loginWithRedirect.mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SignInRoute', () => {
  it('sends a signed-out visitor to the hosted page', () => {
    provider({ isLoading: false, isAuthenticated: false });

    render(<SignInRoute />);

    expect(loginWithRedirect).toHaveBeenCalledTimes(1);
  });

  it('waits for the provider rather than redirecting mid-renewal', () => {
    // A returning athlete is `isLoading: true, isAuthenticated: false` for the
    // whole of a silent renewal. Redirecting on that would mean an interactive
    // login on every reload, which is the failure the loading state exists for.
    provider({ isLoading: true, isAuthenticated: false });

    render(<SignInRoute />);

    expect(loginWithRedirect).not.toHaveBeenCalled();
  });

  it('stops instead of looping when the provider already has a session', () => {
    provider({ isLoading: false, isAuthenticated: true });

    render(<SignInRoute />);

    expect(loginWithRedirect).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
