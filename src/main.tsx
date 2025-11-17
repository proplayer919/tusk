import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ToastProvider, SoundProvider, MusicProvider } from './providers'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <SoundProvider>
        <MusicProvider>
          <App />
        </MusicProvider>
      </SoundProvider>
    </ToastProvider>
  </StrictMode>,
)
