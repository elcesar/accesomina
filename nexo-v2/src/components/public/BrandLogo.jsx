export default function BrandLogo({ variant = 'color', claim = true, className = '' }) {
  const file = variant === 'white'
    ? 'NK-blanco-horizontal.svg'
    : claim ? 'NK-color-horizontal-claim.svg' : 'NK-color-horizontal.svg'

  return <img className={`nk-brand-logo ${className}`} src={`/brand/${file}`} alt="Nexo Klar" />
}
