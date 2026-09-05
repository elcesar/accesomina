import { useParams } from 'react-router-dom'
import { moduleByPath } from '../config/modules.js'
import PrivateModulePage from '../components/private/PrivateModulePage.jsx'

export default function ModuleWorkspacePage({ forcedModule }) {
  const { modulePath } = useParams()
  const module = moduleByPath(forcedModule || modulePath)
  if (!module) return <div className="nk-module-page"><h1>Módulo no encontrado</h1></div>
  return <PrivateModulePage moduleId={module[0]} />
}
