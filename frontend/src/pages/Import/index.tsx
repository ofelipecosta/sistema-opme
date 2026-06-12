import { useState, useCallback, useRef, useEffect } from 'react'
import {
  Upload, FileSpreadsheet, CheckCircle2, AlertTriangle,
  Trash2, RefreshCw, Download, Table2, X, CalendarDays, ClipboardList,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../contexts/AuthContext'
import {
  upsertAgendaItems, clearAgenda, getAgenda,
  parseDate, parseTime, parseStatus, detectColumn,
} from '../../utils/agenda-storage'
import { agendaStatusLabel, agendaStatusBg } from '../../utils/agenda-helpers'
import type { AgendaItem } from '../../types/agenda'
import { formatDate } from '../../utils/helpers'
import { bulkInsertControleCirurgias } from '../../utils/controle-storage'
import type { ControleCirurgia, SegmentoCirurgia, SituacaoCirurgia, AcompanhamentoCirurgia } from '../../types/controle'
import { SEGMENTO_LABELS, SITUACAO_LABELS, ACOMPANHAMENTO_LABELS } from '../../types/controle'

// ─── helpers ──────────────────────────────────────────────────────────────────

type Step = 'upload' | 'map' | 'preview' | 'done'
type Mode = 'agenda' | 'controle'

const AGENDA_COLS = [
  { field: 'data',            label: 'Data',            required: true  },
  { field: 'horaCirurgia',    label: 'Hora',            required: false },
  { field: 'paciente',        label: 'Paciente',        required: true  },
  { field: 'hospital',        label: 'Hospital',        required: false },
  { field: 'convenio',        label: 'Convênio',        required: false },
  { field: 'medico',          label: 'Médico',          required: true  },
  { field: 'procedimento',    label: 'Procedimento',    required: false },
  { field: 'vendedor',        label: 'Vendedor',        required: false },
  { field: 'status',          label: 'Status',          required: false },
]

const CONTROLE_COLS = [
  { field: 'numero',          label: 'Nº',              required: false },
  { field: 'codigoV2',        label: 'Cód. V2',         required: false },
  { field: 'data',            label: 'Data',            required: true  },
  { field: 'cirurgia',        label: 'Cirurgia',        required: true  },
  { field: 'segmento',        label: 'Segmento',        required: true  },
  { field: 'pacienteNome',    label: 'Paciente',        required: true  },
  { field: 'convenio',        label: 'Convênio',        required: false },
  { field: 'hospital',        label: 'Hospital',        required: false },
  { field: 'medico',          label: 'Médico',          required: false },
  { field: 'vendedor',        label: 'Vendedor',        required: false },
  { field: 'situacao',        label: 'Situação',        required: false },
  { field: 'acompanhamento',  label: 'Acompanhamento',  required: false },
]

function detectControleColumn(header: string): string {
  const h = header.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (/^n[oº]$/.test(h) || h === 'numero')                   return 'numero'
  if (h.includes('cod') || h.includes('v2'))                 return 'codigoV2'
  if (h === 'data' || h.includes('data'))                    return 'data'
  if (h === 'cirurgia' || h.includes('procedimento') || h.includes('cirurgia')) return 'cirurgia'
  if (h === 'segmento')                                      return 'segmento'
  if (h.includes('nome') || h === 'paciente')                return 'pacienteNome'
  if (h.includes('convenio') || h.includes('plano'))        return 'convenio'
  if (h.includes('hospital'))                               return 'hospital'
  if (h.includes('medico') || h.includes('medic'))          return 'medico'
  if (h.includes('vendedor'))                               return 'vendedor'
  if (h.includes('situacao') || h.includes('situação'))     return 'situacao'
  if (h.includes('acompanhamento'))                         return 'acompanhamento'
  return 'skip'
}

function parseSegmento(v: string): SegmentoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('trauma'))    return 'trauma'
  if (s.includes('neuro'))     return 'neuro'
  if (s.includes('coluna'))    return 'coluna'
  return 'ortopedia'
}

function parseSituacao(v: string): SituacaoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('autorizada')) return 'autorizada'
  if (s.includes('expedida'))   return 'expedida'
  return 'urgencia'
}

function parseAcompanhamento(v: string): AcompanhamentoCirurgia {
  const s = v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('cancelada') || s.includes('cancelado')) return 'cancelada'
  if (s.includes('expedida'))  return 'expedida'
  if (s.includes('agendada'))  return 'agendada'
  if (s.includes('opme'))      return 'opme_pos'
  return 'agendada'
}

// ─── Shared upload area ───────────────────────────────────────────────────────

function UploadArea({ onFile, loading }: { onFile: (f: File) => void; loading: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      onClick={() => fileRef.current?.click()}
      className={`card p-12 text-center cursor-pointer transition-colors border-2 border-dashed ${dragging ? 'border-primary-400 bg-primary-50' : 'hover:border-primary-300 hover:bg-gray-50'}`}
    >
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
        onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
      {loading ? (
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-10 h-10 text-primary-600 animate-spin" />
          <p className="text-gray-600">Lendo arquivo…</p>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
            <FileSpreadsheet className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-700 text-lg">Arraste o Excel aqui ou clique para selecionar</p>
            <p className="text-sm text-gray-400 mt-1">Suporta .xlsx, .xls e .csv</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Steps indicator ──────────────────────────────────────────────────────────

function StepsBar({ step }: { step: Step }) {
  const steps: Step[] = ['upload', 'map', 'preview', 'done']
  const labels = ['Upload', 'Colunas', 'Prévia', 'Concluído']
  const cur = steps.indexOf(step)
  return (
    <div className="flex items-center gap-2 text-xs">
      {steps.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${cur === i ? 'bg-primary-700 text-white' : cur > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
            {cur > i ? '✓' : i + 1}
          </div>
          <span className={cur === i ? 'text-primary-700 font-semibold' : 'text-gray-400'}>{labels[i]}</span>
          {i < 3 && <div className="w-8 h-px bg-gray-200" />}
        </div>
      ))}
    </div>
  )
}

// ─── Agenda import flow ───────────────────────────────────────────────────────

function AgendaImport() {
  const { user } = useAuth()
  const [loading, setLoading]           = useState(false)
  const [step, setStep]                 = useState<Step>('upload')
  const [headers, setHeaders]           = useState<string[]>([])
  const [colMap, setColMap]             = useState<Record<string, string>>({})
  const [allRows, setAllRows]           = useState<Record<string, unknown>[]>([])
  const [preview, setPreview]           = useState<Partial<AgendaItem>[]>([])
  const [fileName, setFileName]         = useState('')
  const [importResult, setImportResult] = useState<{ added: number; updated: number } | null>(null)
  const [existingCount, setExistingCount] = useState(0)
  useEffect(() => { getAgenda().then(a => setExistingCount(a.length)) }, [])

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Selecione .xlsx, .xls ou .csv'); return }
    setLoading(true); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })
      const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: true })
      if (!rows.length) { toast.error('Planilha vazia'); return }
      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs); setAllRows(rows)
      const auto: Record<string, string> = {}
      for (const h of hdrs) { const f = detectColumn(h); if (f !== 'skip') auto[h] = f }
      setColMap(auto)
      setPreview(rows.slice(0, 3).map(r => ({ _raw: r } as any)))
      setStep('map')
    } catch { toast.error('Erro ao ler o arquivo') } finally { setLoading(false) }
  }

  function buildItems(rows: Record<string, unknown>[]): AgendaItem[] {
    const get = (field: string, row: Record<string, unknown>) => {
      const h = Object.keys(colMap).find(k => colMap[k] === field)
      return h ? String(row[h] ?? '') : ''
    }
    return rows.map(row => ({
      id: '', codigo: get('codigo', row),
      data: parseDate(get('data', row)), horaCirurgia: parseTime(get('horaCirurgia', row)),
      paciente: get('paciente', row), hospital: get('hospital', row), convenio: get('convenio', row),
      medico: get('medico', row), cliente: get('cliente', row), procedimento: get('procedimento', row),
      instrumentadores: get('instrumentadores', row), vendedor: get('vendedor', row),
      autorizada: ['sim','yes','1','true'].includes(get('autorizada', row).toLowerCase()),
      status: parseStatus(get('status', row)),
      importadoEm: new Date().toISOString(), importadoPor: user?.nome || '', origem: 'importacao',
    } as AgendaItem)).filter(r => r.data || r.paciente || r.medico)
  }

  function loadPreview() {
    setPreview(buildItems(allRows).slice(0, 20))
    setStep('preview')
  }

  async function doImport() {
    setLoading(true)
    try {
      const result = await upsertAgendaItems(buildItems(allRows))
      setImportResult(result); setStep('done')
      toast.success(`${result.added} adicionados, ${result.updated} atualizados`)
      window.dispatchEvent(new CustomEvent('opme_agenda_updated'))
    } finally { setLoading(false) }
  }

  function reset() { setStep('upload'); setPreview([]); setHeaders([]); setColMap({}); setFileName(''); setImportResult(null); setAllRows([]) }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['CÓD.','DATA','HORA DA CIRURGIA','PACIENTE','HOSPITAL','CONVÊNIO','MÉDICO','PROCEDIMENTO','VENDEDOR','STATUS'],
        ['001','09/06/2026','19:00','NOME DO PACIENTE','HOSPITAL EXEMPLO','UNIMED','DR. NOME','ORTOPEDIA','VENDEDOR','Agendada'],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Agenda')
      XLSX.writeFile(wb, 'template_agenda_opme.xlsx')
    })
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Modelo Excel</button>
        {existingCount > 0 && (
          <button onClick={async () => { if (confirm(`Limpar ${existingCount} registros?`)) { await clearAgenda(); toast.success('Agenda limpa'); reset() } }} className="btn-danger btn-sm">
            <Trash2 className="w-4 h-4" /> Limpar agenda ({existingCount})
          </button>
        )}
      </div>

      <StepsBar step={step} />

      {step === 'upload' && (
        <>
          <UploadArea onFile={processFile} loading={loading} />
          {existingCount > 0 && (
            <div className="card p-4 bg-blue-50 border-blue-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">Há <strong>{existingCount}</strong> registros na agenda. Nova importação adiciona/atualiza sem apagar.</p>
            </div>
          )}
        </>
      )}

      {step === 'map' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Mapeamento de colunas — <span className="text-primary-600 font-medium">{fileName}</span></p>
            <button onClick={reset}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map(h => (
              <div key={h} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1 truncate">{h}</p>
                <select className="input text-xs py-1" value={colMap[h] || 'skip'} onChange={e => setColMap(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="skip">— Ignorar —</option>
                  {AGENDA_COLS.map(c => <option key={c.field} value={c.field}>{c.label}{c.required ? ' ✓' : ''}</option>)}
                  <option value="codigo">Código</option>
                  <option value="cliente">Cliente</option>
                  <option value="instrumentadores">Instrumentadores</option>
                  <option value="autorizada">Autorizada?</option>
                </select>
                <p className="text-xs text-gray-400 mt-1 truncate">Ex: {String((preview[0] as any)?._raw?.[h] ?? '').slice(0, 30)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={loadPreview} className="btn-primary" disabled={loading}><Table2 className="w-4 h-4" /> Pré-visualizar</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600">Prévia de <strong>{preview.length}</strong> registros</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary btn-sm">Voltar</button>
              <button onClick={doImport} className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar tudo ({allRows.length})
              </button>
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {AGENDA_COLS.filter(c => Object.values(colMap).includes(c.field)).map(c => (
                    <th key={c.field} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{c.label}</th>
                  ))}
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Status</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {AGENDA_COLS.filter(c => Object.values(colMap).includes(c.field)).map(c => (
                        <td key={c.field} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[140px] truncate">
                          {c.field === 'data' ? formatDate(String(row[c.field as keyof typeof row] || '')) : String(row[c.field as keyof typeof row] ?? '—').slice(0, 40)}
                        </td>
                      ))}
                      <td className="px-3 py-2"><span className={`badge text-xs ${agendaStatusBg(row.status!)}`}>{agendaStatusLabel(row.status!)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && importResult && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Agenda importada!</h3>
          <div className="flex justify-center gap-8 my-4">
            <div><p className="text-3xl font-bold text-green-600">{importResult.added}</p><p className="text-sm text-gray-500">novos</p></div>
            <div><p className="text-3xl font-bold text-blue-600">{importResult.updated}</p><p className="text-sm text-gray-500">atualizados</p></div>
          </div>
          <div className="flex gap-3 justify-center mt-4">
            <button onClick={reset} className="btn-secondary"><Upload className="w-4 h-4" /> Nova importação</button>
            <button onClick={() => window.location.href = '/'} className="btn-primary">Ver Dashboard</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Controle import flow ─────────────────────────────────────────────────────

function ControleImport() {
  const { user } = useAuth()
  const [loading, setLoading]           = useState(false)
  const [step, setStep]                 = useState<Step>('upload')
  const [headers, setHeaders]           = useState<string[]>([])
  const [colMap, setColMap]             = useState<Record<string, string>>({})
  const [allRows, setAllRows]           = useState<Record<string, unknown>[]>([])
  const [preview, setPreview]           = useState<Partial<ControleCirurgia>[]>([])
  const [fileName, setFileName]         = useState('')
  const [importedCount, setImportedCount] = useState(0)

  async function processFile(file: File) {
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) { toast.error('Selecione .xlsx, .xls ou .csv'); return }
    setLoading(true); setFileName(file.name)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false })

      // Tenta ler a aba do mês atual ou a primeira aba disponível
      // Lê todas as abas (ignora abas de configuração) e combina as linhas
      const ignorar = ['dados', 'config', 'configuracao', 'resumo', 'total']
      const abas = wb.SheetNames.filter(n => !ignorar.includes(n.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')))
      const rows: Record<string, unknown>[] = abas.flatMap(aba =>
        XLSX.utils.sheet_to_json(wb.Sheets[aba], { defval: '', raw: true }) as Record<string, unknown>[]
      )
      if (!rows.length) { toast.error('Planilha vazia'); return }

      const hdrs = Object.keys(rows[0])
      setHeaders(hdrs); setAllRows(rows)
      const auto: Record<string, string> = {}
      for (const h of hdrs) { const f = detectControleColumn(h); if (f !== 'skip') auto[h] = f }
      setColMap(auto)
      setPreview(rows.slice(0, 3).map(r => ({ _raw: r } as any)))
      setStep('map')
    } catch { toast.error('Erro ao ler o arquivo') } finally { setLoading(false) }
  }

  function buildItems(rows: Record<string, unknown>[]): Omit<ControleCirurgia, 'id' | 'createdAt' | 'updatedAt'>[] {
    const get = (field: string, row: Record<string, unknown>) => {
      const h = Object.keys(colMap).find(k => colMap[k] === field)
      return h ? String(row[h] ?? '').trim() : ''
    }
    return rows.map(row => ({
      numero:         get('numero', row) || undefined,
      codigoV2:       get('codigoV2', row) || undefined,
      data:           parseDate(get('data', row)),
      cirurgia:       get('cirurgia', row).toUpperCase(),
      segmento:       parseSegmento(get('segmento', row)),
      pacienteNome:   get('pacienteNome', row).toUpperCase(),
      convenio:       get('convenio', row) || undefined,
      hospital:       get('hospital', row) || undefined,
      medico:         get('medico', row) || undefined,
      vendedor:       get('vendedor', row) || undefined,
      situacao:       parseSituacao(get('situacao', row)),
      acompanhamento: parseAcompanhamento(get('acompanhamento', row)),
      criadoPorId:    user?.id,
      criadoPorNome:  user?.nome,
    })).filter(r => r.data && r.pacienteNome)
  }

  function loadPreview() {
    setPreview(buildItems(allRows).slice(0, 20))
    setStep('preview')
  }

  async function doImport() {
    setLoading(true)
    try {
      const items = buildItems(allRows)
      const count = await bulkInsertControleCirurgias(items)
      setImportedCount(count); setStep('done')
      toast.success(`${count} registros importados para Controle de Cirurgias`)
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao importar')
    } finally { setLoading(false) }
  }

  function reset() { setStep('upload'); setPreview([]); setHeaders([]); setColMap({}); setFileName(''); setAllRows([]) }

  function downloadTemplate() {
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([
        ['Nº','CÓD. V2','Data','Cirurgia','Segmento','Nome','Convênio','Hospital','Médico','Vendedor','Situação','ACOMPANHAMENTO'],
        ['1','385515','01/06/2026','FRATURA DE FÊMUR','Ortopedia','NOME DO PACIENTE','BRADESCO','NITERÓI DOR','DR. MARCELO','ALBERTO','Urgência','OPME Pós'],
      ])
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Junho')
      XLSX.writeFile(wb, 'template_controle_cirurgias.xlsx')
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button onClick={downloadTemplate} className="btn-secondary btn-sm"><Download className="w-4 h-4" /> Modelo Excel</button>
      </div>

      <StepsBar step={step} />

      {step === 'upload' && (
        <>
          <UploadArea onFile={processFile} loading={loading} />
          <div className="card p-4 bg-amber-50 border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-700">
              <strong>Formato esperado:</strong> Nº · CÓD.V2 · Data · Cirurgia · Segmento · Nome · Convênio · Hospital · Médico · Vendedor · Situação · Acompanhamento.
              <br />A planilha "Controle de Cirurgias 2026" já está no formato correto — basta fazer o upload de qualquer aba mensal.
            </div>
          </div>
        </>
      )}

      {step === 'map' && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-800">Mapeamento de colunas — <span className="text-primary-600 font-medium">{fileName}</span></p>
            <button onClick={reset}><X className="w-5 h-5 text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {headers.map(h => (
              <div key={h} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-1 truncate">{h}</p>
                <select className="input text-xs py-1" value={colMap[h] || 'skip'} onChange={e => setColMap(p => ({ ...p, [h]: e.target.value }))}>
                  <option value="skip">— Ignorar —</option>
                  {CONTROLE_COLS.map(c => <option key={c.field} value={c.field}>{c.label}{c.required ? ' ✓' : ''}</option>)}
                </select>
                <p className="text-xs text-gray-400 mt-1 truncate">Ex: {String((preview[0] as any)?._raw?.[h] ?? '').slice(0, 30)}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-end pt-2 border-t">
            <button onClick={reset} className="btn-secondary">Cancelar</button>
            <button onClick={loadPreview} className="btn-primary" disabled={loading}><Table2 className="w-4 h-4" /> Pré-visualizar</button>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-4">
          <div className="card p-4 flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-gray-600">Prévia de <strong>{preview.length}</strong> registros</p>
            <div className="flex gap-2">
              <button onClick={() => setStep('map')} className="btn-secondary btn-sm">Voltar</button>
              <button onClick={doImport} className="btn-primary" disabled={loading}>
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar tudo ({allRows.length})
              </button>
            </div>
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b border-gray-200">
                  {['Data','Cirurgia','Segmento','Paciente','Hospital','Médico','Vendedor','Situação','Acomp.'].map(h => (
                    <th key={h} className="text-left px-3 py-2 font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(row.data || '')}</td>
                      <td className="px-3 py-2 max-w-[140px] truncate">{row.cirurgia || '—'}</td>
                      <td className="px-3 py-2">{row.segmento ? SEGMENTO_LABELS[row.segmento] : '—'}</td>
                      <td className="px-3 py-2 max-w-[130px] truncate">{row.pacienteNome || '—'}</td>
                      <td className="px-3 py-2 max-w-[110px] truncate">{row.hospital || '—'}</td>
                      <td className="px-3 py-2 max-w-[100px] truncate">{row.medico || '—'}</td>
                      <td className="px-3 py-2">{row.vendedor || '—'}</td>
                      <td className="px-3 py-2">{row.situacao ? SITUACAO_LABELS[row.situacao] : '—'}</td>
                      <td className="px-3 py-2">{row.acompanhamento ? ACOMPANHAMENTO_LABELS[row.acompanhamento] : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && (
        <div className="card p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Controle importado!</h3>
          <p className="text-3xl font-bold text-green-600 my-4">{importedCount}</p>
          <p className="text-sm text-gray-500 mb-6">registros adicionados ao Controle de Cirurgias</p>
          <div className="flex gap-3 justify-center">
            <button onClick={reset} className="btn-secondary"><Upload className="w-4 h-4" /> Nova importação</button>
            <button onClick={() => window.location.href = '/controle'} className="btn-primary">Ver Controle</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ImportPage() {
  const [mode, setMode] = useState<Mode | null>(null)

  if (!mode) {
    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Importar</h2>
          <p className="text-sm text-gray-500 mt-0.5">Escolha o tipo de importação</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Agenda */}
          <button onClick={() => setMode('agenda')}
            className="card p-6 text-left hover:border-primary-300 transition-colors group border-2 border-transparent hover:bg-blue-50/40">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
              <CalendarDays className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Importar Agenda</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Importe a planilha de agendamento cirúrgico para o Painel TV e Dashboard.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Campos: Data · Hora · Paciente · Hospital · Médico · Vendedor · Status…
            </p>
          </button>

          {/* Controle */}
          <button onClick={() => setMode('controle')}
            className="card p-6 text-left hover:border-red-300 transition-colors group border-2 border-transparent hover:bg-red-50/40">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 group-hover:opacity-80 transition-colors"
              style={{ background: 'rgba(122,16,16,0.10)' }}>
              <ClipboardList className="w-6 h-6" style={{ color: '#c02020' }} />
            </div>
            <h3 className="font-bold text-gray-800 text-base mb-1">Importar Controle de Cirurgias</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Importe a planilha "Controle de Cirurgias 2026" diretamente para o módulo de controle.
            </p>
            <p className="text-xs text-gray-400 mt-3">
              Campos: Nº · Cód.V2 · Cirurgia · Segmento · Situação · Acompanhamento…
            </p>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-5">
      {/* Header with back */}
      <div className="flex items-center gap-3">
        <button onClick={() => setMode(null)}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 transition-colors">
          ← Voltar
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2">
          {mode === 'agenda'
            ? <CalendarDays className="w-5 h-5 text-blue-600" />
            : <ClipboardList className="w-5 h-5" style={{ color: '#c02020' }} />}
          <h2 className="text-xl font-bold text-gray-800">
            {mode === 'agenda' ? 'Importar Agenda' : 'Importar Controle de Cirurgias'}
          </h2>
        </div>
      </div>

      {mode === 'agenda'    && <AgendaImport />}
      {mode === 'controle'  && <ControleImport />}
    </div>
  )
}
