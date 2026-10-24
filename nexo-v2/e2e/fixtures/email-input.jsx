import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { EmailInput } from '../../src/components/ui/EmailInput.jsx'
import '../../src/styles/tokens.css'
import '../../src/styles/base.css'
import '../../src/styles/components.css'

function Fixture() {
  const [optional, setOptional] = useState('')
  const [required, setRequired] = useState('')
  return <main>
    <label htmlFor="optional-email">Correo opcional</label>
    <EmailInput id="optional-email" value={optional} onChange={setOptional} aria-describedby="email-help" />
    <p id="email-help">Puedes dejarlo vacío.</p>
    <label htmlFor="required-email">Correo obligatorio</label>
    <EmailInput id="required-email" value={required} onChange={setRequired} required />
    <button type="button">Salir del campo</button>
  </main>
}

createRoot(document.getElementById('root')).render(<Fixture />)
