// ─────────────────────────────────────────────────────────────────────────────
// src/client/index.js — Point d'entrée React
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import store from './store'
import App from './components/App'
import './styles/global.css'

const container = document.getElementById('root')
const root = createRoot(container)

root.render(
  <Provider store={store}>
    <App />
  </Provider>
)
