import { useState, useMemo, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import type { AgendaItem, AgendaStatus } from '../../types/agenda'

function fmtDate(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function todayStr() { return new Date().toISOString().split('T')[0] }

// Texto limpo para WhatsApp (usa *negrito* do WhatsApp)
function buildWhatsAppText(item: AgendaItem): string {
  const tipo = item.emergencia ? '⚡ *EMERGÊNCIA*' : 'Agendamento'
  const lines = [
    `*AGENDAMENTO OPME - NOS*`,
    tipo,
    ``,
    `📅 *${fmtDate(item.data)}${item.horaCirurgia ? ' às ' + item.horaCirurgia : ''}*`,
    ``,
    `🏥 *Hospital:* ${item.hospital || '-'}`,
    `👨‍⚕️ *Médico:* ${item.medico || '-'}`,
    `🧑 *Paciente:* ${item.paciente || '-'}`,
    item.procedimento ? `🔧 *Procedimento:* ${item.procedimento}` : null,
    item.convenio     ? `📋 *Convênio:* ${item.convenio}`           : null,
    item.vendedor     ? `👤 *Vendedor:* ${item.vendedor}`           : null,
  ].filter((l): l is string => l !== null).join('\n')
  return lines
}

// Texto limpo para E-mail (sem asteriscos — cliente de e-mail não renderiza markdown)
function buildEmailText(item: AgendaItem): string {
  const tipo = item.emergencia ? 'EMERGÊNCIA' : 'Agendamento'
  const lines = [
    `AGENDAMENTO OPME - NOS`,
    tipo,
    ``,
    `Data: ${fmtDate(item.data)}${item.horaCirurgia ? ' às ' + item.horaCirurgia : ''}`,
    ``,
    `Hospital:      ${item.hospital || '-'}`,
    `Médico:        ${item.medico || '-'}`,
    `Paciente:      ${item.paciente || '-'}`,
    item.procedimento ? `Procedimento:  ${item.procedimento}` : null,
    item.convenio     ? `Convênio:      ${item.convenio}`     : null,
    item.vendedor     ? `Vendedor:      ${item.vendedor}`     : null,
    ``,
    `---`,
    `Sistema OPME - Grupo NOS`,
  ].filter((l): l is string => l !== null).join('\n')
  return lines
}

function shareWhatsApp(item: AgendaItem) {
  const text = buildWhatsAppText(item)
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
}

function shareEmail(item: AgendaItem) {
  const subject = encodeURIComponent(`[OPME NOS] ${item.paciente || 'Paciente'} — ${fmtDate(item.data)} — ${item.hospital || ''}`)
  const body = encodeURIComponent(buildEmailText(item))
  window.open(`mailto:?subject=${subject}&body=${body}`)
}

const ALL_STATUSES: AgendaStatus[] = [
  'agendada','em_andamento','materiais_autorizados','vale_consignacao',
  'orcamento_pre','orcamento_pos','cirurgia_finalizada','cirurgia_faturada',
  'nova_cirurgia','cancelada',
]

const STATUS_COLORS: Record<AgendaStatus, string> = {
  agendada:              'bg-blue-100 text-blue-800 border-blue-200',
  em_andamento:          'bg-yellow-100 text-yellow-800 border-yellow-200',
  materiais_autorizados: 'bg-green-100 text-green-800 border-green-200',
  vale_consignacao:      'bg-purple-100 text-purple-800 border-purple-200',
  orcamento_pre:         'bg-orange-100 text-orange-800 border-orange-200',
  orcamento_pos:         'bg-orange-100 text-orange-800 border-orange-200',
  cirurgia_finalizada:   'bg-teal-100 text-teal-800 border-teal-200',
  cirurgia_faturada:     'bg-cyan-100 text-cyan-800 border-cyan-200',
  nova_cirurgia:         'bg-sky-100 text-sky-800 border-sky-200',
  cancelada:             'bg-red-100 text-red-800 border-red-200',
}

/* ── Share Sheet (mobile) ── */
function ShareSheet({ item, onClose }: { item: AgendaItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-t-3xl p-6 pb-10 space-y-3" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-4" />
        <p className="font-bold text-slate-800 text-base mb-1">Compartilhar agendamento</p>
        <p className="text-sm text-slate-500 mb-3">{item.paciente} · {fmtDate(item.data)}</p>

        <button
          onClick={() => { shareWhatsApp(item); onClose() }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-green-50 border border-green-200 text-green-800 font-semibold text-sm active:scale-[0.98] transition-all"
        >
          <span className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
            <MessageCircle className="w-5 h-5 text-white" />
          </span>
          <div className="text-left">
            <p className="font-bold">WhatsApp</p>
            <p className="text-xs text-green-600 font-normal">Abre o WhatsApp com o texto formatado</p>
          </div>
        </button>

        <button
          onClick={() => { shareEmail(item); onClose() }}
          className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-sm active:scale-[0.98] transition-all"
        >
          <span className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-white" />
          </span>
          <div className="text-left">
            <p className="font-bold">E-mail</p>
            <p className="text-xs text-blue-600 font-normal">Abre o app de e-mail com o texto pronto</p>
          </div>
        </button>

        <button onClick={onClose}
          className="w-full py-3.5 rounded-2xl bg-slate-100 text-slate-600 font-semibold text-sm mt-1 active:scale-[0.98] transition-all">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export default function AgendaList() {
  const navigate = useNavigate()
  const { isAdmin, canEdit } = useAuth()

  const [search, setSearch]           = useState('')
  const [filterStatus, setFilterStatus] = useState<AgendaStatus | ''>('')
  const [filterData, setFilterData]   = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [items, setItems]             = useState<AgendaItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus]   = useState<AgendaStatus | ''>('')
  const [editItem, setEditItem]       = useState<AgendaItem | null>(null)
  const [shareItem, setShareItem]     = useState<AgendaItem | null>(null)

  const reload = useCallback(async () => { setItems(await getAgenda()); setSelectedIds(new Set()) }, [])
  useEffect(() => { reload() }, [reload])

  const filtered = useMemo(() => {
    const today = todayStr()
    return items.filter(item => {
      if (filterStatus && item.status !== filterStatus) return false
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
      a.data !== b.data
        ? a.data.localeCompare(b.data)
        : (a.horaCirurgia || '').localeCompare(b.horaCirurgia || '')
    )
  }, [items, search, filterStatus, filterData])

  async function handleStatusChange(id: string, status: AgendaStatus) {
    await updateAgendaStatus(id, status); reload()
  }

  async function handleAutorizadaToggle(id: string, current: boolean) {
    await updateAgendaAutorizada(id, !current); reload()
  }

  async function handleDelete(item: AgendaItem) {
    if (!confirm(`Excluir cirurgia de ${item.paciente || 'este paciente'}?`)) return
    await deleteAgendaItem(item.id); reload()
    if (selectedIds.has(item.id)) {
      const s = new Set(selectedIds); s.delete(item.id); setSelectedIds(s)
    }
  }

  function toggleSelect(id: string) {
    const s = new Set(selectedIds)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelectedIds(s)
  }

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
  const hasFilters  = filterStatus !== '' || filterData !== '' || search !== ''

  return (
    <div className="space-y-4">

      {/* Share sheet (mobile) */}
      {shareItem && <ShareSheet item={shareItem} onClose={() => setShareItem(null)} />}

      {/* Edit modal */}
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
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por paciente, hospital, médico..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFilters(v => !v)}
            className={`btn-secondary ${showFilters ? 'bg-primary-50 border-primary-300 text-primary-700' : ''}`}>
            <Filter className="w-4 h-4" />
            Filtros
            {hasFilters && <span className="w-2 h-2 rounded-full bg-primary-500 ml-0.5" />}
          </button>
          {(canEdit || isAdmin) && (
            <button onClick={() => navigate('/requisicoes/nova')} className="btn-primary">
              <Plus className="w-4 h-4" />
              {/* Texto sempre visível, mais curto no mobile */}
              <span className="sm:hidden">Agendar</span>
              <span className="hidden sm:inline">Agendar Cirurgia</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Filters ── */}
      {showFilters && (
        <div className="card p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="label text-xs">Status</label>
            <select className="input text-sm" value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as AgendaStatus | '')}>
              <option value="">Todos</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
            </select>
          </div>
          <div>
            <label className="label text-xs">Data</label>
            <select className="input text-sm" value={filterData} onChange={e => setFilterData(e.target.value)}>
              <option value="">Todas</option>
              <option value="hoje">Somente Hoje</option>
              <option value="futuros">Futuros</option>
            </select>
          </div>
          <div className="col-span-2 flex items-end">
            <button onClick={() => { setFilterStatus(''); setFilterData(''); setSearch('') }}
              className="btn-secondary btn-sm w-full">
              <X className="w-3.5 h-3.5" /> Limpar
            </button>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="flex items-center gap-6 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-primary-500" />
          <strong className="text-slate-700">{todayCount}</strong> hoje
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500" />
          <strong className="text-slate-700">{autorizadas}</strong> autorizadas
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <strong className="text-slate-700">{filtered.length}</strong> exibindo
        </span>
      </div>

      {/* ── Bulk action bar (admin only) ── */}
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5">
          <span className="text-sm font-semibold text-primary-700 flex-shrink-0">
            {selectedIds.size} selecionado{selectedIds.size > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2 flex-1">
            <select className="input text-sm flex-1" value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value as AgendaStatus | '')}>
              <option value="">Alterar status para…</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
            </select>
            <button onClick={applyBulkStatus} disabled={!bulkStatus}
              className="btn-primary btn-sm disabled:opacity-40">Aplicar</button>
          </div>
          <button onClick={() => setSelectedIds(new Set())} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Empty ── */}
      {filtered.length === 0 && (
        <div className="card p-12 text-center">
          <Calendar className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-500 mb-1 font-medium">
            {items.length === 0 ? 'Nenhuma agenda importada' : 'Nenhum resultado para os filtros'}
          </p>
          <p className="text-slate-400 text-sm">
            {items.length === 0 ? 'Importe uma planilha em Importar Agenda para começar' : 'Tente ajustar os filtros'}
          </p>
        </div>
      )}

      {/* ── Desktop table ── */}
      {filtered.length > 0 && (
        <>
          <div className="card hidden md:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {isAdmin && (
                      <th className="px-3 py-3 w-8">
                        <input type="checkbox" className="rounded"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={toggleSelectAll} />
                      </th>
                    )}
                    {['Data','Hora','Paciente','Hospital','Médico','Convênio','Vendedor','Instrumentador','Aut.','Status','Ações'].map(h => (
                      <th key={h} className="text-left px-3 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map(item => (
                    <tr key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${item.emergencia ? 'bg-red-50/40' : ''} ${selectedIds.has(item.id) ? 'bg-primary-50/40' : ''}`}>
                      {isAdmin && (
                        <td className="px-3 py-3">
                          <input type="checkbox" className="rounded"
                            checked={selectedIds.has(item.id)}
                            onChange={() => toggleSelect(item.id)} />
                        </td>
                      )}
                      <td className="px-3 py-3 text-slate-700 text-xs font-medium whitespace-nowrap">
                        {item.emergencia && (
                          <span className="block text-[9px] font-bold text-red-600 uppercase tracking-wide mb-0.5">⚡ Emerg.</span>
                        )}
                        {fmtDate(item.data)}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 whitespace-nowrap">{item.horaCirurgia || '—'}</td>
                      <td className="px-3 py-3 font-medium text-slate-800 max-w-[150px] truncate" title={item.paciente}>{item.paciente || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[130px] truncate" title={item.hospital}>{item.hospital || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[120px] truncate" title={item.medico}>{item.medico || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[110px] truncate" title={item.convenio}>{item.convenio || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[100px] truncate" title={item.vendedor}>{item.vendedor || '—'}</td>
                      <td className="px-3 py-3 text-slate-600 max-w-[100px] truncate" title={item.instrumentadores}>{item.instrumentadores || '—'}</td>
                      <td className="px-3 py-3 text-center">
                        <button onClick={() => handleAutorizadaToggle(item.id, item.autorizada)}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-colors ${item.autorizada ? 'bg-teal-500 border-teal-500 text-white' : 'border-slate-300 hover:border-teal-400'}`}>
                          {item.autorizada && <span className="text-[10px] font-bold">✓</span>}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <select value={item.status}
                          onChange={e => handleStatusChange(item.id, e.target.value as AgendaStatus)}
                          className={`text-xs font-semibold px-2 py-1 rounded-full border cursor-pointer outline-none appearance-none text-center ${STATUS_COLORS[item.status]}`}
                          style={{ minWidth: 130 }}>
                          {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => shareWhatsApp(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-green-50 hover:text-green-600 transition-colors" title="WhatsApp">
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => shareEmail(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="E-mail">
                            <Mail className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => setEditItem(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-primary-600 transition-colors" title="Editar">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Excluir">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {filtered.map(item => (
              <div key={item.id}
                className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${item.emergencia ? 'border-red-300' : ''}`}>

                {/* Cabeçalho do card */}
                <div className={`px-4 pt-4 pb-3 ${item.emergencia ? 'bg-red-50' : ''}`}>
                  {item.emergencia && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-100 border border-red-200 rounded-full px-2 py-0.5 mb-2 uppercase">
                      ⚡ Emergência
                    </span>
                  )}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-base leading-tight truncate">{item.paciente || '—'}</p>
                      <p className="text-sm text-slate-500 mt-0.5 truncate">{item.hospital || '—'}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-primary-700">{fmtDate(item.data)}</p>
                      {item.horaCirurgia && <p className="text-xs text-slate-400 font-mono">{item.horaCirurgia}</p>}
                    </div>
                  </div>
                </div>

                {/* Detalhes */}
                <div className="px-4 py-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block">Médico</span>
                    <span className="text-slate-700 font-medium">{item.medico || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Convênio</span>
                    <span className="text-slate-700 font-medium">{item.convenio || '—'}</span>
                  </div>
                  {item.vendedor && (
                    <div>
                      <span className="text-slate-400 block">Vendedor</span>
                      <span className="text-slate-700 font-medium">{item.vendedor}</span>
                    </div>
                  )}
                  {item.procedimento && (
                    <div className={item.vendedor ? '' : 'col-span-2'}>
                      <span className="text-slate-400 block">Procedimento</span>
                      <span className="text-slate-700 font-medium">{item.procedimento}</span>
                    </div>
                  )}
                </div>

                {/* Rodapé: status + ações */}
                <div className="px-4 py-3 flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Autorizada */}
                    <button onClick={() => handleAutorizadaToggle(item.id, item.autorizada)}
                      className={`flex-shrink-0 flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-full border transition-colors ${item.autorizada ? 'bg-teal-50 border-teal-200 text-teal-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                      <CheckCircle2 className={`w-3.5 h-3.5 ${item.autorizada ? 'text-teal-500' : 'text-slate-300'}`} />
                      {item.autorizada ? 'Autorizada' : 'Autorizar'}
                    </button>
                  </div>

                  {/* Ações rápidas */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Compartilhar — abre sheet */}
                    <button onClick={() => setShareItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-xs font-semibold active:scale-95 transition-all">
                      <Share2 className="w-3.5 h-3.5" />
                      Enviar
                    </button>
                    <button onClick={() => setEditItem(item)}
                      className="p-2 rounded-full text-slate-400 hover:bg-slate-200 active:scale-95 transition-all" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(item)}
                      className="p-2 rounded-full text-slate-400 hover:bg-red-100 hover:text-red-600 active:scale-95 transition-all" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Status — linha separada embaixo */}
                <div className="px-4 pb-3">
                  <select value={item.status}
                    onChange={e => handleStatusChange(item.id, e.target.value as AgendaStatus)}
                    className={`w-full text-xs font-semibold px-3 py-2 rounded-xl border outline-none appearance-none text-center ${STATUS_COLORS[item.status]}`}>
                    {ALL_STATUSES.map(s => <option key={s} value={s}>{agendaStatusLabel(s)}</option>)}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ── Edit Modal ── */
function AgendaEditModal({ item, onSave, onClose }: {
  item: AgendaItem
  onSave: (patch: Partial<AgendaItem>) => void
  onClose: () => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    data:             item.data || '',
    horaCirurgia:     item.horaCirurgia || '',
    paciente:         item.paciente || '',
    hospital:         item.hospital || '',
    medico:           item.medico || '',
    convenio:         item.convenio || '',
    procedimento:     item.procedimento || '',
    vendedor:         item.vendedor || '',
    instrumentadores: item.instrumentadores || '',
  })

  function set(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })) }
  function setUpper(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v.toUpperCase() })) }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="font-bold text-slate-800">Editar Agendamento</p>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label text-xs">Data</label>
              <input type="date" className="input text-sm" style={{ fontSize: '16px' }} min={today}
                value={form.data} onChange={e => set('data', e.target.value)} />
            </div>
            <div>
              <label className="label text-xs">Horário</label>
              <input type="time" className="input text-sm" style={{ fontSize: '16px' }}
                value={form.horaCirurgia} onChange={e => set('horaCirurgia', e.target.value)} />
            </div>
          </div>
          {([
            ['paciente','Paciente'],['hospital','Hospital'],['medico','Médico'],
            ['procedimento','Procedimento'],['convenio','Convênio'],
            ['vendedor','Vendedor'],['instrumentadores','Instrumentador'],
          ] as [keyof typeof form, string][]).map(([k, l]) => (
            <div key={k}>
              <label className="label text-xs">{l}</label>
              <input className="input uppercase" style={{ fontSize: '16px' }} value={form[k]}
                onChange={e => setUpper(k, e.target.value)} />
            </div>
          ))}
        </div>

        <div className="flex gap-3 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold">
            Cancelar
          </button>
          <button onClick={() => onSave(form)}
            className="flex-1 py-3 rounded-xl bg-primary-600 text-white text-sm font-bold">
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
