import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Client } from '@/api/types';

import { ApiClientError } from '@/api/errors';

const { signUp } = vi.hoisted(() => ({ signUp: vi.fn() }));

vi.mock('@/api/client', () => ({ signUp }));

import { useAppStore } from '@/store/useAppStore';

import { SignUp } from './signUp';

const UUID = '00000000-0000-4000-8000-000000000001';
const NOW = '2026-08-13T00:00:00.000Z';

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
};

const submitButton = () => screen.getByRole('button', { name: /^create account$/i });
const pendingButton = () => screen.getByRole('button', { name: /creating account/i });

function fillAndSubmit(): void {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Lucia' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'lucia@example.com' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'dev-password-123' } });
  fireEvent.change(screen.getByLabelText('Invite code'), { target: { value: 'spring-cohort' } });
  fireEvent.click(submitButton());
}

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'loading', sessionClient: null }, false);
  render(
    <MemoryRouter initialEntries={['/sign-up']}>
      <Routes>
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/onboarding" element={<p>onboarding screen</p>} />
      </Routes>
    </MemoryRouter>,
  );
});

// Explicit: testing-library only auto-cleans when vitest runs with globals, and
// this project does not.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('sign-up form', () => {
  // issues/007-privacy-terms-links.md: an athlete has to be able to see what
  // they're agreeing to before they hand over health-adjacent data later in
  // onboarding, so both links are absolute (this SPA has no /terms or
  // /privacy route) and open in a new tab rather than navigating away from
  // the form.
  it('links to the terms and privacy policy on the marketing site, opened in a new tab', () => {
    const terms = screen.getByRole('link', { name: 'Terms' });
    expect(terms).toHaveAttribute('href', 'https://strengthsync.ai/terms');
    expect(terms).toHaveAttribute('target', '_blank');
    expect(terms).toHaveAttribute('rel', 'noopener noreferrer');

    const privacy = screen.getByRole('link', { name: 'Privacy Policy' });
    expect(privacy).toHaveAttribute('href', 'https://strengthsync.ai/privacy');
    expect(privacy).toHaveAttribute('target', '_blank');
    expect(privacy).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('registers and leaves the athlete signed in, with no second credential entry', async () => {
    signUp.mockResolvedValue(client);
    fillAndSubmit();

    expect(signUp).toHaveBeenCalledWith({
      display_name: 'Lucia',
      email: 'lucia@example.com',
      password: 'dev-password-123',
      invite_code: 'spring-cohort',
    });
    await waitFor(() => expect(useAppStore.getState().sessionStatus).toBe('signed-in'));
    expect(useAppStore.getState().sessionClient).toEqual(client);
  });

  // `issues/007-entry-points-and-guards.md`: registration lands on the
  // questionnaire directly, not through the (deliberately plan-unaware) root
  // redirect.
  it('lands a freshly registered client on the questionnaire', async () => {
    signUp.mockResolvedValue(client);
    fillAndSubmit();

    expect(await screen.findByText('onboarding screen')).toBeInTheDocument();
  });

  it('disables the button while in flight, so a second press cannot register twice', async () => {
    let resolveSignUp: (value: Client) => void = () => {};
    signUp.mockReturnValue(
      new Promise<Client>((resolve) => {
        resolveSignUp = resolve;
      }),
    );
    fillAndSubmit();

    await waitFor(() => expect(pendingButton()).toBeDisabled());
    fireEvent.click(pendingButton());
    expect(signUp).toHaveBeenCalledTimes(1);

    resolveSignUp(client);
  });

  it('keeps a duplicate-email message on screen while the field is corrected', async () => {
    signUp.mockRejectedValue(
      new ApiClientError('conflict', 409, 'email_already_registered', 'email already registered'),
    );
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('email already registered');

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'other@example.com' } });
    expect(screen.getByRole('alert')).toHaveTextContent('email already registered');
  });

  // docs/mvp.md §2: registration is invite-only, and a rejected code has to read
  // as a rejected code — not as "something went wrong".
  it('shows the server rejection of a wrong invite code, not a generic failure', async () => {
    signUp.mockRejectedValue(
      new ApiClientError('unknown', 403, 'invalid_invite_code', 'that invite code is not valid'),
    );
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('that invite code is not valid');
  });

  it('reports a too-short password from the server rather than restating the rule', async () => {
    signUp.mockRejectedValue(
      new ApiClientError(
        'validation',
        400,
        'invalid_input',
        'password: Too small: expected string to have >=8 characters',
      ),
    );
    fillAndSubmit();

    expect(await screen.findByRole('alert')).toHaveTextContent('>=8 characters');
  });

  it('re-enables the button after a failure, so the athlete can retry', async () => {
    signUp.mockRejectedValue(
      new ApiClientError('conflict', 409, 'email_already_registered', 'email already registered'),
    );
    fillAndSubmit();

    await screen.findByRole('alert');
    expect(submitButton()).toBeEnabled();
  });
});
