import { IconInbox } from '@tabler/icons-react'

export default function EmptyState({
  objectLabel = 'registros',
  filtered = false,
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
}) {
  const heading = title || (filtered ? 'No hay resultados para estos filtros.' : `Todavía no hay ${objectLabel}.`)
  const detail = description || (filtered
    ? 'Revisa la búsqueda o cambia los filtros para ver otros registros.'
    : onAction
      ? `Comienza con «${actionLabel}».`
      : 'Los registros aparecerán aquí cuando estén disponibles.')

  return <div className="nk-empty-state" role="status">
    <IconInbox size={28} aria-hidden="true" />
    <strong>{heading}</strong>
    <p>{detail}</p>
    {onAction && <button className="nk-button nk-button-secondary" type="button" onClick={onAction} disabled={disabled}>{actionLabel}</button>}
  </div>
}
