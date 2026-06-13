import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../../contexts/ThemeContext'

const AUTO_COLLAPSE_PATHS = ['/requisicoes', '/controle', '/separacao']

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const { isDark } = useTheme()
  const location = useLocation()

  useEffect(() => {
    const shouldCollapse = AUTO_COLLAPSE_PATHS.some(p => location.pathname.startsWith(p))
    setCollapsed(shouldCollapse)
  }, [location.pathname])

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
