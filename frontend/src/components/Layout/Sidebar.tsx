import { NavLink } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Users, BarChart2, Stethoscope, X, LogOut, Upload, Settings, Tv, Package, ClipboardList } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../utils/helpers'

interface Props {
  open: boolean
  onClose: () => void
}

const navItems = [
  { to: '/',              label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/requisicoes',   label: 'Agendamento',        icon: CalendarDays },
  { to: '/separacao',    label: 'Separação de Materiais', icon: Package },
  { to: '/usuarios',      label: 'Usuários',        icon: Users,    adminOnly: true },
  { to: '/relatorios',    label: 'Relatórios',      icon: BarChart2,     adminOnly: true },
  { to: '/controle',      label: 'Controle de Cirurgias', icon: ClipboardList, adminOnly: true },
  { to: '/importar',      label: 'Importar',        icon: Upload,        adminOnly: true },
  { to: '/configuracoes', label: 'Configurações',   icon: Settings, adminOnly: true },
]

export default function Sidebar({ open, onClose }: Props) {
  const { user, logout, isAdmin } = useAuth()

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-60 flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        borderRight: '1px solid rgba(0,0,0,0.07)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16"
        style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none">
            <p className="font-bold text-sm tracking-tight" style={{ color: '#1D1D1F' }}>Sistema OPME</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: '#8E8E93' }}>NOS</p>
          </div>
        </div>
        <button onClick={onClose}
          className="lg:hidden p-1.5 rounded-lg transition-colors"
          style={{ color: '#8E8E93' }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 pt-1 pb-2 text-xs font-semibold tracking-widest uppercase"
          style={{ color: '#8E8E93' }}>
          Menu
        </p>
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) => cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive ? '' : 'hover:bg-black/[0.04]'
              )}
              style={({ isActive }) => isActive ? {
                background: 'rgba(0,122,255,0.10)',
                color: '#007AFF',
              } : {
                color: '#48484A',
              }}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: isActive ? '#007AFF' : '#8E8E93' }}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          )
        })}

        {/* Painel TV — abre em nova aba */}
        {isAdmin && (
          <a
            href="/tv"
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 hover:bg-black/[0.04]"
            style={{ color: '#48484A' }}
          >
            <Tv className="w-4 h-4 flex-shrink-0" style={{ color: '#8E8E93' }} />
            Painel TV
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md" style={{ background: 'rgba(0,0,0,0.05)', color: '#8E8E93' }}>↗</span>
          </a>
        )}
      </nav>

      {/* User info */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'rgba(0,0,0,0.03)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
            style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}>
            {user?.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate leading-none" style={{ color: '#1D1D1F' }}>
              {user?.nome}
            </p>
            <p className="text-xs truncate mt-0.5 capitalize" style={{ color: '#8E8E93' }}>
              {user?.perfil}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-50"
          style={{ color: '#8E8E93' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#FF3B30')}
          onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  )
}
