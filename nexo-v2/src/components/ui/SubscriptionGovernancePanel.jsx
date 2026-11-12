import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../../services/api.js'
import { useAuth } from '../../services/auth.jsx'
import { ActionButton } from './ActionButton.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const emptyPolicy = () => ({ kind: 'CANCELLATION', status: 'DRAFT', noticeDays: '', retentionDays: '', reference: '', reason: '' })
const kinds = { CANCELLATION: 'Cancelación', RETENTION: 'Retención' }
const profiles = { COMMERCIAL: 'Comercial', OPERATIONS: 'Operaciones' }

export default function SubscriptionGovernancePanel({ access, onAccessChanged }) {
  const { session } = useAuth()
  const capabilities = access?.capabilities || []
  const canOperators = capabilities.includes('operators.manage')
  const canPolicies = capabilities.includes('policies.manage')
  const [operators, setOperators] = useState([])
  const [policies, setPolicies] = useState([])
  const [versions, setVersions] = useState(null)
  const [current, setCurrent] = useState({ cancellation: null, retention: null })
  const [operator, setOperator] = useState({ userId: '', profile: 'COMMERCIAL', reason: '' })
  const [policy, setPolicy] = useState(emptyPolicy)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmation, setConfirmation] = useState(null)
  const generation = useRef(0)
  const identity = `${session?.tenant?.id || ''}:${session?.user?.id || ''}`

  const refresh = useCallback(async () => {
    const revision = ++generation.current
    setLoading(true)
    try {
      const [users, data] = await Promise.all([
        canOperators ? api.get('/subscriptions/admin/operators') : Promise.resolve({ operators: [] }),
        canPolicies ? api.get('/subscriptions/admin/policies') : Promise.resolve(null),
      ])
      if (revision !== generation.current) return
      setOperators(users.operators || [])
      setPolicies(data?.policies || [])
      setCurrent(data?.current || { cancellation: null, retention: null })
      const valid = ['CANCELLATION', 'RETENTION'].every(kind => Number.isInteger(data?.latestVersions?.[kind]) && data.latestVersions[kind] >= 0)
      setVersions(valid ? data.latestVersions : null)
      if (canPolicies && !valid) throw new Error('No pudimos comprobar las versiones de las políticas. Actualiza antes de guardar.')
      setError('')
    } catch (failure) {
      if (revision === generation.current) setVersions(null)
      throw failure
    } finally { if (revision === generation.current) setLoading(false) }
  }, [identity, canOperators, canPolicies])

  useEffect(() => {
    setOperators([]); setPolicies([]); setVersions(null); setCurrent({ cancellation: null, retention: null })
    setOperator({ userId: '', profile: 'COMMERCIAL', reason: '' }); setPolicy(emptyPolicy())
    setError(''); setSuccess(''); setConfirmation(null)
    if (canOperators || canPolicies) refresh().catch(failure => setError(failure.message))
    else setLoading(false)
    return () => { generation.current += 1 }
  }, [refresh, canOperators, canPolicies])

  if (!canOperators && !canPolicies) return null

  const editableUsers = operators.filter(user => user.userId !== session?.user?.id && user.role !== 'domian_admin')
  const selectedUser = editableUsers.find(user => user.userId === operator.userId)
  function prepareOperator(event) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!selectedUser || operator.reason.trim().length < 3) { setError('Selecciona un usuario y explica el motivo.'); return }
    if (operator.profile && !selectedUser.active) { setError('Activa al usuario antes de delegar permisos. Puedes revocar su perfil mientras está inactivo.'); return }
    setConfirmation({ type: 'operator', title: operator.profile ? 'Delegar permisos de suscripciones' : 'Revocar permisos de suscripciones',
      description: `${selectedUser.name}: ${operator.profile ? profiles[operator.profile] : 'sin perfil delegado'}. Su rol de acceso general se conserva.`,
      payload: { ...operator, profile: operator.profile || null, reason: operator.reason.trim() } })
  }
  function preparePolicy(event) {
    event.preventDefault(); setError(''); setSuccess('')
    if (!versions) { setError('Actualiza las versiones antes de guardar.'); return }
    const field = policy.kind === 'CANCELLATION' ? 'noticeDays' : 'retentionDays'
    const days = policy[field] === '' ? null : Number(policy[field])
    if (policy.reason.trim().length < 3) { setError('Indica el motivo de esta versión.'); return }
    if (days !== null && (!Number.isInteger(days) || days < 0 || days > 36500)) { setError('Indica un plazo entero entre 0 y 36500 días.'); return }
    if (policy.status === 'APPROVED' && (days === null || policy.reference.trim().length < 3)) { setError('Para aprobar, indica el plazo y la referencia de aprobación.'); return }
    setConfirmation({ type: 'policy', title: 'Guardar versión de política',
      description: 'Se registrará una versión administrativa. Esta acción no cancela cuentas ni elimina información.',
      payload: { kind: policy.kind, status: policy.status, noticeDays: policy.kind === 'CANCELLATION' ? days : null,
        retentionDays: policy.kind === 'RETENTION' ? days : null, reference: policy.reference.trim(), reason: policy.reason.trim(),
        automaticDeletion: false, expectedVersion: versions[policy.kind] } })
  }
  async function confirm() {
    if (!confirmation || saving) return
    setSaving(true); setError('')
    try {
      if (confirmation.type === 'operator') {
        const { userId, ...payload } = confirmation.payload
        await api.patch(`/subscriptions/admin/operators/${encodeURIComponent(userId)}`, payload)
        setOperator(previous => ({ ...previous, reason: '' }))
      } else {
        await api.post('/subscriptions/admin/policies', confirmation.payload)
        setPolicy(emptyPolicy())
      }
      const message = confirmation.type === 'operator' ? 'Permisos de suscripciones actualizados y auditados.' : 'Versión registrada. No se cancelaron cuentas ni se eliminó información.'
      setConfirmation(null)
      await refresh()
      await onAccessChanged?.()
      setSuccess(message)
    } catch (failure) {
      setConfirmation(null)
      try { await refresh() } catch {}
      setError(failure.message)
    } finally { setSaving(false) }
  }
  const policyField = policy.kind === 'CANCELLATION' ? 'noticeDays' : 'retentionDays'

  return <section className="nk-subscription-governance" aria-label="Permisos y políticas de suscripciones">
    <h2>Permisos y políticas</h2>
    <p>Los perfiles de suscripciones se asignan a usuarios de la administración global. La autenticación, MFA y los roles generales se conservan.</p>
    {error && <p role="alert" className="nk-field-error">{error}</p>}
    {error && <ActionButton type="button" className="nk-button nk-button-secondary" disabled={loading || saving} disabledReason="Espera a que termine la operación." onClick={() => refresh().catch(failure => setError(failure.message))}>Reintentar perfiles y políticas</ActionButton>}
    {success && <p role="status">{success}</p>}
    {loading && <p role="status">Cargando permisos y políticas…</p>}
    {canOperators && <section>
      <h3>Perfiles delegados</h3>
      <p>Comercial revisa, aprueba y programa solicitudes y sus documentos. Operaciones ejecuta solicitudes autorizadas y gestiona contrataciones independientes. Ninguno puede modificar precios.</p>
      <form onSubmit={prepareOperator} className="nk-form-grid" noValidate>
        <label htmlFor="subscription-operator-user">Usuario existente
          <select id="subscription-operator-user" value={operator.userId} onChange={event => setOperator({ ...operator, userId: event.target.value })} disabled={loading || saving}>
            <option value="">Selecciona un usuario</option>
            {editableUsers.map(user => <option key={user.userId} value={user.userId}>{user.name} · {user.email}{user.active ? '' : ' · Inactivo'}</option>)}
          </select>
        </label>
        <label htmlFor="subscription-operator-profile">Perfil de suscripciones
          <select id="subscription-operator-profile" value={operator.profile} onChange={event => setOperator({ ...operator, profile: event.target.value })} disabled={loading || saving}>
            <option value="COMMERCIAL">Comercial</option><option value="OPERATIONS">Operaciones</option><option value="">Revocar perfil</option>
          </select>
        </label>
        <label htmlFor="subscription-operator-reason">Motivo del cambio de permisos
          <textarea id="subscription-operator-reason" value={operator.reason} maxLength={2000} onChange={event => setOperator({ ...operator, reason: event.target.value })} disabled={saving} />
        </label>
        <ActionButton className="nk-button nk-button-primary" type="submit" disabled={loading || saving} disabledReason="Espera a que termine la operación.">Guardar permisos</ActionButton>
      </form>
      <ul>{operators.map(user => <li key={user.userId}>{user.name}: {user.role === 'domian_admin' ? 'Administración global' : profiles[user.profile] || 'Sin perfil delegado'}{user.active ? '' : ' (inactivo)'}</li>)}</ul>
    </section>}
    {canPolicies && <section>
      <h3>Políticas de cancelación y retención</h3>
      <p>Los plazos sin definición se mantienen vacíos. Registrar o aprobar una política no ejecuta cancelaciones ni borrados automáticos.</p>
      <p>Cancelación aprobada: {current.cancellation ? `versión ${current.cancellation.version}, aviso ${current.cancellation.noticeDays} días` : 'Sin definir'}. Retención aprobada: {current.retention ? `versión ${current.retention.version}, ${current.retention.retentionDays} días` : 'Sin definir'}.</p>
      <form onSubmit={preparePolicy} className="nk-form-grid" noValidate>
        <label htmlFor="subscription-policy-kind">Tipo de política
          <select id="subscription-policy-kind" value={policy.kind} disabled={saving} onChange={event => setPolicy({ ...policy, kind: event.target.value })}><option value="CANCELLATION">Cancelación</option><option value="RETENTION">Retención</option></select>
        </label>
        <label htmlFor="subscription-policy-status">Estado de la política
          <select id="subscription-policy-status" value={policy.status} disabled={saving} onChange={event => setPolicy({ ...policy, status: event.target.value })}><option value="DRAFT">Borrador</option><option value="APPROVED">Aprobada</option></select>
        </label>
        <label htmlFor="subscription-policy-days">{policy.kind === 'CANCELLATION' ? 'Días de aviso' : 'Días de retención'}
          <input id="subscription-policy-days" type="number" min="0" max="36500" step="1" value={policy[policyField]} disabled={saving} onChange={event => setPolicy({ ...policy, [policyField]: event.target.value })} />
        </label>
        <label htmlFor="subscription-policy-reference">Referencia de aprobación
          <input id="subscription-policy-reference" value={policy.reference} maxLength={2000} disabled={saving} onChange={event => setPolicy({ ...policy, reference: event.target.value })} />
        </label>
        <label htmlFor="subscription-policy-reason">Motivo de la versión
          <textarea id="subscription-policy-reason" value={policy.reason} maxLength={2000} disabled={saving} onChange={event => setPolicy({ ...policy, reason: event.target.value })} />
        </label>
        <ActionButton className="nk-button nk-button-primary" type="submit" disabled={loading || saving || !versions} disabledReason="Actualiza las versiones antes de guardar.">Guardar versión</ActionButton>
      </form>
      <h4>Historial de políticas</h4>
      <p>Se muestran hasta 200 versiones. Última versión de cancelación: {versions?.CANCELLATION ?? '—'}. Última versión de retención: {versions?.RETENTION ?? '—'}.</p>
      <ul>{policies.map(item => <li key={item.id}>{kinds[item.kind]} · versión {item.version} · {item.status === 'APPROVED' ? 'Aprobada' : 'Borrador'} · {item.kind === 'CANCELLATION' ? item.noticeDays : item.retentionDays} días · {item.reference || 'Sin referencia'}</li>)}</ul>
    </section>}
    <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title} description={confirmation?.description} confirmLabel="Confirmar" loading={saving} onConfirm={confirm} onCancel={() => !saving && setConfirmation(null)} />
  </section>
}
