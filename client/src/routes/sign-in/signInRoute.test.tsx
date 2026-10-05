import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SignInRoute } from './signInRoute';

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
