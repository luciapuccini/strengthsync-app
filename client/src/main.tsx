import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import '@fontsource-variable/geist'
import '@fontsource-variable/geist-mono'

import App from '@/App'
import '@/index.css'

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
