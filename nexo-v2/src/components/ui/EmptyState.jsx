import { IconInbox } from '@tabler/icons-react'
import './EmptyState.css'

/**
 * Estado vacío transversal. El contenedor decide si hay registros o si la
 * búsqueda/filtro no tuvo resultados; nunca usarlo para errores de carga.
 */
export default function EmptyState({
  objectLabel = 'registros',
  filtered = false,
  title,
  description,
  actionLabel,
  onAction,
  disabled = false,
}) {
  const heading = title || (filtered
    ? 'No encontramos resultados con esos criterios.'
    : `Todavía no hay ${objectLabel}.`)
  const detail = description || (filtered
    ? 'Ajusta la búsqueda o limpia los filtros para ver otros resultados.'
    : 'Los registros aparecerán aquí cuando estén disponibles.')
  return (
    <div className="nk-empty-state" role="status">
      <IconInbox size={28} aria-hidden="true" />
      <h3>{heading}</h3>
      <p>{detail}</p>
      {onAction && actionLabel && (
        <button type="button" className="nk-button nk-button-secondary"
          onClick={onAction} disabled={disabled}>{actionLabel}</button>
      )}
    </div>
  )
}
