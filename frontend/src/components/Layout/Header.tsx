import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, FileText, AlertTriangle, CheckCircle2, Trash2, Moon, Sun } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { getRequisitions } from '../../utils/storage'
import { statusLabel, statusColor, formatDate } from '../../utils/helpers'
import type { Requisition } from '../../types'

const NOTIF_CLEARED_KEY = 'opme_notif_cleared_at'
function getNotifClearedAt(): string { return localStorage.getItem(NOTIF_CLEARED_KEY) || '' }
function clearNotifications(): void  { localStorage.setItem(NOTIF_CLEARED_KEY, new Date().toISOString()) }

interface Props { onMenuClick: () => void }

const titles: Record<string, string> = {
  '/':                 'Dashboard',
  '/requisicoes':      'Agendamento',
  '/requisicoes/nova': 'Nova Cirurgia',
  '/usuarios':         'Usuários',
  '/usuarios/novo':    'Novo Usuário',
  '/relatorios':       'Relatórios',
  '/importar':         'Importar Agenda',
  '/configuracoes':    'Configurações',
  '/separacao':        'Separação de Materiais',
}

export default function Header({ onMenuClick }: Props) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { canEdit, isAdmin, user } = useAuth()
  const { isDark, toggle: toggleTheme } = useTheme()
  const hBg    = isDark ? 'rgba(26,34,53,0.95)' : 'rgba(255,255,255,0.88)'
  const hBorder= isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'
  const hText  = isDark ? '#F3F4F6' : '#1D1D1F'
  const hText3 = isDark ? '#9CA3AF' : '#8E8E93'
  const [showNotif, setShowNotif] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)

  const title = Object.entries(titles).find(([path]) => location.pathname === path)?.[1]
    || (location.pathname.includes('/editar') ? 'Editar Requisição' : 'Detalhes')

  const [clearedAt, setClearedAt] = useState(getNotifClearedAt)
  const [allReqs, setAllReqs] = useState<Requisition[]>([])

  useEffect(() => {
    getRequisitions().then(setAllReqs).catch(() => {})
  }, [])

  const myReqs = isAdmin ? allReqs : allReqs.filter(r => r.solicitanteId === user?.id)
  const visibleReqs = clearedAt
    ? myReqs.filter(r => r.createdAt && new Date(r.createdAt) > new Date(clearedAt))
    : myReqs
  const recent = [...visibleReqs]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0).getTime() - new Date(a.updatedAt || a.createdAt || 0).getTime())
    .slice(0, 6)
  const pendingCount = visibleReqs.filter(r => !['finalizada','cancelada'].includes(r.status)).length

  function handleClearNotifications() {
    clearNotifications()
    setClearedAt(new Date().toISOString())
    setShowNotif(false)
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false)
    }
    if (showNotif) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showNotif])

  return (
    <header className="px-4 h-14 flex items-center gap-3 sticky top-0 z-10"
      style={{ background: hBg, backdropFilter: 'blur(20px) saturate(1.8)', borderBottom: `1px solid ${hBorder}` }}>
      <button onClick={onMenuClick} className="lg:hidden p-1.5 rounded-lg transition-colors" style={{ color: hText3 }}>
        <Menu className="w-5 h-5" />
      </button>

      <h1 className="text-sm font-semibold flex-1 truncate" style={{ color: hText, letterSpacing: '-0.01em' }}>{title}</h1>

      <div className="flex items-center gap-2">
        {/* Dark mode toggle */}
        <button onClick={toggleTheme}
          className="p-2 rounded-xl transition-colors"
          style={{ color: hText3, background: isDark ? 'rgba(255,255,255,0.08)' : 'transparent' }}
          title={isDark ? 'Modo claro' : 'Modo escuro'}>
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotif(v => !v)}
            className="relative p-2 rounded-xl transition-colors hover:bg-black/[0.05]"
            style={{ color: hText3 }}
          >
            <Bell className="w-4 h-4" />
            {pendingCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
                style={{ background: '#FF3B30' }}>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-10 w-80 rounded-2xl z-50 overflow-hidden"
              style={{ background: isDark ? 'rgba(31,41,55,0.98)' : 'rgba(255,255,255,0.96)', backdropFilter: 'blur(30px) saturate(1.8)', border: `1px solid ${hBorder}`, boxShadow: '0 12px 40px rgba(0,0,0,0.20)' }}>
              {/* Header */}
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                <p className="text-sm font-semibold" style={{ color: '#1D1D1F' }}>Agendamentos</p>
                <span className="text-xs" style={{ color: '#8E8E93' }}>{pendingCount} pendente{pendingCount !== 1 ? 's' : ''}</span>
              </div>

              {/* List */}
              <div className="max-h-72 overflow-y-auto">
                {recent.length === 0 ? (
                  <div className="py-8 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2" style={{ color: '#D1D1D6' }} />
                    <p className="text-sm" style={{ color: '#8E8E93' }}>Nenhum agendamento</p>
                  </div>
                ) : recent.map(r => (
                  <button key={r.id}
                    onClick={() => { navigate(`/requisicoes/${r.id}`); setShowNotif(false) }}
                    className="w-full text-left px-4 py-3 transition-colors hover:bg-black/[0.03]"
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {r.tipoCirurgia === 'emergencia'
                            ? <AlertTriangle className="w-3 h-3 flex-shrink-0" style={{ color: '#FF3B30' }} />
                            : <FileText className="w-3 h-3 flex-shrink-0" style={{ color: '#C7C7CC' }} />
                          }
                          <span className="text-xs font-mono" style={{ color: '#8E8E93' }}>{r.numero}</span>
                        </div>
                        <p className="text-sm font-medium truncate" style={{ color: '#1D1D1F' }}>{r.pacienteNome || 'Paciente não informado'}</p>
                        <p className="text-xs truncate" style={{ color: '#8E8E93' }}>{r.hospitalNome}{r.cirurgiaData ? ` · ${formatDate(r.cirurgiaData)}` : ''}</p>
                      </div>
                      <span className={`badge flex-shrink-0 text-xs mt-0.5 ${statusColor(r.status)}`}>
                        {statusLabel(r.status)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                <button onClick={() => { navigate('/requisicoes'); setShowNotif(false) }}
                  className="text-xs font-medium transition-colors" style={{ color: '#007AFF' }}>
                  Ver todos →
                </button>
                {recent.length > 0 && (
                  <button onClick={handleClearNotifications}
                    className="flex items-center gap-1 text-xs transition-colors" style={{ color: '#8E8E93' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#FF3B30')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}>
                    <Trash2 className="w-3 h-3" /> Limpar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
