import { IconInbox } from '@tabler/icons-react'
export default function EmptyState({ objectLabel = 'registros', filtered = false, actionLabel, onAction, disabled = false }) {
  return <div className="nk-empty-state" role="status">
    <IconInbox size={28} aria-hidden="true" />
    <strong>{filtered ? 'No hay resultados para estos filtros.' : `Todavía no hay ${objectLabel}.`}</strong>
    <p>{filtered ? 'Revisa la búsqueda o cambia los filtros para ver otros registros.' : onAction ? `Comienza con «${actionLabel}».` : 'Los registros aparecerán aquí cuando estén disponibles.'}</p>
    {onAction && <button className="nk-button nk-button-secondary" type="button" onClick={onAction} disabled={disabled}>{actionLabel}</button>}
  </div>
}
