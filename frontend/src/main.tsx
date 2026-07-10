import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Self-hosted fonts, bundled by Vite (no external Google Fonts request).
import '@fontsource-variable/inter/index.css'
import '@fontsource/hedvig-letters-serif/index.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
