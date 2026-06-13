import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import {
  Plus, Trash2, Send, AlertTriangle,
  User, Stethoscope, Building2, CalendarDays, Clock, ShieldCheck,
  Package, FileText, ChevronLeft, Zap, MessageCircle, Mail, X, CheckCircle2,
  Paperclip,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getRequisitionById, createRequisition, updateRequisition } from '../../utils/storage'
import { syncRequisitionToAgenda } from '../../utils/agenda-storage'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate } from '../../utils/helpers'
import { shareWhatsApp, shareEmail } from '../../utils/share'
import { loadSettings } from '../../utils/settings-storage'
import type { Requisition, OPMEItem } from '../../types'
import AutocompleteInput, { type AutocompleteOption } from '../../components/AutocompleteInput'
import FileUploadArea, { type PendingFile } from '../../components/FileUploadArea'
import {
  getMedicos, createMedico,
  getHospitais, createHospital,
  getConvenios, createConvenio,
  getProcedimentos, createProcedimento,
  getInstrumentadores, createInstrumentador,
  getKitItems, uploadAnexo,
  type Medico, type Hospital, type Convenio, type Procedimento, type KitItem, type Instrumentador,
} from '../../utils/cadastros-storage'

type FormValues = Omit<Requisition, 'id'|'numero'|'status'|'datasolicitacao'|'solicitanteId'|'solicitanteNome'|'anexos'|'auditoria'|'createdAt'|'updatedAt'>

const today = new Date().toISOString().split('T')[0]

function toUpper(e: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>) {
  const el = e.currentTarget
  const pos = el.selectionStart
  el.value = el.value.toUpperCase()
  el.setSelectionRange(pos, pos)
}

function toOpts(items: { id: string; nome: string; [k: string]: unknown }[], subKey?: string): AutocompleteOption[] {
  return items.map(i => ({ id: i.id, nome: i.nome, sub: subKey ? (i[subKey] as string | undefined) : undefined }))
}

export default function RequisitionForm() {
  const navigate   = useNavigate()
  const { id }     = useParams()
  const { user }   = useAuth()
  const isEdit     = !!id
  const [saving, setSaving]         = useState(false)
  const [summaryData, setSummaryData] = useState<FormValues | null>(null)
  const [savedReq, setSavedReq]     = useState<Requisition | null>(null)

  // Cadastros
  const [medicos,          setMedicos]          = useState<Medico[]>([])
  const [hospitais,        setHospitais]        = useState<Hospital[]>([])
  const [convenios,        setConvenios]        = useState<Convenio[]>([])
  const [procedimentos,    setProcedimentos]    = useState<Procedimento[]>([])
  const [instrumentadores, setInstrumentadores] = useState<Instrumentador[]>([])
  const [kitItems,         setKitItems]         = useState<KitItem[]>([])
  const [selectedProcId,   setSelectedProcId]   = useState<string | null>(null)

  // Files
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])

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
  const isEmergency   = tipoCirurgia === 'emergencia'

  // Load cadastros on mount
  useEffect(() => {
    Promise.allSettled([
      getMedicos().then(setMedicos).catch(() => {}),
      getHospitais().then(setHospitais).catch(() => {}),
      getConvenios().then(setConvenios).catch(() => {}),
      getProcedimentos().then(setProcedimentos).catch(() => {}),
      getInstrumentadores().then(setInstrumentadores).catch(() => {}),
    ])
  }, [])

  useEffect(() => {
    if (isEdit && id) {
      getRequisitionById(id).then(req => {
        if (req) {
          const { id: _id, numero: _n, status: _s, datasolicitacao: _d, solicitanteId: _si,
            solicitanteNome: _sn, anexos: _a, auditoria: _au, createdAt: _c, updatedAt: _u, ...rest } = req
          reset(rest)
        }
      })
    }
  }, [id, isEdit, reset])

  async function handleProcedimentoSelect(opt: AutocompleteOption) {
    if (!opt.id) { setKitItems([]); setSelectedProcId(null); return }
    setSelectedProcId(opt.id)
    try {
      const items = await getKitItems(opt.id)
      setKitItems(items)
      // Auto-populate materiais — skip items already in the list
      let added = 0
      for (const item of items) {
        const exists = fields.some(f => f.descricao?.toLowerCase() === item.nome.toLowerCase())
        if (!exists) {
          append({ id: Math.random().toString(36).substr(2,9), codigo:'', descricao: item.nome, fabricante:'', quantidade:1, unidade:'UN', observacao:'' } as OPMEItem)
          added++
        }
      }
      if (added > 0) toast.success(`${added} ${added === 1 ? 'material do kit adicionado' : 'materiais do kit adicionados'} automaticamente`)
      else if (items.length > 0) toast(`Materiais já estão na lista`, { icon: 'ℹ️' })
    } catch {
      setKitItems([])
    }
  }

  function addMaterial() {
    append({ id: Math.random().toString(36).substr(2,9), codigo:'', descricao:'', fabricante:'', quantidade:1, unidade:'UN', observacao:'' } as OPMEItem)
  }

  async function onSubmit(data: FormValues) {
    if (!user) return
    setSaving(true)
    setSummaryData(null)
    try {
      let saved: Requisition | null = null
      if (isEdit && id) {
        await updateRequisition(id, data, user, 'Envio')
        saved = await updateRequisition(id, { status: 'enviada' } as Partial<Requisition>, user, 'Status: Enviada')
        toast.success('Agendamento enviado!')
      } else {
        saved = await createRequisition({ ...data, status: 'enviada' }, user)
        toast.success('Agendamento enviado!')
      }

      if (saved) {
        await syncRequisitionToAgenda(saved)

        // Upload pending files
        if (pendingFiles.length > 0) {
          const attachments = []
          let uploadErrors = 0
          for (const pf of pendingFiles) {
            try {
              const result = await uploadAnexo(saved.id, pf.file)
              attachments.push({
                id: Math.random().toString(36).substr(2,9),
                nome: result.nome,
                tipo: result.tipo,
                tamanho: result.tamanho,
                url: result.url,
                uploadedAt: new Date().toISOString(),
                uploadedBy: user.nome,
              })
            } catch (e) {
              uploadErrors++
              console.error('Upload failed for', pf.file.name, e)
            }
          }
          if (attachments.length > 0) {
            await updateRequisition(saved.id, { anexos: [...(saved.anexos || []), ...attachments] } as Partial<Requisition>, user, 'Anexos adicionados')
          }
          if (uploadErrors > 0) {
            toast.error(`${uploadErrors} ${uploadErrors === 1 ? 'arquivo não foi enviado' : 'arquivos não foram enviados'}. Verifique as permissões do Storage no Supabase.`)
          }
        }

        setSavedReq(saved)
        return
      }

      navigate(`/requisicoes/${saved?.id || id}`)
    } finally {
      setSaving(false)
    }
  }

  function handleSendClick() {
    handleSubmit(data => setSummaryData(data))()
  }

  return (
    <div className="max-w-lg mx-auto pb-36 sm:pb-6">

      {savedReq && (
        <SuccessModal
          req={savedReq}
          onShare={async () => {
            if (savedReq.tipoCirurgia === 'emergencia') await shareWhatsApp(savedReq)
            else await shareEmail(savedReq)
          }}
          onClose={() => navigate(`/requisicoes/${savedReq.id}`)}
        />
      )}

      {!savedReq && summaryData && (
        <SummaryModal
          data={summaryData}
          isEmergency={isEmergency}
          onConfirm={() => onSubmit(summaryData)}
          onCancel={() => setSummaryData(null)}
          saving={saving}
          fileCount={pendingFiles.length}
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

        {/* Paciente */}
        <MobileField icon={<User className="w-4 h-4" />} label="Paciente">
          <input className="mobile-input uppercase" {...register('pacienteNome')} onInput={toUpper}
            placeholder="Nome do paciente" />
        </MobileField>

        {/* Médico — autocomplete */}
        <MobileField icon={<Stethoscope className="w-4 h-4" />} label="Médico" required error={errors.medicoNome?.message}>
          <AutocompleteInput
            value={watch('medicoNome') || ''}
            onChange={v => setValue('medicoNome', v)}
            options={toOpts(medicos, 'especialidade')}
            placeholder="DR(A). NOME DO MÉDICO"
            allowCreate
            onCreateNew={async nome => {
              try {
                const m = await createMedico(nome)
                setMedicos(prev => [...prev, m].sort((a, b) => a.nome.localeCompare(b.nome)))
                toast.success('Médico cadastrado')
                return { id: m.id, nome: m.nome }
              } catch { toast.error('Erro ao cadastrar médico'); return null }
            }}
          />
          <input type="hidden" {...register('medicoNome', { required: 'Informe o médico' })} />
        </MobileField>

        {/* Procedimento — autocomplete + kit */}
        <MobileField icon={<Stethoscope className="w-4 h-4" />} label="Cirurgia / Procedimento" required error={errors.cirurgiaProcedimento?.message}>
          <AutocompleteInput
            value={watch('cirurgiaProcedimento') || ''}
            onChange={v => setValue('cirurgiaProcedimento', v)}
            onSelect={async opt => {
              setValue('cirurgiaProcedimento', opt.nome)
              await handleProcedimentoSelect(opt)
            }}
            options={toOpts(procedimentos)}
            placeholder="Ex: ARTROPLASTIA DE JOELHO"
            allowCreate
            onCreateNew={async nome => {
              try {
                const p = await createProcedimento(nome)
                setProcedimentos(prev => [...prev, p].sort((a, b) => a.nome.localeCompare(b.nome)))
                toast.success('Procedimento cadastrado')
                return { id: p.id, nome: p.nome }
              } catch { toast.error('Erro ao cadastrar procedimento'); return null }
            }}
          />
          <input type="hidden" {...register('cirurgiaProcedimento', { required: 'Informe o procedimento' })} />
        </MobileField>

        {/* Kit info badge — shown when procedimento has a kit */}
        {kitItems.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary-50 border border-primary-100">
            <span className="text-primary-500 text-xs">✓</span>
            <p className="text-xs text-primary-700 font-medium">
              Kit padrão aplicado: {kitItems.length} {kitItems.length === 1 ? 'material' : 'materiais'} adicionados — edite à vontade abaixo
            </p>
          </div>
        )}

        {/* Convênio — autocomplete */}
        <MobileField icon={<ShieldCheck className="w-4 h-4" />} label="Convênio">
          <AutocompleteInput
            value={watch('cirurgiaConvenio') || ''}
            onChange={v => setValue('cirurgiaConvenio', v)}
            options={toOpts(convenios)}
            placeholder="UNIMED, BRADESCO, PARTICULAR..."
            allowCreate
            onCreateNew={async nome => {
              try {
                const c = await createConvenio(nome)
                setConvenios(prev => [...prev, c].sort((a, b) => a.nome.localeCompare(b.nome)))
                toast.success('Convênio cadastrado')
                return { id: c.id, nome: c.nome }
              } catch { toast.error('Erro ao cadastrar convênio'); return null }
            }}
          />
        </MobileField>

        {/* Data + Horário */}
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

        {/* Hospital — autocomplete */}
        <MobileField icon={<Building2 className="w-4 h-4" />} label="Hospital" required error={errors.hospitalNome?.message}>
          <AutocompleteInput
            value={watch('hospitalNome') || ''}
            onChange={v => setValue('hospitalNome', v)}
            options={toOpts(hospitais, 'cidade')}
            placeholder="NOME DO HOSPITAL"
            allowCreate
            onCreateNew={async nome => {
              try {
                const h = await createHospital({ nome })
                setHospitais(prev => [...prev, h].sort((a, b) => a.nome.localeCompare(b.nome)))
                toast.success('Hospital cadastrado')
                return { id: h.id, nome: h.nome }
              } catch { toast.error('Erro ao cadastrar hospital'); return null }
            }}
          />
          <input type="hidden" {...register('hospitalNome', { required: 'Informe o hospital' })} />
        </MobileField>

        {/* Instrumentador */}
        <MobileField icon={<User className="w-4 h-4" />} label="Instrumentador">
          <AutocompleteInput
            value={watch('instrumentadorNome') || ''}
            onChange={v => setValue('instrumentadorNome', v)}
            onSelect={opt => {
              setValue('instrumentadorNome', opt.nome)
              const inst = instrumentadores.find(i => i.id === opt.id)
              if (inst?.telefone) setValue('instrumentadorTelefone', inst.telefone)
            }}
            options={instrumentadores.map(i => ({ id: i.id, nome: i.nome, sub: [i.especialidade, i.cidade].filter(Boolean).join(' · ') }))}
            placeholder="NOME DO INSTRUMENTADOR"
            allowCreate
            onCreateNew={async nome => {
              try {
                const inst = await createInstrumentador({ nome })
                setInstrumentadores(prev => [...prev, inst].sort((a, b) => a.nome.localeCompare(b.nome)))
                toast.success('Instrumentador cadastrado')
                return { id: inst.id, nome: inst.nome }
              } catch { toast.error('Erro ao cadastrar instrumentador'); return null }
            }}
          />
        </MobileField>

        {/* Materiais OPME */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-slate-700">Material OPME</span>
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
                {fields.map((field, idx) => {
                  const qty = watch(`materiais.${idx}.quantidade`) || 1
                  return (
                    <div key={field.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <input className="mobile-input uppercase text-sm"
                          {...register(`materiais.${idx}.descricao`)}
                          onInput={toUpper}
                          placeholder={`Material ${idx + 1}`} />
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button type="button"
                          onClick={() => setValue(`materiais.${idx}.quantidade`, Math.max(1, Number(qty) - 1))}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-700 transition-colors text-lg font-bold leading-none">
                          −
                        </button>
                        <span className="w-8 text-center font-bold text-sm text-slate-800 tabular-nums">{qty}</span>
                        <button type="button"
                          onClick={() => setValue(`materiais.${idx}.quantidade`, Number(qty) + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-primary-100 hover:text-primary-700 transition-colors text-lg font-bold leading-none">
                          +
                        </button>
                      </div>
                      <button type="button" onClick={() => remove(idx)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={addMaterial}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-primary-600 text-xs font-semibold hover:bg-primary-50 transition-colors border-t border-slate-100">
                <Plus className="w-3.5 h-3.5" /> Adicionar material
              </button>
            </div>
          )}
        </div>

        {/* Observações */}
        <MobileField icon={<FileText className="w-4 h-4" />} label="Observações">
          <textarea className="mobile-input min-h-[80px] resize-none uppercase"
            {...register('observacoesGerais')} onInput={toUpper}
            placeholder="INSTRUÇÕES DE ENTREGA, INFORMAÇÕES ESPECIAIS, MATERIAL CONSIGNADO..." />
        </MobileField>

        {/* Anexos */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100">
            <Paperclip className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-semibold text-slate-700">Anexos</span>
            {pendingFiles.length > 0 && (
              <span className="badge bg-primary-50 text-primary-600 text-xs">{pendingFiles.length}</span>
            )}
          </div>
          <div className="px-4 py-3">
            <FileUploadArea files={pendingFiles} onChange={setPendingFiles} />
          </div>
        </div>

      </form>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 sm:static sm:bottom-auto sm:left-auto sm:right-auto
                      backdrop-blur-sm sm:backdrop-blur-none
                      border-t border-slate-200/80 sm:border-0
                      p-4 sm:p-0 sm:pt-4 z-20"
        style={{ background: 'rgba(255,255,255,0.95)' }}>
        <button
          type="button"
          onClick={handleSendClick}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50 text-white shadow-md"
          style={{ background: isEmergency ? '#DC2626' : '#2563EB' }}
        >
          <CalendarDays className="w-4 h-4" />
          {saving ? 'Salvando…' : 'Agendar'}
        </button>
      </div>
    </div>
  )
}

/* ── Success Modal ── */
function SuccessModal({ req, onShare, onClose }: { req: Requisition; onShare: () => void; onClose: () => void }) {
  const isEmergency = req.tipoCirurgia === 'emergencia'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex flex-col items-center pt-8 pb-4 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-800">Agendamento salvo!</h3>
          <p className="text-sm text-slate-500 mt-1">
            {req.pacienteNome && <><strong>{req.pacienteNome}</strong> · </>}
            {req.numero}
          </p>
        </div>
        <div className="px-6 pb-2">
          <div className={`rounded-2xl px-4 py-3 flex items-center gap-3 ${isEmergency ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isEmergency ? 'bg-green-500' : 'bg-blue-500'}`}>
              {isEmergency ? <MessageCircle className="w-5 h-5 text-white" /> : <Mail className="w-5 h-5 text-white" />}
            </div>
            <div>
              <p className={`text-sm font-bold ${isEmergency ? 'text-green-800' : 'text-blue-800'}`}>
                {isEmergency ? 'Emergência — avise agora!' : 'Envie a confirmação por e-mail'}
              </p>
              <p className={`text-xs ${isEmergency ? 'text-green-600' : 'text-blue-600'}`}>
                {isEmergency ? 'WhatsApp é mais rápido para emergências' : 'Notifique o hospital e médico'}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 pt-3 flex flex-col gap-2">
          <button onClick={() => { onShare(); onClose() }}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.97] transition-all"
            style={{ background: '#2563EB' }}>
            {isEmergency ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
            {isEmergency ? 'Enviar por WhatsApp' : 'Enviar por E-mail'}
          </button>
          <button onClick={onClose}
            className="w-full py-3 rounded-2xl text-sm font-medium transition-colors active:scale-[0.97]"
            style={{ background: 'rgba(0,0,0,0.05)', color: '#48484A' }}>
            Ver agendamento
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Summary Modal ── */
function SummaryModal({ data, isEmergency, onConfirm, onCancel, saving, fileCount }: {
  data: FormValues; isEmergency: boolean; onConfirm: () => void; onCancel: () => void; saving: boolean; fileCount: number
}) {
  const dataHora = data.cirurgiaData
    ? `${data.cirurgiaData.split('-').reverse().join('/')}${data.cirurgiaHorario ? ' às ' + data.cirurgiaHorario : ''}`
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className={`px-5 py-4 flex items-center justify-between ${isEmergency ? 'bg-red-50' : 'bg-primary-50'}`}>
          <div className="flex items-center gap-2.5">
            {isEmergency ? <AlertTriangle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-primary-600" />}
            <div>
              <p className={`font-bold text-sm ${isEmergency ? 'text-red-700' : 'text-primary-700'}`}>Confirmar Envio</p>
              <p className="text-xs text-slate-500">Confira os dados antes de enviar</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-black/5 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

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
          <SummaryRow label="Convênio"     value={data.cirurgiaConvenio} />
          {data.materiais?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Materiais ({data.materiais.length})</p>
              <div className="space-y-1">
                {data.materiais.map((m, i) => (
                  <p key={i} className="text-sm text-slate-700">• {m.quantidade}x {m.descricao || '—'}</p>
                ))}
              </div>
            </div>
          )}
          {data.observacoesGerais && <SummaryRow label="Observações" value={data.observacoesGerais} />}
          {fileCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
              <Paperclip className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-blue-700">{fileCount} {fileCount === 1 ? 'arquivo' : 'arquivos'} para upload</span>
            </div>
          )}
        </div>

        <div className={`mx-5 mb-3 rounded-2xl px-4 py-3 flex items-center gap-3 ${isEmergency ? 'bg-green-50 border border-green-200' : 'bg-blue-50 border border-blue-200'}`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isEmergency ? 'bg-green-500' : 'bg-blue-500'}`}>
            {isEmergency ? <MessageCircle className="w-5 h-5 text-white" /> : <Mail className="w-5 h-5 text-white" />}
          </div>
          <p className={`text-sm font-bold ${isEmergency ? 'text-green-800' : 'text-blue-800'}`}>
            {isEmergency ? 'Enviar por WhatsApp' : 'Enviar por E-mail'}
          </p>
        </div>

        <div className="px-5 pb-5 flex flex-col gap-2">
          <button onClick={onConfirm} disabled={saving}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.97]"
            style={{ background: '#2563EB' }}>
            {saving ? 'Salvando…' : isEmergency ? <><MessageCircle className="w-4 h-4" /> Salvar e Enviar por WhatsApp</> : <><Mail className="w-4 h-4" /> Salvar e Enviar por E-mail</>}
          </button>
          <button onClick={onCancel} className="w-full py-3 rounded-2xl text-sm font-medium transition-colors active:scale-[0.97]" style={{ background: 'rgba(0,0,0,0.05)', color: '#48484A' }}>
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

type FieldProps = { name: string; ref: React.Ref<HTMLInputElement>; onChange: React.ChangeEventHandler<HTMLInputElement>; onBlur: React.FocusEventHandler<HTMLInputElement> }

function DatePickerField({ label, required, error, min, fieldProps }: { label: string; required?: boolean; error?: string; min?: string; fieldProps: FieldProps }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [displayVal, setDisplayVal] = useState('')

  function formatDisplay(iso: string) {
    if (!iso) return ''
    const [y, m, d] = iso.split('-')
    const date = new Date(Number(y), Number(m) - 1, Number(d))
    return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(/\./g, '').replace(',', '')
  }

  return (
    <div className="relative rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: '#fff', border: error ? '1.5px solid #FF3B30' : '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onClick={() => inputRef.current?.showPicker?.()}>
      <div className="px-4 pt-3 pb-2.5">
        <div className="flex items-center gap-2 mb-1.5">
          <CalendarDays className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8E8E93' }}>
            {label}{required && <span style={{ color: '#FF3B30' }}> *</span>}
          </span>
        </div>
        {displayVal
          ? <p className="text-sm font-semibold leading-tight" style={{ color: '#1D1D1F' }}>{formatDisplay(displayVal)}</p>
          : <p className="text-sm" style={{ color: '#AEAEB2' }}>Toque para selecionar</p>}
      </div>
      <input type="date" name={fieldProps.name}
        ref={node => { (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node; if (typeof fieldProps.ref === 'function') fieldProps.ref(node) }}
        onChange={e => { setDisplayVal(e.target.value); fieldProps.onChange(e) }}
        onBlur={fieldProps.onBlur} min={min}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" style={{ fontSize: 16 }} />
      {error && <p className="px-4 pb-2 text-xs" style={{ color: '#FF3B30' }}>{error}</p>}
    </div>
  )
}

function TimePickerField({ label = 'Horário', fieldProps }: { label?: string; fieldProps: FieldProps }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [val, setVal] = useState('')
  return (
    <div className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.10)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
      onClick={() => inputRef.current?.showPicker?.()}>
      <div className="px-4 pt-3 pb-3">
        <div className="flex items-center gap-2 mb-1.5">
          <Clock className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#007AFF' }} />
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: '#8E8E93' }}>{label}</span>
        </div>
        <p className="text-sm font-semibold" style={{ color: val ? '#1D1D1F' : '#AEAEB2' }}>{val || '--:--'}</p>
      </div>
      <input type="time" name={fieldProps.name}
        ref={node => { (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node; if (typeof fieldProps.ref === 'function') fieldProps.ref(node) }}
        onChange={e => { setVal(e.target.value); fieldProps.onChange(e) }}
        onBlur={fieldProps.onBlur}
        className="absolute opacity-0 pointer-events-none" style={{ fontSize: 16 }} />
    </div>
  )
}

function MobileField({ icon, label, required, error, children }: { icon: React.ReactNode; label: string; required?: boolean; error?: string; children: React.ReactNode }) {
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
