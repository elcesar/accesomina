import { IconArrowRight, IconInfoCircle } from '@tabler/icons-react'

export function PrerequisiteNotice({ children, actions = [] }) {
  if (!children) return null

  return (
    <aside className="nk-prerequisite-notice" role="status" aria-live="polite">
      <IconInfoCircle className="nk-prerequisite-notice-icon" size={20} aria-hidden="true" />
      <div className="nk-prerequisite-notice-content">{children}</div>
      {actions.length > 0 && (
        <div className="nk-prerequisite-notice-actions">
          {actions.map(action => (
            <button key={action.label} className="nk-button nk-button-secondary" type="button" onClick={action.onClick}>
              {action.label}<IconArrowRight size={16} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
