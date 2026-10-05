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

setUnauthorizedHandler(() => {
  useAppStore.getState().signOutSession();
});

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('root element not found');

createRoot(rootElement).render(
  <StrictMode>
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
