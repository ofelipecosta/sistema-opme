import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, X, Trash2, Edit2, ChevronDown, ClipboardList,
  Building2, Stethoscope, User, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import {
  getControleCirurgias, createControleCirurgia,
  updateControleCirurgia, deleteControleCirurgia,
} from '../../utils/controle-storage'
import type { ControleCirurgia, SegmentoCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../../types/controle'
import {
  SEGMENTO_LABELS, SITUACAO_LABELS, ACOMPANHAMENTO_LABELS,
} from '../../types/controle'

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
    thead:      isDark ? '#111827' : 'rgba(0,0,0,0.02)',
    inputBg:    isDark ? '#374151' : 'rgba(0,0,0,0.04)',
    shadow:     isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 12px rgba(0,0,0,0.05)',
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const SEGMENTOS: SegmentoCirurgia[] = ['ortopedia', 'trauma', 'neuro', 'coluna']
const SITUACOES: SituacaoCirurgia[] = ['urgencia', 'autorizada', 'expedida']
const ACOMPANHAMENTOS: AcompanhamentoCirurgia[] = ['opme_pos', 'agendada', 'cancelada', 'expedida']

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

function situacaoStyle(s: SituacaoCirurgia) {
  const m: Record<SituacaoCirurgia, { bg: string; color: string; border: string }> = {
    urgencia:   { bg: 'rgba(255,59,48,0.10)',   color: '#FF3B30', border: 'rgba(255,59,48,0.25)' },
    autorizada: { bg: 'rgba(52,199,89,0.10)',    color: '#34C759', border: 'rgba(52,199,89,0.25)' },
    expedida:   { bg: 'rgba(0,122,255,0.10)',    color: '#007AFF', border: 'rgba(0,122,255,0.25)' },
  }
  return m[s]
}

function acompStyle(a: AcompanhamentoCirurgia) {
  const m: Record<AcompanhamentoCirurgia, { bg: string; color: string }> = {
    opme_pos:  { bg: 'rgba(0,122,255,0.08)',   color: '#007AFF' },
    agendada:  { bg: 'rgba(52,199,89,0.08)',   color: '#34C759' },
    cancelada: { bg: 'rgba(255,59,48,0.08)',   color: '#FF3B30' },
    expedida:  { bg: 'rgba(0,199,190,0.10)',   color: '#00C7BE' },
  }
  return m[a]
}

function segmentoColor(s: SegmentoCirurgia) {
  const m: Record<SegmentoCirurgia, string> = {
    ortopedia: '#AF52DE', trauma: '#FF9500', neuro: '#007AFF', coluna: '#34C759',
  }
  return m[s]
}

function fmtDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ─── Empty form ───────────────────────────────────────────────────────────────

function emptyForm(): Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt' | 'criadoPorId' | 'criadoPorNome'> {
  return {
    codigoV2: '',
    data: new Date().toISOString().split('T')[0],
    cirurgia: '',
    segmento: 'ortopedia',
    pacienteNome: '',
    convenio: '',
    hospital: '',
    medico: '',
    vendedor: '',
    situacao: 'urgencia',
    acompanhamento: 'agendada',
    observacao: '',
  }
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
  const inp = { background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1, fontSize: 16 }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: T.card, boxShadow: '0 24px 60px rgba(0,0,0,0.30)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.divider}` }}>
          <div>
            <p className="font-bold text-base" style={{ color: T.text1 }}>{isEdit ? 'Editar Cirurgia' : 'Nova Cirurgia'}</p>
            <p className="text-xs mt-0.5" style={{ color: T.text3 }}>Controle de Cirurgias</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: T.inputBg, color: T.text2 }}>
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Data *</label>
                <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                  required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Cód. V2</label>
                <input type="text" value={form.codigoV2} onChange={e => set('codigoV2', e.target.value)}
                  placeholder="Ex: 385515" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={inp} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Cirurgia / Procedimento *</label>
              <input type="text" value={form.cirurgia} onChange={e => set('cirurgia', e.target.value.toUpperCase())}
                placeholder="Ex: FRATURA DE FÊMUR" required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Segmento *</label>
              <div className="flex gap-2 flex-wrap">
                {SEGMENTOS.map(s => (
                  <button key={s} type="button" onClick={() => set('segmento', s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={form.segmento === s
                      ? { background: segmentoColor(s), color: '#fff' }
                      : { background: `${segmentoColor(s)}18`, color: segmentoColor(s), border: `1px solid ${segmentoColor(s)}35` }}>
                    {SEGMENTO_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Nome do Paciente *</label>
              <input type="text" value={form.pacienteNome} onChange={e => set('pacienteNome', e.target.value.toUpperCase())}
                placeholder="NOME COMPLETO DO PACIENTE" required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Convênio</label>
                <input type="text" value={form.convenio} onChange={e => set('convenio', e.target.value.toUpperCase())}
                  placeholder="Ex: UNIMED" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Hospital</label>
                <input type="text" value={form.hospital} onChange={e => set('hospital', e.target.value.toUpperCase())}
                  placeholder="Ex: NITERÓI DOR" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Médico</label>
                <input type="text" value={form.medico} onChange={e => set('medico', e.target.value.toUpperCase())}
                  placeholder="NOME DO MÉDICO" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Vendedor</label>
                <input type="text" value={form.vendedor} onChange={e => set('vendedor', e.target.value.toUpperCase())}
                  placeholder="NOME DO VENDEDOR" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase" style={inp} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Situação *</label>
              <div className="flex gap-2 flex-wrap">
                {SITUACOES.map(s => {
                  const st = situacaoStyle(s)
                  return (
                    <button key={s} type="button" onClick={() => set('situacao', s)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                      style={form.situacao === s
                        ? { background: st.color, color: '#fff' }
                        : { background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                      {SITUACAO_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Acompanhamento *</label>
              <div className="relative">
                <select value={form.acompanhamento} onChange={e => set('acompanhamento', e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none" style={inp}>
                  {ACOMPANHAMENTOS.map(a => <option key={a} value={a}>{ACOMPANHAMENTO_LABELS[a]}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: T.text3 }} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: T.text2 }}>Observação</label>
              <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)}
                rows={2} placeholder="Informações adicionais..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none" style={inp} />
            </div>
          </div>
        </form>

        <div className="flex gap-3 justify-end px-5 py-4 flex-shrink-0"
          style={{ borderTop: `1px solid ${T.divider}` }}>
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

  const [search, setSearch] = useState('')
  const [filterMes, setFilterMes] = useState<number>(new Date().getMonth()) // 0-based
  const [filterAno, setFilterAno] = useState<number>(new Date().getFullYear())
  const [filterSegmento, setFilterSegmento] = useState<SegmentoCirurgia | ''>('')
  const [filterSituacao, setFilterSituacao] = useState<SituacaoCirurgia | ''>('')
  const [filterAcomp, setFilterAcomp] = useState<AcompanhamentoCirurgia | ''>('')

  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<ControleCirurgia | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems(await getControleCirurgias())
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

  function openEdit(item: ControleCirurgia) { setEditItem(item); setShowModal(true) }
  function openNew() { setEditItem(null); setShowModal(true) }

  // ── Filtering ──
  const filtered = items.filter(it => {
    const [y, m] = (it.data || '').split('-').map(Number)
    if (y !== filterAno || m - 1 !== filterMes) return false
    if (filterSegmento && it.segmento !== filterSegmento) return false
    if (filterSituacao && it.situacao !== filterSituacao) return false
    if (filterAcomp && it.acompanhamento !== filterAcomp) return false
    if (search) {
      const q = search.toLowerCase()
      return (
        it.pacienteNome?.toLowerCase().includes(q) ||
        it.cirurgia?.toLowerCase().includes(q) ||
        it.hospital?.toLowerCase().includes(q) ||
        it.medico?.toLowerCase().includes(q) ||
        it.vendedor?.toLowerCase().includes(q) ||
        it.codigoV2?.toLowerCase().includes(q)
      )
    }
    return true
  })

  // ── Stats ──
  const totalMes = items.filter(it => {
    const [y, m] = (it.data || '').split('-').map(Number)
    return y === filterAno && m - 1 === filterMes
  })
  const bySegmento = SEGMENTOS.map(s => ({ s, count: totalMes.filter(i => i.segmento === s).length }))
  const canceladas = totalMes.filter(i => i.acompanhamento === 'cancelada').length

  const anos = Array.from(new Set(items.map(i => Number(i.data?.split('-')[0])))).sort((a, b) => b - a)
  if (!anos.includes(filterAno)) anos.unshift(filterAno)

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#007AFF', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error === 'tabela_inexistente') return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)' }}>
        <AlertCircle size={40} className="mx-auto mb-4" style={{ color: '#FF9500' }} />
        <h2 className="font-bold text-lg mb-2" style={{ color: T.text1 }}>Configure o banco de dados</h2>
        <p className="text-sm mb-5" style={{ color: T.text2 }}>
          Para ativar o Controle de Cirurgias, execute o SQL abaixo no painel do Supabase
          (<strong>SQL Editor → New query</strong>):
        </p>
        <pre className="text-left text-xs rounded-xl p-4 overflow-x-auto mb-5"
          style={{ background: T.inputBg, color: T.text1, lineHeight: 1.6 }}>
{`CREATE TABLE controle_cirurgias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero text,
  codigo_v2 text,
  data date NOT NULL,
  cirurgia text NOT NULL,
  segmento text NOT NULL,
  paciente_nome text NOT NULL,
  convenio text,
  hospital text,
  medico text,
  vendedor text,
  situacao text NOT NULL DEFAULT 'urgencia',
  acompanhamento text NOT NULL DEFAULT 'agendada',
  observacao text,
  criado_por_id text,
  criado_por_nome text,
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

  return (
    <div className="space-y-2">
      {/* Modal */}
      {showModal && (
        <CirurgiaModal
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* ── Header + mês/ano numa linha só ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-base font-bold tracking-tight mr-1" style={{ color: T.text1 }}>Controle de Cirurgias</h2>
        <span className="text-xs font-medium" style={{ color: T.text3 }}>
          {filtered.length} reg · {MESES[filterMes]} {filterAno}
        </span>
        <select value={filterAno} onChange={e => setFilterAno(Number(e.target.value))}
          className="rounded-lg px-2 py-1 text-xs font-semibold outline-none ml-1"
          style={{ background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1 }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex gap-1.5 flex-wrap flex-1">
          {MESES.map((m, i) => (
            <button key={i} onClick={() => setFilterMes(i)}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition-all"
              style={filterMes === i
                ? { background: '#007AFF', color: '#fff' }
                : { background: T.inputBg, color: T.text2, border: `1px solid ${T.cardBorder}` }}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <button onClick={openNew} className="btn-primary ml-auto">
          <Plus size={15} /> Nova Cirurgia
        </button>
      </div>

      {/* ── KPI strip ── */}
      <div className="flex gap-3 flex-wrap">
        <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
          style={{ background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.2)' }}>
          <p className="text-3xl font-bold leading-none" style={{ color: '#FF3B30' }}>{totalMes.length}</p>
          <p className="text-sm font-semibold" style={{ color: '#FF3B30' }}>Total</p>
        </div>
        {bySegmento.map(({ s, count }) => (
          <div key={s} className="rounded-2xl px-5 py-3 flex items-center gap-3"
            style={{ background: `${segmentoColor(s)}12`, border: `1px solid ${segmentoColor(s)}28` }}>
            <p className="text-3xl font-bold leading-none" style={{ color: segmentoColor(s) }}>{count}</p>
            <p className="text-sm font-semibold" style={{ color: segmentoColor(s) }}>{SEGMENTO_LABELS[s]}</p>
          </div>
        ))}
        {canceladas > 0 && (
          <div className="rounded-2xl px-5 py-3 flex items-center gap-3"
            style={{ background: 'rgba(255,59,48,0.10)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <p className="text-3xl font-bold leading-none" style={{ color: '#FF3B30' }}>{canceladas}</p>
            <p className="text-sm font-semibold" style={{ color: '#FF3B30' }}>Canceladas</p>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-52 rounded-xl px-3 py-2.5"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <Search size={14} style={{ color: T.text3, flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente, cirurgia, médico..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: T.text1 }} />
          {search && <button onClick={() => setSearch('')}><X size={13} style={{ color: T.text3 }} /></button>}
        </div>

        {[
          { val: filterSegmento, set: setFilterSegmento, opts: SEGMENTOS.map(s => ({ v: s, l: SEGMENTO_LABELS[s] })), placeholder: 'Segmento' },
          { val: filterSituacao, set: setFilterSituacao, opts: SITUACOES.map(s => ({ v: s, l: SITUACAO_LABELS[s] })), placeholder: 'Situação' },
          { val: filterAcomp,   set: setFilterAcomp,    opts: ACOMPANHAMENTOS.map(a => ({ v: a, l: ACOMPANHAMENTO_LABELS[a] })), placeholder: 'Acompanhamento' },
        ].map(({ val, set: setter, opts, placeholder }) => (
          <select key={placeholder} value={val} onChange={e => setter(e.target.value as any)}
            className="rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, color: val ? T.text1 : T.text3 }}>
            <option value="">{placeholder}</option>
            {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
          </select>
        ))}

        {(filterSegmento || filterSituacao || filterAcomp || search) && (
          <button onClick={() => { setFilterSegmento(''); setFilterSituacao(''); setFilterAcomp(''); setSearch('') }}
            className="px-3 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
            Limpar
          </button>
        )}
      </div>

      {/* ── Table (desktop) ── */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center rounded-2xl"
          style={{ background: T.card, border: `1px solid ${T.cardBorder}` }}>
          <ClipboardList size={36} className="mx-auto mb-3" style={{ color: T.text3 }} />
          <p className="font-semibold" style={{ color: T.text2 }}>Nenhum registro encontrado</p>
          <p className="text-sm mt-1" style={{ color: T.text3 }}>
            {search || filterSegmento || filterSituacao || filterAcomp
              ? 'Ajuste os filtros ou adicione um novo registro pelo botão acima.'
              : 'Nenhuma cirurgia cadastrada em ' + MESES[filterMes] + '.'}
          </p>
        </div>
      ) : (
        <>
          <div className="hidden md:block rounded-2xl overflow-hidden"
            style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: T.thead, borderBottom: `1px solid ${T.divider}` }}>
                    {['Cód. V2','Data','Cirurgia','Segmento','Nome','Convênio','Hospital','Médico','Vendedor','Situação','Acomp.',''].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: T.text3 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(it => {
                    const st = situacaoStyle(it.situacao)
                    const ac = acompStyle(it.acompanhamento)
                    const isCancelada = it.acompanhamento === 'cancelada'
                    return (
                      <tr key={it.id} style={{ borderBottom: `1px solid ${T.divider}`, opacity: isCancelada ? 0.55 : 1 }}>
                        <td className="px-2 py-2 font-mono text-xs whitespace-nowrap" style={{ color: T.text3 }}>{it.codigoV2 || '—'}</td>
                        <td className="px-2 py-2 font-mono text-xs whitespace-nowrap" style={{ color: T.text3 }}>{fmtDate(it.data)}</td>
                        <td className="px-2 py-2 min-w-[130px] font-semibold text-xs" style={{ color: T.text1 }}>{it.cirurgia}</td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: `${segmentoColor(it.segmento)}18`, color: segmentoColor(it.segmento) }}>
                            {SEGMENTO_LABELS[it.segmento]}
                          </span>
                        </td>
                        <td className="px-2 py-2 min-w-[130px] font-semibold text-xs" style={{ color: T.text1 }}>{it.pacienteNome}</td>
                        <td className="px-2 py-2 min-w-[90px] text-xs" style={{ color: T.text2 }}>{it.convenio || '—'}</td>
                        <td className="px-2 py-2 min-w-[100px] text-xs" style={{ color: T.text2 }}>{it.hospital || '—'}</td>
                        <td className="px-2 py-2 min-w-[100px] text-xs" style={{ color: T.text2 }}>{it.medico || '—'}</td>
                        <td className="px-2 py-2 min-w-[80px] text-xs" style={{ color: T.text2 }}>{it.vendedor || '—'}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                            {SITUACAO_LABELS[it.situacao]}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: ac.bg, color: ac.color }}>
                            {ACOMPANHAMENTO_LABELS[it.acompanhamento]}
                          </span>
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(it)} className="p-1.5 rounded-lg transition-colors"
                              style={{ color: T.text3 }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#007AFF')}
                              onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(it)} className="p-1.5 rounded-lg"
                              style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(it => {
              const st = situacaoStyle(it.situacao)
              const ac = acompStyle(it.acompanhamento)
              const isCancelada = it.acompanhamento === 'cancelada'
              return (
                <div key={it.id} style={{
                  background: T.card,
                  border: `1px solid ${T.cardBorder}`,
                  borderLeft: `4px solid ${segmentoColor(it.segmento)}`,
                  borderRadius: 14, padding: '12px 14px', opacity: isCancelada ? 0.6 : 1,
                }}>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-mono font-medium" style={{ color: T.text3 }}>{fmtDate(it.data)}</span>
                    {it.codigoV2 && <span className="text-xs font-mono" style={{ color: T.text3 }}>{it.codigoV2}</span>}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${segmentoColor(it.segmento)}18`, color: segmentoColor(it.segmento) }}>
                      {SEGMENTO_LABELS[it.segmento]}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                      {SITUACAO_LABELS[it.situacao]}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: ac.bg, color: ac.color }}>
                      {ACOMPANHAMENTO_LABELS[it.acompanhamento]}
                    </span>
                  </div>
                  <p className="font-bold text-sm" style={{ color: T.text1 }}>{it.cirurgia}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: T.text2 }}>{it.pacienteNome}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {it.hospital && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><Building2 size={11} />{it.hospital}</span>}
                    {it.medico   && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><Stethoscope size={11} />{it.medico}</span>}
                    {it.vendedor && <span className="flex items-center gap-1 text-xs" style={{ color: T.text3 }}><User size={11} />{it.vendedor}</span>}
                    {it.convenio && <span className="text-xs" style={{ color: T.text3 }}>{it.convenio}</span>}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(it)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center"
                      style={{ background: T.inputBg, color: T.text2 }}>
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => handleDelete(it)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(255,59,48,0.08)', color: '#FF3B30' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {filtered.length > 0 && (
        <p className="text-xs pb-8 text-right" style={{ color: T.text3 }}>
          {filtered.length} de {totalMes.length} registros em {MESES[filterMes]} {filterAno}
        </p>
      )}
    </div>
  )
}
