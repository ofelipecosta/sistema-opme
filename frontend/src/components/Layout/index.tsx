import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../../contexts/ThemeContext'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const { isDark } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: isDark ? '#111827' : '#f1f5f9' }}>
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(v => !v)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <div className={collapsed ? 'p-2 lg:p-3' : 'p-3 lg:p-4 max-w-screen-2xl mx-auto'}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
