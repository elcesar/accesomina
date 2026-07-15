import { IconSearch, IconBell } from '@tabler/icons-react'

export default function Header({ title, subtitle }) {
  return (
    <header className="h-14 bg-surface border-b border-white/8 flex items-center justify-between px-6 flex-shrink-0">
      <div>
        <h1 className="text-sm font-semibold text-white leading-none">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors">
          <IconSearch size={16} />
        </button>
        <button className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors relative">
          <IconBell size={16} />
        </button>
      </div>
    </header>
  )
}
