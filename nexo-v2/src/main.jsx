import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/tokens.css'
import './styles/theme.css'
import './styles/components.css'
import './styles/page-header.css'
import './index.css'
import './styles/nexo-klar-ui.css'
import './styles/public-layout-fixes.css'
import './styles/private-ux-improvements.css'
import './styles/operational-workspaces.css'
import './styles/clientes-workspace.css'
import './styles/ux-foundations.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
