import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '@fontsource-variable/geist';
import '@fontsource-variable/geist-mono';

import App from '@/App';
import '@/index.css';
import { setUnauthorizedHandler } from '@/api/client';
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
    <App />
  </StrictMode>,
);
