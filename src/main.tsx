import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    // Avisa a UI (UpdateBanner) que há nova versão
    window.dispatchEvent(new Event('pwa:need-refresh'))
  },
})

// Quando o usuário clica em "Atualizar" no banner
window.addEventListener('pwa:do-update', () => { updateSW(true) })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
