import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Users, BarChart2, Stethoscope,
  X, LogOut, Upload, Settings, Tv, Package, ClipboardList,
  ChevronDown, PanelLeftClose, PanelLeftOpen, BookOpen, UserCheck,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { cn } from '../../utils/helpers'
import { useState } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}

const ALL_MAIN = [
  { to: '/',            label: 'Dashboard',              icon: LayoutDashboard, end: true,  navKey: 'dashboard'   as const },
  { to: '/requisicoes', label: 'Agendamento',            icon: CalendarDays,                navKey: 'agendamento' as const },
  { to: '/separacao',   label: 'Separação de Materiais', icon: Package,                     navKey: 'separacao'   as const },
  { to: '/controle',    label: 'Controle de Cirurgias',  icon: ClipboardList,               navKey: 'controle'    as const },
  { to: '/relatorios',       label: 'Relatórios',            icon: BarChart2,   navKey: 'relatorios'       as const },
  { to: '/instrumentadores', label: 'Instrumentadores',     icon: UserCheck,   navKey: 'instrumentadores' as const },
]

const ALL_CONFIG = [
  { to: '/configuracoes', label: 'Configurações', icon: Settings, navKey: 'configuracoes' as const },
  { to: '/cadastros',     label: 'Cadastros',     icon: BookOpen, navKey: 'cadastros'     as const },
  { to: '/usuarios',      label: 'Usuários',      icon: Users,    navKey: 'usuarios'      as const },
  { to: '/importar',      label: 'Importar',      icon: Upload,   navKey: 'importar'      as const },
]

const ALL_CONFIG_PATHS = ALL_CONFIG.map(i => i.to)

export default function Sidebar({ open, onClose, collapsed, onToggleCollapse }: Props) {
  const { user, logout, permissions } = useAuth()
  const nav = permissions?.nav
  const { isDark } = useTheme()
  const location = useLocation()

  const visibleMain   = ALL_MAIN.filter(i => nav?.[i.navKey])
  const visibleConfig = ALL_CONFIG.filter(i => nav?.[i.navKey])
  const hasConfigMenu = visibleConfig.length > 0

  const isConfigActive = ALL_CONFIG_PATHS.some(p => location.pathname.startsWith(p))
  const [configOpen, setConfigOpen] = useState(isConfigActive)

  const bg     = isDark ? '#1a2235' : 'rgba(255,255,255,0.92)'
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'
  const text1  = isDark ? '#F3F4F6' : '#1D1D1F'
  const text2  = isDark ? '#D1D5DB' : '#48484A'
  const text3  = isDark ? '#9CA3AF' : '#8E8E93'
  const hover  = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'

  const w = collapsed ? 'lg:w-[60px]' : 'lg:w-60'
  // on mobile the drawer is never "collapsed" — only desktop respects it
  const col = collapsed  // alias; used below with `lg:` prefix guards

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-all duration-300 lg:translate-x-0 lg:static lg:z-auto lg:w-60',
        w,
        open ? 'translate-x-0' : '-translate-x-full'
      )}
      style={{
        background: bg,
        backdropFilter: 'blur(20px) saturate(1.8)',
        borderRight: `1px solid ${border}`,
      }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-3 h-16 flex-shrink-0" style={{ borderBottom: `1px solid ${border}` }}>
        {/* Always show full logo on mobile; on desktop respect collapsed */}
        <div className={cn('flex items-center gap-2.5 min-w-0', col && 'lg:hidden')}>
          <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center shadow-sm"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #60a5fa 100%)' }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <div className="leading-none min-w-0">
            <p className="font-bold text-sm tracking-tight truncate" style={{ color: text1 }}>Sistema OPME</p>
            <p className="text-xs mt-0.5 font-medium" style={{ color: text3 }}>NOS</p>
          </div>
        </div>
        {col && (
          <div className="hidden lg:flex w-8 h-8 rounded-xl items-center justify-center shadow-sm mx-auto"
            style={{ background: 'linear-gradient(135deg, #2563EB 0%, #60a5fa 100%)' }}>
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
        )}
        <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg ml-auto" style={{ color: text3 }}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto overflow-x-hidden">
        <p className={cn('px-3 pt-1 pb-2 text-[10px] font-bold tracking-widest uppercase', col && 'lg:hidden')} style={{ color: text3 }}>Menu</p>

        {visibleMain.map(item => (
          <NavLink
            key={item.to} to={item.to} end={item.end}
            onClick={onClose}
            title={col ? item.label : undefined}
            className={({ isActive }) => cn(
              'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              col ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5',
              isActive ? '' : 'hover:bg-black/[0.04]'
            )}
            style={({ isActive }) => isActive
              ? { background: 'rgba(0,122,255,0.12)', color: '#007AFF' }
              : { color: text2 }
            }
          >
            {({ isActive }) => (
              <>
                <item.icon className="w-4 h-4 flex-shrink-0" style={{ color: isActive ? '#007AFF' : text3 }} />
                <span className={cn(col && 'lg:hidden')}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Painel TV */}
        {nav?.configuracoes && (
          <a href="/tv" target="_blank" rel="noopener noreferrer" onClick={onClose}
            title={col ? 'Painel TV' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-xl text-sm font-medium transition-all duration-150',
              col ? 'lg:justify-center lg:px-0 px-3 py-2.5' : 'px-3 py-2.5'
            )}
            style={{ color: text2 }}
            onMouseEnter={e => (e.currentTarget.style.background = hover)}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <Tv className="w-4 h-4 flex-shrink-0" style={{ color: text3 }} />
            <span className={cn('flex items-center gap-1 flex-1', col && 'lg:hidden')}>
              Painel TV
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md"
                style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', color: text3 }}>↗</span>
            </span>
          </a>
        )}

        {/* Configurações — submenu completo: sempre mobile, desktop só se não colapsado */}
        {hasConfigMenu && (
          <div className={cn('pt-1', col && 'lg:hidden')}>
            <button
              onClick={() => setConfigOpen(v => !v)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
              style={isConfigActive ? { background: 'rgba(0,122,255,0.12)', color: '#007AFF' } : { color: text2 }}
              onMouseEnter={e => { if (!isConfigActive) (e.currentTarget as HTMLElement).style.background = hover }}
              onMouseLeave={e => { if (!isConfigActive) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
            >
              <Settings className="w-4 h-4 flex-shrink-0" style={{ color: isConfigActive ? '#007AFF' : text3 }} />
              <span className="flex-1 text-left">Configurações</span>
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{ color: isConfigActive ? '#007AFF' : text3, transform: configOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>
            {configOpen && (
              <div className="mt-0.5 ml-3 pl-3 space-y-0.5" style={{ borderLeft: `1.5px solid ${border}` }}>
                {visibleConfig.map(item => (
                  <NavLink
                    key={item.to} to={item.to} onClick={onClose}
                    className={({ isActive }) => cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                      isActive ? '' : 'hover:bg-black/[0.04]'
                    )}
                    style={({ isActive }) => isActive
                      ? { background: 'rgba(0,122,255,0.10)', color: '#007AFF' }
                      : { color: text2 }
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: isActive ? '#007AFF' : text3 }} />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Configurações ícone — desktop colapsado apenas */}
        {hasConfigMenu && col && visibleConfig[0] && (
          <NavLink
            to={visibleConfig[0].to}
            title={visibleConfig[0].label}
            className={({ isActive }) => cn(
              'hidden lg:flex items-center justify-center rounded-xl py-2.5 transition-all duration-150',
              isActive ? '' : 'hover:bg-black/[0.04]'
            )}
            style={({ isActive }) => isActive
              ? { background: 'rgba(0,122,255,0.12)', color: '#007AFF' }
              : { color: text2 }
            }
          >
            {({ isActive }) => (
              <Settings className="w-4 h-4" style={{ color: isActive ? '#007AFF' : text3 }} />
            )}
          </NavLink>
        )}
      </nav>

      {/* Toggle collapse button — desktop only */}
      <div className="hidden lg:flex px-2 pb-2" style={{ borderTop: `1px solid ${border}` }}>
        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          className={cn(
            'flex items-center gap-2 rounded-xl py-2 text-xs font-medium transition-colors w-full',
            collapsed ? 'justify-center px-0' : 'px-3'
          )}
          style={{ color: text3 }}
          onMouseEnter={e => (e.currentTarget.style.background = hover)}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          {collapsed
            ? <PanelLeftOpen className="w-4 h-4" />
            : <><PanelLeftClose className="w-4 h-4" /><span>Recolher</span></>
          }
        </button>
      </div>

      {/* User info — full: always mobile, desktop only when not collapsed */}
      <div className={cn('px-3 py-4', col && 'lg:hidden')} style={{ borderTop: `1px solid ${border}` }}>
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

      {/* User avatar — desktop collapsed only */}
      {col && (
        <div className="hidden lg:flex px-2 py-3 flex-col items-center gap-2" style={{ borderTop: `1px solid ${border}` }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(0,122,255,0.12)', color: '#007AFF' }}>
            {user?.nome?.charAt(0)?.toUpperCase()}
          </div>
          <button onClick={logout} title="Sair" className="p-1.5 rounded-lg transition-colors"
            style={{ color: text3 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FF3B30')}
            onMouseLeave={e => (e.currentTarget.style.color = text3)}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}
