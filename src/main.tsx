import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import './index.css'

// Spotify only accepts the 127.0.0.1 redirect URI, and login state lives per origin,
// so the app always runs on 127.0.0.1.
if (window.location.hostname === 'localhost') {
  window.location.replace(window.location.href.replace('//localhost', '//127.0.0.1'))
} else {
  const root = document.getElementById('root')
  if (!root) throw new Error('Missing #root element')
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
