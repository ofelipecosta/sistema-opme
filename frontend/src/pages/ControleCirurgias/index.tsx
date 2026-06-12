import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Search, X, Trash2, Edit2, ChevronDown, ClipboardList,
  Calendar, Building2, Stethoscope, User, AlertCircle, CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  getControleCirurgias, createControleCirurgia,
  updateControleCirurgia, deleteControleCirurgia,
} from '../../utils/controle-storage'
import type { ControleCirurgia, SegmentoCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../../types/controle'
import {
  SEGMENTO_LABELS, SITUACAO_LABELS, ACOMPANHAMENTO_LABELS,
} from '../../types/controle'

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

  function set(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.cirurgia.trim() || !form.pacienteNome.trim() || !form.data) {
      toast.error('Preencha Cirurgia, Paciente e Data')
      return
    }
    setSaving(true)
    try { await onSave(form) } finally { setSaving(false) }
  }

  const isEdit = !!initial

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl overflow-hidden"
        style={{ background: '#fff', boxShadow: '0 24px 60px rgba(0,0,0,0.20)', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div>
            <p className="font-bold text-base" style={{ color: '#1D1D1F' }}>
              {isEdit ? 'Editar Cirurgia' : 'Nova Cirurgia'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: '#8E8E93' }}>
              Controle de Cirurgias
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.06)', color: '#48484A' }}>
            <X size={14} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="p-5 space-y-4">

            {/* Row: Data + Código */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Data *</label>
                <input type="date" value={form.data} onChange={e => set('data', e.target.value)}
                  required className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Cód. V2</label>
                <input type="text" value={form.codigoV2} onChange={e => set('codigoV2', e.target.value)}
                  placeholder="Ex: 385515" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
            </div>

            {/* Cirurgia */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Cirurgia / Procedimento *</label>
              <input type="text" value={form.cirurgia} onChange={e => set('cirurgia', e.target.value.toUpperCase())}
                placeholder="Ex: FRATURA DE FÊMUR" required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
            </div>

            {/* Segmento */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Segmento *</label>
              <div className="flex gap-2 flex-wrap">
                {SEGMENTOS.map(s => (
                  <button key={s} type="button" onClick={() => set('segmento', s)}
                    className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
                    style={form.segmento === s
                      ? { background: segmentoColor(s), color: '#fff' }
                      : { background: `${segmentoColor(s)}15`, color: segmentoColor(s), border: `1px solid ${segmentoColor(s)}30` }}>
                    {SEGMENTO_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>

            {/* Paciente */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Nome do Paciente *</label>
              <input type="text" value={form.pacienteNome} onChange={e => set('pacienteNome', e.target.value.toUpperCase())}
                placeholder="NOME COMPLETO DO PACIENTE" required
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
            </div>

            {/* Row: Convênio + Hospital */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Convênio</label>
                <input type="text" value={form.convenio} onChange={e => set('convenio', e.target.value.toUpperCase())}
                  placeholder="Ex: UNIMED" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Hospital</label>
                <input type="text" value={form.hospital} onChange={e => set('hospital', e.target.value.toUpperCase())}
                  placeholder="Ex: NITERÓI DOR" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
            </div>

            {/* Row: Médico + Vendedor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Médico</label>
                <input type="text" value={form.medico} onChange={e => set('medico', e.target.value.toUpperCase())}
                  placeholder="NOME DO MÉDICO" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Vendedor</label>
                <input type="text" value={form.vendedor} onChange={e => set('vendedor', e.target.value.toUpperCase())}
                  placeholder="NOME DO VENDEDOR" className="w-full rounded-xl px-3 py-2.5 text-sm outline-none uppercase"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
              </div>
            </div>

            {/* Situação */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Situação *</label>
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

            {/* Acompanhamento */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Acompanhamento *</label>
              <div className="relative">
                <select value={form.acompanhamento} onChange={e => set('acompanhamento', e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm outline-none appearance-none"
                  style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }}>
                  {ACOMPANHAMENTOS.map(a => (
                    <option key={a} value={a}>{ACOMPANHAMENTO_LABELS[a]}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#8E8E93' }} />
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: '#48484A' }}>Observação</label>
              <textarea value={form.observacao} onChange={e => set('observacao', e.target.value)}
                rows={2} placeholder="Informações adicionais..."
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F', fontSize: 16 }} />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex gap-3 justify-end px-5 py-4 flex-shrink-0"
          style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
          <button type="button" onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#48484A' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit as any} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7a1010,#c02020)', color: '#fff', opacity: saving ? 0.7 : 1 }}>
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
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#c02020', borderTopColor: 'transparent' }} />
    </div>
  )

  if (error === 'tabela_inexistente') return (
    <div className="max-w-2xl mx-auto py-16 px-4">
      <div className="rounded-2xl p-8 text-center" style={{ background: 'rgba(255,149,0,0.06)', border: '1px solid rgba(255,149,0,0.2)' }}>
        <AlertCircle size={40} className="mx-auto mb-4" style={{ color: '#FF9500' }} />
        <h2 className="font-bold text-lg mb-2" style={{ color: '#1D1D1F' }}>Configure o banco de dados</h2>
        <p className="text-sm mb-5" style={{ color: '#48484A' }}>
          Para ativar o Controle de Cirurgias, execute o SQL abaixo no painel do Supabase
          (<strong>SQL Editor → New query</strong>):
        </p>
        <pre className="text-left text-xs rounded-xl p-4 overflow-x-auto mb-5"
          style={{ background: 'rgba(0,0,0,0.05)', color: '#1D1D1F', lineHeight: 1.6 }}>
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
        <button onClick={load}
          className="px-5 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#7a1010,#c02020)', color: '#fff' }}>
          Tentar novamente
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-5 max-w-7xl">
      {/* Modal */}
      {showModal && (
        <CirurgiaModal
          initial={editItem}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditItem(null) }}
        />
      )}

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold tracking-tight" style={{ color: '#1D1D1F' }}>Controle de Cirurgias</h2>
          <p className="text-sm mt-0.5" style={{ color: '#8E8E93' }}>
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''} · {MESES[filterMes]} {filterAno}
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: 'linear-gradient(135deg,#7a1010,#c02020)', color: '#fff', boxShadow: '0 2px 10px rgba(122,16,16,0.35)' }}>
          <Plus size={15} /> Nova Cirurgia
        </button>
      </div>

      {/* ── Navegação de mês/ano ── */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filterAno} onChange={e => setFilterAno(Number(e.target.value))}
          className="rounded-xl px-3 py-2 text-sm font-semibold outline-none"
          style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)', color: '#1D1D1F' }}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {MESES.map((m, i) => (
            <button key={i} onClick={() => setFilterMes(i)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={filterMes === i
                ? { background: 'linear-gradient(135deg,#7a1010,#c02020)', color: '#fff' }
                : { background: 'rgba(0,0,0,0.04)', color: '#48484A' }}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="col-span-2 sm:col-span-1 rounded-2xl p-4 text-center"
          style={{ background: 'rgba(122,16,16,0.07)', border: '1px solid rgba(122,16,16,0.15)' }}>
          <p className="text-2xl font-bold" style={{ color: '#c02020' }}>{totalMes.length}</p>
          <p className="text-xs font-medium mt-0.5" style={{ color: '#c02020' }}>Total</p>
        </div>
        {bySegmento.map(({ s, count }) => (
          <div key={s} className="rounded-2xl p-4 text-center"
            style={{ background: `${segmentoColor(s)}0f`, border: `1px solid ${segmentoColor(s)}25` }}>
            <p className="text-2xl font-bold" style={{ color: segmentoColor(s) }}>{count}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: segmentoColor(s) }}>{SEGMENTO_LABELS[s]}</p>
          </div>
        ))}
        {canceladas > 0 && (
          <div className="rounded-2xl p-4 text-center"
            style={{ background: 'rgba(255,59,48,0.07)', border: '1px solid rgba(255,59,48,0.2)' }}>
            <p className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{canceladas}</p>
            <p className="text-xs font-medium mt-0.5" style={{ color: '#FF3B30' }}>Canceladas</p>
          </div>
        )}
      </div>

      {/* ── Filters ── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-52 rounded-xl px-3 py-2.5"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)' }}>
          <Search size={14} style={{ color: '#8E8E93', flexShrink: 0 }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente, cirurgia, médico..."
            className="flex-1 bg-transparent text-sm outline-none" style={{ color: '#1D1D1F' }} />
          {search && <button onClick={() => setSearch('')}><X size={13} style={{ color: '#8E8E93' }} /></button>}
        </div>

        <select value={filterSegmento} onChange={e => setFilterSegmento(e.target.value as any)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: filterSegmento ? '#1D1D1F' : '#8E8E93' }}>
          <option value="">Segmento</option>
          {SEGMENTOS.map(s => <option key={s} value={s}>{SEGMENTO_LABELS[s]}</option>)}
        </select>

        <select value={filterSituacao} onChange={e => setFilterSituacao(e.target.value as any)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: filterSituacao ? '#1D1D1F' : '#8E8E93' }}>
          <option value="">Situação</option>
          {SITUACOES.map(s => <option key={s} value={s}>{SITUACAO_LABELS[s]}</option>)}
        </select>

        <select value={filterAcomp} onChange={e => setFilterAcomp(e.target.value as any)}
          className="rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', color: filterAcomp ? '#1D1D1F' : '#8E8E93' }}>
          <option value="">Acompanhamento</option>
          {ACOMPANHAMENTOS.map(a => <option key={a} value={a}>{ACOMPANHAMENTO_LABELS[a]}</option>)}
        </select>

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
          style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)' }}>
          <ClipboardList size={36} className="mx-auto mb-3" style={{ color: '#D1D1D6' }} />
          <p className="font-semibold" style={{ color: '#48484A' }}>Nenhum registro encontrado</p>
          <p className="text-sm mt-1 mb-4" style={{ color: '#8E8E93' }}>
            {search || filterSegmento || filterSituacao || filterAcomp
              ? 'Ajuste os filtros ou'
              : 'Nenhuma cirurgia cadastrada em ' + MESES[filterMes] + '. '}
          </p>
          <button onClick={openNew}
            className="px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: 'linear-gradient(135deg,#7a1010,#c02020)', color: '#fff' }}>
            <Plus size={13} className="inline mr-1" /> Adicionar cirurgia
          </button>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block rounded-2xl overflow-hidden"
            style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.02)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    {['Data','Cód.','Cirurgia','Segmento','Paciente','Convênio','Hospital','Médico','Vendedor','Situação','Acomp.',''].map(h => (
                      <th key={h} className="text-left px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: '#8E8E93' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((it, idx) => {
                    const st = situacaoStyle(it.situacao)
                    const ac = acompStyle(it.acompanhamento)
                    const isCancelada = it.acompanhamento === 'cancelada'
                    return (
                      <tr key={it.id}
                        className="hover:bg-black/[0.015] transition-colors"
                        style={{ borderBottom: '1px solid rgba(0,0,0,0.04)', opacity: isCancelada ? 0.55 : 1 }}>
                        <td className="px-3 py-3 font-mono text-xs whitespace-nowrap" style={{ color: '#8E8E93' }}>{fmtDate(it.data)}</td>
                        <td className="px-3 py-3 font-mono text-xs" style={{ color: '#8E8E93' }}>{it.codigoV2 || '—'}</td>
                        <td className="px-3 py-3 max-w-[160px] truncate font-medium" style={{ color: '#1D1D1F' }} title={it.cirurgia}>{it.cirurgia}</td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold"
                            style={{ background: `${segmentoColor(it.segmento)}15`, color: segmentoColor(it.segmento) }}>
                            {SEGMENTO_LABELS[it.segmento]}
                          </span>
                        </td>
                        <td className="px-3 py-3 max-w-[150px] truncate font-medium" style={{ color: '#1D1D1F' }} title={it.pacienteNome}>{it.pacienteNome}</td>
                        <td className="px-3 py-3 max-w-[110px] truncate text-xs" style={{ color: '#48484A' }}>{it.convenio || '—'}</td>
                        <td className="px-3 py-3 max-w-[120px] truncate text-xs" style={{ color: '#48484A' }}>{it.hospital || '—'}</td>
                        <td className="px-3 py-3 max-w-[110px] truncate text-xs" style={{ color: '#48484A' }}>{it.medico || '—'}</td>
                        <td className="px-3 py-3 max-w-[100px] truncate text-xs" style={{ color: '#48484A' }}>{it.vendedor || '—'}</td>
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
                            <button onClick={() => openEdit(it)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{ color: '#8E8E93' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#007AFF')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#8E8E93')}>
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => handleDelete(it)}
                              className="p-1.5 rounded-lg"
                              style={{ background: 'rgba(255,59,48,0.07)', color: '#FF3B30' }}>
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
                <div key={it.id}
                  style={{
                    background: '#fff',
                    border: `1.5px solid ${segmentoColor(it.segmento)}30`,
                    borderLeft: `4px solid ${segmentoColor(it.segmento)}`,
                    borderRadius: 14,
                    padding: '12px 14px',
                    opacity: isCancelada ? 0.6 : 1,
                  }}>
                  {/* Row 1: data + badges */}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-mono font-medium" style={{ color: '#8E8E93' }}>{fmtDate(it.data)}</span>
                    {it.codigoV2 && <span className="text-xs font-mono" style={{ color: '#8E8E93' }}>{it.codigoV2}</span>}
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: `${segmentoColor(it.segmento)}15`, color: segmentoColor(it.segmento) }}>
                      {SEGMENTO_LABELS[it.segmento]}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: st.bg, color: st.color }}>
                      {SITUACAO_LABELS[it.situacao]}
                    </span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: ac.bg, color: ac.color }}>
                      {ACOMPANHAMENTO_LABELS[it.acompanhamento]}
                    </span>
                  </div>
                  {/* Row 2: cirurgia + paciente */}
                  <p className="font-bold text-sm" style={{ color: '#1D1D1F' }}>{it.cirurgia}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: '#48484A' }}>{it.pacienteNome}</p>
                  {/* Row 3: info chips */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {it.hospital && <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}><Building2 size={11} />{it.hospital}</span>}
                    {it.medico   && <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}><Stethoscope size={11} />{it.medico}</span>}
                    {it.vendedor && <span className="flex items-center gap-1 text-xs" style={{ color: '#8E8E93' }}><User size={11} />{it.vendedor}</span>}
                    {it.convenio && <span className="text-xs" style={{ color: '#8E8E93' }}>{it.convenio}</span>}
                  </div>
                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openEdit(it)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium flex-1 justify-center"
                      style={{ background: 'rgba(0,0,0,0.04)', color: '#48484A' }}>
                      <Edit2 size={13} /> Editar
                    </button>
                    <button onClick={() => handleDelete(it)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{ background: 'rgba(255,59,48,0.07)', color: '#FF3B30' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Rodapé info */}
      {filtered.length > 0 && (
        <p className="text-xs pb-8 text-right" style={{ color: '#C7C7CC' }}>
          {filtered.length} de {totalMes.length} registros em {MESES[filterMes]} {filterAno}
        </p>
      )}
    </div>
  )
}
