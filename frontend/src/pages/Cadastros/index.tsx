import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Edit2, Check, X, AlertCircle,
  Stethoscope, Building2, ShieldCheck, ClipboardList, Package2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useTheme } from '../../contexts/ThemeContext'
import {
  getMedicos, createMedico, updateMedico, deleteMedico,
  getHospitais, createHospital, updateHospital, deleteHospital,
  getConvenios, createConvenio, updateConvenio, deleteConvenio,
  getProcedimentos, createProcedimento, updateProcedimento, deleteProcedimento,
  getKitItems, createKitItem, deleteKitItem,
  type Medico, type Hospital, type Convenio, type Procedimento, type KitItem,
} from '../../utils/cadastros-storage'

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
  }
}

type Tab = 'medicos' | 'hospitais' | 'convenios' | 'procedimentos'

const SQL = `-- Execute no Supabase: SQL Editor → New query

CREATE TABLE IF NOT EXISTS cadastros_medicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, especialidade text, crm text,
  ativo boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cadastros_hospitais (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, cidade text,
  ativo boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cadastros_convenios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  ativo boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cadastros_procedimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL, descricao text, segmento text,
  ativo boolean DEFAULT true, created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS procedimento_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  procedimento_id uuid REFERENCES cadastros_procedimentos(id) ON DELETE CASCADE,
  nome text NOT NULL, ordem integer DEFAULT 0, ativo boolean DEFAULT true
);

-- RLS: permitir tudo
DO $$ BEGIN
  EXECUTE 'ALTER TABLE cadastros_medicos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON cadastros_medicos FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE cadastros_hospitais ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON cadastros_hospitais FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE cadastros_convenios ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON cadastros_convenios FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE cadastros_procedimentos ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON cadastros_procedimentos FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DO $$ BEGIN
  EXECUTE 'ALTER TABLE procedimento_kits ENABLE ROW LEVEL SECURITY';
  EXECUTE 'CREATE POLICY allow_all ON procedimento_kits FOR ALL USING (true)';
EXCEPTION WHEN OTHERS THEN NULL; END $$;

-- Bucket Storage para anexos (via Dashboard > Storage > New bucket)
-- Nome: requisicao-anexos  |  Public: true`

// ─── Generic inline edit row ──────────────────────────────────────────────────

function InlineRow({ label, sub, onEdit, onDelete, dimmed }: {
  label: string; sub?: string; onEdit: () => void; onDelete: () => void; dimmed?: boolean
}) {
  const T = useT()
  return (
    <div className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: `1px solid ${T.divider}`, opacity: dimmed ? 0.5 : 1 }}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: T.text1 }}>{label}</p>
        {sub && <p className="text-xs truncate" style={{ color: T.text3 }}>{sub}</p>}
      </div>
      <button onClick={onEdit} className="p-1.5 rounded-lg" style={{ color: T.text3 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')} onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
        <Edit2 size={13} />
      </button>
      <button onClick={onDelete} className="p-1.5 rounded-lg" style={{ color: T.text3 }}
        onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')} onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Inline add form ──────────────────────────────────────────────────────────

function AddRow({ fields, onSave, onCancel, placeholder = 'Nome...' }: {
  fields: { key: string; placeholder: string; value: string; onChange: (v: string) => void }[]
  onSave: () => void
  onCancel: () => void
  placeholder?: string
}) {
  const T = useT()
  const inp: React.CSSProperties = { background: T.inputBg, border: `1px solid ${T.cardBorder}`, color: T.text1, borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', width: '100%' }
  return (
    <div className="flex items-center gap-2 px-3 py-2.5" style={{ borderBottom: `1px solid ${T.divider}`, background: T.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,122,255,0.03)' }}>
      <div className="flex-1 flex gap-2">
        {fields.map(f => (
          <input key={f.key} value={f.value} onChange={e => f.onChange(e.target.value.toUpperCase())}
            placeholder={f.placeholder} style={inp} autoFocus={f.key === fields[0].key}
            onKeyDown={e => { if (e.key === 'Enter') onSave(); if (e.key === 'Escape') onCancel() }} />
        ))}
      </div>
      <button onClick={onSave} className="p-1.5 rounded-lg" style={{ color: '#16A34A' }}><Check size={14} /></button>
      <button onClick={onCancel} className="p-1.5 rounded-lg" style={{ color: T.text3 }}><X size={13} /></button>
    </div>
  )
}

// ─── Section card ──────────────────────────────────────────────────────────────

function SectionCard({ icon, title, count, children }: { icon: React.ReactNode; title: string; count: number; children: React.ReactNode }) {
  const T = useT()
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.card, border: `1px solid ${T.cardBorder}`, boxShadow: T.shadow }}>
      <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: `1px solid ${T.divider}`, background: T.thead }}>
        <span style={{ color: '#2563EB' }}>{icon}</span>
        <span className="text-sm font-bold" style={{ color: T.text1 }}>{title}</span>
        <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: T.inputBg, color: T.text3 }}>{count}</span>
      </div>
      {children}
    </div>
  )
}

// ─── Médicos tab ──────────────────────────────────────────────────────────────

function MedicosTab() {
  const [items, setItems] = useState<Medico[]>([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState(''); const [esp, setEsp] = useState(''); const [crm, setCrm] = useState('')

  const load = useCallback(async () => {
    try { setItems(await getMedicos()) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!nome.trim()) return
    try {
      if (editId) { await updateMedico(editId, { nome, especialidade: esp, crm }); toast.success('Médico atualizado') }
      else { await createMedico(nome, esp, crm); toast.success('Médico cadastrado') }
      reset(); load()
    } catch { toast.error('Erro ao salvar') }
  }

  async function del(id: string, n: string) {
    if (!confirm(`Remover ${n}?`)) return
    try { await deleteMedico(id); toast.success('Removido'); load() } catch { toast.error('Erro ao remover') }
  }

  function startEdit(m: Medico) { setEditId(m.id); setNome(m.nome); setEsp(m.especialidade || ''); setCrm(m.crm || ''); setAdding(true) }
  function reset() { setAdding(false); setEditId(null); setNome(''); setEsp(''); setCrm('') }

  return (
    <SectionCard icon={<Stethoscope size={16} />} title="Médicos" count={items.length}>
      {items.map(m => (
        <InlineRow key={m.id} label={m.nome} sub={[m.especialidade, m.crm].filter(Boolean).join(' · ')}
          onEdit={() => startEdit(m)} onDelete={() => del(m.id, m.nome)} />
      ))}
      {adding && (
        <AddRow
          fields={[
            { key: 'nome', placeholder: 'NOME DO MÉDICO', value: nome, onChange: setNome },
            { key: 'esp',  placeholder: 'Especialidade',  value: esp,  onChange: setEsp  },
            { key: 'crm',  placeholder: 'CRM',            value: crm,  onChange: setCrm  },
          ]}
          onSave={save} onCancel={reset}
        />
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: '#2563EB' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Plus size={14} /> Adicionar médico
        </button>
      )}
    </SectionCard>
  )
}

// ─── Hospitais tab ────────────────────────────────────────────────────────────

const HOSP_EMPTY: Omit<Hospital, 'id' | 'ativo' | 'createdAt'> = {
  nome: '', cidade: '', antecedenciaMinHoras: undefined, horarioLimiteRecebimento: '',
  recebeSabado: true, recebeDomingo: false, recebeFeriado: false,
  localEntrega: '', necessitaProtocolo: false, observacoesLogisticas: '',
}

function HospitaisTab() {
  const T = useT()
  const [items, setItems] = useState<Hospital[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<typeof HOSP_EMPTY>(HOSP_EMPTY)

  const load = useCallback(async () => {
    try { setItems(await getHospitais()) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  function openNew() { setEditId(null); setForm(HOSP_EMPTY); setShowModal(true) }
  function openEdit(h: Hospital) {
    setEditId(h.id)
    setForm({
      nome: h.nome, cidade: h.cidade || '',
      antecedenciaMinHoras: h.antecedenciaMinHoras,
      horarioLimiteRecebimento: h.horarioLimiteRecebimento || '',
      recebeSabado: h.recebeSabado ?? true,
      recebeDomingo: h.recebeDomingo ?? false,
      recebeFeriado: h.recebeFeriado ?? false,
      localEntrega: h.localEntrega || '',
      necessitaProtocolo: h.necessitaProtocolo ?? false,
      observacoesLogisticas: h.observacoesLogisticas || '',
    })
    setShowModal(true)
  }

  async function save() {
    if (!form.nome.trim()) { toast.error('Nome obrigatório'); return }
    try {
      if (editId) { await updateHospital(editId, form); toast.success('Hospital atualizado') }
      else { await createHospital(form); toast.success('Hospital cadastrado') }
      setShowModal(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  async function del(id: string, n: string) {
    if (!confirm(`Remover ${n}?`)) return
    try { await deleteHospital(id); toast.success('Removido'); load() } catch { toast.error('Erro ao remover') }
  }

  const set = <K extends keyof typeof HOSP_EMPTY>(k: K, v: typeof HOSP_EMPTY[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-xl rounded-2xl p-6 space-y-4 overflow-y-auto max-h-[90vh]"
            style={{ background: T.card, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: T.text1 }}>
                {editId ? 'Editar' : 'Novo'} Hospital
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: T.text3 }}><X size={18} /></button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="label">Nome *</label>
                <input className="input" value={form.nome} onChange={e => set('nome', e.target.value.toUpperCase())} placeholder="NOME DO HOSPITAL" />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input className="input" value={form.cidade} onChange={e => set('cidade', e.target.value)} placeholder="Cidade" />
              </div>
              <div>
                <label className="label">Local de Entrega</label>
                <input className="input" value={form.localEntrega} onChange={e => set('localEntrega', e.target.value)} placeholder="Ex: Recepção CC" />
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${T.divider}` }} className="pt-3">
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: T.text3 }}>Logística</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Antecedência mínima (horas)</label>
                  <input className="input" type="number" min={0} value={form.antecedenciaMinHoras ?? ''} onChange={e => set('antecedenciaMinHoras', e.target.value ? Number(e.target.value) : undefined)} placeholder="Ex: 48" />
                </div>
                <div>
                  <label className="label">Horário limite de recebimento</label>
                  <input className="input" type="time" value={form.horarioLimiteRecebimento} onChange={e => set('horarioLimiteRecebimento', e.target.value)} />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 mt-3">
                {([['recebeSabado', 'Recebe sábado'], ['recebeDomingo', 'Recebe domingo'], ['recebeFeriado', 'Recebe feriado'], ['necessitaProtocolo', 'Necessita protocolo']] as const).map(([k, lbl]) => (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: T.text2 }}>
                    <input type="checkbox" className="w-4 h-4 rounded" checked={!!form[k]} onChange={e => set(k, e.target.checked)} />
                    {lbl}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <label className="label">Observações logísticas</label>
                <textarea className="input resize-none" rows={2} value={form.observacoesLogisticas} onChange={e => set('observacoesLogisticas', e.target.value)} placeholder="Instruções especiais de entrega..." />
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={save} className="btn-primary ml-auto">
                <Check size={14} /> {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard icon={<Building2 size={16} />} title="Hospitais" count={items.length}>
        {items.map(h => {
          const logSub: string[] = []
          if (h.cidade) logSub.push(h.cidade)
          if (h.antecedenciaMinHoras) logSub.push(`${h.antecedenciaMinHoras}h antecedência`)
          return (
            <InlineRow key={h.id} label={h.nome} sub={logSub.join(' · ')}
              onEdit={() => openEdit(h)} onDelete={() => del(h.id, h.nome)} />
          )
        })}
        <button onClick={openNew} className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: '#2563EB' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Plus size={14} /> Adicionar hospital
        </button>
      </SectionCard>
    </>
  )
}

// ─── Convênios tab ────────────────────────────────────────────────────────────

function ConveniosTab() {
  const [items, setItems] = useState<Convenio[]>([])
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [nome, setNome] = useState('')

  const load = useCallback(async () => {
    try { setItems(await getConvenios()) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  async function save() {
    if (!nome.trim()) return
    try {
      if (editId) { await updateConvenio(editId, { nome }); toast.success('Convênio atualizado') }
      else { await createConvenio(nome); toast.success('Convênio cadastrado') }
      reset(); load()
    } catch { toast.error('Erro ao salvar') }
  }

  async function del(id: string, n: string) {
    if (!confirm(`Remover ${n}?`)) return
    try { await deleteConvenio(id); toast.success('Removido'); load() } catch { toast.error('Erro ao remover') }
  }

  function startEdit(c: Convenio) { setEditId(c.id); setNome(c.nome); setAdding(true) }
  function reset() { setAdding(false); setEditId(null); setNome('') }

  return (
    <SectionCard icon={<ShieldCheck size={16} />} title="Convênios" count={items.length}>
      {items.map(c => (
        <InlineRow key={c.id} label={c.nome}
          onEdit={() => startEdit(c)} onDelete={() => del(c.id, c.nome)} />
      ))}
      {adding && (
        <AddRow
          fields={[{ key: 'nome', placeholder: 'NOME DO CONVÊNIO', value: nome, onChange: setNome }]}
          onSave={save} onCancel={reset}
        />
      )}
      {!adding && (
        <button onClick={() => setAdding(true)} className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: '#2563EB' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Plus size={14} /> Adicionar convênio
        </button>
      )}
    </SectionCard>
  )
}

// ─── Procedimentos tab ────────────────────────────────────────────────────────

function ProcedimentosTab() {
  const [items, setItems]         = useState<Procedimento[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editId, setEditId]       = useState<string | null>(null)
  const [nome, setNome]           = useState('')
  // kit items managed inside the modal
  const [kitItems, setKitItems]   = useState<KitItem[]>([])
  const [kitInput, setKitInput]   = useState('')
  const T = useT()

  const load = useCallback(async () => {
    try { setItems(await getProcedimentos()) } catch {}
  }, [])
  useEffect(() => { load() }, [load])

  async function openNew() {
    setEditId(null); setNome(''); setKitItems([]); setKitInput(''); setShowModal(true)
  }

  async function openEdit(p: Procedimento) {
    setEditId(p.id); setNome(p.nome); setKitInput('')
    try { setKitItems(await getKitItems(p.id)) } catch { setKitItems([]) }
    setShowModal(true)
  }

  async function addKitItem() {
    const v = kitInput.trim().toUpperCase()
    if (!v) return
    if (editId) {
      try {
        const item = await createKitItem(editId, v, kitItems.length)
        setKitItems(prev => [...prev, item])
      } catch { toast.error('Erro ao adicionar item') }
    } else {
      // before procedure exists, store locally
      setKitItems(prev => [...prev, { id: `tmp_${Date.now()}`, procedimentoId: '', nome: v, ordem: prev.length, ativo: true }])
    }
    setKitInput('')
  }

  async function removeKitItem(id: string) {
    if (id.startsWith('tmp_')) { setKitItems(prev => prev.filter(i => i.id !== id)); return }
    try { await deleteKitItem(id); setKitItems(prev => prev.filter(i => i.id !== id)) } catch { toast.error('Erro') }
  }

  async function save() {
    if (!nome.trim()) { toast.error('Nome obrigatório'); return }
    try {
      if (editId) {
        await updateProcedimento(editId, { nome })
        toast.success('Procedimento atualizado')
      } else {
        const proc = await createProcedimento(nome, '', '')
        // save pending kit items
        for (let i = 0; i < kitItems.length; i++) {
          await createKitItem(proc.id, kitItems[i].nome, i)
        }
        toast.success('Procedimento cadastrado')
      }
      setShowModal(false); load()
    } catch { toast.error('Erro ao salvar') }
  }

  async function del(id: string, n: string) {
    if (!confirm(`Remover "${n}" e todos os seus itens de kit?`)) return
    try { await deleteProcedimento(id); toast.success('Removido'); load() } catch { toast.error('Erro ao remover') }
  }

  const inp: React.CSSProperties = {
    background: T.inputBg, border: `1px solid ${T.cardBorder}`,
    color: T.text1, borderRadius: 8, padding: '6px 10px', fontSize: 13, outline: 'none', flex: 1,
  }

  return (
    <>
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md rounded-2xl p-5 space-y-4"
            style={{ background: T.card, boxShadow: '0 20px 60px rgba(0,0,0,0.3)', maxHeight: '90vh', overflowY: 'auto' }}>

            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base" style={{ color: T.text1 }}>
                {editId ? 'Editar' : 'Novo'} Procedimento
              </h3>
              <button onClick={() => setShowModal(false)} style={{ color: T.text3 }}><X size={18} /></button>
            </div>

            {/* Nome */}
            <div>
              <label className="label">Nome do procedimento *</label>
              <input className="input" value={nome}
                onChange={e => setNome(e.target.value.toUpperCase())}
                placeholder="NOME DO PROCEDIMENTO"
                onKeyDown={e => e.key === 'Enter' && save()} />
            </div>

            {/* Kit items */}
            <div>
              <p className="label mb-2">Itens do kit</p>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.cardBorder}` }}>
                {kitItems.length === 0 && (
                  <p className="px-3 py-2 text-xs" style={{ color: T.text3 }}>Nenhum item adicionado</p>
                )}
                {kitItems.map((item, idx) => (
                  <div key={item.id} className="flex items-center gap-2 px-3 py-2"
                    style={{ borderBottom: idx < kitItems.length - 1 ? `1px solid ${T.divider}` : undefined }}>
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#2563EB' }} />
                    <span className="text-sm flex-1" style={{ color: T.text1 }}>{item.nome}</span>
                    <button onClick={() => removeKitItem(item.id)} className="p-0.5 rounded" style={{ color: T.text3 }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                      onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
                      <X size={12} />
                    </button>
                  </div>
                ))}
                {/* Add item row */}
                <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: kitItems.length > 0 ? `1px solid ${T.divider}` : undefined }}>
                  <input value={kitInput} onChange={e => setKitInput(e.target.value)}
                    placeholder="Adicionar item ao kit..."
                    style={inp}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKitItem() } }} />
                  <button onClick={addKitItem} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: '#16A34A' }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={save} className="btn-primary ml-auto">
                <Check size={14} /> {editId ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SectionCard icon={<ClipboardList size={16} />} title="Procedimentos e Kits" count={items.length}>
        {items.map(p => (
          <div key={p.id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderBottom: `1px solid ${T.divider}` }}>
            <Package2 size={13} style={{ color: '#2563EB', flexShrink: 0 }} />
            <span className="text-sm font-medium flex-1 truncate" style={{ color: T.text1 }}>{p.nome}</span>
            <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg" style={{ color: T.text3 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#2563EB')}
              onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
              <Edit2 size={13} />
            </button>
            <button onClick={() => del(p.id, p.nome)} className="p-1.5 rounded-lg" style={{ color: T.text3 }}
              onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
              onMouseLeave={e => (e.currentTarget.style.color = T.text3)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        <button onClick={openNew} className="flex items-center gap-2 w-full px-4 py-3 text-sm font-medium transition-colors"
          style={{ color: '#2563EB' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.05)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <Plus size={14} /> Adicionar procedimento
        </button>
      </SectionCard>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CadastrosPage() {
  const [tab, setTab] = useState<Tab>('procedimentos')
  const [showSQL, setShowSQL] = useState(false)
  const T = useT()

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'procedimentos', label: 'Procedimentos',  icon: <ClipboardList size={14} /> },
    { id: 'medicos',       label: 'Médicos',        icon: <Stethoscope   size={14} /> },
    { id: 'hospitais',     label: 'Hospitais',      icon: <Building2     size={14} /> },
    { id: 'convenios',     label: 'Convênios',      icon: <ShieldCheck   size={14} /> },
  ]

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold" style={{ color: T.text1 }}>Cadastros</h2>
          <p className="text-xs mt-0.5" style={{ color: T.text3 }}>
            Gerencie médicos, hospitais, convênios e kits de procedimentos
          </p>
        </div>
        <button
          onClick={() => setShowSQL(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309', border: '1px solid rgba(245,158,11,0.2)' }}>
          <AlertCircle size={12} /> SQL Setup
        </button>
      </div>

      {showSQL && (
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.05)' }}>
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-sm font-semibold" style={{ color: '#92400E' }}>Configuração do Banco de Dados</p>
            <button onClick={() => { navigator.clipboard.writeText(SQL); toast.success('SQL copiado!') }}
              className="text-xs font-medium px-2.5 py-1 rounded-lg" style={{ background: 'rgba(245,158,11,0.15)', color: '#92400E' }}>
              Copiar SQL
            </button>
          </div>
          <pre className="px-4 py-3 text-xs overflow-x-auto" style={{ color: '#92400E', lineHeight: 1.6, maxHeight: 300 }}>
            {SQL}
          </pre>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: T.inputBg }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 flex-1 justify-center px-2 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={tab === t.id
              ? { background: T.card, color: '#007AFF', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
              : { color: T.text3 }}>
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'medicos'       && <MedicosTab />}
      {tab === 'hospitais'     && <HospitaisTab />}
      {tab === 'convenios'     && <ConveniosTab />}
      {tab === 'procedimentos' && <ProcedimentosTab />}
    </div>
  )
}
