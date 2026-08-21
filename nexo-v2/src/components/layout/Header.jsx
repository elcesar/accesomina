import { IconSearch, IconBell } from '@tabler/icons-react'

export default function Header({ title, subtitle }) {
  return (
    <header
      style={{
        height: 56,
        background: '#FFFFFF',
        borderBottom: '1px solid #E3DED2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        flexShrink: 0,
      }}
    >
      <div>
        <h1 style={{ fontSize: 15, fontWeight: 700, color: '#141A20', lineHeight: 1, margin: 0, fontFamily: 'Manrope, sans-serif' }}>
          {title}
        </h1>
        {subtitle && (
          <p style={{ fontSize: 12, color: '#5D6B7A', margin: '3px 0 0', lineHeight: 1 }}>
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <button
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none', background: 'transparent',
            color: '#8A96A1', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FBF9F5'; e.currentTarget.style.color = '#141A20' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A96A1' }}
        >
          <IconSearch size={16} strokeWidth={1.7} />
        </button>
        <button
          style={{
            width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 8, border: 'none', background: 'transparent',
            color: '#8A96A1', cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FBF9F5'; e.currentTarget.style.color = '#141A20' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#8A96A1' }}
        >
          <IconBell size={16} strokeWidth={1.7} />
        </button>
      </div>
    </header>
  )
}
