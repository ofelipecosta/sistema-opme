import { useState, useMemo, useEffect } from 'react'
import {
  FileSpreadsheet, FileText, Filter, Search, X, ChevronDown, ChevronUp,
  Package, AlertTriangle, CheckCircle2, XCircle, Zap, Download,
  Calendar, Clock, ArrowUpDown, ArrowUp, ArrowDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequisitions } from '../../utils/storage'
import { getAgenda } from '../../utils/agenda-storage'
import { statusLabel, formatDate, formatDateTime, surgeryTypeLabel } from '../../utils/helpers'
import { agendaStatusLabel } from '../../utils/agenda-helpers'
import { useTheme } from '../../contexts/ThemeContext'
import type { Requisition } from '../../types'
import type { AgendaItem } from '../../types/agenda'

/* ─── Theme ─────────────────────────────────────────────────────────── */
function useT() {
  const { isDark } = useTheme()
  return {
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#1D1D1F',
    text2:      isDark ? '#D1D5DB' : '#48484A',
    text3:      isDark ? '#9CA3AF' : '#6B7280',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
    thead:      isDark ? '#111827' : '#F8FAFC',
    inputBg:    isDark ? '#374151' : '#ffffff',
    hover:      isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    shadow:     isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.05)',
  }
}

const C = {
  blue: '#007AFF', green: '#34C759', teal: '#00C7BE',
  orange: '#FF9500', red: '#FF3B30', purple: '#AF52DE', indigo: '#5856D6',
}

/* ─── Unified row ─────────────────────────────────────────────────────
   Combines AgendaItem and Requisition into one flat shape for display. */
interface ReportRow {
  id:            string
  source:        'agenda' | 'requisicao'
  numero?:       string
  data:          string        // YYYY-MM-DD (surgery date)
  hora?:         string
  paciente:      string
  hospital:      string
  cidade?:       string
  estado?:       string
  convenio:      string
  medico:        string
  cliente?:      string
  procedimento:  string
  vendedor:      string
  instrumentador?: string
  emergencia:    boolean
  autorizada?:   boolean
  status:        string        // raw status key
  statusDisplay: string        // human label
  createdAt:     string
}

const AGENDA_STATUS_COLOR: Record<string, string> = {
  agendada:              C.blue,
  em_andamento:          C.orange,
  materiais_autorizados: C.green,
  vale_consignacao:      C.purple,
  orcamento_pre:         '#FF9500',
  orcamento_pos:         '#FF6B00',
  cirurgia_finalizada:   C.teal,
  cirurgia_faturada:     '#20B2AA',
  nova_cirurgia:         '#00BCD4',
  cancelada:             C.red,
}
const REQ_STATUS_COLOR: Record<string, string> = {
  rascunho:          '#C7C7CC',
  enviada:           C.blue,
  em_analise:        C.orange,
  aprovada:          C.green,
  separacao_material:C.purple,
  material_enviado:  C.indigo,
  finalizada:        C.teal,
  cancelada:         C.red,
}

function rowColor(r: ReportRow): string {
  return r.source === 'agenda'
    ? (AGENDA_STATUS_COLOR[r.status] || '#C7C7CC')
    : (REQ_STATUS_COLOR[r.status]    || '#C7C7CC')
}

/* ─── Normalizers ──────────────────────────────────────────────────── */
function agendaToRow(a: AgendaItem): ReportRow {
  return {
    id:            a.id,
    source:        'agenda',
    data:          a.data,
    hora:          a.horaCirurgia,
    paciente:      a.paciente,
    hospital:      a.hospital,
    convenio:      a.convenio,
    medico:        a.medico,
    cliente:       a.cliente,
    procedimento:  a.procedimento,
    vendedor:      a.vendedor,
    instrumentador:a.instrumentadores,
    emergencia:    a.emergencia || false,
    autorizada:    a.autorizada,
    status:        a.status,
    statusDisplay: agendaStatusLabel(a.status),
    createdAt:     a.importadoEm,
  }
}

function reqToRow(r: Requisition): ReportRow {
  return {
    id:            r.id,
    source:        'requisicao',
    numero:        r.numero,
    data:          r.cirurgiaData || '',
    hora:          r.cirurgiaHorario,
    paciente:      r.pacienteNome || '',
    hospital:      r.hospitalNome || '',
    cidade:        r.hospitalCidade,
    estado:        r.hospitalEstado,
    convenio:      r.cirurgiaConvenio || '',
    medico:        r.medicoNome || '',
    procedimento:  r.cirurgiaProcedimento || '',
    vendedor:      r.vendedorNome || '',
    instrumentador:r.instrumentadorNome,
    emergencia:    r.tipoCirurgia === 'emergencia',
    status:        r.status,
    statusDisplay: statusLabel(r.status),
    createdAt:     r.createdAt || '',
  }
}

/* ─── Status option lists for filter UI ───────────────────────────── */
const AGENDA_STATUSES = [
  'agendada','nova_cirurgia','orcamento_pre','orcamento_pos',
  'materiais_autorizados','vale_consignacao','em_andamento',
  'cirurgia_finalizada','cirurgia_faturada','cancelada',
]
const REQ_STATUSES = [
  'rascunho','enviada','em_analise','aprovada',
  'separacao_material','material_enviado','finalizada','cancelada',
]

function statusDisplayLabel(s: string): string {
  // Try agenda label first, then req label
  const agendaMap: Record<string,string> = {
    agendada:'Agendada', nova_cirurgia:'Nova cirurgia', orcamento_pre:'Orçamento pré',
    orcamento_pos:'Orçamento pós', materiais_autorizados:'Mat. Autorizados',
    vale_consignacao:'Vale/Consignação', em_andamento:'Em andamento',
    cirurgia_finalizada:'Cirurgia finalizada', cirurgia_faturada:'Cirurgia faturada',
    cancelada:'Cancelada',
  }
  const reqMap: Record<string,string> = {
    rascunho:'Rascunho', enviada:'Enviada', em_analise:'Em análise',
    aprovada:'Aprovada', separacao_material:'Separação', material_enviado:'Mat. Enviado',
    finalizada:'Finalizada',
  }
  return agendaMap[s] || reqMap[s] || s
}

function statusColor(s: string): string {
  return AGENDA_STATUS_COLOR[s] || REQ_STATUS_COLOR[s] || '#C7C7CC'
}

/* ─── Smart filter helpers ─────────────────────────────────────────── */
function todayStr() { return new Date().toISOString().split('T')[0] }
function nDaysStr(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0] }

type SortField = 'data' | 'createdAt' | 'hospital' | 'paciente' | 'medico' | 'status'
type SortDir   = 'asc' | 'desc'
type ViewMode  = 'registros' | 'hospital' | 'medico' | 'convenio' | 'vendedor' | 'status'
type DateField = 'data' | 'createdAt'

const VIEW_TABS = [
  { id: 'registros', label: 'Registros'    },
  { id: 'hospital',  label: 'Por Hospital' },
  { id: 'medico',    label: 'Por Médico'   },
  { id: 'convenio',  label: 'Por Convênio' },
  { id: 'vendedor',  label: 'Por Vendedor' },
  { id: 'status',    label: 'Por Status'   },
] as const

const DATE_FIELDS: { value: DateField; label: string }[] = [
  { value: 'data',      label: 'Data da Cirurgia'  },
  { value: 'createdAt', label: 'Data de Criação'   },
]

/* ══════════════════════════════════════════════════════════════════ */
export default function Reports() {
  const T = useT()

  /* data */
  const [allRows, setAllRows] = useState<ReportRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [agenda, reqs] = await Promise.all([getAgenda(), getRequisitions()])
      // Agenda is the primary source.
      // Requisitions that already have a synced agenda entry (id = req_<reqId>) should
      // not be shown separately — the agenda row is already there.
      const agendaIds = new Set(agenda.map(a => a.id))
      const agendaRows = agenda.map(agendaToRow)
      const reqRows    = reqs
        .filter(r => !agendaIds.has(`req_${r.id}`))
        .map(reqToRow)
      setAllRows([...agendaRows, ...reqRows])
      setLoading(false)
    }
    load()
  }, [])

  /* filters */
  const [activeSmartFilter, setActiveSmartFilter] = useState<string | null>(null)
  const [search,            setSearch]            = useState('')
  const [showAdvanced,      setShowAdvanced]      = useState(false)
  const [filterHospital,    setFilterHospital]    = useState('')
  const [filterConvenio,    setFilterConvenio]    = useState('')
  const [filterMedico,      setFilterMedico]      = useState('')
  const [filterVendedor,    setFilterVendedor]    = useState('')
  const [filterCidade,      setFilterCidade]      = useState('')
  const [filterTipo,        setFilterTipo]        = useState<'emergencia' | 'eletiva' | ''>('')
  const [filterStatuses,    setFilterStatuses]    = useState<Set<string>>(new Set())
  const [dateField,         setDateField]         = useState<DateField>('data')
  const [periodoInicio,     setPeriodoInicio]     = useState('')
  const [periodoFim,        setPeriodoFim]        = useState('')

  /* sort / view */
  const [sortField, setSortField] = useState<SortField>('data')
  const [sortDir,   setSortDir]   = useState<SortDir>('desc')
  const [viewMode,  setViewMode]  = useState<ViewMode>('registros')

  /* option lists (derived from actual data) */
  const hospitals  = useMemo(() => [...new Set(allRows.map(r => r.hospital).filter(Boolean))].sort(), [allRows])
  const convenios  = useMemo(() => [...new Set(allRows.map(r => r.convenio).filter(Boolean))].sort(), [allRows])
  const medicos    = useMemo(() => [...new Set(allRows.map(r => r.medico).filter(Boolean))].sort(), [allRows])
  const vendedores = useMemo(() => [...new Set(allRows.map(r => r.vendedor).filter(Boolean))].sort(), [allRows])
  const cidades    = useMemo(() => [...new Set(allRows.map(r => r.cidade).filter(Boolean) as string[])].sort(), [allRows])

  /* status list — all statuses present in actual data */
  const allStatuses = useMemo(() => {
    const present = new Set(allRows.map(r => r.status))
    return [...AGENDA_STATUSES, ...REQ_STATUSES].filter(s => present.has(s))
  }, [allRows])

  function toggleStatus(s: string) {
    setFilterStatuses(prev => { const n = new Set(prev); n.has(s) ? n.delete(s) : n.add(s); return n })
  }

  function clearAll() {
    setActiveSmartFilter(null); setSearch('')
    setFilterHospital(''); setFilterConvenio(''); setFilterMedico('')
    setFilterVendedor(''); setFilterCidade(''); setFilterTipo('')
    setFilterStatuses(new Set()); setPeriodoInicio(''); setPeriodoFim('')
  }

  const hasFilters = !!(activeSmartFilter || search || filterHospital || filterConvenio ||
    filterMedico || filterVendedor || filterCidade || filterTipo ||
    filterStatuses.size || periodoInicio || periodoFim)

  /* ── Smart filter definitions (work on ReportRow) ── */
  const SMART_FILTERS = useMemo(() => [
    { id:'hoje',        label:'Hoje',                  icon:<Calendar size={12}/>,      color:C.blue,   apply:(r:ReportRow) => r.data === todayStr() },
    { id:'7dias',       label:'Próximos 7 Dias',       icon:<Clock size={12}/>,         color:C.teal,   apply:(r:ReportRow) => !!r.data && r.data >= todayStr() && r.data <= nDaysStr(7) },
    { id:'emergencias', label:'Emergências',            icon:<Zap size={12}/>,           color:C.red,    apply:(r:ReportRow) => r.emergencia },
    { id:'pend_auth',   label:'Pend. Autorização',     icon:<AlertTriangle size={12}/>, color:C.orange, apply:(r:ReportRow) => r.source==='agenda' ? ['agendada','nova_cirurgia','orcamento_pre'].includes(r.status) : ['enviada','em_analise'].includes(r.status) },
    { id:'sem_sep',     label:'Material Não Separado', icon:<Package size={12}/>,       color:C.purple, apply:(r:ReportRow) => r.source==='agenda' ? r.status==='materiais_autorizados' : r.status==='aprovada' },
    { id:'finalizadas', label:'Finalizadas',            icon:<CheckCircle2 size={12}/>,  color:C.green,  apply:(r:ReportRow) => ['cirurgia_finalizada','finalizada'].includes(r.status) },
    { id:'canceladas',  label:'Canceladas',             icon:<XCircle size={12}/>,       color:C.red,    apply:(r:ReportRow) => r.status==='cancelada' },
    { id:'faturamento', label:'Em Faturamento',         icon:<FileText size={12}/>,      color:C.indigo, apply:(r:ReportRow) => ['cirurgia_faturada','material_enviado'].includes(r.status) },
    { id:'expedido',    label:'Material Expedido',      icon:<Package size={12}/>,       color:C.green,  apply:(r:ReportRow) => ['vale_consignacao','material_enviado'].includes(r.status) },
  ], [])

  /* ── Main filter ── */
  const filtered = useMemo(() => {
    const sf = SMART_FILTERS.find(f => f.id === activeSmartFilter)
    return allRows.filter(r => {
      if (sf && !sf.apply(r)) return false
      if (search) {
        const q = search.toLowerCase()
        const blob = [r.paciente, r.medico, r.hospital, r.convenio,
          r.vendedor, r.numero, r.procedimento, r.instrumentador].join(' ').toLowerCase()
        if (!blob.includes(q)) return false
      }
      if (filterHospital && r.hospital !== filterHospital) return false
      if (filterConvenio && r.convenio !== filterConvenio) return false
      if (filterMedico   && r.medico   !== filterMedico)   return false
      if (filterVendedor && r.vendedor !== filterVendedor) return false
      if (filterCidade   && r.cidade   !== filterCidade)   return false
      if (filterTipo === 'emergencia' && !r.emergencia)    return false
      if (filterTipo === 'eletiva'    &&  r.emergencia)    return false
      if (filterStatuses.size > 0 && !filterStatuses.has(r.status)) return false
      if (periodoInicio || periodoFim) {
        const raw = r[dateField] || ''
        const d   = raw ? new Date(raw) : null
        if (!d || isNaN(d.getTime())) return false
        if (periodoInicio && d < new Date(periodoInicio)) return false
        if (periodoFim    && d > new Date(periodoFim + 'T23:59:59')) return false
      }
      return true
    })
  }, [allRows, activeSmartFilter, search, filterHospital, filterConvenio, filterMedico,
      filterVendedor, filterCidade, filterTipo, filterStatuses,
      periodoInicio, periodoFim, dateField, SMART_FILTERS])

  /* ── Sorted ── */
  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    const va = (a as unknown as Record<string,string>)[sortField] || ''
    const vb = (b as unknown as Record<string,string>)[sortField] || ''
    return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
  }), [filtered, sortField, sortDir])

  function toggleSort(f: SortField) {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(f); setSortDir('asc') }
  }

  /* ── Metrics ── */
  const metrics = useMemo(() => ({
    total:       filtered.length,
    emergencias: filtered.filter(r => r.emergencia).length,
    eletivas:    filtered.filter(r => !r.emergencia).length,
    hospitais:   new Set(filtered.map(r => r.hospital).filter(Boolean)).size,
    convenios:   new Set(filtered.map(r => r.convenio).filter(Boolean)).size,
    medicos:     new Set(filtered.map(r => r.medico).filter(Boolean)).size,
  }), [filtered])

  /* ── Grouped view ── */
  const groupedData = useMemo(() => {
    const keyMap: Partial<Record<ViewMode, keyof ReportRow>> = {
      hospital: 'hospital', medico: 'medico', convenio: 'convenio',
      vendedor: 'vendedor', status: 'statusDisplay',
    }
    const key = keyMap[viewMode]
    if (!key) return []
    const map: Record<string, { label: string; count: number; emg: number; fin: number; rawStatus?: string }> = {}
    filtered.forEach(r => {
      const label = (r[key] as string) || '—'
      if (!map[label]) map[label] = { label, count: 0, emg: 0, fin: 0, rawStatus: viewMode === 'status' ? r.status : undefined }
      map[label].count++
      if (r.emergencia) map[label].emg++
      if (['cirurgia_finalizada','finalizada'].includes(r.status)) map[label].fin++
    })
    return Object.values(map).sort((a, b) => b.count - a.count)
  }, [filtered, viewMode])

  /* ── Exports ── */
  async function exportExcel() {
    try {
      const XLSX = await import('xlsx')
      const ws = XLSX.utils.json_to_sheet(sorted.map(r => ({
        'Tipo': r.source === 'agenda' ? 'Agenda' : 'Requisição',
        'Número': r.numero || '-',
        'Status': r.statusDisplay,
        'Data Cirurgia': r.data ? formatDate(r.data) : '-',
        'Hora': r.hora || '-',
        'Paciente': r.paciente, 'Hospital': r.hospital,
        'Cidade': r.cidade || '-', 'Estado': r.estado || '-',
        'Médico': r.medico, 'Procedimento': r.procedimento,
        'Convênio': r.convenio, 'Vendedor': r.vendedor,
        'Instrumentador': r.instrumentador || '-',
        'Tipo Cirurgia': r.emergencia ? 'Emergência' : 'Eletiva',
        'Autorizada': r.autorizada !== undefined ? (r.autorizada ? 'Sim' : 'Não') : '-',
      })))
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Relatório OPME')
      XLSX.writeFile(wb, `OPME_${new Date().toISOString().split('T')[0]}.xlsx`)
      toast.success('Excel exportado!')
    } catch { toast.error('Erro ao exportar Excel') }
  }

  async function exportCSV() {
    try {
      const headers = ['Status','Data Cirurgia','Hora','Paciente','Hospital','Médico','Procedimento','Convênio','Vendedor','Tipo']
      const rows = sorted.map(r => [
        r.statusDisplay, r.data ? formatDate(r.data) : '-', r.hora || '-',
        r.paciente, r.hospital, r.medico, r.procedimento,
        r.convenio, r.vendedor, r.emergencia ? 'Emergência' : 'Eletiva',
      ].map(v => `"${String(v || '').replace(/"/g, '""')}"`))
      const csv = [headers.join(','), ...rows.map(x => x.join(','))].join('\n')
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `OPME_${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      toast.success('CSV exportado!')
    } catch { toast.error('Erro ao exportar CSV') }
  }

  async function exportPDF() {
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      doc.setFillColor(30, 58, 95); doc.rect(0, 0, 297, 20, 'F')
      doc.setTextColor(255, 255, 255); doc.setFontSize(13); doc.setFont('helvetica', 'bold')
      doc.text('Sistema OPME — NOS', 14, 13)
      doc.setFontSize(8); doc.setFont('helvetica', 'normal')
      doc.text(`Gerado em ${formatDateTime(new Date().toISOString())} · ${filtered.length} registros`, 140, 13)
      autoTable(doc, {
        startY: 25,
        head: [['Status','Paciente','Hospital','Médico','Procedimento','Cirurgia','Hora','Convênio','Vendedor','Tipo']],
        body: sorted.map(r => [r.statusDisplay, r.paciente, r.hospital, r.medico, r.procedimento,
          r.data ? formatDate(r.data) : '-', r.hora || '-', r.convenio || '-', r.vendedor,
          r.emergencia ? 'Emerg.' : 'Eletiva']),
        styles: { fontSize: 6.5, cellPadding: 1.8 },
        headStyles: { fillColor: [30, 58, 95], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        foot: [[`Total: ${filtered.length}`,'','','','','','','','','']],
        footStyles: { fillColor: [240, 247, 255], textColor: [30, 58, 95], fontStyle: 'bold' },
      })
      doc.save(`OPME_${new Date().toISOString().split('T')[0]}.pdf`)
      toast.success('PDF exportado!')
    } catch (e) { console.error(e); toast.error('Erro ao exportar PDF') }
  }

  /* ─── helpers ─── */
  const inp = { background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) return <ArrowUpDown size={10} style={{ color: T.text3, opacity: 0.5 }} />
    return sortDir === 'asc'
      ? <ArrowUp size={10} style={{ color: C.blue }} />
      : <ArrowDown size={10} style={{ color: C.blue }} />
  }

  /* ══════════════════════════════════════════════════════════════════ */
  return (
    <div className="space-y-4">

      {/* ── Smart Filters ── */}
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, boxShadow: T.shadow }}>
        <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <Zap size={13} style={{ color: C.orange }} />
          <p className="font-bold text-sm" style={{ color: T.text1 }}>Filtros Rápidos</p>
          {activeSmartFilter && (
            <button onClick={() => setActiveSmartFilter(null)}
              className="ml-auto flex items-center gap-1 text-xs" style={{ color: T.text3 }}>
              <X size={11} /> Limpar
            </button>
          )}
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {SMART_FILTERS.map(f => (
            <button key={f.id}
              onClick={() => { clearAll(); setActiveSmartFilter(activeSmartFilter === f.id ? null : f.id) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={activeSmartFilter === f.id
                ? { background: f.color, color: '#fff', boxShadow: `0 2px 8px ${f.color}40` }
                : { background: `${f.color}12`, color: f.color, border: `1px solid ${f.color}25` }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Search + Advanced ── */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: T.text3 }} />
            <input className="w-full rounded-xl pl-9 pr-9 py-2.5 text-sm outline-none" style={inp}
              placeholder="Buscar paciente, médico, hospital, convênio, vendedor..."
              value={search} onChange={e => setSearch(e.target.value)} />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X size={13} style={{ color: T.text3 }} />
              </button>
            )}
          </div>
          <button onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={showAdvanced ? { background: C.blue, color: '#fff' } : inp}>
            <Filter size={13} /> Filtros
            {showAdvanced ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {hasFilters && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold"
              style={{ background: 'rgba(255,59,48,0.10)', color: C.red, border: `1px solid rgba(255,59,48,0.2)` }}>
              <X size={12} /> Limpar tudo
            </button>
          )}
        </div>

        {showAdvanced && (
          <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, boxShadow: T.shadow }}
            className="p-4 space-y-4">

            {/* Operational filters */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.text3 }}>Filtros Operacionais</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { label: 'Hospital', val: filterHospital, set: setFilterHospital, opts: hospitals },
                  { label: 'Convênio', val: filterConvenio, set: setFilterConvenio, opts: convenios },
                  { label: 'Médico',   val: filterMedico,   set: setFilterMedico,   opts: medicos   },
                  { label: 'Vendedor', val: filterVendedor, set: setFilterVendedor, opts: vendedores},
                  { label: 'Cidade',   val: filterCidade,   set: setFilterCidade,   opts: cidades   },
                ].map(f => (
                  <div key={f.label}>
                    <label className="block text-[10px] font-semibold mb-1" style={{ color: T.text3 }}>{f.label}</label>
                    <select className="w-full rounded-lg px-2.5 py-2 text-xs outline-none" style={inp}
                      value={f.val} onChange={e => f.set(e.target.value)}>
                      <option value="">Todos</option>
                      {f.opts.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] font-semibold mb-1" style={{ color: T.text3 }}>Tipo</label>
                  <select className="w-full rounded-lg px-2.5 py-2 text-xs outline-none" style={inp}
                    value={filterTipo} onChange={e => setFilterTipo(e.target.value as 'emergencia' | 'eletiva' | '')}>
                    <option value="">Todos</option>
                    <option value="eletiva">Eletiva</option>
                    <option value="emergencia">Emergência</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Status multi-select */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.text3 }}>Status</p>
              <div className="flex flex-wrap gap-2">
                {allStatuses.map(s => (
                  <button key={s} onClick={() => toggleStatus(s)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={filterStatuses.has(s)
                      ? { background: statusColor(s), color: '#fff' }
                      : { background: `${statusColor(s)}12`, color: statusColor(s), border: `1px solid ${statusColor(s)}30` }}>
                    {statusDisplayLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Period */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: T.text3 }}>Período</p>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex rounded-lg overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
                  {DATE_FIELDS.map(opt => (
                    <button key={opt.value} onClick={() => setDateField(opt.value)}
                      className="px-3 py-1.5 text-xs font-medium transition-all"
                      style={dateField === opt.value ? { background: C.blue, color: '#fff' } : { ...inp, border: 'none' }}>
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" className="rounded-lg px-2.5 py-1.5 text-xs outline-none" style={inp}
                    value={periodoInicio} onChange={e => setPeriodoInicio(e.target.value)} />
                  <span className="text-xs" style={{ color: T.text3 }}>até</span>
                  <input type="date" className="rounded-lg px-2.5 py-1.5 text-xs outline-none" style={inp}
                    value={periodoFim} onChange={e => setPeriodoFim(e.target.value)} />
                  {(periodoInicio || periodoFim) && (
                    <button onClick={() => { setPeriodoInicio(''); setPeriodoFim('') }}>
                      <X size={13} style={{ color: T.text3 }} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Metrics strip ── */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          { label: 'Cirurgias',   value: metrics.total,       color: C.blue   },
          { label: 'Emergências', value: metrics.emergencias, color: C.red    },
          { label: 'Eletivas',    value: metrics.eletivas,    color: C.green  },
          { label: 'Hospitais',   value: metrics.hospitais,   color: C.teal   },
          { label: 'Convênios',   value: metrics.convenios,   color: C.purple },
          { label: 'Médicos',     value: metrics.medicos,     color: C.orange },
        ].map(m => (
          <div key={m.label} className="rounded-2xl p-3 text-center"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
            <p className="text-2xl font-bold" style={{ color: m.color }}>{loading ? '—' : m.value}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: T.text3 }}>{m.label}</p>
          </div>
        ))}
      </div>

      {/* ── View tabs + export ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-xl overflow-hidden flex-shrink-0"
          style={{ border: `1px solid ${T.cardBorder}`, background: T.card }}>
          {VIEW_TABS.map(t => (
            <button key={t.id} onClick={() => setViewMode(t.id as ViewMode)}
              className="px-3 py-2 text-xs font-medium transition-all whitespace-nowrap"
              style={viewMode === t.id ? { background: C.blue, color: '#fff' } : { color: T.text3 }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${C.teal}12`, color: C.teal, border: `1px solid ${C.teal}25` }}>
            <Download size={13} /> CSV
          </button>
          <button onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: 'rgba(52,199,89,0.12)', color: C.green, border: `1px solid rgba(52,199,89,0.25)` }}>
            <FileSpreadsheet size={13} /> Excel
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: `${C.blue}12`, color: C.blue, border: `1px solid ${C.blue}25` }}>
            <FileText size={13} /> PDF
          </button>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: T.card, border: `1px solid ${T.cardBorder}`, borderRadius: 16, boxShadow: T.shadow, overflow: 'hidden' }}>
        <div className="px-4 py-2.5 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${T.divider}`, background: T.thead }}>
          <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: T.text3 }}>
            {loading ? 'Carregando...' : viewMode === 'registros'
              ? `${sorted.length} registro${sorted.length !== 1 ? 's' : ''}`
              : `${groupedData.length} grupo${groupedData.length !== 1 ? 's' : ''} · ${filtered.length} registros`}
          </p>
        </div>

        <div className="overflow-x-auto">
          {viewMode === 'registros' ? (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
                  {([
                    { label: 'Status',       field: 'status'    as SortField },
                    { label: 'Paciente',     field: 'paciente'  as SortField },
                    { label: 'Hospital',     field: 'hospital'  as SortField },
                    { label: 'Médico',       field: 'medico'    as SortField },
                    { label: 'Procedimento', field: null                     },
                    { label: 'Cirurgia',     field: 'data'      as SortField },
                    { label: 'Hora',         field: null                     },
                    { label: 'Convênio',     field: null                     },
                    { label: 'Vendedor',     field: null                     },
                    { label: 'Tipo',         field: null                     },
                  ] as { label: string; field: SortField | null }[]).map(col => (
                    <th key={col.label}
                      className={`text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider ${col.field ? 'cursor-pointer select-none' : ''}`}
                      style={{ color: T.text3 }}
                      onClick={() => col.field && toggleSort(col.field)}>
                      <span className="flex items-center gap-1">
                        {col.label}
                        {col.field && <SortIcon field={col.field} />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 150).map(r => (
                  <tr key={r.id} style={{ borderBottom: `1px solid ${T.divider}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td className="px-4 py-2.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap"
                        style={{ background: `${rowColor(r)}18`, color: rowColor(r) }}>
                        {r.statusDisplay}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[130px] truncate font-medium" style={{ color: T.text1 }}>{r.paciente || '—'}</td>
                    <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: T.text2 }}>{r.hospital || '—'}</td>
                    <td className="px-4 py-2.5 max-w-[130px] truncate" style={{ color: T.text2 }}>{r.medico || '—'}</td>
                    <td className="px-4 py-2.5 max-w-[150px] truncate" style={{ color: T.text3 }}>{r.procedimento || '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: T.text2 }}>{r.data ? formatDate(r.data) : '—'}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap" style={{ color: T.text3 }}>{r.hora || '—'}</td>
                    <td className="px-4 py-2.5 max-w-[120px] truncate" style={{ color: T.text3 }}>{r.convenio || '—'}</td>
                    <td className="px-4 py-2.5 max-w-[110px] truncate" style={{ color: T.text3 }}>{r.vendedor || '—'}</td>
                    <td className="px-4 py-2.5">
                      {r.emergencia
                        ? <span className="flex items-center gap-1 font-bold text-[11px]" style={{ color: C.red }}><Zap size={10}/>Emerg.</span>
                        : <span style={{ color: T.text3 }} className="text-[11px]">Eletiva</span>}
                    </td>
                  </tr>
                ))}
                {sorted.length === 0 && !loading && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm" style={{ color: T.text3 }}>
                    Nenhum registro encontrado com os filtros aplicados
                  </td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
                  <th className="text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.text3 }}>
                    {VIEW_TABS.find(t => t.id === viewMode)?.label.replace('Por ', '')}
                  </th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.text3 }}>Total</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.text3 }}>Emergências</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: T.text3 }}>Finalizadas</th>
                  <th className="px-4 py-2.5 w-44" style={{ color: T.text3 }} />
                </tr>
              </thead>
              <tbody>
                {groupedData.map((g, i) => {
                  const maxCount = groupedData[0]?.count || 1
                  const pct    = filtered.length ? Math.round((g.count / filtered.length) * 100) : 0
                  const barPct = Math.round((g.count / maxCount) * 100)
                  const color  = viewMode === 'status'
                    ? statusColor(g.rawStatus || '')
                    : ([C.blue, C.teal, C.orange, C.purple, C.green, C.indigo] as string[])[i % 6]
                  return (
                    <tr key={g.label} style={{ borderBottom: `1px solid ${T.divider}` }}
                      onMouseEnter={e => (e.currentTarget.style.background = T.hover)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td className="px-4 py-3 font-semibold" style={{ color: T.text1 }}>{g.label}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-sm" style={{ color }}>{g.count}</span>
                        <span className="text-[10px] ml-1" style={{ color: T.text3 }}>({pct}%)</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {g.emg > 0
                          ? <span className="font-semibold" style={{ color: C.red }}>{g.emg}</span>
                          : <span style={{ color: T.text3 }}>—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {g.fin > 0
                          ? <span className="font-semibold" style={{ color: C.green }}>{g.fin}</span>
                          : <span style={{ color: T.text3 }}>—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-1.5 rounded-full" style={{ background: T.divider }}>
                          <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: color }} />
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {groupedData.length === 0 && !loading && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-sm" style={{ color: T.text3 }}>
                    Nenhum registro encontrado
                  </td></tr>
                )}
              </tbody>
            </table>
          )}

          {viewMode === 'registros' && sorted.length > 150 && (
            <div className="px-4 py-3 text-center text-xs" style={{ color: T.text3, borderTop: `1px solid ${T.divider}` }}>
              Exibindo 150 de {sorted.length} registros. Use a exportação para ver todos.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
