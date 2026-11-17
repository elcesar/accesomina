/**
 * A semantic table primitive for the private portal.
 *
 * A caption is required at the call site so each table keeps a useful name for
 * screen-reader navigation without adding visual noise to the operational UI.
 */
export default function AccessibleTable({ caption, children, ...props }) {
  if (!caption) {
    throw new Error('AccessibleTable requires a descriptive caption.')
  }

  return (
    <table {...props}>
      <caption className="nk-sr-only">{caption}</caption>
      {children}
    </table>
  )
}
