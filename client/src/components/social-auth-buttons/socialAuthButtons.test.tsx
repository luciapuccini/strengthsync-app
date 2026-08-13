import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SocialAuthButtons } from './socialAuthButtons';

const apple = () => screen.getByRole('button', { name: /continue with apple/i });
const google = () => screen.getByRole('button', { name: /continue with google/i });

beforeEach(() => {
  render(<SocialAuthButtons />);
});

// Explicit: testing-library only auto-cleans when vitest runs with globals, and
// this project does not.
afterEach(cleanup);

describe('social auth buttons', () => {
  // The point of the slice: they used to render live and do nothing at all.
  it('renders both providers, so the front door still looks like itself', () => {
    expect(apple()).toBeInTheDocument();
    expect(google()).toBeInTheDocument();
  });

  // `toBeDisabled` asserts the native attribute, which is what removes a button
  // from the tab order and, with the variant's `disabled:pointer-events-none`,
  // from the pointer's reach. `aria-disabled` would satisfy neither.
  it('disables both, so neither pointer nor keyboard can activate them', () => {
    expect(apple()).toBeDisabled();
    expect(google()).toBeDisabled();
  });

  it('captions why, and describes both buttons by that caption', () => {
    const caption = screen.getByText(/social sign-in isn't available yet/i);

    expect(apple()).toHaveAttribute('aria-describedby', caption.id);
    expect(google()).toHaveAttribute('aria-describedby', caption.id);
  });

  // Below the buttons, not above them. This is the one thing about the caption
  // that the auth screens' mobile layout depends on: added height that lands
  // after the submit button moves nothing that was above it.
  it('places the caption after both buttons', () => {
    const caption = screen.getByText(/social sign-in isn't available yet/i);

    expect(apple().compareDocumentPosition(caption)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(google().compareDocumentPosition(caption)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
