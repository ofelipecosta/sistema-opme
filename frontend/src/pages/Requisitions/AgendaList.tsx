import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Plus, Search, Calendar, CheckCircle2, Clock, Filter, X,
  Edit2, Trash2, MessageCircle, Mail, Share2,
} from 'lucide-react'
import {
  getAgenda, updateAgendaStatus, updateAgendaAutorizada,
  updateAgendaItem, deleteAgendaItem
} from '../../utils/agenda-storage'
import { agendaStatusLabel } from '../../utils/agenda-helpers'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import type { AgendaItem, AgendaStatus } from '../../types/agenda'

function useT() {
  const { isDark } = useTheme()
  return {
    isDark,
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#1D1D1F',
    text2:      isDark ? '#D1D5DB' : '#48484A',
    text3:      isDark ? '#9CA3AF' : '#6B7280',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    thead:      isDark ? '#111827' : '#F8FAFC',
    rowHover:   isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    inputBg:    isDark ? '#374151' : '#ffffff',
    stripeBg:   isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
  }
}

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function todayStr() { return new Date().toISOString().split('T')[0] }

function buildWhatsAppText(item: AgendaItem): string {
  const tipo = item.emergencia ? '⚡ *EMERGÊNCIA*' : 'Agendamento'
  return [
    `*AGENDAMENTO OPME - NOS*`, tipo, ``,
    `📅 *${fmtDate(item.data)}${item.horaCirurgia ? ' às ' + item.horaCirurgia : ''}*`, ``,
    `🏥 *Hospital:* ${item.hospital || '-'}`,
    `👨‍⚕️ *Médico:* ${item.medico || '-'}`,
    `🧑 *Paciente:* ${item.paciente || '-'}`,
    item.procedimento ? `🔧 *Procedimento:* ${item.procedimento}` : null,
    item.convenio     ? `📋 *Convênio:* ${item.convenio}`           : null,
    item.vendedor     ? `👤 *Vendedor:* ${item.vendedor}`           : null,
  ].filter((l): l is string => l !== null).join('\n')
}

function buildEmailText(item: AgendaItem): string {
  return [
    `AGENDAMENTO OPME - NOS`,
    item.emergencia ? 'EMERGÊNCIA' : 'Agendamento', ``,
    `Data: ${fmtDate(item.data)}${item.horaCirurgia ? ' as ' + item.horaCirurgia : ''}`, ``,
    `Hospital:      ${item.hospital || '-'}`,
    `Medico:        ${item.medico || '-'}`,
    `Paciente:      ${item.paciente || '-'}`,
    item.procedimento ? `Procedimento:  ${item.procedimento}` : null,
    item.convenio     ? `Convenio:      ${item.convenio}`     : null,
    item.vendedor     ? `Vendedor:      ${item.vendedor}`     : null,
    ``, `---`, `Sistema OPME - Grupo NOS`,
  ].filter((l): l is string => l !== null).join('\r\n')
}

function shareWhatsApp(item: AgendaItem) {
  window.open(`https://wa.me/?text=${encodeURIComponent(buildWhatsAppText(item))}`, '_blank')
}
function shareEmail(item: AgendaItem) {
  const subject = encodeURIComponent(`[OPME NOS] ${item.paciente || 'Paciente'} — ${fmtDate(item.data)} — ${item.hospital || ''}`)
  window.open(`mailto:?subject=${subject}&body=${encodeURIComponent(buildEmailText(item))}`)
}

const ALL_STATUSES: AgendaStatus[] = [
  'agendada','em_andamento','materiais_autorizados','vale_consignacao',
  'orcamento_pre','orcamento_pos','cirurgia_finalizada','cirurgia_faturada',
  'nova_cirurgia','cancelada',
]

const STATUS_STYLE: Record<AgendaStatus, { bg: string; color: string; border: string }> = {
  agendada:              { bg: 'rgba(0,122,255,0.12)',   color: '#007AFF', border: 'rgba(0,122,255,0.25)' },
  em_andamento:          { bg: 'rgba(255,149,0,0.12)',   color: '#FF9500', border: 'rgba(255,149,0,0.25)' },
  materiais_autorizados: { bg: 'rgba(52,199,89,0.12)',   color: '#34C759', border: 'rgba(52,199,89,0.25)' },
  vale_consignacao:      { bg: 'rgba(175,82,222,0.12)',  color: '#AF52DE', border: 'rgba(175,82,222,0.25)' },
  orcamento_pre:         { bg: 'rgba(255,149,0,0.12)',   color: '#FF9500', border: 'rgba(255,149,0,0.25)' },
  orcamento_pos:         { bg: 'rgba(255,149,0,0.12)',   color: '#FF9500', border: 'rgba(255,149,0,0.25)' },
  cirurgia_finalizada:   { bg: 'rgba(0,199,190,0.12)',   color: '#00C7BE', border: 'rgba(0,199,190,0.25)' },
  cirurgia_faturada:     { bg: 'rgba(50,173,230,0.12)',  color: '#32ADE6', border: 'rgba(50,173,230,0.25)' },
  nova_cirurgia:         { bg: 'rgba(90,200,250,0.12)',  color: '#5AC8FA', border: 'rgba(90,200,250,0.25)' },
  cancelada:             { bg: 'rgba(255,59,48,0.12)',   color: '#FF3B30', border: 'rgba(255,59,48,0.25)' },
}

/* ── Share Sheet ── */
function ShareSheet({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  const T = useT()
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl p-6 pb-10 space-y-3"
        style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}
        onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-4" style={{ background: T.cardBorder }} />
        <p className="font-bold text-base mb-1" style={{ color: T.text1 }}>Compartilhar agendamento</p>
        <p className="text-sm mb-3" style={{ color: T.text3 }}>{item.paciente} · {fmtDate(item.data)}</p>

        <button onClick={() => { shareWhatsApp(item); onClose() }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.2)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#34C759' }}>
            <MessageCircle className="w-5 h-5 text-white" />
          </span>
          <div className="text-left">
            <p className="font-bold text-sm" style={{ color: '#34C759' }}>WhatsApp</p>
            <p className="text-xs font-normal mt-0.5" style={{ color: T.text3 }}>Abre o WhatsApp com o texto formatado</p>
          </div>
        </button>

        <button onClick={() => { shareEmail(item); onClose() }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all active:scale-[0.98]"
          style={{ background: 'rgba(0,122,255,0.10)', border: '1px solid rgba(0,122,255,0.2)' }}>
          <span className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#007AFF' }}>
            <Mail className="w-5 h-5 text-white" />
          </span>
          <div className="text-left">
            <p className="font-bold text-sm" style={{ color: '#007AFF' }}>E-mail</p>
            <p className="text-xs font-normal mt-0.5" style={{ color: T.text3 }}>Abre o app de e-mail com o texto pronto</p>
          </div>
        </button>

        <button onClick={onClose} className="btn-secondary w-full justify-center mt-1">Cancelar</button>
      </div>
    </div>
  )
}

export default function AgendaList() {
  const navigate = useNavigate()
  const { user, isAdmin, canEdit, permissions } = useAuth()
  const canCreate = permissions?.canCreateRequisition ?? false
  const canEditAny = (permissions?.canEditAllRequisitions || permissions?.canEditOwnRequisition) ?? false
  const canDelete = permissions?.canDeleteRequisition ?? false
  const T = useT()

  const location = useLocation()
  const locState = (location.state || {}) as { filterData?: string; filterAutorizada?: boolean }

  const [search, setSearch]                 = useState('')
  const [filterStatus, setFilterStatus]     = useState<AgendaStatus | ''>('')
  const [filterData, setFilterData]         = useState(locState.filterData || '')
  const [filterAutorizada, setFilterAutorizada] = useState(locState.filterAutorizada || false)
  const [showFilters, setShowFilters]       = useState(false)
  const [items, setItems]                   = useState<AgendaItem[]>([])
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]         = useState<AgendaStatus | ''>('')
  const [editItem, setEditItem]             = useState<AgendaItem | null>(null)
  const [shareItem, setShareItem]           = useState<AgendaItem | null>(null)

  const reload = useCallback(async () => { setItems(await getAgenda()); setSelectedIds(new Set()) }, [])
  useEffect(() => { reload() }, [reload])

  const filtered = useMemo(() => {
    const today = todayStr()
    const myName = user?.nome?.toLowerCase() ?? ''
    return items.filter(item => {
      // ── Escopo de dados por perfil ──
      if (permissions?.seeOnlyOwnAgenda && myName) {
        if (!(item.vendedor || '').toLowerCase().includes(myName)) return false
      }
      if (permissions?.seeOnlyAssignedInstrumentador && myName) {
        if (!(item.instrumentadores || '').toLowerCase().includes(myName)) return false
      }
      // ── Filtros de interface ──
      if (filterStatus && item.status !== filterStatus) return false
      if (filterAutorizada && !item.autorizada) return false
      if (filterData === 'hoje'    && item.data !== today) return false
      if (filterData === 'futuros' && item.data < today)   return false
      if (search) {
        const q = search.toLowerCase()
        return (
          (item.paciente     || '').toLowerCase().includes(q) ||
          (item.hospital     || '').toLowerCase().includes(q) ||
          (item.medico       || '').toLowerCase().includes(q) ||
          (item.procedimento || '').toLowerCase().includes(q) ||
          (item.codigo       || '').toLowerCase().includes(q)
        )
      }
      return true
    }).sort((a, b) =>
      a.data !== b.data ? a.data.localeCompare(b.data) : (a.horaCirurgia || '').localeCompare(b.horaCirurgia || '')
    )
  }, [items, search, filterStatus, filterData, filterAutorizada, permissions, user])

  async function handleStatusChange(id: string, status: AgendaStatus) {
    await updateAgendaStatus(id, status); reload()
  }
  async function handleAutorizadaToggle(id: string, current: boolean) {
    await updateAgendaAutorizada(id, !current); reload()
  }
  async function handleDelete(item: AgendaItem) {
    if (!confirm(`Excluir cirurgia de ${item.paciente || 'este paciente'}?`)) return
    await deleteAgendaItem(item.id); reload()
    if (selectedIds.has(item.id)) { const s = new Set(selectedIds); s.delete(item.id); setSelectedIds(s) }
  }
  function toggleSelect(id: string) { const s = new Set(selectedIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedIds(s) }
  function toggleSelectAll() {
    if (selectedIds.size === filtered.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filtered.map(i => i.id)))
  }
  async function applyBulkStatus() {
    if (!bulkStatus) return
    await Promise.all([...selectedIds].map(id => updateAgendaStatus(id, bulkStatus)))
    reload(); setBulkStatus('')
  }

  const todayCount  = items.filter(i => i.data === todayStr()).length
  const autorizadas = items.filter(i => i.autorizada).length
  const hasFilters  = filterStatus !== '' || filterData !== '' || search !== '' || filterAutorizada

  const inputStyle = { background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }

  return (
    <div className="space-y-4">
      {shareItem && <ShareSheet item={shareItem} onClose={() => setShareItem(null)} />}
      {editItem && (
        <AgendaEditModal
          item={editItem}
          onSave={async patch => { await updateAgendaItem(editItem.id, patch); reload(); setEditItem(null) }}
          onClose={() => setEditItem(null)}
        />
      )}

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.text3 }} />
          <input className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm outline-none"
            style={inputStyle} placeholder="Buscar por paciente, hospital, médico..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors"
            style={showFilters
              ? { background: 'rgba(0,122,255,0.10)', border: '1px solid rgba(0,122,255,0.25)', color: '#007AFF' }
              : { background: T.card, border: `1px solid ${T.cardBorder}`, color: T.text2 }}>
            <Filter className="w-4 h-4" />
            Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full" style={{ background: '#007AFF' }} />}
          </button>
          {canCreate && (
            <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary">
              <Plus className="w-4 h-4" />
              <span className="sm:hidden">Agendar</span>
              <span className="hidden sm:inline">Agendar Cirurgia</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filters panel ── */}
      {showFilters && (
        <div className="rounded-2xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>Status</label>
            <select className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={inputStyle} value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as AgendaStatus | '')}>
              <option value="">Todos</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>Data</label>
            <select className="w-full rounded-xl px-3 py-2 text-sm outline-none"
              style={inputStyle} value={filterData} onChange={e => setFilterData(e.target.value)}>
              <option value="">Todas</option>
              <option value="hoje">Somente Hoje</option>
              <option value="futuros">Futuros</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={() => { setFilterStatus(''); setFilterData(''); setSearch(''); setFilterAutorizada(false) }}
              className="flex items-center gap-1.5 w-full justify-center px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: T.thead, color: T.text2, border: `1px solid ${T.cardBorder}` }}>
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="flex items-center gap-6 text-sm" style={{ color: T.text3 }}>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" style={{ color: '#007AFF' }} />
          <strong style={{ color: T.text1 }}>{todayCount}</strong> hoje
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: '#34C759' }} />
          <strong style={{ color: T.text1 }}>{autorizadas}</strong> autorizadas
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" style={{ color: T.text3 }} />
          <strong style={{ color: T.text1 }}>{filtered.length}</strong> exibindo
        </span>
      </div>

      {/* ── Bulk action bar ── */}
      {(isAdmin || permissions?.isGestor) && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-2.5"
          style={{ background: 'rgba(0,122,255,0.08)', border: '1px solid rgba(0,122,255,0.2)' }}>
          <span className="text-sm font-semibold flex-shrink-0" style={{ color: '#007AFF' }}>
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <select className="flex-1 rounded-xl px-3 py-1.5 text-sm outline-none"
              style={inputStyle} value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as AgendaStatus | '')}>
              <option value="">Alterar status para…</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
            </select>
            <button onClick={applyBulkStatus} disabled={!bulkStatus} className="btn-primary btn-sm">Aplicar</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} style={{ color: T.text3 }}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Empty ── */}
      {filtered.length === 0 && (
        <div className="py-12 text-center rounded-2xl"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: T.text3 }} />
          <p className="font-medium mb-1" style={{ color: T.text2 }}>
            {items.length === 0 ? 'Nenhuma agenda importada' : 'Nenhum resultado para os filtros'}
          </p>
          <p className="text-sm" style={{ color: T.text3 }}>
            {items.length === 0 ? 'Importe uma planilha em Importar para começar' : 'Tente ajustar os filtros'}
          </p>
        </div>
      )}

      {/* ── Desktop table ── */}
      {filtered.length > 0 && (
        <>
          <div className="hidden md:block rounded-2xl overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
                    {(isAdmin || permissions?.isGestor) && (
                      <th className="px-3 py-3 w-8">
                        <input type="checkbox" className="rounded"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll} />
                      </th>
                    )}
                    {['Cód.','Data','Hora','Paciente','Hospital','Convênio','Médico','Cliente','Procedimento','Instrumentador','Vendedor','Aut.','Status','Ações'].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: T.text3 }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const ss = STATUS_STYLE[item.status]
                    return (
                      <tr key={item.id}
                        style={{
                          borderBottom: `1px solid ${T.divider}`,
                          background: item.emergencia
                            ? 'rgba(255,59,48,0.05)'
                            : selectedIds.has(item.id)
                              ? 'rgba(0,122,255,0.06)'
                              : idx % 2 === 0 ? T.card : T.stripeBg,
                        }}>
                        {(isAdmin || permissions?.isGestor) && (
                          <td className="px-3 py-3">
                            <input type="checkbox" className="rounded"
                              checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} />
                          </td>
                        )}
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: T.text3 }}>{item.codigo || '—'}</td>
                        <td className="px-3 py-3 text-xs font-medium whitespace-nowrap" style={{ color: T.text2 }}>
                          {item.emergencia && (
                            <span className="block text-[9px] font-bold uppercase tracking-wide mb-0.5" style={{ color: '#FF3B30' }}>⚡ Emerg.</span>
                          )}
                          {fmtDate(item.data)}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: T.text3 }}>{item.horaCirurgia || '—'}</td>
                        <td className="px-3 py-3 font-semibold min-w-[140px]" style={{ color: T.text1 }}>{item.paciente || '—'}</td>
                        <td className="px-3 py-3 min-w-[120px]" style={{ color: T.text2 }}>{item.hospital || '—'}</td>
                        <td className="px-3 py-3 min-w-[100px]" style={{ color: T.text2 }}>{item.convenio || '—'}</td>
                        <td className="px-3 py-3 min-w-[110px]" style={{ color: T.text2 }}>{item.medico || '—'}</td>
                        <td className="px-3 py-3 min-w-[110px]" style={{ color: T.text2 }}>{item.cliente || '—'}</td>
                        <td className="px-3 py-3 min-w-[120px]" style={{ color: T.text2 }}>{item.procedimento || '—'}</td>
                        <td className="px-3 py-3 min-w-[100px]" style={{ color: T.text2 }}>{item.instrumentadores || '—'}</td>
                        <td className="px-3 py-3 min-w-[90px]" style={{ color: T.text2 }}>{item.vendedor || '—'}</td>
                        <td className="px-3 py-3 text-center">
                          <button onClick={() => handleAutorizadaToggle(item.id, item.autorizada)}
                            className="w-5 h-5 rounded flex items-center justify-center mx-auto transition-colors"
                            style={item.autorizada
                              ? { background: '#34C759', border: '2px solid #34C759', color: '#fff' }
                              : { border: `2px solid ${T.cardBorder}` }}>
                            {item.autorizada && <span className="text-[10px] font-bold">✓</span>}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <select value={item.status}
                            onChange={e => handleStatusChange(item.id, e.target.value as AgendaStatus)}
                            className="text-xs font-semibold px-2 py-1 rounded-full cursor-pointer outline-none appearance-none text-center"
                            style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, minWidth: 130 }}>
                            {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => shareWhatsApp(item)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: T.text3 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#34C759')}
                              onMouseLeave={e => (e.currentTarget.style.color = T.text3)}
                              title="WhatsApp">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => shareEmail(item)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: T.text3 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#007AFF')}
                              onMouseLeave={e => (e.currentTarget.style.color = T.text3)}
                              title="E-mail">
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                            {canEditAny && (
                              <button onClick={() => setEditItem(item)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: T.text3 }}
                                onMouseEnter={e => (e.currentTarget.style.color = '#007AFF')}
                                onMouseLeave={e => (e.currentTarget.style.color = T.text3)}
                                title="Editar">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {canDelete && (
                              <>
                                <div className="w-px h-4 mx-0.5" style={{ background: T.divider }} />
                                <button onClick={() => handleDelete(item)}
                                  className="p-1.5 rounded-lg transition-colors"
                                  style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}
                                  title="Excluir">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map(item => {
              const ss = STATUS_STYLE[item.status]
              return (
                <div key={item.id} className="rounded-2xl overflow-hidden"
                  style={{
                    background: T.card,
                    border: `1px solid ${item.emergencia ? 'rgba(255,59,48,0.3)' : T.cardBorder}`,
                    borderLeft: `4px solid ${item.emergencia ? '#FF3B30' : ss.color}`,
                  }}>

                  <div className="px-4 pt-4 pb-3"
                    style={{ background: item.emergencia ? 'rgba(255,59,48,0.05)' : 'transparent' }}>
                    {item.emergencia && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 mb-2 uppercase"
                        style={{ background: 'rgba(255,59,48,0.12)', color: '#FF3B30', border: '1px solid rgba(255,59,48,0.25)' }}>
                        ⚡ Emergência
                      </span>
                    )}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-base leading-tight truncate" style={{ color: T.text1 }}>{item.paciente || '—'}</p>
                        <p className="text-sm mt-0.5 truncate" style={{ color: T.text3 }}>{item.hospital || '—'}</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm font-bold" style={{ color: '#007AFF' }}>{fmtDate(item.data)}</p>
                        {item.horaCirurgia && <p className="text-xs font-mono" style={{ color: T.text3 }}>{item.horaCirurgia}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs"
                    style={{ borderTop: `1px solid ${T.divider}` }}>
                    <div>
                      <span className="block mb-0.5" style={{ color: T.text3 }}>Médico</span>
                      <span className="font-medium" style={{ color: T.text2 }}>{item.medico || '—'}</span>
                    </div>
                    <div>
                      <span className="block mb-0.5" style={{ color: T.text3 }}>Convênio</span>
                      <span className="font-medium" style={{ color: T.text2 }}>{item.convenio || '—'}</span>
                    </div>
                    {item.vendedor && (
                      <div>
                        <span className="block mb-0.5" style={{ color: T.text3 }}>Vendedor</span>
                        <span className="font-medium" style={{ color: T.text2 }}>{item.vendedor}</span>
                      </div>
                    )}
                    {item.procedimento && (
                      <div className={item.vendedor ? '' : 'col-span-2'}>
                        <span className="block mb-0.5" style={{ color: T.text3 }}>Procedimento</span>
                        <span className="font-medium" style={{ color: T.text2 }}>{item.procedimento}</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 flex items-center justify-between gap-2"
                    style={{ borderTop: `1px solid ${T.divider}`, background: T.stripeBg }}>
                    <button onClick={() => handleAutorizadaToggle(item.id, item.autorizada)}
                      className="flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors"
                      style={item.autorizada
                        ? { background: 'rgba(52,199,89,0.10)', border: '1px solid rgba(52,199,89,0.25)', color: '#34C759' }
                        : { background: T.card, border: `1px solid ${T.cardBorder}`, color: T.text3 }}>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {item.autorizada ? 'Autorizada' : 'Autorizar'}
                    </button>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setShareItem(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold active:scale-95 transition-all"
                        style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: T.text2 }}>
                        <Share2 className="w-3.5 h-3.5" /> Enviar
                      </button>
                      {canEditAny && (
                        <button onClick={() => setEditItem(item)}
                          className="p-2 rounded-full active:scale-95 transition-all"
                          style={{ color: T.text3 }}>
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(item)}
                          className="p-2 rounded-full active:scale-95 transition-all"
                          style={{ color: '#FF3B30' }}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="px-4 pb-3" style={{ borderTop: `1px solid ${T.divider}` }}>
                    <select value={item.status}
                      onChange={e => handleStatusChange(item.id, e.target.value as AgendaStatus)}
                      className="w-full text-xs font-semibold px-3 py-2 rounded-xl outline-none appearance-none text-center mt-3"
                      style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                      {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
                    </select>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Edit Modal ── */
function AgendaEditModal({ item, onSave, onClose }: {
  item: AgendaItem; onSave: (patch: Partial<AgendaItem>) => void; onClose: () => void
}) {
  const T = useT()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    data: item.data || '', horaCirurgia: item.horaCirurgia || '',
    paciente: item.paciente || '', hospital: item.hospital || '',
    medico: item.medico || '', convenio: item.convenio || '',
    procedimento: item.procedimento || '', vendedor: item.vendedor || '',
    instrumentadores: item.instrumentadores || '',
  })
  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function setUpper(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v.toUpperCase() })) }
  const inputSt = { background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1, fontSize: 16 }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col"
        style={{ background: T.card }}>
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${T.divider}` }}>
          <p className="font-bold" style={{ color: T.text1 }}>Editar Agendamento</p>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: T.text3 }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>Data</label>
              <input type="date" min={today} className="w-full rounded-xl px-3 py-2.5 outline-none"
                style={inputSt} value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>Horário</label>
              <input type="time" className="w-full rounded-xl px-3 py-2.5 outline-none"
                style={inputSt} value={form.horaCirurgia} onChange={e => set('horaCirurgia', e.target.value)} />
            </div>
          </div>
          {([
            ['paciente','Paciente'],['hospital','Hospital'],['medico','Médico'],
            ['procedimento','Procedimento'],['convenio','Convênio'],
            ['vendedor','Vendedor'],['instrumentadores','Instrumentador'],
          ] as [keyof typeof form, string][]).map(([k, l]) => (
            <div key={k}>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text3 }}>{l}</label>
              <input className="w-full rounded-xl px-3 py-2.5 outline-none uppercase"
                style={inputSt} value={form[k]} onChange={e => setUpper(k, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-5 py-4" style={{ borderTop: `1px solid ${T.divider}` }}>
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancelar</button>
          <button onClick={() => onSave(form)} className="btn-primary flex-1 justify-center">Salvar</button>
        </div>
      </div>
    </div>
  )
}
