import { useEffect, useState } from 'react'
import { IconKey, IconRefresh, IconUsers } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'

const roleLabel={client_admin:'Administrador',rrhh:'Personas y operación',prevencion:'Prevención',acreditacion:'Cumplimiento',consulta:'Solo lectura',domian_admin:'Administrador Nexo Klar'}

export default function UsuariosPermisosPage(){
  const {session}=useAuth(),[users,setUsers]=useState([]),[message,setMessage]=useState(''),[loading,setLoading]=useState(true),[sending,setSending]=useState('')
  const admin=['client_admin','domian_admin'].includes(session?.user?.role)
  const load=async()=>{setLoading(true);try{setUsers(await api.get('/users'))}catch(error){setMessage(error.message||'No fue posible cargar los usuarios.')}finally{setLoading(false)}}
  useEffect(()=>{load()},[])
  const reset=async user=>{if(!window.confirm(`Se enviará un enlace de restablecimiento a ${user.email}. ¿Continuar?`))return;setSending(user.id);setMessage('');try{const result=await api.post(`/users/${user.id}/reset-password`,{});setMessage(result.delivery==='pending_configuration'?'La solicitud quedó registrada. Falta configurar el correo saliente para entregar el enlace.':`Enlace de restablecimiento enviado a ${user.email}.`)}catch(error){setMessage(error.message||'No fue posible solicitar el restablecimiento.')}finally{setSending('')}}
  return <section className="nk-module-page"><header className="nk-module-header"><div><p className="nk-module-kicker">Gestión y administración</p><h1>Usuarios y permisos</h1><p>Administra los accesos de tu empresa. Las contraseñas nunca se muestran ni se envían a administradores.</p></div><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button></header>{message&&<p className="nk-form-message">{message}</p>}<section className="nk-report-workspace"><header><div><h2><IconUsers size={18}/> Personas con acceso</h2><p>Un administrador puede enviar un enlace temporal al correo autorizado de otro usuario.</p></div></header>{loading?<p>Cargando usuarios...</p>:<div className="nk-table-wrap"><table><thead><tr><th>Persona</th><th>Correo</th><th>Permiso</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{users.length?users.map(user=>{const self=user.id===session?.user?.id;return <tr key={user.id}><td><b>{user.full_name}</b>{self&&<small>Sesión actual</small>}</td><td>{user.email}</td><td>{roleLabel[user.role]||user.role}</td><td>{user.active?'Activo':'Suspendido'}</td><td>{admin&&!self?<button className="nk-button nk-button-secondary" disabled={sending===user.id} onClick={()=>reset(user)}><IconKey size={15}/>{sending===user.id?'Enviando...':'Restablecer acceso'}</button>:'—'}</td></tr>}):<tr><td colSpan="5">No hay usuarios registrados.</td></tr>}</tbody></table></div>}</section></section>
}
