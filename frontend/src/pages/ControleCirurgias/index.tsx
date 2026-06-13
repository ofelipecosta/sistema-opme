import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, X, Trash2, Edit2, ChevronDown, ClipboardList,
  Building2, Stethoscope, User, AlertCircle, Download, SlidersHorizontal,
  MoreVertical, Copy, CheckCircle2, XCircle, Activity, Hash,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  getControleCirurgias, createControleCirurgia,
  updateControleCirurgia, deleteControleCirurgia,
} from '../../utils/controle-storage'
import type { ControleCirurgia, SegmentoCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../../types/controle'
import { SEGMENTO_LABELS, SITUACAO_LABELS, ACOMPANHAMENTO_LABELS } from '../../types/controle'

// ─── Theme hook ───────────────────────────────────────────────────────────────

function useT() {
  const { isDark } = useTheme()
  return {
    isDark,
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#1D1D1F',
    text2:      isDark ? '#D1D5DB' : '#48484A',
    text3:      isDark ? '#9CA3AF' : '#8E8E93',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    thead:      isDark ? '#111827' : '#F8FAFC',
    inputBg:    isDark ? '#374151' : 'rgba(0,0,0,0.04)',
    shadow:     isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.05)',
    surface:    isDark ? '#111827' : '#F2F2F7',
  }
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SEGMENTOS: SegmentoCirurgia[] = ['ortopedia', 'trauma', 'neuro', 'coluna']
const SITUACOES: SituacaoCirurgia[] = ['urgencia', 'autorizada', 'expedida']
const ACOMPANHAMENTOS: AcompanhamentoCirurgia[] = ['opme_pos', 'agendada', 'cancelada', 'expedida']
const PAGE_SIZE = 25

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

// ─── Color system ─────────────────────────────────────────────────────────────

function segStyle(s: SegmentoCirurgia) {
  const m: Record<SegmentoCirurgia, { bg: string; text: string; border: string; dot: string }> = {
    ortopedia: { bg: '#F5F3FF', text: '#6D28D9', border: '#EDE9FE', dot: '#7C3AED' },
    trauma:    { bg: '#FFF7ED', text: '#C2410C', border: '#FFEDD5', dot: '#EA580C' },
    neuro:     { bg: '#EFF6FF', text: '#1D4ED8', border: '#DBEAFE', dot: '#2563EB' },
    coluna:    { bg: '#F0FDF4', text: '#166534', border: '#DCFCE7', dot: '#16A34A' },
  }
  return m[s]
}

function segStyleDark(s: SegmentoCirurgia) {
  const m: Record<SegmentoCirurgia, { bg: string; text: string; border: string; dot: string }> = {
    ortopedia: { bg: 'rgba(124,58,237,0.15)', text: '#C4B5FD', border: 'rgba(124,58,237,0.25)', dot: '#A78BFA' },
    trauma:    { bg: 'rgba(234,88,12,0.15)',  text: '#FDBA74', border: 'rgba(234,88,12,0.25)',  dot: '#FB923C' },
    neuro:     { bg: 'rgba(37,99,235,0.15)',  text: '#93C5FD', border: 'rgba(37,99,235,0.25)',  dot: '#60A5FA' },
    coluna:    { bg: 'rgba(22,163,74,0.15)',  text: '#86EFAC', border: 'rgba(22,163,74,0.25)',  dot: '#4ADE80' },
  }
  return m[s]
}

function sitStyle(s: SituacaoCirurgia, dark = false) {
  if (dark) {
    const m: Record<SituacaoCirurgia, { bg: string; text: string; border: string }> = {
      urgencia:   { bg: 'rgba(185,28,28,0.2)',  text: '#FCA5A5', border: 'rgba(185,28,28,0.35)' },
      autorizada: { bg: 'rgba(22,163,74,0.18)', text: '#86EFAC', border: 'rgba(22,163,74,0.3)'  },
      expedida:   { bg: 'rgba(29,78,216,0.2)',  text: '#93C5FD', border: 'rgba(29,78,216,0.35)' },
    }
    return m[s]
  }
  const m: Record<SituacaoCirurgia, { bg: string; text: string; border: string }> = {
    urgencia:   { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    autorizada: { bg: '#F0FDF4', text: '#166534', border: '#BBF7D0' },
    expedida:   { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
  }
  return m[s]
}

function acpStyle(a: AcompanhamentoCirurgia, dark = false) {
  if (dark) {
    const m: Record<AcompanhamentoCirurgia, { bg: string; text: string }> = {
      opme_pos:  { bg: 'rgba(29,78,216,0.18)',  text: '#93C5FD' },
      agendada:  { bg: 'rgba(13,148,136,0.18)', text: '#5EEAD4' },
      cancelada: { bg: 'rgba(51,65,85,0.4)',    text: '#94A3B8' },
      expedida:  { bg: 'rgba(109,40,217,0.18)', text: '#C4B5FD' },
    }
    return m[a]
  }
  const m: Record<AcompanhamentoCirurgia, { bg: string; text: string }> = {
    opme_pos:  { bg: '#EFF6FF', text: '#1D4ED8' },
    agendada:  { bg: '#F0FDFA', text: '#0F766E' },
    cancelada: { bg: '#F8FAFC', text: '#64748B' },
    expedida:  { bg: '#F5F3FF', text: '#6D28D9' },
  }
  return m[a]
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(): Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt' | 'criadoPorId' | 'criadoPorNome'> {
  return {
    codigoV2: '', numero: '',
    data: new Date().toISOString().split('T')[0],
    cirurgia: '', segmento: 'ortopedia', pacienteNome: '',
    convenio: '', hospital: '', medico: '', vendedor: '',
    situacao: 'urgencia', acompanhamento: 'agendada', observacao: '',
  }
}

// ─── Action menu ──────────────────────────────────────────────────────────────

function ActionMenu({ onEdit, onDuplicate, onDelete }: {
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const T = useT()

  useEffect(() => {
    if (!open) return
    function close(e: MouseEvent) {
      setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  function handleOpen(e: React.MouseEvent) {
    e.stopPropagation()
    if (!btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const menuH = 120
    const top = rect.bottom + window.scrollY + 4
    const left = rect.right - 160
    setPos({ top: top + menuH > window.innerHeight + window.scrollY ? rect.top + window.scrollY - menuH - 4 : top, left })
    setOpen(o => !o)
  }

  const item = (label: string, icon: React.ReactNode, action: () => void, danger = false) => (
    <button
      onMouseDown={e => { e.stopPropagation(); action(); setOpen(false) }}
      className="flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium rounded-lg text-left"
      style={{ color: danger ? '#EF4444' : T.text2 }}
      onMouseEnter={e => (e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.08)' : T.inputBg)}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {icon}{label}
    </button>
  )

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="p-1.5 rounded-lg transition-colors"
        style={{ color: T.text3 }}
        onMouseEnter={e => (e.currentTarget.style.background = T.inputBg)}
        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
      >
        <MoreVertical size={14} />
      </button>
      {open && (
        <div
          className="fixed z-50 w-40 p-1 rounded-xl shadow-xl"
          style={{ top: pos.top, left: pos.left, background: T.card, border: `1px solid ${T.cardBorder}` }}
        >
          {item('Editar', <Edit2 size={13} />, onEdit)}
          {item('Duplicar', <Copy size={13} />, onDuplicate)}
          <div style={{ height: 1, background: T.divider, margin: '4px 0' }} />
          {item('Excluir', <Trash2 size={13} />, onDelete, true)}
        </div>
      )}
    </>
  )
}

// ─── Modal form ───────────────────────────────────────────────────────────────

function CirurgiaModal({
  initial, onSave, onClose,
}: {
  initial?: ControleCirurgia | null
  onSave: (data: ReturnType<typeof emptyForm>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(
    initial
      ? {
          codigoV2:      initial.codigoV2 || '',
          numero:        initial.numero || '',
          data:          initial.data,
          cirurgia:      initial.cirurgia,
          segmento:      initial.segmento,
          pacienteNome:  initial.pacienteNome,
          convenio:      initial.convenio || '',
          hospital:      initial.hospital || '',
          medico:        initial.medico || '',
          vendedor:      initial.vendedor || '',
          situacao:      initial.situacao,
          acompanhamento: initial.acompanhamento,
          observacao:    initial.observacao || '',
        }
      : emptyForm()
  )
  const [saving, setSaving] = useState(false)
  const T = useT()

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cirurgia.trim() || !form.pacienteNome.trim() || !form.data) {
      toast.error('Preencha Cirurgia, Paciente e Data'); return
    }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const isEdit = !!initial
  const inp: React.CSSProperties = {
    background: T.inputBg,
    border: `1px solid ${T.cardBorder}`,
    color: T.text1,
    fontSize: 15,
    borderRadius: 10,
    padding: '8px 12px',
    width: '100%',
    outline: 'none',
  }

  const ss = (s: SegmentoCirurgia) => T.isDark ? segStyleDark(s) : segStyle(s)

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: T.card, boxShadow: '0 24px 60px rgba(0,0,0,0.30)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${T.divider}` }}>
          <div>
            <p className="font-bold text-base" style={{ color: T.text1 }}>{isEdit ? 'Editar Cirurgia' : 'Nova Cirurgia'}</p>
            <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Controle de Cirurgias</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.inputBg, color: T.text2 }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Data *</label>
                <input type="date" value={form.data} onChange={e => set('data', e.target.value)} required style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Cód. V2</label>
                <input type="text" value={form.codigoV2} onChange={e => set('codigoV2', e.target.value)} placeholder="385515" style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Nº</label>
                <input type="text" value={form.numero} onChange={e => set('numero', e.target.value)} placeholder="001" style={inp} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Cirurgia / Procedimento *</label>
              <input type="text" value={form.cirurgia} onChange={e => set('cirurgia', e.target.value.toUpperCase())} placeholder="FRATURA DE FÊMUR" required style={{ ...inp, textTransform: 'uppercase' }} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: T.text2 }}>Segmento *</label>
              <div className="flex gap-2 flex-wrap">
                {SEGMENTOS.map(s => {
                  const c = ss(s)
                  const active = form.segmento === s
                  return (
                    <button key={s} type="button" onClick={() => set('segmento', s)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={active
                        ? { background: c.dot, color: '#fff', border: `1px solid ${c.dot}` }
                        : { background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
                      <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: active ? '#fff' : c.dot }} />
                      {SEGMENTO_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Nome do Paciente *</label>
              <input type="text" value={form.pacienteNome} onChange={e => set('pacienteNome', e.target.value.toUpperCase())} placeholder="NOME COMPLETO DO PACIENTE" required style={{ ...inp, textTransform: 'uppercase' }} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Convênio</label>
                <input type="text" value={form.convenio} onChange={e => set('convenio', e.target.value.toUpperCase())} placeholder="UNIMED" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Hospital</label>
                <input type="text" value={form.hospital} onChange={e => set('hospital', e.target.value.toUpperCase())} placeholder="NITERÓI DOR" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Médico</label>
                <input type="text" value={form.medico} onChange={e => set('medico', e.target.value.toUpperCase())} placeholder="NOME DO MÉDICO" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Vendedor</label>
                <input type="text" value={form.vendedor} onChange={e => set('vendedor', e.target.value.toUpperCase())} placeholder="NOME DO VENDEDOR" style={{ ...inp, textTransform: 'uppercase' }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: T.text2 }}>Situação *</label>
              <div className="flex gap-2 flex-wrap">
                {SITUACOES.map(s => {
                  const st = sitStyle(s, T.isDark)
                  const active = form.situacao === s
                  return (
                    <button key={s} type="button" onClick={() => set('situacao', s)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={active
                        ? { background: st.text, color: '#fff', border: `1px solid ${st.text}` }
                        : { background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                      {SITUACAO_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Acompanhamento *</label>
              <div className="relative">
                <select value={form.acompanhamento} onChange={e => set('acompanhamento', e.target.value)} style={inp} className="appearance-none">
                  {ACOMPANHAMENTOS.map(a => <option key={a} value={a}>{ACOMPANHAMENTO_LABELS[a]}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.text3 }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Observação</label>
              <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)}
                rows={2} placeholder="Informações adicionais..."
                style={{ ...inp, resize: 'none' }} />
            </div>
          </div>
        </form>

        <div className="flex gap-3 justify-end px-5 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${T.divider}` }}>
          <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit as any} disabled={saving} className="btn-primary">
            {saving ? '…' : isEdit ? 'Salvar alterações' : 'Adicionar cirurgia'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ControleCirurgias() {
  const { user } = useAuth()
  const T = useT()
  const [items, setItems] = useState<ControleCirurgia[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const [search, setSearch] = useState('')
  const [filterMes, setFilterMes] = useState<number>(new Date().getMonth())
  const [filterAno, setFilterAno] = useState<number>(new Date().getFullYear())
  const [filterSegmento, setFilterSegmento] = useState<SegmentoCirurgia | ''>('')
  const [filterSituacao, setFilterSituacao] = useState<SituacaoCirurgia | ''>('')
  const [filterAcomp, setFilterAcomp] = useState<AcompanhamentoCirurgia | ''>('')
  const [filterHospital, setFilterHospital] = useState('')
  const [filterMedico, setFilterMedico] = useState('')
  const [filterVendedor, setFilterVendedor] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [page, setPage] = useState(1)

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<ControleCirurgia | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getControleCirurgias())
      setLastUpdated(new Date())
    } catch (e: any) {
      if (e?.message?.includes('does not exist') || e?.code === '42P01') {
        setError('tabela_inexistente')
      } else {
        setError(e?.message || 'Erro ao carregar dados')
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form: ReturnType<typeof emptyForm>) {
    if (editItem) {
      await updateControleCirurgia(editItem.id, form)
      toast.success('Cirurgia atualizada')
    } else {
      await createControleCirurgia({ ...form, criadoPorId: user?.id, criadoPorNome: user?.nome })
      toast.success('Cirurgia adicionada')
    }
    setShowModal(false)
    setEditItem(null)
    load()
  }

  async function handleDelete(item: ControleCirurgia) {
    if (!confirm(`Excluir cirurgia de ${item.pacienteNome}?`)) return
    await deleteControleCirurgia(item.id)
    toast.success('Registro excluído')
    load()
  }

  async function handleDuplicate(item: ControleCirurgia) {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = item
    await createControleCirurgia({ ...rest, criadoPorId: user?.id, criadoPorNome: user?.nome })
    toast.success('Cirurgia duplicada')
    load()
  }

  function openEdit(item: ControleCirurgia) { setEditItem(item); setShowModal(true) }
  function openNew() { setEditItem(null); setShowModal(true) }

  function exportCSV() {
    const headers = ['Nº','Cód. V2','Data','Cirurgia','Segmento','Paciente','Convênio','Hospital','Médico','Vendedor','Situação','Acompanhamento','Observação']
    const rows = filtered.map(it => [
      it.numero || '',
      it.codigoV2 || '',
      fmtDate(it.data),
      it.cirurgia,
      SEGMENTO_LABELS[it.segmento],
      it.pacienteNome,
      it.convenio || '',
      it.hospital || '',
      it.medico || '',
      it.vendedor || '',
      SITUACAO_LABELS[it.situacao],
      ACOMPANHAMENTO_LABELS[it.acompanhamento],
      it.observacao || '',
    ])
    const csv = '﻿' + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `controle-cirurgias-${MESES[filterMes].toLowerCase()}-${filterAno}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exportado')
  }

  // ── Filtering ──
  const monthItems = items.filter(it => {
    const [y, m] = (it.data || '').split('-').map(Number)
    return y === filterAno && m - 1 === filterMes
  })

  const filtered = monthItems.filter(it => {
    if (filterSegmento && it.segmento !== filterSegmento) return false
    if (filterSituacao && it.situacao !== filterSituacao) return false
    if (filterAcomp && it.acompanhamento !== filterAcomp) return false
    if (filterHospital && !it.hospital?.toLowerCase().includes(filterHospital.toLowerCase())) return false
    if (filterMedico && !it.medico?.toLowerCase().includes(filterMedico.toLowerCase())) return false
    if (filterVendedor && !it.vendedor?.toLowerCase().includes(filterVendedor.toLowerCase())) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        it.pacienteNome?.toLowerCase().includes(q) ||
        it.cirurgia?.toLowerCase().includes(q) ||
        it.hospital?.toLowerCase().includes(q) ||
        it.medico?.toLowerCase().includes(q) ||
        it.vendedor?.toLowerCase().includes(q) ||
        it.codigoV2?.toLowerCase().includes(q) ||
        it.numero?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Pagination ──
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // ── Stats ──
  const total = monthItems.length
  const bySegmento = SEGMENTOS.map(s => ({ s, count: monthItems.filter(i => i.segmento === s).length }))
  const expedidas = monthItems.filter(i => i.situacao === 'expedida' || i.acompanhamento === 'expedida').length
  const canceladas = monthItems.filter(i => i.acompanhamento === 'cancelada').length
  const urgencias = monthItems.filter(i => i.situacao === 'urgencia').length

  const anos = Array.from(new Set(items.map(i => Number(i.data?.split('-')[0])))).sort((a, b) => b - a)
  if (!anos.includes(filterAno)) anos.unshift(filterAno)

  const hasAdvancedFilter = filterHospital || filterMedico || filterVendedor
  const hasAnyFilter = filterSegmento || filterSituacao || filterAcomp || search || hasAdvancedFilter

  function clearAll() {
    setFilterSegmento(''); setFilterSituacao(''); setFilterAcomp('')
    setSearch(''); setFilterHospital(''); setFilterMedico(''); setFilterVendedor('')
    setPage(1)
  }

  // Unique values for advanced filter selects
  const hospitals = Array.from(new Set(monthItems.map(i => i.hospital).filter(Boolean))).sort() as string[]
  const medicos = Array.from(new Set(monthItems.map(i => i.medico).filter(Boolean))).sort() as string[]
  const vendedores = Array.from(new Set(monthItems.map(i => i.vendedor).filter(Boolean))).sort() as string[]

  const fmtTime = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  // ── Loading ──
  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
    </div>
  )

  // ── DB error ──
  if (error === 'tabela_inexistente') return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)' }}>
        <AlertCircle size={40} className="mx-auto mb-4" style={{ color: '#FF9500' }} />
        <h2 className="font-bold text-lg mb-2" style={{ color: T.text1 }}>Configure o banco de dados</h2>
        <p className="text-sm mb-5" style={{ color: T.text2 }}>
          Para ativar o Controle de Cirurgias, execute o SQL abaixo no Supabase (<strong>SQL Editor → New query</strong>):
        </p>
        <pre className="text-left text-xs rounded-xl p-4 overflow-x-auto mb-5" style={{ background: T.inputBg, color: T.text1, lineHeight: 1.6 }}>
{`CREATE TABLE controle_cirurgias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text, codigo_v2 text,
  data date NOT NULL, cirurgia text NOT NULL,
  segmento text NOT NULL, paciente_nome text NOT NULL,
  convenio text, hospital text, medico text, vendedor text,
  situacao text NOT NULL DEFAULT 'urgencia',
  acompanhamento text NOT NULL DEFAULT 'agendada',
  observacao text, criado_por_id text, criado_por_nome text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE controle_cirurgias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON controle_cirurgias FOR ALL USING (true);`}
        </pre>
        <button onClick={load} className="btn-primary">Tentar novamente</button>
      </div>
    </div>
  )

  const ss = (s: SegmentoCirurgia) => T.isDark ? segStyleDark(s) : segStyle(s)

  return (
    <div className="space-y-3">
      {showModal && (
        <CirurgiaModal
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight" style={{ color: T.text1 }}>Controle de Cirurgias</h2>
            <span className="text-xs font-medium px-2 py-0.5 rounded-md" style={{ background: T.inputBg, color: T.text3 }}>
              {MESES[filterMes]} {filterAno}
            </span>
          </div>
          <p className="text-xs mt-0.5" style={{ color: T.text3 }}>
            {filtered.length} {filtered.length === 1 ? 'cirurgia' : 'cirurgias'} · atualizado às {fmtTime(lastUpdated)}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={exportCSV} className="btn-secondary btn-sm flex items-center gap-1.5" title="Exportar CSV">
            <Download size={13} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button onClick={openNew} className="btn-primary">
            <Plus size={14} /> Nova Cirurgia
          </button>
        </div>
      </div>

      {/* ── Month / year selector ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterAno} onChange={e => { setFilterAno(Number(e.target.value)); setPage(1) }}
          className="rounded-lg px-2 py-1.5 text-xs font-semibold outline-none flex-shrink-0"
          style={{ background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {MESES.map((m, i) => (
            <button key={i} onClick={() => { setFilterMes(i); setPage(1) }}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all"
              style={filterMes === i
                ? { background: '#007AFF', color: '#fff' }
                : { background: T.inputBg, color: T.text2, border: `1px solid ${T.cardBorder}` }}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total */}
        <div className="rounded-xl p-3" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Activity size={12} style={{ color: '#007AFF' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.text3 }}>Total</span>
          </div>
          <p className="text-2xl font-bold leading-none" style={{ color: T.text1 }}>{total}</p>
          <div className="flex items-center gap-1 mt-2">
            {urgencias > 0 && (
              <span className="text-xs font-medium" style={{ color: '#DC2626' }}>
                {urgencias} urg.
              </span>
            )}
          </div>
        </div>

        {/* By segmento */}
        {bySegmento.map(({ s, count }) => {
          const c = ss(s)
          const pct = total > 0 ? Math.round((count / total) * 100) : 0
          return (
            <div key={s} className="rounded-xl p-3 cursor-pointer transition-all"
              style={{ background: c.bg, border: `1px solid ${c.border}` }}
              onClick={() => { setFilterSegmento(filterSegmento === s ? '' : s); setPage(1) }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c.dot }} />
                <span className="text-xs font-semibold uppercase tracking-wide truncate" style={{ color: c.text }}>
                  {SEGMENTO_LABELS[s]}
                </span>
              </div>
              <p className="text-2xl font-bold leading-none" style={{ color: c.text }}>{count}</p>
              <div className="mt-2">
                <div className="h-1 rounded-full" style={{ background: `${c.dot}30` }}>
                  <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: c.dot }} />
                </div>
                <p className="text-xs mt-1 font-medium" style={{ color: c.text }}>{pct}%</p>
              </div>
            </div>
          )
        })}

        {/* Expedidas */}
        <div className="rounded-xl p-3" style={{ background: T.isDark ? 'rgba(29,78,216,0.15)' : '#EFF6FF', border: `1px solid ${T.isDark ? 'rgba(29,78,216,0.3)' : '#BFDBFE'}` }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <CheckCircle2 size={12} style={{ color: T.isDark ? '#93C5FD' : '#1D4ED8' }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: T.isDark ? '#93C5FD' : '#1D4ED8' }}>Expedidas</span>
          </div>
          <p className="text-2xl font-bold leading-none" style={{ color: T.isDark ? '#93C5FD' : '#1D4ED8' }}>{expedidas}</p>
          {canceladas > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <XCircle size={10} style={{ color: '#EF4444' }} />
              <span className="text-xs font-medium" style={{ color: '#EF4444' }}>{canceladas} cancel.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {/* Search */}
          <div className="flex items-center gap-2 flex-1 min-w-52 rounded-xl px-3 py-2.5"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
            <Search size={14} style={{ color: T.text3, flexShrink: 0 }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Buscar paciente, cirurgia, médico, cód..."
              className="flex-1 bg-transparent text-sm outline-none" style={{ color: T.text1 }} />
            {search && <button onClick={() => setSearch('')}><X size={13} style={{ color: T.text3 }} /></button>}
          </div>

          {/* Quick filters */}
          {[
            { val: filterSegmento, setter: (v: string) => { setFilterSegmento(v as SegmentoCirurgia | ''); setPage(1) }, opts: SEGMENTOS.map(s => ({ v: s, l: SEGMENTO_LABELS[s] })), ph: 'Segmento' },
            { val: filterSituacao, setter: (v: string) => { setFilterSituacao(v as SituacaoCirurgia | ''); setPage(1) }, opts: SITUACOES.map(s => ({ v: s, l: SITUACAO_LABELS[s] })), ph: 'Situação' },
            { val: filterAcomp,   setter: (v: string) => { setFilterAcomp(v as AcompanhamentoCirurgia | ''); setPage(1) }, opts: ACOMPANHAMENTOS.map(a => ({ v: a, l: ACOMPANHAMENTO_LABELS[a] })), ph: 'Acompanhamento' },
          ].map(({ val, setter, opts, ph }) => (
            <select key={ph} value={val} onChange={e => setter(e.target.value)}
              className="rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{ background: T.card, border: `1px solid ${val ? '#007AFF' : T.cardBorder}`, color: val ? T.text1 : T.text3 }}>
              <option value="">{ph}</option>
              {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}

          {/* Advanced toggle */}
          <button
            onClick={() => setShowAdvanced(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: showAdvanced || hasAdvancedFilter ? 'rgba(0,122,255,0.1)' : T.card,
              border: `1px solid ${showAdvanced || hasAdvancedFilter ? '#007AFF' : T.cardBorder}`,
              color: showAdvanced || hasAdvancedFilter ? '#007AFF' : T.text3,
            }}>
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">Filtros</span>
            {hasAdvancedFilter && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
          </button>

          {hasAnyFilter && (
            <button onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium"
              style={{ background: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
              <X size={13} /> Limpar
            </button>
          )}
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="rounded-xl p-3 flex flex-wrap gap-3" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
            {[
              { label: 'Hospital', val: filterHospital, setter: setFilterHospital, opts: hospitals, icon: <Building2 size={12} /> },
              { label: 'Médico',   val: filterMedico,   setter: setFilterMedico,   opts: medicos,   icon: <Stethoscope size={12} /> },
              { label: 'Vendedor', val: filterVendedor,  setter: setFilterVendedor,  opts: vendedores, icon: <User size={12} /> },
            ].map(({ label, val, setter, opts, icon }) => (
              <div key={label} className="flex items-center gap-1.5 flex-1 min-w-36">
                <span style={{ color: T.text3 }}>{icon}</span>
                <select value={val} onChange={e => { setter(e.target.value); setPage(1) }}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs outline-none"
                  style={{ background: T.inputBg, border: `1px solid ${val ? '#007AFF' : T.cardBorder}`, color: val ? T.text1 : T.text3 }}>
                  <option value="">{label}</option>
                  {opts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Table / Empty state ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <ClipboardList size={36} className="mx-auto mb-3" style={{ color: T.text3 }} />
          <p className="font-semibold" style={{ color: T.text2 }}>Nenhum registro encontrado</p>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            {hasAnyFilter
              ? 'Ajuste os filtros ou limpe a busca.'
              : `Nenhuma cirurgia em ${MESES[filterMes]} ${filterAno}.`}
          </p>
          {hasAnyFilter && (
            <button onClick={clearAll} className="mt-4 btn-secondary btn-sm">Limpar filtros</button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
                    {[
                      { h: 'Nº', w: 40 }, { h: 'Cód. V2', w: 70 }, { h: 'Data', w: 76 },
                      { h: 'Cirurgia', w: 140 }, { h: 'Seg.', w: 80 }, { h: 'Paciente', w: 140 },
                      { h: 'Convênio', w: 90 }, { h: 'Hospital', w: 110 }, { h: 'Médico', w: 110 },
                      { h: 'Vendedor', w: 90 }, { h: 'Situação', w: 90 }, { h: 'Acompanhamento', w: 110 }, { h: '', w: 36 },
                    ].map(({ h, w }) => (
                      <th key={h} className="text-left px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: T.text3, minWidth: w }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((it, idx) => {
                    const st = sitStyle(it.situacao, T.isDark)
                    const ac = acpStyle(it.acompanhamento, T.isDark)
                    const sc = ss(it.segmento)
                    const isCancelada = it.acompanhamento === 'cancelada'
                    return (
                      <tr key={it.id}
                        style={{ borderBottom: idx < pageItems.length - 1 ? `1px solid ${T.divider}` : undefined, opacity: isCancelada ? 0.55 : 1 }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td className="px-2.5 py-2.5 font-mono whitespace-nowrap" style={{ color: T.text3 }}>
                          {it.numero ? <span className="flex items-center gap-0.5"><Hash size={9} />{it.numero}</span> : '—'}
                        </td>
                        <td className="px-2.5 py-2.5 font-mono whitespace-nowrap" style={{ color: T.text3 }}>{it.codigoV2 || '—'}</td>
                        <td className="px-2.5 py-2.5 font-mono whitespace-nowrap" style={{ color: T.text3 }}>{fmtDate(it.data)}</td>
                        <td className="px-2.5 py-2.5 font-semibold" style={{ color: T.text1 }}>{it.cirurgia}</td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold"
                            style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
                            {SEGMENTO_LABELS[it.segmento]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 font-medium" style={{ color: T.text1 }}>{it.pacienteNome}</td>
                        <td className="px-2.5 py-2.5" style={{ color: T.text2 }}>{it.convenio || <span style={{ color: T.text3 }}>—</span>}</td>
                        <td className="px-2.5 py-2.5" style={{ color: T.text2 }}>{it.hospital || <span style={{ color: T.text3 }}>—</span>}</td>
                        <td className="px-2.5 py-2.5" style={{ color: T.text2 }}>{it.medico || <span style={{ color: T.text3 }}>—</span>}</td>
                        <td className="px-2.5 py-2.5" style={{ color: T.text2 }}>{it.vendedor || <span style={{ color: T.text3 }}>—</span>}</td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                            style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                            {SITUACAO_LABELS[it.situacao]}
                          </span>
                        </td>
                        <td className="px-2.5 py-2.5 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"
                            style={{ background: ac.bg, color: ac.text }}>
                            {ACOMPANHAMENTO_LABELS[it.acompanhamento]}
                          </span>
                        </td>
                        <td className="px-1.5 py-2.5">
                          <ActionMenu
                            onEdit={() => openEdit(it)}
                            onDuplicate={() => handleDuplicate(it)}
                            onDelete={() => handleDelete(it)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2.5">
            {pageItems.map(it => {
              const st = sitStyle(it.situacao, T.isDark)
              const ac = acpStyle(it.acompanhamento, T.isDark)
              const sc = ss(it.segmento)
              const isCancelada = it.acompanhamento === 'cancelada'
              return (
                <div key={it.id} style={{
                  background: T.card, border: `1px solid ${T.cardBorder}`,
                  borderLeft: `3px solid ${sc.dot}`, borderRadius: 14,
                  padding: '11px 13px', opacity: isCancelada ? 0.6 : 1,
                }}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="text-xs font-mono" style={{ color: T.text3 }}>{fmtDate(it.data)}</span>
                        {it.codigoV2 && <span className="text-xs font-mono" style={{ color: T.text3 }}>{it.codigoV2}</span>}
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-semibold"
                          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` }}>
                          {SEGMENTO_LABELS[it.segmento]}
                        </span>
                      </div>
                      <p className="font-bold text-sm" style={{ color: T.text1 }}>{it.cirurgia}</p>
                      <p className="text-sm font-medium mt-0.5" style={{ color: T.text2 }}>{it.pacienteNome}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                        {it.hospital && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><Building2 size={10} />{it.hospital}</span>}
                        {it.medico   && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><Stethoscope size={10} />{it.medico}</span>}
                        {it.vendedor && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><User size={10} />{it.vendedor}</span>}
                      </div>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: st.bg, color: st.text, border: `1px solid ${st.border}` }}>
                          {SITUACAO_LABELS[it.situacao]}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-xs font-semibold" style={{ background: ac.bg, color: ac.text }}>
                          {ACOMPANHAMENTO_LABELS[it.acompanhamento]}
                        </span>
                      </div>
                    </div>
                    <ActionMenu
                      onEdit={() => openEdit(it)}
                      onDuplicate={() => handleDuplicate(it)}
                      onDelete={() => handleDelete(it)}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs" style={{ color: T.text3 }}>
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} de {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ background: T.inputBg, color: T.text2 }}>
                  ‹ Ant.
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const start = Math.max(1, Math.min(safePage - 2, totalPages - 4))
                  const p = start + i
                  return p <= totalPages ? (
                    <button key={p} onClick={() => setPage(p)}
                      className="w-7 h-7 rounded-lg text-xs font-medium"
                      style={p === safePage
                        ? { background: '#007AFF', color: '#fff' }
                        : { background: T.inputBg, color: T.text2 }}>
                      {p}
                    </button>
                  ) : null
                })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium disabled:opacity-40"
                  style={{ background: T.inputBg, color: T.text2 }}>
                  Próx. ›
                </button>
              </div>
            </div>
          )}

          {/* ── Footer summary ── */}
          <div className="rounded-xl px-4 py-3 flex flex-wrap gap-x-5 gap-y-1.5" style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
            {[
              { icon: <Building2 size={11} />, label: 'Hospitais', val: new Set(monthItems.map(i => i.hospital).filter(Boolean)).size },
              { icon: <Stethoscope size={11} />, label: 'Médicos', val: new Set(monthItems.map(i => i.medico).filter(Boolean)).size },
              { icon: <User size={11} />, label: 'Vendedores', val: new Set(monthItems.map(i => i.vendedor).filter(Boolean)).size },
              { icon: <CheckCircle2 size={11} />, label: 'Expedidas', val: expedidas, color: T.isDark ? '#93C5FD' : '#1D4ED8' },
              { icon: <XCircle size={11} />, label: 'Canceladas', val: canceladas, color: canceladas > 0 ? '#EF4444' : undefined },
            ].map(({ icon, label, val, color }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span style={{ color: color || T.text3 }}>{icon}</span>
                <span className="text-xs font-semibold" style={{ color: color || T.text1 }}>{val}</span>
                <span className="text-xs" style={{ color: T.text3 }}>{label}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-xs" style={{ color: T.text3 }}>
                {filtered.length} resultado{filtered.length !== 1 ? 's' : ''} · {MESES[filterMes]} {filterAno}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
