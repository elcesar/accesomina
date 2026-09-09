import { useLocation, useNavigate } from 'react-router-dom'
import { IconMenu2 } from '@tabler/icons-react'
import { useAuth } from '../../services/auth.jsx'
import { canUseModule, moduleFor } from '../private/moduleCatalog.js'
import { MODULES } from '../../config/modules.js'

const pathFor = id => id === '/' ? '/app' : `/app/${id}`

export default function MobileModuleNav() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const current = location.pathname.replace(/^\/app\/?/, '') || '/'
  const modules = MODULES.filter(([id]) => canUseModule(moduleFor(id), session))

  return <label className="nk-mobile-module-nav">
    <IconMenu2 size={17} aria-hidden="true" />
    <span className="sr-only">Cambiar módulo</span>
    <select aria-label="Cambiar módulo" value={current} onChange={event => navigate(pathFor(event.target.value))}>
      <option value="/">Panel de control</option>
      {modules.map(([id, title]) => <option key={id} value={id}>{title}</option>)}
    </select>
  </label>
}
