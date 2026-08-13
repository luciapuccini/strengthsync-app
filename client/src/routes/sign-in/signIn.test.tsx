import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Client } from '@/api/types'

import { ApiClientError } from '@/api/errors'

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))

vi.mock('@/api/client', () => ({ signIn }))

import { useAppStore } from '@/store/useAppStore'

import { SignIn } from './signIn'

const UUID = '00000000-0000-4000-8000-000000000001'
const NOW = '2026-08-13T00:00:00.000Z'

const client: Client = {
  id: UUID,
  coach_id: UUID,
  display_name: 'Lucia',
  status: 'active',
  created_at: NOW,
  updated_at: NOW,
}

const REJECTED = new ApiClientError(
  'unauthorized',
  401,
  'invalid_credentials',
  'email or password is incorrect',
)

const submitButton = () => screen.getByRole('button', { name: /^sign in$/i })
const pendingButton = () => screen.getByRole('button', { name: /signing in/i })

function fillAndSubmit(email = 'lucia@example.com'): void {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'dev-password-123' } })
  fireEvent.click(submitButton())
}

beforeEach(() => {
  useAppStore.setState({ sessionStatus: 'signed-out', sessionClient: null }, false)
  render(
    <MemoryRouter>
      <SignIn />
    </MemoryRouter>,
  )
})

// Explicit: testing-library only auto-cleans when vitest runs with globals, and
// this project does not.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('sign-in form', () => {
  it('signs the returning athlete in with the client the server returns', async () => {
    signIn.mockResolvedValue(client)
    fillAndSubmit()

    expect(signIn).toHaveBeenCalledWith({
      email: 'lucia@example.com',
      password: 'dev-password-123',
    })
    await waitFor(() => expect(useAppStore.getState().sessionStatus).toBe('signed-in'))
    expect(useAppStore.getState().sessionClient).toEqual(client)
  })

  it('says the same thing for a wrong password and an unknown email', async () => {
    signIn.mockRejectedValue(REJECTED)
    fillAndSubmit('lucia@example.com')
    const wrongPassword = (await screen.findByRole('alert')).textContent

    cleanup()
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    fillAndSubmit('nobody@example.com')
    const unknownEmail = (await screen.findByRole('alert')).textContent

    expect(wrongPassword).toBe(unknownEmail)
    expect(wrongPassword).toBe('email or password is incorrect')
  })

  it('disables the button while in flight, so a second press cannot sign in twice', async () => {
    let resolveSignIn: (value: Client) => void = () => {}
    signIn.mockReturnValue(
      new Promise<Client>((resolve) => {
        resolveSignIn = resolve
      }),
    )
    fillAndSubmit()

    await waitFor(() => expect(pendingButton()).toBeDisabled())
    fireEvent.click(pendingButton())
    expect(signIn).toHaveBeenCalledTimes(1)

    resolveSignIn(client)
  })

  it('keeps the message on screen while the password is corrected, and allows a retry', async () => {
    signIn.mockRejectedValue(REJECTED)
    fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('email or password is incorrect')

    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'another-try' } })
    expect(screen.getByRole('alert')).toHaveTextContent('email or password is incorrect')
    expect(submitButton()).toBeEnabled()
  })

  it('reports an unreachable server without claiming the credentials were wrong', async () => {
    signIn.mockRejectedValue(new Error('boom'))
    fillAndSubmit()

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong')
  })
})
