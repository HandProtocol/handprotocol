import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

// One-time migration of pre-rename browser state (wxl:* -> yuhm:*).
try {
  for (const store of [localStorage, sessionStorage]) {
    for (const key of Object.keys(store)) {
      if (!key.startsWith('wxl:')) continue
      const next = `yuhm:${key.slice(4)}`
      const value = store.getItem(key)
      if (value !== null && store.getItem(next) === null) store.setItem(next, value)
      store.removeItem(key)
    }
  }
} catch { /* storage unavailable */ }

const root = document.getElementById('root')

if (!root) throw new Error('Root element #root was not found')

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
