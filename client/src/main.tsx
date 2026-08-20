import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

import App from '@/App';
import '@/index.css';
import { setUnauthorizedHandler } from '@/api/client';
import { AUTH0_AUDIENCE, AUTH0_CLIENT_ID, AUTH0_DOMAIN } from '@/lib/auth0';
import { useAppStore } from '@/store/useAppStore';

// Wired here rather than in a component so it happens exactly once, before the
// first render, with no StrictMode double-mount to guard against. Clearing the
// session is all it does: the route guard reads that status and sends the
// athlete back to sign-in from wherever they were.
setUnauthorizedHandler(() => {
  useAppStore.getState().signOutSession();
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('root element not found');

createRoot(rootElement).render(
  <StrictMode>
    {/*
      Authorization Code + PKCE. `redirect_uri` is the app's own origin, so the
      SDK handles the `?code=&state=` on whatever route the browser lands on and
      strips it from the URL itself — no callback route of ours, and no coupling
      between this provider and the router.

      `cacheLocation` is deliberately not set: the default is memory, and the
      point of this whole arrangement is that no access token is ever written to
      `localStorage`, where any script on the page can read it.

      That default is also why `useRefreshTokensFallback` is on and set
      explicitly rather than left alone. It defaults to *false*, and with a
      memory cache a full page reload has no refresh token left to rotate — so
      with the default, every reload would silently drop the athlete back to the
      login page. The fallback is silent authentication in a hidden iframe
      against the Auth0 session cookie, which works here only because
      `auth.strengthsync.ai` and `app.strengthsync.ai` are the same site: a
      vendor domain would be a third-party cookie, and Safari's tracking
      prevention would refuse it. Getting the custom domain in issue 010 is what
      pays for this.
    */}
    <Auth0Provider
      domain={AUTH0_DOMAIN}
      clientId={AUTH0_CLIENT_ID}
      authorizationParams={{
        audience: AUTH0_AUDIENCE,
        redirect_uri: window.location.origin,
      }}
      useRefreshTokens
      useRefreshTokensFallback
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
);
