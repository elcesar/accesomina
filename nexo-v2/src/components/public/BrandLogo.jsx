export default function BrandLogo({ variant = 'color', claim = true, orientation = 'horizontal', className = '' }) {
  const prefix = variant === 'white' ? 'NK-blanco' : variant === 'mono' ? 'NK-1tinta' : 'NK-color'
  const shouldUseClaim = orientation === 'vertical' && variant !== 'mono' ? true : claim
  const suffix = `${orientation}${shouldUseClaim ? '-claim' : ''}`
  const file = `${prefix}-${suffix}.svg`

  return <img className={`nk-brand-logo ${className}`} src={`/brand/${file}`} alt="Nexo Klar" />
}
