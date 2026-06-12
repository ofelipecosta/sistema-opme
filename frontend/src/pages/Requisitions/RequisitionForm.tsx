import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, Trash2, Send, AlertTriangle,
  User, Stethoscope, Building2, CalendarDays, Clock, ShieldCheck,
  Package, FileText, ChevronLeft, Zap, MessageCircle, Mail, X, CheckCircle2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequisitionById, createRequisition, updateRequisition } from '../../utils/storage'
import { syncRequisitionToAgenda } from '../../utils/agenda-storage'
import { useAuth } from '../../contexts/AuthContext'
import { CONVENIO_OPTIONS, formatDate } from '../../utils/helpers'
import { shareWhatsApp, shareEmail } from '../../utils/share'
import { loadSettings } from '../../utils/settings-storage'
import { emailNovaRequisicao } from '../../utils/email-service'
import type { Requisition, OPMEItem } from '../../types'

type FormValues = Omit<Requisition, 'id'|'numero'|'status'|'datasolicitacao'|'solicitanteId'|'solicitanteNome'|'anexos'|'auditoria'|'createdAt'|'updatedAt'>

const today = new Date().toISOString().split('T')[0]

/* ── Uppercase handler for text inputs ── */
function toUpper(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const el = e.currentTarget
  const pos = el.selectionStart
  el.value = el.value.toUpperCase()
  el.setSelectionRange(pos, pos)
}

export default function RequisitionForm() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const { user }   = useAuth()
  const isEdit     = !!id
  const [saving, setSaving]     = useState(false)
  const [convenioOutros, setConvenioOutros] = useState('')
  const [summaryData, setSummaryData] = useState<FormValues | null>(null)
  const [shareIntent, setShareIntent] = useState<'default' | 'whatsapp' | 'email'>('default')

  const settings = loadSettings()

  const { register, control, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      tipoCirurgia:    'eletiva',
      materiais:       [],
      vendedorNome:    user?.nome     || '',
      vendedorEmail:   user?.email    || '',
      vendedorTelefone:user?.telefone || '',
    }
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'materiais' })
  const tipoCirurgia  = watch('tipoCirurgia')
  const convenioValue = watch('cirurgiaConvenio')
  const isEmergency   = tipoCirurgia === 'emergencia'
  const isOutros      = convenioValue === 'Outros'

  useEffect(() => {
    if (isEdit && id) {
      getRequisitionById(id).then(req => {
        if (req) {
          const { id: _id, numero: _n, status: _s, datasolicitacao: _d, solicitanteId: _si,
            solicitanteNome: _sn, anexos: _a, auditoria: _au, createdAt: _c, updatedAt: _u, ...rest } = req
          const inList = CONVENIO_OPTIONS.includes(rest.cirurgiaConvenio || '')
          if (!inList && rest.cirurgiaConvenio) {
            setConvenioOutros(rest.cirurgiaConvenio)
            rest.cirurgiaConvenio = 'Outros'
          }
          reset(rest)
        }
      })
    }
  }, [id, isEdit, reset])

  useEffect(() => { if (!isOutros) setConvenioOutros('') }, [isOutros])

  function addMaterial() {
    append({ id: Math.random().toString(36).substr(2,9), codigo:'', descricao:'', fabricante:'', quantidade:1, unidade:'UN', observacao:'' } as OPMEItem)
  }

  /* Called after summary confirmation */
  async function onSubmit(data: FormValues) {
    if (!user) return
    setSaving(true)
    setSummaryData(null)
    try {
      const finalData = {
        ...data,
        cirurgiaConvenio: isOutros && convenioOutros.trim() ? convenioOutros.trim() : data.cirurgiaConvenio,
      }

      let saved: Requisition | null = null
      if (isEdit && id) {
        await updateRequisition(id, finalData, user, 'Envio')
        saved = await updateRequisition(id, { status: 'enviada' } as Partial<Requisition>, user, 'Status: Enviada')
        toast.success('Agendamento enviado!')
      } else {
        saved = await createRequisition({ ...finalData, status: 'enviada' }, user)
        toast.success('Agendamento enviado!')
      }

      if (saved) {
        await syncRequisitionToAgenda(saved)
        /* Share based on intent or tipo */
        const intent = shareIntent
        setShareIntent('default')
        if (intent === 'whatsapp') {
          shareWhatsApp(saved)
        } else if (intent === 'email') {
          shareEmail(saved)
        } else if (saved.tipoCirurgia === 'emergencia') {
          if (settings.whatsapp.enabled) shareWhatsApp(saved)
        } else {
          if (settings.email.enabled) shareEmail(saved)
        }
        /* Automatic email notification */
        const destinos: string[] = []
        if (saved.vendedorEmail) destinos.push(saved.vendedorEmail)
        if (saved.solicitanteEmail) destinos.push(saved.solicitanteEmail as string)
        emailNovaRequisicao(saved, destinos)
      }

      navigate(`/requisicoes/${saved?.id || id}`)
    } finally {
      setSaving(false)
    }
  }

  function handleSendClick(intent: 'default' | 'whatsapp' | 'email' = 'default') {
    setShareIntent(intent)
    handleSubmit(data => setSummaryData(data))()
  }

  const sendChannel = isEmergency ? 'WhatsApp' : 'E-mail'

  return (
    <div className="max-w-lg mx-auto pb-36 sm:pb-6">

      {/* Summary modal */}
      {summaryData && (
        <SummaryModal
          data={summaryData}
          convenioOutros={isOutros ? convenioOutros : ''}
          isEmergency={isEmergency}
          channel={sendChannel}
          onConfirm={() => onSubmit(summaryData)}
          onCancel={() => setSummaryData(null)}
          saving={saving}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button type="button" onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors flex-shrink-0">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            {isEdit ? 'Editar Agendamento' : 'Nova Cirurgia'}
          </h2>
          <p className="text-xs text-slate-400">Preencha os dados da cirurgia</p>
        </div>
      </div>

      <form className="space-y-3">

        {/* Tipo toggle */}
        <div className={`rounded-2xl p-1 flex gap-1 ${isEmergency ? 'bg-red-50 border-2 border-red-200' : 'bg-slate-100'}`}>
          <button type="button" onClick={() => setValue('tipoCirurgia', 'eletiva')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isEmergency ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400'}`}>
            Eletiva
          </button>
          <button type="button" onClick={() => setValue('tipoCirurgia', 'emergencia')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${isEmergency ? 'bg-red-500 text-white shadow-sm' : 'text-slate-400'}`}>
            <Zap className="w-3.5 h-3.5" /> Emergência
          </button>
        </div>
        <input type="hidden" {...register('tipoCirurgia')} />

        <MobileField icon={<User className="w-4 h-4" />} label="Paciente">
          <input className="mobile-input uppercase" {...register('pacienteNome')} onInput={toUpper}
            placeholder="Nome do paciente" />
        </MobileField>

        <MobileField icon={<Stethoscope className="w-4 h-4" />} label="Cirurgia / Procedimento" required error={errors.cirurgiaProcedimento?.message}>
          <input className="mobile-input uppercase" {...register('cirurgiaProcedimento', { required: 'Informe o procedimento' })}
            onInput={toUpper} placeholder="Ex: ARTROPLASTIA, FRATURA DE FÊMUR..." />
        </MobileField>

        <MobileField icon={<ShieldCheck className="w-4 h-4" />} label="Convênio">
          <select className="mobile-input" {...register('cirurgiaConvenio')}>
            <option value="">Selecionar convênio</option>
            {CONVENIO_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {isOutros && (
            <input className="mobile-input mt-2 uppercase" value={convenioOutros}
              onChange={e => setConvenioOutros(e.target.value.toUpperCase())}
              placeholder="NOME DO CONVÊNIO..." autoFocus />
          )}
        </MobileField>

        <MobileField icon={<User className="w-4 h-4" />} label="Médico" required error={errors.medicoNome?.message}>
          <input className="mobile-input uppercase" {...register('medicoNome', { required: 'Informe o médico' })}
            onInput={toUpper} placeholder="DR(A). NOME DO MÉDICO" />
        </MobileField>

        <div className="grid grid-cols-2 gap-3">
          {(() => {
            const f = register('cirurgiaData', { required: 'Informe a data', validate: v => v >= today || 'Data não pode ser no passado' })
            return <DatePickerField label="Data" required error={errors.cirurgiaData?.message} min={today} fieldProps={f} />
          })()}
          {(() => {
            const f = register('cirurgiaHorario')
            return <TimePickerField label="Horário" fieldProps={f} />
          })()}
        </div>

        <MobileField icon={<Building2 className="w-4 h-4" />} label="Hospital" required error={errors.hospitalNome?.message}>
          <input className="mobile-input uppercase" {...register('hospitalNome', { required: 'Informe o hospital' })}
            onInput={toUpper} placeholder="NOME DO HOSPITAL" />
        </MobileField>

        {/* Materiais */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-slate-700">Material</span>
            {fields.length > 0 && (
              <span className="badge bg-primary-50 text-primary-600 text-xs">{fields.length}</span>
            )}
          </div>

          {fields.length === 0 ? (
            <button type="button" onClick={addMaterial}
              className="w-full py-7 text-slate-400 text-sm flex flex-col items-center gap-2 hover:bg-slate-50 transition-colors">
              <Plus className="w-6 h-6 text-slate-300" />
              Toque para adicionar material
            </button>
          ) : (
            <div>
              <div className="divide-y divide-slate-100">
                {fields.map((field, idx) => (
                  <div key={field.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <input className="mobile-input uppercase text-sm"
                        {...register(`materiais.${idx}.descricao`)}
                        onInput={toUpper}
                        placeholder={`Material ${idx + 1}`} />
                    </div>
                    <div className="w-16 flex-shrink-0">
                      <input className="mobile-input text-center font-bold text-sm" type="number" min="1"
                        placeholder="Qtd"
                        {...register(`materiais.${idx}.quantidade`, { valueAsNumber: true, min: 1 })} />
                    </div>
                    <button type="button" onClick={() => remove(idx)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addMaterial}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-primary-600 text-xs font-semibold hover:bg-primary-50 transition-colors border-t border-slate-100">
                <Plus className="w-3.5 h-3.5" /> Adicionar material
              </button>
            </div>
          )}
        </div>

        <MobileField icon={<FileText className="w-4 h-4" />} label="Observações">
          <textarea className="mobile-input min-h-[80px] resize-none uppercase"
            {...register('observacoesGerais')} onInput={toUpper}
            placeholder="INSTRUÇÕES DE ENTREGA, INFORMAÇÕES ESPECIAIS..." />
        </MobileField>

      </form>

      {/* ── Action bar ── */}
      <div className="fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto sm:left-auto sm:right-auto
                      backdrop-blur-sm sm:backdrop-blur-none
                      border-t border-slate-200/80 sm:border-0
                      p-4 sm:p-0 sm:pt-4 z-20"
        style={{ background: 'rgba(255,255,255,0.95)' }}>

        {/* Botão único contextual */}
        <button
          type="button"
          onClick={() => handleSendClick('default')}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50 text-white shadow-md ${
            isEmergency ? 'bg-green-500 hover:bg-green-600 shadow-green-200' : 'bg-blue-500 hover:bg-blue-600 shadow-blue-200'
          }`}
        >
          {isEmergency ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
          {saving ? 'Salvando…' : isEmergency ? 'Revisar e Enviar por WhatsApp' : 'Revisar e Enviar por E-mail'}
        </button>
      </div>
    </div>
  )
}

/* ── Summary Modal ── */
function SummaryModal({ data, convenioOutros, isEmergency, channel, onConfirm, onCancel, saving }: {
  data: FormValues
  convenioOutros: string
  isEmergency: boolean
  channel: string
  onConfirm: () => void
  onCancel: () => void
  saving: boolean
}) {
  const convenio = (data.cirurgiaConvenio === 'Outros' && convenioOutros) ? convenioOutros : data.cirurgiaConvenio
  const dataHora = data.cirurgiaData
    ? `${data.cirurgiaData.split('-').reverse().join('/')}${data.cirurgiaHorario ? ' às ' + data.cirurgiaHorario : ''}`
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        {/* Header */}
        <div className={`px-5 py-4 flex items-center justify-between ${isEmergency ? 'bg-red-50' : 'bg-primary-50'}`}>
          <div className="flex items-center gap-2.5">
            {isEmergency
              ? <AlertTriangle className="w-5 h-5 text-red-500" />
              : <CheckCircle2 className="w-5 h-5 text-primary-600" />}
            <div>
              <p className={`font-bold text-sm ${isEmergency ? 'text-red-700' : 'text-primary-700'}`}>
                Confirmar Envio
              </p>
              <p className="text-xs text-slate-500">Confira os dados antes de enviar</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {isEmergency && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <Zap className="w-4 h-4 text-red-500 flex-shrink-0" />
              <span className="text-xs font-bold text-red-700 uppercase tracking-wide">Cirurgia de Emergência</span>
            </div>
          )}

          <SummaryRow label="Paciente"     value={data.pacienteNome} />
          <SummaryRow label="Hospital"     value={data.hospitalNome} />
          <SummaryRow label="Médico"       value={data.medicoNome} />
          <SummaryRow label="Procedimento" value={data.cirurgiaProcedimento} />
          <SummaryRow label="Data / Hora"  value={dataHora} highlight />
          <SummaryRow label="Convênio"     value={convenio} />
          {data.materiais?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
                Materiais ({data.materiais.length})
              </p>
              <div className="space-y-1">
                {data.materiais.map((m, i) => (
                  <p key={i} className="text-sm text-slate-700">
                    • {m.quantidade}x {m.descricao || '—'}
                  </p>
                ))}
              </div>
            </div>
          )}
          {data.observacoesGerais && (
            <SummaryRow label="Observações" value={data.observacoesGerais} />
          )}
        </div>

        {/* Suggested send action */}
        <div className={`mx-5 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 ${
          isEmergency
            ? 'bg-green-50 border border-green-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isEmergency ? 'bg-green-500' : 'bg-blue-500'
          }`}>
            {isEmergency
              ? <MessageCircle className="w-5 h-5 text-white" />
              : <Mail className="w-5 h-5 text-white" />}
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${isEmergency ? 'text-green-800' : 'text-blue-800'}`}>
              {isEmergency ? 'Enviar por WhatsApp' : 'Enviar por E-mail'}
            </p>
            <p className={`text-xs ${isEmergency ? 'text-green-600' : 'text-blue-600'}`}>
              {isEmergency
                ? 'Emergência — WhatsApp é mais rápido'
                : 'Eletiva — envio formal por e-mail'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 flex flex-col gap-2">
          {/* Primary: save + send */}
          <button onClick={onConfirm} disabled={saving}
            className={`w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] ${
              isEmergency ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
            {saving
              ? 'Salvando…'
              : isEmergency
                ? <><MessageCircle className="w-4 h-4" /> Salvar e Enviar por WhatsApp</>
                : <><Mail className="w-4 h-4" /> Salvar e Enviar por E-mail</>}
          </button>
          {/* Secondary: back */}
          <button onClick={onCancel}
            className="w-full py-3 rounded-2xl bg-slate-100 text-slate-500 text-sm font-medium transition-colors hover:bg-slate-200">
            Voltar e Revisar
          </button>
        </div>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, highlight }: { label: string; value?: string; highlight?: boolean }) {
  if (!value) return null
  return (
    <div>
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className={`text-sm ${highlight ? 'font-bold text-primary-700' : 'text-slate-700'}`}>{value}</p>
    </div>
  )
}

type FieldProps = {
  name: string
  ref: React.Ref<HTMLInputElement>
  onChange: React.ChangeEventHandler<HTMLInputElement>
  onBlur: React.FocusEventHandler<HTMLInputElement>
}

/* ── DatePickerField ── */
function DatePickerField({ label, required, error, min, fieldProps }: {
  label: string; required?: boolean; error?: string; min?: string
  fieldProps: FieldProps
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayVal, setDisplayVal] = useState('')

  function formatDisplay(iso: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/\./g, '').replace(',', '')
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDisplayVal(e.target.value)
    fieldProps.onChange(e)
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: '#fff', border: error ? '1.5px solid #FF3B30' : '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onClick={() => inputRef.current?.showPicker?.()}
    >
      <div className="px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8E8E93' }}>
            {label}{required && <span style={{ color: '#FF3B30' }}> *</span>}
          </span>
        </div>
        {displayVal ? (
          <p className="text-sm font-semibold leading-tight" style={{ color: '#1D1D1F' }}>
            {formatDisplay(displayVal)}
          </p>
        ) : (
          <p className="text-sm" style={{ color: '#AEAEB2' }}>Toque para selecionar</p>
        )}
      </div>

      <input
        type="date"
        name={fieldProps.name}
        ref={(node) => {
          (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
          if (typeof fieldProps.ref === 'function') fieldProps.ref(node)
        }}
        onChange={handleChange}
        onBlur={fieldProps.onBlur}
        min={min}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        style={{ fontSize: 16 }}
      />

      {error && <p className="px-4 pb-2 text-xs" style={{ color: '#FF3B30' }}>{error}</p>}
    </div>
  )
}

/* ── TimePickerField ── */
function TimePickerField({ label = 'Horário', fieldProps }: {
  label?: string
  fieldProps: FieldProps
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [val, setVal] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value)
    fieldProps.onChange(e)
  }

  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onClick={() => inputRef.current?.showPicker?.()}
    >
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8E8E93' }}>{label}</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: val ? '#1D1D1F' : '#AEAEB2' }}>
          {val || '--:--'}
        </p>
      </div>

      <input
        type="time"
        name={fieldProps.name}
        ref={(node) => {
          (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node
          if (typeof fieldProps.ref === 'function') fieldProps.ref(node)
        }}
        onChange={handleChange}
        onBlur={fieldProps.onBlur}
        className="absolute opacity-0 pointer-events-none"
        style={{ fontSize: 16 }}
      />
    </div>
  )
}

function MobileField({ icon, label, required, error, children }: {
  icon: React.ReactNode; label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 pt-3 pb-1.5">
        <span className="text-primary-500 flex-shrink-0">{icon}</span>
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide leading-none">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      </div>
      <div className="px-4 pb-3">
        {children}
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
    </div>
  )
}
