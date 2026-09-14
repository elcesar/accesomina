import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { restorePreferredTheme } from './services/theme.js'
import './styles/tokens.css'
import './styles/theme.css'
import './styles/foundations.css'
import './styles/application-layout.css'
import './styles/components.css'
import './styles/private-workspaces.css'

restorePreferredTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
