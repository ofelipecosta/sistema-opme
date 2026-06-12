import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useTheme } from '../../contexts/ThemeContext'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { isDark } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: isDark ? '#111827' : '#f1f5f9' }}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-screen-2xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
