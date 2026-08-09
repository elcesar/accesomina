import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'

export default function AppLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F4EFE3', overflow: 'hidden' }}>
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>
        <main style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
