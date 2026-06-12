import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, BarChart2, Stethoscope,
  X, LogOut, Upload, Settings, Tv, Package, ClipboardList,
  Boxes, SendHorizonal,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../utils/helpers'

interface Props { open: boolean; onClose: () => void }

const navItems = [
  { to: '/',              label: 'Dashboard',              icon: LayoutDashboard, end: true },
  { to: '/requisicoes',   label: 'Agendamento',            icon: CalendarDays },
  { to: '/separacao',     label: 'Separação de Materiais', icon: Package },
  { to: '/controle',      label: 'Controle de Cirurgias',  icon: ClipboardList, adminOnly: true },
  { to: '/estoque',       label: 'Estoque',                icon: Boxes,         adminOnly: true, soon: true },
  { to: '/expedicao',     label: 'Expedição',              icon: SendHorizonal, adminOnly: true, soon: true },
  { to: '/usuarios',      label: 'Usuários',               icon: Users,         adminOnly: true },
  { to: '/relatorios',    label: 'Relatórios',             icon: BarChart2,     adminOnly: true },
  { to: '/importar',      label: 'Importar',               icon: Upload,        adminOnly: true },
  { to: '/configuracoes', label: 'Configurações',          icon: Settings,      adminOnly: true },
]

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout, isAdmin } = useAuth()
  const { isDark } = useTheme()

  const bg     = isDark ? '#1a2235' : 'rgba(255,255,255,0.92)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const text1  = isDark ? '#F3F4F6' : '#1D1D1F'
  const text2  = isDark ? '#D1D5DB' : '#48484A'
  const text3  = isDark ? '#9CA3AF' : '#8E8E93'
  const hover  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: bg,
        backdropFilter: 'blur(20px) saturate(1.8)',
        borderRight: `1px solid ${border}`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16" style={{ borderBottom: `1px solid ${border}` }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sm tracking-tight" style={{ color: text1 }}>Sistema OPME</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: text3 }}>NOS</p>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg" style={{ color: text3 }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-[10px] font-bold tracking-widest uppercase" style={{ color: text3 }}>Menu</p>

        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null

          if (item.soon) {
            return (
              <div key={item.to}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-not-allowed opacity-50">
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: text3 }} />
                <span className="text-sm font-medium flex-1" style={{ color: text2 }}>{item.label}</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,149,0,0.12)', color: '#FF9500' }}>EM BREVE</span>
              </div>
            )
          }

          return (
            <NavLink
              key={item.to} to={item.to} end={item.end} onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? '' : 'hover:bg-black/[0.04]'
              )}
              style={({ isActive }) => isActive
                ? { background: 'rgba(0,122,255,0.12)', color: '#007AFF' }
                : { color: text2, ...(isDark ? { ['&:hover' as string]: { background: hover } } : {}) }
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#007AFF' : text3 }} />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Painel TV */}
        {isAdmin && (
          <a href="/tv" target="_blank" rel="noopener noreferrer" onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
            style={{ color: text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Tv className="w-4 h-4 flex-shrink-0" style={{ color: text3 }} />
            Painel TV
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md"
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: text3 }}>↗</span>
          </a>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4" style={{ borderTop: `1px solid ${border}` }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}>
            {user?.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-none" style={{ color: text1 }}>{user?.nome}</p>
            <p className="text-xs truncate mt-0.5 capitalize" style={{ color: text3 }}>{user?.perfil}</p>
          </div>
        </div>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-50"
          style={{ color: text3 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#FF3B30' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = text3 }}>
          <LogOut className="w-4 h-4" /> Sair
        </button>
      </div>
    </aside>
  )
}
