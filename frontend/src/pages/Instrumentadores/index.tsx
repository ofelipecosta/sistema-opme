import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, Search, Phone, Mail,
  MapPin, Stethoscope, Users, Calendar, TrendingUp,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'
import {
  getInstrumentadores, createInstrumentador, updateInstrumentador, deleteInstrumentador,
  type Instrumentador,
} from '../../utils/cadastros-storage'
import { getAgenda } from '../../utils/agenda-storage'
import { ESPECIALIDADE_OPTIONS } from '../../utils/helpers'

function useT() {
  const { isDark } = useTheme()
  return {
    isDark,
    card:       isDark ? '#1F2937' : '#ffffff',
    cardBorder: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)',
    text1:      isDark ? '#F3F4F6' : '#0F172A',
    text2:      isDark ? '#D1D5DB' : '#475569',
    text3:      isDark ? '#9CA3AF' : '#94A3B8',
    divider:    isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    inputBg:    isDark ? '#374151' : '#F8FAFC',
    shadow:     isDark ? '0 2px 12px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.06)',
  }
}

type WorkloadKey = 'hoje' | 'semana' | 'mes' | 'noventa'

interface WorkloadMap {
  hoje: number
  semana: number
  mes: number
  noventa: number
}

function todayStr() { return new Date().toISOString().split('T')[0] }
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(r.getDate() + n); return r }

const EMPTY: Omit<Instrumentador, 'id' | 'ativo' | 'createdAt'> = {
  nome: '', telefone: '', whatsapp: '', email: '', cidade: '', especialidade: '', observacoes: '',
}

export default function InstrumentadoresPage() {
  const T = useT()
  const [items, setItems]       = useState<Instrumentador[]>([])
  const [workload, setWorkload]  = useState<Record<string, WorkloadMap>>({})
  const [search, setSearch]      = useState('')
  const [editId, setEditId]      = useState<string | null>(null)
  const [form, setForm]          = useState<typeof EMPTY>(EMPTY)
  const [showForm, setShowForm]  = useState(false)
  const [loading, setLoading]    = useState(true)
  const [activeTab, setActiveTab] = useState<WorkloadKey>('mes')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [insts, agenda] = await Promise.all([getInstrumentadores(), getAgenda()])
      setItems(insts)

      const today   = new Date(); today.setHours(0,0,0,0)
      const todayS  = todayStr()
      const weekEnd = addDays(today, 7).toISOString().split('T')[0]
      const monEnd  = addDays(today, 30).toISOString().split('T')[0]
      const q90End  = addDays(today, 90).toISOString().split('T')[0]

      const wl: Record<string, WorkloadMap> = {}
      for (const inst of insts) {
        const name = inst.nome.toLowerCase()
        const rows = agenda.filter(a => (a.instrumentadores || '').toLowerCase().includes(name))
        wl[inst.id] = {
          hoje:    rows.filter(a => a.data === todayS).length,
          semana:  rows.filter(a => a.data >= todayS && a.data <= weekEnd).length,
          mes:     rows.filter(a => a.data >= todayS && a.data <= monEnd).length,
          noventa: rows.filter(a => a.data >= todayS && a.data <= q90End).length,
        }
      }
      setWorkload(wl)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    (i.especialidade || '').toLowerCase().includes(search.toLowerCase()) ||
    (i.cidade || '').toLowerCase().includes(search.toLowerCase())
  )

  function openNew() {
    setEditId(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  function openEdit(i: Instrumentador) {
    setEditId(i.id)
    setForm({ nome: i.nome, telefone: i.telefone || '', whatsapp: i.whatsapp || '', email: i.email || '', cidade: i.cidade || '', especialidade: i.especialidade || '', observacoes: i.observacoes || '' })
    setShowForm(true)
  }

  async function onSave() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    try {
      if (editId) {
        await updateInstrumentador(editId, form)
        toast.success('Instrumentador atualizado!')
      } else {
        await createInstrumentador(form)
        toast.success('Instrumentador criado!')
      }
      setShowForm(false)
      load()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar'
      if (msg.includes('does not exist')) {
        toast.error('Execute o SQL de criação da tabela primeiro.')
      } else {
        toast.error(msg)
      }
    }
  }

  async function onDelete(id: string, nome: string) {
    if (!confirm(`Desativar ${nome}?`)) return
    await deleteInstrumentador(id)
    toast.success('Instrumentador removido')
    load()
  }

  const workloadTabs: { key: WorkloadKey; label: string }[] = [
    { key: 'hoje',   label: 'Hoje' },
    { key: 'semana', label: '7 dias' },
    { key: 'mes',    label: '30 dias' },
    { key: 'noventa', label: '90 dias' },
  ]

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: T.text1 }}>Instrumentadores</h1>
          <p className="text-sm mt-0.5" style={{ color: T.text3 }}>{items.length} cadastrado{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openNew} className="btn-primary">
          <Plus className="w-4 h-4" /> Novo Instrumentador
        </button>
      </div>

      {/* Workload period tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: T.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
        {workloadTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg transition-all"
            style={activeTab === t.key
              ? { background: '#2563EB', color: '#fff', boxShadow: '0 1px 4px rgba(37,99,235,0.3)' }
              : { color: T.text2 }
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: T.text3 }} />
        <input
          className="input pl-9"
          placeholder="Buscar instrumentador..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={{ background: T.card, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg" style={{ color: T.text1 }}>{editId ? 'Editar' : 'Novo'} Instrumentador</h3>
              <button onClick={() => setShowForm(false)} style={{ color: T.text3 }}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
              </div>
              <div>
                <label className="label">Telefone</label>
                <input className="input" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="label">WhatsApp</label>
                <input className="input" value={form.whatsapp} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <label className="label">E-mail</label>
                <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input className="input" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} placeholder="Cidade" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Especialidade</label>
                <select className="input" value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}>
                  <option value="">Selecione...</option>
                  {ESPECIALIDADE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Observações</label>
                <textarea className="input resize-none" rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações gerais..." />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowForm(false)} className="btn-secondary">Cancelar</button>
              <button onClick={onSave} className="btn-primary ml-auto">
                <Check className="w-4 h-4" /> {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <Users className="w-10 h-10 mx-auto mb-3" style={{ color: T.text3 }} />
          <p className="font-medium" style={{ color: T.text2 }}>
            {search ? 'Nenhum resultado encontrado' : 'Nenhum instrumentador cadastrado'}
          </p>
          {!search && <button onClick={openNew} className="btn-primary mt-4"><Plus className="w-4 h-4" /> Cadastrar</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(inst => {
            const wl = workload[inst.id] ?? { hoje: 0, semana: 0, mes: 0, noventa: 0 }
            const count = wl[activeTab]
            const intensity = count === 0 ? 'low' : count <= 2 ? 'medium' : count <= 5 ? 'high' : 'critical'
            const intensityColor = { low: '#16A34A', medium: '#2563EB', high: '#F59E0B', critical: '#DC2626' }[intensity]
            const intensityBg   = { low: 'rgba(22,163,74,0.10)', medium: 'rgba(37,99,235,0.10)', high: 'rgba(245,158,11,0.10)', critical: 'rgba(220,38,38,0.10)' }[intensity]

            return (
              <div
                key={inst.id}
                className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}
              >
                {/* Header row */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg, #2563EB, #60a5fa)' }}>
                    {inst.nome.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight truncate" style={{ color: T.text1 }}>{inst.nome}</p>
                    {inst.especialidade && (
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.text3 }}>
                        <Stethoscope className="w-3 h-3" />{inst.especialidade}
                      </p>
                    )}
                  </div>
                  {/* Workload badge */}
                  <div className="rounded-lg px-2.5 py-1 text-xs font-bold flex items-center gap-1 flex-shrink-0"
                    style={{ background: intensityBg, color: intensityColor }}>
                    <Calendar className="w-3 h-3" />
                    {count}
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-1">
                  {inst.telefone && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: T.text2 }}>
                      <Phone className="w-3 h-3 flex-shrink-0" />{inst.telefone}
                    </div>
                  )}
                  {inst.email && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: T.text2 }}>
                      <Mail className="w-3 h-3 flex-shrink-0" />{inst.email}
                    </div>
                  )}
                  {inst.cidade && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: T.text2 }}>
                      <MapPin className="w-3 h-3 flex-shrink-0" />{inst.cidade}
                    </div>
                  )}
                </div>

                {/* Mini workload bar */}
                <div className="grid grid-cols-4 gap-1 text-center">
                  {workloadTabs.map(t => (
                    <div key={t.key} className="rounded-lg py-1" style={{ background: activeTab === t.key ? intensityBg : (T.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)') }}>
                      <div className="text-xs font-bold" style={{ color: activeTab === t.key ? intensityColor : T.text2 }}>{wl[t.key]}</div>
                      <div className="text-[10px]" style={{ color: T.text3 }}>{t.label}</div>
                    </div>
                  ))}
                </div>

                {inst.observacoes && (
                  <p className="text-xs line-clamp-2" style={{ color: T.text3 }}>{inst.observacoes}</p>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1" style={{ borderTop: `1px solid ${T.divider}` }}>
                  <button onClick={() => openEdit(inst)} className="btn-secondary btn-sm flex-1">
                    <Edit2 className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => onDelete(inst.id, inst.nome)} className="btn-danger btn-sm">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* SQL helper */}
      <SqlHelper />
    </div>
  )
}

function SqlHelper() {
  const T = useT()
  const [open, setOpen] = useState(false)
  const SQL = `-- Execute no Supabase SQL Editor
CREATE TABLE IF NOT EXISTS cadastros_instrumentadores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  whatsapp text,
  email text,
  cidade text,
  especialidade text,
  observacoes text,
  ativo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE cadastros_hospitais
  ADD COLUMN IF NOT EXISTS antecedencia_min_horas integer,
  ADD COLUMN IF NOT EXISTS horario_limite_recebimento text,
  ADD COLUMN IF NOT EXISTS recebe_sabado boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS recebe_domingo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recebe_feriado boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS local_entrega text,
  ADD COLUMN IF NOT EXISTS necessita_protocolo boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS observacoes_logisticas text;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE cadastros_instrumentadores ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON cadastros_instrumentadores FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;`

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full px-4 py-3 flex items-center gap-2 text-left hover:bg-slate-50">
        <TrendingUp className="w-4 h-4 text-blue-500" />
        <span className="font-medium text-sm" style={{ color: T.text1 }}>SQL — Criação de tabelas (execute no Supabase)</span>
        <span className="ml-auto text-xs" style={{ color: T.text3 }}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <pre className="bg-slate-900 text-green-400 rounded-xl p-4 text-xs overflow-x-auto whitespace-pre-wrap">{SQL}</pre>
          <button onClick={() => { navigator.clipboard.writeText(SQL); toast.success('SQL copiado!') }} className="btn-secondary btn-sm mt-2">
            Copiar SQL
          </button>
        </div>
      )}
    </div>
  )
}
